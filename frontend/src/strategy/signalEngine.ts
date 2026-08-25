// ==========================================================
// BOP SIGNAL ENGINE
// The single place that turns real candle data into a decision:
// BUY / SELL / WAIT / NO_TRADE. Wires together liquidity, sweep,
// rejection, momentum, structure, regime, volatility, session, bias,
// and the BOP score, then enforces the mandatory gates:
//   1. Meaningful liquidity
//   2. Confirmed sweep
//   3. Directional confirmation
//   4. Minimum RR (default 1:3, never inflated artificially)
//   5. Risk available (checked by the caller via risk engine)
// Everything else (HTF alignment, momentum, rejection, session,
// volatility, regime) affects the SCORE, not eligibility — this is
// what item #24 in the spec calls "signal filtering" and prevents
// BOP from becoming excessively restrictive.
// ==========================================================

import type {
  BopSettings, BopSignal, Candle, DiagnosticCheck, Direction, Instrument, LiquidityZone
} from "@/types";
import { detectLiquidityZones } from "./liquidity";
import { findBestSweep } from "./sweep";
import { calculateRejection } from "./rejection";
import { calculateMomentum } from "./momentum";
import { checkStructureConfirmation } from "./structure";
import { classifyRegime } from "./regime";
import { atrPercentile, classifyVolatility, calculateATR } from "./volatility";
import { getSession } from "./session";
import { determineHtfBias } from "./bias";
import { calculateBopScore } from "./bopScore";

function sensitivityFloor(base: number, sensitivity: BopSettings["signalSensitivity"]): number {
  if (sensitivity === "LOW") return base + 10;
  if (sensitivity === "HIGH") return Math.max(30, base - 10); // soft floor — user-configured, not the old hard 60 line
  return base;
}

function nextLiquidityTarget(zones: LiquidityZone[], direction: Direction, fromPrice: number): number | null {
  const candidates = zones
    .filter((z) => (direction === "BUY" ? z.side === "BUY_SIDE" && z.price > fromPrice : z.side === "SELL_SIDE" && z.price < fromPrice))
    .filter((z) => !z.consumed)
    .sort((a, b) => direction === "BUY" ? a.price - b.price : b.price - a.price);
  return candidates[0]?.price ?? null;
}

