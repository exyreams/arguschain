import React, { useMemo } from "react";
import {
  AlertTriangle,
  BarChart3,
  DollarSign,
  Flame,
  Gauge,
  Lightbulb,
  Target,
  TrendingDown,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/global";
import { formatGas } from "@/lib/config";

interface GasAnalysisSectionProps {
  gasAnalysis: {
    totalGasUsed: string;
    rawTotalGasUsed: number;
    efficiencyScore: number;
    wastedGas: string;
    rawWastedGas: number;
    performanceMetrics: {
      failureRate: string;
      avgGasPerSuccess: number;
      medianGasUsage: number;
      highGasTransactions: number;
      gasVariance: number;
      gasDistributionEntropy: string;
    };
    distribution: Array<{
      category: string;
      gasUsed: string;
      percentage: number;
      count: number;
      color: string;
      avgGas?: number;
      efficiency?: number;
    }>;
    optimizations?: Array<{
      type: string;
      severity: "low" | "medium" | "high";
      description: string;
      recommendation: string;
      potentialSavings: string;
      impact: string;
    }>;
  };
}

export const GasAnalysisSection: React.FC<GasAnalysisSectionProps> = ({
  gasAnalysis,
}) => {
  const insights = useMemo(() => {
    const insights = [];

    if (gasAnalysis.efficiencyScore < 70) {
      insights.push({
        type: "warning",
        message: `Low efficiency score (${gasAnalysis.efficiencyScore.toFixed(1)}%) indicates significant gas waste`,
        icon: AlertTriangle,
        color: "text-[#f59e0b]",
      });
    }

    if (gasAnalysis.performanceMetrics.highGasTransactions > 5) {
      insights.push({
        type: "info",
        message: `${gasAnalysis.performanceMetrics.highGasTransactions} high-gas transactions detected - optimization opportunities available`,
        icon: Lightbulb,
        color: "text-[#00bfff]",
      });
    }

    if (parseFloat(gasAnalysis.performanceMetrics.failureRate) > 10) {
      insights.push({
        type: "error",
        message: `High failure rate (${gasAnalysis.performanceMetrics.failureRate}%) causing significant gas waste`,
        icon: AlertTriangle,
        color: "text-[#ef4444]",
      });
    }

    return insights;
  }, [gasAnalysis]);

  const getEfficiencyColor = (score: number) => {
    if (score >= 90) return "text-[#10b981]";
    if (score >= 70) return "text-[#f59e0b]";
    return "text-[#ef4444]";
  };

  const getEfficiencyBg = (score: number) => {
    if (score >= 90) return "bg-[rgba(16,185,129,0.1)]";
    if (score >= 70) return "bg-[rgba(245,158,11,0.1)]";
    return "bg-[rgba(239,68,68,0.1)]";
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(255,107,53,0.2)] rounded-lg p-6 hover:border-[rgba(255,107,53,0.4)] transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-[#ff6b35]" />
              <span className="text-sm font-medium text-[#8b9dc3]">
                Total Gas Used
              </span>
            </div>
            <div className="text-xs text-[#ff6b35] bg-[rgba(255,107,53,0.1)] px-2 py-1 rounded">
              {((gasAnalysis.rawTotalGasUsed / 30000000) * 100).toFixed(1)}%
            </div>
          </div>
          <div className="text-3xl font-bold text-[#ff6b35] mb-2">
            {gasAnalysis.totalGasUsed}
          </div>
          <div className="text-xs text-[#8b9dc3]">of 30M block limit</div>
        </div>

        <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(16,185,129,0.2)] rounded-lg p-6 hover:border-[rgba(16,185,129,0.4)] transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-[#10b981]" />
              <span className="text-sm font-medium text-[#8b9dc3]">
                Efficiency Score
              </span>
            </div>
            <div
              className={`text-xs px-2 py-1 rounded ${getEfficiencyBg(gasAnalysis.efficiencyScore)} ${getEfficiencyColor(gasAnalysis.efficiencyScore)}`}
            >
              {gasAnalysis.efficiencyScore >= 90
                ? "Excellent"
                : gasAnalysis.efficiencyScore >= 70
                  ? "Good"
                  : "Poor"}
            </div>
          </div>
          <div
            className={`text-3xl font-bold mb-2 ${getEfficiencyColor(gasAnalysis.efficiencyScore)}`}
          >
            {gasAnalysis.efficiencyScore.toFixed(1)}%
          </div>
          <div className="text-xs text-[#8b9dc3]">
            Failure Rate: {gasAnalysis.performanceMetrics.failureRate}%
          </div>
        </div>

        <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(245,158,11,0.2)] rounded-lg p-6 hover:border-[rgba(245,158,11,0.4)] transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-[#f59e0b]" />
              <span className="text-sm font-medium text-[#8b9dc3]">
                Wasted Gas
              </span>
            </div>
            <div className="text-xs text-[#f59e0b] bg-[rgba(245,158,11,0.1)] px-2 py-1 rounded">
              {(
                (gasAnalysis.rawWastedGas / gasAnalysis.rawTotalGasUsed) *
                100
              ).toFixed(1)}
              %
            </div>
          </div>
          <div className="text-3xl font-bold text-[#f59e0b] mb-2">
            {gasAnalysis.wastedGas}
          </div>
          <div className="flex items-center gap-1">
            <DollarSign className="h-3 w-3 text-[#f59e0b]" />
            <span className="text-xs text-[#8b9dc3]">
              ${((gasAnalysis.rawWastedGas * 20) / 1e9).toFixed(2)} USD wasted
            </span>
          </div>
        </div>

        <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(139,92,246,0.2)] rounded-lg p-6 hover:border-[rgba(139,92,246,0.4)] transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[#8b5cf6]" />
              <span className="text-sm font-medium text-[#8b9dc3]">
                Complexity
              </span>
            </div>
            <div className="text-xs text-[#8b5cf6] bg-[rgba(139,92,246,0.1)] px-2 py-1 rounded">
              Entropy
            </div>
          </div>
          <div className="text-3xl font-bold text-[#8b5cf6] mb-2">
            {gasAnalysis.performanceMetrics.gasDistributionEntropy}
          </div>
          <div className="text-xs text-[#8b9dc3]">Distribution entropy</div>
        </div>
      </div>

      {/* Insights Panel */}
      {insights.length > 0 && (
        <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="h-5 w-5 text-[#00bfff]" />
            <h3 className="text-lg font-semibold text-[#00bfff]">
              Gas Analysis Insights
            </h3>
          </div>
          <div className="space-y-3">
            {insights.map((insight, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)]"
              >
                <insight.icon className={`h-4 w-4 mt-0.5 ${insight.color}`} />
                <span className="text-sm text-[#8b9dc3]">
                  {insight.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Advanced Performance Metrics */}
      <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
        <div className="flex items-center gap-2 mb-6">
          <Zap className="h-5 w-5 text-[#00bfff]" />
          <h3 className="text-lg font-semibold text-[#00bfff]">
            Performance Analytics
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center p-4 rounded-lg bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)]">
            <div className="text-2xl font-bold text-[#00bfff] mb-1">
              {formatGas(gasAnalysis.performanceMetrics.avgGasPerSuccess)}
            </div>
            <div className="text-sm text-[#8b9dc3]">Avg Gas/Success</div>
            <div className="text-xs text-[#6b7280] mt-1">Per successful tx</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)]">
            <div className="text-2xl font-bold text-[#00bfff] mb-1">
              {formatGas(gasAnalysis.performanceMetrics.medianGasUsage)}
            </div>
            <div className="text-sm text-[#8b9dc3]">Median Gas</div>
            <div className="text-xs text-[#6b7280] mt-1">Middle value</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)]">
            <div className="text-2xl font-bold text-[#f59e0b] mb-1">
              {gasAnalysis.performanceMetrics.highGasTransactions}
            </div>
            <div className="text-sm text-[#8b9dc3]">High Gas Txs</div>
            <div className="text-xs text-[#6b7280] mt-1">&gt;500k gas each</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)]">
            <div className="text-2xl font-bold text-[#8b5cf6] mb-1">
              {formatGas(gasAnalysis.performanceMetrics.gasVariance)}
            </div>
            <div className="text-sm text-[#8b9dc3]">Gas Std Dev</div>
            <div className="text-xs text-[#6b7280] mt-1">Variability</div>
          </div>
        </div>
      </div>

      {/* Gas Distribution with Enhanced Visualization */}
      <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[#00bfff]" />
            <h3 className="text-lg font-semibold text-[#00bfff]">
              Gas Usage Distribution
            </h3>
          </div>
          <div className="text-sm text-[#8b9dc3]">
            {gasAnalysis.distribution.length} categories
          </div>
        </div>
        <div className="space-y-4">
          {gasAnalysis.distribution.map((item, index) => (
            <div key={index} className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full border-2 border-white/20"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-medium text-[#00bfff]">
                    {item.category}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-xs border-[rgba(0,191,255,0.3)] text-[#8b9dc3]"
                  >
                    {item.count} txs
                  </Badge>
                  {item.avgGas && (
                    <Badge
                      variant="outline"
                      className="text-xs border-[rgba(139,92,246,0.3)] text-[#8b5cf6]"
                    >
                      {formatGas(item.avgGas)} avg
                    </Badge>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-mono text-[#00bfff] text-lg">
                    {item.gasUsed}
                  </div>
                  <div className="text-sm text-[#8b9dc3]">
                    {item.percentage.toFixed(1)}%
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="w-full bg-[rgba(15,20,25,0.8)] rounded-full h-3 border border-[rgba(0,191,255,0.1)]">
                  <div
                    className="h-3 rounded-full transition-all duration-500 relative overflow-hidden"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: item.color,
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20"></div>
                  </div>
                </div>
                {item.efficiency && (
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-[#6b7280]">
                      Efficiency: {item.efficiency.toFixed(1)}%
                    </span>
                    <span className="text-xs text-[#6b7280]">
                      {(
                        (item.percentage * gasAnalysis.rawTotalGasUsed) /
                        100 /
                        1e6
                      ).toFixed(2)}
                      M gas
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Optimization Recommendations */}
      {gasAnalysis.optimizations && gasAnalysis.optimizations.length > 0 && (
        <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(16,185,129,0.2)] rounded-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <Target className="h-5 w-5 text-[#10b981]" />
            <h3 className="text-lg font-semibold text-[#10b981]">
              Optimization Opportunities
            </h3>
          </div>
          <div className="space-y-4">
            {gasAnalysis.optimizations.map((opt, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  opt.severity === "high"
                    ? "bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.3)]"
                    : opt.severity === "medium"
                      ? "bg-[rgba(245,158,11,0.1)] border-[rgba(245,158,11,0.3)]"
                      : "bg-[rgba(16,185,129,0.1)] border-[rgba(16,185,129,0.3)]"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        opt.severity === "high"
                          ? "bg-[#ef4444]"
                          : opt.severity === "medium"
                            ? "bg-[#f59e0b]"
                            : "bg-[#10b981]"
                      }`}
                    />
                    <span
                      className={`text-sm font-medium ${
                        opt.severity === "high"
                          ? "text-[#ef4444]"
                          : opt.severity === "medium"
                            ? "text-[#f59e0b]"
                            : "text-[#10b981]"
                      }`}
                    >
                      {opt.severity.toUpperCase()} PRIORITY
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Save {opt.potentialSavings}
                  </Badge>
                </div>
                <p className="text-[#8b9dc3] text-sm mb-2">{opt.description}</p>
                <p className="text-[#00bfff] text-sm font-medium mb-1">
                  Recommendation:
                </p>
                <p className="text-[#8b9dc3] text-sm">{opt.recommendation}</p>
                <p className="text-xs text-[#6b7280] mt-2">{opt.impact}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
