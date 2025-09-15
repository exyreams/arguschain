import { OptimizationSuggestion } from "@/lib/debugtrace/types";
import {
  AlertCircle,
  AlertTriangle,
  DollarSign,
  Info,
  Lightbulb,
  TrendingDown,
} from "lucide-react";
import { formatGas } from "@/lib/config";

interface OptimizationPanelProps {
  suggestions: OptimizationSuggestion[];
  className?: string;
}

const SuggestionCard = ({
  suggestion,
}: {
  suggestion: OptimizationSuggestion;
}) => {
  const getSeverityConfig = (severity: "low" | "medium" | "high") => {
    switch (severity) {
      case "high":
        return {
          color: "text-red-400",
          bgColor: "bg-[rgba(239,68,68,0.1)]",
          borderColor: "border-[rgba(239,68,68,0.3)]",
          icon: <AlertCircle className="h-5 w-5" />,
          label: "High Priority",
        };
      case "medium":
        return {
          color: "text-[#f59e0b]",
          bgColor: "bg-[rgba(245,158,11,0.1)]",
          borderColor: "border-[rgba(245,158,11,0.3)]",
          icon: <AlertTriangle className="h-5 w-5" />,
          label: "Medium Priority",
        };
      case "low":
        return {
          color: "text-[#00bfff]",
          bgColor: "bg-[rgba(0,191,255,0.1)]",
          borderColor: "border-[rgba(0,191,255,0.3)]",
          icon: <Info className="h-5 w-5" />,
          label: "Low Priority",
        };
    }
  };

  const getTypeConfig = (type: "gas" | "performance" | "security") => {
    switch (type) {
      case "gas":
        return {
          color: "text-[#10b981]",
          bgColor: "bg-[rgba(16,185,129,0.1)]",
          label: "Gas Optimization",
        };
      case "performance":
        return {
          color: "text-[#00bfff]",
          bgColor: "bg-[rgba(0,191,255,0.1)]",
          label: "Performance",
        };
      case "security":
        return {
          color: "text-[#ef4444]",
          bgColor: "bg-[rgba(239,68,68,0.1)]",
          label: "Security",
        };
    }
  };

  const severityConfig = getSeverityConfig(suggestion.severity);
  const typeConfig = getTypeConfig(suggestion.type);

  return (
    <div
      className={`${severityConfig.bgColor} ${severityConfig.borderColor} border rounded-lg p-4 hover:border-opacity-60 transition-colors`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={severityConfig.color}>{severityConfig.icon}</div>
          <h5 className="text-lg font-semibold text-accent-primary">
            {suggestion.title}
          </h5>
        </div>
        <div className="flex gap-2">
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${typeConfig.bgColor} ${typeConfig.color}`}
          >
            {typeConfig.label}
          </span>
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${severityConfig.bgColor} ${severityConfig.color}`}
          >
            {severityConfig.label}
          </span>
        </div>
      </div>

      <p className="text-[#8b9dc3] text-sm mb-3">{suggestion.description}</p>

      <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-3 mb-3">
        <div className="flex items-start gap-2">
          <div>
            <span className="text-sm font-medium text-[#f59e0b]">
              Recommendation:
            </span>
            <p className="text-sm text-[#8b9dc3] mt-1">
              {suggestion.recommendation}
            </p>
          </div>
        </div>
      </div>

      {suggestion.potentialSavings && (
        <div className="bg-[rgba(16,185,129,0.05)] border border-[rgba(16,185,129,0.1)] rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-[#10b981]">
              Potential Savings
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-lg font-bold text-[#10b981]">
                {formatGas(suggestion.potentialSavings.gas)}
              </div>
              <div className="text-xs text-[#8b9dc3]">Gas Saved</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-[#10b981]">
                {suggestion.potentialSavings.percentage}%
              </div>
              <div className="text-xs text-[#8b9dc3]">Reduction</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-[#10b981]">
                ${suggestion.potentialSavings.costUSD.toFixed(4)}
              </div>
              <div className="text-xs text-[#8b9dc3]">USD Saved</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export function OptimizationPanel({
  suggestions,
  className = "",
}: OptimizationPanelProps) {
  if (!suggestions || suggestions.length === 0) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <div className="text-center">
          <p className="text-[#10b981] text-sm font-medium">
            No optimization suggestions
          </p>
          <p className="text-[#8b9dc3] text-xs mt-1">
            Your transaction appears to be well-optimized!
          </p>
        </div>
      </div>
    );
  }

  const totalPotentialSavings = suggestions.reduce(
    (total, suggestion) => {
      if (suggestion.potentialSavings) {
        return {
          gas: total.gas + suggestion.potentialSavings.gas,
          costUSD: total.costUSD + suggestion.potentialSavings.costUSD,
        };
      }
      return total;
    },
    { gas: 0, costUSD: 0 }
  );

  const severityCounts = suggestions.reduce(
    (counts, suggestion) => {
      counts[suggestion.severity]++;
      return counts;
    },
    { high: 0, medium: 0, low: 0 }
  );

  const typeCounts = suggestions.reduce(
    (counts, suggestion) => {
      counts[suggestion.type]++;
      return counts;
    },
    { gas: 0, performance: 0, security: 0 }
  );

  return (
    <div className={className}>
      <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h5 className="text-sm font-medium text-[#8b9dc3] mb-3">
              Priority Breakdown
            </h5>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <span className="text-sm text-[#8b9dc3]">High</span>
                </div>
                <span className="text-sm font-medium text-red-400">
                  {severityCounts.high}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-[#f59e0b]" />
                  <span className="text-sm text-[#8b9dc3]">Medium</span>
                </div>
                <span className="text-sm font-medium text-[#f59e0b]">
                  {severityCounts.medium}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-[#00bfff]" />
                  <span className="text-sm text-[#8b9dc3]">Low</span>
                </div>
                <span className="text-sm font-medium text-[#00bfff]">
                  {severityCounts.low}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h5 className="text-sm font-medium text-[#8b9dc3] mb-3">
              Category Breakdown
            </h5>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#8b9dc3]">Gas Optimization</span>
                <span className="text-sm font-medium text-[#10b981]">
                  {typeCounts.gas}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#8b9dc3]">Performance</span>
                <span className="text-sm font-medium text-[#00bfff]">
                  {typeCounts.performance}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#8b9dc3]">Security</span>
                <span className="text-sm font-medium text-[#ef4444]">
                  {typeCounts.security}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h5 className="text-sm font-medium text-[#8b9dc3] mb-3">
              Total Potential Savings
            </h5>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-[#10b981]" />
                <span className="text-lg font-bold text-[#10b981]">
                  {formatGas(totalPotentialSavings.gas)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-[#10b981]" />
                <span className="text-lg font-bold text-[#10b981]">
                  ${totalPotentialSavings.costUSD.toFixed(4)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {suggestions.map((suggestion) => (
          <SuggestionCard key={suggestion.id} suggestion={suggestion} />
        ))}
      </div>

      <div className="mt-6 bg-[rgba(0,191,255,0.05)] border border-[rgba(0,191,255,0.1)] rounded-lg p-4">
        <div className="flex items-start gap-2">
          <Lightbulb className="h-5 w-5 text-[#00bfff] mt-0.5" />
          <div>
            <h5 className="text-sm font-medium text-[#00bfff] mb-1">
              Next Steps
            </h5>
            <p className="text-sm text-[#8b9dc3]">
              {severityCounts.high > 0
                ? `Start with ${severityCounts.high} high-priority optimization${severityCounts.high > 1 ? "s" : ""} for maximum impact.`
                : severityCounts.medium > 0
                  ? `Focus on ${severityCounts.medium} medium-priority optimization${severityCounts.medium > 1 ? "s" : ""} for good improvements.`
                  : "Consider implementing low-priority optimizations when convenient."}
              {totalPotentialSavings.gas > 0 &&
                ` Implementing all suggestions could save up to ${formatGas(totalPotentialSavings.gas)} gas and $${totalPotentialSavings.costUSD.toFixed(4)} USD.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
