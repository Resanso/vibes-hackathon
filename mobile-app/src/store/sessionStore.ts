import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

import { getSession, type Profile } from "../api/client";

// Persisted via expo-secure-store (official Expo SDK module, works in
// standard Expo Go/dev-client builds without a native rebuild — unlike the
// AsyncStorage situation noted in ../utils/formDraft.ts) so a logged-in
// student isn't asked to register/login again every app launch. `token` is
// verified server-side on boot via auth.me (see restoreSession) rather than
// trusted just because it's present in storage.
const TOKEN_KEY = "nera_session_token";

interface SessionState {
  phone: string | null;
  name: string | null;
  token: string | null;
  // null = still checking SecureStore/auth.me; false = checked, no valid
  // session; true = checked, session restored. App.tsx's boot screen keys
  // off this to avoid a Login-screen flash before the check finishes.
  isRestoring: boolean;
  onboardingCompletedAt: string | null;
  setSession: (profile: Profile, token: string) => Promise<void>;
  restoreSession: () => Promise<void>;
  clearSession: () => Promise<void>;
}

export const useSessionStore = create<SessionState>((set) => ({
  phone: null,
  name: null,
  token: null,
  isRestoring: true,
  onboardingCompletedAt: null,

  setSession: async (profile, token) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    set({
      phone: profile.phone,
      name: profile.name,
      token,
      onboardingCompletedAt: profile.onboardingCompletedAt,
      isRestoring: false,
    });
  },

  restoreSession: async () => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
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
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      set({ phone: null, name: null, token: null, onboardingCompletedAt: null, isRestoring: false });
    }
  },

  // Used by both a real "Keluar" action and ProfileTab's testing-only
  // "Reset Onboarding" button — same effect either way: forget the local
  // session so the app boots back into Login next time.
  clearSession: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    set({ phone: null, name: null, token: null, onboardingCompletedAt: null });
  },
}));
