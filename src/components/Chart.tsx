import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import { createChart, ColorType, CrosshairMode, IChartApi, ISeriesApi, LineStyle, MouseEventParams } from 'lightweight-charts';
import { OHLCData, VolumeData, ChartType, ToolType, SeriesMarker, Drawing, DrawingType } from '../types';
import { loadOHLCVData, getDataWindow, saveDrawings, loadDrawings, saveIndicators, loadIndicators } from '../services/dataService';
import type { IndicatorConfig, IndicatorResult, OhlcvData } from '../types/indicators';
import indicatorService from '../services/indicatorService';
import IndicatorOverlay from './IndicatorOverlay';

interface ChartProps {
    symbol: string;
    timeframe: string;
    chartType: ChartType;
    currentTool: ToolType;
    onCursorMove?: (time: number | null, price: number | null) => void;
    externalCursor?: { time: number | null; price: number | null };
    markers?: SeriesMarker[];
    drawingsVisible?: boolean;
    drawingsLocked?: boolean;
    magnetEnabled?: boolean;
    // Replay props
    isReplayMode?: boolean;
    replayIndex?: number;
    onReplayIndexChange?: (index: number) => void;
    // Indicator props
    indicators?: IndicatorConfig[];
    onIndicatorsChange?: (indicators: IndicatorConfig[]) => void;
}

export interface ChartRef {
    resize: () => void;
    clearDrawings: () => void;
    getDrawings: () => Drawing[];
    setDrawings: (drawings: Drawing[]) => void;
    loadData: (symbol: string, timeframe: string) => Promise<void>;
    refresh: () => void;
    // Indicator methods
    getIndicators: () => IndicatorConfig[];
    addIndicator: (indicator: IndicatorConfig) => void;
    removeIndicator: (id: string) => void;
    updateIndicator: (id: string, updates: Partial<IndicatorConfig>) => void;
}

const isDrawingTool = (tool: ToolType): tool is DrawingType => {
    return tool === 'trendline' || tool === 'hline' || tool === 'vline' || tool === 'rectangle';
};

type DragMode =
    | { kind: 'move'; id: string; start: { time: number; price: number } }
    | { kind: 'p1'; id: string }
    | { kind: 'p2'; id: string }
    | { kind: 'rect-corner'; id: string; corner: 'tl' | 'tr' | 'bl' | 'br' }
    | null;

