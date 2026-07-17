import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

import { getSession, type Profile } from "../api/client";

// expo-secure-store is an official Expo SDK module, but like AsyncStorage
// (see ../utils/formDraft.ts) it still needs its native module compiled
// into whatever binary is actually running — a custom dev-client built
// before this dependency was added throws "Cannot find native module
// 'ExpoSecureStore'" the first time any of its functions are called, not at
// import time. These wrappers catch that so the app degrades to an
// in-memory (not persisted across restarts) session instead of crashing —
// swap back to trusting SecureStore directly once every tester has rebuilt
// their dev client (`npx expo run:ios` / `npx expo run:android`) with this
// dependency included.
const memoryFallback = new Map<string, string>();
let secureStoreUnavailable = false;

async function safeSetItem(key: string, value: string): Promise<void> {
  if (secureStoreUnavailable) {
    memoryFallback.set(key, value);
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    secureStoreUnavailable = true;
    memoryFallback.set(key, value);
  }
}

async function safeGetItem(key: string): Promise<string | null> {
  if (secureStoreUnavailable) {
    return memoryFallback.get(key) ?? null;
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    secureStoreUnavailable = true;
    return memoryFallback.get(key) ?? null;
  }
}

async function safeDeleteItem(key: string): Promise<void> {
  if (secureStoreUnavailable) {
    memoryFallback.delete(key);
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    secureStoreUnavailable = true;
    memoryFallback.delete(key);
  }
}

const TOKEN_KEY = "nera_session_token";

interface SessionState {
  phone: string | null;
  name: string | null;
  token: string | null;
  // null = still checking storage/auth.me; false = checked, no valid
  // session; true = checked, session restored. App.tsx's boot screen keys
  // off this to avoid a Login-screen flash before the check finishes.
  isRestoring: boolean;
  onboardingCompletedAt: string | null;
  setSession: (profile: Profile, token: string) => Promise<void>;
  restoreSession: () => Promise<void>;
  clearSession: () => Promise<void>;
  // Testing-only: flips onboardingCompletedAt to null locally, without
  // touching the token/backend — stays logged in, just lets ProfileTab's
  // "Reset Onboarding" button send the user back through
  // FinancialSurvivalCheck onward. Doesn't persist server-side, so a fresh
  // app restart (restoreSession) still lands on MainTabs if the backend's
  // onboardingCompletedAt was never actually cleared.
  markOnboardingIncomplete: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  phone: null,
  name: null,
  token: null,
  isRestoring: true,
  onboardingCompletedAt: null,

  setSession: async (profile, token) => {
    await safeSetItem(TOKEN_KEY, token);
    set({
      phone: profile.phone,
      name: profile.name,
      token,
      onboardingCompletedAt: profile.onboardingCompletedAt,
      isRestoring: false,
    });
  },

  restoreSession: async () => {
    const token = await safeGetItem(TOKEN_KEY);
    if (!token) {
      set({ isRestoring: false });
      return;
    }

    try {
      const profile = await getSession(token);
      set({
        phone: profile.phone,
        name: profile.name,
        token,
        onboardingCompletedAt: profile.onboardingCompletedAt,
        isRestoring: false,
      });
    } catch {
      // Token invalid/expired — same as no session at all.
      await safeDeleteItem(TOKEN_KEY);
      set({ phone: null, name: null, token: null, onboardingCompletedAt: null, isRestoring: false });
    }
  },

  // Real "Keluar" action — forgets the local session so the app boots back
  // into Login next time. Not used by "Reset Onboarding" (see
  // markOnboardingIncomplete below) — that one stays logged in.
  clearSession: async () => {
    await safeDeleteItem(TOKEN_KEY);
    set({ phone: null, name: null, token: null, onboardingCompletedAt: null });
  },

  markOnboardingIncomplete: () => {
    set({ onboardingCompletedAt: null });
  },
}));
