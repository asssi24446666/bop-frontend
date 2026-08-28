// Persistent signal + history storage. Writes to two places on every
// save: local StorageProvider (so the UI works instantly, offline,
// and survives app close/refresh) AND the backend's /api/signals
// (so Supabase has a copy the backend's always-on push-notification
// monitor can watch, even while this app is closed). The backend
// sync is best-effort — if it fails (offline, backend down), the
// local save still succeeds and the UI is unaffected.

import type { BopSignal } from "@/types";
import { getStorageProvider } from "@/storage/StorageProvider";

const KEY_PREFIX = "signal:";
const ACTIVE_KEY = "active-signal-ids";

function resolveApiBase(): string {
  const base = import.meta.env.VITE_API_BASE_URL;
  return base ? base.replace(/\/$/, "") : "";
}

function toBackendPayload(signal: BopSignal) {
  return {
    id: signal.id,
    symbol: signal.instrument,
    direction: signal.direction,
    decision: signal.decision,
    entry: signal.entry,
    stop_loss: signal.stopLoss,
    take_profit: signal.takeProfit,
    rr: signal.riskRewardRatio,
    bop_score: signal.bopScore.total,
    bop_score_breakdown: signal.bopScore,
    status: signal.status,
    reason: signal.reason,
    htf_bias: signal.htfBias,
    regime: signal.regime,
    volatility: signal.volatility,
    session: signal.session,
    strategy_version: signal.strategyVersion,
    created_at: new Date(signal.createdAt).toISOString(),
    activated_at: signal.activatedAt ? new Date(signal.activatedAt).toISOString() : null,
    closed_at: signal.closedAt ? new Date(signal.closedAt).toISOString() : null,
    exit_price: signal.exitPrice ?? null,
    r_multiple: signal.rMultiple ?? null,
    pnl_percent: signal.pnlPercent ?? null
  };
}

async function syncToBackend(signal: BopSignal): Promise<void> {
  const base = resolveApiBase();
  if (!base) return;
  try {
    await fetch(`${base}/api/signals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toBackendPayload(signal))
    });
  } catch {
    // Best-effort — see file header.
  }
}

export async function saveSignal(signal: BopSignal): Promise<void> {
  const storage = getStorageProvider();
  await storage.set(KEY_PREFIX + signal.id, signal);

  if (["ACTIVE", "CONFIRMED", "WATCHING", "SETUP_FORMING", "SWEEP_DETECTED"].includes(signal.status)) {
    const ids = (await storage.get<string[]>(ACTIVE_KEY)) ?? [];
    if (!ids.includes(signal.id)) await storage.set(ACTIVE_KEY, [...ids, signal.id]);
  } else {
    const ids = (await storage.get<string[]>(ACTIVE_KEY)) ?? [];
    await storage.set(ACTIVE_KEY, ids.filter((id) => id !== signal.id));
  }

  // Only sync signals that matter for tracking/notifications — no
  // point sending every NO_TRADE/WAIT evaluation to the database.
  if (signal.decision === "BUY" || signal.decision === "SELL") {
    await syncToBackend(signal);
  }
}

export async function getAllSignals(): Promise<BopSignal[]> {
  const storage = getStorageProvider();
  const signals = await storage.list<BopSignal>(KEY_PREFIX);
  return signals.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getActiveSignals(): Promise<BopSignal[]> {
  const storage = getStorageProvider();
  const ids = (await storage.get<string[]>(ACTIVE_KEY)) ?? [];
  const signals = await Promise.all(ids.map((id) => storage.get<BopSignal>(KEY_PREFIX + id)));
  return signals.filter((s): s is BopSignal => s !== null);
}

export async function getSignalById(id: string): Promise<BopSignal | null> {
  const storage = getStorageProvider();
  return storage.get<BopSignal>(KEY_PREFIX + id);
}
