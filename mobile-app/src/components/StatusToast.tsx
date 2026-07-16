import { Pressable, Text, View } from "react-native";
import { AlertTriangle, CheckCircle2, X } from "lucide-react-native";

import { colors } from "../theme/colors";

type ToastVariant = "success" | "warning" | "error";

interface StatusToastProps {
  message: string;
  variant: ToastVariant;
  onDismiss?: () => void;
}

const ICON_BY_VARIANT = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertTriangle,
} as const;

export function StatusToast({ message, variant, onDismiss }: StatusToastProps) {
  const color = colors[variant];
  const Icon = ICON_BY_VARIANT[variant];

  return (
    <View
      className="flex-row items-center gap-3 rounded-2xl border bg-white px-4 py-3"
      style={{ borderColor: color }}
      accessibilityRole="alert"
    >
      <Icon color={color} size={22} strokeWidth={2} />
      <Text className="flex-1 font-body text-neutral">{message}</Text>
      {onDismiss ? (
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Tutup notifikasi"
          className="focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-secondary"
        >
          <X color={colors.neutral} size={18} strokeWidth={2} />
        </Pressable>
      ) : null}
    </View>
  );
}
