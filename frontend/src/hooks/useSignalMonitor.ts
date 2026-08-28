// Runs in the background (mounted once at App level) so ACTIVE
// signals get checked against live price regardless of which tab is
// open. Without this, a signal would sit at "CONFIRMED" forever even
// after price blew through its SL or TP — this closes that gap.

import { useEffect } from "react";
import { getMarketDataProvider } from "@/market-data";
import { getActiveSignals, saveSignal } from "@/signals/signalStore";
import { checkActiveSignal } from "@/signals/signalLifecycle";

const CHECK_INTERVAL_MS = 20000; // 20s — cheap (1 quote call per active signal), fine under the rate limit since there are at most a couple of instruments

export function useSignalMonitor() {
  useEffect(() => {
    let cancelled = false;

    async function checkAll() {
      const active = await getActiveSignals();
      if (cancelled || active.length === 0) return;

      const provider = getMarketDataProvider();
      for (const signal of active) {
        const quote = await provider.getQuote(signal.instrument);
        if (!quote || cancelled) continue;
        const updated = checkActiveSignal(signal, quote);
        if (updated.status !== signal.status) {
          await saveSignal(updated);
        }
      }
    }

    checkAll();
    const interval = setInterval(checkAll, CHECK_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);
}
