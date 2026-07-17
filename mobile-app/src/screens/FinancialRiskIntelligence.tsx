import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Calendar1, CircleCheck, FileText, ShieldCheck, Wallet } from "lucide-react-native";

import { ApiError, startTracking } from "../api/client";
import { BackButton } from "../components/BackButton";
import { PrimaryButton } from "../components/PrimaryButton";
import { RiskScoreGauge } from "../components/RiskScoreGauge";
import { SecondaryButton } from "../components/SecondaryButton";
import { StatusBadge } from "../components/StatusBadge";
import { StatusToast } from "../components/StatusToast";
import { StepProgressHeader } from "../components/StepProgressHeader";
import { SummaryCallout } from "../components/SummaryCallout";
import { colors } from "../theme/colors";
import type { RiskLabel } from "../api/client";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "FinancialRiskIntelligence">;

const TOTAL_STEPS = 5;
const CURRENT_STEP = 4;

// riskLabel→gauge-level mapping lives here (the one place a screen needs
// it) rather than inside RiskScoreGauge, which stays threshold/label
// agnostic per its own comment.
const LEVEL_BY_LABEL: Record<RiskLabel, "success" | "warning" | "error"> = {
  aman: "success",
  waspada: "warning",
  bahaya: "error",
};

const DESCRIPTION_BY_LABEL: Record<RiskLabel, string> = {
  aman: "Pinjaman ini terlihat sehat untuk kondisi keuanganmu saat ini.",
  waspada:
    "Pinjaman ini masih mungkin untukmu, tapi ada beberapa hal yang perlu kamu perhatikan agar tetap aman.",
  bahaya:
    "Pinjaman ini berisiko tinggi untuk kondisi keuanganmu saat ini — pertimbangkan ulang sebelum lanjut.",
};

function formatRupiah(amount: number): string {
  return `Rp${amount.toLocaleString("id-ID")}`;
}

