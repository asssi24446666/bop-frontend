// ==========================================================
// BACKTEST ENGINE — runs the exact same signal engine used live
// against real historical candles (from MarketDataProvider), bar by
// bar, so there is no separate "backtest-only" strategy logic to
// drift out of sync. Includes spread/commission/slippage so results
// aren't fantasy fills, and guards against look-ahead by only ever
// giving the signal engine candles up to and including the current
// bar under evaluation.
// ==========================================================

import type { BacktestConfig, BacktestResult, BacktestTrade, Candle, BopSettings } from "@/types";
import { generateSignal } from "@/strategy/signalEngine";
import { DEFAULT_SETTINGS } from "@/types";

function applyCosts(price: number, direction: "BUY" | "SELL", config: BacktestConfig, isEntry: boolean): number {
  const spreadAdj = config.spread / 2;
  const slippageAdj = price * (config.slippagePercent / 100);
  const sign = direction === "BUY" ? 1 : -1;
  const entrySign = isEntry ? 1 : -1;
  return price + sign * entrySign * (spreadAdj + slippageAdj);
}

/**
 * Walk-forward over real candles. `allCandles` must already be the
 * real historical series for `config.instrument`/`config.timeframe`
 * fetched from a configured MarketDataProvider — this engine performs
 * no data generation of its own.
 */
export function runBacktest(allCandles: Candle[], config: BacktestConfig, settingsOverride?: Partial<BopSettings>): BacktestResult {
  const settings: BopSettings = {
    ...DEFAULT_SETTINGS,
    minimumBopScore: config.minimumBopScore,
    minimumRR: config.minimumRR,
    strategyVersion: config.strategyVersion,
    ...settingsOverride
  };

  const trades: BacktestTrade[] = [];
  const minWindow = 60; // minimum bars of history before evaluating a signal — avoids unrealistic early fills

  for (let i = minWindow; i < allCandles.length; i++) {
    // Look-ahead guard: engine only ever sees candles[0..i], never future bars.
    const windowCandles = allCandles.slice(0, i + 1);
    const signal = generateSignal(config.instrument, windowCandles, settings);

    if (signal.decision !== "BUY" && signal.decision !== "SELL") continue;
    if (!signal.entry || !signal.stopLoss || !signal.takeProfit || !signal.direction) continue;

    const entryFill = applyCosts(signal.entry, signal.direction, config, true);
    const risk = Math.abs(entryFill - signal.stopLoss);
    if (risk === 0) continue;

    // Walk forward bar-by-bar from the signal to find the real exit — no fabricated fills.
    let exit: number | null = null;
    let exitTime = 0;
    for (let j = i + 1; j < allCandles.length; j++) {
      const bar = allCandles[j];
      const hitTP = signal.direction === "BUY" ? bar.high >= signal.takeProfit : bar.low <= signal.takeProfit;
      const hitSL = signal.direction === "BUY" ? bar.low <= signal.stopLoss : bar.high >= signal.stopLoss;
      if (hitSL) { exit = signal.stopLoss; exitTime = bar.timestamp; break; }
      if (hitTP) { exit = signal.takeProfit; exitTime = bar.timestamp; break; }
    }
    if (exit === null) continue; // trade never resolved within available data — excluded, not fabricated

    const exitFill = applyCosts(exit, signal.direction, config, false);
    const reward = signal.direction === "BUY" ? exitFill - entryFill : entryFill - exitFill;
    const rMultiple = reward / risk - config.commissionPerTrade / (config.initialBalance * (config.riskPercent / 100));

    trades.push({
      entryTime: allCandles[i].timestamp,
      exitTime,
      direction: signal.direction,
      entry: entryFill,
      stopLoss: signal.stopLoss,
      takeProfit: signal.takeProfit,
      exit: exitFill,
      rMultiple,
      result: rMultiple > 0 ? "WIN" : "LOSS",
      bopScore: signal.bopScore.total
    });
  }

  return summarize(trades);
}

function summarize(trades: BacktestTrade[]): BacktestResult {
  if (trades.length === 0) {
    return {
      trades: [], winRate: 0, profitFactor: 0, expectancy: 0, netR: 0,
      maxDrawdownR: 0, averageR: 0, bestTradeR: 0, worstTradeR: 0, winningStreak: 0, losingStreak: 0
    };
  }

  const wins = trades.filter((t) => t.result === "WIN");
  const losses = trades.filter((t) => t.result === "LOSS");
  const netR = trades.reduce((sum, t) => sum + t.rMultiple, 0);
  const grossWinR = wins.reduce((sum, t) => sum + t.rMultiple, 0);
  const grossLossR = Math.abs(losses.reduce((sum, t) => sum + t.rMultiple, 0));
  const winRate = wins.length / trades.length;
  const avgWin = wins.length ? grossWinR / wins.length : 0;
  const avgLoss = losses.length ? grossLossR / losses.length : 0;
  const expectancy = winRate * avgWin - (1 - winRate) * avgLoss;

  let equity = 0, peak = 0, maxDD = 0;
  let curWinStreak = 0, curLossStreak = 0, maxWinStreak = 0, maxLossStreak = 0;
  for (const t of trades) {
    equity += t.rMultiple;
    peak = Math.max(peak, equity);
    maxDD = Math.max(maxDD, peak - equity);
    if (t.result === "WIN") { curWinStreak++; curLossStreak = 0; } else { curLossStreak++; curWinStreak = 0; }
    maxWinStreak = Math.max(maxWinStreak, curWinStreak);
    maxLossStreak = Math.max(maxLossStreak, curLossStreak);
  }

  return {
    trades,
    winRate: Math.round(winRate * 1000) / 10,
    profitFactor: grossLossR === 0 ? grossWinR : grossWinR / grossLossR,
    expectancy: Math.round(expectancy * 100) / 100,
    netR: Math.round(netR * 100) / 100,
    maxDrawdownR: Math.round(maxDD * 100) / 100,
    averageR: Math.round((netR / trades.length) * 100) / 100,
    bestTradeR: Math.max(...trades.map((t) => t.rMultiple)),
    worstTradeR: Math.min(...trades.map((t) => t.rMultiple)),
    winningStreak: maxWinStreak,
    losingStreak: maxLossStreak
  };
}
