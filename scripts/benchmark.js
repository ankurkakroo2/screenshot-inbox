import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { Models, MODEL, REVISION } from '../src/models.js';
import { fixtures } from './fixtures.js';
const folder = resolve('.local/fixtures');
const paths = await fixtures(folder);
const models = new Models();
const report = { node: process.version, platform: process.platform, arch: process.arch, model: MODEL, revision: REVISION, dtype: 'q8', device: 'cpu', images: paths.length, timings_ms: {} };
try {
  const vectors = [];
  for (const name of paths) {
    const start = performance.now();
    vectors.push(await models.image(await readFile(join(folder, name))));
    report.timings_ms[`image_${name}`] = performance.now() - start;
  }
  let start = performance.now();
  const query = await models.text('a photo of a dog');
  report.timings_ms.text_cold = performance.now() - start;
  report.ranking = paths.map((path, i) => ({ path, score: vectors[i].reduce((s, x, j) => s + x * query[j], 0) })).sort((a,b) => b.score-a.score);
  assert.equal(report.ranking[0].path, 'a.jpg');
  start = performance.now(); await models.text('a photo of a dog');
  report.timings_ms.text_warm = performance.now() - start;
  start = performance.now();
  report.ocr = await models.ocr(await readFile(join(folder, 'b.png')));
  report.timings_ms.ocr_cold = performance.now() - start;
  assert.match(report.ocr, /INVOICE\s+73421/);
  report.rss_mb = process.memoryUsage().rss / 1024 / 1024;
  await mkdir('docs', {recursive:true});
  await writeFile('docs/benchmark.json', JSON.stringify(report, null, 2)+'\n');
  console.log(JSON.stringify(report, null, 2));
} finally { await models.close(); }
