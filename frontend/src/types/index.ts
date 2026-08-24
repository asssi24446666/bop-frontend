// ==========================================================
// BOP CORE DOMAIN TYPES
// ==========================================================

export type Instrument =
  | "XAUUSD" | "EURUSD" | "GBPUSD" | "USDJPY" | "USDCHF"
  | "AUDUSD" | "USDCAD" | "BTCUSD" | "ETHUSD"
  | "NAS100" | "US30" | "SPX500" | "WTIUSD";

export type Timeframe = "1M" | "5M" | "15M" | "1H" | "4H" | "1D" | "1W";

export type Direction = "BUY" | "SELL";

export type SignalDecision = "BUY" | "SELL" | "WAIT" | "NO_TRADE";

export interface Candle {
  timestamp: number; // epoch ms, candle open time
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface Quote {
  instrument: Instrument;
  bid: number;
  ask: number;
  last: number;
  timestamp: number;
}

export type ConnectionStatus = "CONNECTED" | "CONNECTING" | "DISCONNECTED" | "ERROR";

export interface ConnectionState {
  status: ConnectionStatus;
  provider: string | null;
  lastUpdate: number | null;
  errorMessage?: string;
}

// ---- Liquidity ----

export type LiquiditySide = "BUY_SIDE" | "SELL_SIDE";

export type LiquiditySourceType =
  | "PDH" | "PDL" | "PWH" | "PWL" | "PSH" | "PSL"
  | "EQUAL_HIGHS" | "EQUAL_LOWS" | "SWING_HIGH" | "SWING_LOW"
  | "CONSOLIDATION_HIGH" | "CONSOLIDATION_LOW";

export interface LiquidityZone {
  id: string;
  instrument: Instrument;
  timeframe: Timeframe;
  side: LiquiditySide;
  sourceType: LiquiditySourceType;
  price: number;
  createdAt: number;
  touches: number;
  consumed: boolean;
  score: number; // 0-100
}

export interface SweepResult {
  isSweep: boolean;
  zone: LiquidityZone | null;
  sweepDistance: number;
  atr: number;
  sweepRatio: number;
  reason: string;
}

export interface RejectionResult {
  wickLength: number;
  candleRange: number;
  rejectionRatio: number;
}

export interface MomentumResult {
  priceMovement: number;
  atr: number;
  momentumRatio: number;
  consecutiveDirectionalCandles: number;
}

export type MarketRegime = "TRENDING" | "RANGING" | "HIGH_VOLATILITY" | "LOW_VOLATILITY" | "UNCLEAR";

export type Bias = "STRONG_BULLISH" | "BULLISH" | "NEUTRAL" | "BEARISH" | "STRONG_BEARISH";

export type VolatilityLevel = "VERY_LOW" | "LOW" | "NORMAL" | "HIGH" | "EXTREME";

export type Session = "ASIAN" | "LONDON" | "NEW_YORK" | "LONDON_NY_OVERLAP" | "OFF_SESSION";

export type SignalSensitivity = "LOW" | "NORMAL" | "HIGH";

export interface BopScoreBreakdown {
  liquidity: number;
  sweep: number;
  confirmation: number;
  htfAlignment: number;
  momentum: number;
  rejection: number;
  volatility: number;
  total: number; // 0-100
  grade: "A++" | "A+" | "B+" | "WATCH" | "NO_TRADE";
}

export interface DiagnosticCheck {
  name: string;
  pass: boolean;
  detail: string;
}

export type SignalStatus =
  | "WATCHING" | "SETUP_FORMING" | "SWEEP_DETECTED" | "CONFIRMED"
  | "ACTIVE" | "PROFIT" | "LOSS" | "EXPIRED" | "CANCELLED" | "REJECTED";

export interface SignalEvent {
  timestamp: number;
  type: SignalStatus | "APPROVED" | "TP" | "SL";
  note?: string;
}

export interface BopSignal {
  id: string;
  instrument: Instrument;
  direction: Direction | null; // null when decision is WAIT/NO_TRADE
  decision: SignalDecision;
  entry: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  riskRewardRatio: number | null;
  bopScore: BopScoreBreakdown;
  diagnostics: DiagnosticCheck[];
  status: SignalStatus;
  events: SignalEvent[];
  reason: string;
  strategyVersion: string;
  htfBias: Bias;
  regime: MarketRegime;
  volatility: VolatilityLevel;
  session: Session;
  createdAt: number;
  activatedAt?: number;
  closedAt?: number;
  exitPrice?: number;
  rMultiple?: number;
  pnlPercent?: number;
}

// ---- Risk ----

export interface RiskSettings {
  riskPerTradePercent: 0.25 | 0.5 | 1.0;
  dailyLossLimitPercent: number;
  maxConsecutiveLosses: number;
  riskLockEnabled: boolean;
}

export interface RiskState {
  accountBalance: number;
  dailyPnlPercent: number;
  dailyPnlR: number;
  consecutiveLosses: number;
  riskLocked: boolean;
  riskLockReason?: string;
}

// ---- Settings ----

export interface BopWeights {
  liquidity: number;
  sweep: number;
  confirmation: number;
  htfAlignment: number;
  momentum: number;
  rejection: number;
  volatility: number;
}

export interface BopSettings {
  primaryAsset: Instrument;
  enabledInstruments: Instrument[];
  timeframes: { htf: Timeframe; bias: Timeframe; setup: Timeframe; entry: Timeframe };
  riskPerTradePercent: 0.25 | 0.5 | 1.0;
  minimumBopScore: number;
  minimumRR: number;
  signalSensitivity: SignalSensitivity;
  tradingMode: "LIVE_ANALYSIS" | "PAPER" | "LIVE_TRADING";
  weights: BopWeights;
  newsFilterEnabled: boolean;
  newsFilterMinutesBefore: number;
  newsFilterMinutesAfter: number;
  sessionFilterEnabled: boolean;
  dailyLossLimitPercent: number;
  maxConsecutiveLosses: number;
  strategyVersion: string;
}

export const DEFAULT_WEIGHTS: BopWeights = {
  liquidity: 25,
  sweep: 25,
  confirmation: 20,
  htfAlignment: 10,
  momentum: 10,
  rejection: 5,
  volatility: 5
};

export const DEFAULT_SETTINGS: BopSettings = {
  primaryAsset: "XAUUSD",
  enabledInstruments: [
    "XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "USDCHF",
    "AUDUSD", "USDCAD", "BTCUSD", "ETHUSD", "NAS100", "US30", "SPX500", "WTIUSD"
  ],
  timeframes: { htf: "4H", bias: "1H", setup: "15M", entry: "5M" },
  riskPerTradePercent: 0.5,
  minimumBopScore: 70,
  minimumRR: 3.0,
  signalSensitivity: "NORMAL",
  tradingMode: "LIVE_ANALYSIS",
  weights: DEFAULT_WEIGHTS,
  newsFilterEnabled: true,
  newsFilterMinutesBefore: 15,
  newsFilterMinutesAfter: 15,
  sessionFilterEnabled: false,
  dailyLossLimitPercent: 2,
  maxConsecutiveLosses: 3,
  strategyVersion: "BOP v1.0"
};

// ---- News ----

export type NewsImpact = "LOW" | "MEDIUM" | "HIGH";

export interface NewsEvent {
  id: string;
  title: string;
  instrument: Instrument | "ALL";
  impact: NewsImpact;
  timestamp: number;
}

// ---- Backtest ----

export interface BacktestConfig {
  instrument: Instrument;
  timeframe: Timeframe;
  startDate: string;
  endDate: string;
  initialBalance: number;
  riskPercent: number;
  minimumBopScore: number;
  minimumRR: number;
  spread: number;
  commissionPerTrade: number;
  slippagePercent: number;
  strategyVersion: string;
  sessionFilter?: Session;
  newsFilterEnabled: boolean;
}

export interface BacktestTrade {
  entryTime: number;
  exitTime: number;
  direction: Direction;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  exit: number;
  rMultiple: number;
  result: "WIN" | "LOSS";
  bopScore: number;
}

export interface BacktestResult {
  trades: BacktestTrade[];
  winRate: number;
  profitFactor: number;
  expectancy: number;
  netR: number;
  maxDrawdownR: number;
  averageR: number;
  bestTradeR: number;
  worstTradeR: number;
  winningStreak: number;
  losingStreak: number;
}
