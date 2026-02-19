'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
  type LineData,
  type Time,
} from 'lightweight-charts';
import { getChartData, Candle } from '@/lib/api';
import { calcMA, calcBollingerBands, calcRSI, calcMACD } from '@/lib/indicators';

interface StockChartProps {
  code: string;
}

type Period = 'day' | 'week' | 'month';
type Indicator = 'ma5' | 'ma20' | 'ma60' | 'ma120' | 'bb' | 'rsi' | 'macd';

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'day', label: '일봉' },
  { value: 'week', label: '주봉' },
  { value: 'month', label: '월봉' },
];

const INDICATOR_OPTIONS: { value: Indicator; label: string; group: string }[] = [
  { value: 'ma5', label: 'MA5', group: '이동평균' },
  { value: 'ma20', label: 'MA20', group: '이동평균' },
  { value: 'ma60', label: 'MA60', group: '이동평균' },
  { value: 'ma120', label: 'MA120', group: '이동평균' },
  { value: 'bb', label: '볼린저밴드', group: '밴드' },
  { value: 'rsi', label: 'RSI', group: '오실레이터' },
  { value: 'macd', label: 'MACD', group: '오실레이터' },
];

const MA_COLORS: Record<string, string> = {
  ma5: '#f59e0b',
  ma20: '#ef4444',
  ma60: '#22c55e',
  ma120: '#8b5cf6',
};

