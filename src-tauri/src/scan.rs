use crate::metadata;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

const VIDEO_EXTENSIONS: &[&str] = &["mp4", "mov", "mxf", "avi", "mkv", "webm", "braw", "r3d"];

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoFile {
    pub filename: String,
    pub path: String,
    pub file_size: u64,
    pub resolution: String,
    pub framerate: f64,
    pub duration: f64,
    pub camera_key: String,
    pub camera_display: String,
    pub video_codec: String,
    pub bit_rate: Option<u64>,
}

#[tauri::command]
pub fn scan_directory(dir_path: String) -> Result<Vec<VideoFile>, String> {
    let path = Path::new(&dir_path);
    if !path.is_dir() {
        return Err(format!("Not a directory: {}", dir_path));
    }

    let mut videos: Vec<VideoFile> = Vec::new();

    let entries = fs::read_dir(path).map_err(|e| format!("Failed to read directory: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let meta = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };

        if meta.is_dir() {
            continue;
        }

        let file_path = entry.path();
        let ext = file_path
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| e.to_lowercase());

        match ext {
            Some(ref e) if VIDEO_EXTENSIONS.contains(&e.as_str()) => {}
            _ => continue,
        }

        let filename = file_path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string();

        let path_str = file_path.to_string_lossy().to_string();

        let video_meta = metadata::probe_video(&path_str).unwrap_or(metadata::VideoMetadata {
            resolution: String::new(),
            framerate: 0.0,
            duration: 0.0,
            camera_key: String::new(),
            camera_display: String::new(),
            video_codec: String::new(),
            bit_rate: None,
        });

        videos.push(VideoFile {
            filename,
            path: path_str,
            file_size: meta.len(),
            resolution: video_meta.resolution,
            framerate: video_meta.framerate,
            duration: video_meta.duration,
            camera_key: video_meta.camera_key,
            camera_display: video_meta.camera_display,
            video_codec: video_meta.video_codec,
            bit_rate: video_meta.bit_rate,
        });
    }

    videos.sort_by(|a, b| a.filename.cmp(&b.filename));

    Ok(videos)
}
