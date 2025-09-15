import { formatGas, formatPercentage, calculateGasEfficiency } from "../utils";
import {
  GAS_LIMITS,
  CHART_COLORS,
  PYUSD_FUNCTION_TYPES,
  FUNCTION_SIGNATURES,
} from "../constants";
import type {
  ProcessedBlockTrace,
  GasAnalysis,
  GasDistributionItem,
  GasEfficiencyMetrics,
  OptimizationOpportunity,
  TransactionCategory,
  NetworkType,
} from "../types";

export interface GasAnalysisResult extends GasAnalysis {
  insights: string[];
  recommendations: string[];
  benchmarkComparisons: BenchmarkComparison[];
}

export interface BenchmarkComparison {
  category: string;
  actualGas: number;
  benchmarkGas: number;
  efficiency: number;
  status: "excellent" | "good" | "average" | "poor";
}

export class GasAnalyzer {
  private network: NetworkType;
  private gasBenchmarks: Map<string, number> = new Map();

  constructor(network: NetworkType = "mainnet") {
    this.network = network;
    this.initializeGasBenchmarks();
  }

  /**
   * Analyze gas distribution across transaction categories
   */
  async analyzeGasDistribution(
    traces: ProcessedBlockTrace[],
    categories: Map<string, TransactionCategory>
  ): Promise<GasAnalysisResult> {
    console.log(`Analyzing gas distribution for ${traces.length} traces...`);

    // Calculate basic gas metrics
    const totalGasUsed = traces.reduce((sum, trace) => sum + trace.gasUsed, 0n);
    const averageGasPerTrace =
      traces.length > 0 ? Number(totalGasUsed) / traces.length : 0;

    // Generate gas distribution by category
    const gasDistribution = this.calculateGasDistribution(traces, categories);

    // Calculate gas efficiency metrics
    const gasEfficiency = this.calculateGasEfficiencyMetrics(traces);

    // Identify optimization opportunities
    const optimizationOpportunities = this.identifyOptimizationOpportunities(
      traces,
      gasDistribution
    );

    // Generate insights and recommendations
    const insights = this.generateGasInsights(
      traces,
      gasDistribution,
      gasEfficiency
    );
    const recommendations = this.generateGasRecommendations(
      traces,
      optimizationOpportunities
    );

    // Compare against benchmarks
    const benchmarkComparisons = this.compareToBenchmarks(gasDistribution);

    const result: GasAnalysisResult = {
      totalGasUsed,
      averageGasPerTrace,
      gasDistribution,
      gasEfficiency,
      optimizationOpportunities,
      insights,
      recommendations,
      benchmarkComparisons,
    };

    console.log(
      `Gas analysis completed. Total gas: ${formatGas(totalGasUsed)}`
    );
    return result;
  }

  /**
   * Calculate gas distribution by transaction category
   */
  private calculateGasDistribution(
    traces: ProcessedBlockTrace[],
    categories: Map<string, TransactionCategory>
  ): GasDistributionItem[] {
    const categoryGas = new Map<
      string,
      {
        gasUsed: bigint;
        count: number;
        traces: ProcessedBlockTrace[];
      }
    >();

    // Group traces by category
    traces.forEach((trace) => {
      const category = categories.get(trace.id) || trace.category;
      const categoryKey = category.type;

      if (!categoryGas.has(categoryKey)) {
        categoryGas.set(categoryKey, {
          gasUsed: 0n,
          count: 0,
          traces: [],
        });
      }

      const categoryData = categoryGas.get(categoryKey)!;
      categoryData.gasUsed += trace.gasUsed;
      categoryData.count += 1;
      categoryData.traces.push(trace);
    });

    // Calculate total gas for percentage calculations
    const totalGas = Array.from(categoryGas.values()).reduce(
      (sum, data) => sum + data.gasUsed,
      0n
    );

    // Create distribution items
    const distribution: GasDistributionItem[] = [];

    categoryGas.forEach((data, category) => {
      const percentage =
        totalGas > 0n ? (Number(data.gasUsed) / Number(totalGas)) * 100 : 0;
      const averageGasPerTransaction =
        data.count > 0 ? Number(data.gasUsed) / data.count : 0;

      distribution.push({
        category: this.formatCategoryName(category),
        gasUsed: data.gasUsed,
        percentage,
        transactionCount: data.count,
        averageGasPerTransaction,
        color: this.getCategoryColor(category),
      });
    });

    // Sort by gas usage (descending)
    distribution.sort((a, b) => Number(b.gasUsed) - Number(a.gasUsed));

    return distribution;
  }

