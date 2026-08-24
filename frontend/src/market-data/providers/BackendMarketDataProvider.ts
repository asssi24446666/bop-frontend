// ==========================================================
// BackendMarketDataProvider — the frontend's ONLY way to reach real
// market data. It talks to the Railway backend's /api/market-data/*
// routes, which hold the actual provider API key + Supabase
// connection server-side. The React app (on Vercel) never sees
// secrets — it only ever calls VITE_API_BASE_URL.
// ==========================================================

import type { Candle, ConnectionState, Instrument, Quote, Timeframe } from "@/types";
import type { MarketDataProvider } from "../MarketDataProvider";

function resolveBaseUrl(): string {
  const apiUrl = (import.meta as any).env?.VITE_API_BASE_URL;;
  if (!base) {
    // Fail loudly and visibly instead of silently hitting a relative
    // path that won't exist once this is built for Vercel/an APK.
    console.error(
      "VITE_API_BASE_URL is not set. Set it in frontend/.env (local) or in Vercel's Project Settings → Environment Variables."
    );
    return "";
  }
  return `${base.replace(/\/$/, "")}/api/market-data`;
}

export class BackendMarketDataProvider implements MarketDataProvider {
  readonly name = "backend";
  private baseUrl = resolveBaseUrl();
  private state: ConnectionState = { status: "DISCONNECTED", provider: null, lastUpdate: null };
  private listeners: Array<(s: ConnectionState) => void> = [];
  private pollHandle: ReturnType<typeof setInterval> | null = null;

  async connect(): Promise<void> {
    if (!this.baseUrl) {
      this.setState({ status: "ERROR", errorMessage: "VITE_API_BASE_URL is not configured" });
      return;
    }
    this.setState({ status: "CONNECTING" });
    await this.refreshStatus();
    if (!this.pollHandle) {
      this.pollHandle = setInterval(() => this.refreshStatus(), 30000);
    }
  }

  private setState(next: Partial<ConnectionState>) {
    this.state = { ...this.state, ...next };
    this.listeners.forEach((l) => l(this.state));
  }

  private async refreshStatus(): Promise<void> {
    try {
      const res = await fetch(`${this.baseUrl}/status`);
      const data = await res.json();
      this.setState({
        status: data.status === "CONNECTED" ? "CONNECTED" : "DISCONNECTED",
        provider: data.provider ?? null,
        lastUpdate: Date.now(),
        errorMessage: data.errorMessage
      });
    } catch {
      this.setState({ status: "DISCONNECTED", errorMessage: "Cannot reach backend" });
    }
  }

  async disconnect(): Promise<void> {
    if (this.pollHandle) clearInterval(this.pollHandle);
    this.pollHandle = null;
    this.setState({ status: "DISCONNECTED" });
  }

  getConnectionState(): ConnectionState {
    return this.state;
  }

  async getQuote(instrument: Instrument): Promise<Quote | null> {
    if (!this.baseUrl) return null;
    try {
      const res = await fetch(`${this.baseUrl}/quote/${instrument}`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  async getHistoricalCandles(instrument: Instrument, timeframe: Timeframe): Promise<Candle[]> {
    if (!this.baseUrl) return [];
    try {
      const res = await fetch(`${this.baseUrl}/candles/${instrument}?timeframe=${timeframe}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.candles ?? [];
    } catch {
      return [];
    }
  }

  async getRecentCandles(instrument: Instrument, timeframe: Timeframe, count: number): Promise<Candle[]> {
    if (!this.baseUrl) return [];
    try {
      const res = await fetch(`${this.baseUrl}/candles/${instrument}?timeframe=${timeframe}&count=${count}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.candles ?? [];
    } catch {
      return [];
    }
  }

  subscribe(instrument: Instrument, timeframe: Timeframe, onCandle: (candle: Candle) => void): () => void {
    const interval = setInterval(async () => {
      const recent = await this.getRecentCandles(instrument, timeframe, 1);
      if (recent.length > 0) onCandle(recent[recent.length - 1]);
    }, 15000);
    return () => clearInterval(interval);
  }

  onConnectionStateChange(listener: (state: ConnectionState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }
}
