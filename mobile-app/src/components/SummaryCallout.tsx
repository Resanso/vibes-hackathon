import { Text, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";

import { colors } from "../theme/colors";

interface SummaryCalloutProps {
  icon: LucideIcon;
  title: string;
  description: string;
  accentColor?: string; // defaults to secondary — the reference's blue callout
  testID?: string;
}

// Thick colored left-border box with icon + bold title + description — used
// for "Apa yang memengaruhi skor ini?" and similar explanatory asides.
export function SummaryCallout({
  icon: Icon,
  title,
  description,
  accentColor = colors.secondary,
  testID,
}: SummaryCalloutProps) {
  return (
    <View
      className="flex-row rounded-2xl py-4 pr-4"
      style={{
        backgroundColor: `${accentColor}14`,
        borderLeftWidth: 4,
        borderLeftColor: accentColor,
        gap: 12,
        paddingLeft: 12,
      }}
      testID={testID}
    >
      <View
        className="items-center justify-center rounded-full"
        style={{ width: 36, height: 36, backgroundColor: `${accentColor}26` }}
      >
        <Icon color={accentColor} size={18} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text className="font-heading text-sm text-neutral">{title}</Text>
        <Text className="font-body text-sm text-neutral" style={{ opacity: 0.7 }}>
          {description}
        </Text>
      </View>
    </View>
  );
}
