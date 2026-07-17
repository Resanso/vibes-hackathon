import { useState } from "react";
import { Text, TextInput, View, type KeyboardTypeOptions } from "react-native";
import type { LucideIcon } from "lucide-react-native";

import { colors } from "../theme/colors";

const BORDER_GRAY = "#CBD5E1";

interface IconCircleFieldProps {
  icon: LucideIcon;
  iconTint: string; // pastel background behind the icon circle
  iconColor: string; // the icon's own stroke color
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  prefix?: string; // e.g. "Rp"
  suffix?: string; // e.g. "%", "bulan"
  helperText?: string;
  keyboardType?: KeyboardTypeOptions;
  testID?: string;
}

// The recurring form-field pattern across every onboarding screen: a
// pastel-tinted icon circle, bold label, bordered input (with optional
// prefix/suffix like "Rp" or "%"), and small helper text underneath.
export function IconCircleField({
  icon: Icon,
  iconTint,
  iconColor,
  label,
  value,
  onChangeText,
  placeholder,
  prefix,
  suffix,
  helperText,
  keyboardType,
  testID,
}: IconCircleFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View
      className="rounded-2xl border px-4 py-4"
      style={{ borderColor: BORDER_GRAY, gap: 10 }}
    >
      <View className="flex-row items-center" style={{ gap: 10 }}>
        <View
          className="items-center justify-center rounded-full"
          style={{ width: 36, height: 36, backgroundColor: iconTint }}
        >
          <Icon color={iconColor} size={18} />
        </View>
        <Text className="font-heading text-sm text-neutral" style={{ flex: 1 }}>
          {label}
        </Text>
      </View>

      <View
        className="flex-row items-center rounded-xl border px-4 py-3"
        style={{ borderColor: focused ? colors.secondary : BORDER_GRAY, gap: 8 }}
      >
        {prefix ? (
          <Text className="font-heading text-neutral" style={{ opacity: 0.6 }}>
            {prefix}
          </Text>
        ) : null}
        <TextInput
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          keyboardType={keyboardType}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="flex-1 font-body text-neutral"
        />
        {suffix ? (
          <Text className="font-heading text-neutral" style={{ opacity: 0.6 }}>
            {suffix}
          </Text>
        ) : null}
      </View>

      {helperText ? (
        <Text className="font-body text-xs text-neutral" style={{ opacity: 0.55 }}>
          {helperText}
        </Text>
      ) : null}
    </View>
  );
}
