import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Polygon, Line, Circle } from "react-native-svg";

import { colors } from "@/constants/theme";

export interface TasteProfileData {
  sweet: number; // 0 to 10
  savory: number; // 0 to 10
  spicy: number; // 0 to 10
  sour: number; // 0 to 10
  bitter: number; // 0 to 10
}

interface TasteRadarChartProps {
  data?: TasteProfileData;
  size?: number;
}

const defaultData: TasteProfileData = {
  sweet: 7.5,
  savory: 8.5,
  spicy: 6.0,
  sour: 4.5,
  bitter: 3.0,
};

const AXES: { key: keyof TasteProfileData; label: string }[] = [
  { key: "sweet", label: "Sweet" },
  { key: "savory", label: "Savory" },
  { key: "spicy", label: "Spicy" },
  { key: "sour", label: "Sour" },
  { key: "bitter", label: "Bitter" },
];

export function TasteRadarChart({ data = defaultData, size = 260 }: TasteRadarChartProps) {
  const center = size / 2;
  const radius = center - 45; // Leave room for labels
  const numAxes = AXES.length;
  const angleStep = (2 * Math.PI) / numAxes;
  const startAngle = -Math.PI / 2; // Top vertex

  // Calculate outer grid vertices (100% level)
  const getCoordinates = (valueNormalized: number, index: number) => {
    const angle = startAngle + index * angleStep;
    const r = radius * valueNormalized;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  // Concentric grid levels (20%, 40%, 60%, 80%, 100%)
  const levels = [0.2, 0.4, 0.6, 0.8, 1.0];

  // User data polygon points
  const polygonPoints = AXES.map((axis, i) => {
    const rawVal = data[axis.key] ?? 0;
    const normalized = Math.min(Math.max(rawVal / 10, 0.05), 1.0);
    const { x, y } = getCoordinates(normalized, i);
    return `${x},${y}`;
  }).join(" ");

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background Grid Pentagons */}
        {levels.map((lvl) => {
          const points = AXES.map((_, i) => {
            const { x, y } = getCoordinates(lvl, i);
            return `${x},${y}`;
          }).join(" ");
          return (
            <Polygon
              key={lvl}
              points={points}
              fill="none"
              stroke={colors.border}
              strokeWidth={lvl === 1 ? 1.5 : 1}
              strokeDasharray={lvl === 1 ? undefined : "3,3"}
            />
          );
        })}

        {/* Axis Lines */}
        {AXES.map((_, i) => {
          const { x, y } = getCoordinates(1, i);
          return (
            <Line
              key={i}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke={colors.border}
              strokeWidth={1}
            />
          );
        })}

        {/* Data Filled Polygon */}
        <Polygon
          points={polygonPoints}
          fill="rgba(255, 107, 0, 0.25)"
          stroke={colors.primary}
          strokeWidth={2.5}
        />

        {/* Data Points (Dots on vertices) */}
        {AXES.map((axis, i) => {
          const rawVal = data[axis.key] ?? 0;
          const normalized = Math.min(Math.max(rawVal / 10, 0.05), 1.0);
          const { x, y } = getCoordinates(normalized, i);
          return <Circle key={i} cx={x} cy={y} r={4} fill={colors.primary} />;
        })}
      </Svg>

      {/* Axis Labels positioned absolutely */}
      {AXES.map((axis, i) => {
        const { x, y } = getCoordinates(1.22, i);
        return (
          <View
            key={axis.key}
            style={[
              styles.labelWrap,
              {
                left: x - 40,
                top: y - 12,
              },
            ]}
          >
            <Text style={styles.labelText}>{axis.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    marginVertical: 10,
  },
  labelWrap: {
    position: "absolute",
    width: 80,
    alignItems: "center",
  },
  labelText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.ink,
    textAlign: "center",
  },
});
