# Lutzy

Desktop utility for batch-applying colour LUTs to video files. Point it at a directory, confirm LUT assignments, and export. Lutzy remembers the last-used LUT per camera model, so repeat jobs need zero configuration.

## Features

- **Batch processing** — drop a folder of video files and apply LUTs to all of them in one go
- **Per-camera LUT memory** — automatically recalls the last LUT used for each detected camera model
- **Camera auto-detection** — reads metadata tags from video files via ffprobe to identify camera make/model
- **Hardware acceleration** — uses platform-native GPU decode/encode (VideoToolbox, NVENC, QSV, AMF) where available
- **.cube LUT support** — industry-standard 3D LUT files
- **Progress tracking** — per-file and global progress bars during export

## Prerequisites

- [Rust](https://www.rust-lang.org/tools/install) (stable)
- [Node.js](https://nodejs.org/) v22+
- Tauri [system requirements](https://tauri.app/start/prerequisites/)

## Development

```bash
npm install
npm run tauri dev
```

First run will take a few minutes to download and compile Rust dependencies. Subsequent runs only rebuild your changes.

## Building

```bash
npm run tauri build
```

The binary is at `src-tauri/target/release/lutzy`. Installers are in `src-tauri/target/release/bundle/`.

## Architecture

- **Desktop framework:** [Tauri 2](https://tauri.app)
- **Frontend:** [React](https://react.dev) + [TypeScript](https://www.typescriptlang.org) + [Tailwind CSS](https://tailwindcss.com)
- **Backend:** Rust
- **Video processing:** FFmpeg via [ffmpeg-sidecar](https://github.com/nicholasgasior/ffmpeg-sidecar) (bundled)
- **Persistence:** SQLite via [rusqlite](https://github.com/rusqlite/rusqlite)

For a detailed architecture overview, see [docs/summary.md](docs/summary.md).

## License

[MIT](LICENSE)
