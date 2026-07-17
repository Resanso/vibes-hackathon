import { Pressable, Text, View } from "react-native";

import { colors } from "../theme/colors";

interface SegmentedToggleOption<T extends string> {
  value: T;
  label: string;
  testID?: string;
}

interface SegmentedToggleProps<T extends string> {
  options: [SegmentedToggleOption<T>, SegmentedToggleOption<T>];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}

// Two-segment pill toggle — active side filled primary + white bold text,
// inactive side transparent + neutral text. Used for binary choices like
// notification channel (WhatsApp/Telegram) instead of two separate buttons.
export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: SegmentedToggleProps<T>) {
  const [left, right] = options;

  return (
    <View
      className="flex-row rounded-full border"
      style={{ borderColor: "#CBD5E1", padding: 4, opacity: disabled ? 0.5 : 1 }}
    >
      {[left, right].map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => !disabled && onChange(option.value)}
            disabled={disabled}
            testID={option.testID}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={{
              flex: 1,
              borderRadius: 999,
              paddingVertical: 10,
              alignItems: "center",
              backgroundColor: active ? colors.primary : "transparent",
            }}
          >
            <Text
              className="font-heading text-sm"
              style={{ color: active ? "white" : colors.neutral }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
