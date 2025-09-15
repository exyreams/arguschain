import { PYUSD_GAS_BENCHMARKS } from "./constants";
import type {
  BenchmarkComparison,
  EfficiencyMetric,
  GasAnalysisData,
  GasBreakdownData,
  GasDistribution,
  GasEfficiency,
  OptimizationSuggestion,
  ProcessedTraceAction,
} from "./types";

export function analyzeGasEfficiency(
  gasUsed: number,
  functionName: string,
): GasEfficiency {
  if (functionName in PYUSD_GAS_BENCHMARKS) {
    const benchmark =
      PYUSD_GAS_BENCHMARKS[functionName as keyof typeof PYUSD_GAS_BENCHMARKS];
    const median = benchmark.median;
    const p25 = benchmark.p25;
    const p75 = benchmark.p75;

    const pctDiff = median > 0 ? ((gasUsed - median) / median) * 100 : 0;

    let efficiency: "excellent" | "good" | "average" | "poor";
    let color: string;

    if (gasUsed <= p25) {
      efficiency = "excellent";
      color = "green";
    } else if (gasUsed <= median) {
      efficiency = "good";
      color = "blue";
    } else if (gasUsed <= p75) {
      efficiency = "average";
      color = "yellow";
    } else {
      efficiency = "poor";
      color = "red";
    }

    return {
      efficiency,
      color,
      pctDiff,
      comparedToMedian: gasUsed - median,
    };
  }

  return {
    efficiency: "unknown",
    color: "gray",
    pctDiff: 0,
    comparedToMedian: 0,
  };
}

export function calculateGasDistribution(
  traces: ProcessedTraceAction[],
): GasDistribution[] {
  const distribution: Record<string, { gasUsed: number; count: number }> = {};
  const totalGas = traces.reduce((sum, trace) => sum + trace.gasUsed, 0);

  for (const trace of traces) {
    const category = trace.isPyusd
      ? trace.contract.includes("Token")
        ? "PYUSD Token"
        : trace.contract.includes("Supply")
          ? "Supply Control"
          : "Other PYUSD"
      : "External Contract";

    if (!distribution[category]) {
      distribution[category] = { gasUsed: 0, count: 0 };
    }

    distribution[category].gasUsed += trace.gasUsed;
    distribution[category].count += 1;
  }

  const result: GasDistribution[] = [];
  const colors = {
    "PYUSD Token": "#90EE90",
    "Supply Control": "#87CEEB",
    "Other PYUSD": "#E0FFFF",
    "External Contract": "#D3D3D3",
  };

  for (const [category, data] of Object.entries(distribution)) {
    result.push({
      category,
      gasUsed: data.gasUsed,
      percentage: totalGas > 0 ? (data.gasUsed / totalGas) * 100 : 0,
      color: colors[category as keyof typeof colors] || "#CCCCCC",
    });
  }

  return result.sort((a, b) => b.gasUsed - a.gasUsed);
}

export function generateEfficiencyMetrics(
  traces: ProcessedTraceAction[],
): EfficiencyMetric[] {
  const metrics: EfficiencyMetric[] = [];
  const totalGas = traces.reduce((sum, trace) => sum + trace.gasUsed, 0);
  const pyusdTraces = traces.filter((t) => t.isPyusd);
  const pyusdGas = pyusdTraces.reduce((sum, trace) => sum + trace.gasUsed, 0);

  const avgGasPerCall = traces.length > 0 ? totalGas / traces.length : 0;
  metrics.push({
    name: "Average Gas per Call",
    value: Math.round(avgGasPerCall),
    unit: "gas",
    score:
      avgGasPerCall < 50000
        ? 90
        : avgGasPerCall < 100000
          ? 70
          : avgGasPerCall < 200000
            ? 50
            : 30,
    description: "Average gas consumption per function call",
  });

  if (pyusdTraces.length > 0) {
    const pyusdAvgGas = pyusdGas / pyusdTraces.length;
    metrics.push({
      name: "PYUSD Operations Efficiency",
      value: Math.round(pyusdAvgGas),
      unit: "gas",
      score:
        pyusdAvgGas < 70000
          ? 90
          : pyusdAvgGas < 100000
            ? 70
            : pyusdAvgGas < 150000
              ? 50
              : 30,
      description: "Average gas for PYUSD-specific operations",
    });
  }

  const errorCount = traces.filter((t) => t.error).length;
  const errorRate = traces.length > 0 ? (errorCount / traces.length) * 100 : 0;
  metrics.push({
    name: "Success Rate",
    value: Math.round(100 - errorRate),
    unit: "%",
    score: errorRate < 5 ? 95 : errorRate < 10 ? 80 : errorRate < 20 ? 60 : 30,
    description: "Percentage of successful operations",
  });

  const maxDepth = Math.max(...traces.map((t) => t.depth), 0);
  metrics.push({
    name: "Call Depth Complexity",
    value: maxDepth,
    unit: "levels",
    score: maxDepth < 3 ? 90 : maxDepth < 5 ? 70 : maxDepth < 8 ? 50 : 30,
    description: "Maximum call stack depth reached",
  });

  return metrics;
}

