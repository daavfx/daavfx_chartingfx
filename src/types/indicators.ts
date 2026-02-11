/**
 * Indicator Types and Interfaces
 * Shared types for the indicator system
 */

export type IndicatorType = 
  | 'sma' 
  | 'ema' 
  | 'wma' 
  | 'bollinger' 
  | 'rsi' 
  | 'macd' 
  | 'atr' 
  | 'vwap';

export interface IndicatorConfig {
  id: string;
  type: IndicatorType;
  name: string;
  visible: boolean;
  parameters: Record<string, number | string>;
  style: IndicatorStyle;
}

export interface IndicatorStyle {
  color?: string;
  lineWidth?: number;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  opacity?: number;
  fillColor?: string;
  fillOpacity?: number;
}

export interface IndicatorResult {
  id: string;
  type: IndicatorType;
  data: IndicatorDataPoint[];
  lines: string[]; // Names of lines (e.g., ['upper', 'middle', 'lower'] for Bollinger)
  timestamp: number;
}

export interface IndicatorDataPoint {
  time: number;
  values: Record<string, number | null>;
}

export interface WorkerMessage {
  type: 'calculate' | 'cancel' | 'result' | 'error' | 'progress';
  payload: unknown;
}

export interface CalculateMessage {
  type: 'calculate';
  payload: {
    id: string;
    indicatorType: IndicatorType;
    ohlcv: OhlcvData[];
    parameters: Record<string, number | string>;
  };
}

export interface OhlcvData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

// Indicator parameter definitions for UI
export interface IndicatorParameterDef {
  name: string;
  type: 'number' | 'string' | 'boolean' | 'select';
  default: number | string | boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: string[]; // For select type
  description: string;
}

export interface IndicatorDefinition {
  type: IndicatorType;
  name: string;
  description: string;
  category: 'trend' | 'momentum' | 'volatility' | 'volume';
  parameters: Record<string, IndicatorParameterDef>;
  defaultStyle: IndicatorStyle;
  lines: string[];
}