function toTime(dateStr: string): Time {
  return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}` as Time;
}

export default function StockChart({ code }: StockChartProps) {
  const mainChartRef = useRef<HTMLDivElement>(null);
  const rsiChartRef = useRef<HTMLDivElement>(null);
  const macdChartRef = useRef<HTMLDivElement>(null);

  const mainApiRef = useRef<IChartApi | null>(null);
  const rsiApiRef = useRef<IChartApi | null>(null);
  const macdApiRef = useRef<IChartApi | null>(null);

  const [period, setPeriod] = useState<Period>('day');
  const [indicators, setIndicators] = useState<Set<Indicator>>(new Set<Indicator>(['ma20']));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);

  const toggleIndicator = (ind: Indicator) => {
    setIndicators((prev) => {
      const next = new Set(prev);
      if (next.has(ind)) next.delete(ind);
      else next.add(ind);
      return next;
    });
  };

  // Fetch data
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getChartData(code, period, period === 'day' ? 250 : 150)
      .then((data) => {
        if (!cancelled) setCandles(data.candles);
      })
      .catch(() => {
        if (!cancelled) setError('차트 데이터를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [code, period]);

  // Render main chart
  useEffect(() => {
    if (!mainChartRef.current || candles.length === 0) return;

    const container = mainChartRef.current;
    container.innerHTML = '';

    const chart = createChart(container, {
      layout: { background: { color: '#fff' }, textColor: '#333' },
      grid: { vertLines: { color: '#f0f0f0' }, horzLines: { color: '#f0f0f0' } },
      crosshair: { mode: 0 },
      rightPriceScale: { borderColor: '#e0e0e0' },
      timeScale: { borderColor: '#e0e0e0', timeVisible: false },
      width: container.clientWidth,
      height: container.clientHeight,
    });
    mainApiRef.current = chart;

    // Candle
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#ef4444', downColor: '#3b82f6',
      borderUpColor: '#ef4444', borderDownColor: '#3b82f6',
      wickUpColor: '#ef4444', wickDownColor: '#3b82f6',
    });
    candleSeries.setData(candles.map((c) => ({
      time: toTime(c.date), open: c.open, high: c.high, low: c.low, close: c.close,
    } as CandlestickData<Time>)));

    // Volume
    const volSeries = chart.addSeries(HistogramSeries, {
      color: '#d1d5db', priceFormat: { type: 'volume' }, priceScaleId: 'vol',
    });
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
    volSeries.setData(candles.map((c) => ({
      time: toTime(c.date), value: c.volume,
      color: c.close >= c.open ? '#fca5a5' : '#93c5fd',
    } as HistogramData<Time>)));

    // Moving Averages
    (['ma5', 'ma20', 'ma60', 'ma120'] as const).forEach((key) => {
      if (!indicators.has(key)) return;
      const p = parseInt(key.replace('ma', ''));
      const maData = calcMA(candles, p);
      const series = chart.addSeries(LineSeries, {
        color: MA_COLORS[key], lineWidth: 1, priceScaleId: 'right',
      });
      const lineData: LineData<Time>[] = [];
      maData.forEach((v, i) => {
        if (v !== null) lineData.push({ time: toTime(candles[i].date), value: v });
      });
      series.setData(lineData);
    });

    // Bollinger Bands
    if (indicators.has('bb')) {
      const bb = calcBollingerBands(candles, 20, 2);
      const upperData: LineData<Time>[] = [];
      const middleData: LineData<Time>[] = [];
      const lowerData: LineData<Time>[] = [];
      bb.forEach((b, i) => {
        const t = toTime(candles[i].date);
        if (b.upper !== null) upperData.push({ time: t, value: b.upper });
        if (b.middle !== null) middleData.push({ time: t, value: b.middle });
        if (b.lower !== null) lowerData.push({ time: t, value: b.lower });
      });
      const bbUpper = chart.addSeries(LineSeries, { color: '#9ca3af', lineWidth: 1, lineStyle: 2, priceScaleId: 'right' });
      const bbMiddle = chart.addSeries(LineSeries, { color: '#6b7280', lineWidth: 1, priceScaleId: 'right' });
      const bbLower = chart.addSeries(LineSeries, { color: '#9ca3af', lineWidth: 1, lineStyle: 2, priceScaleId: 'right' });
      bbUpper.setData(upperData);
      bbMiddle.setData(middleData);
      bbLower.setData(lowerData);
    }

    chart.timeScale().fitContent();

    const handleResize = () => {
      chart.applyOptions({ width: container.clientWidth, height: container.clientHeight });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      mainApiRef.current = null;
    };
  }, [candles, indicators]);

  // RSI sub-chart
  useEffect(() => {
    if (!rsiChartRef.current || candles.length === 0 || !indicators.has('rsi')) return;

    const container = rsiChartRef.current;
    container.innerHTML = '';

    const chart = createChart(container, {
      layout: { background: { color: '#fff' }, textColor: '#999', fontSize: 10 },
      grid: { vertLines: { color: '#f5f5f5' }, horzLines: { color: '#f5f5f5' } },
      rightPriceScale: { borderColor: '#e0e0e0' },
      timeScale: { borderColor: '#e0e0e0', timeVisible: false, visible: false },
      width: container.clientWidth,
      height: container.clientHeight,
      crosshair: { mode: 0 },
    });
    rsiApiRef.current = chart;

    const rsiData = calcRSI(candles, 14);
    const series = chart.addSeries(LineSeries, { color: '#8b5cf6', lineWidth: 2 });
    const lineData: LineData<Time>[] = [];
    rsiData.forEach((v, i) => {
      if (v !== null) lineData.push({ time: toTime(candles[i].date), value: v });
    });
    series.setData(lineData);

    // Overbought/Oversold lines
    const ob = chart.addSeries(LineSeries, { color: '#ef4444', lineWidth: 1, lineStyle: 2 });
    const os = chart.addSeries(LineSeries, { color: '#3b82f6', lineWidth: 1, lineStyle: 2 });
    const times = candles.filter((_, i) => rsiData[i] !== null).map((c) => toTime(c.date));
    if (times.length >= 2) {
      ob.setData([{ time: times[0], value: 70 }, { time: times[times.length - 1], value: 70 }]);
      os.setData([{ time: times[0], value: 30 }, { time: times[times.length - 1], value: 30 }]);
    }

    chart.timeScale().fitContent();

    const handleResize = () => {
      chart.applyOptions({ width: container.clientWidth });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      rsiApiRef.current = null;
    };
  }, [candles, indicators]);

  // MACD sub-chart
  useEffect(() => {
    if (!macdChartRef.current || candles.length === 0 || !indicators.has('macd')) return;

    const container = macdChartRef.current;
    container.innerHTML = '';

    const chart = createChart(container, {
      layout: { background: { color: '#fff' }, textColor: '#999', fontSize: 10 },
      grid: { vertLines: { color: '#f5f5f5' }, horzLines: { color: '#f5f5f5' } },
      rightPriceScale: { borderColor: '#e0e0e0' },
      timeScale: { borderColor: '#e0e0e0', timeVisible: false, visible: false },
      width: container.clientWidth,
      height: container.clientHeight,
      crosshair: { mode: 0 },
    });
    macdApiRef.current = chart;

    const macdData = calcMACD(candles, 12, 26, 9);

    // MACD line
    const macdSeries = chart.addSeries(LineSeries, { color: '#3b82f6', lineWidth: 2 });
    const macdLine: LineData<Time>[] = [];
    macdData.forEach((d, i) => {
      if (d.macd !== null) macdLine.push({ time: toTime(candles[i].date), value: d.macd });
    });
    macdSeries.setData(macdLine);

    // Signal line
    const signalSeries = chart.addSeries(LineSeries, { color: '#ef4444', lineWidth: 1 });
    const signalLine: LineData<Time>[] = [];
    macdData.forEach((d, i) => {
      if (d.signal !== null) signalLine.push({ time: toTime(candles[i].date), value: d.signal });
    });
    signalSeries.setData(signalLine);

    // Histogram
    const histSeries = chart.addSeries(HistogramSeries, { priceScaleId: 'right' });
    const histData: HistogramData<Time>[] = [];
    macdData.forEach((d, i) => {
      if (d.histogram !== null) {
        histData.push({
          time: toTime(candles[i].date),
          value: d.histogram,
          color: d.histogram >= 0 ? '#fca5a5' : '#93c5fd',
        });
      }
    });
    histSeries.setData(histData);

    chart.timeScale().fitContent();

    const handleResize = () => {
      chart.applyOptions({ width: container.clientWidth });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      macdApiRef.current = null;
    };
  }, [candles, indicators]);

  // Sync time scales between main and sub-charts
  useEffect(() => {
    const main = mainApiRef.current;
    const rsi = rsiApiRef.current;
    const macd = macdApiRef.current;
    if (!main) return;

    let syncing = false;
    const handlers: Array<{ source: IChartApi; handler: (range: any) => void }> = [];

    const createSync = (source: IChartApi, targets: (IChartApi | null)[]) => {
      const handler = (range: any) => {
        if (!range || syncing) return;
        syncing = true;
        targets.forEach((t) => {
          if (t) t.timeScale().setVisibleLogicalRange(range);
        });
        syncing = false;
      };
      source.timeScale().subscribeVisibleLogicalRangeChange(handler);
      handlers.push({ source, handler });
    };

    createSync(main, [rsi, macd]);
    if (rsi) createSync(rsi, [main, macd]);
    if (macd) createSync(macd, [main, rsi]);

    return () => {
      handlers.forEach(({ source, handler }) => {
        try {
          source.timeScale().unsubscribeVisibleLogicalRangeChange(handler);
        } catch { /* chart might be removed */ }
      });
    };
  }, [candles, indicators]);

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b">
        {/* Period */}
        <div className="flex gap-1">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                period === opt.value
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-gray-200" />

        {/* Indicators */}
        <div className="flex flex-wrap gap-1">
          {INDICATOR_OPTIONS.map((opt) => {
            const active = indicators.has(opt.value);
            const dotColor = MA_COLORS[opt.value];
            return (
              <button
                key={opt.value}
                onClick={() => toggleIndicator(opt.value)}
                className={`px-2 py-1 text-xs rounded-md transition-colors flex items-center gap-1 ${
                  active
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {dotColor && (
                  <span
                    className="w-2 h-2 rounded-full inline-block"
                    style={{ backgroundColor: dotColor }}
                  />
                )}
                {opt.label}
              </button>
            );
          })}
        </div>

        {loading && (
          <div className="ml-auto w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {/* Main chart */}
      <div ref={mainChartRef} style={{ height: indicators.has('rsi') || indicators.has('macd') ? '380px' : '500px', position: 'relative' }}>
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
            <p className="text-gray-500 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* RSI sub-chart */}
      {indicators.has('rsi') && (
        <div className="border-t">
          <div className="px-4 py-1 text-xs text-gray-400 bg-gray-50">RSI (14)</div>
          <div ref={rsiChartRef} style={{ height: '100px' }} />
        </div>
      )}

      {/* MACD sub-chart */}
      {indicators.has('macd') && (
        <div className="border-t">
          <div className="px-4 py-1 text-xs text-gray-400 bg-gray-50">MACD (12, 26, 9)</div>
          <div ref={macdChartRef} style={{ height: '100px' }} />
        </div>
      )}
    </div>
  );
}
