import React from "react";
import {
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Flame,
  Gauge,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { formatGas } from "@/lib/config";

interface GasEfficiencyMetricsProps {
  data: {
    efficiencyScore: number;
    wastedGas: string;
    rawWastedGas: number;
    performanceMetrics: {
      failureRate: string;
      successRate: string;
      avgGasPerSuccess: number;
      medianGasUsage: number;
      highGasTransactions: number;
      gasVariance: number;
    };
    rawTotalGasUsed: number;
  };
  className?: string;
}

const MetricCard = ({
  icon: Icon,
  title,
  value,
  subtitle,
  trend,
  color = "text-[#00bfff]",
  bgColor = "bg-[rgba(0,191,255,0.05)]",
  borderColor = "border-[rgba(0,191,255,0.1)]",
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: "up" | "down" | "stable";
  color?: string;
  bgColor?: string;
  borderColor?: string;
}) => {
  const getTrendIcon = () => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-3 w-3 text-[#10b981]" />;
      case "down":
        return <TrendingDown className="h-3 w-3 text-[#ef4444]" />;
      default:
        return null;
    }
  };

  return (
    <div
      className={`p-4 rounded-lg ${bgColor} border ${borderColor} hover:border-opacity-30 transition-all duration-300`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${color}`} />
          <span className="text-sm font-medium text-[#8b9dc3]">{title}</span>
        </div>
        {getTrendIcon()}
      </div>
      <div className={`text-2xl font-bold ${color} mb-1`}>{value}</div>
      {subtitle && <div className="text-xs text-[#6b7280]">{subtitle}</div>}
    </div>
  );
};

const EfficiencyGauge = ({
  score,
  size = 120,
}: {
  score: number;
  size?: number;
}) => {
  const getColor = (score: number) => {
    if (score >= 90) return "#10b981";
    if (score >= 70) return "#f59e0b";
    if (score >= 50) return "#ef4444";
    return "#dc2626";
  };

  const getLabel = (score: number) => {
    if (score >= 90) return "Excellent";
    if (score >= 70) return "Good";
    if (score >= 50) return "Fair";
    return "Poor";
  };

  const radius = size / 2 - 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(0,191,255,0.1)"
          strokeWidth="8"
          fill="none"
        />

        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getColor(score)}
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-bold" style={{ color: getColor(score) }}>
          {score.toFixed(1)}%
        </div>
        <div className="text-xs text-[#8b9dc3] mt-1">{getLabel(score)}</div>
      </div>
    </div>
  );
};

export function GasEfficiencyMetrics({
  data,
  className = "",
}: GasEfficiencyMetricsProps) {
  const wastePercentage = (
    (data.rawWastedGas / data.rawTotalGasUsed) *
    100
  ).toFixed(1);
  const estimatedCostUSD = ((data.rawWastedGas * 20) / 1e9).toFixed(2);
  const failureRate = parseFloat(data.performanceMetrics.failureRate);
  const successRate = parseFloat(data.performanceMetrics.successRate);

  const getEfficiencyInsights = () => {
    const insights = [];

    if (data.efficiencyScore >= 90) {
      insights.push({
        type: "success",
        message: "Excellent gas efficiency - minimal waste detected",
        icon: CheckCircle,
        color: "text-[#10b981]",
      });
    } else if (data.efficiencyScore >= 70) {
      insights.push({
        type: "warning",
        message: "Good efficiency with room for optimization",
        icon: Target,
        color: "text-[#f59e0b]",
      });
    } else {
      insights.push({
        type: "error",
        message: "Poor efficiency - significant optimization needed",
        icon: AlertTriangle,
        color: "text-[#ef4444]",
      });
    }

    if (failureRate > 10) {
      insights.push({
        type: "warning",
        message: `High failure rate (${failureRate}%) causing gas waste`,
        icon: AlertTriangle,
        color: "text-[#ef4444]",
      });
    }

    if (data.performanceMetrics.highGasTransactions > 5) {
      insights.push({
        type: "info",
        message: `${data.performanceMetrics.highGasTransactions} high-gas transactions detected`,
        icon: Flame,
        color: "text-[#00bfff]",
      });
    }

    return insights;
  };

  const insights = getEfficiencyInsights();

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-6">
        <Gauge className="h-5 w-5 text-[#00bfff]" />
        <h3 className="text-lg font-semibold text-[#00bfff]">
          Gas Efficiency Analysis
        </h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-1 flex flex-col items-center justify-center p-6 bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)] rounded-lg">
          <EfficiencyGauge score={data.efficiencyScore} />
          <div className="mt-4 text-center">
            <div className="text-sm text-[#8b9dc3] mb-1">
              Overall Efficiency
            </div>
            <div className="text-xs text-[#6b7280]">
              Based on gas usage patterns
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          <MetricCard
            icon={Flame}
            title="Wasted Gas"
            value={data.wastedGas}
            subtitle={`${wastePercentage}% of total gas`}
            trend={parseFloat(wastePercentage) > 15 ? "up" : "stable"}
            color="text-[#ef4444]"
            bgColor="bg-[rgba(239,68,68,0.05)]"
            borderColor="border-[rgba(239,68,68,0.1)]"
          />
          <MetricCard
            icon={DollarSign}
            title="Estimated Cost"
            value={`$${estimatedCostUSD}`}
            subtitle="USD wasted on failed txs"
            color="text-[#f59e0b]"
            bgColor="bg-[rgba(245,158,11,0.05)]"
            borderColor="border-[rgba(245,158,11,0.1)]"
          />
          <MetricCard
            icon={CheckCircle}
            title="Success Rate"
            value={`${successRate.toFixed(1)}%`}
            subtitle={`${data.performanceMetrics.successRate}% successful`}
            trend={
              successRate >= 95 ? "up" : successRate >= 85 ? "stable" : "down"
            }
            color="text-[#10b981]"
            bgColor="bg-[rgba(16,185,129,0.05)]"
            borderColor="border-[rgba(16,185,129,0.1)]"
          />
          <MetricCard
            icon={Zap}
            title="High Gas Txs"
            value={data.performanceMetrics.highGasTransactions}
            subtitle="Transactions >500k gas"
            trend={
              data.performanceMetrics.highGasTransactions > 10 ? "up" : "stable"
            }
            color="text-[#8b5cf6]"
            bgColor="bg-[rgba(139,92,246,0.05)]"
            borderColor="border-[rgba(139,92,246,0.1)]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          icon={Target}
          title="Avg Gas/Success"
          value={formatGas(data.performanceMetrics.avgGasPerSuccess)}
          subtitle="Per successful transaction"
        />
        <MetricCard
          icon={Gauge}
          title="Median Gas"
          value={formatGas(data.performanceMetrics.medianGasUsage)}
          subtitle="Middle value usage"
        />
        <MetricCard
          icon={TrendingUp}
          title="Gas Variance"
          value={formatGas(data.performanceMetrics.gasVariance)}
          subtitle="Standard deviation"
        />
        <MetricCard
          icon={AlertTriangle}
          title="Failure Rate"
          value={`${failureRate.toFixed(1)}%`}
          subtitle="Failed transactions"
          color={
            failureRate > 10
              ? "text-[#ef4444]"
              : failureRate > 5
                ? "text-[#f59e0b]"
                : "text-[#10b981]"
          }
          bgColor={
            failureRate > 10
              ? "bg-[rgba(239,68,68,0.05)]"
              : failureRate > 5
                ? "bg-[rgba(245,158,11,0.05)]"
                : "bg-[rgba(16,185,129,0.05)]"
          }
          borderColor={
            failureRate > 10
              ? "border-[rgba(239,68,68,0.1)]"
              : failureRate > 5
                ? "border-[rgba(245,158,11,0.1)]"
                : "border-[rgba(16,185,129,0.1)]"
          }
        />
      </div>

      {insights.length > 0 && (
        <div className="bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)] rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-4 w-4 text-[#00bfff]" />
            <h4 className="text-sm font-semibold text-[#00bfff]">
              Efficiency Insights
            </h4>
          </div>
          <div className="space-y-3">
            {insights.map((insight, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg bg-[rgba(0,191,255,0.02)] border border-[rgba(0,191,255,0.05)]"
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
    </div>
  );
}
