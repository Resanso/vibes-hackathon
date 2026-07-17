import { useEffect, useState } from "react";
import {
  Keyboard,
  ScrollView,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Calendar1, Eye, FileText, Percent, Wallet } from "lucide-react-native";

import { ApiError, assessRisk } from "../api/client";
import { BackButton } from "../components/BackButton";
import { IconCircleField } from "../components/IconCircleField";
import { PrimaryButton } from "../components/PrimaryButton";
import { StatusToast } from "../components/StatusToast";
import { StepProgressHeader } from "../components/StepProgressHeader";
import { colors } from "../theme/colors";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useSessionStore } from "../store/sessionStore";
import { loadDraft, saveDraft } from "../utils/formDraft";

type Props = NativeStackScreenProps<RootStackParamList, "BorrowingScenario">;

interface Draft extends Record<string, string> {
  principalText: string;
  interestRateText: string;
  serviceFeeText: string;
  tenorText: string;
}

const DRAFT_KEY = "borrowing-scenario";
const TOTAL_STEPS = 5;
const CURRENT_STEP = 3;

function parseAmount(text: string): number {
  const digits = text.replace(/[^0-9]/g, "");
  return digits ? Number(digits) : 0;
}

function parseRate(text: string): number {
  const cleaned = text.replace(/[^0-9.]/g, "");
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : 0;
}

function formatRupiah(amount: number): string {
  return `Rp${amount.toLocaleString("id-ID")}`;
}

// Mirrors backend/src/server/logic/simulateLoan.ts's flat-rate formula, kept
// in sync manually — no shared package between mobile-app and backend (same
// reasoning as api/client.ts). Used only for the live before-you-submit
// preview; the number that actually gets saved comes from risk.assess.
function previewMonthlyInstallment(
  principal: number,
  interestRatePct: number,
  serviceFee: number,
  tenorMonths: number,
): { monthlyInstallment: number; totalRepayment: number } | null {
  if (principal <= 0 || tenorMonths <= 0) return null;
  const totalInterest = principal * (interestRatePct / 100) * (tenorMonths / 12);
  const totalRepayment = Math.ceil(principal + totalInterest + serviceFee);
  const monthlyInstallment = Math.ceil(totalRepayment / tenorMonths);
  return { monthlyInstallment, totalRepayment };
}

