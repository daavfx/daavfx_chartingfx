/**
 * IndicatorOverlay Component
 * Renders technical indicators on the chart using Lightweight Charts
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { 
  ISeriesApi, 
  LineStyle, 
  LineType,
  IChartApi,
  HistogramSeriesOptions,
  LineSeriesOptions,
  BaselineSeriesOptions
} from 'lightweight-charts';
import type { 
  IndicatorConfig, 
  IndicatorResult, 
  IndicatorType 
} from '../types/indicators';

interface IndicatorOverlayProps {
  chart: IChartApi | null;
  indicators: IndicatorConfig[];
  results: Map<string, IndicatorResult>;
  onIndicatorClick?: (id: string) => void;
}

// Map indicator types to chart pane configurations
const INDICATOR_PANES: Record<IndicatorType, { 
  pane: 'main' | 'separate'; 
  height?: number;
  position?: 'overlay' | 'below' | 'above';
}> = {
  sma: { pane: 'main', position: 'overlay' },
  ema: { pane: 'main', position: 'overlay' },
  wma: { pane: 'main', position: 'overlay' },
  bollinger: { pane: 'main', position: 'overlay' },
  rsi: { pane: 'separate', height: 30 },
  macd: { pane: 'separate', height: 30 },
  atr: { pane: 'separate', height: 25 },
  vwap: { pane: 'main', position: 'overlay' }
};

// Line style mapping
const LINE_STYLE_MAP: Record<string, LineStyle> = {
  solid: LineStyle.Solid,
  dashed: LineStyle.Dashed,
  dotted: LineStyle.Dotted
};

export const IndicatorOverlay: React.FC<IndicatorOverlayProps> = ({
  chart,
  indicators,
  results,
  onIndicatorClick
}) => {
  const seriesRefs = useRef<Map<string, ISeriesApi<'Line' | 'Histogram' | 'Baseline'>[]>>(new Map());
  const paneRefs = useRef<Map<string, number>>(new Map());

  // Cleanup function to remove all indicator series
  const cleanupIndicators = useCallback(() => {
    seriesRefs.current.forEach((seriesArray) => {
      seriesArray.forEach(series => {
        try {
          chart?.removeSeries(series);
        } catch (e) {
          // Series might already be removed
        }
      });
    });
    seriesRefs.current.clear();
    paneRefs.current.clear();
  }, [chart]);

  // Create or get pane for indicator
  const getPaneIndex = useCallback((indicator: IndicatorConfig): number => {
    const config = INDICATOR_PANES[indicator.type];
    
    if (config.pane === 'main') {
      return 0; // Main price pane
    }

    // For separate panes, check if we already have one for this indicator type
    const existingPane = paneRefs.current.get(indicator.type);
    if (existingPane !== undefined) {
      return existingPane;
    }

    // Create new pane
    const newPaneIndex = chart?.addPane(config.height || 30) ?? 1;
    paneRefs.current.set(indicator.type, newPaneIndex);
    return newPaneIndex;
  }, [chart]);

  // Create series for an indicator
  const createSeries = useCallback((
    indicator: IndicatorConfig, 
    paneIndex: number
  ): ISeriesApi<'Line' | 'Histogram' | 'Baseline'>[] => {
    if (!chart) return [];

    const result = results.get(indicator.id);
    if (!result) return [];

    const seriesArray: ISeriesApi<'Line' | 'Histogram' | 'Baseline'>[] = [];
    const style = indicator.style;

    // Special handling for MACD histogram
    if (indicator.type === 'macd') {
      // MACD line
      const macdSeries = chart.addLineSeries({
        pane: paneIndex,
        color: style.color || '#00BCD4',
        lineWidth: style.lineWidth || 2,
        lineStyle: LINE_STYLE_MAP[style.lineStyle || 'solid'],
        title: `${indicator.name} MACD`
      });
      seriesArray.push(macdSeries);

      // Signal line
      const signalSeries = chart.addLineSeries({
        pane: paneIndex,
        color: '#FF9800',
        lineWidth: 1,
        lineStyle: LineStyle.Solid,
        title: 'Signal'
      });
      seriesArray.push(signalSeries);

      // Histogram
      const histSeries = chart.addHistogramSeries({
        pane: paneIndex,
        color: '#26a69a',
        priceFormat: { type: 'volume' },
        priceLineVisible: false
      });
      seriesArray.push(histSeries);

      return seriesArray;
    }

    // Special handling for Bollinger Bands
    if (indicator.type === 'bollinger') {
      // Upper band
      const upperSeries = chart.addLineSeries({
        pane: paneIndex,
        color: style.color || '#E91E63',
        lineWidth: 1,
        lineStyle: LINE_STYLE_MAP[style.lineStyle || 'solid'],
        title: `${indicator.name} Upper`
      });
      seriesArray.push(upperSeries);

      // Middle band (SMA)
      const middleSeries = chart.addLineSeries({
        pane: paneIndex,
        color: style.color || '#E91E63',
        lineWidth: style.lineWidth || 2,
        lineStyle: LineStyle.Solid,
        title: `${indicator.name} Middle`
      });
      seriesArray.push(middleSeries);

      // Lower band
      const lowerSeries = chart.addLineSeries({
        pane: paneIndex,
        color: style.color || '#E91E63',
        lineWidth: 1,
        lineStyle: LINE_STYLE_MAP[style.lineStyle || 'solid'],
        title: `${indicator.name} Lower`
      });
      seriesArray.push(lowerSeries);

      return seriesArray;
    }

    // Standard single-line indicators
    const series = chart.addLineSeries({
      pane: paneIndex,
      color: style.color || '#2196F3',
      lineWidth: style.lineWidth || 2,
      lineStyle: LINE_STYLE_MAP[style.lineStyle || 'solid'],
      title: indicator.name,
      priceLineVisible: false
    });
    seriesArray.push(series);

    return seriesArray;
  }, [chart, results]);

  // Update indicator data
  const updateIndicatorData = useCallback((
    indicator: IndicatorConfig,
    seriesArray: ISeriesApi<'Line' | 'Histogram' | 'Baseline'>[]
  ) => {
    const result = results.get(indicator.id);
    if (!result || seriesArray.length === 0) return;

    if (indicator.type === 'macd' && seriesArray.length === 3) {
      // MACD: [macdLine, signalLine, histogram]
      const macdData = result.data
        .filter(d => d.values.macd !== null)
        .map(d => ({ time: d.time as any, value: d.values.macd as number }));
      seriesArray[0].setData(macdData);

      const signalData = result.data
        .filter(d => d.values.signal !== null)
        .map(d => ({ time: d.time as any, value: d.values.signal as number }));
      seriesArray[1].setData(signalData);

      const histData = result.data
        .filter(d => d.values.histogram !== null)
        .map(d => ({ 
          time: d.time as any, 
          value: d.values.histogram as number,
          color: (d.values.histogram as number) >= 0 ? '#26a69a' : '#ef5350'
        }));
      seriesArray[2].setData(histData);
    } else if (indicator.type === 'bollinger' && seriesArray.length === 3) {
      // Bollinger: [upper, middle, lower]
      const upperData = result.data
        .filter(d => d.values.upper !== null)
        .map(d => ({ time: d.time as any, value: d.values.upper as number }));
      seriesArray[0].setData(upperData);

      const middleData = result.data
        .filter(d => d.values.middle !== null)
        .map(d => ({ time: d.time as any, value: d.values.middle as number }));
      seriesArray[1].setData(middleData);

      const lowerData = result.data
        .filter(d => d.values.lower !== null)
        .map(d => ({ time: d.time as any, value: d.values.lower as number }));
      seriesArray[2].setData(lowerData);
    } else if (seriesArray.length > 0) {
      // Standard single value indicators
      const lineName = result.lines[0];
      const data = result.data
        .filter(d => d.values[lineName] !== null)
        .map(d => ({ time: d.time as any, value: d.values[lineName] as number }));
      seriesArray[0].setData(data);
    }
  }, [results]);

  // Main effect to render indicators
  useEffect(() => {
    if (!chart) return;

    // Cleanup existing indicators
    cleanupIndicators();

    // Render visible indicators
    indicators
      .filter(ind => ind.visible && results.has(ind.id))
      .forEach(indicator => {
        const paneIndex = getPaneIndex(indicator);
        const seriesArray = createSeries(indicator, paneIndex);
        
        if (seriesArray.length > 0) {
          seriesRefs.current.set(indicator.id, seriesArray);
          updateIndicatorData(indicator, seriesArray);

          // Add click handlers
          seriesArray.forEach(series => {
            series.applyOptions({
              lastValueVisible: true,
              priceLineVisible: false
            });
          });
        }
      });

    return () => {
      cleanupIndicators();
    };
  }, [chart, indicators, results, cleanupIndicators, getPaneIndex, createSeries, updateIndicatorData]);

  // Update data when results change
  useEffect(() => {
    if (!chart) return;

    indicators
      .filter(ind => ind.visible && results.has(ind.id))
      .forEach(indicator => {
        const seriesArray = seriesRefs.current.get(indicator.id);
        if (seriesArray) {
          updateIndicatorData(indicator, seriesArray);
        }
      });
  }, [results, indicators, chart, updateIndicatorData]);

  return null; // This component doesn't render any DOM elements
};

export default IndicatorOverlay;
