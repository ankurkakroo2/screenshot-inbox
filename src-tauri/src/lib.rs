mod bridge;
use serde::Deserialize;
use tauri::Manager;
use tauri_plugin_opener::OpenerExt;

#[derive(Deserialize)]
struct Request {
    command: String,
    folder: String,
    #[serde(default)]
    query: String,
    #[serde(default)]
    mode: String,
    #[serde(default)]
    id: String,
}

// Only the local bundled UI can invoke this. Node owns path validation and index logic.
#[tauri::command]
async fn inbox(app: tauri::AppHandle, request: Request) -> Result<serde_json::Value, String> {
    let state = app.path().app_data_dir().map_err(|e| e.to_string())?;
    tauri::async_runtime::spawn_blocking(move || {
        let command = if request.command == "open_original" {
            "original"
        } else {
            &request.command
        };
        let argument = if command == "original" {
            &request.id
        } else {
            &request.query
        };
        let response = bridge::run(
            command,
            &request.folder,
            state.to_str().ok_or("Non-Unicode state path")?,
            argument,
            &request.mode,
        )?;
        let value: serde_json::Value =
            serde_json::from_str(&response).map_err(|e| format!("Invalid core JSON: {e}"))?;
        if request.command == "open_original" {
            let path = value
                .as_str()
                .ok_or("Core returned invalid original path")?;
            app.opener()
                .open_path(path, None::<&str>)
                .map_err(|e| e.to_string())?;
            Ok(serde_json::Value::Null)
        } else {
            Ok(value)
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![inbox])
        .run(tauri::generate_context!())
        .expect("error while running Screenshot Inbox");
}
