// Momentum Ratio = Absolute Price Movement / ATR, plus consecutive
// directional candle count and displacement speed off the sweep.

import type { Candle, Direction, MomentumResult } from "@/types";
import { calculateATR } from "./volatility";

export function calculateMomentum(candles: Candle[], direction: Direction, lookback = 5): MomentumResult {
  const atr = calculateATR(candles);
  const recent = candles.slice(-lookback);
  if (recent.length < 2 || atr === 0) {
    return { priceMovement: 0, atr, momentumRatio: 0, consecutiveDirectionalCandles: 0 };
  }

  const priceMovement =
    direction === "BUY"
      ? recent[recent.length - 1].close - recent[0].open
      : recent[0].open - recent[recent.length - 1].close;

  const momentumRatio = Math.max(0, priceMovement) / atr;

  let consecutive = 0;
  for (let i = candles.length - 1; i > 0; i--) {
    const bullish = candles[i].close > candles[i].open;
    if ((direction === "BUY" && bullish) || (direction === "SELL" && !bullish)) {
      consecutive++;
    } else break;
  }

  return { priceMovement: Math.max(0, priceMovement), atr, momentumRatio, consecutiveDirectionalCandles: consecutive };
}
