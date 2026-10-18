import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { JSDOM } from 'jsdom';
import { fixtures } from '../scripts/fixtures.js';
import { mount } from '../ui/app.js';
const runCli = promisify(execFile);
async function until(check) {
  const deadline = Date.now() + 120000;
  while (!check()) { if (Date.now() > deadline) throw new Error('UI operation timed out'); await new Promise(r => setTimeout(r, 25)); }
}
test('DOM → real CLI → real models → persisted results → validated original path', {timeout:180000}, async t => {
  const base = await mkdtemp(join(tmpdir(), 'inbox-ui-real-'));
  t.after(() => rm(base, {recursive:true,force:true}));
  const folder = join(base, 'photos'), state = join(base, 'state');
  await fixtures(folder);
  const dom = new JSDOM(await readFile('index.html','utf8'));
  const document = dom.window.document;
  let opened;
  mount(document, {
    choose:async()=>folder, // Native dialog cannot run in JSDOM; all inference below is real.
    run:async (command,args) => {
      const nativeOpen = command === 'open_original';
      const result = await runCli(process.execPath,['src/cli.js',nativeOpen?'original':command,args.folder,state,nativeOpen?args.id:(args.query||''),args.mode||'hybrid'],{maxBuffer:10*1024*1024});
      const value = JSON.parse(result.stdout);
      if (nativeOpen) opened = value; // Do not launch a GUI on this headless runner.
      return value;
    }
  });
  document.querySelector('#choose').click();
  await until(()=>!document.querySelector('#choose').disabled);
  assert.match(document.querySelector('#status').textContent,/3 images indexed/);
  document.querySelector('#query').value = 'a photo of a dog';
  document.querySelector('#mode').value = 'visual';
  document.querySelector('#search').dispatchEvent(new dom.window.Event('submit',{cancelable:true}));
  await until(()=>!document.querySelector('#submit').disabled);
  assert.equal(document.querySelector('.filename').textContent,'a.jpg');
  document.querySelector('.result button').click();
  await until(()=>Boolean(opened));
  assert.equal(opened, join(folder, 'a.jpg'));
});
