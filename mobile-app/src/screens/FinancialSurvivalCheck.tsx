import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CreditCard, Lock, PieChart, ShieldCheck, Users, Utensils, Wallet } from "lucide-react-native";

import { ApiError, upsertProfile } from "../api/client";
import { BackButton } from "../components/BackButton";
import { IconCircleField } from "../components/IconCircleField";
import { PrimaryButton } from "../components/PrimaryButton";
import { StatusToast } from "../components/StatusToast";
import { StepProgressHeader } from "../components/StepProgressHeader";
import { colors } from "../theme/colors";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useSessionStore } from "../store/sessionStore";
import { loadDraft, saveDraft } from "../utils/formDraft";

type Props = NativeStackScreenProps<RootStackParamList, "FinancialSurvivalCheck">;

interface Draft extends Record<string, string> {
  incomeText: string;
  expensesText: string;
  debtText: string;
  dependentsText: string;
}

const DRAFT_KEY = "financial-survival-check";
const TOTAL_STEPS = 5;
const CURRENT_STEP = 2;

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
  const [expensesText, setExpensesText] = useState("");
  const [debtText, setDebtText] = useState("");
  const [dependentsText, setDependentsText] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ variant: "success" | "error"; message: string } | null>(
    null,
  );

  useEffect(() => {
    loadDraft<Draft>(DRAFT_KEY).then((draft) => {
      if (draft.incomeText !== undefined) setIncomeText(draft.incomeText);
      if (draft.expensesText !== undefined) setExpensesText(draft.expensesText);
      if (draft.debtText !== undefined) setDebtText(draft.debtText);
      if (draft.dependentsText !== undefined) setDependentsText(draft.dependentsText);
    });
  }, []);

  useEffect(() => {
    saveDraft<Draft>(DRAFT_KEY, { incomeText, expensesText, debtText, dependentsText });
  }, [incomeText, expensesText, debtText, dependentsText]);

  const income = parseAmount(incomeText);
  const expenses = parseAmount(expensesText);
  const debt = parseAmount(debtText);
  const dependents = parseAmount(dependentsText);
  // Mirrors backend/src/server/logic/riskScore.ts's disposable-income
  // calculation — this preview isn't authoritative, the real score always
  // comes from risk.assess, but it's kept in sync so the ratio shown here
  // doesn't contradict what the user sees on the result screen.
  const disposableIncome = Math.max(0, income - expenses);
  const debtRatioPct = disposableIncome > 0 ? Math.round((debt / disposableIncome) * 100) : null;

  const isValid = income > 0;

  const handleSubmit = async () => {
    if (!phone || !isValid) return;

    setSubmitting(true);
    setToast(null);
    try {
      await upsertProfile({
        phone,
        monthlyIncome: income,
        monthlyExpenses: expenses,
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
        className="flex-1 px-6 pt-6"
        contentContainerStyle={{ gap: 24, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
      >
        {navigation.canGoBack() ? (
          <BackButton testID="fsc-back-button" onPress={() => navigation.goBack()} />
        ) : null}

        <StepProgressHeader currentStep={CURRENT_STEP} totalSteps={TOTAL_STEPS} />

        <View style={{ gap: 8 }}>
          <Text className="font-display text-neutral" style={{ fontSize: 24 }}>
            Cek Kondisi Keuanganmu
          </Text>
          <View className="flex-row items-start" style={{ gap: 8 }}>
            <ShieldCheck color={colors.primary} size={18} style={{ marginTop: 2 }} />
            <Text className="flex-1 font-body text-neutral" style={{ opacity: 0.7 }}>
              Biar Nera bisa kasih gambaran yang relevan. Data kamu aman dan
              tidak dibagikan ke siapa pun.
            </Text>
          </View>
        </View>

        <View style={{ gap: 16 }}>
          <IconCircleField
            testID="fsc-income-input"
            icon={Wallet}
            iconTint={`${colors.primary}1F`}
            iconColor={colors.primary}
            label="Pemasukan bulanan"
            value={incomeText}
            onChangeText={setIncomeText}
            placeholder="Contoh: 2.500.000"
            prefix="Rp"
            keyboardType="number-pad"
            helperText="Semua sumber pendapatan, termasuk uang saku & freelance."
          />

          <IconCircleField
            testID="fsc-expenses-input"
            icon={Utensils}
            iconTint={`${colors.warning}1F`}
            iconColor={colors.warning}
            label="Pengeluaran bulanan (kebutuhan sehari-hari)"
            value={expensesText}
            onChangeText={setExpensesText}
            placeholder="Contoh: 1.200.000"
            prefix="Rp"
            keyboardType="number-pad"
            helperText="Makan, transport, kos, dll — bukan cicilan/utang (itu di bawah)."
          />

          <View style={{ gap: 8 }}>
            <IconCircleField
              testID="fsc-debt-input"
              icon={CreditCard}
              iconTint={`${colors.secondary}1F`}
              iconColor={colors.secondary}
              label="Cicilan/utang bulanan yang sudah ada"
              value={debtText}
              onChangeText={setDebtText}
              placeholder="Contoh: 650.000"
              prefix="Rp"
              keyboardType="number-pad"
              helperText="Termasuk paylater, KTA, kartu kredit, dll."
            />
            {debtRatioPct !== null ? (
              <View
                className="flex-row items-center self-start rounded-full px-3 py-2"
                style={{ backgroundColor: `${colors.secondary}14`, gap: 6 }}
              >
                <PieChart color={colors.secondary} size={14} />
                <Text className="font-body text-xs text-neutral">
                  ≈{" "}
                  <Text className="font-heading" style={{ color: colors.secondary }}>
                    {debtRatioPct}%
                  </Text>{" "}
                  dari pemasukan bersihmu setelah pengeluaran ({formatRupiah(debt)}/bulan)
                </Text>
              </View>
            ) : null}
          </View>

          <IconCircleField
            testID="fsc-dependents-input"
            icon={Users}
            iconTint={`${colors.primary}1F`}
            iconColor={colors.primary}
            label="Jumlah tanggungan (opsional)"
            value={dependentsText}
            onChangeText={setDependentsText}
            placeholder="Contoh: 1"
            keyboardType="number-pad"
            helperText="Orang yang menjadi tanggunganmu."
          />
        </View>

        <View
          className="flex-row items-start rounded-2xl px-4 py-4"
          style={{ backgroundColor: `${colors.primary}0D`, gap: 10 }}
        >
          <Lock color={colors.primary} size={18} style={{ marginTop: 2 }} />
          <Text className="flex-1 font-body text-sm text-neutral" style={{ opacity: 0.75 }}>
            Jawabanmu hanya digunakan untuk analisis di perangkatmu. Kamu
            tetap memegang kendali penuh.
          </Text>
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
          showArrow
        />
      </ScrollView>
    </SafeAreaView>
  );
}
