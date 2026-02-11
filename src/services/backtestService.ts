/**
 * Quantum BT Service
 * Bridges Charting FX with Quantum Backtester via Tauri IPC
 */

import { invoke } from '@tauri-apps/api/core';

export interface BacktestConfig {
    symbol: string;
    timeframe: string;
    startDate: number;
    endDate: number;
    initialDeposit: number;
    leverage: number;
}

export interface TradeMarker {
    id: string;
    time: number;
    position: 'long' | 'short';
    entryPrice: number;
    exitPrice?: number;
    sl?: number;
    tp?: number;
    pnl?: number;
    color: string;
}

export interface BacktestResult {
    success: boolean;
    trades: TradeMarker[];
    equityCurve: { time: number; value: number }[];
    stats: {
        totalTrades: number;
        winRate: number;
        profitFactor: number;
        netProfit: number;
        maxDrawdown: number;
        sharpeRatio: number;
    };
}

/**
 * Run a backtest and return trade markers for chart overlay
 */
export async function runBacktest(
    config: BacktestConfig,
    strategyJson: string
): Promise<BacktestResult> {
    try {
        const result = await invoke<{
            success: boolean;
            trades: TradeMarker[];
            equity_curve: { time: number; value: number }[];
            stats: {
                total_trades: number;
                win_rate: number;
                profit_factor: number;
                net_profit: number;
                max_drawdown: number;
                sharpe_ratio: number;
            };
        }>('run_backtest', { config, strategy: strategyJson });

        return {
            success: result.success,
            trades: result.trades,
            equityCurve: result.equity_curve,
            stats: {
                totalTrades: result.stats.total_trades,
                winRate: result.stats.win_rate,
                profitFactor: result.stats.profit_factor,
                netProfit: result.stats.net_profit,
                maxDrawdown: result.stats.max_drawdown,
                sharpeRatio: result.stats.sharpe_ratio
            }
        };
    } catch (error) {
        console.error('Backtest failed:', error);
        return {
            success: false,
            trades: [],
            equityCurve: [],
            stats: {
                totalTrades: 0,
                winRate: 0,
                profitFactor: 0,
                netProfit: 0,
                maxDrawdown: 0,
                sharpeRatio: 0
            }
        };
    }
}

/**
 * Convert strategy config to JSON for backend
 */
export function strategyToJson(strategy: {
    name: string;
    entryConditions: Array<{
        indicator: string;
        operator: string;
        value: number | string;
        period?: number;
    }>;
    exitConditions: Array<{
        indicator: string;
        operator: string;
        value: number | string;
        period?: number;
    }>;
    stopLoss: number;
    takeProfit: number;
}): string {
    return JSON.stringify(strategy);
}

/**
 * Load strategy from file
 */
export async function loadStrategy(path: string): Promise<Record<string, unknown> | null> {
    try {
        return await invoke('load_strategy_file', { path });
    } catch (error) {
        console.error('Failed to load strategy:', error);
        return null;
    }
}

/**
 * Save strategy to file
 */
export async function saveStrategy(
    path: string, 
    strategy: Record<string, unknown>
): Promise<boolean> {
    try {
        await invoke('save_strategy_file', { path, strategy });
        return true;
    } catch (error) {
        console.error('Failed to save strategy:', error);
        return false;
    }
}

/**
 * Get optimization results
 */
export async function runOptimization(
    symbol: string,
    timeframe: string,
    params: Record<string, { min: number; max: number; step: number }>
): Promise<Array<{ params: string; profit: number; drawdown: number; score: number }>> {
    try {
        return await invoke('run_optimization', { symbol, timeframe, params });
    } catch (error) {
        console.error('Optimization failed:', error);
        return [];
    }
}
