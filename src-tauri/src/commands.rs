//! Simplified commands for charting_daavfx

use crate::AppState;
use crate::replay::{ReplayInfo, ReplayUpdate};
use daavfx_core::OHLCV;
use tauri::State;

#[tauri::command]
pub fn get_app_info() -> String {
    "Charting DAAVFX v1.0".to_string()
}

#[tauri::command]
pub fn get_available_symbols(state: State<'_, AppState>) -> Vec<String> {
    state.core.get_symbols()
}

#[tauri::command]
pub fn get_cache_stats(state: State<'_, AppState>) -> String {
    let stats = state.core.cache_stats();
    format!("Entries: {}, Total candles: {}", stats.0, stats.1)
}

#[tauri::command]
pub fn clear_cache(state: State<'_, AppState>) {
    state.core.clear_cache();
}

#[tauri::command]
pub async fn import_csv_data(
    state: State<'_, AppState>,
    file_path: String,
    symbol: String,
) -> Result<usize, String> {
    use std::fs::File;
    use std::io::{BufRead, BufReader};

    let file = File::open(&file_path).map_err(|e| e.to_string())?;
    let reader = BufReader::new(file);
    let mut data = Vec::new();

    for line in reader.lines() {
        let line = line.map_err(|e| e.to_string())?;
        let parts: Vec<&str> = line.split(',').collect();
        if parts.len() >= 6 {
            if let Ok(time) = parts[0].parse::<i64>() {
                if let Ok(open) = parts[1].parse::<f64>() {
                    if let Ok(high) = parts[2].parse::<f64>() {
                        if let Ok(low) = parts[3].parse::<f64>() {
                            if let Ok(close) = parts[4].parse::<f64>() {
                                data.push(OHLCV {
                                    time,
                                    open,
                                    high,
                                    low,
                                    close,
                                    volume: 0,
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    state.core.save_ohlcv(&symbol, &data);
    Ok(data.len())
}

#[tauri::command]
pub async fn load_ohlcv_data(
    state: State<'_, AppState>,
    symbol: String,
) -> Result<Vec<OHLCVResponse>, String> {
    let data = state.core.get_ohlcv(&symbol);
    let data = match data {
        Some(d) => d,
        None => return Ok(Vec::new()),
    };

    let response: Vec<OHLCVResponse> = data.iter().map(|c| OHLCVResponse {
        time: c.time,
        open: c.open.to_string(),
        high: c.high.to_string(),
        low: c.low.to_string(),
        close: c.close.to_string(),
        volume: c.volume.to_string(),
    }).collect();

    Ok(response)
}

#[derive(serde::Serialize)]
pub struct OHLCVResponse {
    pub time: i64,
    pub open: String,
    pub high: String,
    pub low: String,
    pub close: String,
    pub volume: String,
}

#[tauri::command]
pub async fn load_replay_session(
    state: State<'_, AppState>,
    symbol: String,
    timeframe: String,
) -> Result<ReplayInfo, String> {
    let data = state.core.get_ohlcv(&symbol);
    let data = match data {
        Some(d) => d,
        None => return Err("No data found".to_string()),
    };

    let mut replay = state.replay_state.lock().unwrap();
    replay.symbol = symbol.clone();
    replay.data = data;
    replay.current_index = 0;
    replay.speed = 1.0;
    replay.is_playing = false;

    Ok(ReplayInfo {
        total_candles: replay.data.len(),
        current_index: 0,
        start_time: replay.data[0].time,
        end_time: replay.data[replay.data.len() - 1].time,
        symbol,
        timeframe,
        is_playing: false,
        speed: 1.0,
    })
}

#[tauri::command]
pub async fn start_replay(state: State<'_, AppState>) -> Result<(), String> {
    let mut replay = state.replay_state.lock().unwrap();
    if replay.data.is_empty() {
        return Err("No replay session loaded".to_string());
    }
    replay.is_playing = true;
    Ok(())
}

#[tauri::command]
pub async fn pause_replay(state: State<'_, AppState>) -> Result<(), String> {
    let mut replay = state.replay_state.lock().unwrap();
    replay.is_playing = false;
    Ok(())
}

#[tauri::command]
pub async fn stop_replay(state: State<'_, AppState>) -> Result<(), String> {
    let mut replay = state.replay_state.lock().unwrap();
    replay.is_playing = false;
    replay.current_index = 0;
    Ok(())
}

#[tauri::command]
pub async fn step_forward(
    state: State<'_, AppState>,
    steps: Option<usize>,
) -> Result<ReplayUpdate, String> {
    let steps = steps.unwrap_or(1);
    let mut replay = state.replay_state.lock().unwrap();
    
    if replay.data.is_empty() {
        return Err("No replay session".to_string());
    }
    
    replay.current_index = (replay.current_index + steps).min(replay.data.len() - 1);
    replay.is_playing = false;
    
    let candle = &replay.data[replay.current_index];
    
    Ok(ReplayUpdate {
        current_index: replay.current_index,
        total_candles: replay.data.len(),
        time: candle.time,
        open: candle.open.to_string(),
        high: candle.high.to_string(),
        low: candle.low.to_string(),
        close: candle.close.to_string(),
        progress: replay.current_index as f64 / replay.data.len() as f64,
    })
}

#[tauri::command]
pub async fn step_backward(
    state: State<'_, AppState>,
    steps: Option<usize>,
) -> Result<ReplayUpdate, String> {
    let steps = steps.unwrap_or(1);
    let mut replay = state.replay_state.lock().unwrap();
    
    if replay.data.is_empty() {
        return Err("No replay session".to_string());
    }
    
    replay.current_index = replay.current_index.saturating_sub(steps);
    replay.is_playing = false;
    
    let candle = &replay.data[replay.current_index];
    
    Ok(ReplayUpdate {
        current_index: replay.current_index,
        total_candles: replay.data.len(),
        time: candle.time,
        open: candle.open.to_string(),
        high: candle.high.to_string(),
        low: candle.low.to_string(),
        close: candle.close.to_string(),
        progress: replay.current_index as f64 / replay.data.len() as f64,
    })
}

#[tauri::command]
pub async fn set_replay_speed(
    state: State<'_, AppState>,
    speed: f64,
) -> Result<(), String> {
    let mut replay = state.replay_state.lock().unwrap();
    replay.speed = speed.clamp(0.1, 10.0);
    Ok(())
}

#[tauri::command]
pub async fn seek_to_index(
    state: State<'_, AppState>,
    index: usize,
) -> Result<ReplayUpdate, String> {
    let mut replay = state.replay_state.lock().unwrap();
    
    if replay.data.is_empty() {
        return Err("No replay session".to_string());
    }
    
    replay.current_index = index.min(replay.data.len() - 1);
    replay.is_playing = false;
    
    let candle = &replay.data[replay.current_index];
    
    Ok(ReplayUpdate {
        current_index: replay.current_index,
        total_candles: replay.data.len(),
        time: candle.time,
        open: candle.open.to_string(),
        high: candle.high.to_string(),
        low: candle.low.to_string(),
        close: candle.close.to_string(),
        progress: replay.current_index as f64 / replay.data.len() as f64,
    })
}

#[tauri::command]
pub async fn get_replay_state(state: State<'_, AppState>) -> Result<ReplayStateResponse, String> {
    let replay = state.replay_state.lock().unwrap();
    
    if replay.data.is_empty() {
        return Ok(ReplayStateResponse {
            is_loaded: false,
            is_playing: false,
            current_index: 0,
            total_candles: 0,
            speed: 1.0,
            symbol: String::new(),
            timeframe: String::new(),
            progress: 0.0,
        });
    }
    
    Ok(ReplayStateResponse {
        is_loaded: true,
        is_playing: replay.is_playing,
        current_index: replay.current_index,
        total_candles: replay.data.len(),
        speed: replay.speed,
        symbol: replay.symbol.clone(),
        timeframe: "".to_string(),
        progress: replay.current_index as f64 / replay.data.len() as f64,
    })
}

#[derive(serde::Serialize)]
pub struct ReplayStateResponse {
    pub is_loaded: bool,
    pub is_playing: bool,
    pub current_index: usize,
    pub total_candles: usize,
    pub speed: f64,
    pub symbol: String,
    pub timeframe: String,
    pub progress: f64,
}

#[tauri::command]
pub fn save_drawings(
    _state: State<'_, AppState>,
    _symbol: String,
    _timeframe: String,
    _drawings: String,
) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
pub fn load_drawings(
    _state: State<'_, AppState>,
    _symbol: String,
    _timeframe: String,
) -> Result<String, String> {
    Ok("[]".to_string())
}
