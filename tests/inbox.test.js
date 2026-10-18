import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, unlink, writeFile, symlink, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fixtures } from '../scripts/fixtures.js';
import { Inbox } from '../src/inbox.js';
import { Models } from '../src/models.js';

test('index folder, persist thumbnail and find text-free dog by visual query', {timeout:300000}, async () => {
  const base = await mkdtemp(join(tmpdir(), 'inbox-'));
  const folder = join(base, 'photos');
  const models = new Models();
  try {
    await fixtures(folder);
    const inbox = new Inbox(folder, join(base, 'state'), models);
    const result = await inbox.index();
    assert.equal(result.indexed, 3);
    const hits = await inbox.search('a photo of a dog', 'visual');
    assert.equal(hits[0].relative, 'a.jpg');
    assert.match(hits[0].thumbnail, /^data:image\/jpeg;base64,/);
    assert.equal(await inbox.original(hits[0].id), join(folder, 'a.jpg'));
    const again = new Inbox(folder, join(base, 'state'), models);
    assert.equal((await again.search('a photo of a dog', 'visual'))[0].id, hits[0].id);
    const text = await inbox.search('73421', 'text');
    assert.equal(text.length, 1);
    assert.equal(text[0].relative, 'b.png');
    assert.equal((await inbox.search('73421', 'hybrid'))[0].relative, 'b.png');
    assert.equal((await inbox.search('notpresent', 'text')).length, 0);
    const second = await inbox.index();
    assert.equal(second.indexed, 0);
    assert.equal(second.unchanged, 3);
    await assert.rejects(inbox.search('x', 'invalid'), /Invalid search mode/);
    await assert.rejects(inbox.search('x', 'text', 1000), /Limit/);
    await assert.rejects(inbox.original('../secret'), /Unknown image/);
    await writeFile(`${inbox.file}.lock`, '');
    await assert.rejects(inbox.index(), /busy/);
    await unlink(`${inbox.file}.lock`);
    await writeFile(join(folder, 'broken.png'), 'not an image');
    await symlink(join(folder, 'a.jpg'), join(folder, 'linked.jpg'));
    await mkdir(join(folder, 'nested'));
    await writeFile(join(folder, 'nested', 'copy.png'), await readFile(join(folder, 'b.png')));
    await unlink(join(folder, 'c.png'));
    const changed = await inbox.index();
    assert.equal(changed.total, 3);
    assert.equal(changed.removed, 1);
    assert.equal(changed.indexed, 1);
    assert.equal(changed.errors.length, 1);
    assert.equal(changed.errors[0].relative, 'broken.png');
    // Replacing an indexed original with a link must not permit opening outside root.
    const outside = join(base, 'outside.jpg');
    await writeFile(outside, await readFile(join(folder, 'a.jpg')));
    await unlink(join(folder, 'a.jpg'));
    await symlink(outside, join(folder, 'a.jpg'));
    await assert.rejects(inbox.original(hits[0].id), /outside/);
  } finally { await models.close(); await rm(base, { recursive: true, force: true }); }
});
