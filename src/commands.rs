//! Tauri commands bridging frontend to Rust core engine

use crate::AppState;
use daavfx_core::{
    data::{OHLCV, DataRange, TimeFrame},
    chart::{Aggregator, DataWindow},
    SessionConfig, CacheStats,
};
use rust_decimal::Decimal;
use std::path::Path;
use tauri::State;

/// Load OHLCV data for a symbol/timeframe
#[tauri::command]
pub async fn load_ohlcv_data(
    state: State<'_, AppState>,
    symbol: String,
    timeframe: String,
) -> Result<Vec<OHLCVResponse>, String> {
    let tf = TimeFrame::from_str(&timeframe)
        .ok_or_else(|| format!("Invalid timeframe: {}", timeframe))?;
    
    let data = state.core.get_ohlcv(&symbol, tf)
        .map_err(|e| e.to_string())?;
    
    let data = data.read();
    
    let response: Vec<OHLCVResponse> = data.iter()
        .map(|c| OHLCVResponse::from(c))
        .collect();
    
    Ok(response)
}

/// Get data window for pagination (efficient for large datasets)
#[tauri::command]
pub async fn get_data_window(
    state: State<'_, AppState>,
    symbol: String,
    timeframe: String,
    start_idx: usize,
    end_idx: usize,
) -> Result<Vec<OHLCVResponse>, String> {
    let tf = TimeFrame::from_str(&timeframe)
        .ok_or_else(|| format!("Invalid timeframe: {}", timeframe))?;
    
    let data = state.core.get_ohlcv(&symbol, tf)
        .map_err(|e| e.to_string())?;
    
    let data = data.read();
    let window = &data[start_idx..end_idx.min(data.len())];
    
    let response: Vec<OHLCVResponse> = window.iter()
        .map(|c| OHLCVResponse::from(c))
        .collect();
    
    Ok(response)
}

/// Aggregate data to higher timeframe
#[tauri::command]
pub async fn aggregate_data(
    state: State<'_, AppState>,
    symbol: String,
    source_timeframe: String,
    target_timeframe: String,
) -> Result<Vec<OHLCVResponse>, String> {
    let source_tf = TimeFrame::from_str(&source_timeframe)
        .ok_or_else(|| format!("Invalid source timeframe: {}", source_timeframe))?;
    
    let target_tf = TimeFrame::from_str(&target_timeframe)
        .ok_or_else(|| format!("Invalid target timeframe: {}", target_timeframe))?;
    
    let data = state.core.get_ohlcv(&symbol, source_tf)
        .map_err(|e| e.to_string())?;
    
    let data = data.read();
    let aggregated = Aggregator::aggregate(&data, target_tf)
        .map_err(|e| e.to_string())?;
    
    let response: Vec<OHLCVResponse> = aggregated.iter()
        .map(|c| OHLCVResponse::from(c))
        .collect();
    
    Ok(response)
}

/// Import CSV data file
#[tauri::command]
pub async fn import_csv_data(
    state: State<'_, AppState>,
    file_path: String,
    symbol: String,
    timeframe: String,
) -> Result<ImportResult, String> {
    let tf = TimeFrame::from_str(&timeframe)
        .ok_or_else(|| format!("Invalid timeframe: {}", timeframe))?;
    
    // Read CSV file
    let mut rdr = csv::Reader::from_path(&file_path)
        .map_err(|e| e.to_string())?;
    
    let mut candles = Vec::new();
    
    for result in rdr.records() {
        let record = result.map_err(|e| e.to_string())?;
        
        // Expected format: time,open,high,low,close,volume
        if record.len() < 6 {
            continue;
        }
        
        let candle = OHLCV {
            time: record[0].parse().map_err(|_| "Invalid time")?,
            open: record[1].parse().map_err(|_| "Invalid open")?,
            high: record[2].parse().map_err(|_| "Invalid high")?,
            low: record[3].parse().map_err(|_| "Invalid low")?,
            close: record[4].parse().map_err(|_| "Invalid close")?,
            volume: record[5].parse().unwrap_or(Decimal::ZERO),
        };
        
        candles.push(candle);
    }
    
    let count = candles.len();
    
    // Save to database
    state.core.save_ohlcv(&symbol, tf, &candles)
        .map_err(|e| e.to_string())?;
    
    Ok(ImportResult {
        candles_imported: count,
        symbol,
        timeframe: tf.display().to_string(),
    })
}

