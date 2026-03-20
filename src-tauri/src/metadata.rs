use serde::Deserialize;
use std::path::Path;
use std::process::Command;

#[derive(Debug, Clone)]
pub struct VideoMetadata {
    pub resolution: String,
    pub framerate: f64,
    pub duration: f64,
    pub camera_key: String,
}

#[derive(Debug, Deserialize)]
struct FfprobeOutput {
    streams: Option<Vec<FfprobeStream>>,
    format: Option<FfprobeFormat>,
}

#[derive(Debug, Deserialize)]
struct FfprobeStream {
    codec_type: Option<String>,
    width: Option<u64>,
    height: Option<u64>,
    r_frame_rate: Option<String>,
    avg_frame_rate: Option<String>,
}

#[derive(Debug, Deserialize)]
struct FfprobeFormat {
    duration: Option<String>,
    tags: Option<std::collections::HashMap<String, String>>,
}

pub fn probe_video(path: &str) -> Result<VideoMetadata, String> {
    let ffprobe_path = ffmpeg_sidecar::ffprobe::ffprobe_path();

    let output = Command::new(ffprobe_path)
        .args([
            "-v",
            "quiet",
            "-print_format",
            "json",
            "-show_format",
            "-show_streams",
            path,
        ])
        .output()
        .map_err(|e| format!("Failed to run ffprobe: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("ffprobe failed: {}", stderr));
    }

    let json: FfprobeOutput = serde_json::from_slice(&output.stdout)
        .map_err(|e| format!("Failed to parse ffprobe output: {}", e))?;

    let resolution = extract_resolution(&json);
    let framerate = extract_framerate(&json);
    let duration = extract_duration(&json);
    let camera_key = extract_camera_key(&json, path);

    Ok(VideoMetadata {
        resolution,
        framerate,
        duration,
        camera_key,
    })
}

fn extract_resolution(json: &FfprobeOutput) -> String {
    if let Some(ref streams) = json.streams {
        for stream in streams {
            if stream.codec_type.as_deref() == Some("video") {
                if let (Some(w), Some(h)) = (stream.width, stream.height) {
                    return format!("{}x{}", w, h);
                }
            }
        }
    }
    String::new()
}

fn extract_framerate(json: &FfprobeOutput) -> f64 {
    if let Some(ref streams) = json.streams {
        for stream in streams {
            if stream.codec_type.as_deref() == Some("video") {
                if let Some(rate_str) = &stream.r_frame_rate {
                    if let Some(rate) = parse_fraction(rate_str) {
                        if rate > 0.0 {
                            return rate;
                        }
                    }
                }
                if let Some(rate_str) = &stream.avg_frame_rate {
                    if let Some(rate) = parse_fraction(rate_str) {
                        if rate > 0.0 {
                            return rate;
                        }
                    }
                }
            }
        }
    }
    0.0
}

fn extract_duration(json: &FfprobeOutput) -> f64 {
    if let Some(ref format) = json.format {
        if let Some(ref dur_str) = format.duration {
            return dur_str.parse::<f64>().unwrap_or(0.0);
        }
    }
    0.0
}

fn extract_camera_key(json: &FfprobeOutput, path: &str) -> String {
    let tags = json.format.as_ref().and_then(|f| f.tags.as_ref());

    // 1. com.apple.quicktime.model
    if let Some(tags) = tags {
        if let Some(model) = tags.get("com.apple.quicktime.model") {
            let key = normalize_camera_key(model);
            if !key.is_empty() {
                return key;
            }
        }

        // 2. make + model
        let make = tags.get("make").cloned().unwrap_or_default();
        let model = tags.get("model").cloned().unwrap_or_default();
        if !make.is_empty() || !model.is_empty() {
            let combined = format!("{} {}", make, model).trim().to_string();
            if !combined.is_empty() {
                let key = normalize_camera_key(&combined);
                if !key.is_empty() {
                    return key;
                }
            }
        }

        // 3. encoder
        if let Some(encoder) = tags.get("encoder") {
            let key = normalize_camera_key(encoder);
            if !key.is_empty() {
                return key;
            }
        }
    }

    // 4. File extension hint
    let ext = Path::new(path)
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase());

    match ext.as_deref() {
        Some("braw") => "blackmagic".to_string(),
        Some("mxf") => "sony_or_canon".to_string(),
        Some("r3d") => "red".to_string(),
        _ => String::new(),
    }
}

fn normalize_camera_key(raw: &str) -> String {
    let lower = raw.to_lowercase();

    // Apple/iPhone
    if lower.contains("iphone") {
        return "apple_iphone".to_string();
    }
    if lower.contains("ipad") {
        return "apple_ipad".to_string();
    }

    // Sony
    if lower.contains("sony") || lower.contains("ilme") {
        if lower.contains("fx3") {
            return "sony_fx3".to_string();
        }
        if lower.contains("fx6") {
            return "sony_fx6".to_string();
        }
        if lower.contains("fx30") {
            return "sony_fx30".to_string();
        }
        if lower.contains("a7") {
            if lower.contains("iii") || lower.contains("3") {
                return "sony_a7iii".to_string();
            }
            if lower.contains("iv") || lower.contains("4") {
                return "sony_a7iv".to_string();
            }
            return "sony_a7".to_string();
        }
        return "sony".to_string();
    }

    // Canon
    if lower.contains("canon") {
        if lower.contains("r5") {
            return "canon_r5".to_string();
        }
        if lower.contains("r6") {
            return "canon_r6".to_string();
        }
        if lower.contains("r7") {
            return "canon_r7".to_string();
        }
        if lower.contains("r8") {
            return "canon_r8".to_string();
        }
        return "canon".to_string();
    }

    // Blackmagic
    if lower.contains("blackmagic") || lower.contains("bmpcc") {
        if lower.contains("6k") {
            return "bmpcc_6k".to_string();
        }
        if lower.contains("4k") {
            return "bmpcc_4k".to_string();
        }
        return "blackmagic".to_string();
    }

    // Nikon
    if lower.contains("nikon") {
        if lower.contains("z8") {
            return "nikon_z8".to_string();
        }
        if lower.contains("z9") {
            return "nikon_z9".to_string();
        }
        if lower.contains("z6") {
            return "nikon_z6".to_string();
        }
        return "nikon".to_string();
    }

    // Panasonic
    if lower.contains("panasonic") || lower.contains("lumix") {
        if lower.contains("s5") {
            return "panasonic_s5".to_string();
        }
        if lower.contains("s1") {
            return "panasonic_s1".to_string();
        }
        return "panasonic".to_string();
    }

    // RED
    if lower.contains("red") || lower.contains("r3d") || lower.contains("komodo") {
        return "red".to_string();
    }

    // GoPro
    if lower.contains("gopro") {
        return "gopro".to_string();
    }

    // DJI
    if lower.contains("dji") {
        return "dji".to_string();
    }

    // Fujifilm
    if lower.contains("fujifilm") || lower.contains("fuji") {
        return "fujifilm".to_string();
    }

    String::new()
}

fn parse_fraction(s: &str) -> Option<f64> {
    if let Some((num_str, den_str)) = s.split_once('/') {
        let num: f64 = num_str.parse().ok()?;
        let den: f64 = den_str.parse().ok()?;
        if den != 0.0 {
            return Some(num / den);
        }
    }
    s.parse().ok()
}
