import { useEffect, useState } from "react";
import { ActivityIndicator, Image, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AlertTriangle, Bell, Calendar1, CircleCheck, Sparkles } from "lucide-react-native";

import {
  ApiError,
  checkInTracking,
  getDashboardTrend,
  getTrackingStatus,
  type RiskLabel,
  type TrackingStatus,
  type TrendEntry,
} from "../api/client";
import { DecorativeCircles } from "../components/StepProgressHeader";
import { PrimaryButton } from "../components/PrimaryButton";
import { SummaryCallout } from "../components/SummaryCallout";
import { StatusBadge } from "../components/StatusBadge";
import { TrendChart } from "../components/TrendChart";
import { colors } from "../theme/colors";
import { useSessionStore } from "../store/sessionStore";

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
          Skenario: Pinjaman {formatRupiah(entry.principal)}
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

  useEffect(() => {
    if (!phone) return;
    getDashboardTrend(phone)
      .then(setEntries)
      .catch((error) => {
        setErrorMessage(
          error instanceof ApiError
            ? "Gagal memuat riwayat. Coba lagi sebentar lagi."
            : "Tidak bisa terhubung ke server. Cek koneksi internetmu.",
        );
      })
      .finally(() => setLoading(false));
  }, [phone]);

  useEffect(() => {
    if (!phone) return;
    getTrackingStatus(phone)
      .then(setTracking)
      .catch(() => undefined);
  }, [phone]);

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

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="flex-1 px-6 pt-6"
        contentContainerStyle={{ gap: 24, paddingBottom: 100 }}
      >
        <View className="flex-row items-start justify-between">
          <Image
            source={require("../assets/nera-logo-horizontal.png")}
            style={{ width: 100, height: 32 }}
            resizeMode="contain"
            accessibilityLabel="Nera"
          />
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <DecorativeCircles />
            <Bell color={colors.neutral} size={20} style={{ opacity: 0.5 }} />
          </View>
        </View>

        <View style={{ gap: 4 }}>
          <Text className="font-display text-neutral" style={{ fontSize: 22 }}>
            Hai, {name ?? "kamu"} 👋
          </Text>
          <Text className="font-body text-neutral" style={{ opacity: 0.7 }}>
            Terus pantau skormu, ambil keputusan yang lebih aman.
          </Text>
        </View>

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
            </View>

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
                  description="Kalau belum sisihkan uang hari ini, hindari pinjam lagi untuk nutup cicilan ini — itu awal dari spiral utang."
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
              Belum ada riwayat. Cek risiko pinjaman pertamamu dulu supaya
              tren-nya mulai muncul di sini.
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
                label="Total Dicek"
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
              <Text className="font-heading text-sm text-neutral">Cek Sebelumnya</Text>
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
