import React, { useState } from "react";
import { Button, Input, Card, Alert, Loader, Badge } from "@/components/global";
import {
  GitCompare,
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  BarChart3,
  Shield,
  Zap,
  XCircle,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTraceTransactionAnalysis } from "@/hooks/tracetransaction";
import type { TraceAnalysisResults } from "@/lib/tracetransaction/types";

interface ComparativeAnalysisProps {
  primaryTransaction?: TraceAnalysisResults;
  initialTransaction?: string;
  className?: string;
}

interface ComparisonMetric {
  name: string;
  primary: number | string;
  secondary: number | string;
  unit?: string;
  trend: "up" | "down" | "neutral";
  difference: string;
  percentageChange: number;
  transaction1: number;
  transaction2: number;
}

interface ComparisonDifference {
  category: string;
  impact: string;
  description: string;
}

export const ComparativeAnalysis: React.FC<ComparativeAnalysisProps> = ({
  primaryTransaction,
  initialTransaction,
  className,
}) => {
  const [txHash1, setTxHash1] = useState(initialTransaction || "");
  const [txHash2, setTxHash2] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [comparison, setComparison] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    results: secondaryResults,
    isAnalyzing: isAnalyzingSecondary,
    error: secondaryError,
    analyzeTransaction,
    validateTxHash,
  } = useTraceTransactionAnalysis();

  const handleCompare = async () => {
    if (!txHash1 || !txHash2) {
      setError("Please enter both transaction hashes");
      return;
    }

    const validation1 = validateTxHash(txHash1);
    const validation2 = validateTxHash(txHash2);

    if (!validation1.isValid) {
      setError(`Invalid first transaction hash: ${validation1.error}`);
      return;
    }

    if (!validation2.isValid) {
      setError(`Invalid second transaction hash: ${validation2.error}`);
      return;
    }

    setIsComparing(true);
    setError(null);

    try {
      // For now, create a mock comparison since we don't have the full comparison logic
      const mockComparison = {
        transaction1: {
          hash: txHash1,
          summary: {
            pattern: "DeFi Swap",
            gasUsed: 150000,
            actionCount: 5,
            contractCount: 3,
            hasErrors: false,
          },
        },
        transaction2: {
          hash: txHash2,
          summary: {
            pattern: "Token Transfer",
            gasUsed: 21000,
            actionCount: 1,
            contractCount: 1,
            hasErrors: false,
          },
        },
        metrics: {
          actionCount: {
            transaction1: 5,
            transaction2: 1,
            difference: 4,
            percentageChange: 400,
          },
          gasUsage: {
            transaction1: 150000,
            transaction2: 21000,
            difference: 129000,
            percentageChange: 614,
          },
          contractCount: {
            transaction1: 3,
            transaction2: 1,
            difference: 2,
            percentageChange: 200,
          },
          maxDepth: {
            transaction1: 3,
            transaction2: 1,
            difference: 2,
            percentageChange: 200,
          },
          errorCount: {
            transaction1: 0,
            transaction2: 0,
            difference: 0,
            percentageChange: 0,
          },
        },
        differences: [
          {
            category: "Pattern",
            impact: "high",
            description:
              "Transaction patterns differ significantly - DeFi Swap vs Token Transfer",
          },
          {
            category: "Gas Usage",
            impact: "high",
            description:
              "Gas usage differs by 614% - significantly higher complexity in first transaction",
          },
        ],
        patternComparison: {
          summary:
            "Transaction patterns show different use cases - complex DeFi interaction vs simple transfer",
          typeChanged: true,
        },
        gasComparison: {
          summary:
            "First transaction uses significantly more gas due to complex DeFi operations",
        },
        securityComparison: {
          summary:
            "Both transactions appear secure with no major concerns detected",
          newConcerns: [],
          resolvedConcerns: [],
        },
        recommendations: [
          "Consider gas optimization for complex DeFi operations",
          "Monitor for MEV opportunities in high-value swaps",
        ],
      };

      setComparison(mockComparison);
    } catch (err) {
      console.error("Failed to compare transactions:", err);
      setError("Failed to compare transactions. Please try again.");
    } finally {
      setIsComparing(false);
    }
  };

  const clearComparison = () => {
    setComparison(null);
    setError(null);
  };

  return (
    <div className={cn("space-y-6", className)}>
      <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4 text-[#00bfff]">
          <span className="font-semibold">Compare Two Transactions</span>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#8b9dc3]">
                Transaction 1
              </label>
              <Input
                placeholder="Enter first transaction hash..."
                value={txHash1}
                onChange={(e) => setTxHash1(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#8b9dc3]">
                Transaction 2
              </label>
              <Input
                placeholder="Enter second transaction hash..."
                value={txHash2}
                onChange={(e) => setTxHash2(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleCompare}
              disabled={!txHash1 || !txHash2 || isComparing}
              className="bg-[#00bfff] hover:bg-[#0099cc] text-[#0f1419]"
            >
              {isComparing ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Comparing...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Compare Transactions
                </>
              )}
            </Button>
            {comparison && (
              <Button
                onClick={clearComparison}
                variant="outline"
                className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
              >
                Clear Comparison
              </Button>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <span>{error}</span>
            </Alert>
          )}
        </div>
      </div>

      {comparison && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TransactionSummaryCard
              title="Transaction 1"
              hash={comparison.transaction1.hash}
              summary={comparison.transaction1.summary}
            />
            <TransactionSummaryCard
              title="Transaction 2"
              hash={comparison.transaction2.hash}
              summary={comparison.transaction2.summary}
            />
          </div>

          <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6 space-y-6">
            <div className="flex items-center gap-2 mb-4 text-[#00bfff]">
              <span className="font-semibold">Metrics Comparison</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <MetricComparisonCard
                title="Actions"
                metric={comparison.metrics.actionCount}
                icon={<Activity className="h-4 w-4 text-text-secondary" />}
              />
              <MetricComparisonCard
                title="Gas Usage"
                metric={comparison.metrics.gasUsage}
                icon={<Zap className="h-4 w-4 text-text-secondary" />}
                formatter={(value) => value.toLocaleString()}
              />
              <MetricComparisonCard
                title="Contracts"
                metric={comparison.metrics.contractCount}
                icon={<Shield className="h-4 w-4 text-text-secondary" />}
              />
              <MetricComparisonCard
                title="Max Depth"
                metric={comparison.metrics.maxDepth}
                icon={<BarChart3 className="h-4 w-4 text-text-secondary" />}
              />
              <MetricComparisonCard
                title="Errors"
                metric={comparison.metrics.errorCount}
                icon={<XCircle className="h-4 w-4 text-text-secondary" />}
              />
            </div>

            {comparison.differences.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4 text-[#00bfff]">
                  <span className="font-semibold">Key Differences</span>
                </div>
                <div className="space-y-3">
                  {comparison.differences.map(
                    (diff: ComparisonDifference, index: number) => (
                      <DifferenceCard key={index} difference={diff} />
                    )
                  )}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 mb-4 text-[#00bfff]">
                <span className="font-semibold">Pattern Analysis</span>
              </div>
              <div className="p-4 bg-[rgba(15,20,25,0.6)] rounded-lg border border-[rgba(0,191,255,0.3)]">
                <p className="text-[#8b9dc3]">
                  {comparison.patternComparison.summary}
                </p>
                {comparison.patternComparison.typeChanged && (
                  <div className="mt-2 flex items-center gap-2 text-yellow-400">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">Pattern type changed</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-4 text-[#00bfff]">
                <span className="font-semibold">Gas Analysis</span>
              </div>
              <div className="p-4 bg-[rgba(15,20,25,0.6)] rounded-lg border border-[rgba(0,191,255,0.3)]">
                <p className="text-[#8b9dc3]">
                  {comparison.gasComparison.summary}
                </p>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-4 text-[#00bfff]">
                <span className="font-semibold">Security Assessment</span>
              </div>
              <div className="p-4 bg-[rgba(15,20,25,0.6)] rounded-lg border border-[rgba(0,191,255,0.3)]">
                <p className="text-[#8b9dc3]">
                  {comparison.securityComparison.summary}
                </p>

                {comparison.securityComparison.newConcerns.length > 0 && (
                  <div className="mt-3">
                    <h4 className="text-sm font-medium text-red-400 mb-2">
                      New Security Concerns:
                    </h4>
                    <div className="space-y-1">
                      {comparison.securityComparison.newConcerns.map(
                        (concern: any, index: number) => (
                          <div key={index} className="text-sm text-[#8b9dc3]">
                            • {concern.description}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                {comparison.securityComparison.resolvedConcerns.length > 0 && (
                  <div className="mt-3">
                    <h4 className="text-sm font-medium text-green-400 mb-2">
                      Resolved Security Concerns:
                    </h4>
                    <div className="space-y-1">
                      {comparison.securityComparison.resolvedConcerns.map(
                        (concern: any, index: number) => (
                          <div key={index} className="text-sm text-[#8b9dc3]">
                            • {concern.description}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {comparison.recommendations.length > 0 && (
              <div>
                <div className="flex items-center mb-4 text-[#00bfff]">
                  <span className="font-semibold">Recommendations</span>
                </div>
                <div className="rounded-lg p-3 bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.3)]">
                  {comparison.recommendations.map(
                    (recommendation: string, index: number) => (
                      <div key={index} className="flex items-start gap-2">
                        <span className="h-4 w-4 text-[#00bfff] mb-1 flex-shrink-0">
                          •
                        </span>
                        <p className="text-[#8b9dc3] text-sm">
                          {recommendation}
                        </p>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper Components
const TransactionSummaryCard: React.FC<{
  title: string;
  hash: string;
  summary: any;
}> = ({ title, hash, summary }) => (
  <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
    <h3 className="text-lg font-semibold text-[#00bfff] mb-3">{title}</h3>
    <p className="text-xs text-[#8b9dc3] font-mono break-all mb-4">{hash}</p>
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 text-md">
        <div>
          <span className="text-[#8b9dc3]">Pattern:</span>
          <span className="ml-2 text-accent-primary">{summary.pattern}</span>
        </div>
        <div>
          <span className="text-[#8b9dc3]">Gas:</span>
          <span className="ml-2 text-accent-primary">
            {summary.gasUsed.toLocaleString()}
          </span>
        </div>
        <div>
          <span className="text-[#8b9dc3]">Actions:</span>
          <span className="ml-2 text-accent-primary">
            {summary.actionCount}
          </span>
        </div>
        <div>
          <span className="text-[#8b9dc3]">Contracts:</span>
          <span className="ml-2 text-accent-primary">
            {summary.contractCount}
          </span>
        </div>
      </div>
      {summary.hasErrors && (
        <Badge variant="destructive" className="text-xs">
          Has Errors
        </Badge>
      )}
    </div>
  </div>
);

const MetricComparisonCard: React.FC<{
  title: string;
  metric: any;
  icon: React.ReactNode;
  formatter?: (value: number) => string;
}> = ({ title, metric, icon, formatter = (v) => v.toString() }) => (
  <div className="p-4 bg-[rgba(15,20,25,0.6)] rounded-lg border border-[rgba(0,191,255,0.3)]">
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-medium text-[#8b9dc3]">{title}</span>
      </div>
      {getChangeIcon(metric.percentageChange)}
    </div>

    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-[#8b9dc3]">
        <span>TX1: {formatter(metric.transaction1)}</span>
        <ArrowRight className="h-3 w-3" />
        <span>TX2: {formatter(metric.transaction2)}</span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-white">
          Diff: {formatter(Math.abs(metric.difference))}
        </span>
        <span
          className={`text-sm ${
            metric.percentageChange > 0
              ? "text-red-400"
              : metric.percentageChange < 0
                ? "text-green-400"
                : "text-[#8b9dc3]"
          }`}
        >
          {formatPercentageChange(metric.percentageChange)}
        </span>
      </div>
    </div>
  </div>
);

const DifferenceCard: React.FC<{
  difference: ComparisonDifference;
}> = ({ difference }) => (
  <div className={`p-3 rounded-lg border ${getImpactColor(difference.impact)}`}>
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="text-xs">
            {difference.category}
          </Badge>
          <Badge
            variant="outline"
            className={`text-xs ${getImpactColor(difference.impact)}`}
          >
            {difference.impact}
          </Badge>
        </div>
        <p className="text-sm text-[#8b9dc3]">{difference.description}</p>
      </div>
    </div>
  </div>
);

// Helper Functions
const getChangeIcon = (change: number) => {
  if (change > 0) return <TrendingUp className="h-4 w-4 text-red-500" />;
  if (change < 0) return <TrendingDown className="h-4 w-4 text-green-500" />;
  return <Minus className="h-4 w-4 text-[#8b9dc3]" />;
};

const formatPercentageChange = (change: number) => {
  const abs = Math.abs(change);
  const sign = change > 0 ? "+" : change < 0 ? "-" : "";
  return `${sign}${abs.toFixed(1)}%`;
};

const getImpactColor = (impact: string) => {
  switch (impact) {
    case "high":
      return "text-red-400 bg-red-500/10 border-red-500/30";
    case "medium":
      return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
    case "low":
      return "text-green-400 bg-green-500/10 border-green-500/30";
    default:
      return "text-[#8b9dc3] bg-gray-500/10 border-gray-500/30";
  }
};
