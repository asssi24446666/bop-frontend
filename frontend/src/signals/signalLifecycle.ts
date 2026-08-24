// Signal lifecycle transitions:
// WATCHING -> SETUP_FORMING -> SWEEP_DETECTED -> CONFIRMED -> ACTIVE
//   -> PROFIT | LOSS | EXPIRED | CANCELLED | REJECTED
// No manual marking of PROFIT/LOSS — resolved automatically by
// checking whether price reached TP or SL first (see checkActiveSignal).

import type { BopSignal, Quote } from "@/types";

export function activateSignal(signal: BopSignal): BopSignal {
  const now = Date.now();
  return {
    ...signal,
    status: "ACTIVE",
    activatedAt: now,
    events: [...signal.events, { timestamp: now, type: "ACTIVE" }]
  };
}

export function expireSignal(signal: BopSignal, reason: string): BopSignal {
  const now = Date.now();
  return {
    ...signal,
    status: "EXPIRED",
    closedAt: now,
    events: [...signal.events, { timestamp: now, type: "EXPIRED", note: reason }]
  };
}

export function cancelSignal(signal: BopSignal, reason: string): BopSignal {
  const now = Date.now();
  return {
    ...signal,
    status: "CANCELLED",
    closedAt: now,
    events: [...signal.events, { timestamp: now, type: "CANCELLED", note: reason }]
  };
}

/** Called on every fresh quote for an ACTIVE signal — resolves PROFIT/LOSS automatically. */
export function checkActiveSignal(signal: BopSignal, quote: Quote): BopSignal {
  if (signal.status !== "ACTIVE" || !signal.entry || !signal.stopLoss || !signal.takeProfit || !signal.direction) {
    return signal;
  }

  const now = Date.now();
  const price = quote.last;

  const hitTP = signal.direction === "BUY" ? price >= signal.takeProfit : price <= signal.takeProfit;
  const hitSL = signal.direction === "BUY" ? price <= signal.stopLoss : price >= signal.stopLoss;

  if (hitTP) {
    const rMultiple = signal.riskRewardRatio ?? 0;
    return {
      ...signal,
      status: "PROFIT",
      closedAt: now,
      exitPrice: signal.takeProfit,
      rMultiple,
      pnlPercent: rMultiple, // scaled by risk% at the account layer, not here
      events: [...signal.events, { timestamp: now, type: "TP" }]
    };
  }

  if (hitSL) {
    return {
      ...signal,
      status: "LOSS",
      closedAt: now,
      exitPrice: signal.stopLoss,
      rMultiple: -1,
      pnlPercent: -1,
      events: [...signal.events, { timestamp: now, type: "SL" }]
    };
  }

  return signal;
}
