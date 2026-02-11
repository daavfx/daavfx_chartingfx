//! Charting FX App - Main entry point
//! 
//! This app provides:
//! - High-performance charting with TradingView Lightweight Charts
//! - Market replay functionality
//! - Drawing tools and annotations
//! - Multi-timeframe support

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use daavfx_core::{DAAVFXCore, SessionConfig, TimeFrame};
use std::sync::Arc;
use tauri::State;
use tracing::info;

// Global application state
pub struct AppState {
    core: Arc<DAAVFXCore>,
}

// Commands exposed to frontend
mod commands;
use commands::*;

fn main() {
    // Initialize tracing
    tracing_subscriber::fmt::init();
    
    info!("Starting Charting FX App");
    
    // Initialize core engine
    let core = Arc::new(
        DAAVFXCore::new("charting_data.db")
            .expect("Failed to initialize core engine")
    );
    
    let app_state = AppState { core };
    
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            // Data commands
            load_ohlcv_data,
            get_available_symbols,
            import_csv_data,
            
            // Session commands
            get_session_config,
            update_session_config,
            
            // Chart commands
            get_data_window,
            aggregate_data,
            
            // Drawing commands
            save_drawings,
            load_drawings,
            
            // System commands
            get_cache_stats,
            clear_cache,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}