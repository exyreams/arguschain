import {
  BlockTransactionSummary,
  GasDistributionData,
  PyusdInternalTransaction,
} from "../types";

export interface GasAnalysisResult {
  totalGasUsed: number;
  averageGasPerTransaction: number;
  gasEfficiency: number;
  gasDistribution: GasDistributionData[];
  gasUsageByCategory: Map<
    string,
    { totalGas: number; avgGas: number; count: number }
  >;
  highGasTransactions: BlockTransactionSummary[];
  gasOptimizationSuggestions: string[];
  costAnalysis: {
    totalCostWei: bigint;
    totalCostEth: number;
    averageCostPerTransaction: number;
    pyusdTransactionsCost: number;
    regularTransactionsCost: number;
  };
}

export class BlockGasProcessor {
  static analyzeGasUsage(
    transactions: BlockTransactionSummary[],
    internalTransactions: PyusdInternalTransaction[],
    gasPrice: number = 20,
  ): GasAnalysisResult {
    const totalGasUsed = transactions.reduce((sum, tx) => sum + tx.gas_used, 0);
    const averageGasPerTransaction =
      transactions.length > 0 ? totalGasUsed / transactions.length : 0;

    const successfulTxs = transactions.filter((tx) => !tx.failed);
    const gasEfficiency =
      successfulTxs.length > 0 ? totalGasUsed / successfulTxs.length : 0;

    const gasDistribution = this.createGasDistribution(transactions);

    const gasUsageByCategory = this.analyzeGasByCategory(
      transactions,
      internalTransactions,
    );

    const highGasTransactions = this.identifyHighGasTransactions(
      transactions,
      averageGasPerTransaction,
    );

    const gasOptimizationSuggestions = this.generateOptimizationSuggestions(
      transactions,
      internalTransactions,
      averageGasPerTransaction,
    );

    const costAnalysis = this.calculateCostAnalysis(transactions, gasPrice);

    return {
      totalGasUsed,
      averageGasPerTransaction,
      gasEfficiency,
      gasDistribution,
      gasUsageByCategory,
      highGasTransactions,
      gasOptimizationSuggestions,
      costAnalysis,
    };
  }

  private static createGasDistribution(
    transactions: BlockTransactionSummary[],
  ): GasDistributionData[] {
    return transactions.map((tx) => ({
      gas_used: tx.gas_used,
      interaction_type: tx.pyusd_interaction
        ? "PYUSD Transaction"
        : "Other Transaction",
    }));
  }

  private static analyzeGasByCategory(
    transactions: BlockTransactionSummary[],
    internalTransactions: PyusdInternalTransaction[],
  ): Map<string, { totalGas: number; avgGas: number; count: number }> {
    const categoryStats = new Map<
      string,
      { totalGas: number; avgGas: number; count: number }
    >();

    for (const tx of transactions) {
      let category = "Regular Transaction";

      if (tx.pyusd_interaction) {
        if (tx.is_pyusd_transfer) {
          category = "PYUSD Transfer";
        } else if (tx.is_pyusd_mint) {
          category = "PYUSD Mint";
        } else if (tx.is_pyusd_burn) {
          category = "PYUSD Burn";
        } else {
          category = `PYUSD ${tx.pyusd_function_category.replace("_", " ")}`;
        }
      }

      if (tx.failed) {
        category += " (Failed)";
      }

      const stats = categoryStats.get(category) || {
        totalGas: 0,
        avgGas: 0,
        count: 0,
      };
      stats.totalGas += tx.gas_used;
      stats.count += 1;
      stats.avgGas = stats.totalGas / stats.count;
      categoryStats.set(category, stats);
    }

    const internalGasStats = new Map<
      string,
      { totalGas: number; count: number }
    >();
    for (const tx of internalTransactions) {
      const category = `Internal: ${tx.function}`;
      const stats = internalGasStats.get(category) || { totalGas: 0, count: 0 };
      stats.totalGas += tx.gas_used;
      stats.count += 1;
      internalGasStats.set(category, stats);
    }

    for (const [category, stats] of internalGasStats.entries()) {
      categoryStats.set(category, {
        totalGas: stats.totalGas,
        avgGas: stats.totalGas / stats.count,
        count: stats.count,
      });
    }

    return categoryStats;
  }

  private static identifyHighGasTransactions(
    transactions: BlockTransactionSummary[],
    averageGas: number,
  ): BlockTransactionSummary[] {
    const threshold = averageGas * 2;
    return transactions
      .filter((tx) => tx.gas_used > threshold)
      .sort((a, b) => b.gas_used - a.gas_used)
      .slice(0, 10);
  }

