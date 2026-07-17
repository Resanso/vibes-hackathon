import { Platform } from "react-native";

// Android-only debug feature — see root .claude/rules/product-context.md's
// "Exception: consent-based pinjol usage tracking" section for the consent
// requirement and scope boundary. iOS has no public API for reading another
// app's usage, so this module is never linked on iOS.
export interface PinjolUsageEntry {
  packageName: string;
  openCount: number;
  totalForegroundMs: number;
}

interface NativeModule {
  hasUsageAccess(): Promise<boolean>;
  openUsageAccessSettings(): void;
  getPinjolUsageStats(
    packageNames: string[],
    sinceEpochMs: number,
    untilEpochMs: number,
  ): Promise<PinjolUsageEntry[]>;
}

// Same defensive pattern as sessionStore.ts's SecureStore wrapper: a
// dev-client build made before this module was added throws "Cannot find
// native module" the first time it's touched, not at import time — catch
// that and degrade to "no data" instead of crashing the dashboard.
let native: NativeModule | null = null;
let unavailable = Platform.OS !== "android";

function getNative(): NativeModule | null {
  if (unavailable) return null;
  if (native) return native;
  try {
    // Lazy require so iOS/Expo Go bundles never touch expo-modules-core's
    // native resolution path for a module that isn't linked there.
    const { requireNativeModule } = require("expo-modules-core");
    native = requireNativeModule("PinjolUsageStats") as NativeModule;
    return native;
  } catch {
    unavailable = true;
    return null;
  }
}

export async function hasUsageAccess(): Promise<boolean> {
  const mod = getNative();
  if (!mod) return false;
  try {
    return await mod.hasUsageAccess();
  } catch {
    return false;
  }
}

export function openUsageAccessSettings(): void {
  getNative()?.openUsageAccessSettings();
}

export async function getPinjolUsageStats(
  packageNames: string[],
  sinceEpochMs: number,
  untilEpochMs: number,
): Promise<PinjolUsageEntry[]> {
  const mod = getNative();
  if (!mod) return [];
  try {
    return await mod.getPinjolUsageStats(packageNames, sinceEpochMs, untilEpochMs);
  } catch {
    return [];
  }
}
