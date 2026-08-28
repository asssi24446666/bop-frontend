// Registers this device for push notifications, only when running
// inside the installed Android app (Capacitor) — a plain browser tab
// has no native push channel, so this quietly no-ops there instead
// of erroring.

import { PushNotifications } from "@capacitor/push-notifications";

function resolveApiBase(): string {
  const base = import.meta.env.VITE_API_BASE_URL;
  return base ? base.replace(/\/$/, "") : "";
}

async function registerTokenWithBackend(token: string): Promise<void> {
  const base = resolveApiBase();
  if (!base) return;
  try {
    await fetch(${base}/api/push/register, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, platform: "android" })
    });
  } catch {
    // Non-fatal — notifications just won't reach this device until a
    // future successful registration (e.g. next app launch).
  }
}

export async function setupPushNotifications(): Promise<void> {
  // Capacitor injects window.Capacitor only inside the native shell —
  // this check is what makes the function a safe no-op in a browser.
  const isNativeApp = Boolean((window as any).Capacitor?.isNativePlatform?.());
  if (!isNativeApp) return;

  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== "granted") return;

  await PushNotifications.register();

  PushNotifications.addListener("registration", (token) => {
    registerTokenWithBackend(token.value);
  });

  PushNotifications.addListener("registrationError", () => {
    // Silently give up — the rest of the app works fine without push.
  });
}
