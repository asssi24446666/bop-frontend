import { useEffect, useState } from "react";
import { getMarketDataProvider } from "@/market-data";
import type { BopSignal, ConnectionState, Quote } from "@/types";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { DataRequired } from "@/components/DataRequired";
import { SignalCard } from "@/components/SignalCard";
import { DEFAULT_SETTINGS } from "@/types";
import { scanInstrument } from "@/hooks/useMarketScan";
import { activateIfTradeable } from "@/signals/activateHelper";
import { saveSignal } from "@/components/useSignalMonitor.ts";

const AUTO_REFRESH_MS = 30000; // 30s — safe under Twelve Data's free-tier rate limit

export function Home() {
  const [conn, setConn] = useState<ConnectionState>(getMarketDataProvider().getConnectionState());
  const [quote, setQuote] = useState<Quote | null>(null);
  const [bestSetup, setBestSetup] = useState<BopSignal | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const primary = DEFAULT_SETTINGS.primaryAsset;
  const isLive = conn.status === "CONNECTED";

  useEffect(() => {
    const provider = getMarketDataProvider();
    setConn(provider.getConnectionState());
    return provider.onConnectionStateChange(setConn);
  }, []);

  useEffect(() => {
    if (!isLive) {
      setQuote(null);
      setBestSetup(null);
      return;
    }
    let cancelled = false;

    async function loadPrimaryMarket(showSpinner: boolean) {
      if (showSpinner) setLoading(true);
      const provider = getMarketDataProvider();
      const [q, signal] = await Promise.all([
        provider.getQuote(primary),
        scanInstrument(primary)
      ]);
      if (cancelled) return;
      setQuote(q);
      setBestSetup(signal);
      await saveSignal(activateIfTradeable(signal));
      setLastUpdated(Date.now());
      if (showSpinner) setLoading(false);
    }

    loadPrimaryMarket(true);
    const interval = setInterval(() => loadPrimaryMarket(false), AUTO_REFRESH_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isLive, primary]);

  return (
    <div className="page">
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="card-title" style={{ marginBottom: 0 }}>PRIMARY MARKET · {primary}</div>
          <ConnectionStatus state={conn} />
        </div>
        {isLive && lastUpdated && (
          <div style={{ fontSize: 10, color: "var(--bop-text-dim)", marginTop: 6 }}>
            Auto-updates every 30s · last: {new Date(lastUpdated).toLocaleTimeString()}
          </div>
        )}
      </div>

      {!isLive ? (
        <DataRequired detail={`Connect ${primary} to a real market-data provider to see live price, bias, regime, volatility, and the BOP Score.`} />
      ) : (
        <div className="card">
          <div className="grid-2">
            <div>
              <div className="stat-label">Current Price</div>
              <div className="stat-value">{quote ? quote.last.toFixed(2) : loading ? "…" : "—"}</div>
            </div>
            <div>
              <div className="stat-label">Bid / Ask</div>
              <div className="stat-value">{quote ? `${quote.bid.toFixed(2)} / ${quote.ask.toFixed(2)}` : "—"}</div>
            </div>
            <div>
              <div className="stat-label">Market Bias</div>
              <div className="stat-value">{bestSetup ? bestSetup.htfBias.replace("_", " ") : "—"}</div>
            </div>
            <div>
              <div className="stat-label">Market Regime</div>
              <div className="stat-value">{bestSetup ? bestSetup.regime.replace("_", " ") : "—"}</div>
            </div>
            <div>
              <div className="stat-label">Volatility</div>
              <div className="stat-value">{bestSetup ? bestSetup.volatility.replace("_", " ") : "—"}</div>
            </div>
            <div>
              <div className="stat-label">BOP Score</div>
              <div className="stat-value gold-number">{bestSetup ? `${bestSetup.bopScore.total}/100` : "—"}</div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-title">BEST CURRENT SETUP</div>
        {!isLive ? (
          <p style={{ fontSize: 13, color: "var(--bop-text-dim)", margin: 0 }}>
            NO TRADE — data connection required before any setup can be evaluated.
          </p>
        ) : loading ? (
          <p style={{ fontSize: 13, color: "var(--bop-text-dim)", margin: 0 }}>Evaluating {primary}...</p>
        ) : bestSetup && (bestSetup.decision === "BUY" || bestSetup.decision === "SELL") ? (
          <SignalCard signal={bestSetup} />
        ) : (
          <p style={{ fontSize: 13, color: "var(--bop-text-dim)", margin: 0 }}>
            {bestSetup ? bestSetup.reason : "No valid setup currently meets BOP requirements."}
          </p>
        )}
      </div>

      <div className="card" style={{ textAlign: "center" }}>
        <a href="#/markets" className="btn primary" style={{ width: "100%", display: "block", textDecoration: "none", boxSizing: "border-box" }}>
          VIEW ALL MARKETS
        </a>
      </div>
    </div>
  );
}