// Indicator definitions for the UI
export const INDICATOR_DEFINITIONS: Record<IndicatorType, IndicatorDefinition> = {
  sma: {
    type: 'sma',
    name: 'Simple Moving Average',
    description: 'Arithmetic mean of prices over a period',
    category: 'trend',
    parameters: {
      period: {
        name: 'Period',
        type: 'number',
        default: 20,
        min: 1,
        max: 500,
        step: 1,
        description: 'Number of periods to calculate'
      },
      source: {
        name: 'Source',
        type: 'select',
        default: 'close',
        options: ['open', 'high', 'low', 'close', 'hl2', 'hlc3', 'ohlc4'],
        description: 'Price source for calculation'
      }
    },
    defaultStyle: {
      color: '#2196F3',
      lineWidth: 2,
      lineStyle: 'solid'
    },
    lines: ['value']
  },
  
  ema: {
    type: 'ema',
    name: 'Exponential Moving Average',
    description: 'Weighted moving average giving more importance to recent prices',
    category: 'trend',
    parameters: {
      period: {
        name: 'Period',
        type: 'number',
        default: 20,
        min: 1,
        max: 500,
        step: 1,
        description: 'Number of periods to calculate'
      },
      source: {
        name: 'Source',
        type: 'select',
        default: 'close',
        options: ['open', 'high', 'low', 'close', 'hl2', 'hlc3', 'ohlc4'],
        description: 'Price source for calculation'
      }
    },
    defaultStyle: {
      color: '#FF9800',
      lineWidth: 2,
      lineStyle: 'solid'
    },
    lines: ['value']
  },
  
  wma: {
    type: 'wma',
    name: 'Weighted Moving Average',
    description: 'Linearly weighted moving average',
    category: 'trend',
    parameters: {
      period: {
        name: 'Period',
        type: 'number',
        default: 20,
        min: 1,
        max: 500,
        step: 1,
        description: 'Number of periods to calculate'
      },
      source: {
        name: 'Source',
        type: 'select',
        default: 'close',
        options: ['open', 'high', 'low', 'close', 'hl2', 'hlc3', 'ohlc4'],
        description: 'Price source for calculation'
      }
    },
    defaultStyle: {
      color: '#9C27B0',
      lineWidth: 2,
      lineStyle: 'solid'
    },
    lines: ['value']
  },
  
  bollinger: {
    type: 'bollinger',
    name: 'Bollinger Bands',
    description: 'Volatility bands placed above and below a moving average',
    category: 'volatility',
    parameters: {
      period: {
        name: 'Period',
        type: 'number',
        default: 20,
        min: 1,
        max: 500,
        step: 1,
        description: 'Moving average period'
      },
      stdDev: {
        name: 'Standard Deviation',
        type: 'number',
        default: 2,
        min: 0.1,
        max: 5,
        step: 0.1,
        description: 'Number of standard deviations'
      },
      source: {
        name: 'Source',
        type: 'select',
        default: 'close',
        options: ['open', 'high', 'low', 'close', 'hl2', 'hlc3', 'ohlc4'],
        description: 'Price source for calculation'
      }
    },
    defaultStyle: {
      color: '#E91E63',
      lineWidth: 1,
      lineStyle: 'solid',
      fillColor: '#E91E63',
      fillOpacity: 0.1
    },
    lines: ['upper', 'middle', 'lower']
  },
  
  rsi: {
    type: 'rsi',
    name: 'Relative Strength Index',
    description: 'Momentum oscillator measuring speed and change of price movements',
    category: 'momentum',
    parameters: {
      period: {
        name: 'Period',
        type: 'number',
        default: 14,
        min: 1,
        max: 100,
        step: 1,
        description: 'RSI calculation period'
      },
      source: {
        name: 'Source',
        type: 'select',
        default: 'close',
        options: ['open', 'high', 'low', 'close'],
        description: 'Price source for calculation'
      }
    },
    defaultStyle: {
      color: '#4CAF50',
      lineWidth: 2,
      lineStyle: 'solid'
    },
    lines: ['value']
  },
  
  macd: {
    type: 'macd',
    name: 'MACD',
    description: 'Moving Average Convergence Divergence',
    category: 'momentum',
    parameters: {
      fast: {
        name: 'Fast Period',
        type: 'number',
        default: 12,
        min: 1,
        max: 100,
        step: 1,
        description: 'Fast EMA period'
      },
      slow: {
        name: 'Slow Period',
        type: 'number',
        default: 26,
        min: 1,
        max: 200,
        step: 1,
        description: 'Slow EMA period'
      },
      signal: {
        name: 'Signal Period',
        type: 'number',
        default: 9,
        min: 1,
        max: 100,
        step: 1,
        description: 'Signal line period'
      },
      source: {
        name: 'Source',
        type: 'select',
        default: 'close',
        options: ['open', 'high', 'low', 'close'],
        description: 'Price source for calculation'
      }
    },
    defaultStyle: {
      color: '#00BCD4',
      lineWidth: 2,
      lineStyle: 'solid'
    },
    lines: ['macd', 'signal', 'histogram']
  },
  
  atr: {
    type: 'atr',
    name: 'Average True Range',
    description: 'Volatility indicator based on true ranges',
    category: 'volatility',
    parameters: {
      period: {
        name: 'Period',
        type: 'number',
        default: 14,
        min: 1,
        max: 100,
        step: 1,
        description: 'ATR calculation period'
      }
    },
    defaultStyle: {
      color: '#FF5722',
      lineWidth: 2,
      lineStyle: 'solid'
    },
    lines: ['value']
  },
  
  vwap: {
    type: 'vwap',
    name: 'VWAP',
    description: 'Volume Weighted Average Price',
    category: 'volume',
    parameters: {},
    defaultStyle: {
      color: '#607D8B',
      lineWidth: 2,
      lineStyle: 'solid'
    },
    lines: ['value']
  }
};

// Helper to create default indicator config
export function createIndicatorConfig(type: IndicatorType): IndicatorConfig {
  const def = INDICATOR_DEFINITIONS[type];
  const params: Record<string, number | string> = {};
  
  Object.entries(def.parameters).forEach(([key, paramDef]) => {
    params[key] = paramDef.default;
  });
  
  return {
    id: `${type}_${Date.now()}`,
    type,
    name: def.name,
    visible: true,
    parameters: params,
    style: { ...def.defaultStyle }
  };
}
