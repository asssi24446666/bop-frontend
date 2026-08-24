import type { ConnectionState } from "@/types";

export function ConnectionStatus({ state }: { state: ConnectionState }) {
  const isLive = state.status === "CONNECTED";
  return (
    <div className="status-pill">
      <span className={`dot ${isLive ? "live" : "down"}`} />
      {isLive ? "LIVE" : "DATA CONNECTION REQUIRED"}
    </div>
  );
}
