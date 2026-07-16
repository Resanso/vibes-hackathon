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
import { ListItemCard } from "../components/ListItemCard";
import { BackButton } from "../components/BackButton";
import { PrimaryButton } from "../components/PrimaryButton";
import { StepProgressHeader } from "../components/StepProgressHeader";
import { colors } from "../theme/colors";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "DecisionSupport">;

const TOTAL_STEPS = 5;
const CURRENT_STEP = 5;

const ICON_BY_CATEGORY: Record<string, LucideIcon> = {
  dana_darurat: LifeBuoy,
  koperasi: Users,
  cicilan: GraduationCap,
  beasiswa: GraduationCap,
  pinjaman_lunak: HeartHandshake,
};

// The one alternative the product wants to steer students toward (lowest
// real interest of the seed list) — matches the "Rekomendasi Utama" ribbon
// in the design reference. Not a generic "first item" default.
const FEATURED_CATEGORY = "koperasi";

// Fetch + render the recommendation list — shared between the onboarding
// step (DecisionSupport, below) and the standalone "Alternatif" tab
// (AlternativesTab.tsx), which differ only in their header/CTA chrome.
export function RecommendationList() {
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

  if (loading) {
    return <ActivityIndicator color={colors.primary} testID="ds-loading" />;
  }

  if (errorMessage) {
    return (
      <Text className="font-body text-neutral" style={{ color: colors.error }}>
        {errorMessage}
      </Text>
    );
  }

  const sorted = [...recommendations].sort((a, b) =>
    a.category === FEATURED_CATEGORY ? -1 : b.category === FEATURED_CATEGORY ? 1 : 0,
  );

  return (
    <View style={{ gap: 12 }}>
      {sorted.map((item) => (
        <ListItemCard
          key={item.id}
          testID={`ds-recommendation-${item.id}`}
          icon={ICON_BY_CATEGORY[item.category] ?? ShieldCheck}
          iconTint={`${colors.primary}1F`}
          iconColor={colors.primary}
          title={item.title}
          description={item.description}
          featured={item.category === FEATURED_CATEGORY}
        />
      ))}
    </View>
  );
}

// The onboarding-flow version of this screen (step 5/5) — the standalone
// "Alternatif" tab (AlternativesTab.tsx) reuses RecommendationList above
// with its own lighter header instead of this step chrome + CTA.
export function DecisionSupport({ navigation }: Props) {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 px-6 py-6" contentContainerStyle={{ gap: 24 }}>
        <BackButton testID="ds-back-button" onPress={() => navigation.goBack()} />

        <StepProgressHeader currentStep={CURRENT_STEP} totalSteps={TOTAL_STEPS} />

        <View style={{ gap: 8 }}>
          <Text className="font-display text-neutral" style={{ fontSize: 24 }}>
            Alternatif yang Bisa Kamu Pertimbangkan
          </Text>
          <Text className="font-body text-neutral" style={{ opacity: 0.7 }}>
            Sebelum lanjut ke pinjaman tadi, ini pilihan lain yang tersedia
            di lingkungan kampus.
          </Text>
        </View>

        <RecommendationList />

        <PrimaryButton
          testID="ds-see-dashboard-button"
          label="Selesai, Ke Dashboard"
          onPress={() =>
            // Onboarding (5 steps) is done here — reset instead of push so
            // the tab-based main app becomes home with no "back into onboarding".
            navigation.reset({
              index: 0,
              routes: [{ name: "MainTabs" }],
            })
          }
          showArrow
        />
      </ScrollView>
    </SafeAreaView>
  );
}