export function generateOptimizationSuggestions(
  traces: ProcessedTraceAction[],
): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = [];

  const transfers = traces.filter(
    (t) => t.function === "transfer(address,uint256)",
  );
  if (transfers.length > 3) {
    const totalTransferGas = transfers.reduce((sum, t) => sum + t.gasUsed, 0);
    const potentialSavings = totalTransferGas * 0.3;

    suggestions.push({
      id: "batch_transfers",
      type: "gas",
      severity: "medium",
      title: "Batch Multiple Transfers",
      description: `${transfers.length} individual transfers detected`,
      recommendation:
        "Consider using a multicall or batch transfer function to reduce gas costs",
      potentialSavings: {
        gas: Math.round(potentialSavings),
        percentage: 30,
        costUSD: 0,
      },
    });
  }

  const approvals = traces.filter(
    (t) => t.function === "approve(address,uint256)",
  );
  const subsequentTransfers = traces.filter(
    (t) =>
      t.function.includes("transferFrom") &&
      approvals.some((a) => a.parameters.spender === t.from),
  );

  if (approvals.length > 0 && subsequentTransfers.length === 0) {
    suggestions.push({
      id: "unused_approvals",
      type: "gas",
      severity: "low",
      title: "Unused Approvals Detected",
      description: "Approvals granted but no subsequent transfers found",
      recommendation: "Only approve tokens when immediately needed to save gas",
    });
  }

  const failedTraces = traces.filter((t) => t.error);
  if (failedTraces.length > 0) {
    const wastedGas = failedTraces.reduce((sum, t) => sum + t.gasUsed, 0);

    suggestions.push({
      id: "failed_operations",
      type: "performance",
      severity: "high",
      title: "Failed Operations Detected",
      description: `${failedTraces.length} operations failed, wasting gas`,
      recommendation:
        "Add proper validation and error handling to prevent failed transactions",
      potentialSavings: {
        gas: wastedGas,
        percentage:
          (wastedGas / traces.reduce((sum, t) => sum + t.gasUsed, 0)) * 100,
        costUSD: 0,
      },
    });
  }

  const highGasOps = traces.filter((t) => t.gasUsed > 200000);
  if (highGasOps.length > 0) {
    suggestions.push({
      id: "high_gas_operations",
      type: "gas",
      severity: "medium",
      title: "High Gas Operations",
      description: `${highGasOps.length} operations used >200k gas each`,
      recommendation:
        "Review high-gas operations for optimization opportunities",
    });
  }

  const maxDepth = Math.max(...traces.map((t) => t.depth), 0);
  if (maxDepth > 5) {
    suggestions.push({
      id: "deep_call_stack",
      type: "performance",
      severity: "medium",
      title: "Deep Call Stack",
      description: `Maximum call depth of ${maxDepth} levels detected`,
      recommendation:
        "Consider flattening call hierarchy to reduce gas overhead",
    });
  }

  return suggestions;
}

export function generateBenchmarkComparisons(
  traces: ProcessedTraceAction[],
): BenchmarkComparison[] {
  const comparisons: BenchmarkComparison[] = [];

  const functionGroups: Record<string, ProcessedTraceAction[]> = {};
  for (const trace of traces) {
    if (trace.function && trace.function !== "N/A" && trace.isPyusd) {
      if (!functionGroups[trace.function]) {
        functionGroups[trace.function] = [];
      }
      functionGroups[trace.function].push(trace);
    }
  }

  for (const [functionName, functionTraces] of Object.entries(functionGroups)) {
    if (functionName in PYUSD_GAS_BENCHMARKS) {
      const benchmark =
        PYUSD_GAS_BENCHMARKS[functionName as keyof typeof PYUSD_GAS_BENCHMARKS];
      const actualGas =
        functionTraces.reduce((sum, t) => sum + t.gasUsed, 0) /
        functionTraces.length;
      const benchmarkGas = benchmark.median;
      const difference = actualGas - benchmarkGas;
      const percentageDiff =
        benchmarkGas > 0 ? (difference / benchmarkGas) * 100 : 0;

      let efficiency: string;
      if (actualGas <= benchmark.p25) efficiency = "Excellent";
      else if (actualGas <= benchmark.median) efficiency = "Good";
      else if (actualGas <= benchmark.p75) efficiency = "Average";
      else efficiency = "Poor";

      comparisons.push({
        functionName,
        actualGas: Math.round(actualGas),
        benchmarkGas,
        efficiency,
        difference: Math.round(difference),
        percentageDiff: Math.round(percentageDiff * 100) / 100,
      });
    }
  }

  return comparisons.sort(
    (a, b) => Math.abs(b.percentageDiff) - Math.abs(a.percentageDiff),
  );
}

export function generateGasAnalysis(
  traces: ProcessedTraceAction[],
): GasAnalysisData {
  const totalGas = traces.reduce((sum, trace) => sum + trace.gasUsed, 0);
  const gasDistribution = calculateGasDistribution(traces);
  const efficiencyMetrics = generateEfficiencyMetrics(traces);
  const optimizationSuggestions = generateOptimizationSuggestions(traces);
  const benchmarkComparison = generateBenchmarkComparisons(traces);

  const gasBreakdown: GasBreakdownData[] = [];
  const categoryGas: Record<string, number> = {};

  for (const trace of traces) {
    const category = trace.category || "other";
    categoryGas[category] = (categoryGas[category] || 0) + trace.gasUsed;
  }

  for (const [category, gas] of Object.entries(categoryGas)) {
    gasBreakdown.push({
      category: category
        .replace("_", " ")
        .replace(/\b\w/g, (l) => l.toUpperCase()),
      contractGas: gas,
      opcodeGas: 0,
      total: gas,
      percentage: totalGas > 0 ? (gas / totalGas) * 100 : 0,
    });
  }

  return {
    totalGas,
    gasDistribution,
    efficiencyMetrics,
    optimizationSuggestions,
    benchmarkComparison,
    gasBreakdown: gasBreakdown.sort((a, b) => b.total - a.total),
  };
}
