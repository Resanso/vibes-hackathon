// Debug/testing list — see root .claude/rules/product-context.md's
// "Exception: consent-based pinjol usage tracking" section.
//
// These package names are UNVERIFIED. Confirm each one against the actual
// installed app before trusting any number this produces:
//   adb shell pm list packages | grep -i <keyword>
// A wrong package name here just silently returns zero usage for that app
// (queryEvents filters by exact match), so it fails quiet, not loud.
export interface PinjolApp {
  packageName: string;
  label: string;
}

export const PINJOL_APPS: PinjolApp[] = [
  { packageName: "com.finaccel.android", label: "Kredivo" },
  { packageName: "com.akulaku.finance", label: "Akulaku" },
  { packageName: "com.smartfren.kreditpintar", label: "Kredit Pintar" },
];
