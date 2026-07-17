import * as SecureStore from "expo-secure-store";

// Deliberately minimal: timestamp + source app package only — NEVER the
// notification title/text itself. ThreatDetector.ts processes that raw
// content in memory and discards it (see root
// .claude/rules/product-context.md's "Known gap" entry on the
// notification-listener feature); adding a dashboard history for this
// must not turn into a reason to start persisting message content.
export interface ThreatDetectionEvent {
  id: string;
  detectedAt: string; // ISO string
  sourceApp: string; // package name, e.g. "com.finaccel.android"
}

const LOG_KEY = "nera_threat_detection_log";
const MAX_ENTRIES = 30;

let memoryFallback: ThreatDetectionEvent[] = [];
let secureStoreUnavailable = false;

export async function getThreatDetectionLog(): Promise<ThreatDetectionEvent[]> {
  if (secureStoreUnavailable) return memoryFallback;
  try {
    const raw = await SecureStore.getItemAsync(LOG_KEY);
    return raw ? (JSON.parse(raw) as ThreatDetectionEvent[]) : [];
  } catch {
    secureStoreUnavailable = true;
    return memoryFallback;
  }
}

export async function recordThreatDetection(sourceApp: string): Promise<void> {
  const existing = await getThreatDetectionLog();
  const updated = [
    { id: `${Date.now()}`, detectedAt: new Date().toISOString(), sourceApp },
    ...existing,
  ].slice(0, MAX_ENTRIES);

  if (secureStoreUnavailable) {
    memoryFallback = updated;
    return;
  }
  try {
    await SecureStore.setItemAsync(LOG_KEY, JSON.stringify(updated));
  } catch {
    secureStoreUnavailable = true;
    memoryFallback = updated;
  }
}

export async function clearThreatDetectionLog(): Promise<void> {
  memoryFallback = [];
  try {
    await SecureStore.deleteItemAsync(LOG_KEY);
  } catch {
    secureStoreUnavailable = true;
  }
}
