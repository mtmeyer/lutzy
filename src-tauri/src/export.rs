use crate::db;
use crate::db::DbState;
use ffmpeg_sidecar::command::FfmpegCommand;
use ffmpeg_sidecar::event::{FfmpegEvent, LogLevel};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;
use tauri::{AppHandle, Emitter, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportVideo {
    pub path: String,
    pub camera_key: String,
    pub duration: Option<f64>,
    pub video_codec: String,
    pub bit_rate: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportOutputSettings {
    pub destination: String,
    pub custom_path: String,
    pub suffix: String,
    pub overwrite: bool,
    pub video_codec: String,
    pub output_extension: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportJob {
    pub videos: Vec<ExportVideo>,
    pub camera_luts: HashMap<String, String>,
    pub output_settings: ExportOutputSettings,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportProgress {
    pub file_index: usize,
    pub total_files: usize,
    pub filename: String,
    pub frame: Option<u32>,
    pub fps: Option<f32>,
    pub time: Option<String>,
    pub speed: Option<f32>,
    pub percent: Option<f64>,
    pub status: String,
}

fn parse_time_to_seconds(time_str: &str) -> f64 {
    let parts: Vec<&str> = time_str.split(':').collect();
    if parts.len() != 3 {
        return 0.0;
    }
    let hours: f64 = parts[0].parse().unwrap_or(0.0);
    let minutes: f64 = parts[1].parse().unwrap_or(0.0);
    let seconds: f64 = parts[2].parse().unwrap_or(0.0);
    hours * 3600.0 + minutes * 60.0 + seconds
}

#[tauri::command]
pub fn start_export(job: ExportJob, app: AppHandle) -> Result<(), String> {
    // Validate: every video must have a LUT assigned
    for video in &job.videos {
        if !job.camera_luts.contains_key(&video.camera_key) {
            return Err(format!(
                "No LUT assigned for camera: {}",
                if video.camera_key.is_empty() {
                    "unknown"
                } else {
                    &video.camera_key
                }
            ));
        }
    }

    tauri::async_runtime::spawn_blocking(move || {
        let total = job.videos.len();

        for (i, video) in job.videos.iter().enumerate() {
            let lut_path = job.camera_luts.get(&video.camera_key).unwrap();
            let path = Path::new(&video.path);
            let stem = path
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("output");
            let ext = if job.output_settings.output_extension == "same" {
                path.extension()
                    .and_then(|e| e.to_str())
                    .unwrap_or("mp4")
                    .to_string()
            } else {
                job.output_settings.output_extension.clone()
            };

            let output_filename = format!("{}{}.{}", stem, job.output_settings.suffix, ext);
            let output_path = if job.output_settings.destination == "custom"
                && !job.output_settings.custom_path.is_empty()
            {
                Path::new(&job.output_settings.custom_path)
                    .join(&output_filename)
                    .to_string_lossy()
                    .to_string()
            } else {
                path.parent()
                    .unwrap_or(Path::new("."))
                    .join(&output_filename)
                    .to_string_lossy()
                    .to_string()
            };

            // Check if output exists and overwrite is not enabled
            if !job.output_settings.overwrite && Path::new(&output_path).exists() {
                let _ = app.emit(
                    "export-progress",
                    &ExportProgress {
                        file_index: i,
                        total_files: total,
                        filename: video.path.rsplit('/').next().unwrap_or("").to_string(),
                        frame: None,
                        fps: None,
                        time: None,
                        speed: None,
                        percent: None,
                        status: "error".to_string(),
                    },
                );
                continue;
            }

            let mut command = FfmpegCommand::new();
            command
                .hide_banner()
                .input(&video.path)
                .args(["-map_metadata", "0"])
                .args(["-map", "0:v:0"])
                .args(["-map", "0:a:0"])
                .args(["-vf", &format!("lut3d={}", lut_path)]);

            // Determine video encoder based on codec selection
            let (encoder, force_yuv420p) = match job.output_settings.video_codec.as_str() {
                "h264" => (Some("libx264".to_string()), true),
                "h265" => (Some("libx265".to_string()), true),
                "prores" => (Some("prores_ks".to_string()), false),
                _ => {
                    // "same as source" — map ffprobe codec name to FFmpeg encoder name
                    let mapped = match video.video_codec.to_lowercase().as_str() {
                        "h264" | "avc1" | "avc3" => Some("libx264".to_string()),
                        "hevc" | "h265" | "hvc1" | "hev1" | "dvhe" | "dvh1" => {
                            Some("libx265".to_string())
                        }
                        "vp9" => Some("libvpx-vp9".to_string()),
                        "vp8" => Some("libvpx".to_string()),
                        "av1" => Some("libaom-av1".to_string()),
                        "mpeg4" | "xvid" | "divx" => Some("mpeg4".to_string()),
                        "mpeg2video" => Some("mpeg2video".to_string()),
                        "mpeg1video" => Some("mpeg1video".to_string()),
                        _ => None,
                    };
                    (mapped, false)
                }
            };
            if let Some(ref enc) = encoder {
                command.args(["-c:v", enc]);
                if force_yuv420p {
                    command.args(["-pix_fmt", "yuv420p"]);
                }
                // Pass source bitrate when using "same as source" to match quality
                if job.output_settings.video_codec == "same" {
                    if let Some(br) = video.bit_rate {
                        command.args(["-b:v", &br.to_string()]);
                    }
                }
            }

            command.args(["-c:a", "copy"]).args(["-dn"]).args(["-sn"]);

            if job.output_settings.overwrite {
                command.arg("-y");
            }

            command.arg(&output_path);

            let filename = video.path.rsplit('/').next().unwrap_or("").to_string();
            let duration = video.duration;

            let mut child = match command.spawn() {
                Ok(c) => c,
                Err(e) => {
                    let _ = app.emit(
                        "export-progress",
                        &ExportProgress {
                            file_index: i,
                            total_files: total,
                            filename: filename.clone(),
                            frame: None,
                            fps: None,
                            time: None,
                            speed: None,
                            percent: None,
                            status: format!("error: {}", e),
                        },
                    );
                    continue;
                }
            };

            let iter = match child.iter() {
                Ok(iter) => iter,
                Err(e) => {
                    let _ = app.emit(
                        "export-progress",
                        &ExportProgress {
                            file_index: i,
                            total_files: total,
                            filename: filename.clone(),
                            frame: None,
                            fps: None,
                            time: None,
                            speed: None,
                            percent: None,
                            status: format!("error: {}", e),
                        },
                    );
                    continue;
                }
            };

            for event in iter {
                match event {
                    FfmpegEvent::Error(e)
                    | FfmpegEvent::Log(LogLevel::Error | LogLevel::Fatal, e) => {
                        if !e.contains("No streams found") {
                            eprintln!("[export] FFmpeg error on {}: {}", filename, e);
                        }
                    }
                    FfmpegEvent::Progress(p) => {
                        let file_percent = duration.filter(|d| *d > 0.0).map(|d| {
                            let current = parse_time_to_seconds(&p.time);
                            (current / d * 100.0).clamp(0.0, 100.0)
                        });
                        let _ = app.emit(
                            "export-progress",
                            &ExportProgress {
                                file_index: i,
                                total_files: total,
                                filename: filename.clone(),
                                frame: Some(p.frame),
                                fps: if p.fps > 0.0 { Some(p.fps) } else { None },
                                time: Some(p.time),
                                speed: if p.speed > 0.0 { Some(p.speed) } else { None },
                                percent: file_percent,
                                status: "processing".to_string(),
                            },
                        );
                    }
                    FfmpegEvent::Done => break,
                    _ => {}
                }
            }

            let _ = app.emit(
                "export-progress",
                &ExportProgress {
                    file_index: i,
                    total_files: total,
                    filename: filename.clone(),
                    frame: None,
                    fps: None,
                    time: None,
                    speed: None,
                    percent: Some(100.0),
                    status: "done".to_string(),
                },
            );
        }

        // Save camera→LUT mappings to SQLite
        let state = app.state::<DbState>();
        if let Ok(conn) = state.0.lock() {
            for (camera_key, lut_path) in &job.camera_luts {
                let _ = db::set_lut(&conn, camera_key, lut_path);
            }
        }

        let _ = app.emit(
            "export-progress",
            &ExportProgress {
                file_index: total,
                total_files: total,
                filename: String::new(),
                frame: None,
                fps: None,
                time: None,
                speed: None,
                percent: Some(100.0),
                status: "complete".to_string(),
            },
        );
    });

    Ok(())
}
