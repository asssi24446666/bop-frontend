// Small shared helper: any signal that came out of the engine as a
// tradeable BUY/SELL is treated as immediately "entered" for tracking
// purposes (this app is LIVE_ANALYSIS — no real broker order is
// placed), so useSignalMonitor can watch it against live price. Any
// other decision (WAIT/NO_TRADE) is left as-is.

import type { BopSignal } from "@/types";
import { activateSignal } from "./signalLifecycle";

export function activateIfTradeable(signal: BopSignal): BopSignal {
  if (signal.decision === "BUY" || signal.decision === "SELL") {
    return activateSignal(signal);
  }
  return signal;
}
