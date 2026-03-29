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
    pub bit_rate: Option<u64>,
}

#[derive(Debug, Deserialize)]
pub(crate) struct FfprobeOutput {
    pub(crate) streams: Option<Vec<FfprobeStream>>,
    pub(crate) format: Option<FfprobeFormat>,
}

#[derive(Debug, Deserialize)]
pub(crate) struct FfprobeStream {
    pub(crate) codec_name: Option<String>,
    pub(crate) codec_type: Option<String>,
    pub(crate) width: Option<u64>,
    pub(crate) height: Option<u64>,
    pub(crate) r_frame_rate: Option<String>,
    pub(crate) avg_frame_rate: Option<String>,
    pub(crate) bit_rate: Option<String>,
    pub(crate) tags: Option<std::collections::HashMap<String, String>>,
}

#[derive(Debug, Deserialize)]
pub(crate) struct FfprobeFormat {
    pub(crate) duration: Option<String>,
    pub(crate) bit_rate: Option<String>,
    pub(crate) tags: Option<std::collections::HashMap<String, String>>,
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
    let bit_rate = extract_bit_rate(&json);

    Ok(VideoMetadata {
        resolution,
        framerate,
        duration,
        camera_key,
        camera_display,
        video_codec,
        bit_rate,
    })
}

pub(crate) fn extract_resolution(json: &FfprobeOutput) -> String {
    if let Some(ref streams) = json.streams {
        for stream in streams {
            if stream.codec_type.as_deref() == Some("video")
                && let (Some(w), Some(h)) = (stream.width, stream.height)
            {
                return format!("{}x{}", w, h);
            }
        }
    }
    String::new()
}

pub(crate) fn extract_framerate(json: &FfprobeOutput) -> f64 {
    if let Some(ref streams) = json.streams {
        for stream in streams {
            if stream.codec_type.as_deref() == Some("video")
                && let Some(rate_str) = &stream.r_frame_rate
                && let Some(rate) = parse_fraction(rate_str)
                && rate > 0.0
            {
                return rate;
            }
            if stream.codec_type.as_deref() == Some("video")
                && let Some(rate_str) = &stream.avg_frame_rate
                && let Some(rate) = parse_fraction(rate_str)
                && rate > 0.0
            {
                return rate;
            }
        }
    }
    0.0
}

pub(crate) fn extract_duration(json: &FfprobeOutput) -> f64 {
    if let Some(ref format) = json.format
        && let Some(ref dur_str) = format.duration
    {
        return dur_str.parse::<f64>().unwrap_or(0.0);
    }
    0.0
}

pub(crate) fn extract_video_codec(json: &FfprobeOutput) -> String {
    if let Some(ref streams) = json.streams {
        for stream in streams {
            if stream.codec_type.as_deref() == Some("video")
                && let Some(ref name) = stream.codec_name
            {
                return name.to_lowercase();
            }
        }
    }
    String::new()
}

pub(crate) fn extract_bit_rate(json: &FfprobeOutput) -> Option<u64> {
    if let Some(ref streams) = json.streams {
        for stream in streams {
            if stream.codec_type.as_deref() == Some("video")
                && let Some(ref br) = stream.bit_rate
                && let Ok(val) = br.parse::<u64>()
                && val > 0
            {
                return Some(val);
            }
        }
    }
    if let Some(ref format) = json.format
        && let Some(ref br) = format.bit_rate
        && let Ok(val) = br.parse::<u64>()
        && val > 0
    {
        return Some(val);
    }
    None
}

pub(crate) fn collect_camera_tags(
    json: &FfprobeOutput,
) -> std::collections::HashMap<String, String> {
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
    if let Some(ref format) = json.format
        && let Some(ref format_tags) = format.tags
    {
        for (k, v) in format_tags {
            tags.insert(k.to_lowercase(), v.clone());
        }
    }

    tags
}

