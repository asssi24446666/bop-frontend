import { useState } from "react";
import { DEFAULT_SETTINGS } from "@/types";
import type { BopSignal, Instrument } from "@/types";
import { getMarketDataProvider } from "@/market-data";
import { scanMarkets, rankSignals } from "@/hooks/useMarketScan";
import { saveSignal } from "@/signals/signalStore";
import { SignalCard } from "@/components/SignalCard";
import { DataRequired } from "@/components/DataRequired";

export function Markets() {
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; current: Instrument } | null>(null);
  const [results, setResults] = useState<BopSignal[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isLive = getMarketDataProvider().getConnectionState().status === "CONNECTED";

  async function handleScan() {
    setScanning(true);
    setError(null);
    setResults(null);
    try {
      const signals = await scanMarkets(DEFAULT_SETTINGS.enabledInstruments, (done, total, current) =>
        setProgress({ done, total, current })
      );
      await Promise.all(signals.map((s) => saveSignal(s)));
      setResults(rankSignals(signals));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setScanning(false);
      setProgress(null);
    }
  }

  return (
    <div className="page">
      <div className="card">
        <div className="card-title">ENABLED INSTRUMENTS</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {DEFAULT_SETTINGS.enabledInstruments.map((i) => (
            <span key={i} className="tag no-trade">{i}</span>
          ))}
        </div>
      </div>

      {!isLive ? (
        <DataRequired detail="Market scanner needs a connected data provider to rank live setups by BOP Score, RR, liquidity quality, and confirmation." />
      ) : (
        <div className="card" style={{ textAlign: "center" }}>
          <button className="btn primary" style={{ width: "100%" }} onClick={handleScan} disabled={scanning}>
            {scanning ? "SCANNING..." : "SCAN MARKETS"}
          </button>
          {scanning && progress && (
            <p style={{ fontSize: 12, color: "var(--bop-text-dim)", marginTop: 8, marginBottom: 0 }}>
              Checking {progress.current}... ({progress.done}/{progress.total})
            </p>
          )}
          <p style={{ fontSize: 11, color: "var(--bop-text-dim)", marginTop: 8, marginBottom: 0 }}>
            Scans all {DEFAULT_SETTINGS.enabledInstruments.length} instruments one at a time — takes about {DEFAULT_SETTINGS.enabledInstruments.length * 2}–{DEFAULT_SETTINGS.enabledInstruments.length * 4} seconds on the free data plan.
          </p>
        </div>
      )}

      {error && (
        <div className="card">
          <p style={{ fontSize: 13, color: "var(--bop-red)", margin: 0 }}>{error}</p>
        </div>
      )}

      {results && results.length === 0 && (
        <div className="card">
          <p style={{ fontSize: 13, color: "var(--bop-text-dim)", margin: 0 }}>
            NO VALID SETUPS — none of the scanned instruments currently meet BOP's liquidity, sweep, confirmation, and 1:{DEFAULT_SETTINGS.minimumRR.toFixed(1)} RR requirements.
          </p>
        </div>
      )}

      {results && results.length > 0 && (
        <>
          <div className="card-title" style={{ padding: "0 4px" }}>
            RANKED SETUPS ({results.length})
          </div>
          {results.map((signal) => (
            <SignalCard key={signal.id} signal={signal} />
          ))}
        </>
      )}
    </div>
  );
          }
