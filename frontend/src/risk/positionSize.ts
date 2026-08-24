// Position sizing from real account balance, risk %, and monetary
// stop distance — never fixed lot sizes blindly applied across
// different instruments.

export interface ContractSpec {
  tickSize: number;
  tickValue: number; // monetary value of one tick, in account currency
}

export function calculatePositionSize(
  accountBalance: number,
  riskPercent: number,
  entry: number,
  stopLoss: number,
  spec: ContractSpec
): number {
  const riskAmount = accountBalance * (riskPercent / 100);
  const stopDistance = Math.abs(entry - stopLoss);
  if (stopDistance === 0 || spec.tickSize === 0) return 0;

  const ticksAtRisk = stopDistance / spec.tickSize;
  const monetaryStopDistance = ticksAtRisk * spec.tickValue;
  if (monetaryStopDistance === 0) return 0;

  return riskAmount / monetaryStopDistance;
}
