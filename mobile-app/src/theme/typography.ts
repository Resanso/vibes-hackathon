// Nera's locked typography roles. Poppins loads via @expo-google-fonts/poppins
// as separate named font families per weight — React Native can't apply an
// arbitrary fontWeight to a custom font, each weight is its own loaded family.
// className equivalents (font-display/text-display, etc.) are defined in
// ../../tailwind.config.js and must stay in sync with these values.
import type { TextStyle } from "react-native";

export const typography: Record<"display" | "heading" | "body", TextStyle> = {
  // H1 — main headline per screen
  display: { fontFamily: "Poppins_700Bold", fontSize: 32 },
  // H2 — sub-section headings
  heading: { fontFamily: "Poppins_600SemiBold", fontSize: 24 },
  // regular content text
  body: { fontFamily: "Poppins_400Regular", fontSize: 16 },
};
