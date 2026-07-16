// Canonical source for className-based styling (bg-primary, font-display, etc).
// Raw hex values also live in src/theme/colors.ts for consumers that can't use
// className (e.g. react-native-svg stroke/fill props) — both must stay in sync,
// see the comment in colors.ts. These are Nera's LOCKED brand tokens — do not
// add or change colors/fonts here without an explicit brand update.
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.tsx", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#6C5CE7",
        secondary: "#4EA8FF",
        success: "#22C55E",
        warning: "#FBBF24",
        error: "#EF4444",
        neutral: "#0F172A",
      },
      fontFamily: {
        display: ["Poppins_700Bold"],
        heading: ["Poppins_600SemiBold"],
        body: ["Poppins_400Regular"],
      },
      fontSize: {
        display: "32px",
        heading: "24px",
        body: "16px",
      },
    },
  },
  plugins: [],
};
