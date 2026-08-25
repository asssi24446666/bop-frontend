// BackendNewsProvider — the frontend's only way to reach real news
// data. Talks to the Railway backend's /api/news/* routes, which hold
// the FMP key server-side. Same pattern as BackendMarketDataProvider.

import type { Instrument, NewsEvent } from "@/types";
import type { NewsProvider } from "../NewsProvider";

function resolveBaseUrl(): string {
  const base = import.meta.env.VITE_API_BASE_URL;
  if (!base) return "";
  return `${base.replace(/\/$/, "")}/api/news`;
}

export class BackendNewsProvider implements NewsProvider {
  readonly name = "backend";
  private baseUrl = resolveBaseUrl();
  private cachedAvailable = false;

  /** Call once (or periodically) to refresh cached availability — isAvailable() stays sync per the interface. */
  async checkStatus(): Promise<boolean> {
    if (!this.baseUrl) {
      this.cachedAvailable = false;
      return false;
    }
    try {
      const res = await fetch(`${this.baseUrl}/status`);
      const data = await res.json();
      this.cachedAvailable = data.status === "CONFIGURED";
    } catch {
      this.cachedAvailable = false;
    }
    return this.cachedAvailable;
  }

  isAvailable(): boolean {
    return this.cachedAvailable;
  }

  async getUpcomingEvents(instrument: Instrument | "ALL", withinMs: number): Promise<NewsEvent[]> {
    if (!this.baseUrl) return [];
    try {
      const res = await fetch(`${this.baseUrl}/upcoming?instrument=${instrument}&withinMs=${withinMs}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.events ?? [];
    } catch {
      return [];
    }
  }

  async getRecentEvents(): Promise<NewsEvent[]> {
    return [];
  }
}
