# AGENTS.md

## Project Context

A desktop utility for batch-applying colour LUTs to video files. Not a colour grading tool — the goal is a minimal, fast workflow: select a directory, confirm LUT assignments, export. The app remembers the last-used LUT per camera model so repeat jobs need zero configuration.

**Stack:** Tauri 2 · SolidJS + TypeScript · Rust · FFmpeg via `ffmpeg-sidecar` (bundled) · SQLite via `rusqlite`

**Key decisions:**
- FFmpeg/ffprobe are bundled as Tauri sidecars — no system dependency for users
- Camera model is detected from ffprobe metadata tags and normalised to a key (e.g. `sony_fx3`)
- Per-camera LUT memory lives in SQLite at the platform app data dir — never inside the app bundle
- Single-screen UI: file list (left), LUT assignment + output settings (right), progress + export (footer)

**Gotchas:**
- Never pass `-y` to FFmpeg unless the user has explicitly enabled overwrite — it's off by default
- Long-running FFmpeg jobs must stream progress via Tauri events, not block a command
- App data dir is always resolved via `app.path().app_data_dir()` — never hardcode platform paths

---

## New Sessions

- Review `docs/summary.md` for full project context
- Check `docs/contents.md` for the documentation index
- Check git status and project structure before making changes

---

## Development Practices

0. **Use npm only** — never `pnpm`
1. **Read before editing** — understand context first
2. **Follow established patterns** — match existing code and docs
3. **Senior architect mindset** — consider performance, maintainability, testability
4. **Batch operations** — multiple tool calls per response where possible
5. **Match code style** — formatting, naming conventions
6. **No dev server** — ask the user to run and report back
7. **No unsolicited commits** — only when explicitly asked
8. **Update docs** — keep `docs/` in sync with new patterns
9. **Removing files** — always use `rm -f`
