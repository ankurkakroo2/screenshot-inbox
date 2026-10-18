import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { Models } from '../src/models.js';

test('real CLIP produces normalized aligned vectors; real OCR reads generated text', {timeout: 300000}, async () => {
  const models = new Models();
  try {
    const image = await sharp(Buffer.from('<svg width="900" height="240"><rect width="100%" height="100%" fill="white"/><text x="30" y="140" font-size="72" fill="black">INVOICE 73421</text></svg>')).png().toBuffer();
    const v = await models.image(image);
    const q = await models.text('an invoice');
    assert.equal(v.length, 512);
    assert.equal(q.length, 512);
    assert.ok(Math.abs(Math.hypot(...v) - 1) < 0.001);
    assert.match(await models.ocr(image), /INVOICE\s+73421/i);
  } finally { await models.close(); }
});
