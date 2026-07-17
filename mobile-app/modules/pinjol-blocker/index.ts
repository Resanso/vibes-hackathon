import { Platform } from "react-native";

// Android-only debug/proof-of-concept feature — see root
// .claude/rules/product-context.md's "Exception: consent-based pinjol app
// blocking" section. Not wired to any real anomaly-detection signal yet —
// the toggle in ProfileTab enables/disables blocking directly for testing.
interface NativeModule {
  hasAccessibilityPermission(): Promise<boolean>;
  isBlockingEnabled(): Promise<boolean>;
  openAccessibilitySettings(): void;
  setBlockingConfig(enabled: boolean, packageNames: string[]): void;
}

// Same defensive pattern as pinjol-usage-stats/index.ts and
// sessionStore.ts's SecureStore wrapper — a dev-client build made before
// this module was added throws "Cannot find native module" the first time
// it's touched, not at import time.
let native: NativeModule | null = null;
let unavailable = Platform.OS !== "android";

function getNative(): NativeModule | null {
  if (unavailable) return null;
  if (native) return native;
  try {
    const { requireNativeModule } = require("expo-modules-core");
    native = requireNativeModule("PinjolBlocker") as NativeModule;
    return native;
  } catch {
    unavailable = true;
    return null;
  }
}

export async function hasAccessibilityPermission(): Promise<boolean> {
  const mod = getNative();
  if (!mod) return false;
  try {
    return await mod.hasAccessibilityPermission();
  } catch {
    return false;
  }
}

export async function isBlockingEnabled(): Promise<boolean> {
  const mod = getNative();
  if (!mod) return false;
  try {
    return await mod.isBlockingEnabled();
  } catch {
    return false;
  }
}

export function openAccessibilitySettings(): void {
  getNative()?.openAccessibilitySettings();
}

export function setBlockingConfig(enabled: boolean, packageNames: string[]): void {
  getNative()?.setBlockingConfig(enabled, packageNames);
}
