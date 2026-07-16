import { SafeAreaView, ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { BackButton } from "../components/BackButton";
import { PrimaryButton } from "../components/PrimaryButton";
import { RiskScoreGauge } from "../components/RiskScoreGauge";
import { colors } from "../theme/colors";
import type { RiskLabel } from "../api/client";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "FinancialRiskIntelligence">;

const TOTAL_STEPS = 5;
const CURRENT_STEP = 4;

// Real sequence — this is a fixed 5-step onboarding flow, so a step indicator is a
// legitimate use of ordered markers (not the banned decorative 01/02/03).
function StepIndicator() {
  return (
    <View className="flex-row" style={{ gap: 6 }}>
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <View
          key={i}
          className="flex-1 rounded-full"
          style={{
            height: 4,
            backgroundColor: i < CURRENT_STEP ? colors.primary : colors.neutral,
            opacity: i < CURRENT_STEP ? 1 : 0.12,
          }}
        />
      ))}
    </View>
  );
}

// riskLabel→gauge-level mapping lives here (the one place a screen needs
// it) rather than inside RiskScoreGauge, which stays threshold/label
// agnostic per its own comment.
const LEVEL_BY_LABEL: Record<RiskLabel, "success" | "warning" | "error"> = {
  aman: "success",
  waspada: "warning",
  bahaya: "error",
};

// Low-alpha tints of the locked success/warning/error hexes — used only as
// a soft backdrop behind the gauge, not new brand colors.
const TINT_BY_LEVEL: Record<"success" | "warning" | "error", string> = {
  success: "rgba(34,197,94,0.08)",
  warning: "rgba(251,191,36,0.12)",
  error: "rgba(239,68,68,0.08)",
};

const LABEL_DISPLAY: Record<RiskLabel, string> = {
  aman: "Aman",
  waspada: "Waspada",
  bahaya: "Bahaya",
};

function formatRupiah(amount: number): string {
  return `Rp${amount.toLocaleString("id-ID")}`;
}

export function FinancialRiskIntelligence({ navigation, route }: Props) {
  const { assessment } = route.params;
  const level = LEVEL_BY_LABEL[assessment.riskLabel];

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="flex-1 px-6 py-6"
        contentContainerStyle={{ gap: 28 }}
      >
        <View style={{ gap: 12 }}>
          <BackButton
            testID="fri-back-button"
            onPress={() => navigation.goBack()}
          />
          <StepIndicator />
          <Text className="font-body text-xs" style={{ color: colors.neutral, opacity: 0.6 }}>
            Langkah {CURRENT_STEP} dari {TOTAL_STEPS}
          </Text>
        </View>

        <View style={{ gap: 8 }}>
          <Text className="font-display text-neutral" style={{ fontSize: 24 }}>
            Analisis Risiko Pinjamanmu
          </Text>
          <Text className="font-body text-neutral" style={{ opacity: 0.7 }}>
            Berdasarkan kondisi keuangan dan pinjaman yang kamu ceritakan.
          </Text>
        </View>

        <View
          className="items-center rounded-2xl px-6 py-8"
          style={{ backgroundColor: TINT_BY_LEVEL[level] }}
        >
          <RiskScoreGauge
            testID="fri-risk-gauge"
            score={assessment.riskScore}
            label={LABEL_DISPLAY[assessment.riskLabel]}
            level={level}
            size={140}
          />
        </View>

        <View style={{ gap: 8 }}>
          <Text className="font-heading text-sm text-neutral">
            Penjelasan
          </Text>
          <Text className="font-body text-neutral" style={{ opacity: 0.85 }} testID="fri-explanation">
            {assessment.explanation}
          </Text>
        </View>

        {assessment.reasons.length > 0 ? (
          <View style={{ gap: 8 }}>
            <Text className="font-heading text-sm text-neutral">
              Kenapa skornya begini
            </Text>
            <View style={{ gap: 6 }}>
              {assessment.reasons.map((reason, i) => (
                <Text key={i} className="font-body text-neutral" style={{ opacity: 0.7 }}>
                  •  {reason}
                </Text>
              ))}
            </View>
          </View>
        ) : null}

        <View
          className="rounded-2xl border px-4 py-4"
          style={{ borderColor: "#CBD5E1", gap: 6 }}
          testID="fri-cost-summary"
        >
          <Text className="font-heading text-sm text-neutral" style={{ opacity: 0.6 }}>
            Ringkasan biaya
          </Text>
          <Text className="font-body text-neutral">
            Cicilan per bulan: {formatRupiah(assessment.monthlyInstallment)}
          </Text>
          <Text className="font-body text-neutral">
            Total yang harus dibayar: {formatRupiah(assessment.totalRepayment)}
          </Text>
        </View>

        <PrimaryButton
          testID="fri-see-alternatives-button"
          label="Lihat Alternatif Lain"
          onPress={() => navigation.navigate("DecisionSupport")}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
