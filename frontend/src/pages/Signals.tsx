import { useEffect, useState } from "react";
import type { BopSignal } from "@/types";
import { getAllSignals } from "@/signals/signalStore";
import { SignalCard } from "@/components/SignalCard";
import { DataRequired } from "@/components/DataRequired";

export function Signals() {
  const [signals, setSignals] = useState<BopSignal[]>([]);

  useEffect(() => {
    getAllSignals().then(setSignals);
  }, []);

  return (
    <div className="page">
      {signals.length === 0 ? (
        <DataRequired detail="No signals yet. Signals are generated only from real, connected market data — none are fabricated while disconnected." />
      ) : (
        signals.map((s) => <SignalCard key={s.id} signal={s} />)
      )}
    </div>
  );
}
