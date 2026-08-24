// ==========================================================
// LIQUIDITY SWEEP ENGINE
// Distinguishes a genuine liquidity sweep (approach -> trade beyond ->
// reject/reclaim) from a normal breakout (approach -> trade beyond ->
// continuation, no reclaim). Sweep Ratio = Sweep Distance / ATR.
// ==========================================================

import type { Candle, LiquidityZone, SweepResult } from "@/types";
import { calculateATR } from "./volatility";

const MIN_SWEEP_RATIO = 0.15; // sweep must clear the level by a meaningful fraction of ATR
const MAX_SWEEP_RATIO = 3.0; // beyond this it's a clean breakout, not a sweep

export function detectSweep(candles: Candle[], zone: LiquidityZone): SweepResult {
  if (candles.length < 15) {
    return { isSweep: false, zone: null, sweepDistance: 0, atr: 0, sweepRatio: 0, reason: "Insufficient candle history" };
  }

  const atr = calculateATR(candles);
  if (atr === 0) {
    return { isSweep: false, zone: null, sweepDistance: 0, atr: 0, sweepRatio: 0, reason: "ATR unavailable" };
  }

  const last = candles[candles.length - 1];
  const prior = candles.slice(0, -1);

  const traded_beyond =
    zone.side === "BUY_SIDE" ? last.high > zone.price : last.low < zone.price;

  if (!traded_beyond) {
    return { isSweep: false, zone, sweepDistance: 0, atr, sweepRatio: 0, reason: "Price has not traded through the level" };
  }

  const sweepDistance =
    zone.side === "BUY_SIDE" ? last.high - zone.price : zone.price - last.low;
  const sweepRatio = sweepDistance / atr;

  // Reclaim: the candle closes back on the origin side of the level.
  const reclaimed =
    zone.side === "BUY_SIDE" ? last.close < zone.price : last.close > zone.price;

  // Was the level "meaningful" (already approached, not just touched once far in the past)?
  const wasApproached = prior.slice(-10).some((c) =>
    zone.side === "BUY_SIDE" ? c.high > zone.price * 0.997 : c.low < zone.price * 1.003
  );

  if (sweepRatio > MAX_SWEEP_RATIO) {
    return {
      isSweep: false, zone, sweepDistance, atr, sweepRatio,
      reason: `Move exceeds normal sweep range (${sweepRatio.toFixed(2)}x ATR) — treated as a breakout, not a sweep`
    };
  }

  if (!reclaimed) {
    return {
      isSweep: false, zone, sweepDistance, atr, sweepRatio,
      reason: "No reclaim/rejection after trading through the level — looks like a breakout continuation"
    };
  }

  if (sweepRatio < MIN_SWEEP_RATIO) {
    return {
      isSweep: false, zone, sweepDistance, atr, sweepRatio,
      reason: `Sweep distance too small relative to ATR (${sweepRatio.toFixed(2)}x)`
    };
  }

  return {
    isSweep: true,
    zone,
    sweepDistance,
    atr,
    sweepRatio,
    reason: wasApproached
      ? "Liquidity swept with reclaim confirmed"
      : "Liquidity swept with reclaim (level was not recently re-tested — lower confidence)"
  };
}

/** Runs sweep detection against every candidate zone, returns the best (highest-scoring) sweep. */
export function findBestSweep(candles: Candle[], zones: LiquidityZone[]): SweepResult | null {
  const results = zones
    .map((z) => detectSweep(candles, z))
    .filter((r) => r.isSweep);
  if (results.length === 0) return null;
  return results.sort((a, b) => (b.zone?.score ?? 0) - (a.zone?.score ?? 0))[0];
}
