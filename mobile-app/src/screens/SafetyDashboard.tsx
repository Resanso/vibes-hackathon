import { useEffect, useState } from "react";
import { ActivityIndicator, SafeAreaView, ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { ApiError, getDashboardTrend, type RiskLabel, type TrendEntry } from "../api/client";
import { TrendChart } from "../components/TrendChart";
import { colors } from "../theme/colors";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useSessionStore } from "../store/sessionStore";

type Props = NativeStackScreenProps<RootStackParamList, "SafetyDashboard">;

const LABEL_DISPLAY: Record<RiskLabel, string> = {
  aman: "Aman",
  waspada: "Waspada",
  bahaya: "Bahaya",
};

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
  const color = COLOR_BY_LABEL[entry.riskLabel];

  return (
    <View
      className="flex-row items-center justify-between rounded-2xl border px-4 py-4"
      style={{ borderColor: "#CBD5E1" }}
    >
      <View style={{ gap: 4, flex: 1 }}>
        <Text className="font-heading text-sm text-neutral">
          {formatRupiah(entry.principal)}
        </Text>
        <Text className="font-body text-xs text-neutral" style={{ opacity: 0.6 }}>
          {formatDate(entry.createdAt)} · cicilan {formatRupiah(entry.monthlyInstallment)}/bln
        </Text>
      </View>
      <View
        className="rounded-full px-3 py-1"
        style={{ backgroundColor: `${color}26` }}
      >
        <Text className="font-heading text-xs" style={{ color }}>
          {LABEL_DISPLAY[entry.riskLabel]}
        </Text>
      </View>
    </View>
  );
}

// The app's home screen after onboarding — not a numbered onboarding step
// (see FinancialSurvivalCheck/BorrowingScenario/FinancialRiskIntelligence/
// DecisionSupport's 5-step indicator), so no step indicator or back button
// here; reached via navigation.reset from DecisionSupport, which drops the
// onboarding stack once it's done.
export function SafetyDashboard({}: Props) {
  const phone = useSessionStore((state) => state.phone);
  const [entries, setEntries] = useState<TrendEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  const scores = entries.map((e) => e.riskScore);
  const labels = entries.map((e) => e.riskLabel);
  const mostRecentFirst = [...entries].reverse();
  const latest = mostRecentFirst[0];
  const averageScore =
    scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="flex-1 px-6 py-6"
        contentContainerStyle={{ gap: 28 }}
      >
        <View style={{ gap: 8 }}>
          <Text className="font-display text-neutral" style={{ fontSize: 24 }}>
            Dashboard Keamanan Finansialmu
          </Text>
          <Text className="font-body text-neutral" style={{ opacity: 0.7 }}>
            Tren risiko dari setiap pinjaman yang sudah kamu cek.
          </Text>
        </View>

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
                value={`${latest.riskScore} · ${LABEL_DISPLAY[latest.riskLabel]}`}
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

            <View className="items-center" testID="sd-trend-chart">
              <TrendChart scores={scores} labels={labels} width={300} height={160} />
            </View>

            <View style={{ gap: 12 }}>
              {mostRecentFirst.map((entry, i) => (
                <EntryRow key={i} entry={entry} />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
