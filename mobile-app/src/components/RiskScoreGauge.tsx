import { View, Text } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { colors } from "../theme/colors";

type RiskLevel = "success" | "warning" | "error";

interface RiskScoreGaugeProps {
  score: number; // 0-100
  level: RiskLevel;
  size?: number;
  testID?: string;
}

const STROKE_WIDTH = 10;

// Caller passes `level` explicitly — this component never derives its own
// score→level thresholds. backend's real risk thresholds (aman/waspada/bahaya
// at 30/60) live in backend/src/server/logic/riskScore.ts; keeping this
// component threshold-agnostic avoids a second, divergent copy of that logic.
// High risk (`level="error"`) is the only case that gets colors.error — never
// use red for every risk state, per ../../.claude/rules/design.md.
//
// Just the ring + "score/100" — no side label anymore (design reference
// shows the aman/waspada/bahaya label as a separate StatusBadge next to the
// gauge, not baked into it).
export function RiskScoreGauge({ score, level, size = 120, testID }: RiskScoreGaugeProps) {
  const clampedScore = Math.max(0, Math.min(100, score));
  const radius = (size - STROKE_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - clampedScore / 100);
  const color = colors[level];

  return (
    <View style={{ width: size, height: size }} accessibilityRole="text" testID={testID}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.neutral}
          strokeOpacity={0.1}
          strokeWidth={STROKE_WIDTH}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          fill="none"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View
        className="absolute inset-0 items-center justify-center"
        pointerEvents="none"
      >
        <Text className="font-display text-neutral" style={{ fontSize: size * 0.24 }}>
          {clampedScore}
        </Text>
        <Text className="font-body text-neutral" style={{ fontSize: size * 0.1, opacity: 0.5 }}>
          / 100
        </Text>
      </View>
    </View>
  );
}
