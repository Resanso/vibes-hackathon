package expo.modules.pinjolblocker

import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Context
import android.content.Intent
import android.provider.Settings
import android.view.accessibility.AccessibilityManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Debug/proof-of-concept only — see root .claude/rules/product-context.md's
// "Exception: consent-based pinjol app blocking" section for the scope this
// is allowed to cover (foreground-package watching + home-screen redirect
// for a fixed pinjol app list, manually toggled from ProfileTab; not wired
// to any real anomaly-detection signal yet).
class PinjolBlockerModule : Module() {
  companion object {
    const val PREFS_NAME = "pinjol_blocker_prefs"
    const val KEY_ENABLED = "enabled"
    const val KEY_PACKAGES = "packages"
  }

  override fun definition() = ModuleDefinition {
    Name("PinjolBlocker")

    AsyncFunction("hasAccessibilityPermission") {
      hasAccessibilityPermission()
    }

    AsyncFunction("isBlockingEnabled") {
      val context = appContext.reactContext
      if (context != null) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).getBoolean(KEY_ENABLED, false)
      } else {
        false
      }
    }

    Function("openAccessibilitySettings") {
      val context = appContext.reactContext
      if (context != null) {
        val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
      }
    }

    Function("setBlockingConfig") { enabled: Boolean, packageNames: List<String> ->
      val context = appContext.reactContext
      if (context != null) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
          .edit()
          .putBoolean(KEY_ENABLED, enabled)
          .putStringSet(KEY_PACKAGES, packageNames.toSet())
          .apply()
      }
    }
  }

  private fun hasAccessibilityPermission(): Boolean {
    val context = appContext.reactContext ?: return false
    val manager = context.getSystemService(Context.ACCESSIBILITY_SERVICE) as AccessibilityManager
    val enabledServices = manager.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK)
    return enabledServices.any {
      it.resolveInfo.serviceInfo.packageName == context.packageName &&
        it.resolveInfo.serviceInfo.name == PinjolBlockerAccessibilityService::class.java.name
    }
  }
}
