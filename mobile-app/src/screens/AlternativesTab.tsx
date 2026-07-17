import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { RecommendationList } from "./DecisionSupport";

// Standalone "Alternatif" tab — same data/list as the onboarding step
// (DecisionSupport.tsx's RecommendationList), just without the step-progress
// chrome or "Selesai" CTA, since this is reached as a persistent tab, not a
// step in a sequence.
export function AlternativesTab() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 px-6 pt-6" contentContainerStyle={{ gap: 24, paddingBottom: 100 }}>
        <View style={{ gap: 8 }}>
          <Text className="font-display text-neutral" style={{ fontSize: 24 }}>
            Alternatif yang Lebih Aman
          </Text>
          <Text className="font-body text-neutral" style={{ opacity: 0.7 }}>
            Pilihan yang tersedia di lingkungan kampus, lebih ringan dari
            pinjol.
          </Text>
        </View>

        <RecommendationList />
      </ScrollView>
    </SafeAreaView>
  );
}
