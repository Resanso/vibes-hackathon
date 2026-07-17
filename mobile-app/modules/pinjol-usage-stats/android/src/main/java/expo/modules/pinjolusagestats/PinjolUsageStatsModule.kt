package expo.modules.pinjolusagestats

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.os.Process
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Debug/testing feature, consent-gated on the JS side before this is ever
// called — see root .claude/rules/product-context.md's "Exception:
// consent-based pinjol usage tracking" for the scope this is allowed to
// cover (open count + foreground time for a fixed pinjol app list only,
// never general installed-app enumeration).
class PinjolUsageStatsModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("PinjolUsageStats")

    AsyncFunction("hasUsageAccess") {
      hasUsageAccess()
    }

    Function("openUsageAccessSettings") {
      val context = appContext.reactContext ?: return@Function
      val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      context.startActivity(intent)
    }

    AsyncFunction("getPinjolUsageStats") { packageNames: List<String>, sinceEpochMs: Double, untilEpochMs: Double ->
      queryUsage(packageNames, sinceEpochMs.toLong(), untilEpochMs.toLong())
    }
  }

  private fun hasUsageAccess(): Boolean {
    val context = appContext.reactContext ?: return false
    val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    val mode = appOps.checkOpNoThrow(
      AppOpsManager.OPSTR_GET_USAGE_STATS,
      Process.myUid(),
      context.packageName,
    )
    return mode == AppOpsManager.MODE_ALLOWED
  }

  // queryUsageStats() only exposes pre-aggregated totals with no open
  // count, so this walks raw foreground/background transitions instead —
  // one MOVE_TO_FOREGROUND is one "open", and foreground time is the gap
  // until the matching MOVE_TO_BACKGROUND (or `until`, if still foregrounded).
  private fun queryUsage(packageNames: List<String>, since: Long, until: Long): List<Map<String, Any>> {
    val context = appContext.reactContext ?: return emptyList()
    val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    val events = usm.queryEvents(since, until)
    val wanted = packageNames.toSet()

    val openCounts = mutableMapOf<String, Int>()
    val foregroundMs = mutableMapOf<String, Long>()
    val lastForegroundStart = mutableMapOf<String, Long>()

    val event = UsageEvents.Event()
    while (events.hasNextEvent()) {
      events.getNextEvent(event)
      val pkg = event.packageName
      if (!wanted.contains(pkg)) continue

      when (event.eventType) {
        UsageEvents.Event.MOVE_TO_FOREGROUND -> {
          openCounts[pkg] = (openCounts[pkg] ?: 0) + 1
          lastForegroundStart[pkg] = event.timeStamp
        }
        UsageEvents.Event.MOVE_TO_BACKGROUND -> {
          val start = lastForegroundStart.remove(pkg)
          if (start != null) {
            foregroundMs[pkg] = (foregroundMs[pkg] ?: 0L) + (event.timeStamp - start)
          }
        }
      }
    }
    lastForegroundStart.forEach { (pkg, start) ->
      foregroundMs[pkg] = (foregroundMs[pkg] ?: 0L) + (until - start)
    }

    return packageNames.map { pkg ->
      mapOf(
        "packageName" to pkg,
        "openCount" to (openCounts[pkg] ?: 0),
        "totalForegroundMs" to (foregroundMs[pkg] ?: 0L),
      )
    }
  }
}
