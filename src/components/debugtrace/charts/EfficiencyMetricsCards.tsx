import { EfficiencyMetric } from "@/lib/debugtrace/types";
import {
  AlertTriangle,
  CheckCircle,
  Minus,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

interface EfficiencyMetricsCardsProps {
  metrics: EfficiencyMetric[];
  className?: string;
}

function getScoreColor(score: number) {
  if (score >= 80) return "text-[#10b981]";
  if (score >= 60) return "text-[#f59e0b]";
  return "text-red-400";
}

function getScoreIcon(score: number) {
  if (score >= 80) return <CheckCircle className="h-4 w-4" />;
  if (score >= 60) return <AlertTriangle className="h-4 w-4" />;
  return <AlertTriangle className="h-4 w-4" />;
}

const MetricCard = ({ metric }: { metric: EfficiencyMetric }) => {
  const getTrendIcon = (trend?: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-[#10b981]" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-400" />;
      case "stable":
        return <Minus className="h-4 w-4 text-[#8b9dc3]" />;
      default:
        return null;
    }
  };

  const formatValue = (value: number | string, unit?: string) => {
    if (typeof value === "number") {
      if (unit === "%" || unit === "score") {
        return value.toFixed(1);
      }
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
      }
      if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}K`;
      }
      return value.toLocaleString();
    }
    return value;
  };

  const scoreColor = getScoreColor(metric.score);
  const scoreIcon = getScoreIcon(metric.score);

  return (
    <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-4 hover:border-[rgba(0,191,255,0.4)] transition-colors">
      <div className="flex items-center justify-between mb-3">
        <h5 className="text-sm font-medium text-[#8b9dc3]">{metric.name}</h5>
        <div className="flex items-center gap-1">
          {getTrendIcon(metric.trend)}
          <div className={`flex items-center gap-1 ${scoreColor}`}>
            {scoreIcon}
            <span className="text-xs font-medium">
              {metric.score.toFixed(0)}
            </span>
          </div>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-[#00bfff]">
            {formatValue(metric.value, metric.unit)}
          </span>
          {metric.unit && (
            <span className="text-sm text-[#8b9dc3]">{metric.unit}</span>
          )}
        </div>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-xs text-[#6b7280] mb-1">
          <span>Score</span>
          <span>{metric.score.toFixed(0)}/100</span>
        </div>
        <div className="w-full bg-[rgba(107,114,128,0.2)] rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-1000 ${
              metric.score >= 80
                ? "bg-[#10b981]"
                : metric.score >= 60
                  ? "bg-[#f59e0b]"
                  : "bg-red-400"
            }`}
            style={{ width: `${Math.min(100, Math.max(0, metric.score))}%` }}
          ></div>
        </div>
      </div>

      {metric.benchmark && (
        <div className="mb-3 text-xs">
          <div className="flex items-center gap-1 text-[#6b7280]">
            <Target className="h-3 w-3" />
            <span>
              Benchmark: {formatValue(metric.benchmark, metric.unit)}{" "}
              {metric.unit}
            </span>
          </div>
          <div
            className={`text-xs mt-1 ${
              typeof metric.value === "number" &&
              metric.value <= metric.benchmark
                ? "text-[#10b981]"
                : "text-[#f59e0b]"
            }`}
          >
            {typeof metric.value === "number" && metric.benchmark
              ? metric.value <= metric.benchmark
                ? `✓ ${(((metric.benchmark - metric.value) / metric.benchmark) * 100).toFixed(1)}% better than benchmark`
                : `⚠ ${(((metric.value - metric.benchmark) / metric.benchmark) * 100).toFixed(1)}% above benchmark`
              : "No comparison available"}
          </div>
        </div>
      )}

      {metric.recommendation && (
        <div className="text-xs text-[#8b9dc3] bg-[rgba(0,191,255,0.05)] border border-[rgba(0,191,255,0.1)] rounded p-2">
          <span className="font-medium text-[#00bfff]">Recommendation:</span>
          <br />
          {metric.recommendation}
        </div>
      )}
    </div>
  );
};

export function EfficiencyMetricsCards({
  metrics,
  className = "",
}: EfficiencyMetricsCardsProps) {
  if (!metrics || metrics.length === 0) {
    return (
      <div
        className={`flex items-center justify-center py-8 bg-[rgba(15,20,25,0.8)] rounded-lg ${className}`}
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
            <TrendingUp className="h-8 w-8 text-[rgba(0,191,255,0.3)]" />
          </div>
          <p className="text-[#8b9dc3] text-sm">
            No efficiency metrics available
          </p>
        </div>
      </div>
    );
  }

  const overallMetric = metrics.find((m) => m.name === "Overall Efficiency");
  const otherMetrics = metrics.filter((m) => m.name !== "Overall Efficiency");

  return (
    <div className={className}>
      {overallMetric && (
        <div className="mb-6">
          <div className="bg-[rgba(0,191,255,0.05)] border border-[rgba(0,191,255,0.2)] rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-semibold text-[#00bfff] mb-1">
                  Overall Efficiency Score
                </h4>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-[#00bfff]">
                    {overallMetric.score.toFixed(0)}
                  </span>
                  <span className="text-lg text-[#8b9dc3]">/100</span>
                </div>
              </div>
              <div className="text-right">
                <div
                  className={`flex items-center gap-2 ${getScoreColor(overallMetric.score)}`}
                >
                  {getScoreIcon(overallMetric.score)}
                  <span className="font-medium">
                    {overallMetric.score >= 80
                      ? "Excellent"
                      : overallMetric.score >= 60
                        ? "Good"
                        : "Needs Improvement"}
                  </span>
                </div>
                <div className="text-sm text-[#8b9dc3] mt-1">
                  {metrics.length} metrics analyzed
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="w-full bg-[rgba(107,114,128,0.2)] rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-1500 ${
                    overallMetric.score >= 80
                      ? "bg-gradient-to-r from-[#10b981] to-[#059669]"
                      : overallMetric.score >= 60
                        ? "bg-gradient-to-r from-[#f59e0b] to-[#d97706]"
                        : "bg-gradient-to-r from-red-400 to-red-500"
                  }`}
                  style={{
                    width: `${Math.min(100, Math.max(0, overallMetric.score))}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {otherMetrics.map((metric, index) => (
          <MetricCard key={index} metric={metric} />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-lg font-bold text-[#10b981]">
            {metrics.filter((m) => m.score >= 80).length}
          </div>
          <div className="text-sm text-[#8b9dc3]">Excellent</div>
        </div>
        <div>
          <div className="text-lg font-bold text-[#f59e0b]">
            {metrics.filter((m) => m.score >= 60 && m.score < 80).length}
          </div>
          <div className="text-sm text-[#8b9dc3]">Good</div>
        </div>
        <div>
          <div className="text-lg font-bold text-red-400">
            {metrics.filter((m) => m.score < 60).length}
          </div>
          <div className="text-sm text-[#8b9dc3]">Needs Work</div>
        </div>
      </div>
    </div>
  );
}
