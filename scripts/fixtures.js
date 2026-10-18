import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import sharp from 'sharp';

// PxHere, CC0. Commons reviewed source and license; see docs/fixtures.md.
export const DOG_URL = 'https://upload.wikimedia.org/wikipedia/commons/b/bb/Labrador_Retriever_%28936995%29.jpg';
export async function fixtures(folder) {
  await mkdir(folder, { recursive: true });
  const dog = join(folder, 'a.jpg');
  let buffer;
  try { buffer = await readFile(dog); } catch {
    const response = await fetch(DOG_URL, { headers: { 'User-Agent': 'ScreenshotInboxPrototype/0.1 (public fixture benchmark)' } });
    if (!response.ok) throw new Error(`Fixture download: ${response.status}`);
    buffer = Buffer.from(await response.arrayBuffer());
  }
  if (createHash('sha1').update(buffer).digest('hex') !== 'c54601da8668d3ba6f0dfeb8a46ea6afb7861649') throw new Error('Public fixture checksum mismatch');
  await writeFile(dog, buffer);
  await sharp(Buffer.from('<svg width="900" height="240"><rect width="100%" height="100%" fill="white"/><text x="30" y="140" font-size="72" fill="black">INVOICE 73421</text></svg>')).png().toFile(join(folder, 'b.png'));
  await sharp({ create: { width: 400, height: 300, channels: 3, background: '#0055ff' } }).png().toFile(join(folder, 'c.png'));
  return ['a.jpg', 'b.png', 'c.png'];
}
