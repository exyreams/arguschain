import { ProcessedDebugBlockData } from "./types";

export interface AdvancedAnalyticsResult {
  blockHealthScore: number;
  riskAssessment: {
    level: "low" | "medium" | "high" | "critical";
    factors: string[];
    recommendations: string[];
  };
  performanceMetrics: {
    gasEfficiency: number;
    transactionDensity: number;
    pyusdActivityRatio: number;
    failureRate: number;
  };
  anomalyDetection: {
    gasAnomalies: Array<{
      type: "unusually_high" | "unusually_low" | "outlier";
      description: string;
      severity: "low" | "medium" | "high";
    }>;
    patternAnomalies: Array<{
      type:
        | "unusual_function_combo"
        | "high_failure_rate"
        | "suspicious_volume";
      description: string;
      severity: "low" | "medium" | "high";
    }>;
  };
  insights: {
    keyFindings: string[];
    optimizationOpportunities: string[];
    securityConsiderations: string[];
  };
  comparativeAnalysis?: {
    vsAverageBlock: {
      gasUsage: "higher" | "lower" | "similar";
      transactionCount: "higher" | "lower" | "similar";
      pyusdActivity: "higher" | "lower" | "similar";
    };
    percentileRanking: {
      gasUsage: number;
      transactionCount: number;
      pyusdActivity: number;
    };
  };
}

export class AdvancedAnalyticsEngine {
  static generateAdvancedAnalysis(
    data: ProcessedDebugBlockData,
    historicalContext?: {
      averageGasUsage: number;
      averageTransactionCount: number;
      averagePyusdActivity: number;
    },
  ): AdvancedAnalyticsResult {
    const performanceMetrics = this.calculatePerformanceMetrics(data);
    const riskAssessment = this.assessRisk(data, performanceMetrics);
    const blockHealthScore = this.calculateHealthScore(
      data,
      performanceMetrics,
    );
    const anomalyDetection = this.detectAnomalies(data);
    const insights = this.generateInsights(
      data,
      performanceMetrics,
      riskAssessment,
    );
    const comparativeAnalysis = historicalContext
      ? this.generateComparativeAnalysis(data, historicalContext)
      : undefined;

    return {
      blockHealthScore,
      riskAssessment,
      performanceMetrics,
      anomalyDetection,
      insights,
      comparativeAnalysis,
    };
  }

  private static calculatePerformanceMetrics(
    data: ProcessedDebugBlockData,
  ): AdvancedAnalyticsResult["performanceMetrics"] {
    const totalTransactions = data.summary.total_transactions;
    const totalGasUsed = data.summary.total_gas_used;
    const pyusdTransactions = data.summary.pyusd_interactions_count;
    const failedTransactions = data.summary.failed_traces_count;

    const gasEfficiency =
      totalTransactions > 0
        ? Math.max(0, 100 - (totalGasUsed / totalTransactions / 200000) * 100)
        : 0;

    const transactionDensity = totalTransactions;
    const pyusdActivityRatio =
      totalTransactions > 0 ? (pyusdTransactions / totalTransactions) * 100 : 0;
    const failureRate =
      totalTransactions > 0
        ? (failedTransactions / totalTransactions) * 100
        : 0;

    return {
      gasEfficiency: Math.round(gasEfficiency * 100) / 100,
      transactionDensity,
      pyusdActivityRatio: Math.round(pyusdActivityRatio * 100) / 100,
      failureRate: Math.round(failureRate * 100) / 100,
    };
  }

  private static assessRisk(
    data: ProcessedDebugBlockData,
    metrics: AdvancedAnalyticsResult["performanceMetrics"],
  ): AdvancedAnalyticsResult["riskAssessment"] {
    const factors: string[] = [];
    const recommendations: string[] = [];
    let riskScore = 0;

    if (metrics.failureRate > 10) {
      factors.push(`High failure rate: ${metrics.failureRate.toFixed(1)}%`);
      recommendations.push(
        "Investigate failed transactions for common patterns",
      );
      riskScore += 30;
    }

    const adminFunctions = data.functionCategories.admin;
    if (adminFunctions > 5) {
      factors.push(
        `High admin activity: ${adminFunctions} admin function calls`,
      );
      recommendations.push("Verify admin function calls are authorized");
      riskScore += 25;
    }

    const supplyChanges = data.functionCategories.supply_change;
    if (supplyChanges > 0) {
      factors.push(
        `Supply change operations: ${supplyChanges} mint/burn calls`,
      );
      recommendations.push("Monitor supply changes for compliance");
      riskScore += 15;
    }

    const largeTransfers = data.pyusdTransfers.filter(
      (t) => t.value > 1000000 * 1e6,
    );
    if (largeTransfers.length > 0) {
      factors.push(`${largeTransfers.length} large value transfers (>$1M)`);
      recommendations.push("Review large value transfers for compliance");
      riskScore += 20;
    }

    if (metrics.gasEfficiency < 50) {
      factors.push(`Low gas efficiency: ${metrics.gasEfficiency.toFixed(1)}%`);
      recommendations.push("Optimize gas usage patterns");
      riskScore += 10;
    }

    const deepCalls = data.internalTransactions.filter((tx) => tx.depth > 4);
    if (deepCalls.length > 0) {
      factors.push(`${deepCalls.length} deep internal calls (depth > 4)`);
      recommendations.push("Review complex contract interactions");
      riskScore += 15;
    }

    let level: "low" | "medium" | "high" | "critical";
    if (riskScore >= 80) level = "critical";
    else if (riskScore >= 50) level = "high";
    else if (riskScore >= 25) level = "medium";
    else level = "low";

    return { level, factors, recommendations };
  }

