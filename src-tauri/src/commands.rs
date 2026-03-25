use crate::db::{self, DbState, LutEntry, LUTS_DIR};
use crate::export::{self, ExportJob};
use crate::lut;
use std::collections::HashMap;
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

    // Remove camera assignments referencing this LUT
    if let Some(ref path) = stored_path {
        db::delete_camera_luts_by_lut_path(&conn, path).map_err(|e| e.to_string())?;
    }

    db::delete_lut(&conn, id).map_err(|e| e.to_string())?;

    // Remove the file from disk
    if let Some(path) = stored_path {
        let _ = fs::remove_file(path);
    }

    Ok(())
}

#[tauri::command]
pub fn rename_lut(id: i64, label: String, app: AppHandle) -> Result<(), String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::update_lut_label(&conn, id, &label).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_camera_luts(app: AppHandle) -> Result<HashMap<String, String>, String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let rows = db::get_all_camera_luts(&conn).map_err(|e| e.to_string())?;
    Ok(rows.into_iter().collect())
}

#[tauri::command]
pub fn get_app_settings(app: AppHandle) -> Result<HashMap<String, String>, String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let rows = db::get_all_settings(&conn).map_err(|e| e.to_string())?;
    Ok(rows.into_iter().collect())
}

#[tauri::command]
pub fn set_app_setting(key: String, value: String, app: AppHandle) -> Result<(), String> {
    let state = app.state::<DbState>();
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    db::set_setting(&conn, &key, &value).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn check_overwrite(job: ExportJob) -> Result<Vec<String>, String> {
    use std::collections::HashSet;

    let source_paths: HashSet<String> = job.videos.iter().map(|v| v.path.to_lowercase()).collect();

    // Map lowercased output path → (original output path, source videos)
    let mut output_map: HashMap<String, (String, Vec<&str>)> = HashMap::new();
    for video in &job.videos {
        let output_path = export::build_output_path(&video.path, &job.output_settings);
        let key = output_path.to_lowercase();
        let entry = output_map
            .entry(key)
            .or_insert_with(|| (output_path, Vec::new()));
        entry.1.push(video.path.as_str());
    }

    let mut conflicts: Vec<String> = Vec::new();

    for (output_path, source_videos) in output_map.values() {
        let mut is_conflict = false;

        if source_paths.contains(&output_path.to_lowercase()) {
            is_conflict = true;
        }

        if source_videos.len() > 1 {
            is_conflict = true;
        }

        if is_conflict {
            conflicts.push(output_path.clone());
        }
    }

    Ok(conflicts)
}
