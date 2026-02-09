import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { createChart, ColorType, CrosshairMode, IChartApi, ISeriesApi, LineStyle, MouseEventParams } from 'lightweight-charts';
import { OHLCData, VolumeData, ChartType, ToolType, SeriesMarker, Drawing, DrawingType } from '../types';

interface ChartProps {
    data: OHLCData[];
    volumeData: VolumeData[];
    currentIndex: number;
    windowStartIndex: number;
    windowEndIndex: number;
    onIndexChange: (index: number) => void;
    currentTool: ToolType;
    chartType: ChartType;
    onCursorMove?: (time: number | null, price: number | null) => void;
    externalCursor?: { time: number | null, price: number | null };
    markers?: SeriesMarker[];
    drawingsVisible?: boolean;
    drawingsLocked?: boolean;
    magnetEnabled?: boolean;
}

export interface ChartRef {
    resize: () => void;
    clearDrawings: () => void;
    getDrawings: () => Drawing[];
    setDrawings: (drawings: Drawing[]) => void;
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

const Chart = forwardRef<ChartRef, ChartProps>(({ data, volumeData, currentIndex, windowStartIndex, windowEndIndex, onIndexChange, currentTool, chartType, onCursorMove, externalCursor, markers, drawingsVisible = true, drawingsLocked = false, magnetEnabled = false }, ref) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const volumeContainerRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLCanvasElement>(null);
    
    const chartApiRef = useRef<IChartApi | null>(null);
    const volumeApiRef = useRef<IChartApi | null>(null);
    
    const seriesRef = useRef<ISeriesApi<any> | null>(null);
    const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

    const [candleInfo, setCandleInfo] = useState<OHLCData | null>(null);
    const [drawings, setDrawings] = useState<Drawing[]>([]);
    const [draft, setDraft] = useState<Drawing | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [drag, setDrag] = useState<DragMode>(null);

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
        }
        ,
        clearDrawings: () => {
            setDrawings([]);
            setDraft(null);
            setSelectedId(null);
            setDrag(null);
        },
        getDrawings: () => {
            return drawings;
        },
        setDrawings: (next: Drawing[]) => {
            setDrawings(next);
            setDraft(null);
            setSelectedId(null);
            setDrag(null);
        }
    }));

    useEffect(() => {
        if (!drawingsLocked && selectedId && drawings.every(d => d.id !== selectedId)) {
            setSelectedId(null);
        }
    }, [drawings, selectedId, drawingsLocked]);

    const distanceToSegment = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
        const dx = bx - ax;
        const dy = by - ay;
        if (dx === 0 && dy === 0) {
            return Math.hypot(px - ax, py - ay);
        }
        const t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
        const tt = Math.max(0, Math.min(1, t));
        const cx = ax + tt * dx;
        const cy = ay + tt * dy;
        return Math.hypot(px - cx, py - cy);
    };

    const findNearestIndexByTime = (t: number) => {
        let lo = 0;
        let hi = data.length - 1;
        while (lo <= hi) {
            const mid = (lo + hi) >> 1;
            const mt = data[mid].time;
            if (mt === t) return mid;
            if (mt < t) lo = mid + 1;
            else hi = mid - 1;
        }
        if (lo <= 0) return 0;
        if (lo >= data.length) return data.length - 1;
        const a = data[lo - 1];
        const b = data[lo];
        return Math.abs(a.time - t) <= Math.abs(b.time - t) ? lo - 1 : lo;
    };

    const applyMagnet = (x: number, y: number, time: number, price: number) => {
        const chart = chartApiRef.current;
        const series = seriesRef.current;
        if (!chart || !series) return { time, price };
        if (!data.length) return { time, price };

        const timeScale: any = chart.timeScale();
        const idx = findNearestIndexByTime(time);
        const bar = data[idx];

        const tx = timeScale.timeToCoordinate(bar.time);
        let snappedTime = time;
        if (tx != null && Math.abs(tx - x) <= 10) {
            snappedTime = bar.time;
        }

        const candidates = [bar.open, bar.high, bar.low, bar.close];
        let snappedPrice = price;
        let best = Infinity;
        for (const p of candidates) {
            const cy = series.priceToCoordinate(p);
            if (cy == null) continue;
            const d = Math.abs(cy - y);
            if (d < best) {
                best = d;
                snappedPrice = p;
            }
        }
        if (best > 8) {
            snappedPrice = price;
        }

        return { time: snappedTime, price: snappedPrice };
    };

    const redrawOverlay = React.useCallback(() => {
        const canvas = overlayRef.current;
        const container = chartContainerRef.current;
        const chart = chartApiRef.current;
        const series = seriesRef.current;

        if (!canvas || !container || !chart || !series) return;

        const w = container.clientWidth;
        const h = container.clientHeight;
        if (w <= 0 || h <= 0) return;

        const dpr = window.devicePixelRatio || 1;
        if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
            canvas.width = Math.floor(w * dpr);
            canvas.height = Math.floor(h * dpr);
            canvas.style.width = `${w}px`;
            canvas.style.height = `${h}px`;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);

        if (!drawingsVisible) return;

        const renderOne = (d: Drawing, alpha: number) => {
            const timeScale: any = chart.timeScale();
            const x1 = timeScale.timeToCoordinate(d.t1);
            const y1 = series.priceToCoordinate(d.p1);
            if (x1 == null || y1 == null) return;

            ctx.globalAlpha = alpha;
            ctx.lineWidth = 1.5;
            const isSelected = selectedId === d.id;
            ctx.strokeStyle = isSelected ? '#fbbf24' : '#60a5fa';
            ctx.fillStyle = isSelected ? '#fbbf24' : '#60a5fa';

            if (d.type === 'hline') {
                ctx.beginPath();
                ctx.moveTo(0, y1);
                ctx.lineTo(w, y1);
                ctx.stroke();
                return;
            }

            if (d.type === 'vline') {
                ctx.beginPath();
                ctx.moveTo(x1, 0);
                ctx.lineTo(x1, h);
                ctx.stroke();
                return;
            }

            const x2 = d.t2 != null ? timeScale.timeToCoordinate(d.t2) : null;
            const y2 = d.p2 != null ? series.priceToCoordinate(d.p2) : null;
            if (x2 == null || y2 == null) return;

            if (d.type === 'trendline') {
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();

                if (isSelected) {
                    ctx.beginPath();
                    ctx.arc(x1, y1, 4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(x2, y2, 4, 0, Math.PI * 2);
                    ctx.fill();
                }
                return;
            }

            if (d.type === 'rectangle') {
                const left = Math.min(x1, x2);
                const top = Math.min(y1, y2);
                const rw = Math.abs(x2 - x1);
                const rh = Math.abs(y2 - y1);
                ctx.globalAlpha = alpha * 0.15;
                ctx.fillRect(left, top, rw, rh);
                ctx.globalAlpha = alpha;
                ctx.strokeRect(left, top, rw, rh);

                if (isSelected) {
                    const corners = [
                        [left, top],
                        [left + rw, top],
                        [left, top + rh],
                        [left + rw, top + rh],
                    ];
                    for (const [cx, cy] of corners) {
                        ctx.beginPath();
                        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
        };

        for (const d of drawings) {
            renderOne(d, 1);
        }
        if (draft) {
            renderOne(draft, 0.8);
        }
    }, [drawings, draft, drawingsVisible, selectedId]);

    // Initialize Chart Instance (Once)
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

        // Sync cursor logic
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

    useEffect(() => {
        redrawOverlay();
    }, [redrawOverlay, currentTool, chartType, currentIndex, windowStartIndex, windowEndIndex]);

    // Handle External Cursor Updates
    useEffect(() => {
        if (!chartApiRef.current || !seriesRef.current || !externalCursor) return;
        
        if (externalCursor.time && externalCursor.price) {
            chartApiRef.current.setCrosshairPosition(externalCursor.price, externalCursor.time, seriesRef.current);
        } else {
             chartApiRef.current.clearCrosshairPosition();
        }
    }, [externalCursor]);

    // Handle Chart Type Switching and Data Updates
    useEffect(() => {
        if (!chartApiRef.current) return;

        if (seriesRef.current) {
            try {
                chartApiRef.current.removeSeries(seriesRef.current);
            } catch {
            }
            seriesRef.current = null;
        }

        let newSeries;
        const commonOptions = {
            priceFormat: { type: 'price', precision: 5, minMove: 0.00001 },
        };

        // Create new series based on type
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
        
        // Initial Data Load
        const start = Math.max(0, windowStartIndex);
        const end = Math.min(windowEndIndex, currentIndex);
        const visibleOHLC = data.slice(start, end + 1);
        const visibleVolume = volumeData.slice(start, end + 1);

        // Format data based on series type
        if (chartType === 'Line' || chartType === 'Area') {
            const lineData = visibleOHLC.map(d => ({ time: d.time, value: d.close }));
            newSeries.setData(lineData);
        } else {
            newSeries.setData(visibleOHLC);
        }

        if (volumeSeriesRef.current) {
            volumeSeriesRef.current.setData(visibleVolume);
        }
        
    }, [chartType]); // Re-run when chartType changes

    // Update Data only (Fast path)
    useEffect(() => {
        if (!seriesRef.current || !volumeSeriesRef.current) return;

        const start = Math.max(0, windowStartIndex);
        const end = Math.min(windowEndIndex, currentIndex);
        const visibleOHLC = data.slice(start, end + 1);
        const visibleVolume = volumeData.slice(start, end + 1);

        if (chartType === 'Line' || chartType === 'Area') {
            const lineData = visibleOHLC.map(d => ({ time: d.time, value: d.close }));
            seriesRef.current.setData(lineData);
        } else {
            seriesRef.current.setData(visibleOHLC);
        }

        volumeSeriesRef.current.setData(visibleVolume);

        if (visibleOHLC.length > 0) {
            setCandleInfo(visibleOHLC[visibleOHLC.length - 1]);
        }
        redrawOverlay();
    }, [currentIndex, data, volumeData, chartType, windowStartIndex, windowEndIndex, redrawOverlay]);

    useEffect(() => {
        if (!chartApiRef.current || !seriesRef.current) return;
        if (!markers) return;
        const s: any = seriesRef.current;
        if (typeof s.setMarkers === 'function') {
            s.setMarkers(markers);
        }
    }, [markers]);

    useEffect(() => {
        const canvas = overlayRef.current;
        const container = chartContainerRef.current;
        const chart = chartApiRef.current;
        const series = seriesRef.current;
        if (!canvas || !container || !chart || !series) return;

        const getPoint = (e: PointerEvent) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const timeScale: any = chart.timeScale();
            const t: any = timeScale.coordinateToTime(x);
            const time = typeof t === 'number' ? t : (t && typeof t === 'object' && 'timestamp' in t ? (t as any).timestamp : null);
            const price = series.coordinateToPrice(y);
            if (time == null || price == null) return null;
            const snapped = magnetEnabled ? applyMagnet(x, y, time, price) : { time, price };
            return { x, y, time: snapped.time, price: snapped.price };
        };

        const hitTest = (x: number, y: number) => {
            const timeScale: any = chart.timeScale();
            const hitRadius = 8;
            const lineRadius = 6;

            const toXY = (d: Drawing) => {
                const x1 = timeScale.timeToCoordinate(d.t1);
                const y1 = series.priceToCoordinate(d.p1);
                const x2 = d.t2 != null ? timeScale.timeToCoordinate(d.t2) : null;
                const y2 = d.p2 != null ? series.priceToCoordinate(d.p2) : null;
                return { x1, y1, x2, y2 };
            };

            for (let i = drawings.length - 1; i >= 0; i--) {
                const d = drawings[i];
                const { x1, y1, x2, y2 } = toXY(d);
                if (x1 == null || y1 == null) continue;

                if (d.type === 'hline') {
                    if (Math.abs(y - y1) <= lineRadius) return { id: d.id, mode: { kind: 'move', id: d.id, start: { time: 0, price: 0 } } as DragMode };
                    continue;
                }
                if (d.type === 'vline') {
                    if (Math.abs(x - x1) <= lineRadius) return { id: d.id, mode: { kind: 'move', id: d.id, start: { time: 0, price: 0 } } as DragMode };
                    continue;
                }
                if (x2 == null || y2 == null) continue;

                if (d.type === 'trendline') {
                    if (Math.hypot(x - x1, y - y1) <= hitRadius) return { id: d.id, mode: { kind: 'p1', id: d.id } as DragMode };
                    if (Math.hypot(x - x2, y - y2) <= hitRadius) return { id: d.id, mode: { kind: 'p2', id: d.id } as DragMode };
                    if (distanceToSegment(x, y, x1, y1, x2, y2) <= lineRadius) return { id: d.id, mode: { kind: 'move', id: d.id, start: { time: 0, price: 0 } } as DragMode };
                    continue;
                }

                if (d.type === 'rectangle') {
                    const left = Math.min(x1, x2);
                    const right = Math.max(x1, x2);
                    const top = Math.min(y1, y2);
                    const bottom = Math.max(y1, y2);
                    const corners: Array<{ corner: 'tl' | 'tr' | 'bl' | 'br'; cx: number; cy: number }> = [
                        { corner: 'tl', cx: left, cy: top },
                        { corner: 'tr', cx: right, cy: top },
                        { corner: 'bl', cx: left, cy: bottom },
                        { corner: 'br', cx: right, cy: bottom },
                    ];
                    for (const c of corners) {
                        if (Math.hypot(x - c.cx, y - c.cy) <= hitRadius) {
                            return { id: d.id, mode: { kind: 'rect-corner', id: d.id, corner: c.corner } as DragMode };
                        }
                    }
                    const inside = x >= left && x <= right && y >= top && y <= bottom;
                    const onEdge =
                        Math.abs(x - left) <= lineRadius ||
                        Math.abs(x - right) <= lineRadius ||
                        Math.abs(y - top) <= lineRadius ||
                        Math.abs(y - bottom) <= lineRadius;
                    if (inside || onEdge) {
                        return { id: d.id, mode: { kind: 'move', id: d.id, start: { time: 0, price: 0 } } as DragMode };
                    }
                }
            }

            return null;
        };

        const onPointerDown = (e: PointerEvent) => {
            if (drawingsLocked) return;
            const pt = getPoint(e);
            if (!pt) return;

            if (currentTool === 'pointer') {
                const hit = hitTest(pt.x, pt.y);
                if (!hit) {
                    setSelectedId(null);
                    setDrag(null);
                    return;
                }
                setSelectedId(hit.id);
                if (hit.mode && hit.mode.kind === 'move') {
                    setDrag({ kind: 'move', id: hit.id, start: { time: pt.time, price: pt.price } });
                } else {
                    setDrag(hit.mode);
                }
                return;
            }

            if (!isDrawingTool(currentTool)) return;

            if (currentTool === 'hline') {
                setDrawings(prev => [...prev, { id: Date.now().toString(), type: 'hline', t1: pt.time, p1: pt.price }]);
                setDraft(null);
                return;
            }

            if (currentTool === 'vline') {
                setDrawings(prev => [...prev, { id: Date.now().toString(), type: 'vline', t1: pt.time, p1: pt.price }]);
                setDraft(null);
                return;
            }

            if (!draft) {
                setDraft({ id: 'draft', type: currentTool, t1: pt.time, p1: pt.price, t2: pt.time, p2: pt.price });
            } else {
                const finished: Drawing = { ...draft, id: Date.now().toString(), t2: pt.time, p2: pt.price };
                setDrawings(prev => [...prev, finished]);
                setDraft(null);
            }
        };

        const onPointerMove = (e: PointerEvent) => {
            const pt = getPoint(e);
            if (!pt) return;

            if (drag) {
                setDrawings(prev => {
                    const idx = prev.findIndex(d => d.id === drag.id);
                    if (idx < 0) return prev;
                    const d = prev[idx];

                    if (drag.kind === 'move') {
                        const dt = pt.time - drag.start.time;
                        const dp = pt.price - drag.start.price;
                        let next: Drawing = d;
                        if (d.type === 'hline') {
                            next = { ...d, p1: d.p1 + dp };
                        } else if (d.type === 'vline') {
                            next = { ...d, t1: d.t1 + dt };
                        } else if (d.type === 'trendline') {
                            next = { ...d, t1: d.t1 + dt, p1: d.p1 + dp, t2: (d.t2 ?? d.t1) + dt, p2: (d.p2 ?? d.p1) + dp };
                        } else if (d.type === 'rectangle') {
                            next = { ...d, t1: d.t1 + dt, p1: d.p1 + dp, t2: (d.t2 ?? d.t1) + dt, p2: (d.p2 ?? d.p1) + dp };
                        }
                        const copy = prev.slice();
                        copy[idx] = next;
                        return copy;
                    }

                    if (drag.kind === 'p1') {
                        const copy = prev.slice();
                        copy[idx] = { ...d, t1: pt.time, p1: pt.price };
                        return copy;
                    }

                    if (drag.kind === 'p2') {
                        const copy = prev.slice();
                        copy[idx] = { ...d, t2: pt.time, p2: pt.price };
                        return copy;
                    }

                    if (drag.kind === 'rect-corner') {
                        const t1 = d.t1;
                        const p1 = d.p1;
                        const t2 = d.t2 ?? d.t1;
                        const p2 = d.p2 ?? d.p1;

                        let nt1 = t1;
                        let np1 = p1;
                        let nt2 = t2;
                        let np2 = p2;

                        if (drag.corner === 'tl') {
                            nt1 = pt.time;
                            np1 = pt.price;
                        } else if (drag.corner === 'tr') {
                            nt2 = pt.time;
                            np1 = pt.price;
                        } else if (drag.corner === 'bl') {
                            nt1 = pt.time;
                            np2 = pt.price;
                        } else if (drag.corner === 'br') {
                            nt2 = pt.time;
                            np2 = pt.price;
                        }

                        const copy = prev.slice();
                        copy[idx] = { ...d, t1: nt1, p1: np1, t2: nt2, p2: np2 };
                        return copy;
                    }

                    return prev;
                });
                redrawOverlay();
                return;
            }

            if (draft) {
                setDraft(prev => (prev ? { ...prev, t2: pt.time, p2: pt.price } : prev));
                return;
            }
        };

        const onPointerUp = () => {
            if (drag && drag.kind === 'move') {
                const id = drag.id;
                const d = drawings.find(x => x.id === id);
                if (d) {
                    const chart = chartApiRef.current;
                    const series = seriesRef.current;
                    if (chart && series) {
                        const timeScale: any = chart.timeScale();
                        const x = timeScale.timeToCoordinate(d.t1);
                        const y = series.priceToCoordinate(d.p1);
                        if (x != null && y != null) {
                            const snapped = magnetEnabled ? applyMagnet(x, y, d.t1, d.p1) : { time: d.t1, price: d.p1 };
                            if (snapped.time !== d.t1 || snapped.price !== d.p1) {
                                setDrawings(prev => prev.map(dd => (dd.id === id ? { ...dd, t1: snapped.time, p1: snapped.price } : dd)));
                            }
                        }
                    }
                }
            }
            setDrag(null);
        };

        canvas.addEventListener('pointerdown', onPointerDown);
        canvas.addEventListener('pointermove', onPointerMove);
        canvas.addEventListener('pointerup', onPointerUp);
        canvas.addEventListener('pointercancel', onPointerUp);
        return () => {
            canvas.removeEventListener('pointerdown', onPointerDown);
            canvas.removeEventListener('pointermove', onPointerMove);
            canvas.removeEventListener('pointerup', onPointerUp);
            canvas.removeEventListener('pointercancel', onPointerUp);
        };
    }, [currentTool, draft, drawingsLocked, drawings, drag, magnetEnabled, redrawOverlay]);

    return (
        <div ref={wrapperRef} className="flex-1 flex flex-col relative overflow-hidden">
            {/* Main Chart */}
            <div className="flex-1 relative min-h-0">
                <div ref={chartContainerRef} className="absolute inset-0" />
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
