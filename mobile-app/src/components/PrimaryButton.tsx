import { Pressable, Text, View } from "react-native";
import { ArrowRight } from "lucide-react-native";

import { colors } from "../theme/colors";

interface PrimaryButtonProps {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  testID?: string;
  showArrow?: boolean; // trailing arrow, matches the design reference's "Lanjut →" buttons
}

// Glossy "gummy" pill treatment (rounded-full, top-lit highlight, soft
// colored shadow) — built from plain Views/opacity bands instead of a
// gradient library. expo-linear-gradient depends on a native module that
// wasn't compiled into the currently installed dev-client build, so this
// approximates the same glossy look with zero native dependencies (works on
// any client, no rebuild needed).
export function PrimaryButton({ label, onPress, disabled, testID, showArrow }: PrimaryButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      accessibilityRole="button"
      style={({ pressed }) => ({
        borderRadius: 999,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: disabled ? 0 : pressed ? 0.2 : 0.4,
        shadowRadius: 14,
        elevation: disabled ? 0 : 6,
        opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
      })}
      className="focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-secondary"
    >
      <View
        style={{
          borderRadius: 999,
          paddingVertical: 16,
          paddingHorizontal: 24,
          alignItems: "center",
          overflow: "hidden",
          backgroundColor: colors.primary,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.25)",
        }}
      >
        {/* Fake-gradient top highlight: 3 fading bands standing in for a
            real gradient. */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "20%",
            backgroundColor: "rgba(255,255,255,0.35)",
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: "20%",
            left: 0,
            right: 0,
            height: "20%",
            backgroundColor: "rgba(255,255,255,0.18)",
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: "40%",
            left: 0,
            right: 0,
            height: "15%",
            backgroundColor: "rgba(255,255,255,0.08)",
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "25%",
            backgroundColor: "rgba(0,0,0,0.08)",
          }}
        />
        <View className="flex-row items-center" style={{ gap: 8 }}>
          <Text className="font-heading text-base text-white">{label}</Text>
          {showArrow ? <ArrowRight color="white" size={18} /> : null}
        </View>
      </View>
    </Pressable>
  );
}
