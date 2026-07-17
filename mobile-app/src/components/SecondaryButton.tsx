import { Pressable, Text } from "react-native";

import { colors } from "../theme/colors";

interface SecondaryButtonProps {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  testID?: string;
}

// Same pill shape/sizing as PrimaryButton (rounded-full, 16/24 padding) so
// the two read as one button family — just outlined instead of filled, to
// stay visually secondary.
//
// `style` here MUST be a plain object, not a `(pressed) => {...}` function —
// combined with `className` on a NativeWind-wrapped Pressable, a function
// style is silently dropped (border/padding/background never apply, leaving
// bare unstyled text — confirmed on-device 2026-07-17). Pressed feedback
// comes from the `active:opacity-60` class instead, same as BackButton.
export function SecondaryButton({ label, onPress, disabled, testID }: SecondaryButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      accessibilityRole="button"
      style={{
        borderRadius: 999,
        borderWidth: 2,
        borderColor: colors.neutral,
        backgroundColor: "white",
        paddingVertical: 16,
        paddingHorizontal: 24,
        alignItems: "center",
        opacity: disabled ? 0.5 : 1,
      }}
      className="focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-secondary active:opacity-60"
    >
      <Text className="font-heading text-base text-neutral">{label}</Text>
    </Pressable>
  );
}
