import { mkdir, access } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { env, AutoTokenizer, AutoProcessor, CLIPTextModelWithProjection, CLIPVisionModelWithProjection, RawImage } from '@huggingface/transformers';
import { createWorker } from 'tesseract.js';

export const MODEL = 'Xenova/clip-vit-base-patch32';
export const REVISION = 'd15189d7028b43f1d3e65039190477f6af591c2a';
export const CACHE = process.env.SCREENSHOT_INBOX_CACHE || join(homedir(), '.cache', 'screenshot-inbox');
env.cacheDir = join(CACHE, 'models');
const options = { revision: REVISION, dtype: 'q8', device: 'cpu', session_options: { intraOpNumThreads: 2, interOpNumThreads: 1 } };
function normalized(tensor) {
  const a = Array.from(tensor.data);
  const norm = Math.hypot(...a);
  if (!norm || a.some(x => !Number.isFinite(x))) throw new Error('Invalid model embedding');
  return a.map(x => x / norm);
}

export class Models {
  constructor({ offline = process.env.SCREENSHOT_INBOX_OFFLINE === '1', cacheDir = CACHE } = {}) {
    this.offline = offline;
    this.cacheDir = cacheDir;
    this.options = { ...options, cache_dir: join(cacheDir, 'models'), local_files_only: offline };
  }
  async text(text) {
    this.textReady ??= Promise.all([AutoTokenizer.from_pretrained(MODEL, this.options), CLIPTextModelWithProjection.from_pretrained(MODEL, this.options)]);
    const [tokenizer, model] = await this.textReady;
    return normalized((await model(tokenizer(text, { padding: true, truncation: true }))).text_embeds);
  }
  async image(buffer) {
    this.imageReady ??= Promise.all([AutoProcessor.from_pretrained(MODEL, this.options), CLIPVisionModelWithProjection.from_pretrained(MODEL, this.options)]);
    const [processor, model] = await this.imageReady;
    const image = await RawImage.fromBlob(new Blob([buffer]));
    return normalized((await model(await processor(image))).image_embeds);
  }
  async ocr(buffer) {
    this.ocrReady ??= (async () => {
      const cachePath = join(this.cacheDir, 'ocr');
      await mkdir(cachePath, { recursive: true });
      if (this.offline) await access(join(cachePath, 'eng.traineddata')).catch(() => { throw new Error('Offline OCR data missing; run once online'); });
      const worker = await createWorker('eng', 1, { cachePath, ...(this.offline ? {langPath:cachePath,gzip:false} : {}) });
      await worker.setParameters({ user_defined_dpi: '300' });
      return worker;
    })();
    return (await (await this.ocrReady).recognize(buffer)).data.text.trim();
  }
  async close() {
    const results = await Promise.allSettled([this.textReady, this.imageReady, this.ocrReady]);
    for (const r of results) {
      if (r.status !== 'fulfilled' || !r.value) continue;
      if (Array.isArray(r.value)) await r.value[1].dispose();
      else await r.value.terminate();
    }
  }
}
