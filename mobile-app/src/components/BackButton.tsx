import { Pressable } from "react-native";
import { ArrowLeft } from "lucide-react-native";

import { colors } from "../theme/colors";

interface BackButtonProps {
  onPress: () => void;
  testID?: string;
}

export function BackButton({ onPress, testID }: BackButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel="Kembali"
      hitSlop={8}
      className="h-10 w-10 items-center justify-center rounded-full focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-secondary active:opacity-60"
    >
      <ArrowLeft color={colors.neutral} size={22} />
    </Pressable>
  );
}
