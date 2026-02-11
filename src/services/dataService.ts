//! Data Service - Bridges React frontend to Rust backend via Tauri

import { invoke } from '@tauri-apps/api/core';

export interface OHLCVData {
    time: number;
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
}

export interface ChartData {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface ImportResult {
    candlesImported: number;
    symbol: string;
    timeframe: string;
}

export interface SessionConfig {
    symbol: string;
    timeframe: string;
    maxCacheSize: number;
}

export interface CacheStats {
    entries: number;
    totalCandles: number;
}

/**
 * Load OHLCV data from Rust backend
 */
export async function loadOHLCVData(symbol: string, timeframe: string): Promise<ChartData[]> {
    try {
        const data = await invoke<OHLCVData[]>('load_ohlcv_data', { 
            symbol, 
            timeframe 
        });
        
        return data.map(c => ({
            time: c.time,
            open: parseFloat(c.open),
            high: parseFloat(c.high),
            low: parseFloat(c.low),
            close: parseFloat(c.close),
            volume: parseFloat(c.volume),
        }));
    } catch (error) {
        console.error('Failed to load OHLCV data:', error);
        return [];
    }
}

/**
 * Get data window for efficient pagination
 */
export async function getDataWindow(
    symbol: string, 
    timeframe: string,
    startIdx: number,
    endIdx: number
): Promise<ChartData[]> {
    try {
        const data = await invoke<OHLCVData[]>('get_data_window', { 
            symbol, 
            timeframe,
            startIdx,
            endIdx
        });
        
        return data.map(c => ({
            time: c.time,
            open: parseFloat(c.open),
            high: parseFloat(c.high),
            low: parseFloat(c.low),
            close: parseFloat(c.close),
            volume: parseFloat(c.volume),
        }));
    } catch (error) {
        console.error('Failed to get data window:', error);
        return [];
    }
}

/**
 * Aggregate data to higher timeframe
 */
export async function aggregateData(
    symbol: string,
    sourceTimeframe: string,
    targetTimeframe: string
): Promise<ChartData[]> {
    try {
        const data = await invoke<OHLCVData[]>('aggregate_data', { 
            symbol, 
            sourceTimeframe,
            targetTimeframe
        });
        
        return data.map(c => ({
            time: c.time,
            open: parseFloat(c.open),
            high: parseFloat(c.high),
            low: parseFloat(c.low),
            close: parseFloat(c.close),
            volume: parseFloat(c.volume),
        }));
    } catch (error) {
        console.error('Failed to aggregate data:', error);
        return [];
    }
}

/**
 * Import CSV data file
 */
export async function importCSVData(
    filePath: string,
    symbol: string,
    timeframe: string
): Promise<ImportResult | null> {
    try {
        const result = await invoke<ImportResult>('import_csv_data', { 
            filePath, 
            symbol, 
            timeframe 
        });
        return result;
    } catch (error) {
        console.error('Failed to import CSV:', error);
        return null;
    }
}

/**
 * Get available symbols
 */
export async function getAvailableSymbols(): Promise<string[]> {
    try {
        return await invoke<string[]>('get_available_symbols');
    } catch (error) {
        console.error('Failed to get symbols:', error);
        return [];
    }
}

/**
 * Get session configuration
 */
export async function getSessionConfig(): Promise<SessionConfig | null> {
    try {
        return await invoke<SessionConfig>('get_session_config');
    } catch (error) {
        console.error('Failed to get session config:', error);
        return null;
    }
}

/**
 * Update session configuration
 */
export async function updateSessionConfig(config: SessionConfig): Promise<boolean> {
    try {
        await invoke('update_session_config', { config });
        return true;
    } catch (error) {
        console.error('Failed to update session config:', error);
        return false;
    }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<CacheStats | null> {
    try {
        return await invoke<CacheStats>('get_cache_stats');
    } catch (error) {
        console.error('Failed to get cache stats:', error);
        return null;
    }
}

/**
 * Clear data cache
 */
export async function clearCache(): Promise<boolean> {
    try {
        await invoke('clear_cache');
        return true;
    } catch (error) {
        console.error('Failed to clear cache:', error);
        return false;
    }
}

/**
 * Save drawings to database
 */
export async function saveDrawings(
    symbol: string,
    timeframe: string,
    chartType: string,
    drawings: DrawingData[]
): Promise<boolean> {
    try {
        await invoke('save_drawings', { 
            symbol, 
            timeframe, 
            chartType,
            drawings
        });
        console.log(`✅ Saved ${drawings.length} drawings for ${symbol} ${timeframe}`);
        return true;
    } catch (error) {
        console.error('Failed to save drawings:', error);
        return false;
    }
}

/**
 * Load drawings from database
 */
export async function loadDrawings(
    symbol: string,
    timeframe: string
): Promise<DrawingData[]> {
    try {
        const drawings = await invoke<DrawingData[]>('load_drawings', { symbol, timeframe });
        console.log(`✅ Loaded ${drawings.length} drawings for ${symbol} ${timeframe}`);
        return drawings;
    } catch (error) {
        console.error('Failed to load drawings:', error);
        return [];
    }
}

/**
 * Delete drawings from database
 */
export async function deleteDrawings(
    symbol: string,
    timeframe: string
): Promise<boolean> {
    try {
        await invoke('delete_drawings', { symbol, timeframe });
        console.log(`🗑️ Deleted drawings for ${symbol} ${timeframe}`);
        return true;
    } catch (error) {
        console.error('Failed to delete drawings:', error);
        return false;
    }
}

// Drawing data type
export interface DrawingData {
    id: string;
    drawing_type: 'trendline' | 'hline' | 'vline' | 'rectangle';
    t1: number;
    p1: number;
    t2?: number;
    p2?: number;
    color?: string;
    line_width?: number;
}

// Import indicator types
import type { IndicatorConfig, IndicatorType } from '../types/indicators';

/**
 * Save indicators to database
 */
export async function saveIndicators(
    symbol: string,
    timeframe: string,
    indicators: IndicatorConfig[]
): Promise<boolean> {
    try {
        await invoke('save_indicators', { 
            symbol, 
            timeframe, 
            indicators: indicators.map(ind => ({
                id: ind.id,
                type: ind.type,
                name: ind.name,
                visible: ind.visible,
                parameters: JSON.stringify(ind.parameters),
                style: JSON.stringify(ind.style)
            }))
        });
        console.log(`✅ Saved ${indicators.length} indicators for ${symbol} ${timeframe}`);
        return true;
    } catch (error) {
        console.error('Failed to save indicators:', error);
        return false;
    }
}

/**
 * Load indicators from database
 */
export async function loadIndicators(
    symbol: string,
    timeframe: string
): Promise<IndicatorConfig[]> {
    try {
        const data = await invoke<Array<{
            id: string;
            type: IndicatorType;
            name: string;
            visible: boolean;
            parameters: string;
            style: string;
        }>>('load_indicators', { symbol, timeframe });
        
        const indicators: IndicatorConfig[] = data.map(row => ({
            id: row.id,
            type: row.type,
            name: row.name,
            visible: row.visible,
            parameters: JSON.parse(row.parameters),
            style: JSON.parse(row.style)
        }));
        
        console.log(`✅ Loaded ${indicators.length} indicators for ${symbol} ${timeframe}`);
        return indicators;
    } catch (error) {
        console.error('Failed to load indicators:', error);
        return [];
    }
}

/**
 * Delete indicators from database
 */
export async function deleteIndicators(
    symbol: string,
    timeframe: string
): Promise<boolean> {
    try {
        await invoke('delete_indicators', { symbol, timeframe });
        console.log(`🗑️ Deleted indicators for ${symbol} ${timeframe}`);
        return true;
    } catch (error) {
        console.error('Failed to delete indicators:', error);
        return false;
    }
}