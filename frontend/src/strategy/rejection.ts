// Rejection Ratio = Wick Length / Total Candle Range. One scoring
// input among several — never the sole entry condition.

import type { Candle, Direction, RejectionResult } from "@/types";

export function calculateRejection(candle: Candle, direction: Direction): RejectionResult {
  const candleRange = candle.high - candle.low;
  if (candleRange === 0) return { wickLength: 0, candleRange: 0, rejectionRatio: 0 };

  // For a BUY signal we care about the lower wick (rejection of a sell-side sweep);
  // for a SELL signal, the upper wick (rejection of a buy-side sweep).
  const bodyTop = Math.max(candle.open, candle.close);
  const bodyBottom = Math.min(candle.open, candle.close);

  const wickLength = direction === "BUY" ? bodyBottom - candle.low : candle.high - bodyTop;

  const rejectionRatio = Math.max(0, wickLength) / candleRange;
  return { wickLength: Math.max(0, wickLength), candleRange, rejectionRatio };
}
