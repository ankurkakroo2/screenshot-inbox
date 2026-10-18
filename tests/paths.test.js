import test from 'node:test';
import assert from 'node:assert/strict';
import { posix, win32 } from 'node:path';
import { isWithin } from '../src/paths.js';
test('path confinement handles POSIX siblings, Windows other drives and UNC shares', () => {
  assert.equal(isWithin('/images', '/images/a.jpg', posix), true);
  assert.equal(isWithin('/images', '/images-other/a.jpg', posix), false);
  assert.equal(isWithin('/images', '/secret/a.jpg', posix), false);
  assert.equal(isWithin('C:\\images', 'C:\\images\\a.jpg', win32), true);
  assert.equal(isWithin('C:\\images', 'D:\\secret.jpg', win32), false);
  assert.equal(isWithin('C:\\images', 'C:\\images-other\\a.jpg', win32), false);
  assert.equal(isWithin('\\\\host\\share\\images', '\\\\other\\share\\a.jpg', win32), false);
});
