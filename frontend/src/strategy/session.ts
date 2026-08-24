// Session engine — Asian / London / New York / overlap, from real
// candle/quote timestamps (UTC-based fixed windows; adjust per broker
// server time if needed).

import type { Session } from "@/types";

export function getSession(timestampMs: number): Session {
  const hourUtc = new Date(timestampMs).getUTCHours();

  const asian = hourUtc >= 0 && hourUtc < 8;
  const london = hourUtc >= 7 && hourUtc < 16;
  const newYork = hourUtc >= 12 && hourUtc < 21;
  const overlap = hourUtc >= 12 && hourUtc < 16;

  if (overlap) return "LONDON_NY_OVERLAP";
  if (london) return "LONDON";
  if (newYork) return "NEW_YORK";
  if (asian) return "ASIAN";
  return "OFF_SESSION";
}

/** Session relevance weight used as a BOP score input, not a hard filter
 *  unless the user explicitly enables sessionFilterEnabled. */
export function sessionWeight(session: Session): number {
  switch (session) {
    case "LONDON_NY_OVERLAP": return 100;
    case "LONDON": return 85;
    case "NEW_YORK": return 80;
    case "ASIAN": return 55;
    case "OFF_SESSION": return 35;
  }
}