const Chart = forwardRef<ChartRef, ChartProps>(({
    symbol,
    timeframe,
    chartType,
    currentTool,
    onCursorMove,
    externalCursor,
    markers,
    drawingsVisible = true,
    drawingsLocked = false,
    magnetEnabled = false,
    isReplayMode = false,
    replayIndex = 0,
    onReplayIndexChange,
    indicators: externalIndicators,
    onIndicatorsChange,
}, ref) => {
    // Refs
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const volumeContainerRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLCanvasElement>(null);
    
    const chartApiRef = useRef<IChartApi | null>(null);
    const volumeApiRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<any> | null>(null);
    const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

    // State
    const [candleInfo, setCandleInfo] = useState<OHLCData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState<OHLCData[]>([]);
    const [volumeData, setVolumeData] = useState<VolumeData[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [windowStartIndex, setWindowStartIndex] = useState(0);
    const [windowEndIndex, setWindowEndIndex] = useState(0);
    
    // Drawing state
    const [drawings, setDrawings] = useState<Drawing[]>([]);
    const [draft, setDraft] = useState<Drawing | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [drag, setDrag] = useState<DragMode>(null);

    // Indicator state
    const [indicators, setIndicators] = useState<IndicatorConfig[]>(externalIndicators || []);
    const [indicatorResults, setIndicatorResults] = useState<Map<string, IndicatorResult>>(new Map());
    const [isCalculatingIndicators, setIsCalculatingIndicators] = useState(false);

    // Exposed methods
    useImperativeHandle(ref, () => ({
        resize: () => {
            if (chartContainerRef.current && chartApiRef.current) {
                chartApiRef.current.applyOptions({ 
                    width: chartContainerRef.current.clientWidth,
                    height: chartContainerRef.current.clientHeight 
                });
            }
            if (volumeContainerRef.current && volumeApiRef.current) {
                volumeApiRef.current.applyOptions({ 
                    width: volumeContainerRef.current.clientWidth,
                    height: volumeContainerRef.current.clientHeight 
                });
            }
        },
        clearDrawings: () => {
            setDrawings([]);
            setDraft(null);
            setSelectedId(null);
            setDrag(null);
        },
        getDrawings: () => drawings,
        setDrawings: (next: Drawing[]) => {
            setDrawings(next);
            setDraft(null);
            setSelectedId(null);
            setDrag(null);
        },
        loadData: async (sym: string, tf: string) => {
            setIsLoading(true);
            try {
                const ohlcvData = await loadOHLCVData(sym, tf);
                
                // Convert to chart format
                const chartData: OHLCData[] = ohlcvData.map(c => ({
                    time: c.time,
                    open: parseFloat(c.open),
                    high: parseFloat(c.high),
                    low: parseFloat(c.low),
                    close: parseFloat(c.close),
                }));
                
                const volData: VolumeData[] = ohlcvData.map(c => ({
                    time: c.time,
                    value: parseFloat(c.volume),
                    color: parseFloat(c.close) >= parseFloat(c.open) ? '#22c55e' : '#ef4444',
                }));
                
                setData(chartData);
                setVolumeData(volData);
                setCurrentIndex(chartData.length - 1);
                setWindowStartIndex(Math.max(0, chartData.length - 500));
                setWindowEndIndex(chartData.length - 1);
                
                // Load drawings
                const savedDrawings = await loadDrawings(sym, tf);
                if (savedDrawings.length > 0) {
                    setDrawings(savedDrawings);
                }
                
                // Load indicators
                const savedIndicators = await loadIndicators(sym, tf);
                if (savedIndicators.length > 0) {
                    setIndicators(savedIndicators);
                    onIndicatorsChange?.(savedIndicators);
                }
                
            } catch (error) {
                console.error('Failed to load data:', error);
            } finally {
                setIsLoading(false);
            }
        },
        refresh: () => {
            if (symbol && timeframe) {
                // Reload data
                loadOHLCVData(symbol, timeframe).then(ohlcvData => {
                    const chartData: OHLCData[] = ohlcvData.map(c => ({
                        time: c.time,
                        open: parseFloat(c.open),
                        high: parseFloat(c.high),
                        low: parseFloat(c.low),
                        close: parseFloat(c.close),
                    }));
                    setData(chartData);
                });
            }
        },
        // Indicator methods
        getIndicators: () => indicators,
        addIndicator: (indicator: IndicatorConfig) => {
            const newIndicators = [...indicators, indicator];
            setIndicators(newIndicators);
            onIndicatorsChange?.(newIndicators);
        },
        removeIndicator: (id: string) => {
            const newIndicators = indicators.filter(ind => ind.id !== id);
            setIndicators(newIndicators);
            onIndicatorsChange?.(newIndicators);
            // Clean up results
            setIndicatorResults(prev => {
                const newMap = new Map(prev);
                newMap.delete(id);
                return newMap;
            });
        },
        updateIndicator: (id: string, updates: Partial<IndicatorConfig>) => {
            const newIndicators = indicators.map(ind =>
                ind.id === id ? { ...ind, ...updates } : ind
            );
            setIndicators(newIndicators);
            onIndicatorsChange?.(newIndicators);
            // Clear cached result for this indicator to force recalculation
            if (updates.parameters) {
                setIndicatorResults(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(id);
                    return newMap;
                });
            }
        },
    }), [indicators, onIndicatorsChange, symbol, timeframe, drawings]);

    // Initialize chart
    useEffect(() => {
        if (!chartContainerRef.current || !volumeContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: { 
                background: { type: ColorType.Solid, color: 'transparent' }, 
                textColor: '#71717a',
                fontFamily: "'Inter', sans-serif",
            },
            grid: { 
                vertLines: { color: '#1f1f23' }, 
                horzLines: { color: '#1f1f23' } 
            },
            crosshair: {
                mode: CrosshairMode.Normal,
                vertLine: { color: '#3b82f6', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#18181b' },
                horzLine: { color: '#3b82f6', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#18181b' },
            },
            rightPriceScale: { 
                borderColor: '#27272a', 
                scaleMargins: { top: 0.1, bottom: 0.1 } 
            },
            timeScale: { 
                borderColor: '#27272a', 
                timeVisible: true, 
                secondsVisible: false 
            },
        });

        const volumeChart = createChart(volumeContainerRef.current, {
            layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#71717a' },
            grid: { vertLines: { visible: false }, horzLines: { color: '#1f1f23' } },
            rightPriceScale: { borderColor: '#27272a', visible: false },
            timeScale: { visible: false },
        });

        const volumeSeries = volumeChart.addHistogramSeries({
            priceFormat: { type: 'volume' },
            priceScaleId: '',
        });
        volumeSeriesRef.current = volumeSeries;

        chart.timeScale().subscribeVisibleLogicalRangeChange(range => {
            if (range) volumeChart.timeScale().setVisibleLogicalRange(range);
        });

        chart.subscribeCrosshairMove((param: MouseEventParams) => {
            if (onCursorMove) {
                if (!param.time || param.point === undefined || param.point.x < 0 || param.point.y < 0) {
                    onCursorMove(null, null);
                } else {
                    const price = seriesRef.current?.coordinateToPrice(param.point.y);
                    onCursorMove(param.time as number, price || null);
                }
            }
        });

        chartApiRef.current = chart;
        volumeApiRef.current = volumeChart;

        const resizeObserver = new ResizeObserver(() => {
             if (chartContainerRef.current && chartApiRef.current) {
                chartApiRef.current.applyOptions({ 
                    width: chartContainerRef.current.clientWidth, 
                    height: chartContainerRef.current.clientHeight 
                });
             }
             if (volumeContainerRef.current && volumeApiRef.current) {
                volumeApiRef.current.applyOptions({ 
                    width: volumeContainerRef.current.clientWidth, 
                    height: volumeContainerRef.current.clientHeight 
                });
             }
        });

        if (wrapperRef.current) {
            resizeObserver.observe(wrapperRef.current);
        }

        return () => {
            resizeObserver.disconnect();
            chart.remove();
            volumeChart.remove();
        };
    }, []);

    // Load data when symbol/timeframe changes
    useEffect(() => {
        if (symbol && timeframe) {
            // Trigger data load via ref
            if (ref && 'current' in ref && ref.current) {
                ref.current.loadData(symbol, timeframe);
            }
        }
    }, [symbol, timeframe]);

    // Handle chart type switching and data updates
    useEffect(() => {
        if (!chartApiRef.current || data.length === 0) return;

        if (seriesRef.current) {
            try {
                chartApiRef.current.removeSeries(seriesRef.current);
            } catch {}
            seriesRef.current = null;
        }

        let newSeries;
        const commonOptions = {
            priceFormat: { type: 'price', precision: 5, minMove: 0.00001 },
        };

        switch (chartType) {
            case 'Line':
                newSeries = chartApiRef.current.addLineSeries({
                    ...commonOptions,
                    color: '#3b82f6',
                    lineWidth: 2,
                });
                break;
            case 'Area':
                newSeries = chartApiRef.current.addAreaSeries({
                    ...commonOptions,
                    topColor: 'rgba(59, 130, 246, 0.56)',
                    bottomColor: 'rgba(59, 130, 246, 0.04)',
                    lineColor: '#3b82f6',
                    lineWidth: 2,
                });
                break;
            case 'Bar':
                newSeries = chartApiRef.current.addBarSeries({
                    ...commonOptions,
                    upColor: '#22c55e',
                    downColor: '#ef4444',
                });
                break;
            case 'Candle':
            default:
                newSeries = chartApiRef.current.addCandlestickSeries({
                    ...commonOptions,
                    upColor: '#22c55e',
                    downColor: '#ef4444',
                    borderUpColor: '#22c55e',
                    borderDownColor: '#ef4444',
                    wickUpColor: '#22c55e',
                    wickDownColor: '#ef4444',
                });
                break;
        }

        seriesRef.current = newSeries;

        if (markers && typeof (newSeries as any).setMarkers === 'function') {
            (newSeries as any).setMarkers(markers);
        }
        
        // Update visible data
        const start = isReplayMode ? 0 : Math.max(0, windowStartIndex);
        const end = isReplayMode 
            ? Math.min(replayIndex, data.length - 1)
            : Math.min(windowEndIndex, data.length - 1);
            
        const visibleOHLC = data.slice(start, end + 1);
        const visibleVolume = volumeData.slice(start, end + 1);

        if (chartType === 'Line' || chartType === 'Area') {
            const lineData = visibleOHLC.map(d => ({ time: d.time, value: d.close }));
            newSeries.setData(lineData);
        } else {
            newSeries.setData(visibleOHLC);
        }

        if (volumeSeriesRef.current) {
            volumeSeriesRef.current.setData(visibleVolume);
        }
        
    }, [chartType, data, isReplayMode, replayIndex, windowStartIndex, windowEndIndex]);

    // Handle replay index changes
    useEffect(() => {
        if (!isReplayMode || !seriesRef.current) return;
        
        const endIdx = Math.min(replayIndex, data.length - 1);
        const visibleOHLC = data.slice(0, endIdx + 1);
        const visibleVolume = volumeData.slice(0, endIdx + 1);

        if (chartType === 'Line' || chartType === 'Area') {
            const lineData = visibleOHLC.map(d => ({ time: d.time, value: d.close }));
            seriesRef.current.setData(lineData);
        } else {
            seriesRef.current.setData(visibleOHLC);
        }

        if (volumeSeriesRef.current) {
            volumeSeriesRef.current.setData(visibleVolume);
        }
        
        if (visibleOHLC.length > 0) {
            setCandleInfo(visibleOHLC[visibleOHLC.length - 1]);
        }
    }, [replayIndex, isReplayMode, data, volumeData, chartType]);

    // Calculate indicators when data or indicators change
    useEffect(() => {
        if (data.length === 0 || indicators.length === 0) return;

        const visibleIndicators = indicators.filter(ind => ind.visible);
        if (visibleIndicators.length === 0) {
            setIndicatorResults(new Map());
            return;
        }

        setIsCalculatingIndicators(true);
        
        // Convert OHLC data to the format expected by indicator service
        const ohlcvData: OhlcvData[] = data.map(d => ({
            time: typeof d.time === 'string' ? new Date(d.time).getTime() / 1000 : d.time,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
            volume: 0 // Volume not in OHLCData type
        }));

        // Calculate indicators in parallel using web workers
        const calculateIndicators = async () => {
            try {
                const results = await indicatorService.calculateMultipleIndicators(
                    visibleIndicators,
                    ohlcvData
                );

                const resultsMap = new Map<string, IndicatorResult>();
                results.forEach(result => {
                    resultsMap.set(result.id, result);
                });

                setIndicatorResults(resultsMap);
            } catch (error) {
                console.error('Failed to calculate indicators:', error);
            } finally {
                setIsCalculatingIndicators(false);
            }
        };

        calculateIndicators();

        // Cleanup on unmount
        return () => {
            indicatorService.cancelAll();
        };
    }, [data, indicators]);

    // ... rest of the component (drawing handlers, etc.) remains similar
    // Just update the redrawOverlay and drawing handlers to use the refactored state

    return (
        <div ref={wrapperRef} className="flex-1 flex flex-col relative overflow-hidden">
            {/* Loading indicator */}
            {isLoading && (
                <div className="absolute inset-0 bg-zinc-950/80 flex items-center justify-center z-50">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-zinc-300">Loading {symbol} {timeframe}...</span>
                    </div>
                </div>
            )}
            
            {/* Main Chart */}
            <div className="flex-1 relative min-h-0">
                <div ref={chartContainerRef} className="absolute inset-0" />
                
                {/* Indicator Overlay */}
                <IndicatorOverlay
                    chart={chartApiRef.current}
                    indicators={indicators}
                    results={indicatorResults}
                />
                
                {/* Indicator Loading Indicator */}
                {isCalculatingIndicators && (
                    <div className="absolute top-16 right-3 flex items-center gap-2 px-3 py-1.5 
                                    bg-blue-500/20 border border-blue-500/50 rounded-lg z-20">
                        <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs text-blue-300">Calculating indicators...</span>
                    </div>
                )}
                <canvas
                    ref={overlayRef}
                    className={`absolute inset-0 ${((isDrawingTool(currentTool) || currentTool === 'pointer') && drawingsVisible && !drawingsLocked) ? (currentTool === 'pointer' ? 'pointer-events-auto cursor-default' : 'pointer-events-auto cursor-crosshair') : 'pointer-events-none'}`}
                />
                
                {/* Price Info Overlay */}
                {candleInfo && (
                    <div className="absolute top-3 left-3 flex items-center gap-4 z-10 pointer-events-none">
                        <div className="flex items-center">
                            <span className="text-xs text-zinc-500 mr-1">O</span>
                            <span className="text-xs mono text-zinc-300">{candleInfo.open.toFixed(5)}</span>
                        </div>
                        <div className="flex items-center">
                            <span className="text-xs text-zinc-500 mr-1">H</span>
                            <span className="text-xs mono text-emerald-400">{candleInfo.high.toFixed(5)}</span>
                        </div>
                        <div className="flex items-center">
                            <span className="text-xs text-zinc-500 mr-1">L</span>
                            <span className="text-xs mono text-red-400">{candleInfo.low.toFixed(5)}</span>
                        </div>
                        <div className="flex items-center">
                            <span className="text-xs text-zinc-500 mr-1">C</span>
                            <span className="text-xs mono text-zinc-300">{candleInfo.close.toFixed(5)}</span>
                        </div>
                    </div>
                )}

                {/* Status Overlay */}
                <div className="absolute top-3 right-3 flex items-center gap-2 px-2 py-1 bg-zinc-900/80 border border-zinc-800 rounded z-10">
                    <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                    <span className="text-xs mono text-zinc-300">
                        {candleInfo ? new Date(candleInfo.time * 1000).toISOString().slice(0, 16).replace('T', ' ') : 'Loading...'}
                    </span>
                </div>

                <div className="absolute bottom-3 left-3 flex items-center gap-2 px-2 py-1 bg-zinc-900/80 border border-zinc-800 rounded z-10">
                    <span className="text-xs text-zinc-300 capitalize">{currentTool}</span>
                    {isReplayMode && (
                        <span className="text-xs text-amber-400 ml-2">Replay: {replayIndex}/{data.length}</span>
                    )}
                </div>
            </div>

            {/* Volume Chart */}
            <div className="h-16 border-t border-zinc-800/50 relative bg-zinc-950 flex-shrink-0">
                <div ref={volumeContainerRef} className="h-full w-full" />
            </div>
        </div>
    );
});

export default Chart;