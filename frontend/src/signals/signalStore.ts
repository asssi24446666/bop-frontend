// Persistent signal + history storage, built on StorageProvider so it
// survives app close / phone restart / refresh, and can later move to
// the PostgreSQL-backed backend (see database/schema.sql) by swapping
// the StorageProvider implementation only.

import type { BopSignal } from "@/types";
import { getStorageProvider } from "@/storage/StorageProvider";

const KEY_PREFIX = "signal:";
const ACTIVE_KEY = "active-signal-ids";

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
