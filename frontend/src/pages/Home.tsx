import { useEffect, useState } from "react";
import { getMarketDataProvider } from "@/market-data";
import type { ConnectionState } from "@/types";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { DataRequired } from "@/components/DataRequired";
import { DEFAULT_SETTINGS } from "@/types";

export function Home() {
  const [conn, setConn] = useState<ConnectionState>(getMarketDataProvider().getConnectionState());

  useEffect(() => {
    const provider = getMarketDataProvider();
    setConn(provider.getConnectionState());
    return provider.onConnectionStateChange(setConn);
  }, []);

  const isLive = conn.status === "CONNECTED";

  return (
    <div className="page">
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="card-title" style={{ marginBottom: 0 }}>PRIMARY MARKET · {DEFAULT_SETTINGS.primaryAsset}</div>
          <ConnectionStatus state={conn} />
        </div>
      </div>

      {!isLive ? (
        <DataRequired detail="Connect XAU/USD to a real market-data provider to see live price, bias, regime, volatility, and the BOP Score." />
      ) : (
        <div className="card">
          <div className="grid-2">
            <div><div className="stat-label">Current Price</div><div className="stat-value">—</div></div>
            <div><div className="stat-label">24H Change</div><div className="stat-value">—</div></div>
            <div><div className="stat-label">Market Bias</div><div className="stat-value">—</div></div>
            <div><div className="stat-label">Market Regime</div><div className="stat-value">—</div></div>
            <div><div className="stat-label">Volatility</div><div className="stat-value">—</div></div>
            <div><div className="stat-label">BOP Score</div><div className="stat-value gold-number">—</div></div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-title">BEST CURRENT SETUP</div>
        {!isLive ? (
          <p style={{ fontSize: 13, color: "var(--bop-text-dim)" }}>
            NO TRADE — data connection required before any setup can be evaluated.
          </p>
        ) : (
          <p style={{ fontSize: 13, color: "var(--bop-text-dim)" }}>
            No valid setup currently meets BOP requirements.
          </p>
        )}
      </div>

      <div className="card" style={{ textAlign: "center" }}>
        <button className="btn primary" style={{ width: "100%" }} disabled={!isLive}>
          SCAN MARKETS
        </button>
      </div>
    </div>
  );
}
