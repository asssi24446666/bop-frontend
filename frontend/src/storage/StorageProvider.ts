// StorageProvider — abstraction over persistence so the app can start
// on local/mobile storage and move to a PostgreSQL-backed REST API
// later without rewriting callers. Every screen that needs
// persistence (signals, history, settings, paper trades, risk state)
// goes through this interface.

export interface StorageProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  list<T>(prefix: string): Promise<T[]>;
  remove(key: string): Promise<void>;
}

const NAMESPACE = "bop:";

/**
 * LocalStorageProvider — persists to the browser/WebView's localStorage.
 * Survives app close, phone restart, and refresh (item #41's requirement)
 * because localStorage is disk-backed, not in-memory. When the backend
 * (Node/TS + PostgreSQL) is ready, implement ApiStorageProvider against
 * the same interface and swap it in getStorageProvider() below — no
 * other file needs to change.
 */
export class LocalStorageProvider implements StorageProvider {
  async get<T>(key: string): Promise<T | null> {
    const raw = window.localStorage.getItem(NAMESPACE + key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    window.localStorage.setItem(NAMESPACE + key, JSON.stringify(value));
  }

  async list<T>(prefix: string): Promise<T[]> {
    const results: T[] = [];
    const fullPrefix = NAMESPACE + prefix;
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(fullPrefix)) {
        const raw = window.localStorage.getItem(k);
        if (raw) {
          try {
            results.push(JSON.parse(raw) as T);
          } catch {
            /* skip corrupt entry */
          }
        }
      }
    }
    return results;
  }

  async remove(key: string): Promise<void> {
    window.localStorage.removeItem(NAMESPACE + key);
  }
}

let instance: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (!instance) instance = new LocalStorageProvider();
  return instance;
}
