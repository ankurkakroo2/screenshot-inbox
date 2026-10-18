import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve, join } from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fixtures } from '../scripts/fixtures.js';
const run = promisify(execFile);
test('CLI indexes a real fixture folder and retrieves OCR from persisted index', {timeout:300000}, async t => {
  const base = await mkdtemp(join(tmpdir(), 'inbox-cli-'));
  t.after(() => rm(base, {recursive:true, force:true}));
  const folder = join(base, 'images');
  const state = join(base, 'state');
  await fixtures(folder);
  const {stdout} = await run(process.execPath, ['src/cli.js', 'index', folder, state]);
  assert.equal(JSON.parse(stdout).total, 3);
  const result = await run(process.execPath, ['src/cli.js', 'search', folder, state, '73421', 'text']);
  const hits = JSON.parse(result.stdout);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].relative, 'b.png');
  const original = await run(process.execPath, ['src/cli.js', 'original', folder, state, hits[0].id]);
  assert.equal(JSON.parse(original.stdout), resolve(folder, 'b.png'));
});
test('CLI invalid command exits nonzero with structured error', async () => {
  await assert.rejects(run(process.execPath, ['src/cli.js', 'erase']), error => {
    assert.match(JSON.parse(error.stderr).error, /Usage/);
    return error.code === 1;
  });
});
