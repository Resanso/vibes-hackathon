package expo.modules.pinjolblocker

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.view.accessibility.AccessibilityEvent

// Runs independently of the React Native JS thread (Android starts this
// whenever the user grants Accessibility permission, regardless of whether
// the app is foregrounded) — reads its on/off state + watched package list
// from SharedPreferences written by PinjolBlockerModule.setBlockingConfig(),
// rather than holding any in-memory link back to JS.
class PinjolBlockerAccessibilityService : AccessibilityService() {
  // A pinjol app with multiple internal screens fires one
  // TYPE_WINDOW_STATE_CHANGED per screen, all with the same packageName —
  // without this, each one would re-launch the blocked-screen Activity and
  // stack/flicker. One redirect per distinct foreground-package change.
  private var lastBlockedPackage: String? = null

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    if (event?.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
    val foregroundPackage = event.packageName?.toString() ?: return

    if (foregroundPackage != lastBlockedPackage) {
      lastBlockedPackage = null
    }

    val prefs = getSharedPreferences(PinjolBlockerModule.PREFS_NAME, Context.MODE_PRIVATE)
    if (!prefs.getBoolean(PinjolBlockerModule.KEY_ENABLED, false)) return

    val watchedPackages = prefs.getStringSet(PinjolBlockerModule.KEY_PACKAGES, emptySet()) ?: emptySet()
    if (watchedPackages.contains(foregroundPackage) && lastBlockedPackage != foregroundPackage) {
      lastBlockedPackage = foregroundPackage
      // Nera's own screen explaining the block, not a SYSTEM_ALERT_WINDOW
      // overlay drawn on top of the pinjol app — see PinjolBlockedScreen.tsx
      // and product-context.md's blocking exception for why.
      val intent = Intent(Intent.ACTION_VIEW, Uri.parse("nera://blocked?app=$foregroundPackage")).apply {
        setPackage(packageName)
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
      }
      startActivity(intent)
    }
  }

  override fun onInterrupt() {}
}
