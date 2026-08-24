// ATR + ATR percentile + volatility classification. Pure math over
// real candle data — no fabricated numbers.

import type { Candle, VolatilityLevel } from "@/types";

export function trueRange(curr: Candle, prev: Candle): number {
  return Math.max(
    curr.high - curr.low,
    Math.abs(curr.high - prev.close),
    Math.abs(curr.low - prev.close)
  );
}

/** Simple-average ATR over `period` candles (Wilder smoothing is fine to swap in later). */
export function calculateATR(candles: Candle[], period = 14): number {
  if (candles.length < period + 1) return 0;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    trs.push(trueRange(candles[i], candles[i - 1]));
  }
  const recent = trs.slice(-period);
  return recent.reduce((a, b) => a + b, 0) / recent.length;
}

/** Percentile rank (0-100) of the current ATR against its own history. */
export function atrPercentile(candles: Candle[], period = 14, lookback = 100): number {
  if (candles.length < period + 2) return 50;
  const atrSeries: number[] = [];
  for (let i = period + 1; i < candles.length; i++) {
    atrSeries.push(calculateATR(candles.slice(0, i + 1), period));
  }
  const window = atrSeries.slice(-lookback);
  const current = window[window.length - 1];
  if (window.length === 0) return 50;
  const below = window.filter((v) => v <= current).length;
  return Math.round((below / window.length) * 100);
}

export function classifyVolatility(percentile: number): VolatilityLevel {
  if (percentile >= 95) return "EXTREME";
  if (percentile >= 75) return "HIGH";
  if (percentile >= 30) return "NORMAL";
  if (percentile >= 10) return "LOW";
  return "VERY_LOW";
}
