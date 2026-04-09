fn main() {
    let out_dir =
        std::path::PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap()).join("binaries");
    let target = std::env::var("TARGET").unwrap();

    for name in ["ffmpeg", "ffprobe"] {
        let path = out_dir.join(if cfg!(windows) {
            format!("{name}-{target}.exe")
        } else {
            format!("{name}-{target}")
        });
        if !path.exists() {
            std::fs::create_dir_all(&out_dir).unwrap();
            std::fs::File::create(&path).unwrap();
        }
    }

    tauri_build::build()
}
