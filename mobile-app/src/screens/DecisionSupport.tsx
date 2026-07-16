import { useEffect, useState } from "react";
import { ActivityIndicator, SafeAreaView, ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  GraduationCap,
  HeartHandshake,
  LifeBuoy,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react-native";

import { ApiError, listRecommendations, type Recommendation } from "../api/client";
import { BackButton } from "../components/BackButton";
import { PrimaryButton } from "../components/PrimaryButton";
import { colors } from "../theme/colors";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "DecisionSupport">;

const TOTAL_STEPS = 5;
const CURRENT_STEP = 5;

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

const ICON_BY_CATEGORY: Record<string, LucideIcon> = {
  dana_darurat: LifeBuoy,
  koperasi: Users,
  cicilan: GraduationCap,
  beasiswa: GraduationCap,
  pinjaman_lunak: HeartHandshake,
};

function RecommendationCard({ item }: { item: Recommendation }) {
  const Icon = ICON_BY_CATEGORY[item.category] ?? ShieldCheck;

  return (
    <View
      className="flex-row rounded-2xl border px-4 py-4"
      style={{ borderColor: "#CBD5E1", gap: 12 }}
      testID={`ds-recommendation-${item.id}`}
    >
      <View
        className="items-center justify-center rounded-full"
        style={{ width: 40, height: 40, backgroundColor: "rgba(34,197,94,0.1)" }}
      >
        <Icon color={colors.success} size={20} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text className="font-heading text-base text-neutral">{item.title}</Text>
        <Text className="font-body text-sm text-neutral" style={{ opacity: 0.7 }}>
          {item.description}
        </Text>
      </View>
    </View>
  );
}

export function DecisionSupport({ navigation }: Props) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    listRecommendations()
      .then(setRecommendations)
      .catch((error) => {
        setErrorMessage(
          error instanceof ApiError
            ? "Gagal memuat alternatif. Coba lagi sebentar lagi."
            : "Tidak bisa terhubung ke server. Cek koneksi internetmu.",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="flex-1 px-6 py-6"
        contentContainerStyle={{ gap: 28 }}
      >
        <View style={{ gap: 12 }}>
          <BackButton
            testID="ds-back-button"
            onPress={() => navigation.goBack()}
          />
          <StepIndicator />
          <Text className="font-body text-xs" style={{ color: colors.neutral, opacity: 0.6 }}>
            Langkah {CURRENT_STEP} dari {TOTAL_STEPS}
          </Text>
        </View>

        <View style={{ gap: 8 }}>
          <Text className="font-display text-neutral" style={{ fontSize: 24 }}>
            Alternatif yang Bisa Kamu Pertimbangkan
          </Text>
          <Text className="font-body text-neutral" style={{ opacity: 0.7 }}>
            Sebelum lanjut ke pinjaman tadi, ini pilihan lain yang tersedia
            di lingkungan kampus.
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} testID="ds-loading" />
        ) : errorMessage ? (
          <Text className="font-body text-neutral" style={{ color: colors.error }}>
            {errorMessage}
          </Text>
        ) : (
          <View style={{ gap: 12 }}>
            {recommendations.map((item) => (
              <RecommendationCard key={item.id} item={item} />
            ))}
          </View>
        )}

        <PrimaryButton
          testID="ds-see-dashboard-button"
          label="Selesai, Ke Dashboard"
          onPress={() =>
            // Onboarding (5 steps) is done here — reset instead of push so
            // Dashboard becomes the app's home with no "back into onboarding".
            navigation.reset({
              index: 0,
              routes: [{ name: "SafetyDashboard" }],
            })
          }
        />
      </ScrollView>
    </SafeAreaView>
  );
}