  private static generateOptimizationSuggestions(
    transactions: BlockTransactionSummary[],
    internalTransactions: PyusdInternalTransaction[],
    averageGas: number,
  ): string[] {
    const suggestions: string[] = [];

    const failedTxs = transactions.filter((tx) => tx.failed);
    if (failedTxs.length > 0) {
      const failedGas = failedTxs.reduce((sum, tx) => sum + tx.gas_used, 0);
      suggestions.push(
        `${failedTxs.length} failed transactions wasted ${failedGas.toLocaleString()} gas. ` +
          `Consider implementing better error handling and gas estimation.`,
      );
    }

    const highGasPyusdTxs = transactions.filter(
      (tx) => tx.pyusd_interaction && tx.gas_used > averageGas * 1.5,
    );
    if (highGasPyusdTxs.length > 0) {
      suggestions.push(
        `${highGasPyusdTxs.length} PYUSD transactions used above-average gas. ` +
          `Consider optimizing contract interactions or using batch operations.`,
      );
    }

    const deepInternalTxs = internalTransactions.filter((tx) => tx.depth > 3);
    if (deepInternalTxs.length > 0) {
      suggestions.push(
        `${deepInternalTxs.length} internal calls with depth > 3 detected. ` +
          `Deep call stacks can be gas-inefficient and may indicate complex contract interactions.`,
      );
    }

    const functionGasUsage = new Map<string, number[]>();
    for (const tx of transactions.filter(
      (tx) => tx.pyusd_interaction && tx.pyusd_function,
    )) {
      const func = tx.pyusd_function!;
      if (!functionGasUsage.has(func)) {
        functionGasUsage.set(func, []);
      }
      functionGasUsage.get(func)!.push(tx.gas_used);
    }

    for (const [func, gasUsages] of functionGasUsage.entries()) {
      if (gasUsages.length > 1) {
        const avgFuncGas =
          gasUsages.reduce((sum, gas) => sum + gas, 0) / gasUsages.length;
        const variance =
          gasUsages.reduce(
            (sum, gas) => sum + Math.pow(gas - avgFuncGas, 2),
            0,
          ) / gasUsages.length;
        const stdDev = Math.sqrt(variance);

        if (stdDev > avgFuncGas * 0.3) {
          suggestions.push(
            `High variance in gas usage for ${func} function (avg: ${avgFuncGas.toFixed(0)}, ` +
              `std dev: ${stdDev.toFixed(0)}). Consider investigating different execution paths.`,
          );
        }
      }
    }

    if (averageGas > 100000) {
      suggestions.push(
        "Average gas usage is high. Consider implementing gas optimization techniques such as " +
          "storage optimization, function modifiers, and efficient data structures.",
      );
    }

    const pyusdTxRatio =
      transactions.filter((tx) => tx.pyusd_interaction).length /
      transactions.length;
    if (pyusdTxRatio > 0.5) {
      suggestions.push(
        "High proportion of PYUSD transactions. Consider implementing batch operations " +
          "or meta-transactions to reduce individual transaction costs.",
      );
    }

    return suggestions;
  }

  private static calculateCostAnalysis(
    transactions: BlockTransactionSummary[],
    gasPriceGwei: number,
  ): {
    totalCostWei: bigint;
    totalCostEth: number;
    averageCostPerTransaction: number;
    pyusdTransactionsCost: number;
    regularTransactionsCost: number;
  } {
    const gasPriceWei = BigInt(gasPriceGwei * 1e9);

    let totalCostWei = BigInt(0);
    let pyusdGasUsed = 0;
    let regularGasUsed = 0;

    for (const tx of transactions) {
      const txCostWei = BigInt(tx.gas_used) * gasPriceWei;
      totalCostWei += txCostWei;

      if (tx.pyusd_interaction) {
        pyusdGasUsed += tx.gas_used;
      } else {
        regularGasUsed += tx.gas_used;
      }
    }

    const totalCostEth = Number(totalCostWei) / 1e18;
    const averageCostPerTransaction =
      transactions.length > 0 ? totalCostEth / transactions.length : 0;

    const pyusdTransactionsCost = (pyusdGasUsed * gasPriceGwei * 1e9) / 1e18;
    const regularTransactionsCost =
      (regularGasUsed * gasPriceGwei * 1e9) / 1e18;

    return {
      totalCostWei,
      totalCostEth,
      averageCostPerTransaction,
      pyusdTransactionsCost,
      regularTransactionsCost,
    };
  }

