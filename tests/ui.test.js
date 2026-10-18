import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { mount } from '../ui/app.js';
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const tick = () => new Promise(r => setTimeout(r, 10));
test('choose folder, scan, search and open original through adapter; never interpret filename as HTML', async () => {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const calls = [];
  const hit = {id:'123',relative:'<img src=x onerror=alert(1)>.png',thumbnail:'data:image/jpeg;base64,AA==',ocr:'INVOICE 73421',score:0.3,textMatch:true};
  mount(doc, { choose: async () => '/photos', run: async (command,args) => {
    calls.push([command,args]);
    return command === 'index' ? {indexed:1,unchanged:0,total:1,errors:[]} : command === 'search' ? [hit] : null;
  }});
  doc.querySelector('#choose').click(); await tick();
  assert.equal(calls[0][0], 'index');
  assert.equal(doc.querySelectorAll('.result').length, 1);
  assert.equal(doc.querySelector('.filename').textContent, hit.relative);
  assert.equal(doc.querySelectorAll('img').length, 1);
  doc.querySelector('#query').value = '73421';
  doc.querySelector('#mode').value = 'text';
  doc.querySelector('#search').dispatchEvent(new dom.window.Event('submit', {cancelable:true})); await tick();
  assert.equal(calls.at(-1)[1].query, '73421');
  assert.equal(calls.at(-1)[1].mode, 'text');
  doc.querySelector('.result button').click(); await tick();
  assert.equal(calls.at(-1)[0], 'open_original');
  assert.equal(calls.at(-1)[1].id, '123');
});
test('adapter failure is visible and controls recover', async () => {
  const dom = new JSDOM(html); const doc = dom.window.document;
  mount(doc, {choose:async()=>'/photos',run:async()=>{throw new Error('model download unavailable');}});
  doc.querySelector('#choose').click(); await tick();
  assert.match(doc.querySelector('#status').textContent, /model download unavailable/);
  assert.equal(doc.querySelector('#choose').disabled, false);
});
