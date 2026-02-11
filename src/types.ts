export interface OHLCData {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
}

export interface VolumeData {
    time: number;
    value: number;
    color: string;
}

export interface VaultItem {
    id: number;
    title: string;
    category: 'drawing' | 'replay' | 'idea' | 'lesson';
    asset: string;
    timeframe: string;
    tags: string[];
    notes: string;
    createdAt: string;
    thumbnail: null | string;
    drawingsCount: number;
    color: string;
    drawings_json?: string | null;
}

export type ToolType = 
    | 'crosshair' | 'pointer' | 'trendline' | 'hline' | 'vline' 
    | 'ray' | 'extended' | 'fibretracement' | 'fibextension' 
    | 'pitchfork' | 'rectangle' | 'circle' | 'triangle' 
    | 'channel' | 'xabcd' | 'headshoulders' | 'elliott' 
    | 'text' | 'note' | 'callout' | 'arrow' | 'pricelabel' 
    | 'pricerange' | 'daterange' | 'longposition' | 'shortposition' 
    | 'magnet' | 'lock' | 'visibility' | 'delete';

export interface TradeEntry {
    id: string;
    pair: string;
    type: 'LONG' | 'SHORT';
    time: string;
    entry: number;
    exit: number;
    lots: number;
    pnl: number;
    r: number;
    status: 'WIN' | 'LOSS' | 'BE';
    setup: string;
}

export interface JournalDay {
    date: string;
    trades: TradeEntry[];
    note: string;
    mood: 'disciplined' | 'neutral' | 'tilted' | 'fearful' | 'greedy';
}

export type ChartType = 'Candle' | 'Bar' | 'Line' | 'Area' | 'GhostTape'; // Added GhostTape

export interface SessionStats {
    balance: number;
    startBalance: number;
    winRate: number;
    tradesCount: number;
    wins: number;
    losses: number;
    pnl: number;
}

// --- Sovereign Types ---

export interface Bar {
    time_ms: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface Tick {
    bid: number;
    ask: number;
    timestamp_ms: number;
    spread: number;
}

export type Side = 'Buy' | 'Sell';
export type OrderType = 'Market' | 'Limit' | 'Stop';

export interface Order {
    id: number;
    symbol: string;
    side: Side;
    order_type: OrderType;
    price: number;
    sl?: number;
    tp?: number;
    volume_lots: number;
    submitted_ms: number;
}

export type ArtifactEvent = 
    | { OrderSubmitted: Order }
    | { OrderFilled: { order_id: number, fill_price: number, time_ms: number } }
    | { PositionClosed: { position_id: number, close_price: number, pnl: number, time_ms: number } }
    | { MarginCall: { time_ms: number } }
    | { EquityUpdate: { time_ms: number, equity: number } };

export type MarkerPosition = 'aboveBar' | 'belowBar' | 'inBar';
export type MarkerShape = 'circle' | 'square' | 'arrowUp' | 'arrowDown';

export interface SeriesMarker {
    time: number;
    position: MarkerPosition;
    color: string;
    shape: MarkerShape;
    text?: string;
}

export interface QuantumRunInfo {
    id: number;
    strategy_name: string;
    params_json?: string | null;
    initial_balance?: number | null;
    final_balance?: number | null;
    total_trades?: number | null;
    timestamp?: number | null;
}

export type DrawingType = 'trendline' | 'hline' | 'vline' | 'rectangle';

export interface Drawing {
    id: string;
    type: DrawingType;
    t1: number;
    p1: number;
    t2?: number;
    p2?: number;
}
