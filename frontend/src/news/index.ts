import { BackendNewsProvider } from "./providers/BackendNewsProvider";

let instance: BackendNewsProvider | null = null;

export function getNewsProvider(): BackendNewsProvider {
  if (!instance) {
    instance = new BackendNewsProvider();
  }
  return instance;
}

export type { NewsProvider } from "./NewsProvider";
