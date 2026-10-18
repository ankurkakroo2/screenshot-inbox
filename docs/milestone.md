# Initial milestone: verified local inference and integrated search core

## Acceptance boundary

Completed: small-library indexing, visual-content retrieval, OCR-text retrieval, persisted thumbnails, original-path resolution, executable CLI and a DOM-to-real-core integration. A Tauri development adapter is implemented, but the **native desktop build and OS opener are not verified**. This is not a packaged release.

## Actual execution

Raw successful command output: [verification.txt](verification.txt).

- `npm ci --no-fund`: installed the locked dependency tree; 0 audit vulnerabilities. The development dependency `whatwg-encoding` emits a deprecation warning.
- `npm test`: **9 tests passed, 0 failed**; includes real model inference, CLI processes, persistent indexing, changed/deleted/corrupt files, unchanged-content reuse, nested folders, symlink escape rejection, index lock contention, search validation, Windows drive/UNC path policy and DOM integration. The main index test groups multiple assertions in one test.
- `npm run test:bridge`: **2 Rust tests passed, 0 failed**, compiling `src-tauri/src/bridge.rs` directly with rustc, then exercising the actual Node core and real OCR. This deliberately does not link Tauri/GTK.
- `npm run icons`: generated original geometric app marks into ignored paths; no binary images are committed.
- `npm run build`: **8 modules transformed**, production frontend emitted successfully.
- `npm audit`: **found 0 vulnerabilities** at verification time. This is not a Rust dependency security audit.
- `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check`: passed.
- A separate warmed-cache run with `SCREENSHOT_INBOX_OFFLINE=1 npm test` passed before the final UI-real-core integration test was added. Empty-cache offline behavior is explicitly tested with network fetch prohibited; the ordinary final suite also exercises that test. Fixture downloads remain a separate network activity.

Red-to-green execution was observed for the model adapter, index, CLI, UI, standalone Rust bridge, offline-cache behavior and cross-platform path policy before implementation. Review was self-review and static scans in this one-shot execution, **not an independent reviewer**. No `[verified]` reviewer prefix is used. A static scanner flagged the test helper alias `exec` even though it wrapped argument-array `execFile` (no shell); the helper was renamed `runCli` for clarity and rescanned.

## Prototype benchmark (before product integration)

[benchmark.json](benchmark.json) is actual output from `npm run benchmark`, not a fabricated estimate. Linux x64, Node v22.22.1, CPU q8 CLIP, two intra-op threads, three fixture images. Caches had already been downloaded by the initial inference test. “Cold” means a new model/worker session, **not a network download measurement**.

- First photo embedding including model session load: 476.11268599999994 ms.
- Subsequent two image embeddings: 81.85924300000033 ms and 76.01782000000003 ms.
- First text embedding including tokenizer/text model session: 542.3640460000001 ms.
- Warm text embedding: 4.08141599999999 ms.
- OCR worker initialization + invoice recognition: 316.315607 ms; actual result `INVOICE 73421`.
- Process RSS snapshot: 481.06640625 MiB, **not a measured peak**.
- Dog query ranked opaque filename `a.jpg` first: cosine 0.27956308407432257, ahead of the generated invoice and blue negative-control images. The dog is a CC0 photograph without printed target text; filenames, OCR and metadata were not used in this visual-only ranking.
- Model + OCR cache occupied 154 MiB according to `du -sh` (filesystem-rounded). Mac performance, large-library latency and broader retrieval accuracy have not been measured.

## Native blockers actually encountered

Rust and cargo were initially absent. A minimal user-local rustup toolchain and rustfmt were installed successfully. The standalone bridge tests now compile and run.

`cargo check --locked --manifest-path src-tauri/Cargo.toml` still exits **101** in the system-library build scripts. Actual diagnostic:

```text
Could not run `PKG_CONFIG_ALLOW_SYSTEM_CFLAGS=1 pkg-config --libs --cflags glib-2.0 'glib-2.0 >= 2.70'`
The pkg-config command could not be found.
```

`tauri info` also reports WebKitGTK 4.1 and rsvg2 missing. `sudo -n true` was denied; no privileged installation was performed. A headless browser attempt separately failed because Chromium could not load `libnspr4.so`. Consequently there is **no verified native window, browser screenshot, dialog, plugin registration, native original-file launch, macOS build or Windows build**. DOM behavior and frontend compilation are verified, not native rendering.

The full native check log is available locally at `/home/hermes/.hermes/cache/scratch/screenshot-inbox-native-check.txt`. Install OS prerequisites in an authorized environment and rerun `npm run tauri -- dev`; source-level Tauri glue may still need fixes after the dependency blocker is removed.

## Remaining engineering work

1. Compile and run the native Tauri app on Linux, macOS and Windows; verify real picker/open flows and responsive rendering.
2. Replace the development source-tree + system-Node bridge with a distributable sidecar/runtime; signing/installers have not been attempted. Bundling is explicitly disabled.
3. Add a resident worker, cancellation/progress, folder watching and storage/search designed for large collections.
4. Evaluate retrieval/OCR quality on a larger licensed corpus; benchmark Mac hardware rather than inferring from this host.
5. Harden handling of untrusted/mutating folders and index corruption. Current confinement is not a sandbox or encryption.

No credentials, source images, model weights, personal indexes, deployment or paid inference service were added. Work is on a feature branch and must remain unmerged until the user authorizes a merge. No GitHub Actions workflow or CI-green claim is part of this milestone.