export function FinancialRiskIntelligence({ navigation, route }: Props) {
  const { assessment, standalone } = route.params;
  const level = LEVEL_BY_LABEL[assessment.riskLabel];

  const [trackingState, setTrackingState] = useState<"idle" | "starting" | "started">("idle");
  const [trackingError, setTrackingError] = useState<string | null>(null);

  const handleTakeLoan = async () => {
    setTrackingState("starting");
    setTrackingError(null);
    try {
      await startTracking(assessment.id);
      setTrackingState("started");
    } catch (error) {
      setTrackingState("idle");
      setTrackingError(
        error instanceof ApiError
          ? "Gagal memulai tracking. Coba lagi sebentar lagi."
          : "Tidak bisa terhubung ke server. Cek koneksi internetmu.",
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="flex-1 px-6 pt-6"
        contentContainerStyle={{ gap: 24, paddingBottom: 100 }}
      >
        <BackButton testID="fri-back-button" onPress={() => navigation.goBack()} />

        {standalone ? null : (
          <StepProgressHeader currentStep={CURRENT_STEP} totalSteps={TOTAL_STEPS} />
        )}

        <View style={{ gap: 8 }}>
          <Text className="font-display text-neutral" style={{ fontSize: 24 }}>
            Hasil Skor Risikomu
          </Text>
          <Text className="font-body text-neutral" style={{ opacity: 0.7 }}>
            Ini bukan penilaian diri, tapi alat bantu untuk ambil keputusan
            yang lebih aman.
          </Text>
        </View>

        <View className="flex-row items-center" style={{ gap: 20 }}>
          <RiskScoreGauge
            testID="fri-risk-gauge"
            score={assessment.riskScore}
            level={level}
            size={140}
          />
          <View style={{ flex: 1, gap: 8 }}>
            <StatusBadge status={assessment.riskLabel} />
            <Text className="font-body text-sm text-neutral" style={{ opacity: 0.7 }}>
              {DESCRIPTION_BY_LABEL[assessment.riskLabel]}
            </Text>
          </View>
        </View>

        <SummaryCallout
          icon={FileText}
          title="Apa yang memengaruhi skor ini?"
          description={assessment.explanation}
          testID="fri-explanation"
        />

        {assessment.reasons.length > 0 ? (
          <View style={{ gap: 6 }}>
            {assessment.reasons.map((reason, i) => (
              <Text key={i} className="font-body text-sm text-neutral" style={{ opacity: 0.7 }}>
                •  {reason}
              </Text>
            ))}
          </View>
        ) : null}

        <View style={{ gap: 4 }}>
          <Text className="font-heading text-sm text-neutral">
            Ringkasan Biaya Pinjaman
          </Text>
          <View
            className="rounded-2xl border px-4 py-2"
            style={{ borderColor: "#CBD5E1" }}
            testID="fri-cost-summary"
          >
            <View className="flex-row items-center justify-between py-3">
              <View className="flex-row items-center" style={{ gap: 10 }}>
                <View
                  className="items-center justify-center rounded-full"
                  style={{ width: 32, height: 32, backgroundColor: `${colors.primary}1F` }}
                >
                  <Calendar1 color={colors.primary} size={16} />
                </View>
                <Text className="font-body text-sm text-neutral">
                  Cicilan per bulan (estimasi)
                </Text>
              </View>
              <Text className="font-heading text-sm text-neutral">
                {formatRupiah(assessment.monthlyInstallment)}
              </Text>
            </View>

            <View style={{ height: 1, backgroundColor: "#E2E8F0" }} />

            <View className="flex-row items-center justify-between py-3">
              <View className="flex-row items-center" style={{ gap: 10 }}>
                <View
                  className="items-center justify-center rounded-full"
                  style={{ width: 32, height: 32, backgroundColor: `${colors.primary}1F` }}
                >
                  <Wallet color={colors.primary} size={16} />
                </View>
                <View>
                  <Text className="font-body text-sm text-neutral">
                    Total yang harus dibayar
                  </Text>
                  <Text className="font-body text-xs text-neutral" style={{ opacity: 0.5 }}>
                    (termasuk bunga & biaya)
                  </Text>
                </View>
              </View>
              <Text className="font-heading text-sm text-neutral">
                {formatRupiah(assessment.totalRepayment)}
              </Text>
            </View>
          </View>
        </View>

        <View className="flex-row items-center justify-center" style={{ gap: 6 }}>
          <ShieldCheck color={colors.neutral} size={14} style={{ opacity: 0.5 }} />
          <Text className="font-body text-xs text-neutral" style={{ opacity: 0.5 }}>
            Nera ada untuk bantu kamu ambil keputusan yang lebih aman.
          </Text>
        </View>

        {trackingState === "started" ? (
          <StatusToast
            variant="success"
            message="Sip, pinjaman ini akan di-track. Cek progress pelunasannya di Beranda."
          />
        ) : trackingError ? (
          <StatusToast
            variant="error"
            message={trackingError}
            onDismiss={() => setTrackingError(null)}
          />
        ) : (
          <SecondaryButton
            testID="fri-take-loan-button"
            label={trackingState === "starting" ? "Memproses..." : "Saya Jadi Ambil Pinjaman Ini"}
            onPress={handleTakeLoan}
            disabled={trackingState === "starting"}
          />
        )}

        <View style={{ gap: 12 }}>
          {standalone ? (
            <PrimaryButton
              testID="fri-done-button"
              label="Kembali ke Beranda"
              onPress={() => navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] })}
              showArrow
            />
          ) : (
            <>
              <PrimaryButton
                testID="fri-see-alternatives-button"
                label="Lanjut ke Rekomendasi"
                onPress={() => navigation.navigate("DecisionSupport")}
                showArrow
              />
              <Pressable onPress={() => navigation.goBack()} accessibilityRole="button">
                <Text className="text-center font-heading text-sm" style={{ color: colors.primary }}>
                  Ubah data pinjaman
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
