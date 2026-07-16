import { useEffect, useState } from "react";
import { SafeAreaView, ScrollView, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { ApiError, upsertProfile } from "../api/client";
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

type Props = NativeStackScreenProps<RootStackParamList, "FinancialSurvivalCheck">;

interface Draft extends Record<string, string> {
  incomeText: string;
  debtText: string;
  dependentsText: string;
}

const DRAFT_KEY = "financial-survival-check";

const TOTAL_STEPS = 5;
const CURRENT_STEP = 2;

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

function formatRupiah(amount: number): string {
  return `Rp${amount.toLocaleString("id-ID")}`;
}

export function FinancialSurvivalCheck({ navigation }: Props) {
  const phone = useSessionStore((state) => state.phone);

  const [incomeText, setIncomeText] = useState("");
  const [debtText, setDebtText] = useState("");
  const [dependentsText, setDependentsText] = useState("0");
  const [focusedField, setFocusedField] = useState<
    "income" | "debt" | "dependents" | null
  >(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ variant: "success" | "error"; message: string } | null>(
    null,
  );

  useEffect(() => {
    loadDraft<Draft>(DRAFT_KEY).then((draft) => {
      if (draft.incomeText !== undefined) setIncomeText(draft.incomeText);
      if (draft.debtText !== undefined) setDebtText(draft.debtText);
      if (draft.dependentsText !== undefined) setDependentsText(draft.dependentsText);
    });
  }, []);

  useEffect(() => {
    saveDraft<Draft>(DRAFT_KEY, { incomeText, debtText, dependentsText });
  }, [incomeText, debtText, dependentsText]);

  const income = parseAmount(incomeText);
  const debt = parseAmount(debtText);
  const dependents = parseAmount(dependentsText);
  const debtRatioPct = income > 0 ? Math.round((debt / income) * 100) : null;

  const isValid = income > 0;

  const handleSubmit = async () => {
    if (!phone || !isValid) return;

    setSubmitting(true);
    setToast(null);
    try {
      await upsertProfile({
        phone,
        monthlyIncome: income,
        existingMonthlyDebt: debt,
        dependents,
      });
      setToast({ variant: "success", message: "Profil kamu berhasil disimpan." });
      // Brief pause so the confirmation is actually visible before moving on,
      // instead of navigating away the instant the toast appears.
      setTimeout(() => navigation.navigate("BorrowingScenario"), 900);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? "Gagal menyimpan. Coba lagi sebentar lagi."
          : "Tidak bisa terhubung ke server. Cek koneksi internetmu.";
      setToast({ variant: "error", message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="flex-1 px-6 py-6"
        contentContainerStyle={{ gap: 28 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: 12 }}>
          <BackButton
            testID="fsc-back-button"
            onPress={() => navigation.goBack()}
          />
          <StepIndicator />
          <Text className="font-body text-xs" style={{ color: colors.neutral, opacity: 0.6 }}>
            Langkah {CURRENT_STEP} dari {TOTAL_STEPS}
          </Text>
        </View>

        <View style={{ gap: 8 }}>
          <Text className="font-display text-neutral" style={{ fontSize: 24 }}>
            Cek Kondisi Keuanganmu
          </Text>
          <Text className="font-body text-neutral" style={{ opacity: 0.7 }}>
            Data ini cuma dipakai untuk menghitung risiko pinjamanmu — tidak
            dibagikan ke pihak lain.
          </Text>
        </View>

        <View style={{ gap: 16 }}>
          <View style={{ gap: 6 }}>
            <Text className="font-heading text-sm text-neutral">
              Pemasukan bulanan
            </Text>
            <TextInput
              testID="fsc-income-input"
              value={incomeText}
              onChangeText={setIncomeText}
              placeholder="Rp0"
              placeholderTextColor="#475569"
              keyboardType="number-pad"
              onFocus={() => setFocusedField("income")}
              onBlur={() => setFocusedField(null)}
              className="rounded-2xl border px-4 py-3 font-body text-neutral"
              style={{
                borderColor: focusedField === "income" ? colors.secondary : BORDER_GRAY,
              }}
            />
          </View>

          <View style={{ gap: 6 }}>
            <Text className="font-heading text-sm text-neutral">
              Cicilan/utang bulanan yang sudah ada
            </Text>
            <TextInput
              testID="fsc-debt-input"
              value={debtText}
              onChangeText={setDebtText}
              placeholder="Rp0"
              placeholderTextColor="#475569"
              keyboardType="number-pad"
              onFocus={() => setFocusedField("debt")}
              onBlur={() => setFocusedField(null)}
              className="rounded-2xl border px-4 py-3 font-body text-neutral"
              style={{
                borderColor: focusedField === "debt" ? colors.secondary : BORDER_GRAY,
              }}
            />
            {debtRatioPct !== null ? (
              <Text className="font-body text-xs" style={{ color: colors.neutral, opacity: 0.6 }}>
                ≈ {debtRatioPct}% dari pemasukanmu ({formatRupiah(debt)}/bulan)
              </Text>
            ) : null}
          </View>

          <View style={{ gap: 6 }}>
            <Text className="font-heading text-sm text-neutral">
              Jumlah tanggungan (opsional)
            </Text>
            <TextInput
              testID="fsc-dependents-input"
              value={dependentsText}
              onChangeText={setDependentsText}
              placeholder="0"
              placeholderTextColor="#475569"
              keyboardType="number-pad"
              onFocus={() => setFocusedField("dependents")}
              onBlur={() => setFocusedField(null)}
              className="rounded-2xl border px-4 py-3 font-body text-neutral"
              style={{
                borderColor: focusedField === "dependents" ? colors.secondary : BORDER_GRAY,
              }}
            />
          </View>
        </View>

        {toast ? (
          <StatusToast
            message={toast.message}
            variant={toast.variant}
            onDismiss={() => setToast(null)}
          />
        ) : null}

        <PrimaryButton
          testID="fsc-submit-button"
          label={submitting ? "Menyimpan..." : "Simpan"}
          onPress={handleSubmit}
          disabled={!isValid || submitting}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
