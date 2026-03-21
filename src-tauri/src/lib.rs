use tauri::Manager;

mod commands;
mod db;
mod export;
mod lut;
mod metadata;
mod scan;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    // Enable the Tauri devtools plugin in development builds
    #[cfg(debug_assertions)]
    {
        let devtools = tauri_plugin_devtools::init();
        builder = builder.plugin(devtools);
    }

    builder
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let handle = app.handle();
            let state = db::init_db(handle)?;
            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            scan::scan_directory,
            commands::add_luts,
            commands::get_luts,
            commands::get_camera_luts,
            commands::delete_lut,
            export::start_export
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
