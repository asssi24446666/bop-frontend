import { useEffect, useState } from "react";
import { DEFAULT_SETTINGS } from "@/types";
import type { BopSignal, Instrument } from "@/types";
import { getMarketDataProvider } from "@/market-data";
import { scanMarkets, rankSignals } from "@/hooks/useMarketScan";
import { saveSignal } from "@/signals/signalStore";
import { SignalCard } from "@/components/SignalCard";
import { DataRequired } from "@/components/DataRequired";

const AUTO_SCAN_MS = 120000; // 2 minutes — full 13-instrument scan repeated on this cycle, safe under the free data plan's rate limit

export function Markets() {
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; current: Instrument } | null>(null);
  const [results, setResults] = useState<BopSignal[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<number | null>(null);

  const isLive = getMarketDataProvider().getConnectionState().status === "CONNECTED";

  useEffect(() => {
    if (!isLive) return;
    let cancelled = false;

    async function runScan() {
      setScanning(true);
      setError(null);
      try {
        const signals = await scanMarkets(DEFAULT_SETTINGS.enabledInstruments, (done, total, current) => {
          if (!cancelled) setProgress({ done, total, current });
        });
        if (cancelled) return;
        await Promise.all(signals.map((s) => saveSignal(s)));
        setResults(rankSignals(signals));
        setLastScanned(Date.now());
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Scan failed");
      } finally {
        if (!cancelled) {
          setScanning(false);
          setProgress(null);
        }
      }
    }

    runScan();
    const interval = setInterval(runScan, AUTO_SCAN_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isLive]);

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
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--bop-text-dim)" }}>
              {scanning
                ? progress
                  ? `Scanning ${progress.current}... (${progress.done}/${progress.total})`
                  : "Scanning..."
                : lastScanned
                  ? `Last scanned: ${new Date(lastScanned).toLocaleTimeString()}`
                  : "Starting first scan..."}
            </span>
            {scanning && <span className="dot live" style={{ display: "inline-block" }} />}
          </div>
          <p style={{ fontSize: 11, color: "var(--bop-text-dim)", marginTop: 8, marginBottom: 0 }}>
            Auto-scans all {DEFAULT_SETTINGS.enabledInstruments.length} instruments every 2 minutes.
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
