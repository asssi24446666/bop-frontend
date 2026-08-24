// ==========================================================
// MarketDataProvider — abstraction over any real-time / historical
// market data vendor. The BOP strategy engine depends ONLY on this
// interface, never on a specific vendor SDK. This is what makes it
// possible to swap providers (Polygon, TwelveData, OANDA, IG, a
// broker's own feed, etc.) without touching strategy code.
//
// RULE: no implementation of this interface may ever invent prices,
// candles, or a CONNECTED status. If a real provider is not
// configured/reachable, callers must see ConnectionStatus
// "DISCONNECTED" and the UI must show "DATA CONNECTION REQUIRED".
// ==========================================================

import type { Candle, ConnectionState, Instrument, Quote, Timeframe } from "../types";

export interface MarketDataProvider {
  readonly name: string;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getConnectionState(): ConnectionState;

  /** Latest real-time quote. Resolves to null if unavailable — never fabricated. */
  getQuote(instrument: Instrument): Promise<Quote | null>;

  /** Historical candles for backtesting / context. Empty array if unavailable. */
  getHistoricalCandles(
    instrument: Instrument,
    timeframe: Timeframe,
    from: number,
    to: number
  ): Promise<Candle[]>;

  /** Recent closed candles, most recent last. Empty array if unavailable. */
  getRecentCandles(instrument: Instrument, timeframe: Timeframe, count: number): Promise<Candle[]>;

  /** Subscribe to real-time candle/quote updates. Returns an unsubscribe function. */
  subscribe(
    instrument: Instrument,
    timeframe: Timeframe,
    onCandle: (candle: Candle) => void
  ): () => void;

  onConnectionStateChange(listener: (state: ConnectionState) => void): () => void;
}

/**
 * NoDataProvider — the default provider until a real vendor is configured.
 * It is always DISCONNECTED and returns no data. This is intentional:
 * it is what makes "DATA CONNECTION REQUIRED" show up instead of any
 * fabricated price/candle/signal. Swap this out in market-data/index.ts
 * once MARKET_DATA_PROVIDER is set in the backend .env.
 */
export class NoDataProvider implements MarketDataProvider {
  readonly name = "none";
  private state: ConnectionState = {
    status: "DISCONNECTED",
    provider: null,
    lastUpdate: null,
    errorMessage: "No market data provider configured. Set MARKET_DATA_PROVIDER in .env."
  };
  private listeners: Array<(s: ConnectionState) => void> = [];

  async connect(): Promise<void> {
    // Intentionally a no-op: there is nothing to connect to.
  }

  async disconnect(): Promise<void> {
    this.state = { ...this.state, status: "DISCONNECTED" };
  }

  getConnectionState(): ConnectionState {
    return this.state;
  }

  async getQuote(): Promise<Quote | null> {
    return null;
  }

  async getHistoricalCandles(): Promise<Candle[]> {
    return [];
  }

  async getRecentCandles(): Promise<Candle[]> {
    return [];
  }

  subscribe(): () => void {
    return () => {};
  }

  onConnectionStateChange(listener: (state: ConnectionState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }
}
