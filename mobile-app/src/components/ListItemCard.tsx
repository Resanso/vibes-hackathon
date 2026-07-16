import { Pressable, Text, View } from "react-native";
import { ChevronRight, Star } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";

import { colors } from "../theme/colors";

const BORDER_GRAY = "#CBD5E1";

interface ListItemCardProps {
  icon: LucideIcon;
  iconTint: string;
  iconColor: string;
  title: string;
  description: string;
  featured?: boolean; // left accent border + "Rekomendasi Utama" ribbon
  onPress?: () => void;
  testID?: string;
}

// Icon circle + title + description + chevron — used for alternatives
// (DecisionSupport) and dashboard history rows (SafetyDashboard). The
// featured variant adds a left accent border and a small ribbon tag, for
// the one recommended option in a list.
export function ListItemCard({
  icon: Icon,
  iconTint,
  iconColor,
  title,
  description,
  featured = false,
  onPress,
  testID,
}: ListItemCardProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      testID={testID}
      className="rounded-2xl border px-4 py-4"
      style={{
        borderColor: featured ? colors.secondary : BORDER_GRAY,
        borderLeftWidth: featured ? 4 : 1,
        backgroundColor: featured ? `${colors.secondary}0D` : "white",
        gap: 8,
      }}
    >
      {featured ? (
        <View className="flex-row items-center self-start rounded-full px-2 py-1" style={{ backgroundColor: `${colors.secondary}26`, gap: 4 }}>
          <Star color={colors.secondary} size={12} fill={colors.secondary} />
          <Text className="font-heading text-xs" style={{ color: colors.secondary }}>
            Rekomendasi Utama
          </Text>
        </View>
      ) : null}

      <View className="flex-row items-center" style={{ gap: 12 }}>
        <View
          className="items-center justify-center rounded-full"
          style={{ width: 40, height: 40, backgroundColor: iconTint }}
        >
          <Icon color={iconColor} size={20} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text className="font-heading text-base text-neutral">{title}</Text>
          <Text className="font-body text-sm text-neutral" style={{ opacity: 0.7 }}>
            {description}
          </Text>
        </View>
        {onPress ? <ChevronRight color={colors.neutral} size={20} style={{ opacity: 0.4 }} /> : null}
      </View>
    </Pressable>
  );
}
