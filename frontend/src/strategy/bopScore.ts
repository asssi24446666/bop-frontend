// ==========================================================
// BOP SCORE — 0-100, weighted composite of every engine's output.
// Weights are configurable (Advanced Settings) but default to the
// product spec: Liquidity 25 / Sweep 25 / Confirmation 20 /
// HTF 10 / Momentum 10 / Rejection 5 / Volatility 5.
// ==========================================================

import type { Bias, BopScoreBreakdown, BopWeights, Direction, VolatilityLevel } from "@/types";

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function htfAlignmentScore(bias: Bias, direction: Direction): number {
  const map: Record<Bias, number> = {
    STRONG_BULLISH: direction === "BUY" ? 100 : 0,
    BULLISH: direction === "BUY" ? 80 : 20,
    NEUTRAL: 50,
    BEARISH: direction === "SELL" ? 80 : 20,
    STRONG_BEARISH: direction === "SELL" ? 100 : 0
  };
  return map[bias];
}

function volatilityScore(vol: VolatilityLevel): number {
  // Normal/high favored; extreme is penalized for caution, very low for lack of follow-through.
  const map: Record<VolatilityLevel, number> = {
    VERY_LOW: 30, LOW: 60, NORMAL: 100, HIGH: 85, EXTREME: 40
  };
  return map[vol];
}

export interface BopScoreInputs {
  liquidityScore: number; // 0-100, from the swept zone
  sweepRatio: number; // normalized, ~0.15-3.0 typical
  structureConfirmed: boolean;
  htfBias: Bias;
  direction: Direction;
  momentumRatio: number;
  rejectionRatio: number; // 0-1
  volatility: VolatilityLevel;
  weights: BopWeights;
}

export function calculateBopScore(inputs: BopScoreInputs): BopScoreBreakdown {
  const {
    liquidityScore, sweepRatio, structureConfirmed, htfBias, direction,
    momentumRatio, rejectionRatio, volatility, weights
  } = inputs;

  const liquidity = liquidityScore;
  const sweep = Math.round(clamp01(sweepRatio / 1.2) * 100);
  const confirmation = structureConfirmed ? 100 : 0;
  const htfAlignment = htfAlignmentScore(htfBias, direction);
  const momentum = Math.round(clamp01(momentumRatio / 1.5) * 100);
  const rejection = Math.round(clamp01(rejectionRatio / 0.6) * 100);
  const vol = volatilityScore(volatility);

  const w = weights;
  const weightSum = w.liquidity + w.sweep + w.confirmation + w.htfAlignment + w.momentum + w.rejection + w.volatility;

  const weightedTotal =
    (liquidity * w.liquidity +
      sweep * w.sweep +
      confirmation * w.confirmation +
      htfAlignment * w.htfAlignment +
      momentum * w.momentum +
      rejection * w.rejection +
      vol * w.volatility) / weightSum;

  const total = Math.round(weightedTotal);

  let grade: BopScoreBreakdown["grade"];
  if (total >= 90) grade = "A++";
  else if (total >= 80) grade = "A+";
  else if (total >= 70) grade = "B+";
  else if (total >= 60) grade = "WATCH";
  else grade = "NO_TRADE";

  return { liquidity, sweep, confirmation, htfAlignment, momentum, rejection, volatility: vol, total, grade };
}
