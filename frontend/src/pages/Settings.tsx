import { useState } from "react";
import { DEFAULT_SETTINGS } from "@/types";
import type { BopSettings } from "@/types";

export function Settings() {
  const [settings, setSettings] = useState<BopSettings>(DEFAULT_SETTINGS);
  const [advanced, setAdvanced] = useState(false);

  return (
    <div className="page">
      <div className="settings-tabs">
        <button className={`settings-tab${!advanced ? " active" : ""}`} onClick={() => setAdvanced(false)}>SIMPLE</button>
        <button className={`settings-tab${advanced ? " active" : ""}`} onClick={() => setAdvanced(true)}>ADVANCED</button>
      </div>

      {!advanced ? (
        <div className="card">
          <div className="field-row"><span>Asset</span><span className="gold-number">{settings.primaryAsset}</span></div>
          <div className="field-row"><span>Timeframe (HTF / Bias / Setup / Entry)</span>
            <span>{settings.timeframes.htf}/{settings.timeframes.bias}/{settings.timeframes.setup}/{settings.timeframes.entry}</span>
          </div>
          <div className="field-row"><span>Risk %</span><span>{settings.riskPerTradePercent}%</span></div>
          <div className="field-row"><span>Minimum BOP Score</span><span>{settings.minimumBopScore}</span></div>
          <div className="field-row"><span>Minimum RR</span><span>1:{settings.minimumRR.toFixed(1)}</span></div>
          <div className="field-row"><span>Signal Sensitivity</span><span>{settings.signalSensitivity}</span></div>
          <div className="field-row"><span>Trading Mode</span><span>{settings.tradingMode.replace("_", " ")}</span></div>
          <div className="field-row"><span>Notifications</span><span>ON</span></div>
        </div>
      ) : (
        <div className="card">
          <div className="field-row"><span>Liquidity weight</span><span>{settings.weights.liquidity}%</span></div>
          <div className="field-row"><span>Sweep weight</span><span>{settings.weights.sweep}%</span></div>
          <div className="field-row"><span>Confirmation weight</span><span>{settings.weights.confirmation}%</span></div>
          <div className="field-row"><span>HTF alignment weight</span><span>{settings.weights.htfAlignment}%</span></div>
          <div className="field-row"><span>Momentum weight</span><span>{settings.weights.momentum}%</span></div>
          <div className="field-row"><span>Rejection weight</span><span>{settings.weights.rejection}%</span></div>
          <div className="field-row"><span>Volatility weight</span><span>{settings.weights.volatility}%</span></div>
          <div className="field-row"><span>News filter</span><span>{settings.newsFilterEnabled ? `${settings.newsFilterMinutesBefore}m / ${settings.newsFilterMinutesAfter}m` : "OFF"}</span></div>
          <div className="field-row"><span>Session filter</span><span>{settings.sessionFilterEnabled ? "ON" : "OFF (score-only)"}</span></div>
          <div className="field-row"><span>Daily loss limit</span><span>{settings.dailyLossLimitPercent}%</span></div>
          <div className="field-row"><span>Max consecutive losses</span><span>{settings.maxConsecutiveLosses}</span></div>
          <div className="field-row"><span>Strategy version</span><span>{settings.strategyVersion}</span></div>
        </div>
      )}

      <div className="card">
        <div className="card-title">MARKET DATA / NEWS / BROKER</div>
        <div className="field-row"><span>Market Data</span><span style={{ color: "var(--bop-red)" }}>DISCONNECTED</span></div>
        <div className="field-row"><span>News Provider</span><span style={{ color: "var(--bop-red)" }}>NEWS DATA UNAVAILABLE</span></div>
        <div className="field-row"><span>Broker</span><span style={{ color: "var(--bop-red)" }}>NOT CONFIGURED</span></div>
        <p style={{ fontSize: 12, color: "var(--bop-text-dim)" }}>
          Configure providers via the backend .env (see README) — API keys are never entered or stored in this app directly.
        </p>
      </div>
    </div>
  );
}
