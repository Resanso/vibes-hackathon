import { Image, Text, View } from "react-native";

import { colors } from "../theme/colors";

interface StepProgressHeaderProps {
  currentStep: number;
  totalSteps: number;
  testID?: string;
}

// Small decorative overlapping-circles motif, top-right of the header on
// every onboarding screen in the design reference — distinct from
// Onboarding.tsx's bigger SignatureMark (that one is the hero mark on the
// very first screen only; this is the small recurring corner accent).
export function DecorativeCircles() {
  return (
    <View style={{ width: 64, height: 64 }}>
      <View
        className="absolute rounded-full"
        style={{
          width: 52,
          height: 52,
          top: 0,
          left: 0,
          backgroundColor: colors.primary,
          opacity: 0.12,
        }}
      />
      <View
        className="absolute rounded-full"
        style={{
          width: 40,
          height: 40,
          top: 12,
          left: 18,
          backgroundColor: colors.secondary,
          opacity: 0.18,
        }}
      />
      <View
        className="absolute rounded-full"
        style={{
          width: 10,
          height: 10,
          top: 30,
          left: 32,
          backgroundColor: colors.primary,
        }}
      />
    </View>
  );
}

// Recurring onboarding header: logo + decorative corner accent, segmented
// progress bar, and a "Langkah X dari N" pill — pulled out once so every
// onboarding screen (steps 2-5; step 1/Onboarding has its own hero layout)
// shares identical header behavior instead of copy-pasted markup.
export function StepProgressHeader({ currentStep, totalSteps, testID }: StepProgressHeaderProps) {
  return (
    <View style={{ gap: 16 }} testID={testID}>
      <View className="flex-row items-start justify-between">
        <Image
          source={require("../assets/nera-logo-horizontal.png")}
          style={{ width: 100, height: 32 }}
          resizeMode="contain"
          accessibilityLabel="Nera"
        />
        <DecorativeCircles />
      </View>

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
