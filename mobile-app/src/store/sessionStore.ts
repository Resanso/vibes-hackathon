import { create } from "zustand";

// Session-only, no persistence — matches CLAUDE.md: "Financial data lives in
// Zustand during session; only sent to backend on explicit action." Phone is
// backend's user identifier (Profile.phone, no auth) — set once in
// Onboarding, reused by every screen that calls the API after it.
interface SessionState {
  phone: string | null;
  name: string | null;
  setIdentity: (phone: string, name?: string) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  phone: null,
  name: null,
  setIdentity: (phone, name) => set({ phone, name: name ?? null }),
}));
