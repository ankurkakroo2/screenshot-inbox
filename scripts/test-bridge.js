import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const scratch = await mkdtemp(join(tmpdir(), 'inbox-bridge-test-'));
try {
  const binary = join(scratch, process.platform === 'win32' ? 'bridge-tests.exe' : 'bridge-tests');
  const build = spawnSync(process.env.RUSTC || 'rustc', ['--edition=2024','--test','src-tauri/src/bridge.rs','-o',binary], {stdio:'inherit',env:{...process.env,CARGO_MANIFEST_DIR:resolve('src-tauri')}});
  if (build.error) throw build.error;
  if (build.status !== 0) process.exitCode = build.status || 1;
  else { const result = spawnSync(binary, ['--nocapture'], {stdio:'inherit'}); if (result.error) throw result.error; process.exitCode = result.status || 0; }
} finally { await rm(scratch, {recursive:true,force:true}); }
