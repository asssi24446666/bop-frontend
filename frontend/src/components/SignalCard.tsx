import { useState } from "react";
import type { BopSignal } from "@/types";

function tagClass(decision: BopSignal["decision"]) {
  if (decision === "BUY") return "tag buy";
  if (decision === "SELL") return "tag sell";
  if (decision === "WAIT") return "tag wait";
  return "tag no-trade";
}

export function SignalCard({ signal }: { signal: BopSignal }) {
  const [panel, setPanel] = useState<null | "view" | "why">(null);

  function toggle(next: "view" | "why") {
    setPanel((current) => (current === next ? null : next));
  }

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div className="card-title" style={{ marginBottom: 0 }}>BOP SIGNAL — {signal.instrument}</div>
        <span className={tagClass(signal.decision)}>{signal.decision.replace("_", " ")}</span>
      </div>

      {signal.entry && signal.stopLoss && signal.takeProfit ? (
        <div className="grid-2" style={{ marginBottom: 10 }}>
          <div><div className="stat-label">Entry</div><div className="stat-value">{signal.entry.toFixed(2)}</div></div>
          <div><div className="stat-label">SL</div><div className="stat-value">{signal.stopLoss.toFixed(2)}</div></div>
          <div><div className="stat-label">TP</div><div className="stat-value">{signal.takeProfit.toFixed(2)}</div></div>
          <div><div className="stat-label">RR</div><div className="stat-value gold-number">1:{signal.riskRewardRatio?.toFixed(2)}</div></div>
        </div>
      ))}
        <p style={{ fontSize: 13, color: "var(--bop-text-dim)", marginTop: 0 }}>{signal.reason}</p>
      )}

      <div className="grid-2" style={{ marginBottom: 12 }}>
        <div><div className="stat-label">BOP Score</div><div className="stat-value gold-number">{signal.bopScore.total}/100</div></div>
        <div><div className="stat-label">Status</div><div className="stat-value">{signal.status}</div></div>
      </div>

      <div className="btn-row">
        <button className={btn${panel === "view" ? " primary" : ""}} onClick={() => toggle("view")}>VIEW</button>
        <button className={btn${panel === "why" ? " primary" : ""}} onClick={() => toggle("why")}>WHY?</button>
        <button className="btn" disabled style={{ opacity: 0.5 }} title="Chart view isn't built yet">CHART</button>
      </div>

      {panel === "view" && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--bop-border)" }}>
          <div className="stat-label" style={{ marginBottom: 8 }}>EVENT LOG</div>
          {signal.events.map((e, i) => (
            <div className="diagnostic-row" key={i}>
              <span>{e.type}{e.note ? ` — ${e.note}` : ""}</span>
              <span style={{ fontSize: 11, color: "var(--bop-text-dim)" }}>{new Date(e.timestamp).toLocaleTimeString()}</span>
            </div>
          ))}
          <div className="stat-label" style={{ marginTop: 10 }}>Strategy: {signal.strategyVersion}</div>
        </div>
      )}

      {panel === "why" && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--bop-border)" }}>
          <div className="stat-label" style={{ marginBottom: 8 }}>WHY: {signal.reason}</div>
          {signal.diagnostics.map((d, i) => (
            <div className="diagnostic-row" key={i}>
              <span>{d.name}: {d.detail}</span>
              <span className={d.pass ? "diagnostic-pass" : "diagnostic-fail"}>{d.pass ? "PASS" : "FAIL"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
