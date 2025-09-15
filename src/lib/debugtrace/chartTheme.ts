import { ChartConfig, ChartTheme } from "./types";

export const ARGUS_COLORS = {
  primary: "#00bfff",
  primaryDark: "#0099cc",
  primaryLight: "#33ccff",
  secondary: "#8b9dc3",
  background: "#0f1419",
  cardBg: "rgba(25,28,40,0.8)",
  border: "rgba(0,191,255,0.2)",
  text: "#ffffff",
  textSecondary: "#8b9dc3",
  textMuted: "#6b7280",
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
  grid: "rgba(0,191,255,0.1)",
};

export const CHART_COLORS = [
  "#00bfff",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#ec4899",
  "#6366f1",
];

export const OPCODE_COLORS = {
  arithmetic: "#00bfff",
  comparison: "#10b981",
  bitwise: "#f59e0b",
  storage: "#ef4444",
  memory: "#8b5cf6",
  control: "#06b6d4",
  system: "#84cc16",
  crypto: "#f97316",
  other: "#6b7280",
};

export const CONTRACT_COLORS = {
  eoa: "#00bfff",
  contract: "#10b981",
  proxy: "#f59e0b",
  token: "#ef4444",
  defi: "#8b5cf6",
  nft: "#06b6d4",
  unknown: "#6b7280",
};

export const defaultChartTheme: ChartTheme = {
  colors: {
    primary: ARGUS_COLORS.primary,
    secondary: ARGUS_COLORS.secondary,
    success: ARGUS_COLORS.success,
    warning: ARGUS_COLORS.warning,
    error: ARGUS_COLORS.error,
    background: ARGUS_COLORS.background,
    text: ARGUS_COLORS.text,
    grid: ARGUS_COLORS.grid,
  },
  fonts: {
    family: "Inter, system-ui, sans-serif",
    size: {
      small: 12,
      medium: 14,
      large: 16,
    },
  },
};

export const defaultChartConfig: ChartConfig = {
  theme: defaultChartTheme,
  responsive: true,
  animation: true,
  tooltip: {
    enabled: true,
  },
};

export const getColorByIndex = (index: number): string => {
  return CHART_COLORS[index % CHART_COLORS.length];
};

export const getOpcodeColor = (category: string): string => {
  const normalizedCategory = category.toLowerCase();
  return (
    OPCODE_COLORS[normalizedCategory as keyof typeof OPCODE_COLORS] ||
    OPCODE_COLORS.other
  );
};

export const getContractColor = (type: string): string => {
  const normalizedType = type.toLowerCase();
  return (
    CONTRACT_COLORS[normalizedType as keyof typeof CONTRACT_COLORS] ||
    CONTRACT_COLORS.unknown
  );
};

export const generateHeatmapColors = (intensity: number): string => {
  const clampedIntensity = Math.max(0, Math.min(1, intensity));

  if (clampedIntensity === 0) {
    return "rgba(0, 191, 255, 0.1)";
  } else if (clampedIntensity < 0.3) {
    return "rgba(0, 191, 255, 0.3)";
  } else if (clampedIntensity < 0.6) {
    return "rgba(0, 191, 255, 0.6)";
  } else if (clampedIntensity < 0.8) {
    return "rgba(0, 191, 255, 0.8)";
  } else {
    return "rgba(0, 191, 255, 1.0)";
  }
};

export const getSuccessColor = (success: boolean): string => {
  return success ? ARGUS_COLORS.success : ARGUS_COLORS.error;
};

export const getGasIntensityColor = (
  gasUsed: number,
  maxGas: number,
): string => {
  const intensity = gasUsed / maxGas;
  return generateHeatmapColors(intensity);
};
