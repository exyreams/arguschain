import React, { useState } from "react";
import { Badge, Button, Card } from "@/components/global";
import {
  ChevronDown,
  ChevronRight,
  DollarSign,
  Lightbulb,
  Shield,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import type { OptimizationSuggestion } from "@/lib/replaytransactions";
import { VISUALIZATION_COLORS } from "@/lib/replaytransactions";

interface OptimizationSuggestionsProps {
  suggestions: OptimizationSuggestion[];
  className?: string;
}

export const OptimizationSuggestions: React.FC<
  OptimizationSuggestionsProps
> = ({ suggestions, className = "" }) => {
  const [expandedSuggestions, setExpandedSuggestions] = useState<Set<string>>(
    new Set(),
  );
  const [filterType, setFilterType] = useState<
    "all" | "gas" | "performance" | "security"
  >("all");
  const [filterSeverity, setFilterSeverity] = useState<
    "all" | "high" | "medium" | "low"
  >("all");

  const filteredSuggestions = suggestions.filter((suggestion) => {
    const typeMatch = filterType === "all" || suggestion.type === filterType;
    const severityMatch =
      filterSeverity === "all" || suggestion.severity === filterSeverity;
    return typeMatch && severityMatch;
  });

  const suggestionsByType = filteredSuggestions.reduce(
    (acc, suggestion) => {
      if (!acc[suggestion.type]) {
        acc[suggestion.type] = [];
      }
      acc[suggestion.type].push(suggestion);
      return acc;
    },
    {} as Record<string, OptimizationSuggestion[]>,
  );

  const totalPotentialSavings = suggestions.reduce((total, suggestion) => {
    return total + (suggestion.potentialSavings?.gas || 0);
  }, 0);

  const totalPotentialCostSavings = suggestions.reduce((total, suggestion) => {
    return total + (suggestion.potentialSavings?.costUSD || 0);
  }, 0);

  const toggleSuggestion = (suggestionId: string) => {
    const newExpanded = new Set(expandedSuggestions);
    if (newExpanded.has(suggestionId)) {
      newExpanded.delete(suggestionId);
    } else {
      newExpanded.add(suggestionId);
    }
    setExpandedSuggestions(newExpanded);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "gas":
        return <Zap className="h-4 w-4" />;
      case "performance":
        return <TrendingUp className="h-4 w-4" />;
      case "security":
        return <Shield className="h-4 w-4" />;
      default:
        return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return VISUALIZATION_COLORS.error;
      case "medium":
        return VISUALIZATION_COLORS.warning;
      case "low":
        return VISUALIZATION_COLORS.info;
      default:
        return VISUALIZATION_COLORS.secondary;
    }
  };

  if (suggestions.length === 0) {
    return (
      <Card
        className={`bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)] ${className}`}
      >
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="h-5 w-5 text-[#4ade80]" />
            <h3 className="text-lg font-semibold text-[#4ade80]">
              Optimization Analysis
            </h3>
          </div>
          <div className="text-center py-8">
            <Target className="h-12 w-12 text-[#4ade80] mx-auto mb-4" />
            <div className="text-[#4ade80] font-semibold mb-2">
              Well Optimized Transaction
            </div>
            <div className="text-[#8b9dc3] text-sm">
              No optimization opportunities identified. The transaction appears
              to be efficiently executed.
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={`bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)] ${className}`}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-[#fbbf24]" />
            <h3 className="text-lg font-semibold text-[#fbbf24]">
              Optimization Suggestions
            </h3>
          </div>
          <Badge
            variant="outline"
            className="border-[rgba(251,191,36,0.3)] text-[#fbbf24] bg-[rgba(251,191,36,0.1)]"
          >
            {suggestions.length} Opportunities
          </Badge>
        </div>

        {(totalPotentialSavings > 0 || totalPotentialCostSavings > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-[#00bfff]" />
                <span className="text-sm text-[#8b9dc3]">
                  Potential Gas Savings
                </span>
              </div>
              <div className="text-2xl font-bold text-[#00bfff]">
                {totalPotentialSavings.toLocaleString()}
              </div>
              <div className="text-xs text-[#8b9dc3]">Gas units</div>
            </div>

            <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-[#00bfff]" />
                <span className="text-sm text-[#8b9dc3]">
                  Potential Cost Savings
                </span>
              </div>
              <div className="text-2xl font-bold text-[#00bfff]">
                ${totalPotentialCostSavings.toFixed(2)}
              </div>
              <div className="text-xs text-[#8b9dc3]">USD</div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-6">
          <div className="flex gap-1">
            <Button
              variant={filterType === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("all")}
              className={
                filterType === "all"
                  ? "bg-[#00bfff] text-[#0f1419]"
                  : "border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
              }
            >
              All Types
            </Button>
            <Button
              variant={filterType === "gas" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("gas")}
              className={
                filterType === "gas"
                  ? "bg-[#00bfff] text-[#0f1419]"
                  : "border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
              }
            >
              <Zap className="h-3 w-3 mr-1" />
              Gas
            </Button>
            <Button
              variant={filterType === "performance" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("performance")}
              className={
                filterType === "performance"
                  ? "bg-[#00bfff] text-[#0f1419]"
                  : "border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
              }
            >
              <TrendingUp className="h-3 w-3 mr-1" />
              Performance
            </Button>
            <Button
              variant={filterType === "security" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType("security")}
              className={
                filterType === "security"
                  ? "bg-[#00bfff] text-[#0f1419]"
                  : "border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
              }
            >
              <Shield className="h-3 w-3 mr-1" />
              Security
            </Button>
          </div>

          <div className="flex gap-1">
            <Button
              variant={filterSeverity === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterSeverity("all")}
              className={
                filterSeverity === "all"
                  ? "bg-[#00bfff] text-[#0f1419]"
                  : "border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
              }
            >
              All Severity
            </Button>
            <Button
              variant={filterSeverity === "high" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterSeverity("high")}
              className={
                filterSeverity === "high"
                  ? "bg-[#00bfff] text-[#0f1419]"
                  : "border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
              }
            >
              High
            </Button>
            <Button
              variant={filterSeverity === "medium" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterSeverity("medium")}
              className={
                filterSeverity === "medium"
                  ? "bg-[#00bfff] text-[#0f1419]"
                  : "border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
              }
            >
              Medium
            </Button>
            <Button
              variant={filterSeverity === "low" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterSeverity("low")}
              className={
                filterSeverity === "low"
                  ? "bg-[#00bfff] text-[#0f1419]"
                  : "border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
              }
            >
              Low
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {filteredSuggestions.map((suggestion) => {
            const isExpanded = expandedSuggestions.has(suggestion.id);
            const severityColor = getSeverityColor(suggestion.severity);

            return (
              <div
                key={suggestion.id}
                className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg overflow-hidden hover:bg-[rgba(15,20,25,0.9)] transition-colors"
              >
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => toggleSuggestion(suggestion.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-[#00bfff]">
                      {getTypeIcon(suggestion.type)}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant="outline"
                          className="text-xs"
                          style={{
                            borderColor: severityColor,
                            color: severityColor,
                            backgroundColor: `${severityColor}20`,
                          }}
                        >
                          {suggestion.severity.toUpperCase()}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)] text-xs"
                        >
                          {suggestion.type.toUpperCase()}
                        </Badge>
                        {suggestion.potentialSavings && (
                          <Badge
                            variant="outline"
                            className="border-[rgba(74,222,128,0.3)] text-[#4ade80] bg-[rgba(74,222,128,0.1)] text-xs"
                          >
                            Save{" "}
                            {suggestion.potentialSavings.gas.toLocaleString()}{" "}
                            gas
                          </Badge>
                        )}
                      </div>

                      <div className="text-[#00bfff] font-medium mb-1">
                        {suggestion.title}
                      </div>

                      <div className="text-sm text-[#8b9dc3]">
                        {suggestion.description}
                      </div>
                    </div>

                    <div className="mt-0.5">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-[#8b9dc3]" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-[#8b9dc3]" />
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-[rgba(0,191,255,0.1)]">
                    <div className="pt-4 space-y-3">
                      <div>
                        <h5 className="text-sm font-semibold text-[#00bfff] mb-2">
                          Recommendation
                        </h5>
                        <p className="text-sm text-[#8b9dc3]">
                          {suggestion.recommendation}
                        </p>
                      </div>

                      {suggestion.potentialSavings && (
                        <div>
                          <h5 className="text-sm font-semibold text-[#00bfff] mb-2">
                            Potential Savings
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                            <div className="flex justify-between">
                              <span className="text-[#8b9dc3]">Gas:</span>
                              <span className="text-[#4ade80]">
                                {suggestion.potentialSavings.gas.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#8b9dc3]">
                                Percentage:
                              </span>
                              <span className="text-[#4ade80]">
                                {suggestion.potentialSavings.percentage.toFixed(
                                  1,
                                )}
                                %
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#8b9dc3]">Cost USD:</span>
                              <span className="text-[#4ade80]">
                                $
                                {suggestion.potentialSavings.costUSD.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {suggestion.affectedFunctions &&
                        suggestion.affectedFunctions.length > 0 && (
                          <div>
                            <h5 className="text-sm font-semibold text-[#00bfff] mb-2">
                              Affected Functions
                            </h5>
                            <div className="flex flex-wrap gap-1">
                              {suggestion.affectedFunctions.map(
                                (func, index) => (
                                  <Badge
                                    key={index}
                                    variant="outline"
                                    className="border-[rgba(139,157,195,0.3)] text-[#8b9dc3] bg-[rgba(139,157,195,0.1)] text-xs"
                                  >
                                    {func}
                                  </Badge>
                                ),
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredSuggestions.length === 0 && (
          <div className="text-center py-8">
            <div className="text-[#8b9dc3]">
              No suggestions match the selected filters
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
