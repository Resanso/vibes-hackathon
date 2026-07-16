import Svg, { Circle, Line, Polyline } from "react-native-svg";

import { colors } from "../theme/colors";
import type { RiskLabel } from "../api/client";

interface TrendChartProps {
  scores: number[]; // 0-100, chronological
  labels: RiskLabel[]; // same length as scores, colors each point
  width?: number;
  height?: number;
  testID?: string;
}

const COLOR_BY_LABEL: Record<RiskLabel, string> = {
  aman: colors.success,
  waspada: colors.warning,
  bahaya: colors.error,
};

const PADDING = 16;

// Custom SVG line chart instead of a charting library — no existing
// dependency in this project renders charts, and a single reusable
// line+dots component covers this screen's one use case without adding one.
export function TrendChart({ scores, labels, width = 320, height = 160, testID }: TrendChartProps) {
  const innerWidth = width - PADDING * 2;
  const innerHeight = height - PADDING * 2;

  const yForScore = (score: number) =>
    PADDING + innerHeight - (Math.max(0, Math.min(100, score)) / 100) * innerHeight;

  const points = scores.map((score, i) => ({
    x: PADDING + (scores.length > 1 ? (i / (scores.length - 1)) * innerWidth : innerWidth / 2),
    y: yForScore(score),
  }));

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <Svg width={width} height={height} testID={testID}>
      {/* aman/waspada/bahaya threshold reference lines, matching
          backend/src/server/logic/riskScore.ts's 30/60 cutoffs. */}
      <Line
        x1={PADDING}
        y1={yForScore(30)}
        x2={width - PADDING}
        y2={yForScore(30)}
        stroke={colors.success}
        strokeOpacity={0.3}
        strokeWidth={1}
        strokeDasharray="4,4"
      />
      <Line
        x1={PADDING}
        y1={yForScore(60)}
        x2={width - PADDING}
        y2={yForScore(60)}
        stroke={colors.error}
        strokeOpacity={0.3}
        strokeWidth={1}
        strokeDasharray="4,4"
      />

      {points.length > 1 ? (
        <Polyline
          points={polylinePoints}
          fill="none"
          stroke={colors.neutral}
          strokeOpacity={0.25}
          strokeWidth={2}
        />
      ) : null}

      {points.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={5} fill={COLOR_BY_LABEL[labels[i]]} />
      ))}
    </Svg>
  );
}
