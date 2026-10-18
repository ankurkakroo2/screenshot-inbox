/// Development bridge: uses a local Node installation, never a shell.
/// A packaged app must replace this source-tree path with a bundled sidecar.
pub fn run(
    command: &str,
    folder: &str,
    state: &str,
    argument: &str,
    mode: &str,
) -> Result<String, String> {
    if !["index", "search", "original"].contains(&command) {
        return Err("Unsupported inbox command".into());
    }
    let script = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../src/cli.js");
    let output = std::process::Command::new("node")
        .arg(script)
        .args([command, folder, state, argument, mode])
        .output()
        .map_err(|e| format!("Cannot run Node.js 22+ core: {e}"))?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_owned());
    }
    String::from_utf8(output.stdout).map_err(|e| format!("Invalid core response: {e}"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{fs, process::Command};
    #[test]
    fn rejects_unknown_command_without_spawning() {
        assert!(
            run("erase", "/missing", "/missing", "", "hybrid")
                .unwrap_err()
                .contains("Unsupported")
        );
    }
    #[test]
    fn bridge_indexes_and_searches_real_generated_image() {
        let root = std::env::temp_dir().join(format!("inbox-rust-{}", std::process::id()));
        let photos = root.join("photos");
        let state = root.join("state");
        fs::create_dir_all(&photos).unwrap();
        let script = "require('sharp')(Buffer.from('<svg width=\"900\" height=\"240\"><rect width=\"100%\" height=\"100%\" fill=\"white\"/><text x=\"30\" y=\"140\" font-size=\"72\" fill=\"black\">INVOICE 73421</text></svg>')).png().toFile(process.argv[1])";
        let output = Command::new("node")
            .args(["-e", script])
            .arg(photos.join("text.png"))
            .current_dir(concat!(env!("CARGO_MANIFEST_DIR"), "/.."))
            .output()
            .unwrap();
        assert!(
            output.status.success(),
            "{}",
            String::from_utf8_lossy(&output.stderr)
        );
        let p = photos.to_str().unwrap();
        let s = state.to_str().unwrap();
        assert!(
            run("index", p, s, "", "hybrid")
                .unwrap()
                .contains("\"total\":1")
        );
        assert!(
            run("search", p, s, "73421", "text")
                .unwrap()
                .contains("INVOICE 73421")
        );
        assert!(
            run("original", p, s, "unknown", "hybrid")
                .unwrap_err()
                .contains("Unknown image")
        );
        fs::remove_dir_all(root).unwrap();
    }
}
