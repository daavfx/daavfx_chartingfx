use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct BacktestStats {
    pub total_trades: u32,
    pub win_rate: f64,
    pub profit_factor: f64,
    pub net_profit: f64,
    pub max_drawdown: f64,
    pub sharpe_ratio: f64,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct MonteCarloStats {
    pub confidence_95: f64,
    pub confidence_99: f64,
    pub median_profit: f64,
    pub worst_case: f64,
    pub ruin_probability: f64,
}
