// BrokerProvider / ExecutionProvider — abstraction over any broker
// integration (MetaTrader bridge, broker REST APIs, etc). BOP never
// hardcodes a single broker. Real execution is disabled by default
// (see BopSettings.tradingMode) and must be explicitly configured and
// confirmed by the user before any order can be sent.

import type { Direction, Instrument } from "@/types";

export interface AccountInfo {
  balance: number;
  currency: string;
  broker: string;
}

export interface OrderRequest {
  instrument: Instrument;
  direction: Direction;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  size: number;
}

export interface OrderResult {
  orderId: string;
  status: "FILLED" | "REJECTED" | "PENDING";
  filledPrice?: number;
  reason?: string;
}

export interface BrokerProvider {
  readonly name: string;
  isConnected(): boolean;
  getAccountInfo(): Promise<AccountInfo | null>;
}

export interface ExecutionProvider {
  readonly name: string;
  /** Real order placement. Must throw/reject unless LIVE_TRADING mode
   *  is explicitly enabled in settings AND the user has confirmed. */
  placeOrder(order: OrderRequest): Promise<OrderResult>;
  closePosition(orderId: string): Promise<OrderResult>;
}

export class NoBrokerProvider implements BrokerProvider {
  readonly name = "none";
  isConnected(): boolean {
    return false;
  }
  async getAccountInfo(): Promise<AccountInfo | null> {
    return null;
  }
}

export class DisabledExecutionProvider implements ExecutionProvider {
  readonly name = "disabled";
  async placeOrder(): Promise<OrderResult> {
    return {
      orderId: "",
      status: "REJECTED",
      reason: "Live broker execution is not configured. Enable and confirm LIVE_TRADING mode in Settings first."
    };
  }
  async closePosition(): Promise<OrderResult> {
    return { orderId: "", status: "REJECTED", reason: "No broker connected." };
  }
}
