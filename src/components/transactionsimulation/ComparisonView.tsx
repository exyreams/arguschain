import React, { useMemo, useState } from "react";
import { Button, Badge, Alert, Dropdown } from "@/components/global";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Download,
  Eye,
  EyeOff,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";
import { GasProcessor, SimulationUtils } from "@/lib/transactionsimulation";
import { GasComparisonChart } from "./charts";
import type {
  ComparisonAnalysis,
  ComparisonResult,
  GasComparisonChartData,
} from "@/lib/transactionsimulation/types";

interface ComparisonViewProps {
  results: ComparisonResult[];
  analysis?: ComparisonAnalysis;
  functionName: string;
  onExport?: (format: "json" | "csv") => void;
  showChart?: boolean;
  className?: string;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({
  results,
  analysis,
  functionName,
  onExport,
  showChart = true,
  className = "",
}) => {
  const [sortBy, setSortBy] = useState<"variant" | "gas" | "status">("gas");
  const [showVisualization, setShowVisualization] = useState(showChart);

  const chartData = useMemo((): GasComparisonChartData => {
    if (analysis?.chartData) {
      return analysis.chartData;
    }

    return {
      data: results.map((result) => ({
        name: result.variant,
        gasUsed: result.gasUsed,
        relativeCost: result.relativeGasCost || 1,
        efficiency: result.success
          ? Math.max(0, 100 - result.gasUsed / 1000)
          : 0,
        success: result.success,
        category: result.gasCategory,
      })),
      chartType: "bar",
      colors: {
        primary: "#00bfff",
        secondary: "#8b9dc3",
        success: "#10b981",
        error: "#ef4444",
        warning: "#f59e0b",
      },
    };
  }, [results, analysis]);

  const sortedResults = [...results].sort((a, b) => {
    switch (sortBy) {
      case "gas":
        return a.gasUsed - b.gasUsed;
      case "status":
        const aSuccess = a.success || a.hypotheticalSuccess;
        const bSuccess = b.success || b.hypotheticalSuccess;
        if (aSuccess && !bSuccess) return -1;
        if (!aSuccess && bSuccess) return 1;
        return a.gasUsed - b.gasUsed;
      default:
        return a.variant.localeCompare(b.variant);
    }
  });

  const successfulResults = results.filter(
    (r) => r.success || r.hypotheticalSuccess
  );
  const gasComparison = GasProcessor.compareGasUsage(
    results.map((r) => ({
      ...r,
      functionName,
      operationCategory: "Comparison",
      timestamp: new Date().toISOString(),
      output: null,
      stateChanges: [],
      calls: [],
    }))
  );

  const getStatusIcon = (result: ComparisonResult) => {
    if (result.success) {
      return <CheckCircle className="h-4 w-4 text-green-400" />;
    } else if (result.hypotheticalSuccess) {
      return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
    } else {
      return <XCircle className="h-4 w-4 text-red-400" />;
    }
  };

  const getStatusBadge = (result: ComparisonResult) => {
    if (result.success) {
      return (
        <Badge className="bg-green-500/20 border-green-500/50 text-green-400">
          Success
        </Badge>
      );
    } else if (result.hypotheticalSuccess) {
      return (
        <Badge className="bg-yellow-500/20 border-yellow-500/50 text-yellow-400">
          Hypothetical
        </Badge>
      );
    } else {
      return (
        <Badge
          variant="destructive"
          className="bg-red-500/20 border-red-500/50 text-red-400"
        >
          Failed
        </Badge>
      );
    }
  };

  const formatParameters = (parameters: any[]) => {
    return parameters
      .map((param, index) => {
        if (
          typeof param === "string" &&
          param.startsWith("0x") &&
          param.length === 42
        ) {
          return SimulationUtils.shortenAddress(param);
        }
        if (typeof param === "number" && param > 1000) {
          return SimulationUtils.formatTokenAmount(param);
        }
        return String(param);
      })
      .join(", ");
  };

  return (
    <div
      className={`bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6 ${className}`}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
          >
            {results.length} variants
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowVisualization(!showVisualization)}
            className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
          >
            {showVisualization ? (
              <EyeOff className="h-4 w-4 mr-1" />
            ) : (
              <Eye className="h-4 w-4 mr-1" />
            )}
            Chart
          </Button>

          <Dropdown
            value={sortBy}
            onValueChange={(value) =>
              setSortBy(value as "variant" | "gas" | "status")
            }
            placeholder="Sort by..."
            options={[
              { value: "variant", label: "Sort by Variant" },
              { value: "gas", label: "Sort by Gas" },
              { value: "status", label: "Sort by Status" },
            ]}
            className="w-48"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-[#00bfff]">
            {results.length}
          </div>
          <div className="text-sm text-text-secondary">Total Variants</div>
        </div>

        <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-400">
            {successfulResults.length}
          </div>
          <div className="text-sm text-text-secondary">Successful</div>
        </div>

        <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-[#00bfff]">
            {gasComparison.averageGas > 0
              ? SimulationUtils.formatGas(Math.round(gasComparison.averageGas))
              : "0"}
          </div>
          <div className="text-sm text-text-secondary">Avg Gas</div>
        </div>

        <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-[#00bfff]">
            {gasComparison.gasRange.max > 0
              ? `${Math.round(((gasComparison.gasRange.max - gasComparison.gasRange.min) / gasComparison.gasRange.min) * 100)}%`
              : "0%"}
          </div>
          <div className="text-sm text-text-secondary">Gas Variation</div>
        </div>
      </div>

      {showVisualization && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-[#00bfff] mb-3 flex items-center gap-2">
            Gas Usage Comparison
          </h4>
          <GasComparisonChart data={chartData} height={300} />
        </div>
      )}

      {gasComparison.mostEfficient && gasComparison.leastEfficient && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-[#00bfff] mb-3 flex items-center gap-2">
            Efficiency Analysis
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[rgba(15,20,25,0.8)] border border-green-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-green-400 font-medium">
                  Most Efficient
                </span>
              </div>
              <div className="text-sm space-y-1">
                <div className="text-text-secondary">
                  Variant:{" "}
                  <span className="text-accent-primary">
                    {gasComparison.mostEfficient.functionName}
                  </span>
                </div>
                <div className="text-text-secondary">
                  Gas Used:{" "}
                  <span className="text-accent-primary">
                    {SimulationUtils.formatGas(
                      gasComparison.mostEfficient.gasUsed
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-[rgba(15,20,25,0.8)] border border-red-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="h-4 w-4 text-red-400" />
                <span className="text-red-400 font-medium">
                  Least Efficient
                </span>
              </div>
              <div className="text-sm space-y-1">
                <div className="text-text-secondary">
                  Variant:{" "}
                  <span className="text-accent-primary">
                    {gasComparison.leastEfficient.functionName}
                  </span>
                </div>
                <div className="text-text-secondary">
                  Gas Used:{" "}
                  <span className="text-accent-primary">
                    {SimulationUtils.formatGas(
                      gasComparison.leastEfficient.gasUsed
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {gasComparison.recommendations.length > 0 && (
        <Alert className="mb-6 bg-blue-500/10 border-blue-500/50 text-blue-400">
          <Zap className="h-4 w-4" />
          <div>
            <div className="font-medium">Optimization Recommendations:</div>
            <ul className="mt-1 text-sm list-disc list-inside">
              {gasComparison.recommendations.map((rec, index) => (
                <li key={index}>{rec}</li>
              ))}
            </ul>
          </div>
        </Alert>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[rgba(0,191,255,0.2)]">
              <th className="text-left py-3 px-4 text-[#00bfff] font-medium">
                Variant
              </th>
              <th className="text-left py-3 px-4 text-[#00bfff] font-medium">
                Parameters
              </th>
              <th className="text-left py-3 px-4 text-[#00bfff] font-medium">
                Status
              </th>
              <th className="text-right py-3 px-4 text-[#00bfff] font-medium">
                Gas Used
              </th>
              <th className="text-right py-3 px-4 text-[#00bfff] font-medium">
                Relative Cost
              </th>
              <th className="text-left py-3 px-4 text-[#00bfff] font-medium">
                Category
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedResults.map((result, index) => (
              <tr
                key={index}
                className="border-b border-[rgba(0,191,255,0.1)] hover:bg-[rgba(0,191,255,0.05)] transition-colors"
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(result)}
                    <span className="text-text-secondary font-medium">
                      {result.variant}
                    </span>
                  </div>
                </td>

                <td className="py-3 px-4">
                  <span className="text-text-secondary font-mono text-sm">
                    {formatParameters(result.parameters)}
                  </span>
                </td>

                <td className="py-3 px-4">{getStatusBadge(result)}</td>

                <td className="py-3 px-4 text-right">
                  <span className="text-text-secondary font-mono">
                    {SimulationUtils.formatGas(result.gasUsed)}
                  </span>
                </td>

                <td className="py-3 px-4 text-right">
                  {result.relativeGasCost ? (
                    <span
                      className={`font-mono ${
                        result.relativeGasCost === 1
                          ? "text-green-400"
                          : result.relativeGasCost < 1.2
                            ? "text-yellow-400"
                            : "text-red-400"
                      }`}
                    >
                      {result.relativeGasCost.toFixed(2)}x
                    </span>
                  ) : (
                    <span className="text-[#6b7280]">-</span>
                  )}
                </td>

                <td className="py-3 px-4">
                  <span className="text-text-secondary text-sm">
                    {result.gasCategory}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {results.some((r) => r.error) && (
        <div className="mt-6">
          <h4 className="text-lg font-semibold text-[#00bfff] mb-3">
            Error Summary
          </h4>
          <div className="space-y-2">
            {results
              .filter((r) => r.error)
              .map((result, index) => (
                <div
                  key={index}
                  className="bg-[rgba(15,20,25,0.8)] border border-red-500/30 rounded-lg p-3"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <XCircle className="h-4 w-4 text-red-400" />
                    <span className="text-red-400 font-medium">
                      {result.variant}
                    </span>
                  </div>
                  <div className="text-sm text-text-secondary ml-6">
                    {result.error}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
