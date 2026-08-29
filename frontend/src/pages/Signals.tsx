import { useEffect, useState } from "react";
import type { BopSignal, ConnectionState } from "@/types";
import { getAllSignals } from "@/signals/signalStore";
import { getMarketDataProvider } from "@/market-data";
import { SignalCard } from "@/components/SignalCard";
import { DataRequired } from "@/components/DataRequired";

const AUTO_REFRESH_MS = 15000; // reflects whatever Home/Markets have most recently scanned and saved

export function Signals() {
  const [signals, setSignals] = useState<BopSignal[]>([]);
  const [conn, setConn] = useState<ConnectionState>(getMarketDataProvider().getConnectionState());

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      const all = await getAllSignals();
      if (!cancelled) setSignals(all);
    }
    refresh();
    const interval = setInterval(refresh, AUTO_REFRESH_MS);

    const provider = getMarketDataProvider();
    setConn(provider.getConnectionState());
    const unsubscribe = provider.onConnectionStateChange(setConn);

    return () => {
      cancelled = true;
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  const isLive = conn.status === "CONNECTED";
  const isTradeableDecision = (s: BopSignal) => s.decision === "BUY" || s.decision === "SELL";

  // Only genuinely open trades belong in "active" — once a trade
  // resolves to PROFIT/LOSS/EXPIRED/CANCELLED it moves to History
  // instead of lingering here looking like it's still live.
  const active = signals.filter((s) => isTradeableDecision(s) && s.status === "ACTIVE");
  const recentlyClosed = signals
    .filter((s) => isTradeableDecision(s) && (s.status === "PROFIT" || s.status === "LOSS"))
    .slice(0, 5);
  const others = signals.filter((s) => !isTradeableDecision(s));

  if (!isLive && signals.length === 0) {
    return (
      <div className="page">
        <DataRequired detail="No signals yet. Signals are generated only from real, connected market data — none are fabricated while disconnected." />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="card">
        <div style={{ fontSize: 12, color: "var(--bop-text-dim)" }}>
          {active.length} active · {signals.length} total evaluated · auto-refreshes every 15s
        </div>
      </div>

      {active.length > 0 && (
        <>
          <div className="card-title" style={{ padding: "0 4px" }}>ACTIVE ({active.length})</div>
          {active.map((s) => <SignalCard key={s.id} signal={s} />)}
        </>
      )}

      {active.length === 0 && (
        <div className="card">
          <p style={{ fontSize: 13, color: "var(--bop-text-dim)", margin: 0 }}>
            No currently open trades. Closed trades appear in History.
          </p>
        </div>
      )}

      {recentlyClosed.length > 0 && (
        <>
          <div className="card-title" style={{ padding: "0 4px" }}>RECENTLY CLOSED</div>
          {recentlyClosed.map((s) => (
            <div className="card" key={s.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong>{s.instrument}</strong>
                <span className={s.status === "PROFIT" ? "tag buy" : "tag sell"}>{s.status}</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--bop-text-dim)" }}>
                {s.direction} · Entry {s.entry?.toFixed(2)} → Exit {s.exitPrice?.toFixed(2)}
              </div>
            </div>
          ))}
        </>
      )}

      {others.length > 0 && (
        <>
          <div className="card-title" style={{ padding: "0 4px" }}>NO TRADE / WAIT ({others.length}) — why</div>
          {others.map((s) => (
            <div className="card" key={s.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <strong>{s.instrument}</strong>
                <span className={s.decision === "WAIT" ? "tag wait" : "tag no-trade"}>{s.decision.replace("_", " ")}</span>
              </div>
              <p style={{ fontSize: 12, color: "var(--bop-text-dim)", marginTop: 0, marginBottom: 10 }}>{s.reason}</p>
              {s.diagnostics.map((d, i) => (
                <div className="diagnostic-row" key={i}>
                  <span>{d.name}: {d.detail}</span>
                  <span className={d.pass ? "diagnostic-pass" : "diagnostic-fail"}>{d.pass ? "PASS" : "FAIL"}</span>
                </div>
              ))}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