export function BorrowingScenario({ navigation, route }: Props) {
  const phone = useSessionStore((state) => state.phone);
  const standalone = route.params?.standalone ?? false;

  const [principalText, setPrincipalText] = useState("");
  const [interestRateText, setInterestRateText] = useState("");
  const [serviceFeeText, setServiceFeeText] = useState("0");
  const [tenorText, setTenorText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ variant: "success" | "error"; message: string } | null>(
    null,
  );

  useEffect(() => {
    loadDraft<Draft>(DRAFT_KEY).then((draft) => {
      if (draft.principalText !== undefined) setPrincipalText(draft.principalText);
      if (draft.interestRateText !== undefined) setInterestRateText(draft.interestRateText);
      if (draft.serviceFeeText !== undefined) setServiceFeeText(draft.serviceFeeText);
      if (draft.tenorText !== undefined) setTenorText(draft.tenorText);
    });
  }, []);

  useEffect(() => {
    saveDraft<Draft>(DRAFT_KEY, {
      principalText,
      interestRateText,
      serviceFeeText,
      tenorText,
    });
  }, [principalText, interestRateText, serviceFeeText, tenorText]);

  const principal = parseAmount(principalText);
  const interestRatePct = parseRate(interestRateText);
  const serviceFee = parseAmount(serviceFeeText);
  const tenorMonths = parseAmount(tenorText);

  const preview = previewMonthlyInstallment(
    principal,
    interestRatePct,
    serviceFee,
    tenorMonths,
  );

  const isValid = principal > 0 && tenorMonths > 0;

  const handleSubmit = async () => {
    if (!phone || !isValid) return;

    setSubmitting(true);
    setToast(null);
    try {
      const result = await assessRisk({
        phone,
        principal,
        interestRatePct,
        serviceFee,
        tenorMonths,
      });
      navigation.navigate("FinancialRiskIntelligence", { assessment: result, standalone });
    } catch (error) {
      const message =
        error instanceof ApiError
          ? "Gagal menilai pinjaman. Coba lagi sebentar lagi."
          : "Tidak bisa terhubung ke server. Cek koneksi internetmu.";
      setToast({ variant: "error", message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          className="flex-1 px-6 pt-6"
          contentContainerStyle={{ gap: 24, paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
        >
          <BackButton testID="bs-back-button" onPress={() => navigation.goBack()} />

          {standalone ? null : (
            <StepProgressHeader currentStep={CURRENT_STEP} totalSteps={TOTAL_STEPS} />
          )}

          <View style={{ gap: 8 }}>
            <Text className="font-display text-neutral" style={{ fontSize: 24 }}>
              Ceritakan Pinjaman yang Kamu Pertimbangkan
            </Text>
            <Text className="font-body text-neutral" style={{ opacity: 0.7 }}>
              Isi detailnya — kamu bisa lihat perkiraan total biayanya di
              bawah sebelum memutuskan apa-apa.
            </Text>
          </View>

          <View style={{ gap: 16 }}>
            <IconCircleField
              testID="bs-principal-input"
              icon={Wallet}
              iconTint={`${colors.primary}1F`}
              iconColor={colors.primary}
              label="Nominal pinjaman"
              value={principalText}
              onChangeText={setPrincipalText}
              placeholder="Contoh: 5.000.000"
              prefix="Rp"
              keyboardType="number-pad"
            />

            <IconCircleField
              testID="bs-interest-rate-input"
              icon={Percent}
              iconTint={`${colors.secondary}1F`}
              iconColor={colors.secondary}
              label="Suku bunga per tahun"
              value={interestRateText}
              onChangeText={setInterestRateText}
              placeholder="Contoh: 24"
              suffix="%"
              keyboardType="decimal-pad"
            />

            <IconCircleField
              testID="bs-service-fee-input"
              icon={FileText}
              iconTint={`${colors.primary}1F`}
              iconColor={colors.primary}
              label="Biaya layanan/admin (opsional)"
              value={serviceFeeText}
              onChangeText={setServiceFeeText}
              placeholder="Contoh: 150.000"
              suffix="Rp"
              keyboardType="number-pad"
            />

            <IconCircleField
              testID="bs-tenor-input"
              icon={Calendar1}
              iconTint={`${colors.secondary}1F`}
              iconColor={colors.secondary}
              label="Tenor / jangka waktu"
              value={tenorText}
              onChangeText={setTenorText}
              placeholder="Contoh: 6"
              suffix="bulan"
              keyboardType="number-pad"
            />
          </View>

          {preview ? (
            <View
              className="rounded-2xl px-4 py-4"
              style={{ backgroundColor: `${colors.secondary}0D`, gap: 8 }}
              testID="bs-cost-preview"
            >
              <View className="flex-row items-center" style={{ gap: 6 }}>
                <Eye color={colors.secondary} size={16} />
                <Text className="font-heading text-sm" style={{ color: colors.secondary }}>
                  Ringkasan Skenario
                </Text>
              </View>
              <Text className="font-body text-sm text-neutral">
                Jika kamu meminjam{" "}
                <Text className="font-heading" style={{ color: colors.secondary }}>
                  {formatRupiah(principal)}
                </Text>{" "}
                dengan bunga{" "}
                <Text className="font-heading" style={{ color: colors.secondary }}>
                  {interestRatePct}%
                </Text>{" "}
                per tahun, biaya layanan{" "}
                <Text className="font-heading" style={{ color: colors.secondary }}>
                  {formatRupiah(serviceFee)}
                </Text>
                , selama{" "}
                <Text className="font-heading" style={{ color: colors.secondary }}>
                  {tenorMonths} bulan
                </Text>
                , cicilanmu sekitar{" "}
                <Text className="font-heading" style={{ color: colors.secondary }}>
                  {formatRupiah(preview.monthlyInstallment)}
                </Text>
                /bulan dengan total{" "}
                <Text className="font-heading" style={{ color: colors.secondary }}>
                  {formatRupiah(preview.totalRepayment)}
                </Text>
                .
              </Text>
            </View>
          ) : null}

          {toast ? (
            <StatusToast
              message={toast.message}
              variant={toast.variant}
              onDismiss={() => setToast(null)}
            />
          ) : null}

          <PrimaryButton
            testID="bs-submit-button"
            label={submitting ? "Menghitung..." : "Lanjut"}
            onPress={handleSubmit}
            disabled={!isValid || submitting}
            showArrow
          />
        </ScrollView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}
