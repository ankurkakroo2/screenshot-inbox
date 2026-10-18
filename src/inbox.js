import { mkdir, readFile, readdir, realpath, stat, open, rename, unlink, lstat } from 'node:fs/promises';
import { resolve, join, relative, extname } from 'node:path';
import { isWithin as inside } from './paths.js';
import { createHash, randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { MODEL, REVISION } from './models.js';
const hash = value => createHash('sha256').update(value).digest('hex');
const VERSION = `1:${MODEL}:${REVISION}:q8`;
const supported = new Set(['.png', '.jpg', '.jpeg', '.webp']);

export class Inbox {
  constructor(folder, stateDir, models) {
    this.folder = resolve(folder);
    this.stateDir = resolve(stateDir);
    this.models = models;
  }
  async load() {
    this.root = await realpath(this.folder);
    if (!(await stat(this.root)).isDirectory()) throw new Error('Select an existing image folder');
    this.file = join(this.stateDir, `${hash(this.root)}.json`);
    try {
      const data = JSON.parse(await readFile(this.file, 'utf8'));
      if (data.version !== VERSION || data.root !== this.root || !Array.isArray(data.items)) throw new Error('Index version mismatch; remove index and rescan');
      return data;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      return { version: VERSION, root: this.root, items: [] };
    }
  }
  async *walk(folder) {
    for (const item of await readdir(folder, { withFileTypes: true })) {
      const path = join(folder, item.name);
      if (item.isSymbolicLink() || path === this.stateDir) continue;
      if (item.isDirectory()) yield* this.walk(path);
      else if (item.isFile() && supported.has(extname(item.name).toLowerCase())) yield path;
    }
  }
  async index() {
    const previous = await this.load();
    await mkdir(this.stateDir, { recursive: true, mode: 0o700 });
    const lock = `${this.file}.lock`;
    const handle = await open(lock, 'wx', 0o600).catch(error => {
      if (error.code === 'EEXIST') throw new Error('Index is busy (if a process crashed, remove its .lock file)');
      throw error;
    });
    const temp = `${this.file}.${randomUUID()}.tmp`;
    try {
      const old = new Map(previous.items.map(item => [item.relative, item]));
      const items = [], errors = [];
      let indexed = 0, unchanged = 0;
      for await (const path of this.walk(this.root)) {
        const name = relative(this.root, path);
        try {
          if ((await stat(path)).size > 25 * 1024 * 1024) throw new Error('Image exceeds 25 MiB limit');
          const canonical = await realpath(path);
          if (!inside(this.root, canonical) || (await lstat(path)).isSymbolicLink()) throw new Error('Image path escapes selected folder');
          const buffer = await readFile(path);
          const digest = hash(buffer);
          const cached = old.get(name);
          if (cached?.digest === digest) { items.push(cached); unchanged++; continue; }
          // Decode once under a pixel budget before passing pixels to inference engines.
          const decoded = await sharp(buffer, { limitInputPixels: 40_000_000 }).rotate().png().toBuffer();
          const thumbnail = 'data:image/jpeg;base64,' + (await sharp(decoded).resize(256, 256, { fit: 'inside', withoutEnlargement: true }).jpeg({quality:75}).toBuffer()).toString('base64');
          const vector = await this.models.image(decoded);
          const ocr = await this.models.ocr(decoded);
          items.push({ id: hash(name), relative: name, digest, vector, ocr, thumbnail });
          indexed++;
        } catch (error) { errors.push({ relative: name, error: error.message }); }
      }
      await writePrivate(temp, JSON.stringify({ version: VERSION, root: this.root, items }));
      await rename(temp, this.file);
      return { indexed, unchanged, removed: previous.items.filter(x => !items.some(y => y.id === x.id)).length, total: items.length, errors };
    } finally {
      await handle.close();
      await unlink(temp).catch(() => {});
      await unlink(lock);
    }
  }
  async search(query, mode = 'hybrid', limit = 50) {
    if (typeof query !== 'string' || query.length > 2000) throw new Error('Query must be text, at most 2000 characters');
    if (!['visual', 'text', 'hybrid'].includes(mode)) throw new Error('Invalid search mode');
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error('Limit must be 1–100');
    const { items } = await this.load();
    const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const vector = mode !== 'text' && terms.length && items.length ? await this.models.text(query) : null;
    return items.map(item => {
      const textMatch = terms.length > 0 && terms.every(t => item.ocr.toLowerCase().includes(t));
      const visual = vector ? item.vector.reduce((sum, x, i) => sum + x * vector[i], 0) : 0;
      const score = mode === 'text' ? Number(textMatch) : visual + (mode === 'hybrid' && textMatch ? 1 : 0);
      const { vector: _, digest, ...hit } = item;
      return { ...hit, score, textMatch };
    }).filter(hit => mode !== 'text' || hit.textMatch || !terms.length)
      .sort((a, b) => b.score - a.score || a.relative.localeCompare(b.relative)).slice(0, limit);
  }
  async original(id) {
    const { items } = await this.load();
    const item = items.find(item => item.id === id);
    if (!item) throw new Error('Unknown image');
    const path = await realpath(join(this.root, item.relative));
    if (!inside(this.root, path) || !(await stat(path)).isFile()) throw new Error('Original is outside selected folder');
    return path;
  }
}
async function writePrivate(path, value) {
  const handle = await open(path, 'wx', 0o600);
  try { await handle.writeFile(value); await handle.sync(); } finally { await handle.close(); }
}
