// ==========================================================
// RISK ENGINE — daily loss limit, consecutive loss lock, and
// per-trade risk gating. This runs BEFORE any signal can move to
// ACTIVE (live or paper). It never removes the RR / liquidity /
// confirmation gates from the signal engine — it is an independent
// safety layer on top.
// ==========================================================

import type { RiskSettings, RiskState } from "@/types";

export const DEFAULT_RISK_SETTINGS: RiskSettings = {
  riskPerTradePercent: 0.5,
  dailyLossLimitPercent: 2,
  maxConsecutiveLosses: 3,
  riskLockEnabled: true
};

export function evaluateRiskLock(state: RiskState, settings: RiskSettings): RiskState {
  if (!settings.riskLockEnabled) return { ...state, riskLocked: false };

  if (state.dailyPnlPercent <= -Math.abs(settings.dailyLossLimitPercent)) {
    return { ...state, riskLocked: true, riskLockReason: `Daily loss limit reached (${state.dailyPnlPercent.toFixed(2)}%)` };
  }

  if (state.consecutiveLosses >= settings.maxConsecutiveLosses) {
    return { ...state, riskLocked: true, riskLockReason: `${state.consecutiveLosses} consecutive losses reached` };
  }

  return { ...state, riskLocked: false, riskLockReason: undefined };
}

export function recordTradeResult(state: RiskState, settings: RiskSettings, result: "WIN" | "LOSS", pnlPercent: number, rMultiple: number): RiskState {
  const next: RiskState = {
    ...state,
    dailyPnlPercent: state.dailyPnlPercent + pnlPercent,
    dailyPnlR: state.dailyPnlR + rMultiple,
    consecutiveLosses: result === "LOSS" ? state.consecutiveLosses + 1 : 0
  };
  return evaluateRiskLock(next, settings);
}

export function resetDailyRiskState(state: RiskState): RiskState {
  return { ...state, dailyPnlPercent: 0, dailyPnlR: 0 };
}
