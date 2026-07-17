import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, Platform, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AlertTriangle, Bell, Calendar1, CircleCheck, Smartphone, Sparkles } from "lucide-react-native";

import {
  ApiError,
  checkInTracking,
  getDashboardTrend,
  getTrackingStatus,
  type RiskLabel,
  type TrackingStatus,
  type TrendEntry,
} from "../api/client";
import { PrimaryButton } from "../components/PrimaryButton";
import { SecondaryButton } from "../components/SecondaryButton";
import { SummaryCallout } from "../components/SummaryCallout";
import { StatusBadge } from "../components/StatusBadge";
import { TrendChart } from "../components/TrendChart";
import { colors } from "../theme/colors";
import { useSessionStore } from "../store/sessionStore";
import { PINJOL_APPS } from "../constants/pinjolApps";
import {
  getPinjolUsageConsent,
  setPinjolUsageConsent,
  type PinjolConsentState,
} from "../utils/pinjolUsageConsent";
import { getPinjolUsageResetMarker } from "../utils/pinjolUsageResetMarker";
import {
  getPinjolUsageStats,
  hasUsageAccess,
  openUsageAccessSettings,
  type PinjolUsageEntry,
} from "../../modules/pinjol-usage-stats";

const COLOR_BY_LABEL: Record<RiskLabel, string> = {
  aman: colors.success,
  waspada: colors.warning,
  bahaya: colors.error,
};

function formatRupiah(amount: number): string {
  return `Rp${amount.toLocaleString("id-ID")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function SummaryCard({
  label,
  value,
  valueColor,
  testID,
}: {
  label: string;
  value: string;
  valueColor?: string;
  testID?: string;
}) {
  return (
    <View
      className="flex-1 rounded-2xl border px-3 py-4"
      style={{ borderColor: "#CBD5E1", gap: 4 }}
      testID={testID}
    >
      <Text className="font-body text-xs text-neutral" style={{ opacity: 0.6 }}>
        {label}
      </Text>
      <Text
        className="font-heading"
        style={{ fontSize: 18, color: valueColor ?? colors.neutral }}
      >
        {value}
      </Text>
    </View>
  );
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes < 60) return `${totalMinutes} menit`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours} jam ${minutes} menit` : `${hours} jam`;
}

