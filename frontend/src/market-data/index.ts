import { BackendMarketDataProvider } from "./providers/BackendMarketDataProvider";
import type { MarketDataProvider } from "./MarketDataProvider";

let instance: MarketDataProvider | null = null;

export function getMarketDataProvider(): MarketDataProvider {
  if (!instance) {
    instance = new BackendMarketDataProvider();
    instance.connect();
  }
  return instance;
}

export type { MarketDataProvider } from "./MarketDataProvider";
