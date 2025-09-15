import { BlockAnalysisSummary } from "@/lib/debugblock/types";
import { formatGas } from "@/lib/config";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Coins,
  Fuel,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import React from "react";

interface BlockSummaryCardsProps {
  summary: BlockAnalysisSummary;
  className?: string;
}

interface MetricCard {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  trend?: "up" | "down" | "stable";
  trendValue?: string;
}

export function BlockSummaryCards({
  summary,
  className = "",
}: BlockSummaryCardsProps) {
  const averageGasPerTransaction =
    summary.total_transactions > 0
      ? summary.total_gas_used / summary.total_transactions
      : 0;

  const failureRate =
    summary.total_transactions > 0
      ? (summary.failed_traces_count / summary.total_transactions) * 100
      : 0;

  const pyusdActivityRate =
    summary.total_transactions > 0
      ? (summary.pyusd_interactions_count / summary.total_transactions) * 100
      : 0;

  const metricCards: MetricCard[] = [
    {
      title: "Total Transactions",
      value: summary.total_transactions.toLocaleString(),
      subtitle: "in this block",
      icon: <Activity className="h-6 w-6" />,
      color: "#00bfff",
      bgColor: "rgba(0,191,255,0.1)",
      trend:
        summary.total_transactions > 100
          ? "up"
          : summary.total_transactions < 50
            ? "down"
            : "stable",
      trendValue:
        summary.total_transactions > 100
          ? "High activity"
          : summary.total_transactions < 50
            ? "Low activity"
            : "Normal",
    },
    {
      title: "PYUSD Interactions",
      value: summary.pyusd_interactions_count.toLocaleString(),
      subtitle: `${summary.pyusd_percentage.toFixed(1)}% of transactions`,
      icon: <Coins className="h-6 w-6" />,
      color: "#10b981",
      bgColor: "rgba(16,185,129,0.1)",
      trend:
        summary.pyusd_percentage > 20
          ? "up"
          : summary.pyusd_percentage < 5
            ? "down"
            : "stable",
      trendValue: `${summary.pyusd_percentage.toFixed(1)}%`,
    },
    {
      title: "Total Gas Used",
      value: formatGas(summary.total_gas_used),
      subtitle: `Avg: ${formatGas(averageGasPerTransaction)} per tx`,
      icon: <Fuel className="h-6 w-6" />,
      color: "#f59e0b",
      bgColor: "rgba(245,158,11,0.1)",
      trend:
        averageGasPerTransaction > 100000
          ? "up"
          : averageGasPerTransaction < 50000
            ? "down"
            : "stable",
      trendValue:
        averageGasPerTransaction > 100000 ? "High usage" : "Efficient",
    },
    {
      title: "PYUSD Volume",
      value: summary.pyusd_volume_formatted,
      subtitle: `${summary.pyusd_transfer_count} transfers`,
      icon: <BarChart3 className="h-6 w-6" />,
      color: "#8b5cf6",
      bgColor: "rgba(139,92,246,0.1)",
      trend:
        summary.pyusd_volume > 1000000
          ? "up"
          : summary.pyusd_volume < 100000
            ? "down"
            : "stable",
      trendValue: summary.pyusd_transfer_count > 10 ? "Active" : "Quiet",
    },
    {
      title: "Failed Traces",
      value: summary.failed_traces_count.toLocaleString(),
      subtitle: `${failureRate.toFixed(1)}% failure rate`,
      icon: <AlertTriangle className="h-6 w-6" />,
      color: summary.failed_traces_count > 0 ? "#ef4444" : "#10b981",
      bgColor:
        summary.failed_traces_count > 0
          ? "rgba(239,68,68,0.1)"
          : "rgba(16,185,129,0.1)",
      trend: failureRate > 10 ? "up" : failureRate < 2 ? "down" : "stable",
      trendValue:
        failureRate > 10
          ? "High failures"
          : failureRate === 0
            ? "Perfect"
            : "Normal",
    },
    {
      title: "PYUSD Operations",
      value: (
        summary.pyusd_mint_count + summary.pyusd_burn_count
      ).toLocaleString(),
      subtitle: `${summary.pyusd_mint_count} mints, ${summary.pyusd_burn_count} burns`,
      icon: <Zap className="h-6 w-6" />,
      color: "#06b6d4",
      bgColor: "rgba(6,182,212,0.1)",
      trend:
        summary.pyusd_mint_count + summary.pyusd_burn_count > 0
          ? "up"
          : "stable",
      trendValue:
        summary.pyusd_mint_count > summary.pyusd_burn_count
          ? "Net mint"
          : summary.pyusd_burn_count > summary.pyusd_mint_count
            ? "Net burn"
            : "Balanced",
    },
  ];

  const getTrendIcon = (trend?: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-[#10b981]" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-[#ef4444]" />;
      default:
        return <div className="h-4 w-4" />;
    }
  };

  const getTrendColor = (trend?: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return "text-[#10b981]";
      case "down":
        return "text-[#ef4444]";
      default:
        return "text-[#8b9dc3]";
    }
  };

  return (
    <div className={className}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-[#00bfff] mb-2">
          Block Analysis Summary
        </h3>
        <p className="text-sm text-[#8b9dc3]">
          Block {summary.block_identifier} • Key metrics and performance
          indicators
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {metricCards.map((card, index) => (
          <div
            key={index}
            className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-4 hover:border-[rgba(0,191,255,0.4)] transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: card.bgColor }}
              >
                <div style={{ color: card.color }}>{card.icon}</div>
              </div>
              <div className="flex items-center gap-1">
                {getTrendIcon(card.trend)}
                <span className={`text-xs ${getTrendColor(card.trend)}`}>
                  {card.trendValue}
                </span>
              </div>
            </div>

            <div>
              <div
                className="text-2xl font-bold mb-1"
                style={{ color: card.color }}
              >
                {card.value}
              </div>
              <div className="text-sm text-[#8b9dc3] mb-1">{card.title}</div>
              {card.subtitle && (
                <div className="text-xs text-[#6b7280]">{card.subtitle}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-[#00bfff]">
            Block Health Score
          </h4>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[#8b9dc3]" />
            <span className="text-xs text-[#8b9dc3]">
              {summary.total_transactions} transactions analyzed
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="relative w-16 h-16 mx-auto mb-2">
              <svg
                className="w-16 h-16 transform -rotate-90"
                viewBox="0 0 36 36"
              >
                <path
                  className="text-[rgba(0,191,255,0.2)]"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-[#10b981]"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray={`${100 - failureRate}, 100`}
                  strokeLinecap="round"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-[#10b981]">
                  {(100 - failureRate).toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="text-xs text-[#8b9dc3]">Success Rate</div>
          </div>

          <div className="text-center">
            <div className="relative w-16 h-16 mx-auto mb-2">
              <svg
                className="w-16 h-16 transform -rotate-90"
                viewBox="0 0 36 36"
              >
                <path
                  className="text-[rgba(0,191,255,0.2)]"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-[#8b5cf6]"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray={`${Math.min(pyusdActivityRate, 100)}, 100`}
                  strokeLinecap="round"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-[#8b5cf6]">
                  {pyusdActivityRate.toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="text-xs text-[#8b9dc3]">PYUSD Activity</div>
          </div>

          <div className="text-center">
            <div className="relative w-16 h-16 mx-auto mb-2">
              <svg
                className="w-16 h-16 transform -rotate-90"
                viewBox="0 0 36 36"
              >
                <path
                  className="text-[rgba(0,191,255,0.2)]"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-[#f59e0b]"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray={`${Math.min((200000 - averageGasPerTransaction) / 2000, 100)}, 100`}
                  strokeLinecap="round"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-[#f59e0b]">
                  {averageGasPerTransaction < 50000
                    ? "A+"
                    : averageGasPerTransaction < 100000
                      ? "B"
                      : "C"}
                </span>
              </div>
            </div>
            <div className="text-xs text-[#8b9dc3]">Gas Efficiency</div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-[rgba(0,191,255,0.1)]">
          <div className="text-sm text-[#8b9dc3]">
            <span className="font-medium text-[#00bfff]">
              Block Assessment:
            </span>
            {failureRate === 0 &&
            pyusdActivityRate > 10 &&
            averageGasPerTransaction < 100000 ? (
              <span className="text-[#10b981]">
                {" "}
                Excellent - High PYUSD activity with efficient gas usage
              </span>
            ) : failureRate < 5 && averageGasPerTransaction < 150000 ? (
              <span className="text-[#10b981]">
                {" "}
                Good - Stable performance with reasonable gas costs
              </span>
            ) : failureRate > 10 || averageGasPerTransaction > 200000 ? (
              <span className="text-[#f59e0b]">
                {" "}
                Needs attention - High failure rate or gas usage
              </span>
            ) : (
              <span className="text-[#8b9dc3]">
                {" "}
                Normal - Standard block performance
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
