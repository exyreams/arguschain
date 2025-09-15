import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BlockAnalysisSummary,
  BlockTransactionSummary,
} from "@/lib/debugblock/types";
import { formatGas } from "@/lib/config";
import { Activity, Award, TrendingUp, Zap } from "lucide-react";

interface BlockPerformanceChartProps {
  summary: BlockAnalysisSummary;
  transactions: BlockTransactionSummary[];
  height?: number;
  className?: string;
}

interface PerformanceMetric {
  metric: string;
  value: number;
  maxValue: number;
  score: number;
  color: string;
  description: string;
}

interface PerformanceRadarData {
  metric: string;
  score: number;
  fullMark: 100;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: PerformanceRadarData | PerformanceMetric;
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[rgba(25,28,40,0.95)] border border-[rgba(0,191,255,0.3)] rounded-lg p-3 shadow-lg">
        <p className="text-[#00bfff] font-medium">{label}</p>
        <div className="space-y-1 mt-2">
          <p className="text-white text-sm">
            Score: <span className="text-[#10b981]">{data.score}/100</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export function BlockPerformanceChart({
  summary,
  height = 400,
  className = "",
}: BlockPerformanceChartProps) {
  const [viewMode, setViewMode] = useState<"radar" | "metrics">("radar");

  const calculatePerformanceMetrics = (): PerformanceMetric[] => {
    const totalTransactions = summary.total_transactions;
    const averageGas =
      totalTransactions > 0 ? summary.total_gas_used / totalTransactions : 0;
    const successRate =
      totalTransactions > 0
        ? ((totalTransactions - summary.failed_traces_count) /
            totalTransactions) *
          100
        : 100;
    const pyusdActivityRate =
      totalTransactions > 0
        ? (summary.pyusd_interactions_count / totalTransactions) * 100
        : 0;
    const gasEfficiency =
      averageGas > 0 ? Math.max(0, 100 - (averageGas / 200000) * 100) : 100;
    const pyusdVolume = summary.pyusd_volume;
    const volumeScore = Math.min(100, (pyusdVolume / 10000000) * 100);

    return [
      {
        metric: "Success Rate",
        value: successRate,
        maxValue: 100,
        score: successRate,
        color: "#10b981",
        description: `${(100 - (summary.failed_traces_count / totalTransactions) * 100).toFixed(1)}% of transactions succeeded`,
      },
      {
        metric: "Gas Efficiency",
        value: averageGas,
        maxValue: 200000,
        score: gasEfficiency,
        color: "#f59e0b",
        description: `Average gas usage: ${formatGas(averageGas)}`,
      },
      {
        metric: "PYUSD Activity",
        value: pyusdActivityRate,
        maxValue: 100,
        score: Math.min(100, pyusdActivityRate * 2),
        color: "#8b5cf6",
        description: `${summary.pyusd_interactions_count} PYUSD interactions (${pyusdActivityRate.toFixed(1)}%)`,
      },
      {
        metric: "Transaction Volume",
        value: totalTransactions,
        maxValue: 1000,
        score: Math.min(100, (totalTransactions / 500) * 100),
        color: "#00bfff",
        description: `${totalTransactions} total transactions in block`,
      },
      {
        metric: "PYUSD Volume",
        value: pyusdVolume,
        maxValue: 10000000,
        score: volumeScore,
        color: "#06b6d4",
        description: `${summary.pyusd_volume_formatted} total PYUSD volume`,
      },
      {
        metric: "Network Health",
        value:
          summary.pyusd_transfer_count +
          summary.pyusd_mint_count +
          summary.pyusd_burn_count,
        maxValue: 100,
        score: Math.min(
          100,
          ((summary.pyusd_transfer_count +
            summary.pyusd_mint_count +
            summary.pyusd_burn_count) /
            50) *
            100,
        ),
        color: "#ef4444",
        description: `${summary.pyusd_transfer_count} transfers, ${summary.pyusd_mint_count} mints, ${summary.pyusd_burn_count} burns`,
      },
    ];
  };

  const performanceMetrics = calculatePerformanceMetrics();

  const radarData: PerformanceRadarData[] = performanceMetrics.map(
    (metric) => ({
      metric: metric.metric,
      score: metric.score,
      fullMark: 100,
    }),
  );

  const overallScore =
    performanceMetrics.reduce((sum, metric) => sum + metric.score, 0) /
    performanceMetrics.length;

  const getPerformanceGrade = (
    score: number,
  ): { grade: string; color: string; description: string } => {
    if (score >= 90)
      return {
        grade: "A+",
        color: "#10b981",
        description: "Excellent Performance",
      };
    if (score >= 80)
      return {
        grade: "A",
        color: "#10b981",
        description: "Very Good Performance",
      };
    if (score >= 70)
      return { grade: "B+", color: "#00bfff", description: "Good Performance" };
    if (score >= 60)
      return { grade: "B", color: "#00bfff", description: "Above Average" };
    if (score >= 50)
      return {
        grade: "C+",
        color: "#f59e0b",
        description: "Average Performance",
      };
    if (score >= 40)
      return { grade: "C", color: "#f59e0b", description: "Below Average" };
    return { grade: "D", color: "#ef4444", description: "Needs Improvement" };
  };

  const performanceGrade = getPerformanceGrade(overallScore);

  const getOptimizationRecommendations = (): string[] => {
    const recommendations: string[] = [];

    if (performanceMetrics[0].score < 95) {
      recommendations.push(
        "Improve transaction success rate by implementing better error handling",
      );
    }
    if (performanceMetrics[1].score < 70) {
      recommendations.push(
        "Optimize gas usage through contract improvements and batch operations",
      );
    }
    if (performanceMetrics[2].score < 30) {
      recommendations.push(
        "Increase PYUSD adoption and usage within the ecosystem",
      );
    }
    if (performanceMetrics[3].score > 90) {
      recommendations.push(
        "Consider implementing scaling solutions for high transaction volumes",
      );
    }
    if (performanceMetrics[4].score < 20) {
      recommendations.push(
        "Encourage larger PYUSD transfers and increased liquidity",
      );
    }

    return recommendations;
  };

  const recommendations = getOptimizationRecommendations();

  const renderChart = () => {
    switch (viewMode) {
      case "radar":
        return (
          <ResponsiveContainer width="100%" height={height - 150}>
            <RadarChart
              data={radarData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <PolarGrid stroke="rgba(0,191,255,0.2)" />
              <PolarAngleAxis
                dataKey="metric"
                tick={{ fontSize: 12, fill: "#8b9dc3" }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: "#6b7280" }}
                tickCount={5}
              />
              <Radar
                name="Performance Score"
                dataKey="score"
                stroke="#00bfff"
                fill="#00bfff"
                fillOpacity={0.2}
                strokeWidth={2}
                dot={{ fill: "#00bfff", strokeWidth: 2, r: 4 }}
              />
            </RadarChart>
          </ResponsiveContainer>
        );

      case "metrics":
        return (
          <ResponsiveContainer width="100%" height={height - 150}>
            <BarChart
              data={performanceMetrics}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(0,191,255,0.1)"
              />
              <XAxis
                dataKey="metric"
                stroke="#8b9dc3"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                stroke="#8b9dc3"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="score"
                radius={[4, 4, 0, 0]}
                animationDuration={1000}
              >
                {performanceMetrics.map((entry, index) => (
                  <Bar key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold text-[#00bfff]">
            Block Performance Analysis
          </h3>
          <p className="text-sm text-[#8b9dc3]">
            Overall Score: {overallScore.toFixed(1)}/100 • Grade:{" "}
            {performanceGrade.grade}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("radar")}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              viewMode === "radar"
                ? "bg-[rgba(0,191,255,0.2)] text-[#00bfff] border border-[rgba(0,191,255,0.3)]"
                : "bg-[rgba(15,20,25,0.8)] text-[#8b9dc3] border border-[rgba(0,191,255,0.3)] hover:bg-[rgba(0,191,255,0.1)]"
            }`}
          >
            <Activity className="h-4 w-4 inline mr-1" />
            Radar
          </button>
          <button
            onClick={() => setViewMode("metrics")}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              viewMode === "metrics"
                ? "bg-[rgba(0,191,255,0.2)] text-[#00bfff] border border-[rgba(0,191,255,0.3)]"
                : "bg-[rgba(15,20,25,0.8)] text-[#8b9dc3] border border-[rgba(0,191,255,0.3)] hover:bg-[rgba(0,191,255,0.1)]"
            }`}
          >
            <TrendingUp className="h-4 w-4 inline mr-1" />
            Metrics
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">{renderChart()}</div>

        <div className="space-y-4">
          <div className="bg-[rgba(15,20,25,0.6)] rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Award
                className="h-5 w-5"
                style={{ color: performanceGrade.color }}
              />
              <h4 className="text-sm font-medium text-[#00bfff]">
                Performance Grade
              </h4>
            </div>
            <div
              className="text-4xl font-bold mb-1"
              style={{ color: performanceGrade.color }}
            >
              {performanceGrade.grade}
            </div>
            <div className="text-sm text-[#8b9dc3] mb-2">
              {performanceGrade.description}
            </div>
            <div className="text-xs text-[#6b7280]">
              Score: {overallScore.toFixed(1)}/100
            </div>
          </div>

          <div className="bg-[rgba(15,20,25,0.6)] rounded-lg p-4">
            <h4 className="text-sm font-medium text-[#00bfff] mb-3">
              Top Performing Metrics
            </h4>
            <div className="space-y-2">
              {performanceMetrics
                .sort((a, b) => b.score - a.score)
                .slice(0, 3)
                .map((metric, index) => (
                  <div
                    key={metric.metric}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[#00bfff] font-bold">
                        #{index + 1}
                      </span>
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: metric.color }}
                      />
                      <span className="text-[#8b9dc3]">{metric.metric}</span>
                    </div>
                    <span className="text-[#10b981] font-medium">
                      {metric.score.toFixed(0)}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          <div className="bg-[rgba(15,20,25,0.6)] rounded-lg p-4">
            <h4 className="text-sm font-medium text-[#f59e0b] mb-3">
              Areas for Improvement
            </h4>
            <div className="space-y-2">
              {performanceMetrics
                .sort((a, b) => a.score - b.score)
                .slice(0, 3)
                .map((metric, index) => (
                  <div
                    key={metric.metric}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[#f59e0b] font-bold">
                        #{index + 1}
                      </span>
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: metric.color }}
                      />
                      <span className="text-[#8b9dc3]">{metric.metric}</span>
                    </div>
                    <span className="text-[#f59e0b] font-medium">
                      {metric.score.toFixed(0)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {performanceMetrics.map((metric) => (
          <div
            key={metric.metric}
            className="bg-[rgba(15,20,25,0.6)] rounded-lg p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-sm font-medium text-[#8b9dc3]">
                {metric.metric}
              </h5>
              <div
                className="text-lg font-bold"
                style={{ color: metric.color }}
              >
                {metric.score.toFixed(0)}
              </div>
            </div>
            <div className="w-full bg-[rgba(0,191,255,0.1)] rounded-full h-2 mb-2">
              <div
                className="h-2 rounded-full transition-all duration-1000"
                style={{
                  width: `${metric.score}%`,
                  backgroundColor: metric.color,
                }}
              />
            </div>
            <div className="text-xs text-[#6b7280]">{metric.description}</div>
          </div>
        ))}
      </div>

      {recommendations.length > 0 && (
        <div className="mt-6 bg-[rgba(0,191,255,0.05)] border border-[rgba(0,191,255,0.1)] rounded-lg p-4">
          <h4 className="text-sm font-medium text-[#00bfff] mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Optimization Recommendations
          </h4>
          <div className="space-y-2">
            {recommendations.map((recommendation, index) => (
              <div
                key={index}
                className="flex items-start gap-2 text-sm text-[#8b9dc3]"
              >
                <span className="text-[#00bfff] font-bold mt-0.5">•</span>
                <span>{recommendation}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
