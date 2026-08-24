// Structure confirmation — after a sweep, requires a micro-structure
// break / reclaim / directional displacement before the setup is
// considered confirmed. Core BOP condition (never skipped).

import type { Candle, Direction } from "@/types";

export interface StructureConfirmation {
  confirmed: boolean;
  brokeMicroStructure: boolean;
  displaced: boolean;
  reason: string;
}

export function checkStructureConfirmation(candles: Candle[], direction: Direction): StructureConfirmation {
  if (candles.length < 6) {
    return { confirmed: false, brokeMicroStructure: false, displaced: false, reason: "Insufficient candles for structure check" };
  }

  const recent = candles.slice(-6);
  const priorSwing =
    direction === "BUY"
      ? Math.max(...recent.slice(0, 4).map((c) => c.high))
      : Math.min(...recent.slice(0, 4).map((c) => c.low));

  const last = recent[recent.length - 1];
  const brokeMicroStructure = direction === "BUY" ? last.close > priorSwing : last.close < priorSwing;

  const body = Math.abs(last.close - last.open);
  const range = last.high - last.low;
  const displaced = range > 0 && body / range > 0.55;

  const confirmed = brokeMicroStructure && displaced;

  return {
    confirmed,
    brokeMicroStructure,
    displaced,
    reason: confirmed
      ? "Micro-structure break with directional displacement"
      : !brokeMicroStructure
        ? "No micro-structure break yet"
        : "Structure broke but without strong directional displacement"
  };
}
