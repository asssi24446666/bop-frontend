import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.bop.bankofprofit",
  appName: "BOP - Bank of Profit",
  webDir: "dist",
  server: { androidScheme: "https" }
};

export default config;
