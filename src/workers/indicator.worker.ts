/**
 * Web Worker for Technical Indicator Calculations
 * Runs in background thread to prevent UI blocking
 */

import type { OhlcvData, IndicatorResult, IndicatorType, WorkerMessage } from '../types/indicators';

// Indicator calculation functions
class IndicatorCalculator {
  static calculateSMA(data: OhlcvData[], period: number, source: string): number[] {
    const prices = this.getSourcePrices(data, source);
    const result: number[] = new Array(data.length).fill(null as any);
    
    for (let i = period - 1; i < data.length; i++) {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += prices[i - j];
      }
      result[i] = sum / period;
    }
    
    return result;
  }

  static calculateEMA(data: OhlcvData[], period: number, source: string): number[] {
    const prices = this.getSourcePrices(data, source);
    const result: number[] = new Array(data.length).fill(null as any);
    const multiplier = 2 / (period + 1);
    
    // First EMA is SMA
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += prices[i];
    }
    result[period - 1] = sum / period;
    
    // Calculate remaining EMAs
    for (let i = period; i < data.length; i++) {
      result[i] = (prices[i] - (result[i - 1] ?? prices[i])) * multiplier + (result[i - 1] ?? prices[i]);
    }
    
    return result;
  }

  static calculateWMA(data: OhlcvData[], period: number, source: string): number[] {
    const prices = this.getSourcePrices(data, source);
    const result: number[] = new Array(data.length).fill(null as any);
    const denominator = (period * (period + 1)) / 2;
    
    for (let i = period - 1; i < data.length; i++) {
      let weightedSum = 0;
      for (let j = 0; j < period; j++) {
        weightedSum += prices[i - j] * (period - j);
      }
      result[i] = weightedSum / denominator;
    }
    
    return result;
  }

  static calculateBollinger(data: OhlcvData[], period: number, stdDev: number, source: string): { upper: number[]; middle: number[]; lower: number[] } {
    const prices = this.getSourcePrices(data, source);
    const middle = this.calculateSMA(data, period, source);
    const upper: number[] = new Array(data.length).fill(null as any);
    const lower: number[] = new Array(data.length).fill(null as any);
    
    for (let i = period - 1; i < data.length; i++) {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        const diff = prices[i - j] - (middle[i] ?? 0);
        sum += diff * diff;
      }
      const std = Math.sqrt(sum / period);
      upper[i] = (middle[i] ?? 0) + stdDev * std;
      lower[i] = (middle[i] ?? 0) - stdDev * std;
    }
    
    return { upper, middle, lower };
  }

  static calculateRSI(data: OhlcvData[], period: number, source: string): number[] {
    const prices = this.getSourcePrices(data, source);
    const result: number[] = new Array(data.length).fill(null as any);
    
    let avgGain = 0;
    let avgLoss = 0;
    
    // Calculate initial averages
    for (let i = 1; i <= period; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) avgGain += change;
      else avgLoss += Math.abs(change);
    }
    
    avgGain /= period;
    avgLoss /= period;
    
    // First RSI
    const rs = avgGain / (avgLoss || 1);
    result[period] = 100 - (100 / (1 + rs));
    
    // Calculate remaining RSI values
    for (let i = period + 1; i < data.length; i++) {
      const change = prices[i] - prices[i - 1];
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? Math.abs(change) : 0;
      
      avgGain = ((avgGain * (period - 1)) + gain) / period;
      avgLoss = ((avgLoss * (period - 1)) + loss) / period;
      
      const rs = avgGain / (avgLoss || 1);
      result[i] = 100 - (100 / (1 + rs));
    }
    
    return result;
  }

  static calculateMACD(
    data: OhlcvData[], 
    fastPeriod: number, 
    slowPeriod: number, 
    signalPeriod: number,
    source: string
  ): { macd: number[]; signal: number[]; histogram: number[] } {
    const prices = this.getSourcePrices(data, source);
    const fastEMA = this.calculateEMA(data, fastPeriod, source);
    const slowEMA = this.calculateEMA(data, slowPeriod, source);
    
    const macd: number[] = new Array(data.length).fill(null as any);
    for (let i = slowPeriod - 1; i < data.length; i++) {
      macd[i] = (fastEMA[i] ?? 0) - (slowEMA[i] ?? 0);
    }
    
    // Calculate signal line (EMA of MACD)
    const signal = this.calculateEMAOfArray(macd, signalPeriod, slowPeriod - 1);
    
    // Calculate histogram
    const histogram: number[] = new Array(data.length).fill(null as any);
    for (let i = slowPeriod + signalPeriod - 2; i < data.length; i++) {
      histogram[i] = (macd[i] ?? 0) - (signal[i] ?? 0);
    }
    
    return { macd, signal, histogram };
  }

  static calculateATR(data: OhlcvData[], period: number): number[] {
    const result: number[] = new Array(data.length).fill(null as any);
    const trueRanges: number[] = [];
    
    // Calculate true ranges
    for (let i = 0; i < data.length; i++) {
      if (i === 0) {
        trueRanges.push(data[i].high - data[i].low);
      } else {
        const tr1 = data[i].high - data[i].low;
        const tr2 = Math.abs(data[i].high - data[i - 1].close);
        const tr3 = Math.abs(data[i].low - data[i - 1].close);
        trueRanges.push(Math.max(tr1, tr2, tr3));
      }
    }
    
    // Calculate ATR
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += trueRanges[i];
    }
    result[period - 1] = sum / period;
    
    for (let i = period; i < data.length; i++) {
      result[i] = ((result[i - 1] ?? 0) * (period - 1) + trueRanges[i]) / period;
    }
    
    return result;
  }

  static calculateVWAP(data: OhlcvData[]): number[] {
    const result: number[] = new Array(data.length).fill(null as any);
    let cumulativeTPV = 0;
    let cumulativeVolume = 0;
    
    for (let i = 0; i < data.length; i++) {
      const typicalPrice = (data[i].high + data[i].low + data[i].close) / 3;
      const volume = data[i].volume ?? 0;
      
      cumulativeTPV += typicalPrice * volume;
      cumulativeVolume += volume;
      
      if (cumulativeVolume > 0) {
        result[i] = cumulativeTPV / cumulativeVolume;
      }
    }
    
    return result;
  }

  // Helper methods
  private static getSourcePrices(data: OhlcvData[], source: string): number[] {
    switch (source) {
      case 'open': return data.map(d => d.open);
      case 'high': return data.map(d => d.high);
      case 'low': return data.map(d => d.low);
      case 'hl2': return data.map(d => (d.high + d.low) / 2);
      case 'hlc3': return data.map(d => (d.high + d.low + d.close) / 3);
      case 'ohlc4': return data.map(d => (d.open + d.high + d.low + d.close) / 4);
      case 'close':
      default:
        return data.map(d => d.close);
    }
  }

  private static calculateEMAOfArray(data: number[], period: number, startIndex: number): number[] {
    const result: number[] = new Array(data.length).fill(null as any);
    const multiplier = 2 / (period + 1);
    
    // First EMA is SMA
    let sum = 0;
    let count = 0;
    for (let i = startIndex; i < startIndex + period && i < data.length; i++) {
      if (data[i] !== null) {
        sum += data[i];
        count++;
      }
    }
    result[startIndex + period - 1] = sum / count;
    
    // Calculate remaining EMAs
    for (let i = startIndex + period; i < data.length; i++) {
      if (data[i] !== null) {
        const prevEMA = result[i - 1] ?? data[i];
        result[i] = (data[i] - prevEMA) * multiplier + prevEMA;
      }
    }
    
    return result;
  }
}

