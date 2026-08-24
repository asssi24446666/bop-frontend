import { useEffect, useState } from "react";
import type { BopSignal } from "@/types";
import { getAllSignals } from "@/signals/signalStore";

const TABS = ["ALL", "PROFIT", "LOSS", "ACTIVE", "EXPIRED", "CANCELLED"] as const;

export function History() {
  const [tab, setTab] = useState<typeof TABS[number]>("ALL");
  const [signals, setSignals] = useState<BopSignal[]>([]);

  useEffect(() => {
    getAllSignals().then(setSignals);
  }, []);

  const filtered = signals.filter((s) => tab === "ALL" || s.status === tab);

  return (
    <div className="page">
      <div className="settings-tabs" style={{ flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button key={t} className={`settings-tab${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <p style={{ fontSize: 13, color: "var(--bop-text-dim)", margin: 0 }}>
            No {tab === "ALL" ? "" : tab.toLowerCase() + " "}signals recorded yet. History is permanent — it survives app restarts and refreshes.
          </p>
        </div>
      ) : (
        filtered.map((s) => (
          <div className="card" key={s.id}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>{s.instrument}</strong>
              <span>{s.status}</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--bop-text-dim)" }}>{s.reason}</div>
          </div>
        ))
      )}
    </div>
  );
}
