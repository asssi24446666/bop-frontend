// NewsProvider — abstraction over economic calendar / news vendors
// (CPI, NFP, FOMC, rate decisions, GDP, employment, PMI, central bank
// speeches, etc). Same rule as market data: never fabricate an event.
// If unavailable, callers see an empty/erroring result and the UI
// must show "NEWS DATA UNAVAILABLE" — the news filter simply cannot
// protect against events it has no data for, and must say so.

import type { Instrument, NewsEvent } from "@/types";

export interface NewsProvider {
  readonly name: string;
  isAvailable(): boolean;
  getUpcomingEvents(instrument: Instrument | "ALL", withinMs: number): Promise<NewsEvent[]>;
  getRecentEvents(instrument: Instrument | "ALL", sinceMs: number): Promise<NewsEvent[]>;
}

export class NoNewsProvider implements NewsProvider {
  readonly name = "none";
  isAvailable(): boolean {
    return false;
  }
  async getUpcomingEvents(): Promise<NewsEvent[]> {
    return [];
  }
  async getRecentEvents(): Promise<NewsEvent[]> {
    return [];
  }
}
