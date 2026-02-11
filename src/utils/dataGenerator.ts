import { OHLCData, VolumeData } from '../types';

export function generateOHLCData(count = 500): OHLCData[] {
    const data: OHLCData[] = [];
    let basePrice = 1.08000;
    const startDate = new Date('2024-01-15T00:00:00');
    
    for (let i = 0; i < count; i++) {
        const date = new Date(startDate.getTime() + i * 15 * 60 * 1000); // 15 min candles
        const volatility = 0.0005 + Math.random() * 0.001;
        const change = (Math.random() - 0.48) * volatility;
        
        const open = basePrice;
        const close = basePrice + change;
        const high = Math.max(open, close) + Math.random() * 0.0003;
        const low = Math.min(open, close) - Math.random() * 0.0003;
        
        data.push({
            time: Math.floor(date.getTime() / 1000), // Unix timestamp
            open: parseFloat(open.toFixed(5)),
            high: parseFloat(high.toFixed(5)),
            low: parseFloat(low.toFixed(5)),
            close: parseFloat(close.toFixed(5)),
        });
        
        basePrice = close;
    }
    return data;
}

export function generateVolumeData(ohlcData: OHLCData[]): VolumeData[] {
    return ohlcData.map(d => ({
        time: d.time,
        value: Math.floor(500 + Math.random() * 2000),
        color: d.close >= d.open ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)',
    }));
}