use crate::db::{self, DbState, LutEntry, LUTS_DIR};
use crate::lut;
use std::fs;
use std::path::Path;
use tauri::{AppHandle, Manager};

fn luts_dir(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data dir: {}", e))?;

    let dir = app_data_dir.join(LUTS_DIR);
    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create luts directory: {}", e))?;
    Ok(dir)
}

#[tauri::command]
pub fn add_luts(file_paths: Vec<String>, app: AppHandle) -> Result<Vec<LutEntry>, String> {
    let dir = luts_dir(&app)?;

    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    for src_path_str in &file_paths {
        let src = Path::new(src_path_str);
        let filename = src
            .file_name()
            .and_then(|n| n.to_str())
            .ok_or_else(|| format!("Invalid file path: {}", src_path_str))?;

        let dest = dir.join(filename);

        // Skip if already exists at this path
        if dest.exists() {
            let existing: Option<i64> = conn
                .query_row(
                    "SELECT id FROM luts WHERE stored_path = ?1",
                    rusqlite::params![dest.to_string_lossy()],
                    |row| row.get(0),
                )
                .ok();

            if existing.is_some() {
                continue;
            }
        }

        fs::copy(src, &dest).map_err(|e| {
            format!(
                "Failed to copy {} to {}: {}",
                src.display(),
                dest.display(),
                e
            )
        })?;

        let stored_path = dest.to_string_lossy().to_string();
        let parsed_label = lut::parse_lut_label(&dest);
        eprintln!(
            "[add_luts] dest={:?}, parsed_label={:?}",
            dest, parsed_label
        );
        let label = parsed_label.unwrap_or_else(|| {
            Path::new(filename)
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or(filename)
                .to_string()
        });

        db::add_lut(&conn, filename, &label, &stored_path)
            .map_err(|e| format!("Failed to register LUT: {}", e))?;
    }

    db::get_all_luts(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_luts(app: AppHandle) -> Result<Vec<LutEntry>, String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::get_all_luts(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_lut(id: i64, app: AppHandle) -> Result<(), String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    // Get the stored path before deleting so we can remove the file
    let stored_path: Option<String> = conn
        .query_row(
            "SELECT stored_path FROM luts WHERE id = ?1",
            rusqlite::params![id],
            |row| row.get(0),
        )
        .ok();

    db::delete_lut(&conn, id).map_err(|e| e.to_string())?;

    // Remove the file from disk
    if let Some(path) = stored_path {
        let _ = fs::remove_file(path);
    }

    Ok(())
}
