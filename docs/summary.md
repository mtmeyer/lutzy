# Lutzy — Project Summary

## Overview

A desktop application for batch-applying LUTs to video files. The core workflow is intentionally minimal: point the app at a directory, confirm LUT assignments, and export. The app remembers which LUT was last used for each camera model, so repeat jobs require no configuration at all.

---

## Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Desktop framework | Tauri 2 | Small bundle size, native OS integration, strong security model |
| Frontend | React + TypeScript | Component model suits the panel-based UI |
| Backend language | Rust | Memory safety, strong async support, good FFmpeg ecosystem |
| Video processing | FFmpeg (via `ffmpeg-sidecar`) | Bundled binary, no system dependency for end users |
| Metadata extraction | ffprobe (bundled with FFmpeg) | Reads camera make/model tags from video container metadata |
| Persistence | SQLite via `rusqlite` | Lightweight, zero-config, ideal for per-camera LUT memory |

---

## Architecture

### Project Structure

```
lutzy/
├── src/                        # React frontend
│   ├── App.tsx
│   └── components/
│       ├── DirectoryPicker.tsx
│       ├── VideoList.tsx
│       ├── LutSelector.tsx
│       └── ExportPanel.tsx
├── src-tauri/
│   ├── src/
│   │   ├── main.rs
│   │   ├── ffmpeg.rs           # ffmpeg-sidecar wrappers
│   │   ├── metadata.rs         # Camera detection from ffprobe output
│   │   └── db.rs               # SQLite — camera → LUT memory
│   └── Cargo.toml
```

### Data Flow

```
User selects directory
        ↓
Rust scans for video files (.mp4, .mov, .mxf, .braw, ...)
        ↓
ffprobe extracts metadata per file
        ↓
Camera model identified from metadata tags
        ↓
SQLite queried for last-used LUT per camera
        ↓
UI groups files by camera, auto-populates known LUTs
        ↓
User confirms / overrides LUT assignments → Export
        ↓
FFmpeg processes each file: HW Decode → lut3d filter → HW Encode
        ↓
Progress streamed to UI via Tauri events
        ↓
SQLite updated with new camera → LUT mappings
```

---

## Camera Detection

ffprobe is used to read video container metadata. Camera model is resolved by checking the following tags in priority order:

1. `com.apple.quicktime.model` — iPhone and some mirrorless cameras
2. `make` + `model` — standard camera tags (e.g. `Sony` + `ILME-FX3`)
3. `encoder` — fallback; some cameras and recording software embed model info here
4. File extension hint — `.braw` implies Blackmagic; `.mxf` commonly Sony or Canon

The resolved camera string is normalised to a consistent key (e.g. `sony_fx3`, `bmpcc_6k`) before being stored in SQLite. Files where no camera can be determined are flagged as `unknown` and require a manual LUT assignment before they can be exported.

---

## Per-Camera LUT Memory

SQLite table:

```sql
CREATE TABLE camera_luts (
    camera_key   TEXT PRIMARY KEY,
    lut_path     TEXT NOT NULL,
    last_used    DATETIME NOT NULL
);
```

On directory scan, each detected camera key is looked up. If a record exists, the LUT path is pre-filled in the UI with a visual indicator ("last used for this camera"). After a successful export, the table is updated with the LUT that was used.

---

## FFmpeg Pipeline

LUT application uses the `lut3d` filter with a `.cube` file:

```
ffmpeg -hwaccel <platform> -i input.mp4 -vf lut3d=lut.cube -c:v <hw_encoder> -c:a copy output_graded.mp4
```

### Hardware Acceleration

The LUT filter itself runs on the CPU. Hardware acceleration is applied to the decode and encode steps on either side, which are typically the bottleneck for large files.

| Platform | Decode | Encode |
|---|---|---|
| macOS (all) | `-hwaccel videotoolbox` | `hevc_videotoolbox` / `h264_videotoolbox` |
| Windows — Nvidia | `-hwaccel cuda` | `hevc_nvenc` / `h264_nvenc` |
| Windows — AMD | `-hwaccel d3d11va` | `hevc_amf` / `h264_amf` |
| Windows — Intel | `-hwaccel qsv` | `hevc_qsv` / `h264_qsv` |
| Fallback (any) | Software | `libx264` / `libx265` |

The app detects available hardware encoders at launch and selects the best option automatically. Users can override this in preferences.

### Progress Streaming

`ffmpeg-sidecar` emits structured events during processing (frame number, fps, elapsed time, progress percentage). These are forwarded to the frontend via Tauri's event system and displayed in the progress bar.

---

## UI Design

Two-screen flow:

**Screen 1 — Welcome:** Full-screen centered layout shown on launch and when no directory is selected. Contains the app name ("Lutzy"), a short tagline, and a prominent "Select Folder" button. Users can also click the folder path text in the left panel to change folders at any time.

**Screen 2 — Main app:** Single-screen layout with three zones, shown after a directory is selected:
- **Left panel** — folder name with a back button (returns to welcome screen), scrollable file list with filename, resolution, framerate, file size, and camera badge. Files can be individually deselected. During export, each file shows a per-file progress bar; after export, a green checkmark (success) or red X (error) replaces the checkbox.
- **Right panel** — LUT assignment grouped by detected camera, plus output settings (destination folder, filename suffix, overwrite toggle).
- **Footer** — export button (labelled with clip count) and global progress bar.

### Output Settings (v1)

- Destination: same directory as source (configurable)
- Format: same as input (configurable in a future release)
- Filename suffix: `_graded` (editable)
- Overwrite originals: off by default

---

## Future Considerations

- **Per-export format selection** — output format/codec/bitrate configured at export time
- **LUT intensity** — opacity/blend slider to apply a LUT at less than 100%
- **Preview frame** — single-frame preview with LUT applied before committing to a full export
- **GPU LUT processing** — Metal compute shader on macOS for full GPU pipeline on very high resolution formats (6K+)
- **Watch folder mode** — automatically process new files dropped into a monitored directory
- **LUT library management** — organise and tag frequently used LUTs within the app
- **Images** - Apply LUTs to images as well as videos