  /**
   * Calculate gas efficiency metrics
   */
  private calculateGasEfficiencyMetrics(
    traces: ProcessedBlockTrace[]
  ): GasEfficiencyMetrics {
    const successfulTraces = traces.filter((trace) => trace.success);
    const failedTraces = traces.filter((trace) => !trace.success);

    const successfulGas = successfulTraces.reduce(
      (sum, trace) => sum + trace.gasUsed,
      0n
    );
    const failedGas = failedTraces.reduce(
      (sum, trace) => sum + trace.gasUsed,
      0n
    );
    const totalGas = successfulGas + failedGas;

    const successRate =
      traces.length > 0 ? (successfulTraces.length / traces.length) * 100 : 0;
    const averageGasPerSuccess =
      successfulTraces.length > 0
        ? Number(successfulGas) / successfulTraces.length
        : 0;
    const averageGasPerFailure =
      failedTraces.length > 0 ? Number(failedGas) / failedTraces.length : 0;

    const efficiencyScore = calculateGasEfficiency(
      successfulGas,
      failedGas,
      traces.length
    );

    return {
      successRate,
      averageGasPerSuccess,
      averageGasPerFailure,
      wastedGas: failedGas,
      efficiencyScore,
    };
  }

  /**
   * Identify optimization opportunities
   */
  private identifyOptimizationOpportunities(
    traces: ProcessedBlockTrace[],
    gasDistribution: GasDistributionItem[]
  ): OptimizationOpportunity[] {
    const opportunities: OptimizationOpportunity[] = [];

    // High gas usage transactions
    const highGasTraces = traces.filter(
      (trace) => Number(trace.gasUsed) > GAS_LIMITS.HIGH_GAS_THRESHOLD
    );
    if (highGasTraces.length > 0) {
      const totalHighGas = highGasTraces.reduce(
        (sum, trace) => sum + trace.gasUsed,
        0n
      );
      const potentialSavings = Number(totalHighGas) * 0.2; // Assume 20% savings possible

      opportunities.push({
        type: "gas_optimization",
        severity: "high",
        description: `${highGasTraces.length} transactions use excessive gas (>${formatGas(GAS_LIMITS.HIGH_GAS_THRESHOLD)})`,
        recommendation:
          "Review high-gas transactions for optimization opportunities. Consider gas-efficient alternatives or batching operations.",
        potentialSavings: {
          gasAmount: BigInt(Math.floor(potentialSavings)),
          percentage: 20,
          estimatedCostUSD: this.estimateGasCostUSD(potentialSavings),
        },
      });
    }

    // Failed transactions wasting gas
    const failedTraces = traces.filter((trace) => !trace.success);
    if (failedTraces.length > 0) {
      const wastedGas = failedTraces.reduce(
        (sum, trace) => sum + trace.gasUsed,
        0n
      );

      opportunities.push({
        type: "error_reduction",
        severity: failedTraces.length > traces.length * 0.1 ? "high" : "medium",
        description: `${failedTraces.length} failed transactions wasted ${formatGas(wastedGas)} gas`,
        recommendation:
          "Investigate and fix causes of transaction failures. Implement better error handling and validation.",
        potentialSavings: {
          gasAmount: wastedGas,
          percentage:
            (Number(wastedGas) /
              Number(traces.reduce((sum, t) => sum + t.gasUsed, 0n))) *
            100,
          estimatedCostUSD: this.estimateGasCostUSD(Number(wastedGas)),
        },
      });
    }

    // PYUSD transaction optimization
    const pyusdTraces = traces.filter((trace) => trace.pyusdDetails);
    if (pyusdTraces.length > 0) {
      const pyusdGasAnalysis = this.analyzePYUSDGasUsage(pyusdTraces);
      if (pyusdGasAnalysis.hasOptimizationPotential) {
        opportunities.push({
          type: "gas_optimization",
          severity: "medium",
          description: `PYUSD transactions show optimization potential`,
          recommendation: pyusdGasAnalysis.recommendation,
          potentialSavings: pyusdGasAnalysis.potentialSavings,
        });
      }
    }

    // Pattern-based optimizations
    const patternOpportunities = this.identifyPatternOptimizations(traces);
    opportunities.push(...patternOpportunities);

    return opportunities.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  /**
   * Analyze PYUSD gas usage patterns
   */
  private analyzePYUSDGasUsage(pyusdTraces: ProcessedBlockTrace[]): {
    hasOptimizationPotential: boolean;
    recommendation: string;
    potentialSavings: OptimizationOpportunity["potentialSavings"];
  } {
    const functionGasUsage = new Map<string, number[]>();

    // Group by function type
    pyusdTraces.forEach((trace) => {
      if (trace.pyusdDetails) {
        const functionType = trace.pyusdDetails.type;
        if (!functionGasUsage.has(functionType)) {
          functionGasUsage.set(functionType, []);
        }
        functionGasUsage.get(functionType)!.push(Number(trace.gasUsed));
      }
    });

    let hasOptimizationPotential = false;
    let totalPotentialSavings = 0;
    const recommendations: string[] = [];

    // Check each function type against benchmarks
    functionGasUsage.forEach((gasUsages, functionType) => {
      const averageGas =
        gasUsages.reduce((a, b) => a + b, 0) / gasUsages.length;
      const benchmark = this.getPYUSDBenchmark(functionType);

      if (benchmark && averageGas > benchmark * 1.2) {
        // 20% above benchmark
        hasOptimizationPotential = true;
        const savings = (averageGas - benchmark) * gasUsages.length;
        totalPotentialSavings += savings;
        recommendations.push(
          `${functionType} transactions use ${formatPercentage((averageGas / benchmark - 1) * 100)} more gas than expected`
        );
      }
    });

    return {
      hasOptimizationPotential,
      recommendation:
        recommendations.length > 0
          ? `PYUSD optimization opportunities: ${recommendations.join("; ")}`
          : "PYUSD transactions are gas-efficient",
      potentialSavings: {
        gasAmount: BigInt(Math.floor(totalPotentialSavings)),
        percentage:
          (totalPotentialSavings /
            pyusdTraces.reduce((sum, t) => sum + Number(t.gasUsed), 0)) *
          100,
        estimatedCostUSD: this.estimateGasCostUSD(totalPotentialSavings),
      },
    };
  }

  /**
   * Identify pattern-based optimization opportunities
   */
  private identifyPatternOptimizations(
    traces: ProcessedBlockTrace[]
  ): OptimizationOpportunity[] {
    const opportunities: OptimizationOpportunity[] = [];

    // Batch transaction opportunities
    const batchOpportunities = this.identifyBatchOpportunities(traces);
    opportunities.push(...batchOpportunities);

    // Redundant call patterns
    const redundantCalls = this.identifyRedundantCalls(traces);
    if (redundantCalls.length > 0) {
      const wastedGas = redundantCalls.reduce(
        (sum, trace) => sum + Number(trace.gasUsed),
        0
      );
      opportunities.push({
        type: "pattern_improvement",
        severity: "medium",
        description: `${redundantCalls.length} potentially redundant calls detected`,
        recommendation:
          "Review call patterns for redundancy. Consider caching results or combining operations.",
        potentialSavings: {
          gasAmount: BigInt(Math.floor(wastedGas * 0.5)), // Assume 50% savings
          percentage: 50,
          estimatedCostUSD: this.estimateGasCostUSD(wastedGas * 0.5),
        },
      });
    }

    return opportunities;
  }

  /**
   * Identify batch transaction opportunities
   */
  private identifyBatchOpportunities(
    traces: ProcessedBlockTrace[]
  ): OptimizationOpportunity[] {
    const opportunities: OptimizationOpportunity[] = [];

    // Group by sender and function
    const senderFunctionGroups = new Map<
      string,
      Map<string, ProcessedBlockTrace[]>
    >();

    traces.forEach((trace) => {
      const functionSig = trace.input.slice(0, 10);

      if (!senderFunctionGroups.has(trace.from)) {
        senderFunctionGroups.set(trace.from, new Map());
      }

      const functionGroups = senderFunctionGroups.get(trace.from)!;
      if (!functionGroups.has(functionSig)) {
        functionGroups.set(functionSig, []);
      }

      functionGroups.get(functionSig)!.push(trace);
    });

    // Look for batchable operations
    senderFunctionGroups.forEach((functionGroups, sender) => {
      functionGroups.forEach((traces, functionSig) => {
        if (traces.length >= 3 && this.isBatchable(functionSig)) {
          const totalGas = traces.reduce(
            (sum, trace) => sum + Number(trace.gasUsed),
            0
          );
          const estimatedBatchGas = totalGas * 0.7; // Assume 30% savings with batching
          const savings = totalGas - estimatedBatchGas;

          opportunities.push({
            type: "gas_optimization",
            severity: "medium",
            description: `${traces.length} similar transactions from ${sender.slice(0, 8)}... could be batched`,
            recommendation:
              "Consider using batch operations to reduce gas costs and improve efficiency.",
            potentialSavings: {
              gasAmount: BigInt(Math.floor(savings)),
              percentage: 30,
              estimatedCostUSD: this.estimateGasCostUSD(savings),
            },
          });
        }
      });
    });

    return opportunities;
  }

  /**
   * Identify redundant calls
   */
  private identifyRedundantCalls(
    traces: ProcessedBlockTrace[]
  ): ProcessedBlockTrace[] {
    const callMap = new Map<string, ProcessedBlockTrace[]>();

    // Group identical calls
    traces.forEach((trace) => {
      const callKey = `${trace.to}-${trace.input}`;
      if (!callMap.has(callKey)) {
        callMap.set(callKey, []);
      }
      callMap.get(callKey)!.push(trace);
    });

    // Find redundant calls (same call multiple times)
    const redundantCalls: ProcessedBlockTrace[] = [];
    callMap.forEach((calls, callKey) => {
      if (calls.length > 1 && calls[0].input.length > 10) {
        // Skip the first call, mark others as redundant
        redundantCalls.push(...calls.slice(1));
      }
    });

    return redundantCalls;
  }

  /**
   * Generate gas insights
   */
  private generateGasInsights(
    traces: ProcessedBlockTrace[],
    gasDistribution: GasDistributionItem[],
    gasEfficiency: GasEfficiencyMetrics
  ): string[] {
    const insights: string[] = [];

    // Overall efficiency insight
    if (gasEfficiency.efficiencyScore >= 90) {
      insights.push(
        "Excellent gas efficiency - most transactions completed successfully"
      );
    } else if (gasEfficiency.efficiencyScore >= 70) {
      insights.push("Good gas efficiency with room for improvement");
    } else {
      insights.push("Poor gas efficiency - significant optimization needed");
    }

    // Category insights
    const topCategory = gasDistribution[0];
    if (topCategory) {
      insights.push(
        `${topCategory.category} transactions consume the most gas (${formatPercentage(topCategory.percentage)})`
      );
    }

    // PYUSD insights
    const pyusdCategory = gasDistribution.find((item) =>
      item.category.toLowerCase().includes("pyusd")
    );
    if (pyusdCategory) {
      insights.push(
        `PYUSD transactions account for ${formatPercentage(pyusdCategory.percentage)} of total gas usage`
      );
    }

    // Failed transaction insights
    if (gasEfficiency.wastedGas > 0n) {
      const wastedPercentage =
        (Number(gasEfficiency.wastedGas) /
          Number(traces.reduce((sum, t) => sum + t.gasUsed, 0n))) *
        100;
      insights.push(
        `${formatPercentage(wastedPercentage)} of gas was wasted on failed transactions`
      );
    }

    // High gas transaction insights
    const highGasCount = traces.filter(
      (t) => Number(t.gasUsed) > GAS_LIMITS.HIGH_GAS_THRESHOLD
    ).length;
    if (highGasCount > 0) {
      insights.push(
        `${highGasCount} transactions used more than ${formatGas(GAS_LIMITS.HIGH_GAS_THRESHOLD)} gas`
      );
    }

    return insights;
  }

  /**
   * Generate gas recommendations
   */
  private generateGasRecommendations(
    traces: ProcessedBlockTrace[],
    opportunities: OptimizationOpportunity[]
  ): string[] {
    const recommendations: string[] = [];

    // Priority recommendations based on opportunities
    const highPriorityOps = opportunities.filter(
      (op) => op.severity === "high"
    );
    if (highPriorityOps.length > 0) {
      recommendations.push(
        "Address high-priority gas optimization opportunities first"
      );
    }

    // Specific recommendations
    if (opportunities.some((op) => op.type === "error_reduction")) {
      recommendations.push(
        "Implement better error handling to reduce failed transactions"
      );
    }

    if (opportunities.some((op) => op.description.includes("batch"))) {
      recommendations.push(
        "Consider implementing batch operations for similar transactions"
      );
    }

    // General recommendations
    const avgGas =
      traces.length > 0
        ? Number(traces.reduce((sum, t) => sum + t.gasUsed, 0n)) / traces.length
        : 0;
    if (avgGas > GAS_LIMITS.COMPLEX_TRANSACTION) {
      recommendations.push(
        "Review transaction complexity and consider breaking down complex operations"
      );
    }

    // PYUSD specific recommendations
    const pyusdTraces = traces.filter((t) => t.pyusdDetails);
    if (pyusdTraces.length > 0) {
      recommendations.push(
        "Monitor PYUSD transaction gas usage against benchmarks"
      );
    }

    return recommendations;
  }

  /**
   * Compare gas usage to benchmarks
   */
  private compareToBenchmarks(
    gasDistribution: GasDistributionItem[]
  ): BenchmarkComparison[] {
    const comparisons: BenchmarkComparison[] = [];

    gasDistribution.forEach((item) => {
      const benchmark = this.gasBenchmarks.get(item.category.toLowerCase());
      if (benchmark) {
        const efficiency = (benchmark / item.averageGasPerTransaction) * 100;
        let status: BenchmarkComparison["status"] = "average";

        if (efficiency >= 90) status = "excellent";
        else if (efficiency >= 75) status = "good";
        else if (efficiency < 50) status = "poor";

        comparisons.push({
          category: item.category,
          actualGas: item.averageGasPerTransaction,
          benchmarkGas: benchmark,
          efficiency,
          status,
        });
      }
    });

    return comparisons;
  }

  /**
   * Helper methods
   */
  private formatCategoryName(category: string): string {
    return category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  }

  private getCategoryColor(category: string): string {
    const colors = CHART_COLORS.TRANSACTION_TYPES;
    return (
      colors[category as keyof typeof colors] || CHART_COLORS.CATEGORIES[0]
    );
  }

  private getPYUSDBenchmark(functionType: string): number | undefined {
    const benchmarks = PYUSD_FUNCTION_TYPES;
    const functionData = Object.values(benchmarks).find(
      (f) => f.name === functionType
    );
    return functionData?.gasEstimate;
  }

  private isBatchable(functionSig: string): boolean {
    const batchableFunctions = [
      FUNCTION_SIGNATURES.transfer,
      FUNCTION_SIGNATURES.approve,
      FUNCTION_SIGNATURES.transferFrom,
    ];
    return batchableFunctions.includes(functionSig);
  }

  private estimateGasCostUSD(gasAmount: number): number {
    // Rough estimate: assume 20 gwei gas price and $2000 ETH price
    const gasPriceGwei = 20;
    const ethPriceUSD = 2000;
    const gasCostETH = (gasAmount * gasPriceGwei) / 1e9;
    return gasCostETH * ethPriceUSD;
  }

  private initializeGasBenchmarks(): void {
    // Initialize gas benchmarks for different transaction types
    this.gasBenchmarks.set("eth transfer", GAS_LIMITS.SIMPLE_TRANSFER);
    this.gasBenchmarks.set("token transfer", GAS_LIMITS.ERC20_TRANSFER);
    this.gasBenchmarks.set("contract call", GAS_LIMITS.CONTRACT_INTERACTION);
    this.gasBenchmarks.set("pyusd transaction", 65000);
    this.gasBenchmarks.set("contract creation", 200000);
    this.gasBenchmarks.set("defi interaction", 150000);
  }
}