/// Get available symbols from database
#[tauri::command]
pub async fn get_available_symbols(
    state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    // For now, return from cache keys
    // In production, query distinct symbols from DB
    Ok(vec!["EURUSD".to_string(), "GBPUSD".to_string(), "XAUUSD".to_string()])
}

/// Get current session configuration
#[tauri::command]
pub async fn get_session_config(
    state: State<'_, AppState>,
) -> Result<SessionConfigResponse, String> {
    let config = state.core.get_session();
    Ok(SessionConfigResponse::from(config))
}

/// Update session configuration
#[tauri::command]
pub async fn update_session_config(
    state: State<'_, AppState>,
    config: SessionConfigRequest,
) -> Result<(), String> {
    let new_config = SessionConfig {
        symbol: config.symbol,
        timeframe: TimeFrame::from_str(&config.timeframe)
            .ok_or_else(|| "Invalid timeframe".to_string())?,
        start_time: None, // Parse from config if provided
        end_time: None,
        max_cache_size: config.max_cache_size,
    };
    
    state.core.update_session(new_config);
    Ok(())
}

/// Get cache statistics
#[tauri::command]
pub async fn get_cache_stats(
    state: State<'_, AppState>,
) -> Result<CacheStatsResponse, String> {
    let stats = state.core.cache_stats();
    Ok(CacheStatsResponse::from(stats))
}

/// Clear data cache
#[tauri::command]
pub async fn clear_cache(
    state: State<'_, AppState>,
) -> Result<(), String> {
    state.core.clear_cache();
    Ok(())
}

/// Save drawings to database
#[tauri::command]
pub async fn save_drawings(
    state: State<'_, AppState>,
    symbol: String,
    timeframe: String,
    drawings: String, // JSON string
) -> Result<(), String> {
    // Implementation would save to SQLite
    // For now, just log
    tracing::info!("Saving {} drawings for {} {}", drawings.len(), symbol, timeframe);
    Ok(())
}

/// Load drawings from database
#[tauri::command]
pub async fn load_drawings(
    state: State<'_, AppState>,
    symbol: String,
    timeframe: String,
) -> Result<String, String> {
    // Implementation would load from SQLite
    // For now, return empty array
    Ok("[]".to_string())
}

// Response types for frontend

#[derive(serde::Serialize)]
pub struct OHLCVResponse {
    pub time: i64,
    pub open: String,
    pub high: String,
    pub low: String,
    pub close: String,
    pub volume: String,
}

impl From<&daavfx_core::data::OHLCV> for OHLCVResponse {
    fn from(c: &daavfx_core::data::OHLCV) -> Self {
        Self {
            time: c.time,
            open: c.open.to_string(),
            high: c.high.to_string(),
            low: c.low.to_string(),
            close: c.close.to_string(),
            volume: c.volume.to_string(),
        }
    }
}

#[derive(serde::Serialize)]
pub struct ImportResult {
    pub candles_imported: usize,
    pub symbol: String,
    pub timeframe: String,
}

#[derive(serde::Serialize)]
pub struct SessionConfigResponse {
    pub symbol: String,
    pub timeframe: String,
    pub max_cache_size: usize,
}

impl From<SessionConfig> for SessionConfigResponse {
    fn from(c: SessionConfig) -> Self {
        Self {
            symbol: c.symbol,
            timeframe: c.timeframe.display().to_string(),
            max_cache_size: c.max_cache_size,
        }
    }
}

#[derive(serde::Deserialize)]
pub struct SessionConfigRequest {
    pub symbol: String,
    pub timeframe: String,
    pub max_cache_size: usize,
}

#[derive(serde::Serialize)]
pub struct CacheStatsResponse {
    pub entries: usize,
    pub total_candles: usize,
}

impl From<daavfx_core::CacheStats> for CacheStatsResponse {
    fn from(s: daavfx_core::CacheStats) -> Self {
        Self {
            entries: s.entries,
            total_candles: s.total_candles,
        }
    }
}