  private static calculateHealthScore(
    data: ProcessedDebugBlockData,
    metrics: AdvancedAnalyticsResult["performanceMetrics"],
  ): number {
    let score = 100;

    score -= metrics.failureRate * 2;

    score -= (100 - metrics.gasEfficiency) * 0.3;

    const adminRatio =
      data.functionCategories.admin /
      Math.max(data.summary.total_transactions, 1);
    score -= adminRatio * 100 * 0.5;

    score += Math.min(metrics.pyusdActivityRatio * 0.2, 10);

    const activeCategories = Object.values(data.functionCategories).filter(
      (count) => count > 0,
    ).length;
    score += activeCategories * 2;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private static detectAnomalies(
    data: ProcessedDebugBlockData,
  ): AdvancedAnalyticsResult["anomalyDetection"] {
    const gasAnomalies: AdvancedAnalyticsResult["anomalyDetection"]["gasAnomalies"] =
      [];
    const patternAnomalies: AdvancedAnalyticsResult["anomalyDetection"]["patternAnomalies"] =
      [];

    const gasUsages = data.transactions.map((tx) => tx.gas_used);
    if (gasUsages.length > 0) {
      const avgGas =
        gasUsages.reduce((sum, gas) => sum + gas, 0) / gasUsages.length;
      const maxGas = Math.max(...gasUsages);
      const minGas = Math.min(...gasUsages);

      if (maxGas > avgGas * 5) {
        gasAnomalies.push({
          type: "unusually_high",
          description: `Transaction with ${maxGas.toLocaleString()} gas (${(maxGas / avgGas).toFixed(1)}x average)`,
          severity: maxGas > avgGas * 10 ? "high" : "medium",
        });
      }

      if (minGas < avgGas * 0.1 && minGas > 0) {
        gasAnomalies.push({
          type: "unusually_low",
          description: `Transaction with ${minGas.toLocaleString()} gas (${((minGas / avgGas) * 100).toFixed(1)}% of average)`,
          severity: "low",
        });
      }

      const sortedGas = [...gasUsages].sort((a, b) => a - b);
      const q1 = sortedGas[Math.floor(sortedGas.length * 0.25)];
      const q3 = sortedGas[Math.floor(sortedGas.length * 0.75)];
      const iqr = q3 - q1;
      const outliers = gasUsages.filter(
        (gas) => gas > q3 + 1.5 * iqr || gas < q1 - 1.5 * iqr,
      );

      if (outliers.length > 0) {
        gasAnomalies.push({
          type: "outlier",
          description: `${outliers.length} gas usage outliers detected`,
          severity:
            outliers.length > gasUsages.length * 0.1 ? "high" : "medium",
        });
      }
    }

    const functionCategories = data.functionCategories;

    if (functionCategories.mint > 0 && functionCategories.burn > 0) {
      patternAnomalies.push({
        type: "unusual_function_combo",
        description: "Both mint and burn operations in same block",
        severity: "medium",
      });
    }

    const failureRate =
      (data.summary.failed_traces_count / data.summary.total_transactions) *
      100;
    if (failureRate > 15) {
      patternAnomalies.push({
        type: "high_failure_rate",
        description: `${failureRate.toFixed(1)}% transaction failure rate`,
        severity: failureRate > 30 ? "high" : "medium",
      });
    }

    const totalVolume = data.pyusdTransfers.reduce(
      (sum, t) => sum + t.value,
      0,
    );
    const largeTransfers = data.pyusdTransfers.filter(
      (t) => t.value > totalVolume * 0.5,
    );
    if (largeTransfers.length > 0 && data.pyusdTransfers.length > 1) {
      patternAnomalies.push({
        type: "suspicious_volume",
        description: `${largeTransfers.length} transfers account for >50% of total volume`,
        severity: "medium",
      });
    }

    return { gasAnomalies, patternAnomalies };
  }

  private static generateInsights(
    data: ProcessedDebugBlockData,
    metrics: AdvancedAnalyticsResult["performanceMetrics"],
    riskAssessment: AdvancedAnalyticsResult["riskAssessment"],
  ): AdvancedAnalyticsResult["insights"] {
    const keyFindings: string[] = [];
    const optimizationOpportunities: string[] = [];
    const securityConsiderations: string[] = [];

    if (metrics.pyusdActivityRatio > 50) {
      keyFindings.push(
        `High PYUSD activity: ${metrics.pyusdActivityRatio.toFixed(1)}% of transactions`,
      );
    }

    if (data.summary.total_gas_used > 10000000) {
      keyFindings.push(
        `High gas consumption block: ${(data.summary.total_gas_used / 1000000).toFixed(1)}M gas used`,
      );
    }

    const dominantCategory = Object.entries(data.functionCategories).reduce(
      (max, [category, count]) =>
        count > max.count ? { category, count } : max,
      { category: "", count: 0 },
    );

    if (dominantCategory.count > 0) {
      keyFindings.push(
        `Primary PYUSD activity: ${dominantCategory.category.replace("_", " ")} (${dominantCategory.count} calls)`,
      );
    }

    if (metrics.gasEfficiency < 70) {
      optimizationOpportunities.push(
        "Gas usage optimization potential identified",
      );
    }

    if (metrics.failureRate > 5) {
      optimizationOpportunities.push(
        "Transaction success rate could be improved",
      );
    }

    const avgGasPerTx =
      data.summary.total_gas_used / data.summary.total_transactions;
    if (avgGasPerTx > 150000) {
      optimizationOpportunities.push(
        "Consider batching operations to reduce per-transaction overhead",
      );
    }

    if (
      riskAssessment.level === "high" ||
      riskAssessment.level === "critical"
    ) {
      securityConsiderations.push(
        "Block flagged for elevated risk - requires review",
      );
    }

    if (data.functionCategories.admin > 0) {
      securityConsiderations.push(
        "Admin function usage detected - verify authorization",
      );
    }

    if (data.internalTransactions.some((tx) => tx.depth > 5)) {
      securityConsiderations.push(
        "Deep contract call chains detected - potential complexity risk",
      );
    }

    return { keyFindings, optimizationOpportunities, securityConsiderations };
  }

  private static generateComparativeAnalysis(
    data: ProcessedDebugBlockData,
    historical: {
      averageGasUsage: number;
      averageTransactionCount: number;
      averagePyusdActivity: number;
    },
  ): AdvancedAnalyticsResult["comparativeAnalysis"] {
    const gasComparison = this.compareValue(
      data.summary.total_gas_used,
      historical.averageGasUsage,
    );
    const txComparison = this.compareValue(
      data.summary.total_transactions,
      historical.averageTransactionCount,
    );
    const pyusdComparison = this.compareValue(
      data.summary.pyusd_interactions_count,
      historical.averagePyusdActivity,
    );

    const gasPercentile = this.calculatePercentile(
      data.summary.total_gas_used,
      historical.averageGasUsage,
    );
    const txPercentile = this.calculatePercentile(
      data.summary.total_transactions,
      historical.averageTransactionCount,
    );
    const pyusdPercentile = this.calculatePercentile(
      data.summary.pyusd_interactions_count,
      historical.averagePyusdActivity,
    );

    return {
      vsAverageBlock: {
        gasUsage: gasComparison,
        transactionCount: txComparison,
        pyusdActivity: pyusdComparison,
      },
      percentileRanking: {
        gasUsage: gasPercentile,
        transactionCount: txPercentile,
        pyusdActivity: pyusdPercentile,
      },
    };
  }

  private static compareValue(
    current: number,
    average: number,
  ): "higher" | "lower" | "similar" {
    const ratio = current / average;
    if (ratio > 1.2) return "higher";
    if (ratio < 0.8) return "lower";
    return "similar";
  }

  private static calculatePercentile(current: number, average: number): number {
    const ratio = current / average;

    if (ratio >= 2) return 95;
    if (ratio >= 1.5) return 85;
    if (ratio >= 1.2) return 75;
    if (ratio >= 1.1) return 65;
    if (ratio >= 0.9) return 50;
    if (ratio >= 0.8) return 35;
    if (ratio >= 0.5) return 25;
    return 15;
  }

  static generateExecutiveSummary(
    data: ProcessedDebugBlockData,
    analytics: AdvancedAnalyticsResult,
  ): {
    title: string;
    summary: string;
    highlights: string[];
    actionItems: string[];
  } {
    const title = `Block ${data.summary.block_identifier} Analysis Report`;

    const summary = `This block contains ${data.summary.total_transactions} transactions with ${data.summary.pyusd_interactions_count} PYUSD interactions (${analytics.performanceMetrics.pyusdActivityRatio.toFixed(1)}%). The block health score is ${analytics.blockHealthScore}/100 with a ${analytics.riskAssessment.level} risk level.`;

    const highlights = [
      ...analytics.insights.keyFindings.slice(0, 3),
      `Gas efficiency: ${analytics.performanceMetrics.gasEfficiency.toFixed(1)}%`,
      `Transaction success rate: ${(100 - analytics.performanceMetrics.failureRate).toFixed(1)}%`,
    ];

    const actionItems = [
      ...analytics.riskAssessment.recommendations.slice(0, 2),
      ...analytics.insights.optimizationOpportunities.slice(0, 2),
    ];

    return { title, summary, highlights, actionItems };
  }
}
