use std::fs::File;
use std::io::{BufRead, BufReader};
use std::path::Path;

const TITLE_LINES: usize = 20;

pub fn parse_lut_label(path: &Path) -> Option<String> {
    let ext = path.extension()?.to_str()?.to_lowercase();
    if ext != "cube" {
        return None;
    }

    let file = File::open(path).ok()?;
    let reader = BufReader::new(file);

    for line in reader.lines().take(TITLE_LINES) {
        let line = line.ok()?;
        let trimmed = line.trim();

        if let Some(rest) = trimmed.strip_prefix("TITLE ") {
            let rest = rest.trim();
            if rest.starts_with('"') && rest.ends_with('"') && rest.len() > 1 {
                return Some(rest[1..rest.len() - 1].to_string());
            }
            if !rest.is_empty() {
                return Some(rest.to_string());
            }
        }
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn parse_example_lut() {
        let path = Path::new(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .unwrap()
            .join("example-lut.cube");
        let label = parse_lut_label(&path);
        assert_eq!(label, Some("GoPro Flat Portra160".to_string()));
    }

    #[test]
    fn parse_copied_lut() {
        let src = Path::new(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .unwrap()
            .join("example-lut.cube");

        let tmp = std::env::temp_dir().join("lut_test_parse");
        std::fs::create_dir_all(&tmp).unwrap();
        let dest = tmp.join("example-lut.cube");
        std::fs::copy(&src, &dest).unwrap();

        let label = parse_lut_label(&dest);
        assert_eq!(label, Some("GoPro Flat Portra160".to_string()));

        std::fs::remove_dir_all(&tmp).unwrap();
    }

    #[test]
    fn parse_non_cube_returns_none() {
        let path = Path::new("/some/path/lut.3dl");
        assert_eq!(parse_lut_label(&path), None);
    }

    #[test]
    fn parse_unquoted_title() {
        let dir = std::env::temp_dir().join("lut_test_unquoted");
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("test.cube");
        let mut f = File::create(&path).unwrap();
        writeln!(f, "TITLE My Custom LUT").unwrap();
        writeln!(f, "LUT_3D_SIZE 33").unwrap();

        let label = parse_lut_label(&path);
        assert_eq!(label, Some("My Custom LUT".to_string()));

        std::fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn parse_no_title_returns_none() {
        let dir = std::env::temp_dir().join("lut_test_notitle");
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("test.cube");
        let mut f = File::create(&path).unwrap();
        writeln!(f, "LUT_3D_SIZE 33").unwrap();
        writeln!(f, "DOMAIN_MIN 0.0 0.0 0.0").unwrap();

        let label = parse_lut_label(&path);
        assert_eq!(label, None);

        std::fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn parse_empty_title_returns_none() {
        let dir = std::env::temp_dir().join("lut_test_emptytitle");
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("test.cube");
        let mut f = File::create(&path).unwrap();
        writeln!(f, "TITLE ").unwrap();
        writeln!(f, "LUT_3D_SIZE 33").unwrap();

        let label = parse_lut_label(&path);
        assert_eq!(label, None);

        std::fs::remove_dir_all(&dir).unwrap();
    }
}
