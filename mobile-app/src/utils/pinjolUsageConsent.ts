import * as SecureStore from "expo-secure-store";

// Same SecureStore-native-module-missing fallback pattern as
// sessionStore.ts's safeGetItem/safeSetItem — duplicated locally rather
// than shared since this is a single tri-state flag, not worth a shared util.
export type PinjolConsentState = "unset" | "granted" | "declined";

const CONSENT_KEY = "nera_pinjol_usage_consent";
let memoryFallback: PinjolConsentState = "unset";
let secureStoreUnavailable = false;

export async function getPinjolUsageConsent(): Promise<PinjolConsentState> {
  if (secureStoreUnavailable) return memoryFallback;
  try {
    const value = await SecureStore.getItemAsync(CONSENT_KEY);
    return value === "granted" || value === "declined" ? value : "unset";
  } catch {
    secureStoreUnavailable = true;
    return memoryFallback;
  }
}

export async function setPinjolUsageConsent(state: "granted" | "declined"): Promise<void> {
  if (secureStoreUnavailable) {
    memoryFallback = state;
    return;
  }
  try {
    await SecureStore.setItemAsync(CONSENT_KEY, state);
  } catch {
    secureStoreUnavailable = true;
    memoryFallback = state;
  }
}
