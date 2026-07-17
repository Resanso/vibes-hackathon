import { Image, Text, View } from "react-native";

import { colors } from "../theme/colors";

interface StepProgressHeaderProps {
  currentStep: number;
  totalSteps: number;
  testID?: string;
}

// Recurring onboarding header: logo + segmented progress bar + a
// "Langkah X dari N" pill — pulled out once so every onboarding screen
// (steps 2-5; step 1/Onboarding has its own hero layout) shares identical
// header behavior instead of copy-pasted markup.
export function StepProgressHeader({ currentStep, totalSteps, testID }: StepProgressHeaderProps) {
  return (
    <View style={{ gap: 16 }} testID={testID}>
      <Image
        source={require("../assets/nera-logo-horizontal.png")}
        style={{ width: 100, height: 32 }}
        resizeMode="contain"
        accessibilityLabel="Nera"
      />

      <View className="flex-row" style={{ gap: 6 }}>
        {Array.from({ length: totalSteps }, (_, i) => (
          <View
            key={i}
            className="flex-1 rounded-full"
            style={{
              height: 4,
              backgroundColor: i < currentStep ? colors.primary : colors.neutral,
              opacity: i < currentStep ? 1 : 0.12,
            }}
          />
        ))}
      </View>

      <View
        className="self-start rounded-full px-3 py-1"
        style={{ backgroundColor: `${colors.primary}1A` }}
      >
        <Text className="font-heading text-xs" style={{ color: colors.primary }}>
          Langkah {currentStep} dari {totalSteps}
        </Text>
      </View>
    </View>
  );
}
