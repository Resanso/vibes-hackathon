// Nera's locked brand colors. Raw hex values for consumers that can't use a
// NativeWind className (e.g. react-native-svg stroke/fill props). The
// className-based source of truth is ../../tailwind.config.js — both files
// hard-code the same 6 values and must stay in sync; see the comment there
// for why they aren't derived from one shared source.
export const colors = {
  primary: "#6C5CE7",
  secondary: "#4EA8FF",
  success: "#22C55E",
  warning: "#FBBF24",
  error: "#EF4444",
  neutral: "#0F172A",
} as const;

export type ColorName = keyof typeof colors;
