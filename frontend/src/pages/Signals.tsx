import { useEffect, useState } from "react";
import type { BopSignal, ConnectionState } from "@/types";
import { getAllSignals } from "@/signals/signalStore";
import { getMarketDataProvider } from "@/market-data";
import { SignalCard } from "@/components/SignalCard";
import { DataRequired } from "@/components/DataRequired";

export function Signals() {
  const [signals, setSignals] = useState<BopSignal[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [conn, setConn] = useState<ConnectionState>(getMarketDataProvider().getConnectionState());
  const [loading, setLoading] = useState(true);

  const isLive = conn.status === "CONNECTED";

  async function refresh() {
    setLoading(true);
    const all = await getAllSignals();
    setSignals(all);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    const provider = getMarketDataProvider();
    setConn(provider.getConnectionState());
    return provider.onConnectionStateChange(setConn);
  }, []);

  const tradeable = signals.filter((s) => s.decision === "BUY" || s.decision === "SELL");
  const visible = showAll ? signals : tradeable;

  return (
    <div className="page">
      {!isLive && signals.length === 0 && (
        <DataRequired detail="No signals yet. Signals are generated only from real, connected market data — none are fabricated while disconnected." />
      )}

      {(isLive || signals.length > 0) && (
        <>
          <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 12, color: "var(--bop-text-dim)" }}>
              {tradeable.length} tradeable · {signals.length} total evaluated
            </div>
            <div className="btn-row" style={{ gap: 6 }}>
              <button
                className="btn"
                style={{ padding: "6px 10px", fontSize: 11, minHeight: "auto" }}
                onClick={() => setShowAll((v) => !v)}
              >
                {showAll ? "Show tradeable only" : "Show all"}
              </button>
              <button
                className="btn"
                style={{ padding: "6px 10px", fontSize: 11, minHeight: "auto" }}
                onClick={refresh}
                disabled={loading}
              >
                {loading ? "…" : "Refresh"}
              </button>
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="card">
              <p style={{ fontSize: 13, color: "var(--bop-text-dim)", margin: 0 }}>
                {showAll
                  ? "No signals recorded yet — run \"Scan Markets\" from the Markets tab, or wait for Home to evaluate the primary asset."
                  : "No tradeable (BUY/SELL) signals right now. Toggle \"Show all\" to see NO_TRADE / WAIT evaluations with their reasons."}
              </p>
            </div>
          ) : (
            visible.map((s) => <SignalCard key={s.id} signal={s} />)
          )}
        </>
      )}
    </div>
  );
}
