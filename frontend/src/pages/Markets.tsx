import { DEFAULT_SETTINGS } from "@/types";
import { DataRequired } from "@/components/DataRequired";

export function Markets() {
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
      <DataRequired detail="Market scanner needs a connected data provider to rank live setups by BOP Score, RR, liquidity quality, and confirmation." />
    </div>
  );
}
