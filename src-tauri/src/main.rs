#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

//! Charting FX - Legendary Market Replay & Analysis Tool

use daavfx_core::{DAAVFXCore, TimeFrame};
use std::sync::Arc;
use tauri::State;

mod commands;
mod replay;

use commands::*;
use replay::*;

pub struct AppState {
    pub core: Arc<DAAVFXCore>,
    pub replay_state: Arc<std::sync::Mutex<ReplayState>>,
}

#[derive(Debug, Clone)]
pub struct ReplayState {
    pub symbol: String,
    pub timeframe: TimeFrame,
    pub data: Vec<daavfx_core::OHLCV>,
    pub current_index: usize,
    pub speed: f64,
    pub is_playing: bool,
}

impl Default for ReplayState {
    fn default() -> Self {
        Self {
            symbol: String::new(),
            timeframe: TimeFrame::H1,
            data: Vec::new(),
            current_index: 0,
            speed: 1.0,
            is_playing: false,
        }
    }
}

fn main() {
    let core = Arc::new(DAAVFXCore::new());
    let replay_state = Arc::new(std::sync::Mutex::new(ReplayState::default()));
    
    let app_state = AppState { core, replay_state };
    
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            load_ohlcv_data,
            get_available_symbols,
            import_csv_data,
            load_replay_session,
            start_replay,
            pause_replay,
            stop_replay,
            step_forward,
            step_backward,
            set_replay_speed,
            seek_to_index,
            get_replay_state,
            save_drawings,
            load_drawings,
            get_cache_stats,
            clear_cache,
            get_app_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