pub(crate) fn extract_camera_info(json: &FfprobeOutput, path: &str) -> (String, String) {
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

pub(crate) fn clean_display(raw: &str) -> String {
    // Trim and collapse whitespace
    let parts: Vec<&str> = raw.split_whitespace().collect();
    parts.join(" ")
}

pub(crate) fn slugify_key(input: &str) -> String {
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

pub(crate) fn parse_fraction(s: &str) -> Option<f64> {
    if let Some((num_str, den_str)) = s.split_once('/') {
        let num: f64 = num_str.parse().ok()?;
        let den: f64 = den_str.parse().ok()?;
        if den != 0.0 {
            return Some(num / den);
        }
    }
    s.parse().ok()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    // --- helpers ---

    fn video_stream(
        codec_name: &str,
        width: u64,
        height: u64,
        r_frame_rate: &str,
        avg_frame_rate: &str,
        bit_rate: &str,
    ) -> FfprobeStream {
        FfprobeStream {
            codec_name: Some(codec_name.to_string()),
            codec_type: Some("video".to_string()),
            width: Some(width),
            height: Some(height),
            r_frame_rate: Some(r_frame_rate.to_string()),
            avg_frame_rate: Some(avg_frame_rate.to_string()),
            bit_rate: Some(bit_rate.to_string()),
            tags: None,
        }
    }

    fn audio_stream() -> FfprobeStream {
        FfprobeStream {
            codec_name: Some("aac".to_string()),
            codec_type: Some("audio".to_string()),
            width: None,
            height: None,
            r_frame_rate: None,
            avg_frame_rate: None,
            bit_rate: None,
            tags: None,
        }
    }

    fn make_json(
        streams: Option<Vec<FfprobeStream>>,
        format: Option<FfprobeFormat>,
    ) -> FfprobeOutput {
        FfprobeOutput { streams, format }
    }

    // --- parse_fraction ---

    #[test]
    fn fraction_standard_ntsc() {
        assert!((parse_fraction("30000/1001").unwrap() - 29.97).abs() < 0.01);
    }

    #[test]
    fn fraction_integer_fps() {
        assert_eq!(parse_fraction("24/1"), Some(24.0));
    }

    #[test]
    fn fraction_plain_number() {
        assert_eq!(parse_fraction("25"), Some(25.0));
    }

    #[test]
    fn fraction_zero_denominator() {
        assert_eq!(parse_fraction("0/0"), None);
    }

    #[test]
    fn fraction_malformed() {
        assert_eq!(parse_fraction("abc"), None);
    }

    #[test]
    fn fraction_empty() {
        assert_eq!(parse_fraction(""), None);
    }

    // --- slugify_key ---

    #[test]
    fn slugify_basic() {
        assert_eq!(slugify_key("Sony ILME-FX3"), "sony_ilme_fx3");
    }

    #[test]
    fn slugify_empty() {
        assert_eq!(slugify_key(""), "");
    }

    #[test]
    fn slugify_special_chars_only() {
        assert_eq!(slugify_key("---"), "");
    }

    #[test]
    fn slugify_leading_trailing_spaces() {
        assert_eq!(slugify_key("  Sony  "), "sony");
    }

    #[test]
    fn slugify_collapses_underscores() {
        assert_eq!(slugify_key("a---b---c"), "a_b_c");
    }

    // --- clean_display ---

    #[test]
    fn clean_display_collapses_whitespace() {
        assert_eq!(clean_display("  Sony   ILME-FX3  "), "Sony ILME-FX3");
    }

    #[test]
    fn clean_display_empty() {
        assert_eq!(clean_display(""), "");
    }

    #[test]
    fn clean_display_only_spaces() {
        assert_eq!(clean_display("   "), "");
    }

    // --- extract_resolution ---

    #[test]
    fn resolution_from_video_stream() {
        let json = make_json(
            Some(vec![video_stream(
                "h264", 1920, 1080, "30/1", "30/1", "5000000",
            )]),
            None,
        );
        assert_eq!(extract_resolution(&json), "1920x1080");
    }

    #[test]
    fn resolution_skips_audio_stream() {
        let json = make_json(Some(vec![audio_stream()]), None);
        assert_eq!(extract_resolution(&json), "");
    }

    #[test]
    fn resolution_no_streams() {
        let json = make_json(None, None);
        assert_eq!(extract_resolution(&json), "");
    }

    #[test]
    fn resolution_4k() {
        let json = make_json(
            Some(vec![video_stream("h264", 3840, 2160, "24/1", "24/1", "")]),
            None,
        );
        assert_eq!(extract_resolution(&json), "3840x2160");
    }

    // --- extract_framerate ---

    #[test]
    fn framerate_from_r_frame_rate() {
        let json = make_json(
            Some(vec![video_stream("h264", 1920, 1080, "30/1", "30/1", "")]),
            None,
        );
        assert_eq!(extract_framerate(&json), 30.0);
    }

    #[test]
    fn framerate_falls_back_to_avg() {
        let json = make_json(
            Some(vec![video_stream(
                "h264",
                1920,
                1080,
                "0/0",
                "24000/1001",
                "",
            )]),
            None,
        );
        assert!((extract_framerate(&json) - 23.976).abs() < 0.01);
    }

    #[test]
    fn framerate_both_zero() {
        let json = make_json(
            Some(vec![video_stream("h264", 1920, 1080, "0/0", "0/0", "")]),
            None,
        );
        assert_eq!(extract_framerate(&json), 0.0);
    }

    #[test]
    fn framerate_no_streams() {
        let json = make_json(None, None);
        assert_eq!(extract_framerate(&json), 0.0);
    }

    // --- extract_duration ---

    #[test]
    fn duration_valid() {
        let json = make_json(
            None,
            Some(FfprobeFormat {
                duration: Some("123.456".to_string()),
                bit_rate: None,
                tags: None,
            }),
        );
        assert!((extract_duration(&json) - 123.456).abs() < 0.001);
    }

    #[test]
    fn duration_missing() {
        let json = make_json(None, None);
        assert_eq!(extract_duration(&json), 0.0);
    }

    #[test]
    fn duration_non_numeric() {
        let json = make_json(
            None,
            Some(FfprobeFormat {
                duration: Some("invalid".to_string()),
                bit_rate: None,
                tags: None,
            }),
        );
        assert_eq!(extract_duration(&json), 0.0);
    }

    // --- extract_video_codec ---

    #[test]
    fn codec_from_video_stream() {
        let json = make_json(
            Some(vec![video_stream("h264", 1920, 1080, "30/1", "30/1", "")]),
            None,
        );
        assert_eq!(extract_video_codec(&json), "h264");
    }

    #[test]
    fn codec_is_lowercased() {
        let json = make_json(
            Some(vec![video_stream("HEVC", 1920, 1080, "30/1", "30/1", "")]),
            None,
        );
        assert_eq!(extract_video_codec(&json), "hevc");
    }

    #[test]
    fn codec_no_video_stream() {
        let json = make_json(Some(vec![audio_stream()]), None);
        assert_eq!(extract_video_codec(&json), "");
    }

    #[test]
    fn codec_picks_first_video_stream() {
        let streams = vec![
            audio_stream(),
            video_stream("h264", 1920, 1080, "30/1", "30/1", ""),
            video_stream("h265", 3840, 2160, "24/1", "24/1", ""),
        ];
        let json = make_json(Some(streams), None);
        assert_eq!(extract_video_codec(&json), "h264");
    }

    // --- extract_bit_rate ---

    #[test]
    fn bitrate_from_stream() {
        let json = make_json(
            Some(vec![video_stream(
                "h264", 1920, 1080, "30/1", "30/1", "5000000",
            )]),
            None,
        );
        assert_eq!(extract_bit_rate(&json), Some(5000000));
    }

    #[test]
    fn bitrate_falls_back_to_format() {
        let json = make_json(
            Some(vec![video_stream("h264", 1920, 1080, "30/1", "30/1", "")]),
            Some(FfprobeFormat {
                duration: None,
                bit_rate: Some("8000000".to_string()),
                tags: None,
            }),
        );
        assert_eq!(extract_bit_rate(&json), Some(8000000));
    }

    #[test]
    fn bitrate_stream_wins_over_format() {
        let json = make_json(
            Some(vec![video_stream(
                "h264", 1920, 1080, "30/1", "30/1", "5000000",
            )]),
            Some(FfprobeFormat {
                duration: None,
                bit_rate: Some("8000000".to_string()),
                tags: None,
            }),
        );
        assert_eq!(extract_bit_rate(&json), Some(5000000));
    }

    #[test]
    fn bitrate_zero_is_none() {
        let json = make_json(
            Some(vec![video_stream("h264", 1920, 1080, "30/1", "30/1", "0")]),
            None,
        );
        assert_eq!(extract_bit_rate(&json), None);
    }

    #[test]
    fn bitrate_missing_is_none() {
        let json = make_json(None, None);
        assert_eq!(extract_bit_rate(&json), None);
    }

    // --- collect_camera_tags ---

    #[test]
    fn tags_format_overrides_stream() {
        let mut stream_tags = HashMap::new();
        stream_tags.insert("make".to_string(), "Sony".to_string());
        let mut format_tags = HashMap::new();
        format_tags.insert("make".to_string(), "SONY".to_string());

        let json = make_json(
            Some(vec![FfprobeStream {
                codec_name: None,
                codec_type: Some("video".to_string()),
                width: None,
                height: None,
                r_frame_rate: None,
                avg_frame_rate: None,
                bit_rate: None,
                tags: Some(stream_tags),
            }]),
            Some(FfprobeFormat {
                duration: None,
                bit_rate: None,
                tags: Some(format_tags),
            }),
        );

        let tags = collect_camera_tags(&json);
        assert_eq!(tags.get("make").unwrap(), "SONY");
    }

    #[test]
    fn tags_lowercased() {
        let mut stream_tags = HashMap::new();
        stream_tags.insert("Make".to_string(), "Sony".to_string());

        let json = make_json(
            Some(vec![FfprobeStream {
                codec_name: None,
                codec_type: Some("video".to_string()),
                width: None,
                height: None,
                r_frame_rate: None,
                avg_frame_rate: None,
                bit_rate: None,
                tags: Some(stream_tags),
            }]),
            None,
        );

        let tags = collect_camera_tags(&json);
        assert!(tags.contains_key("make"));
        assert!(!tags.contains_key("Make"));
    }

    // --- extract_camera_info ---

    #[test]
    fn camera_quicktime_model_priority() {
        let mut tags = HashMap::new();
        tags.insert(
            "com.apple.quicktime.model".to_string(),
            "iPhone 15 Pro".to_string(),
        );
        tags.insert("make".to_string(), "Apple".to_string());
        tags.insert("model".to_string(), "iPhone".to_string());

        let json = make_json(
            Some(vec![FfprobeStream {
                codec_name: None,
                codec_type: Some("video".to_string()),
                width: None,
                height: None,
                r_frame_rate: None,
                avg_frame_rate: None,
                bit_rate: None,
                tags: Some(tags),
            }]),
            None,
        );

        let (key, display) = extract_camera_info(&json, "/test/video.mp4");
        assert_eq!(key, "iphone_15_pro");
        assert_eq!(display, "iPhone 15 Pro");
    }

    #[test]
    fn camera_make_model_priority() {
        let mut tags = HashMap::new();
        tags.insert("make".to_string(), "Sony".to_string());
        tags.insert("model".to_string(), "ILME-FX3".to_string());

        let json = make_json(
            Some(vec![FfprobeStream {
                codec_name: None,
                codec_type: Some("video".to_string()),
                width: None,
                height: None,
                r_frame_rate: None,
                avg_frame_rate: None,
                bit_rate: None,
                tags: Some(tags),
            }]),
            None,
        );

        let (key, display) = extract_camera_info(&json, "/test/video.mp4");
        assert_eq!(key, "sony_ilme_fx3");
        assert_eq!(display, "Sony ILME-FX3");
    }

    #[test]
    fn camera_encoder_fallback() {
        let mut tags = HashMap::new();
        tags.insert("encoder".to_string(), "Canon EOS R5".to_string());

        let json = make_json(
            Some(vec![FfprobeStream {
                codec_name: None,
                codec_type: Some("video".to_string()),
                width: None,
                height: None,
                r_frame_rate: None,
                avg_frame_rate: None,
                bit_rate: None,
                tags: Some(tags),
            }]),
            None,
        );

        let (key, display) = extract_camera_info(&json, "/test/video.mp4");
        assert_eq!(key, "canon_eos_r5");
        assert_eq!(display, "Canon EOS R5");
    }

    #[test]
    fn camera_braw_extension() {
        let json = make_json(None, None);
        let (key, display) = extract_camera_info(&json, "/test/clip.braw");
        assert_eq!(key, "blackmagic");
        assert_eq!(display, "Blackmagic");
    }

    #[test]
    fn camera_r3d_extension() {
        let json = make_json(None, None);
        let (key, display) = extract_camera_info(&json, "/test/clip.r3d");
        assert_eq!(key, "red");
        assert_eq!(display, "RED");
    }

    #[test]
    fn camera_mxf_extension() {
        let json = make_json(None, None);
        let (key, display) = extract_camera_info(&json, "/test/clip.mxf");
        assert_eq!(key, "mxf");
        assert_eq!(display, "MXF");
    }

    #[test]
    fn camera_no_tags_returns_empty() {
        let json = make_json(None, None);
        let (key, display) = extract_camera_info(&json, "/test/video.mp4");
        assert_eq!(key, "");
        assert_eq!(display, "");
    }

    #[test]
    fn camera_make_only() {
        let mut tags = HashMap::new();
        tags.insert("make".to_string(), "GoPro".to_string());

        let json = make_json(
            Some(vec![FfprobeStream {
                codec_name: None,
                codec_type: Some("video".to_string()),
                width: None,
                height: None,
                r_frame_rate: None,
                avg_frame_rate: None,
                bit_rate: None,
                tags: Some(tags),
            }]),
            None,
        );

        let (key, display) = extract_camera_info(&json, "/test/video.mp4");
        assert_eq!(key, "gopro");
        assert_eq!(display, "GoPro");
    }
}
