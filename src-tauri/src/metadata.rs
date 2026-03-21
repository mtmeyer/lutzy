use serde::Deserialize;
use std::path::Path;
use std::process::Command;

#[derive(Debug, Clone)]
pub struct VideoMetadata {
    pub resolution: String,
    pub framerate: f64,
    pub duration: f64,
    pub camera_key: String,
    pub camera_display: String,
    pub video_codec: String,
}

#[derive(Debug, Deserialize)]
struct FfprobeOutput {
    streams: Option<Vec<FfprobeStream>>,
    format: Option<FfprobeFormat>,
}

#[derive(Debug, Deserialize)]
struct FfprobeStream {
    codec_name: Option<String>,
    codec_type: Option<String>,
    width: Option<u64>,
    height: Option<u64>,
    r_frame_rate: Option<String>,
    avg_frame_rate: Option<String>,
    tags: Option<std::collections::HashMap<String, String>>,
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
    let (camera_key, camera_display) = extract_camera_info(&json, path);
    let video_codec = extract_video_codec(&json);

    Ok(VideoMetadata {
        resolution,
        framerate,
        duration,
        camera_key,
        camera_display,
        video_codec,
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

fn extract_video_codec(json: &FfprobeOutput) -> String {
    if let Some(ref streams) = json.streams {
        for stream in streams {
            if stream.codec_type.as_deref() == Some("video") {
                if let Some(ref name) = stream.codec_name {
                    return name.to_lowercase();
                }
            }
        }
    }
    String::new()
}

fn collect_camera_tags(json: &FfprobeOutput) -> std::collections::HashMap<String, String> {
    use std::collections::HashMap;

    let mut tags: HashMap<String, String> = HashMap::new();

    // 1. Start with stream-level tags (camera metadata often lives here)
    if let Some(ref streams) = json.streams {
        for stream in streams {
            if let Some(ref stream_tags) = stream.tags {
                for (k, v) in stream_tags {
                    tags.entry(k.to_lowercase()).or_insert_with(|| v.clone());
                }
            }
        }
    }

    // 2. Overlay format-level tags (format tags take priority for same key)
    if let Some(ref format) = json.format {
        if let Some(ref format_tags) = format.tags {
            for (k, v) in format_tags {
                tags.insert(k.to_lowercase(), v.clone());
            }
        }
    }

    tags
}

fn extract_camera_info(json: &FfprobeOutput, path: &str) -> (String, String) {
    let tags = collect_camera_tags(json);

    // 1. com.apple.quicktime.model
    if let Some(model) = tags.get("com.apple.quicktime.model") {
        let display = clean_display(model);
        if !display.is_empty() {
            return (slugify_key(&display), display);
        }
    }

    // 2. make + model
    let make = tags.get("make").map(|s| s.trim()).unwrap_or_default();
    let model = tags.get("model").map(|s| s.trim()).unwrap_or_default();
    if !make.is_empty() || !model.is_empty() {
        let combined = format!("{} {}", make, model).trim().to_string();
        if !combined.is_empty() {
            let display = clean_display(&combined);
            if !display.is_empty() {
                return (slugify_key(&display), display);
            }
        }
    }

    // 3. encoder tag
    if let Some(encoder) = tags.get("encoder") {
        let display = clean_display(encoder);
        if !display.is_empty() {
            return (slugify_key(&display), display);
        }
    }

    // 4. File extension hint
    let ext = Path::new(path)
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase());

    match ext.as_deref() {
        Some("braw") => ("blackmagic".to_string(), "Blackmagic".to_string()),
        Some("r3d") => ("red".to_string(), "RED".to_string()),
        Some("mxf") => ("mxf".to_string(), "MXF".to_string()),
        _ => (String::new(), String::new()),
    }
}

fn clean_display(raw: &str) -> String {
    // Trim and collapse whitespace
    let parts: Vec<&str> = raw.split_whitespace().collect();
    parts.join(" ")
}

fn slugify_key(input: &str) -> String {
    let mut result = String::with_capacity(input.len());
    let mut last_was_underscore = true; // skip leading underscores

    for c in input.chars() {
        if c.is_alphanumeric() {
            result.push(c.to_ascii_lowercase());
            last_was_underscore = false;
        } else if !last_was_underscore {
            result.push('_');
            last_was_underscore = true;
        }
    }

    // Trim trailing underscore
    if result.ends_with('_') {
        result.pop();
    }

    result
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
