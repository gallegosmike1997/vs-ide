// Library for Tauri app - exposes commands to the frontend

// Prevent dead code warnings in library mode
#![allow(dead_code)]

use std::path::PathBuf;
use tauri_plugin_fs::FsExt;

/// Lets the webview read/write inside one user-chosen folder (the workspace).
/// Scope is granted at runtime instead of a blanket `$HOME/**` capability, so
/// the AI agent can never touch files outside the folder the user opened.
#[tauri::command]
fn grant_workspace_scope(app: tauri::AppHandle, path: String) -> Result<(), String> {
    app.fs_scope()
        .allow_directory(PathBuf::from(&path), true)
        .map_err(|e| e.to_string())
}

/// Drop the grant again (used when a workspace is closed).
#[tauri::command]
fn revoke_workspace_scope(app: tauri::AppHandle, path: String) -> Result<(), String> {
    app.fs_scope()
        .forbid_directory(PathBuf::from(&path), true)
        .map_err(|e| e.to_string())
}

/// App entry point (called from main.rs) so the command macros and the handler
/// stay in the same crate.
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            grant_workspace_scope,
            revoke_workspace_scope
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

