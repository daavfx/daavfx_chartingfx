#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod engine;
mod data;
mod strategy;
mod monte_carlo;
mod reporting;

use commands::*;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            // Terminal
            detect_terminals,
            // Data
            get_available_symbols,
            get_date_range,
            download_tick_data,
            get_download_status,
            cancel_download,
            // Backtest
            start_visual_backtest,
            // Monte Carlo
            start_monte_carlo_optimization,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
