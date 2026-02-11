/**
 * TradeMarkers Component
 * Renders backtest trade markers on the chart
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { IChartApi, ISeriesApi, MouseEventParams } from 'lightweight-charts';
import type { TradeMarker } from '../services/backtestService';

interface TradeMarkersProps {
    chart: IChartApi | null;
    trades: TradeMarker[];
    onTradeClick?: (trade: TradeMarker) => void;
}

export const TradeMarkers: React.FC<TradeMarkersProps> = ({
    chart,
    trades,
    onTradeClick
}) => {
    const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
    const markersRef = useRef<Array<{
        time: number;
        position: 'aboveBar' | 'belowBar';
        color: string;
        shape: 'arrowUp' | 'arrowDown' | 'circle' | 'square';
        text: string;
    }>>([]);

    // Create markers from trades
    const createMarkers = useCallback((trades: TradeMarker[]) => {
        return trades.map(trade => ({
            time: trade.time as any,
            position: trade.position === 'long' ? 'belowBar' : 'aboveBar' as 'belowBar' | 'aboveBar',
            color: trade.pnl !== undefined && trade.pnl >= 0 ? '#22c55e' : trade.pnl !== undefined ? '#ef4444' : '#3b82f6',
            shape: trade.position === 'long' ? 'arrowUp' : 'arrowDown' as 'arrowUp' | 'arrowDown',
            text: trade.pnl !== undefined 
                ? `$${trade.pnl.toFixed(0)}` 
                : trade.position.toUpperCase()
        }));
    }, []);

    // Update markers when trades change
    useEffect(() => {
        if (!chart || trades.length === 0) return;

        const series = chart.addCandlestickSeries({
            upColor: '#22c55e',
            downColor: '#ef4444',
            borderUpColor: '#22c55e',
            borderDownColor: '#ef4444',
            wickUpColor: '#22c55e',
            wickDownColor: '#ef4444',
        });

        seriesRef.current = series;

        // Set markers
        const markers = createMarkers(trades);
        markersRef.current = markers;

        if ('setMarkers' in series) {
            (series as any).setMarkers(markers);
        }

        // Subscribe to marker clicks
        chart.subscribeClick((param: MouseEventParams) => {
            if (param.point && param.time) {
                // Find clicked trade
                const clickedTrade = trades.find(t => t.time === param.time);
                if (clickedTrade && onTradeClick) {
                    onTradeClick(clickedTrade);
                }
            }
        });

        return () => {
            try {
                chart.removeSeries(series);
            } catch (e) {
                // Series might already be removed
            }
        };
    }, [chart, trades, createMarkers, onTradeClick]);

    // Update markers data
    useEffect(() => {
        if (seriesRef.current && markersRef.current.length > 0 && 'setMarkers' in seriesRef.current) {
            (seriesRef.current as any).setMarkers(markersRef.current);
        }
    }, [trades]);

    return null;
};

export default TradeMarkers;
