import { Pressable, Text } from "react-native";

interface SecondaryButtonProps {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
}

export function SecondaryButton({ label, onPress, disabled }: SecondaryButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      className={`items-center rounded-2xl border-2 border-neutral bg-white px-6 py-4 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-secondary ${
        disabled ? "opacity-50" : "active:opacity-70"
      }`}
    >
      <Text className="font-heading text-base text-neutral">{label}</Text>
    </Pressable>
  );
}
