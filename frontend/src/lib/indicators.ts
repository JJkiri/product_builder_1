import { Candle } from './api';

// ===== Moving Average =====
export function calcMA(candles: Candle[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += candles[j].close;
    }
    result.push(sum / period);
  }
  return result;
}

// ===== Bollinger Bands =====
export interface BollingerBand {
  upper: number | null;
  middle: number | null;
  lower: number | null;
}

export function calcBollingerBands(candles: Candle[], period = 20, mult = 2): BollingerBand[] {
  const ma = calcMA(candles, period);
  const result: BollingerBand[] = [];

  for (let i = 0; i < candles.length; i++) {
    if (ma[i] === null) {
      result.push({ upper: null, middle: null, lower: null });
      continue;
    }
    let variance = 0;
    for (let j = i - period + 1; j <= i; j++) {
      variance += Math.pow(candles[j].close - ma[i]!, 2);
    }
    const std = Math.sqrt(variance / period);
    result.push({
      upper: ma[i]! + mult * std,
      middle: ma[i],
      lower: ma[i]! - mult * std,
    });
  }
  return result;
}

// ===== RSI =====
export function calcRSI(candles: Candle[], period = 14): (number | null)[] {
  const result: (number | null)[] = [];
  if (candles.length < period + 1) {
    return candles.map(() => null);
  }

  // Calculate initial average gain/loss
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const change = candles[i].close - candles[i - 1].close;
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }
  avgGain /= period;
  avgLoss /= period;

  // Fill nulls for initial period
  for (let i = 0; i < period; i++) {
    result.push(null);
  }

  // First RSI
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result.push(100 - 100 / (1 + rs));

  // Subsequent RSI using smoothed averages
  for (let i = period + 1; i < candles.length; i++) {
    const change = candles[i].close - candles[i - 1].close;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    const rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    result.push(rsi);
  }

  return result;
}

// ===== MACD =====
export interface MACDResult {
  macd: number | null;
  signal: number | null;
  histogram: number | null;
}

function calcEMA(values: number[], period: number): number[] {
  const ema: number[] = [];
  const k = 2 / (period + 1);
  ema[0] = values[0];
  for (let i = 1; i < values.length; i++) {
    ema[i] = values[i] * k + ema[i - 1] * (1 - k);
  }
  return ema;
}

export function calcMACD(
  candles: Candle[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
): MACDResult[] {
  if (candles.length < slowPeriod) {
    return candles.map(() => ({ macd: null, signal: null, histogram: null }));
  }

  const closes = candles.map((c) => c.close);
  const emaFast = calcEMA(closes, fastPeriod);
  const emaSlow = calcEMA(closes, slowPeriod);

  const macdLine = emaFast.map((v, i) => v - emaSlow[i]);
  const signalLine = calcEMA(macdLine, signalPeriod);

  return macdLine.map((m, i) => {
    if (i < slowPeriod - 1) {
      return { macd: null, signal: null, histogram: null };
    }
    const signal = i < slowPeriod + signalPeriod - 2 ? null : signalLine[i];
    return {
      macd: m,
      signal,
      histogram: signal !== null ? m - signal : null,
    };
  });
}
