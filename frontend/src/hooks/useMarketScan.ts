// Shared logic for turning real candle data into BOP signals, used by
// both the Home screen ("Best Current Setup") and the Markets screen
// ("Scan Markets"). Pulls candles through the connected
// MarketDataProvider (backend → Twelve Data) and runs them through the
// same signalEngine used by the backtest engine — no separate
// "preview" logic that could drift from the real thing.

import { getMarketDataProvider } from "@/market-data";
import { generateSignal } from "@/strategy/signalEngine";
import { DEFAULT_SETTINGS } from "@/types";
import type { BopSignal, Instrument } from "@/types";

const SCAN_TIMEFRAME = DEFAULT_SETTINGS.timeframes.setup; // "15M"
const CANDLES_PER_SCAN = 150;

export async function scanInstrument(instrument: Instrument): Promise<BopSignal> {
  const provider = getMarketDataProvider();
  const candles = await provider.getRecentCandles(instrument, SCAN_TIMEFRAME, CANDLES_PER_SCAN);
  return generateSignal(instrument, candles, DEFAULT_SETTINGS);
}

export async function scanMarkets(
  instruments: Instrument[],
  onProgress?: (done: number, total: number, current: Instrument) => void
): Promise<BopSignal[]> {
  const results: BopSignal[] = [];

  for (let i = 0; i < instruments.length; i++) {
    const instrument = instruments[i];
    onProgress?.(i, instruments.length, instrument);
    try {
      const signal = await scanInstrument(instrument);
      results.push(signal);
    } catch {
      // A single instrument failing (rate limit, bad symbol, etc.)
      // shouldn't abort the whole scan.
    }
    if (i < instruments.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
  }

  onProgress?.(instruments.length, instruments.length, instruments[instruments.length - 1]);
  return results;
}

export function rankSignals(signals: BopSignal[]): BopSignal[] {
  return signals
    .filter((s) => s.decision === "BUY" || s.decision === "SELL")
    .sort((a, b) => b.bopScore.total - a.bopScore.total);
}
