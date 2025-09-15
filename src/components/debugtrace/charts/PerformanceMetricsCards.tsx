import { PerformanceMetric } from "@/lib/debugtrace/types";
import {
  FaArrowTrendUp,
  FaArrowTrendDown,
  FaArrowRightLong,
} from "react-icons/fa6";

interface PerformanceMetricsCardsProps {
  metrics: PerformanceMetric[];
  className?: string;
}

const getTrendDisplay = (trend?: "up" | "down" | "stable") => {
  switch (trend) {
    case "up":
      return {
        color: "text-[#10b981]",
        bgColor: "bg-[rgba(16,185,129,0.1)] p-2 rounded-md",
        label: <FaArrowTrendUp className="h-4 w-4" />,
      };
    case "down":
      return {
        color: "text-[#ef4444]",
        bgColor: "bg-[rgba(239,68,68,0.1)] p-2 rounded-md",
        label: <FaArrowTrendDown className="h-4 w-4" />,
      };
    case "stable":
      return {
        color: "text-[#8b9dc3]",
        bgColor: "bg-[rgba(139,157,195,0.1)] p-2 rounded-md",
        label: <FaArrowRightLong className="h-4 w-4" />,
      };
    default:
      return null;
  }
};

const getScoreColor = (value: number | string, benchmark?: number) => {
  if (typeof value !== "number" || !benchmark) {
    return "text-[#00bfff]";
  }

  const ratio = value / benchmark;
  if (ratio >= 0.9) return "text-[#10b981]";
  if (ratio >= 0.7) return "text-[#f59e0b]";
  return "text-[#ef4444]";
};

const formatMetricValue = (value: number | string, unit?: string) => {
  if (typeof value === "number") {
    const formatted = value >= 1000 ? value.toLocaleString() : value.toString();
    return unit ? `${formatted} ${unit}` : formatted;
  }
  return value;
};

export function PerformanceMetricsCards({
  metrics,
  className = "",
}: PerformanceMetricsCardsProps) {
  if (!metrics || metrics.length === 0) {
    return (
      <div
        className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}
      >
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-4"
          >
            <div className="animate-pulse">
              <div className="h-4 bg-[rgba(0,191,255,0.2)] rounded mb-2"></div>
              <div className="h-8 bg-[rgba(0,191,255,0.1)] rounded mb-2"></div>
              <div className="h-3 bg-[rgba(0,191,255,0.1)] rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}
    >
      {metrics.map((metric, index) => {
        const trendDisplay = getTrendDisplay(metric.trend);
        const scoreColor = getScoreColor(metric.value, metric.benchmark);

        return (
          <div
            key={index}
            className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-4 hover:bg-[rgba(15,20,25,0.9)] transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-[#8b9dc3] truncate">
                {metric.name}
              </h4>

              {trendDisplay && (
                <div
                  className={`flex items-center gap-1 px-2 py-1 rounded-full ${trendDisplay.bgColor}`}
                >
                  <div className={`${trendDisplay.color} text-sm font-bold`}>
                    {trendDisplay.label}
                  </div>
                </div>
              )}
            </div>

            <div className="mb-2">
              <div className={`text-2xl font-bold ${scoreColor}`}>
                {formatMetricValue(metric.value, metric.unit)}
              </div>

              {metric.benchmark && typeof metric.value === "number" && (
                <div className="text-xs text-[#6b7280] mt-1">
                  vs benchmark:{" "}
                  {formatMetricValue(metric.benchmark, metric.unit)}
                </div>
              )}
            </div>

            <p className="text-xs text-[#8b9dc3] leading-relaxed">
              {metric.description}
            </p>

            {metric.unit === "%" && typeof metric.value === "number" && (
              <div className="mt-3">
                <div className="w-full h-1.5 bg-[rgba(0,191,255,0.2)] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      metric.value >= 80
                        ? "bg-[#10b981]"
                        : metric.value >= 60
                          ? "bg-[#f59e0b]"
                          : "bg-[#ef4444]"
                    }`}
                    style={{ width: `${Math.min(metric.value, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-4 md:col-span-2 lg:col-span-4">
        <div className="flex items-center gap-2 mb-3">
          <h4 className="text-sm font-medium text-[#8b9dc3]">
            Performance Summary
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-lg font-bold text-[#00bfff] mb-1">
              {(() => {
                const efficiencyMetric = metrics.find((m) =>
                  m.name.toLowerCase().includes("efficiency")
                );
                if (
                  efficiencyMetric &&
                  typeof efficiencyMetric.value === "number"
                ) {
                  return efficiencyMetric.value >= 70
                    ? "Excellent"
                    : efficiencyMetric.value >= 50
                      ? "Good"
                      : efficiencyMetric.value >= 30
                        ? "Fair"
                        : "Poor";
                }
                return "N/A";
              })()}
            </div>
            <div className="text-xs text-[#8b9dc3]">Overall Efficiency</div>
          </div>

          <div className="text-center">
            <div className="text-lg font-bold text-[#00bfff] mb-1">
              {metrics.filter((m) => m.trend === "up").length}
            </div>
            <div className="text-xs text-[#8b9dc3]">Improving Metrics</div>
          </div>

          <div className="text-center">
            <div className="text-lg font-bold text-[#f59e0b] mb-1">
              {
                metrics.filter(
                  (m) =>
                    typeof m.value === "number" &&
                    m.benchmark &&
                    m.value < m.benchmark * 0.8
                ).length
              }
            </div>
            <div className="text-xs text-[#8b9dc3]">
              Optimization Opportunities
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-[rgba(0,191,255,0.1)]">
          <div className="text-xs text-[#8b9dc3] space-y-1">
            {(() => {
              const recommendations = [];
              const gasMetric = metrics.find((m) =>
                m.name.toLowerCase().includes("gas")
              );
              const efficiencyMetric = metrics.find((m) =>
                m.name.toLowerCase().includes("efficiency")
              );

              if (
                gasMetric &&
                typeof gasMetric.value === "number" &&
                gasMetric.value > 1000
              ) {
                recommendations.push(
                  "• Consider optimizing high gas consumption operations"
                );
              }

              if (
                efficiencyMetric &&
                typeof efficiencyMetric.value === "number" &&
                efficiencyMetric.value < 50
              ) {
                recommendations.push(
                  "• Review execution patterns for efficiency improvements"
                );
              }

              if (recommendations.length === 0) {
                recommendations.push(
                  "• Performance metrics look good! Continue monitoring for optimization opportunities."
                );
              }

              return recommendations.map((rec, i) => <div key={i}>{rec}</div>);
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
