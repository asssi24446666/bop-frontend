// Market regime classification from measurable structure + volatility,
// never a single indicator alone.

import type { Candle, MarketRegime } from "@/types";
import { atrPercentile } from "./volatility";

function linearRegressionSlopeR2(values: number[]): { slope: number; r2: number } {
  const n = values.length;
  if (n < 3) return { slope: 0, r2: 0 };
  const xs = values.map((_, i) => i);
  const xMean = xs.reduce((a, b) => a + b, 0) / n;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - xMean) * (values[i] - yMean);
    den += (xs[i] - xMean) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const predicted = xs.map((x) => yMean + slope * (x - xMean));
  const ssRes = values.reduce((sum, v, i) => sum + (v - predicted[i]) ** 2, 0);
  const ssTot = values.reduce((sum, v) => sum + (v - yMean) ** 2, 0);
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  return { slope, r2 };
}

export function classifyRegime(candles: Candle[]): MarketRegime {
  if (candles.length < 20) return "UNCLEAR";

  const closes = candles.slice(-30).map((c) => c.close);
  const { r2 } = linearRegressionSlopeR2(closes);
  const volPercentile = atrPercentile(candles);

  if (volPercentile >= 90) return "HIGH_VOLATILITY";
  if (volPercentile <= 10) return "LOW_VOLATILITY";
  if (r2 >= 0.55) return "TRENDING";
  if (r2 <= 0.2) return "RANGING";
  return "UNCLEAR";
}
