use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct TerminalInfo {
    pub name: String,
    pub data_path: String,
    pub custom_symbols_path: String,
    pub is_default: bool,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct SymbolInfo {
    pub name: String,
    pub display_name: String,
    pub category: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct DateRange {
    pub start: String,
    pub end: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct DownloadResult {
    pub success: bool,
    pub tick_count: u64,
    pub message: String,
    pub output_path: Option<String>,
}

