// Higher-timeframe bias from measurable market structure: swing
// highs/lows, HH/HL vs LH/LL sequencing, and price location — never
// a single indicator.

import type { Bias, Candle } from "@/types";

function swingPoints(candles: Candle[], lookback = 2) {
  const highs: number[] = [];
  const lows: number[] = [];
  for (let i = lookback; i < candles.length - lookback; i++) {
    const window = candles.slice(i - lookback, i + lookback + 1);
    if (window.every((c) => c.high <= candles[i].high)) highs.push(candles[i].high);
    if (window.every((c) => c.low >= candles[i].low)) lows.push(candles[i].low);
  }
  return { highs, lows };
}

export function determineHtfBias(candles: Candle[]): Bias {
  if (candles.length < 20) return "NEUTRAL";

  const { highs, lows } = swingPoints(candles);
  if (highs.length < 2 || lows.length < 2) return "NEUTRAL";

  const higherHighs = highs[highs.length - 1] > highs[highs.length - 2];
  const higherLows = lows[lows.length - 1] > lows[lows.length - 2];
  const lowerHighs = highs[highs.length - 1] < highs[highs.length - 2];
  const lowerLows = lows[lows.length - 1] < lows[lows.length - 2];

  const closes = candles.slice(-20).map((c) => c.close);
  const rangeHigh = Math.max(...closes);
  const rangeLow = Math.min(...closes);
  const location = rangeHigh === rangeLow ? 0.5 : (closes[closes.length - 1] - rangeLow) / (rangeHigh - rangeLow);

  if (higherHighs && higherLows) return location > 0.6 ? "STRONG_BULLISH" : "BULLISH";
  if (lowerHighs && lowerLows) return location < 0.4 ? "STRONG_BEARISH" : "BEARISH";
  return "NEUTRAL";
}
