import React from "react";
import { Badge, Card } from "@/components/global";
import {
  Activity,
  Clock,
  DollarSign,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import type { PerformanceMetrics } from "@/lib/replaytransactions";
import { VISUALIZATION_COLORS } from "@/lib/replaytransactions";

interface PerformanceMetricsCardsProps {
  performanceMetrics: PerformanceMetrics;
  className?: string;
}

export const PerformanceMetricsCards: React.FC<
  PerformanceMetricsCardsProps
> = ({ performanceMetrics, className = "" }) => {
  const totalGas = performanceMetrics.costAnalysis.totalGasUsed;
  const gasEfficiency = performanceMetrics.gasEfficiency;
  const optimizationCount = performanceMetrics.optimizationSuggestions.length;
  const costUSD = performanceMetrics.costAnalysis.totalCostUSD;

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 80) return VISUALIZATION_COLORS.success;
    if (efficiency >= 60) return VISUALIZATION_COLORS.warning;
    return VISUALIZATION_COLORS.error;
  };

  const getEfficiencyTrend = (efficiency: number) => {
    if (efficiency >= 80) return { icon: TrendingUp, label: "Excellent" };
    if (efficiency >= 60) return { icon: Activity, label: "Good" };
    return { icon: TrendingDown, label: "Needs Improvement" };
  };

  const efficiencyColor = getEfficiencyColor(gasEfficiency);
  const efficiencyTrend = getEfficiencyTrend(gasEfficiency);
  const TrendIcon = efficiencyTrend.icon;

  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}
    >
      <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-[#00bfff]" />
              <span className="text-sm text-[#8b9dc3]">Gas Efficiency</span>
            </div>
            <TrendIcon className="h-4 w-4" style={{ color: efficiencyColor }} />
          </div>

          <div className="space-y-2">
            <div
              className="text-2xl font-bold"
              style={{ color: efficiencyColor }}
            >
              {gasEfficiency.toFixed(1)}%
            </div>

            <div className="w-full bg-[rgba(15,20,25,0.8)] rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${gasEfficiency}%`,
                  background: efficiencyColor,
                }}
              />
            </div>

            <Badge
              variant="outline"
              className="text-xs"
              style={{
                borderColor: efficiencyColor,
                color: efficiencyColor,
                backgroundColor: `${efficiencyColor}20`,
              }}
            >
              {efficiencyTrend.label}
            </Badge>
          </div>
        </div>
      </Card>

      <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-[#00bfff]" />
              <span className="text-sm text-[#8b9dc3]">Total Gas</span>
            </div>
            <div className="text-xs text-[#8b9dc3]">
              {totalGas > 500000
                ? "High"
                : totalGas > 200000
                  ? "Medium"
                  : "Low"}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-2xl font-bold text-[#00bfff]">
              {totalGas.toLocaleString()}
            </div>

            <div className="text-xs text-[#8b9dc3]">Gas units consumed</div>

            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-1 w-4 rounded"
                  style={{
                    background:
                      i < Math.ceil((totalGas / 1000000) * 5)
                        ? VISUALIZATION_COLORS.primary
                        : VISUALIZATION_COLORS.background.border,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-[#00bfff]" />
              <span className="text-sm text-[#8b9dc3]">Transaction Cost</span>
            </div>
            <div className="text-xs text-[#8b9dc3]">USD</div>
          </div>

          <div className="space-y-2">
            <div className="text-2xl font-bold text-[#00bfff]">
              ${costUSD.toFixed(2)}
            </div>

            <div className="text-xs text-[#8b9dc3]">
              {performanceMetrics.costAnalysis.totalCostEth.toFixed(6)} ETH
            </div>

            <div className="text-xs text-[#6b7280]">
              Gas Price:{" "}
              {(Number(performanceMetrics.costAnalysis.gasPrice) / 1e9).toFixed(
                1
              )}{" "}
              Gwei
            </div>
          </div>
        </div>
      </Card>

      <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-[#00bfff]" />
              <span className="text-sm text-[#8b9dc3]">Optimizations</span>
            </div>
            <div className="text-xs text-[#8b9dc3]">Available</div>
          </div>

          <div className="space-y-2">
            <div className="text-2xl font-bold text-[#00bfff]">
              {optimizationCount}
            </div>

            <div className="text-xs text-[#8b9dc3]">Suggestions found</div>

            <div className="flex gap-1">
              {performanceMetrics.optimizationSuggestions.map(
                (suggestion, index) => (
                  <div
                    key={index}
                    className="w-2 h-2 rounded-full"
                    style={{
                      background:
                        suggestion.severity === "high"
                          ? VISUALIZATION_COLORS.error
                          : suggestion.severity === "medium"
                            ? VISUALIZATION_COLORS.warning
                            : VISUALIZATION_COLORS.info,
                    }}
                  />
                )
              )}
            </div>
          </div>
        </div>
      </Card>

      <div className="rounded-lg bg-[rgba(25,28,40,0.8)] border border-[rgba(0,191,255,0.2)] md:col-span-2 lg:col-span-4">
        <div className="p-4 ">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-[#00bfff]">
              Gas Usage Breakdown
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {performanceMetrics.gasBreakdown.map((breakdown, index) => (
              <div
                key={breakdown.category}
                className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[#8b9dc3]">
                    {breakdown.category}
                  </span>
                  <span className="text-sm text-[#00bfff] font-semibold">
                    {breakdown.percentage.toFixed(1)}%
                  </span>
                </div>

                <div className="text-lg font-bold text-[#00bfff] mb-1">
                  {breakdown.gasUsed.toLocaleString()}
                </div>

                <div className="w-full bg-[rgba(0,0,0,0.3)] rounded-full h-1">
                  <div
                    className="h-1 rounded-full"
                    style={{
                      width: `${breakdown.percentage}%`,
                      background:
                        VISUALIZATION_COLORS.chart[
                          index % VISUALIZATION_COLORS.chart.length
                        ],
                    }}
                  />
                </div>

                <div className="text-xs text-[#6b7280] mt-1">
                  {breakdown.description}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-bg-dark-primary border-[rgba(0,191,255,0.2)] md:col-span-2">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="h-5 w-5 text-[#00bfff]" />
                <span className="text-lg font-semibold text-[#00bfff]">
                  Cost Breakdown
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-[#8b9dc3]">Execution:</span>
                    <span className="text-[#00bfff]">
                      {performanceMetrics.costAnalysis.breakdown.execution.toFixed(
                        1
                      )}
                      %
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8b9dc3]">Storage:</span>
                    <span className="text-[#00bfff]">
                      {performanceMetrics.costAnalysis.breakdown.storage.toFixed(
                        1
                      )}
                      %
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-[#8b9dc3]">Transfer:</span>
                    <span className="text-[#00bfff]">
                      {performanceMetrics.costAnalysis.breakdown.transfer.toFixed(
                        1
                      )}
                      %
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8b9dc3]">Other:</span>
                    <span className="text-[#00bfff]">
                      {performanceMetrics.costAnalysis.breakdown.other.toFixed(
                        1
                      )}
                      %
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
          <Card className="bg-bg-dark-primary border-[rgba(0,191,255,0.2)] md:col-span-2">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-5 w-5 text-[#00bfff]" />
                <span className="text-lg font-semibold text-[#00bfff]">
                  Performance Summary
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[#8b9dc3]">Overall Efficiency:</span>
                  <Badge
                    variant="outline"
                    style={{
                      borderColor: efficiencyColor,
                      color: efficiencyColor,
                      backgroundColor: `${efficiencyColor}20`,
                    }}
                  >
                    {efficiencyTrend.label}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8b9dc3]">Gas Usage:</span>
                  <span className="text-[#00bfff]">
                    {totalGas > 500000
                      ? "High"
                      : totalGas > 200000
                        ? "Moderate"
                        : "Low"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8b9dc3]">
                    Optimization Potential:
                  </span>
                  <span className="text-[#00bfff]">
                    {optimizationCount > 5
                      ? "High"
                      : optimizationCount > 2
                        ? "Medium"
                        : "Low"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8b9dc3]">Cost Efficiency:</span>
                  <span className="text-[#00bfff]">
                    {costUSD < 10
                      ? "Excellent"
                      : costUSD < 50
                        ? "Good"
                        : "Expensive"}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
