import { SafeAreaView, Text, View } from "react-native";
import { BookOpen } from "lucide-react-native";

import { colors } from "../theme/colors";

// Placeholder only — no content model/backend exists for education material
// yet. Per the design reference's "Edukasi" tab; deprioritized until there's
// real content to show (see mobile-app/CLAUDE.md's nice-to-have note).
export function EducationPlaceholder() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center px-6" style={{ gap: 16 }}>
        <View
          className="items-center justify-center rounded-full"
          style={{ width: 64, height: 64, backgroundColor: `${colors.primary}1A` }}
        >
          <BookOpen color={colors.primary} size={28} />
        </View>
        <Text className="font-display text-neutral text-center" style={{ fontSize: 20 }}>
          Edukasi
        </Text>
        <Text className="font-body text-neutral text-center" style={{ opacity: 0.6 }}>
          Materi edukasi finansial akan hadir di sini. Belum tersedia untuk
          saat ini.
        </Text>
      </View>
    </SafeAreaView>
  );
}
