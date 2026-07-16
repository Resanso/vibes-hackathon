import { Pressable, Text } from "react-native";

interface PrimaryButtonProps {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
}

export function PrimaryButton({ label, onPress, disabled }: PrimaryButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      className={`items-center rounded-2xl bg-primary px-6 py-4 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-secondary ${
        disabled ? "opacity-50" : "active:opacity-80"
      }`}
    >
      <Text className="font-heading text-base text-white">{label}</Text>
    </Pressable>
  );
}
