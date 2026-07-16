import { useEffect, useState } from "react";
import {
  Keyboard,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { ApiError, assessRisk } from "../api/client";
import { BackButton } from "../components/BackButton";
import { PrimaryButton } from "../components/PrimaryButton";
import { StatusToast } from "../components/StatusToast";
import { colors } from "../theme/colors";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useSessionStore } from "../store/sessionStore";
import { loadDraft, saveDraft } from "../utils/formDraft";

// Neutral UI-chrome gray for input borders — not part of the locked brand
// palette in colors.ts (that table is brand intent colors only), just a
// standard light border tone for a cleaner input look.
const BORDER_GRAY = "#CBD5E1";

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

export function BorrowingScenario({ navigation }: Props) {
  const phone = useSessionStore((state) => state.phone);

  const [principalText, setPrincipalText] = useState("");
  const [interestRateText, setInterestRateText] = useState("");
  const [serviceFeeText, setServiceFeeText] = useState("0");
  const [tenorText, setTenorText] = useState("");
  const [focusedField, setFocusedField] = useState<
    "principal" | "interestRate" | "serviceFee" | "tenor" | null
  >(null);
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
      navigation.navigate("FinancialRiskIntelligence", { assessment: result });
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
          className="flex-1 px-6 py-6"
          contentContainerStyle={{ gap: 28 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ gap: 12 }}>
            <BackButton
              testID="bs-back-button"
              onPress={() => navigation.goBack()}
            />
            <StepIndicator />
            <Text className="font-body text-xs" style={{ color: colors.neutral, opacity: 0.6 }}>
              Langkah {CURRENT_STEP} dari {TOTAL_STEPS}
            </Text>
          </View>

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
            <View style={{ gap: 6 }}>
              <Text className="font-heading text-sm text-neutral">
                Jumlah pinjaman
              </Text>
              <TextInput
                testID="bs-principal-input"
                value={principalText}
                onChangeText={setPrincipalText}
                placeholder="Rp0"
                placeholderTextColor="#475569"
                keyboardType="number-pad"
                onFocus={() => setFocusedField("principal")}
                onBlur={() => setFocusedField(null)}
                className="rounded-2xl border px-4 py-3 font-body text-neutral"
                style={{
                  borderColor: focusedField === "principal" ? colors.secondary : BORDER_GRAY,
                }}
              />
            </View>

            <View style={{ gap: 6 }}>
              <Text className="font-heading text-sm text-neutral">
                Bunga per tahun (%)
              </Text>
              <TextInput
                testID="bs-interest-rate-input"
                value={interestRateText}
                onChangeText={setInterestRateText}
                placeholder="0"
                placeholderTextColor="#475569"
                keyboardType="decimal-pad"
                onFocus={() => setFocusedField("interestRate")}
                onBlur={() => setFocusedField(null)}
                className="rounded-2xl border px-4 py-3 font-body text-neutral"
                style={{
                  borderColor: focusedField === "interestRate" ? colors.secondary : BORDER_GRAY,
                }}
              />
            </View>

            <View style={{ gap: 6 }}>
              <Text className="font-heading text-sm text-neutral">
                Biaya layanan/admin (opsional)
              </Text>
              <TextInput
                testID="bs-service-fee-input"
                value={serviceFeeText}
                onChangeText={setServiceFeeText}
                placeholder="Rp0"
                placeholderTextColor="#475569"
                keyboardType="number-pad"
                onFocus={() => setFocusedField("serviceFee")}
                onBlur={() => setFocusedField(null)}
                className="rounded-2xl border px-4 py-3 font-body text-neutral"
                style={{
                  borderColor: focusedField === "serviceFee" ? colors.secondary : BORDER_GRAY,
                }}
              />
            </View>

            <View style={{ gap: 6 }}>
              <Text className="font-heading text-sm text-neutral">
                Tenor (bulan)
              </Text>
              <TextInput
                testID="bs-tenor-input"
                value={tenorText}
                onChangeText={setTenorText}
                placeholder="0"
                placeholderTextColor="#475569"
                keyboardType="number-pad"
                onFocus={() => setFocusedField("tenor")}
                onBlur={() => setFocusedField(null)}
                className="rounded-2xl border px-4 py-3 font-body text-neutral"
                style={{
                  borderColor: focusedField === "tenor" ? colors.secondary : BORDER_GRAY,
                }}
              />
            </View>
          </View>

          {preview ? (
            <View
              className="rounded-2xl border px-4 py-4"
              style={{ borderColor: BORDER_GRAY, gap: 6 }}
              testID="bs-cost-preview"
            >
              <Text className="font-heading text-sm text-neutral" style={{ opacity: 0.6 }}>
                Perkiraan sebelum kamu memutuskan
              </Text>
              <Text className="font-body text-neutral">
                Cicilan per bulan: {formatRupiah(preview.monthlyInstallment)}
              </Text>
              <Text className="font-body text-neutral">
                Total yang harus dibayar: {formatRupiah(preview.totalRepayment)}
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
            label={submitting ? "Menghitung..." : "Cek Risikonya"}
            onPress={handleSubmit}
            disabled={!isValid || submitting}
          />
        </ScrollView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}