// Worker message handler
self.onmessage = function(event: MessageEvent<WorkerMessage>) {
  const { type, payload } = event.data;
  
  if (type === 'calculate') {
    const { id, indicatorType, ohlcv, parameters } = payload as {
      id: string;
      indicatorType: IndicatorType;
      ohlcv: OhlcvData[];
      parameters: Record<string, number | string>;
    };
    
    try {
      let result: IndicatorResult;
      
      switch (indicatorType) {
        case 'sma':
          result = calculateSMAIndicator(id, ohlcv, parameters);
          break;
        case 'ema':
          result = calculateEMAIndicator(id, ohlcv, parameters);
          break;
        case 'wma':
          result = calculateWMAIndicator(id, ohlcv, parameters);
          break;
        case 'bollinger':
          result = calculateBollingerIndicator(id, ohlcv, parameters);
          break;
        case 'rsi':
          result = calculateRSIIndicator(id, ohlcv, parameters);
          break;
        case 'macd':
          result = calculateMACDIndicator(id, ohlcv, parameters);
          break;
        case 'atr':
          result = calculateATRIndicator(id, ohlcv, parameters);
          break;
        case 'vwap':
          result = calculateVWAPIndicator(id, ohlcv);
          break;
        default:
          throw new Error(`Unknown indicator type: ${indicatorType}`);
      }
      
      self.postMessage({
        type: 'result',
        payload: result
      });
    } catch (error) {
      self.postMessage({
        type: 'error',
        payload: {
          id,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }
};

// Indicator calculation wrappers
function calculateSMAIndicator(
  id: string, 
  ohlcv: OhlcvData[], 
  parameters: Record<string, number | string>
): IndicatorResult {
  const period = Number(parameters.period) || 20;
  const source = String(parameters.source) || 'close';
  const values = IndicatorCalculator.calculateSMA(ohlcv, period, source);
  
  return {
    id,
    type: 'sma',
    lines: ['value'],
    data: ohlcv.map((candle, i) => ({
      time: candle.time,
      values: { value: values[i] }
    })),
    timestamp: Date.now()
  };
}

function calculateEMAIndicator(
  id: string, 
  ohlcv: OhlcvData[], 
  parameters: Record<string, number | string>
): IndicatorResult {
  const period = Number(parameters.period) || 20;
  const source = String(parameters.source) || 'close';
  const values = IndicatorCalculator.calculateEMA(ohlcv, period, source);
  
  return {
    id,
    type: 'ema',
    lines: ['value'],
    data: ohlcv.map((candle, i) => ({
      time: candle.time,
      values: { value: values[i] }
    })),
    timestamp: Date.now()
  };
}

function calculateWMAIndicator(
  id: string, 
  ohlcv: OhlcvData[], 
  parameters: Record<string, number | string>
): IndicatorResult {
  const period = Number(parameters.period) || 20;
  const source = String(parameters.source) || 'close';
  const values = IndicatorCalculator.calculateWMA(ohlcv, period, source);
  
  return {
    id,
    type: 'wma',
    lines: ['value'],
    data: ohlcv.map((candle, i) => ({
      time: candle.time,
      values: { value: values[i] }
    })),
    timestamp: Date.now()
  };
}

function calculateBollingerIndicator(
  id: string, 
  ohlcv: OhlcvData[], 
  parameters: Record<string, number | string>
): IndicatorResult {
  const period = Number(parameters.period) || 20;
  const stdDev = Number(parameters.stdDev) || 2;
  const source = String(parameters.source) || 'close';
  const { upper, middle, lower } = IndicatorCalculator.calculateBollinger(ohlcv, period, stdDev, source);
  
  return {
    id,
    type: 'bollinger',
    lines: ['upper', 'middle', 'lower'],
    data: ohlcv.map((candle, i) => ({
      time: candle.time,
      values: { 
        upper: upper[i], 
        middle: middle[i], 
        lower: lower[i] 
      }
    })),
    timestamp: Date.now()
  };
}

function calculateRSIIndicator(
  id: string, 
  ohlcv: OhlcvData[], 
  parameters: Record<string, number | string>
): IndicatorResult {
  const period = Number(parameters.period) || 14;
  const source = String(parameters.source) || 'close';
  const values = IndicatorCalculator.calculateRSI(ohlcv, period, source);
  
  return {
    id,
    type: 'rsi',
    lines: ['value'],
    data: ohlcv.map((candle, i) => ({
      time: candle.time,
      values: { value: values[i] }
    })),
    timestamp: Date.now()
  };
}

function calculateMACDIndicator(
  id: string, 
  ohlcv: OhlcvData[], 
  parameters: Record<string, number | string>
): IndicatorResult {
  const fast = Number(parameters.fast) || 12;
  const slow = Number(parameters.slow) || 26;
  const signal = Number(parameters.signal) || 9;
  const source = String(parameters.source) || 'close';
  const { macd, signal: signalLine, histogram } = IndicatorCalculator.calculateMACD(ohlcv, fast, slow, signal, source);
  
  return {
    id,
    type: 'macd',
    lines: ['macd', 'signal', 'histogram'],
    data: ohlcv.map((candle, i) => ({
      time: candle.time,
      values: { 
        macd: macd[i], 
        signal: signalLine[i], 
        histogram: histogram[i] 
      }
    })),
    timestamp: Date.now()
  };
}

function calculateATRIndicator(
  id: string, 
  ohlcv: OhlcvData[], 
  parameters: Record<string, number | string>
): IndicatorResult {
  const period = Number(parameters.period) || 14;
  const values = IndicatorCalculator.calculateATR(ohlcv, period);
  
  return {
    id,
    type: 'atr',
    lines: ['value'],
    data: ohlcv.map((candle, i) => ({
      time: candle.time,
      values: { value: values[i] }
    })),
    timestamp: Date.now()
  };
}

function calculateVWAPIndicator(
  id: string, 
  ohlcv: OhlcvData[]
): IndicatorResult {
  const values = IndicatorCalculator.calculateVWAP(ohlcv);
  
  return {
    id,
    type: 'vwap',
    lines: ['value'],
    data: ohlcv.map((candle, i) => ({
      time: candle.time,
      values: { value: values[i] }
    })),
    timestamp: Date.now()
  };
}
