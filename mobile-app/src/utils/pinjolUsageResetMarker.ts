import * as SecureStore from "expo-secure-store";

// `UsageStatsManager` data is OS-owned and read-only — there's no real way
// to "clear" a student's actual usage history. This stores a local
// timestamp instead: the dashboard only counts activity after this marker,
// so a debug "reset" button in ProfileTab gives testers a fresh baseline
// without touching real device data. Same SecureStore-fallback pattern as
// pinjolUsageConsent.ts.
const RESET_MARKER_KEY = "nera_pinjol_usage_reset_at";
let memoryFallback: number | null = null;
let secureStoreUnavailable = false;

export async function getPinjolUsageResetMarker(): Promise<number | null> {
  if (secureStoreUnavailable) return memoryFallback;
  try {
    const value = await SecureStore.getItemAsync(RESET_MARKER_KEY);
    return value ? Number(value) : null;
  } catch {
    secureStoreUnavailable = true;
    return memoryFallback;
  }
}

export async function setPinjolUsageResetMarker(epochMs: number): Promise<void> {
  if (secureStoreUnavailable) {
    memoryFallback = epochMs;
    return;
  }
  try {
    await SecureStore.setItemAsync(RESET_MARKER_KEY, String(epochMs));
  } catch {
    secureStoreUnavailable = true;
    memoryFallback = epochMs;
  }
}