  static generateGasReport(analysis: GasAnalysisResult): {
    summary: string;
    keyMetrics: Array<{
      label: string;
      value: string;
      trend?: "up" | "down" | "stable";
    }>;
    recommendations: string[];
    warnings: string[];
  } {
    const {
      totalGasUsed,
      averageGasPerTransaction,
      gasEfficiency,
      costAnalysis,
      highGasTransactions,
      gasOptimizationSuggestions,
    } = analysis;

    const summary =
      `Block consumed ${totalGasUsed.toLocaleString()} total gas across transactions, ` +
      `with an average of ${averageGasPerTransaction.toFixed(0)} gas per transaction. ` +
      `Total cost: ${costAnalysis.totalCostEth.toFixed(6)} ETH.`;

    const keyMetrics = [
      { label: "Total Gas Used", value: totalGasUsed.toLocaleString() },
      { label: "Average Gas/Tx", value: averageGasPerTransaction.toFixed(0) },
      { label: "Gas Efficiency", value: gasEfficiency.toFixed(0) },
      {
        label: "Total Cost (ETH)",
        value: costAnalysis.totalCostEth.toFixed(6),
      },
      {
        label: "Avg Cost/Tx (ETH)",
        value: costAnalysis.averageCostPerTransaction.toFixed(8),
      },
      {
        label: "High Gas Transactions",
        value: highGasTransactions.length.toString(),
      },
    ];

    const recommendations = [...gasOptimizationSuggestions];
    const warnings: string[] = [];

    if (gasEfficiency > 200000) {
      warnings.push(
        "High gas efficiency score indicates potential optimization opportunities",
      );
    }

    if (highGasTransactions.length > 5) {
      warnings.push(
        `${highGasTransactions.length} transactions used significantly more gas than average`,
      );
    }

    if (costAnalysis.totalCostEth > 1) {
      warnings.push(
        `High total transaction cost: ${costAnalysis.totalCostEth.toFixed(4)} ETH`,
      );
    }

    return {
      summary,
      keyMetrics,
      recommendations,
      warnings,
    };
  }

  static compareWithHistorical(
    currentAnalysis: GasAnalysisResult,
    historicalData: GasAnalysisResult[],
  ): {
    avgGasTrend: "up" | "down" | "stable";
    costTrend: "up" | "down" | "stable";
    efficiencyTrend: "up" | "down" | "stable";
    insights: string[];
  } {
    if (historicalData.length === 0) {
      return {
        avgGasTrend: "stable",
        costTrend: "stable",
        efficiencyTrend: "stable",
        insights: ["No historical data available for comparison"],
      };
    }

    const historicalAvgGas =
      historicalData.reduce(
        (sum, data) => sum + data.averageGasPerTransaction,
        0,
      ) / historicalData.length;
    const historicalAvgCost =
      historicalData.reduce(
        (sum, data) => sum + data.costAnalysis.totalCostEth,
        0,
      ) / historicalData.length;
    const historicalAvgEfficiency =
      historicalData.reduce((sum, data) => sum + data.gasEfficiency, 0) /
      historicalData.length;

    const gasThreshold = historicalAvgGas * 0.1;
    const costThreshold = historicalAvgCost * 0.1;
    const efficiencyThreshold = historicalAvgEfficiency * 0.1;

    const avgGasTrend =
      currentAnalysis.averageGasPerTransaction > historicalAvgGas + gasThreshold
        ? "up"
        : currentAnalysis.averageGasPerTransaction <
            historicalAvgGas - gasThreshold
          ? "down"
          : "stable";

    const costTrend =
      currentAnalysis.costAnalysis.totalCostEth >
      historicalAvgCost + costThreshold
        ? "up"
        : currentAnalysis.costAnalysis.totalCostEth <
            historicalAvgCost - costThreshold
          ? "down"
          : "stable";

    const efficiencyTrend =
      currentAnalysis.gasEfficiency >
      historicalAvgEfficiency + efficiencyThreshold
        ? "up"
        : currentAnalysis.gasEfficiency <
            historicalAvgEfficiency - efficiencyThreshold
          ? "down"
          : "stable";

    const insights: string[] = [];

    if (avgGasTrend === "up") {
      insights.push(
        `Average gas usage increased by ${((currentAnalysis.averageGasPerTransaction / historicalAvgGas - 1) * 100).toFixed(1)}%`,
      );
    } else if (avgGasTrend === "down") {
      insights.push(
        `Average gas usage decreased by ${((1 - currentAnalysis.averageGasPerTransaction / historicalAvgGas) * 100).toFixed(1)}%`,
      );
    }

    if (costTrend === "up") {
      insights.push(
        `Transaction costs increased compared to historical average`,
      );
    } else if (costTrend === "down") {
      insights.push(
        `Transaction costs decreased compared to historical average`,
      );
    }

    return {
      avgGasTrend,
      costTrend,
      efficiencyTrend,
      insights,
    };
  }
}
