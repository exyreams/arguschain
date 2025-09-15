import React, { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Badge, Button } from "@/components/global";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Clock,
  DollarSign,
  Info,
  Lightbulb,
  PieChart,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ProcessedReplayData } from "@/lib/replaytransactions/types";
import {
  categorizeGasUsage,
  VISUALIZATION_COLORS,
} from "@/lib/replaytransactions/constants";

interface GasAnalyticsDashboardProps {
  processedData: ProcessedReplayData;
  className?: string;
  gasPrice?: bigint;
  ethPrice?: number;
}

interface GasBreakdownData {
  category: string;
  gasUsed: number;
  percentage: number;
  cost: number;
  description: string;
  color: string;
}

interface FunctionGasData {
  function: string;
  gasUsed: number;
  callCount: number;
  averageGas: number;
  efficiency: number;
  category: string;
}

export const GasAnalyticsDashboard: React.FC<GasAnalyticsDashboardProps> = ({
  processedData,
  className,
  gasPrice = BigInt(20000000000),
  ethPrice = 2000,
}) => {
  const [activeTab, setActiveTab] = useState<
    "overview" | "breakdown" | "functions" | "optimization"
  >("overview");

  const gasMetrics = useMemo(() => {
    const totalGasUsed =
      processedData.performanceMetrics.costAnalysis.totalGasUsed;
    const gasPriceGwei = Number(gasPrice) / 1e9;
    const costEth = (Number(gasPrice) * totalGasUsed) / 1e18;
    const costUSD = costEth * ethPrice;

    const efficiency = processedData.performanceMetrics.gasEfficiency;

    const networkAverage = 150000;
    const efficiencyVsNetwork =
      totalGasUsed < networkAverage ? "above" : "below";
    const efficiencyPercentage =
      ((networkAverage - totalGasUsed) / networkAverage) * 100;
    return {
      totalGasUsed,
      gasPriceGwei,
      costEth,
      costUSD,
      efficiency,
      efficiencyVsNetwork,
      efficiencyPercentage: Math.abs(efficiencyPercentage),
      networkAverage,
    };
  }, [processedData, gasPrice, ethPrice]);

  const gasBreakdownData = useMemo((): GasBreakdownData[] => {
    const traceAnalysis = processedData.traceAnalysis;
    if (!traceAnalysis) return [];

    const functionCalls = traceAnalysis.functionCalls || [];
    const categoryTotals = functionCalls.reduce(
      (acc, call) => {
        const category = categorizeGasUsage(call.gasUsed);
        acc[category] = (acc[category] || 0) + call.gasUsed;
        return acc;
      },
      {} as Record<string, number>,
    );

    const totalGas = gasMetrics.totalGasUsed;
    const colors = Object.values(VISUALIZATION_COLORS);

    return Object.entries(categoryTotals).map(([category, gasUsed], index) => ({
      category,
      gasUsed,
      percentage: (gasUsed / totalGas) * 100,
      cost: ((Number(gasPrice) * gasUsed) / 1e18) * ethPrice,
      description: getCategoryDescription(category),
      color: colors[index % colors.length],
    }));
  }, [processedData, gasMetrics, gasPrice, ethPrice]);

  const functionGasData = useMemo((): FunctionGasData[] => {
    const traceAnalysis = processedData.traceAnalysis;
    if (!traceAnalysis) return [];

    return traceAnalysis.functionCalls.slice(0, 10).map((call) => ({
      function: call.name || call.signature,
      gasUsed: call.gasUsed,
      callCount: call.count,
      averageGas: call.gasUsed / call.count,
      efficiency: calculateFunctionEfficiency(call.gasUsed, call.count),
      category: call.category,
    }));
  }, [processedData]);

  const optimizationSuggestions =
    processedData.performanceMetrics.optimizationSuggestions || [];

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          <h2 className="text-xl font-semibold">Gas Analytics</h2>
        </div>
        <div className="flex space-x-2">
          {(
            ["overview", "breakdown", "functions", "optimization"] as const
          ).map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab(tab)}
              className="capitalize"
            >
              {tab}
            </Button>
          ))}
        </div>
      </div>

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Gas Used
                </p>
                <p className="text-2xl font-bold">
                  {gasMetrics.totalGasUsed.toLocaleString()}
                </p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Gas Price
                </p>
                <p className="text-2xl font-bold">
                  {gasMetrics.gasPriceGwei.toFixed(1)} Gwei
                </p>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Cost (ETH)
                </p>
                <p className="text-2xl font-bold">
                  {gasMetrics.costEth.toFixed(6)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Cost (USD)
                </p>
                <p className="text-2xl font-bold">
                  ${gasMetrics.costUSD.toFixed(2)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-orange-500" />
            </div>
          </div>

          <div className="bg-card rounded-lg border p-4 md:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">
                Efficiency Score
              </p>
              <Badge
                variant={
                  gasMetrics.efficiency > 80
                    ? "default"
                    : gasMetrics.efficiency > 60
                      ? "secondary"
                      : "destructive"
                }
              >
                {gasMetrics.efficiency.toFixed(1)}%
              </Badge>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  gasMetrics.efficiency > 80
                    ? "bg-green-500"
                    : gasMetrics.efficiency > 60
                      ? "bg-yellow-500"
                      : "bg-red-500",
                )}
                style={{ width: `${gasMetrics.efficiency}%` }}
              />
            </div>
          </div>

          <div className="bg-card rounded-lg border p-4 md:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">
                vs Network Average
              </p>
              {gasMetrics.efficiencyVsNetwork === "above" ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </div>
            <p className="text-lg font-semibold">
              {gasMetrics.efficiencyPercentage.toFixed(1)}%{" "}
              {gasMetrics.efficiencyVsNetwork} average
            </p>
            <p className="text-sm text-muted-foreground">
              Network avg: {gasMetrics.networkAverage.toLocaleString()} gas
            </p>
          </div>
        </div>
      )}

      {activeTab === "breakdown" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <PieChart className="h-5 w-5 mr-2" />
              Gas Usage by Category
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={gasBreakdownData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ category, percentage }) =>
                    `${category}: ${percentage.toFixed(1)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="gasUsed"
                >
                  {gasBreakdownData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip
                  formatter={(value: number, name: string) => [
                    `${value.toLocaleString()} gas`,
                    name,
                  ]}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Detailed Breakdown
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={gasBreakdownData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <RechartsTooltip
                  formatter={(value: number) => [
                    `${value.toLocaleString()} gas`,
                    "Gas Used",
                  ]}
                />
                <Bar dataKey="gasUsed" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="lg:col-span-2">
            <h3 className="text-lg font-semibold mb-4">Category Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {gasBreakdownData.map((category, index) => (
                <div key={index} className="bg-card rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{category.category}</h4>
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: category.color }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {category.description}
                  </p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Gas Used:</span>
                      <span className="font-medium">
                        {category.gasUsed.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Percentage:</span>
                      <span className="font-medium">
                        {category.percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Cost:</span>
                      <span className="font-medium">
                        ${category.cost.toFixed(4)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "functions" && (
        <div className="space-y-6">
          <div className="bg-card rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">
              Top Gas-Consuming Functions
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Function</th>
                    <th className="text-right py-2">Gas Used</th>
                    <th className="text-right py-2">Call Count</th>
                    <th className="text-right py-2">Avg Gas</th>
                    <th className="text-right py-2">Efficiency</th>
                    <th className="text-right py-2">Category</th>
                  </tr>
                </thead>
                <tbody>
                  {functionGasData.map((func, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2 font-mono text-sm">
                        {func.function}
                      </td>
                      <td className="text-right py-2">
                        {func.gasUsed.toLocaleString()}
                      </td>
                      <td className="text-right py-2">{func.callCount}</td>
                      <td className="text-right py-2">
                        {Math.round(func.averageGas).toLocaleString()}
                      </td>
                      <td className="text-right py-2">
                        <Badge
                          variant={
                            func.efficiency > 80
                              ? "default"
                              : func.efficiency > 60
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {func.efficiency.toFixed(0)}%
                        </Badge>
                      </td>
                      <td className="text-right py-2">
                        <Badge variant="outline">{func.category}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-card rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">
              Function Gas Usage Comparison
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={functionGasData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="function" type="category" width={150} />
                <RechartsTooltip
                  formatter={(value: number) => [
                    `${value.toLocaleString()} gas`,
                    "Gas Used",
                  ]}
                />
                <Bar dataKey="gasUsed" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === "optimization" && (
        <div className="space-y-6">
          <div className="bg-card rounded-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center">
                <Lightbulb className="h-5 w-5 mr-2 text-yellow-500" />
                Optimization Opportunities
              </h3>
              <Badge
                variant={gasMetrics.efficiency > 80 ? "default" : "secondary"}
              >
                {optimizationSuggestions.length} suggestions
              </Badge>
            </div>

            {optimizationSuggestions.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-lg font-medium">
                  Great job! No optimization suggestions.
                </p>
                <p className="text-muted-foreground">
                  Your transaction is already well-optimized.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {optimizationSuggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className={cn(
                      "border rounded-lg p-4",
                      suggestion.severity === "high" &&
                        "border-red-200 bg-red-50",
                      suggestion.severity === "medium" &&
                        "border-yellow-200 bg-yellow-50",
                      suggestion.severity === "low" &&
                        "border-blue-200 bg-blue-50",
                    )}
                  >
                    <div className="flex items-start space-x-3">
                      {suggestion.severity === "high" && (
                        <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                      )}
                      {suggestion.severity === "medium" && (
                        <Info className="h-5 w-5 text-yellow-500 mt-0.5" />
                      )}
                      {suggestion.severity === "low" && (
                        <Lightbulb className="h-5 w-5 text-blue-500 mt-0.5" />
                      )}

                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{suggestion.title}</h4>
                          <Badge
                            variant={
                              suggestion.severity === "high"
                                ? "destructive"
                                : suggestion.severity === "medium"
                                  ? "secondary"
                                  : "default"
                            }
                          >
                            {suggestion.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {suggestion.description}
                        </p>
                        <p className="text-sm font-medium">
                          {suggestion.recommendation}
                        </p>

                        {suggestion.potentialSavings && (
                          <div className="mt-3 p-3 bg-background rounded border">
                            <p className="text-sm font-medium text-green-600">
                              Potential Savings:
                            </p>
                            <div className="grid grid-cols-3 gap-4 mt-1">
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Gas
                                </p>
                                <p className="text-sm font-medium">
                                  {suggestion.potentialSavings.gas.toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Percentage
                                </p>
                                <p className="text-sm font-medium">
                                  {suggestion.potentialSavings.percentage.toFixed(
                                    1,
                                  )}
                                  %
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Cost (USD)
                                </p>
                                <p className="text-sm font-medium">
                                  $
                                  {suggestion.potentialSavings.costUSD.toFixed(
                                    2,
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card rounded-lg border p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <p className="text-sm font-medium">Execution Time</p>
              </div>
              <p className="text-lg font-bold">
                ~{Math.round(gasMetrics.totalGasUsed / 15000)}ms
              </p>
              <p className="text-xs text-muted-foreground">
                Estimated based on gas usage
              </p>
            </div>

            <div className="bg-card rounded-lg border p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Target className="h-4 w-4 text-green-500" />
                <p className="text-sm font-medium">Optimization Score</p>
              </div>
              <p className="text-lg font-bold">
                {gasMetrics.efficiency.toFixed(0)}%
              </p>
              <p className="text-xs text-muted-foreground">
                Based on gas efficiency
              </p>
            </div>

            <div className="bg-card rounded-lg border p-4">
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className="h-4 w-4 text-purple-500" />
                <p className="text-sm font-medium">Potential Savings</p>
              </div>
              <p className="text-lg font-bold">
                $
                {optimizationSuggestions
                  .reduce(
                    (sum, s) => sum + (s.potentialSavings?.costUSD || 0),
                    0,
                  )
                  .toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                If all optimizations applied
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function getCategoryDescription(category: string): string {
  const descriptions: Record<string, string> = {
    Storage: "Contract storage read/write operations",
    Computation: "Mathematical calculations and logic",
    Transfer: "ETH and token transfers",
    External: "External contract calls",
    System: "System-level operations",
    Other: "Miscellaneous operations",
  };
  return descriptions[category] || "Unknown category";
}

function calculateFunctionEfficiency(
  gasUsed: number,
  callCount: number,
): number {
  const avgGasPerCall = gasUsed / callCount;
  const maxExpectedGas = 100000;
  return Math.max(
    0,
    Math.min(100, ((maxExpectedGas - avgGasPerCall) / maxExpectedGas) * 100),
  );
}