// Debug/testing card only — see root .claude/rules/product-context.md's
// "Exception: consent-based pinjol usage tracking" section. Android only,
// hidden entirely on iOS since there's no equivalent API there.
function PinjolUsageCard({
  consent,
  usageAccessGranted,
  stats,
  loading,
  onGrantConsent,
  onDeclineConsent,
  onOpenUsageAccessSettings,
}: {
  consent: PinjolConsentState;
  usageAccessGranted: boolean;
  stats: PinjolUsageEntry[];
  loading: boolean;
  onGrantConsent: () => void;
  onDeclineConsent: () => void;
  onOpenUsageAccessSettings: () => void;
}) {
  if (consent === "declined") return null;

  if (consent === "unset") {
    return (
      <View
        className="rounded-2xl border px-4 py-4"
        style={{ borderColor: "#CBD5E1", gap: 12 }}
        testID="sd-pinjol-consent-card"
      >
        <View className="flex-row items-center" style={{ gap: 8 }}>
          <Smartphone color={colors.primary} size={18} />
          <Text className="font-heading text-sm text-neutral">
            Lacak Kebiasaan Buka Aplikasi Pinjol? (Debug)
          </Text>
        </View>
        <Text className="font-body text-sm text-neutral" style={{ opacity: 0.7 }}>
          Fitur uji coba: Nera bisa menghitung berapa kali dan berapa lama kamu
          membuka aplikasi pinjol tertentu di HP ini, untuk ditampilkan di
          dashboard. Ini butuh akses "Usage Access" di pengaturan Android dan
          hanya membaca data aplikasi pinjol yang terdaftar — bukan semua
          aplikasi, SMS, kontak, atau lokasi.
        </Text>
        <View className="flex-row" style={{ gap: 12 }}>
          <View style={{ flex: 1 }}>
            <SecondaryButton
              label="Tolak"
              onPress={onDeclineConsent}
              testID="sd-pinjol-consent-decline"
            />
          </View>
          <View style={{ flex: 1 }}>
            <PrimaryButton
              label="Izinkan"
              onPress={onGrantConsent}
              testID="sd-pinjol-consent-grant"
            />
          </View>
        </View>
      </View>
    );
  }

  if (!usageAccessGranted) {
    return (
      <View
        className="rounded-2xl border px-4 py-4"
        style={{ borderColor: "#CBD5E1", gap: 12 }}
        testID="sd-pinjol-usage-access-card"
      >
        <View className="flex-row items-center" style={{ gap: 8 }}>
          <Smartphone color={colors.primary} size={18} />
          <Text className="font-heading text-sm text-neutral">
            Aktifkan Usage Access
          </Text>
        </View>
        <Text className="font-body text-sm text-neutral" style={{ opacity: 0.7 }}>
          Kamu sudah setuju, tapi Android butuh kamu mengaktifkan izinnya
          manual di Pengaturan {'>'} Usage Access {'>'} Nera.
        </Text>
        <SecondaryButton
          label="Buka Pengaturan"
          onPress={onOpenUsageAccessSettings}
          testID="sd-pinjol-open-settings"
        />
      </View>
    );
  }

  return (
    <View
      className="rounded-2xl border px-4 py-4"
      style={{ borderColor: "#CBD5E1", gap: 12 }}
      testID="sd-pinjol-usage-stats-card"
    >
      <View className="flex-row items-center" style={{ gap: 8 }}>
        <Smartphone color={colors.primary} size={18} />
        <Text className="font-heading text-sm text-neutral">
          Aktivitas Aplikasi Pinjol (7 hari, Debug)
        </Text>
      </View>
      {loading ? (
        <ActivityIndicator color={colors.primary} testID="sd-pinjol-loading" />
      ) : stats.every((entry) => entry.openCount === 0) ? (
        <Text className="font-body text-sm text-neutral" style={{ opacity: 0.6 }}>
          Tidak ada aktivitas terdeteksi di daftar aplikasi pinjol yang dipantau.
        </Text>
      ) : (
        <View style={{ gap: 10 }}>
          {stats.map((entry) => {
            const app = PINJOL_APPS.find((a) => a.packageName === entry.packageName);
            if (entry.openCount === 0) return null;
            return (
              <View
                key={entry.packageName}
                className="flex-row items-center justify-between"
              >
                <Text className="font-body text-sm text-neutral">
                  {app?.label ?? entry.packageName}
                </Text>
                <Text className="font-body text-xs text-neutral" style={{ opacity: 0.6 }}>
                  {entry.openCount}x dibuka · {formatDuration(entry.totalForegroundMs)}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function EntryRow({ entry }: { entry: TrendEntry }) {
  return (
    <View
      className="flex-row items-center rounded-2xl border px-4 py-4"
      style={{ borderColor: "#CBD5E1", gap: 12 }}
    >
      <View
        className="items-center justify-center rounded-full"
        style={{ width: 36, height: 36, backgroundColor: `${colors.primary}1F` }}
      >
        <Calendar1 color={colors.primary} size={18} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text className="font-heading text-sm text-neutral">{formatDate(entry.createdAt)}</Text>
        <Text className="font-body text-xs text-neutral" style={{ opacity: 0.6 }}>
          Pinjaman {formatRupiah(entry.principal)}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <StatusBadge status={entry.riskLabel} />
        <Text className="font-heading text-sm text-neutral">{entry.riskScore}/100</Text>
      </View>
    </View>
  );
}

// The app's home screen after onboarding — not a numbered onboarding step
// (see FinancialSurvivalCheck/BorrowingScenario/FinancialRiskIntelligence/
// DecisionSupport's 5-step indicator), so no step indicator or back button
// here; reached via navigation.reset from DecisionSupport, which drops the
// onboarding stack once it's done. Also the "Beranda" tab in MainTabNavigator.
export function SafetyDashboard() {
  const phone = useSessionStore((state) => state.phone);
  const name = useSessionStore((state) => state.name);
  const [entries, setEntries] = useState<TrendEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [tracking, setTracking] = useState<TrackingStatus | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const isAndroid = Platform.OS === "android";
  const [pinjolConsent, setPinjolConsentState] = useState<PinjolConsentState>("unset");
  const [pinjolUsageAccessGranted, setPinjolUsageAccessGranted] = useState(false);
  const [pinjolStats, setPinjolStats] = useState<PinjolUsageEntry[]>([]);
  const [pinjolLoading, setPinjolLoading] = useState(false);

  const loadPinjolUsage = useCallback(async () => {
    if (!isAndroid) return;
    const consent = await getPinjolUsageConsent();
    setPinjolConsentState(consent);
    if (consent !== "granted") return;

    const granted = await hasUsageAccess();
    setPinjolUsageAccessGranted(granted);
    if (!granted) return;

    setPinjolLoading(true);
    const until = Date.now();
    const sevenDaysAgo = until - 7 * 24 * 60 * 60 * 1000;
    const resetMarker = await getPinjolUsageResetMarker();
    const since = resetMarker ? Math.max(sevenDaysAgo, resetMarker) : sevenDaysAgo;
    const stats = await getPinjolUsageStats(
      PINJOL_APPS.map((app) => app.packageName),
      since,
      until,
    );
    setPinjolStats(stats);
    setPinjolLoading(false);
  }, [isAndroid]);

  useEffect(() => {
    loadPinjolUsage();
  }, [loadPinjolUsage]);

  const handleGrantPinjolConsent = async () => {
    await setPinjolUsageConsent("granted");
    await loadPinjolUsage();
  };

  const handleDeclinePinjolConsent = async () => {
    await setPinjolUsageConsent("declined");
    setPinjolConsentState("declined");
  };

  // Shared by the initial mount fetch and pull-to-refresh — both trend and
  // tracking data can change independently (a new risk.assess, a check-in
  // from WhatsApp/Telegram), so refresh reloads both, not just one.
  const loadData = useCallback(async () => {
    if (!phone) return;
    setErrorMessage(null);
    try {
      const [trend, trackingStatus] = await Promise.all([
        getDashboardTrend(phone),
        getTrackingStatus(phone).catch(() => null),
      ]);
      setEntries(trend);
      setTracking(trackingStatus);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? "Gagal memuat riwayat. Coba lagi sebentar lagi."
          : "Tidak bisa terhubung ke server. Cek koneksi internetmu.",
      );
    }
  }, [phone]);

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadData(), loadPinjolUsage()]);
    setRefreshing(false);
  };

  const handleCheckIn = async () => {
    if (!phone) return;
    setCheckingIn(true);
    try {
      await checkInTracking(phone);
      const updated = await getTrackingStatus(phone);
      setTracking(updated);
    } catch {
      // Silently retry-able — the check-in button just stays enabled.
    } finally {
      setCheckingIn(false);
    }
  };

  const scores = entries.map((e) => e.riskScore);
  const labels = entries.map((e) => e.riskLabel);
  const mostRecentFirst = [...entries].reverse();
  const latest = mostRecentFirst[0];
  const previous = mostRecentFirst[1];
  const averageScore =
    scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const scoreDelta = latest && previous ? latest.riskScore - previous.riskScore : null;

  // No insets.bottom here — the bottom tab bar (MainTabNavigator) already
  // reserves its own safe-area-bottom space above the home
  // indicator/gesture bar, so this screen's ScrollView never actually
  // extends into that area. Adding insets.bottom on top double-counted it,
  // which only showed up as an oversized gap on devices with a large
  // bottom inset (home-indicator iPhones) and looked fine on others.
  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="flex-1 px-6 pt-6"
        contentContainerStyle={{ gap: 24, paddingBottom: 24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        <View className="flex-row items-start justify-between">
          <Image
            source={require("../assets/nera-logo-horizontal.png")}
            style={{ width: 100, height: 32 }}
            resizeMode="contain"
            accessibilityLabel="Nera"
          />
          <Bell color={colors.neutral} size={20} style={{ opacity: 0.5 }} />
        </View>

        <View style={{ gap: 4 }}>
          <Text className="font-display text-neutral" style={{ fontSize: 22 }}>
            Hai, {name ?? "kamu"} 👋
          </Text>
          <Text className="font-body text-neutral" style={{ opacity: 0.7 }}>
            Terus pantau skormu, ambil keputusan yang lebih aman.
          </Text>
        </View>

        {isAndroid ? (
          <PinjolUsageCard
            consent={pinjolConsent}
            usageAccessGranted={pinjolUsageAccessGranted}
            stats={pinjolStats}
            loading={pinjolLoading}
            onGrantConsent={handleGrantPinjolConsent}
            onDeclineConsent={handleDeclinePinjolConsent}
            onOpenUsageAccessSettings={openUsageAccessSettings}
          />
        ) : null}

        {tracking ? (
          <View
            className="rounded-2xl border px-4 py-4"
            style={{ borderColor: "#CBD5E1", gap: 12 }}
            testID="sd-tracking-card"
          >
            <Text className="font-heading text-sm text-neutral" style={{ opacity: 0.6 }}>
              Progress Pelunasan
            </Text>
            <View>
              <Text className="font-body text-xs text-neutral" style={{ opacity: 0.5 }}>
                Sisa tunggakan
              </Text>
              <Text className="font-display text-neutral" style={{ fontSize: 24 }}>
                {formatRupiah(tracking.remainingAmount)}
              </Text>
              <Text className="font-body text-xs text-neutral" style={{ opacity: 0.5 }}>
                Target harian {formatRupiah(tracking.dailyTargetAmount)} · {tracking.daysConfirmed} hari disisihkan
              </Text>
              <Text
                className="font-body text-xs"
                style={{
                  color: tracking.targetExceedsDisposableIncome ? colors.error : colors.success,
                  opacity: 0.9,
                }}
                testID="sd-daily-disposable-income"
              >
                Sisa harian setelah kebutuhan: {formatRupiah(tracking.dailyDisposableIncome)}
              </Text>
            </View>

            {tracking.targetExceedsDisposableIncome ? (
              <SummaryCallout
                icon={AlertTriangle}
                title="Target harian ini berat buat kondisimu"
                description={`Target harian (${formatRupiah(tracking.dailyTargetAmount)}) lebih besar dari sisa uang harianmu setelah kebutuhan sehari-hari (${formatRupiah(tracking.dailyDisposableIncome)}). Pertimbangkan cari sumber tambahan atau atur ulang rencana pelunasanmu.`}
                accentColor={colors.error}
                testID="sd-target-exceeds-warning"
              />
            ) : null}

            {tracking.confirmedToday ? (
              <View className="flex-row items-center" style={{ gap: 8 }}>
                <CircleCheck color={colors.success} size={18} />
                <Text className="font-body text-sm text-neutral">
                  Sudah disisihkan hari ini. Mantap!
                </Text>
              </View>
            ) : (
              <>
                <SummaryCallout
                  icon={AlertTriangle}
                  title="Jangan sampai gali lubang tutup lubang"
                  description={`Siapkan ${formatRupiah(tracking.dailyTargetAmount)} hari ini supaya tunggakanmu tetap terkendali. Kalau belum sempat, hindari pinjam lagi untuk nutup cicilan ini — itu awal dari spiral utang.`}
                  accentColor={colors.warning}
                  testID="sd-spiral-warning"
                />
                <PrimaryButton
                  testID="sd-check-in-button"
                  label={checkingIn ? "Menyimpan..." : "Sudah Sisihkan Hari Ini"}
                  onPress={handleCheckIn}
                  disabled={checkingIn}
                />
              </>
            )}
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator color={colors.primary} testID="sd-loading" />
        ) : errorMessage ? (
          <Text className="font-body text-neutral" style={{ color: colors.error }}>
            {errorMessage}
          </Text>
        ) : entries.length === 0 ? (
          <View
            className="rounded-2xl border px-4 py-6"
            style={{ borderColor: "#CBD5E1" }}
            testID="sd-empty-state"
          >
            <Text className="font-body text-neutral" style={{ opacity: 0.7 }}>
              Belum ada pinjaman yang diambil. Tandai pinjaman lewat "Saya
              Jadi Ambil Pinjaman Ini" di hasil cek risiko supaya tren-nya
              mulai muncul di sini.
            </Text>
          </View>
        ) : (
          <>
            <View className="flex-row" style={{ gap: 12 }} testID="sd-summary-cards">
              <SummaryCard
                label="Skor Terakhir"
                value={`${latest.riskScore}`}
                valueColor={COLOR_BY_LABEL[latest.riskLabel]}
                testID="sd-summary-latest"
              />
              <SummaryCard
                label="Total Diambil"
                value={`${entries.length}`}
                testID="sd-summary-total"
              />
              <SummaryCard
                label="Rata-rata Skor"
                value={`${averageScore}`}
                testID="sd-summary-average"
              />
            </View>

            <View
              className="rounded-2xl border px-4 py-4"
              style={{ borderColor: "#CBD5E1", gap: 16 }}
            >
              <View className="flex-row items-center justify-between">
                <Text className="font-heading text-sm text-neutral" style={{ opacity: 0.6 }}>
                  Skor Risikomu
                </Text>
                <StatusBadge status={latest.riskLabel} />
              </View>

              <View className="items-center" testID="sd-trend-chart">
                <TrendChart scores={scores} labels={labels} width={280} height={150} />
              </View>

              {scoreDelta !== null ? (
                <View
                  className="flex-row items-start rounded-2xl px-3 py-3"
                  style={{ backgroundColor: `${colors.primary}0D`, gap: 8 }}
                >
                  <Sparkles color={colors.primary} size={16} style={{ marginTop: 2 }} />
                  <Text className="flex-1 font-body text-sm text-neutral" style={{ opacity: 0.75 }}>
                    {scoreDelta === 0
                      ? "Skormu stabil dari cek terakhir."
                      : scoreDelta > 0
                        ? `Skormu naik ${scoreDelta} poin dari cek sebelumnya.`
                        : `Skormu turun ${Math.abs(scoreDelta)} poin dari cek sebelumnya — pertahankan kebiasaan keuangan yang sehat.`}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={{ gap: 12 }}>
              <Text className="font-heading text-sm text-neutral">Pinjaman yang Diambil</Text>
              <View style={{ gap: 12 }}>
                {mostRecentFirst.map((entry, i) => (
                  <EntryRow key={i} entry={entry} />
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