export function generateSignal(
  instrument: Instrument,
  candles: Candle[],
  settings: BopSettings
): BopSignal {
  const diagnostics: DiagnosticCheck[] = [];
  const now = Date.now();
  const session = getSession(now);
  const regime = classifyRegime(candles);
  const volPercentile = atrPercentile(candles);
  const volatility = classifyVolatility(volPercentile);
  const htfBias = determineHtfBias(candles);
  const atr = calculateATR(candles);

  const baseSignal = (
    decision: BopSignal["decision"],
    reason: string,
    direction: Direction | null = null
  ): BopSignal => ({
    id: `BOP-${instrument}-${now}`,
    instrument,
    direction,
    decision,
    entry: null,
    stopLoss: null,
    takeProfit: null,
    riskRewardRatio: null,
    bopScore: {
      liquidity: 0, sweep: 0, confirmation: 0, htfAlignment: 0,
      momentum: 0, rejection: 0, volatility: 0, total: 0, grade: "NO_TRADE"
    },
    diagnostics,
    status: decision === "NO_TRADE" ? "REJECTED" : "WATCHING",
    events: [{ timestamp: now, type: decision === "NO_TRADE" ? "REJECTED" : "WATCHING", note: reason }],
    reason,
    strategyVersion: settings.strategyVersion,
    htfBias, regime, volatility, session,
    createdAt: now
  });

  if (candles.length < 30) {
    diagnostics.push({ name: "Data sufficiency", pass: false, detail: `Only ${candles.length} candles available` });
    return baseSignal("NO_TRADE", "Insufficient historical candle data to evaluate a setup");
  }

  // 1. Meaningful liquidity
  const zones = detectLiquidityZones(instrument, "15M", candles);
  const meaningfulZones = zones.filter((z) => z.score >= 20 && !z.consumed);
  diagnostics.push({
    name: "Liquidity", pass: meaningfulZones.length > 0,
    detail: meaningfulZones.length > 0 ? `${meaningfulZones.length} meaningful zone(s) detected` : "No meaningful liquidity zones detected"
  });
  if (meaningfulZones.length === 0) {
    return baseSignal("NO_TRADE", "No meaningful liquidity zones currently in range");
  }

  // 2. Confirmed sweep
  const sweep = findBestSweep(candles, meaningfulZones);
  diagnostics.push({ name: "Sweep", pass: !!sweep, detail: sweep ? sweep.reason : "No confirmed liquidity sweep" });
  if (!sweep || !sweep.zone) {
    return baseSignal("NO_TRADE", "No confirmed liquidity sweep at this time");
  }

  const direction: Direction = sweep.zone.side === "SELL_SIDE" ? "BUY" : "SELL";

  // 3. Directional (structure) confirmation
  const structure = checkStructureConfirmation(candles, direction);
  diagnostics.push({ name: "Confirmation", pass: structure.confirmed, detail: structure.reason });
  if (!structure.confirmed) {
    return baseSignal("WAIT", `Sweep detected, awaiting structure confirmation — ${structure.reason}`, direction);
  }

  const rejection = calculateRejection(candles[candles.length - 1], direction);
  const momentum = calculateMomentum(candles, direction);

  const entry = candles[candles.length - 1].close;
  const buffer = atr * 0.25;
  const stopLoss = direction === "BUY" ? sweep.zone.price - buffer : sweep.zone.price + buffer;

  const target = nextLiquidityTarget(zones, direction, entry);
  const risk = Math.abs(entry - stopLoss);
  const reward = target !== null ? Math.abs(target - entry) : 0;
  const rr = risk > 0 ? reward / risk : 0;

  diagnostics.push({
    name: "Risk-Reward", pass: rr >= settings.minimumRR,
    detail: target === null
      ? "No further liquidity target available beyond entry"
      : `RR = ${rr.toFixed(2)}R (required ${settings.minimumRR.toFixed(1)}R+)`
  });

  if (target === null || rr < settings.minimumRR) {
    return baseSignal(
      "NO_TRADE",
      target === null
        ? "No natural liquidity target beyond entry — will not fabricate a target to force RR"
        : `RR = ${rr.toFixed(2)}R, below the required ${settings.minimumRR.toFixed(1)}R minimum — will not move TP artificially`,
      direction
    );
  }

  const bopScore = calculateBopScore({
    liquidityScore: sweep.zone.score,
    sweepRatio: sweep.sweepRatio,
    structureConfirmed: structure.confirmed,
    htfBias,
    direction,
    momentumRatio: momentum.momentumRatio,
    rejectionRatio: rejection.rejectionRatio,
    volatility,
    weights: settings.weights
  });

  const requiredScore = sensitivityFloor(settings.minimumBopScore, settings.signalSensitivity);
  diagnostics.push({
    name: "BOP Score", pass: bopScore.total >= requiredScore,
    detail: `${bopScore.total}/100 (required ${requiredScore}+, sensitivity ${settings.signalSensitivity})`
  });

  if (bopScore.total < requiredScore) {
    return {
      ...baseSignal("NO_TRADE", `BOP Score ${bopScore.total} below required ${requiredScore} for ${settings.signalSensitivity} sensitivity`, direction),
      bopScore
    };
  }

  const signal: BopSignal = {
    id: `BOP-${instrument}-${now}`,
    instrument,
    direction,
    decision: direction,
    entry,
    stopLoss,
    takeProfit: target,
    riskRewardRatio: rr,
    bopScore,
    diagnostics,
    status: "CONFIRMED",
    events: [
      { timestamp: now, type: "SWEEP_DETECTED", note: sweep.reason },
      { timestamp: now, type: "CONFIRMED", note: structure.reason },
      { timestamp: now, type: "APPROVED", note: `BOP Score ${bopScore.total}, RR ${rr.toFixed(2)}` }
    ],
    reason: `Liquidity sweep + structure confirmation, BOP Score ${bopScore.total}/100 (${bopScore.grade}), RR ${rr.toFixed(2)}`,
    strategyVersion: settings.strategyVersion,
    htfBias, regime, volatility, session,
    createdAt: now
  };

  return signal;
    }
