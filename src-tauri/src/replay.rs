//! Replay state types

use serde::Serialize;

#[derive(Serialize)]
pub struct ReplayInfo {
    pub total_candles: usize,
    pub current_index: usize,
    pub start_time: i64,
    pub end_time: i64,
    pub symbol: String,
    pub timeframe: String,
    pub is_playing: bool,
    pub speed: f64,
}

#[derive(Serialize)]
pub struct ReplayUpdate {
    pub current_index: usize,
    pub total_candles: usize,
    pub time: i64,
    pub open: String,
    pub high: String,
    pub low: String,
    pub close: String,
    pub progress: f64,
}
