# Screenshot Inbox

Local-first visual + OCR search over **an existing image folder**. The initial milestone is a working, exercised indexing/search core and CLI, with a Tauri 2 development UI and Rust-to-Node bridge. **It is not a verified native desktop release.**

## What works now

- Recursively index PNG, JPEG and WebP without moving or modifying originals.
- Real CPU inference: quantized CLIP ViT-B/32 image/text embeddings, and Tesseract English OCR. No AI API key or cloud inference.
- Search a text-free dog photograph with `a photo of a dog`; search invoice pixels with `73421`.
- Visual-only, OCR-only and hybrid search. Hybrid gives literal OCR matches priority over cosine similarity. Visual scores are rankings, not calibrated confidence; unrelated queries still return nearest images.
- Persist normalized embeddings, OCR, content hashes and JPEG thumbnails locally; rescan skips unchanged contents and prunes deleted entries. Corrupt/oversized images are reported individually. Index writes use a lock and atomic replacement.
- Return a validated original path from an indexed ID. The UI's native open action is wired, but **OS application launch has not been verified**.

## Run the verified core

Requires Node.js 22+ and npm; first inference downloads about 154 MiB of model/OCR cache in this run. Normal inference runs locally. `npm ci` installs locked dependencies, including native CPU inference libraries.

```sh
npm ci
npm run benchmark
npm test
node src/cli.js index /absolute/path/to/images /absolute/path/to/private-state
node src/cli.js search /absolute/path/to/images /absolute/path/to/private-state 'a photo of a dog' visual
node src/cli.js search /absolute/path/to/images /absolute/path/to/private-state '73421' text
node src/cli.js original /absolute/path/to/images /absolute/path/to/private-state IMAGE_ID
```

The CLI emits JSON to stdout; errors are JSON on stderr with nonzero status. The `original` command returns a path, intentionally not an OS launch. Omit the state argument to use `~/.local/share/screenshot-inbox`. Tauri uses its platform app-data directory instead.

After warming the cache, `SCREENSHOT_INBOX_OFFLINE=1` forbids CLIP network loading and requires existing English OCR data. `SCREENSHOT_INBOX_CACHE=/path/to/cache` changes the default `~/.cache/screenshot-inbox` model cache. Example (POSIX shell):

```sh
SCREENSHOT_INBOX_OFFLINE=1 node src/cli.js search /path/to/images /path/to/state 'a dog' visual
```

Tests and the benchmark download a **public CC0 dog fixture** if missing; the offline flag applies to inference, not that test-fixture setup. Generated cards and downloaded fixtures live outside git. See [fixture provenance](docs/fixtures.md).

## Desktop development (not yet verified)

```sh
# Install Rust and the native prerequisites for your OS first:
# https://v2.tauri.app/start/prerequisites/
# For a rustup installation, ensure ~/.cargo/bin is on PATH.
npm run tauri -- dev
```

Choose an existing image folder, wait for indexing, search, then use **Open original**. This prototype runs the Node core as a subprocess from the source checkout: **Node must be on the desktop process PATH**. Model loading happens per command, not in a resident service. Bundling is disabled because neither the Node runtime nor source-tree core is packaged. Do not distribute this development binary as a standalone app.

`npm run dev` is an honest browser-only layout preview: it disables the native picker and tells you to use Tauri. There is no unauthenticated local HTTP indexing server and no fabricated search demo.

## Verification

See [milestone report](docs/milestone.md) for exact results and blockers. Additional commands:

```sh
npm run build              # Vite production frontend
npm run test:bridge        # rustc + Node; no GTK/WebKit required
npm run icons              # generate original app icons into ignored folders
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo check --manifest-path src-tauri/Cargo.toml # requires OS development libraries
npm audit
```

The DOM integration test drives the real CLI, real CLIP/OCR models, persisted results and original-path resolution. Only native folder selection and actual OS opening are substituted on the headless runner. Separate UI tests check error recovery and filename HTML-injection resistance. Standalone Rust bridge tests spawn the real core. This does **not** prove that Tauri's command registration, plugin integration or WebView work.

## Architecture

```text
ui/app.js          framework-independent DOM UI + injected adapter
ui/main.js         Tauri dialog/invoke adapter (browser preview is explicit)
src-tauri/         thin command handler + native opener
  src/bridge.rs    tested subprocess protocol (no shell)
src/cli.js         JSON process protocol
src/inbox.js       scan → hash → OCR/embedding → private persisted index → rank
src/models.js      pinned CLIP revision, CPU q8, model/OCR cache and offline policy
src/paths.js       cross-platform path confinement
```

The core has no UI or Tauri dependency. Index format includes model revision and dtype so incompatible embeddings are rejected. Current persistence is a whole-file JSON snapshot; search is linear cosine ranking. This intentionally establishes correctness on small libraries before adding SQLite/ANN and a resident worker.

## Privacy and limits

- Originals are read locally; no image or OCR content is uploaded. First use contacts package/model/data hosts for downloads. No telemetry is implemented.
- The index contains **plaintext source paths, OCR, embeddings and thumbnails**. Protect the state/cache directories; delete a folder's hash-named JSON to forget its index. POSIX file modes are restrictive, but this is not encryption or a hardened multi-user sandbox.
- Symlink entries are skipped; original paths are canonicalized and checked against the selected root. Source changes while scanning/opening can still race; use trusted local folders.
- Manual rescans only; no folder watcher, cancellation, pagination, EXIF-specific search, HEIC, PDF or video support. English OCR only. Unicode text quality and non-English visual search are not validated.
- 25 MiB input and 40-million-pixel decode limits. OCR/CLIP quality is imperfect. One three-image benchmark is not a retrieval-quality evaluation or a large-library performance claim.
- Crash locks require manual removal of the relevant `.lock` after confirming no indexer is running. A model-version mismatch requires deleting/rebuilding that index.
- Linux core/bridge exercised. **macOS/Windows app behavior and Mac performance remain unverified.** No Apple-only APIs.

MIT license. Upstream model/data/dependency notices still apply. No deployment, merge or paid service is part of this milestone.
