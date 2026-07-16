import { Text, View } from "react-native";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react-native";

import { colors } from "../theme/colors";
import type { RiskLabel } from "../api/client";

interface StatusBadgeProps {
  status: RiskLabel;
  testID?: string;
}

// Exactly the 3 locked risk semantics (aman/waspada/bahaya) — never add a
// variant beyond these, per design.md's "never use red for every risk
// state" rule and the product's fixed risk taxonomy.
const CONFIG: Record<RiskLabel, { label: string; color: string; Icon: typeof CheckCircle2 }> = {
  aman: { label: "Aman", color: colors.success, Icon: CheckCircle2 },
  waspada: { label: "Waspada", color: colors.warning, Icon: AlertTriangle },
  bahaya: { label: "Bahaya", color: colors.error, Icon: XCircle },
};

export function StatusBadge({ status, testID }: StatusBadgeProps) {
  const { label, color, Icon } = CONFIG[status];

  return (
    <View
      className="flex-row items-center self-start rounded-full px-3 py-2"
      style={{ backgroundColor: `${color}26`, gap: 6 }}
      testID={testID}
    >
      <Icon color={color} size={16} />
      <Text className="font-heading text-sm" style={{ color }}>
        {label}
      </Text>
    </View>
  );
}
