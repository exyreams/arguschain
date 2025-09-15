import {
  CostAnalysisData,
  EfficiencyMetric,
  GasBreakdownData,
  OptimizationSuggestion,
  UnifiedGasData,
} from "./types";
import { StructLogAnalysis } from "@/lib/structLogTracer";
import { TransactionAnalysis } from "@/lib/transactionTracer";
import { StructLogProcessor } from "./structLogProcessor";
import { CallTraceProcessor } from "./callTraceProcessor";

export class UnifiedGasProcessor {
  static processAll(
    structLog?: StructLogAnalysis,
    callTrace?: TransactionAnalysis
  ): UnifiedGasData {
    const gasBreakdown = this.createGasBreakdown(structLog, callTrace);
    const efficiencyMetrics = this.calculateEfficiencyMetrics(
      structLog,
      callTrace
    );
    const costAnalysis = this.createCostAnalysis(structLog, callTrace);
    const optimizationSuggestions = this.generateOptimizationSuggestions(
      structLog,
      callTrace
    );

    return {
      gasBreakdown,
      efficiencyMetrics,
      costAnalysis,
      optimizationSuggestions,
    };
  }

  private static createGasBreakdown(
    structLog?: StructLogAnalysis,
    callTrace?: TransactionAnalysis
  ): GasBreakdownData[] {
    const breakdown: GasBreakdownData[] = [];

    if (!structLog && !callTrace) {
      return breakdown;
    }

    const totalGas =
      callTrace?.transaction_stats.total_gas ||
      structLog?.summary.total_gas_cost ||
      0;

    if (totalGas === 0) {
      return breakdown;
    }

    const opcodeCategories = structLog
      ? StructLogProcessor.processOpcodeDistribution(structLog)
      : [];

    const contractGas = callTrace
      ? CallTraceProcessor.processGasAttribution(callTrace)
      : [];

    const categoryMap = new Map<string, GasBreakdownData>();

    opcodeCategories.forEach((opcode) => {
      const category = this.mapOpcodeToCategory(opcode.category);
      if (!categoryMap.has(category)) {
        categoryMap.set(category, {
          category,
          contractGas: 0,
          opcodeGas: 0,
          total: 0,
          percentage: 0,
        });
      }
      const existing = categoryMap.get(category)!;
      existing.opcodeGas += opcode.gasUsed;
    });

    contractGas.forEach((contract) => {
      const category = this.mapContractToCategory(
        contract.contractAddress,
        contract.contractName
      );
      const key = `${category}-${contract.contractAddress}`;
      if (!categoryMap.has(key)) {
        categoryMap.set(key, {
          category,
          contractAddress: contract.contractAddress,
          contractGas: 0,
          opcodeGas: 0,
          total: 0,
          percentage: 0,
        });
      }
      const existing = categoryMap.get(key)!;
      existing.contractGas += contract.gasUsed;
    });

    categoryMap.forEach((item) => {
      item.total = item.contractGas + item.opcodeGas;
      item.percentage = (item.total / totalGas) * 100;
    });

    return Array.from(categoryMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }

  private static calculateEfficiencyMetrics(
    structLog?: StructLogAnalysis,
    callTrace?: TransactionAnalysis
  ): EfficiencyMetric[] {
    const metrics: EfficiencyMetric[] = [];

    if (callTrace) {
      const avgGasPerCall =
        callTrace.transaction_stats.total_gas /
        callTrace.transaction_stats.total_calls;
      metrics.push({
        name: "Gas per Call",
        value: Math.round(avgGasPerCall),
        unit: "gas",
        benchmark: 50000,
        score: Math.max(0, Math.min(100, (50000 / avgGasPerCall) * 100)),
        recommendation:
          avgGasPerCall > 100000
            ? "Consider optimizing contract calls to reduce gas per operation"
            : "Gas per call is within acceptable range",
      });

      const successfulCalls =
        callTrace.transaction_stats.total_calls -
        callTrace.transaction_stats.errors;
      const successRate =
        (successfulCalls / callTrace.transaction_stats.total_calls) * 100;
      metrics.push({
        name: "Call Success Rate",
        value: Math.round(successRate * 100) / 100,
        unit: "%",
        benchmark: 95,
        score: Math.max(0, Math.min(100, successRate)),
        recommendation:
          successRate < 90
            ? "High failure rate detected. Review error handling and input validation"
            : "Call success rate is healthy",
      });
    }

    if (structLog) {
      const totalOpcodes = structLog.summary.total_steps;
      const gasPerOpcode = structLog.summary.total_gas_cost / totalOpcodes;
      metrics.push({
        name: "Gas per Opcode",
        value: Math.round(gasPerOpcode * 100) / 100,
        unit: "gas",
        benchmark: 3,
        score: Math.max(0, Math.min(100, (3 / gasPerOpcode) * 100)),
        recommendation:
          gasPerOpcode > 5
            ? "High gas per opcode suggests inefficient operations"
            : "Opcode efficiency is good",
      });

      const maxMemory =
        structLog.steps && structLog.steps.length > 0
          ? Math.max(...structLog.steps.map((step) => step.memory?.length || 0))
          : 0;
      const memoryEfficiency = maxMemory > 0 ? (1000 / maxMemory) * 100 : 100;
      metrics.push({
        name: "Memory Efficiency",
        value: Math.round(memoryEfficiency),
        unit: "score",
        benchmark: 80,
        score: Math.max(0, Math.min(100, memoryEfficiency)),
        recommendation:
          memoryEfficiency < 50
            ? "High memory usage detected. Consider optimizing data structures"
            : "Memory usage is efficient",
      });
    }

    if (metrics.length > 0) {
      const overallScore =
        metrics.reduce((sum, metric) => sum + metric.score, 0) / metrics.length;
      metrics.unshift({
        name: "Overall Efficiency",
        value: Math.round(overallScore),
        unit: "score",
        benchmark: 80,
        score: overallScore,
        recommendation:
          overallScore < 60
            ? "Multiple optimization opportunities identified"
            : overallScore < 80
              ? "Good efficiency with room for improvement"
              : "Excellent gas efficiency",
      });
    }

    return metrics;
  }

  private static createCostAnalysis(
    structLog?: StructLogAnalysis,
    callTrace?: TransactionAnalysis
  ): CostAnalysisData[] {
    const costData: CostAnalysisData[] = [];

    const ethPriceUSD = 2500;
    const gasPrice = 20;

    const totalGas =
      callTrace?.transaction_stats.total_gas ||
      structLog?.summary.total_gas_cost ||
      0;

    if (totalGas === 0) {
      return costData;
    }

    if (callTrace) {
      const gasAttribution =
        CallTraceProcessor.processGasAttribution(callTrace);

      gasAttribution.slice(0, 5).forEach((contract) => {
        const costWei =
          BigInt(contract.gasUsed) * BigInt(gasPrice) * BigInt(1e9);
        const costETH = Number(costWei) / 1e18;
        const costUSD = costETH * ethPriceUSD;

        // Show contract address for Unknown Contract, keep PYUSD as is
        const displayCategory =
          contract.contractName === "Unknown Contract"
            ? contract.contractAddress
            : contract.contractName ||
              `Contract ${contract.contractAddress.slice(0, 8)}...`;

        costData.push({
          category: displayCategory,
          contractAddress: contract.contractAddress,
          gasUsed: contract.gasUsed,
          costWei,
          costUSD,
          percentage: contract.percentage,
        });
      });
    }

    if (structLog && costData.length === 0) {
      const opcodeDistribution =
        StructLogProcessor.processOpcodeDistribution(structLog);

      opcodeDistribution.slice(0, 5).forEach((opcode) => {
        const costWei = BigInt(opcode.gasUsed) * BigInt(gasPrice) * BigInt(1e9);
        const costETH = Number(costWei) / 1e18;
        const costUSD = costETH * ethPriceUSD;

        costData.push({
          category: opcode.category,
          gasUsed: opcode.gasUsed,
          costWei,
          costUSD,
          percentage: opcode.percentage,
        });
      });
    }

    return costData.sort((a, b) => b.costUSD - a.costUSD);
  }

  private static generateOptimizationSuggestions(
    structLog?: StructLogAnalysis,
    callTrace?: TransactionAnalysis
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    if (callTrace) {
      const gasAttribution =
        CallTraceProcessor.processGasAttribution(callTrace);
      const totalGas = callTrace.transaction_stats.total_gas;

      if (gasAttribution.length > 0 && gasAttribution[0].percentage > 70) {
        suggestions.push({
          id: "high-gas-concentration",
          type: "gas",
          severity: "high",
          title: "High Gas Concentration",
          description: `${gasAttribution[0].percentage.toFixed(1)}% of gas is used by a single contract`,
          recommendation:
            "Review the main contract for optimization opportunities, consider breaking down complex operations",
          potentialSavings: {
            gas: Math.round(gasAttribution[0].gasUsed * 0.2),
            percentage: 20,
            costUSD:
              ((gasAttribution[0].gasUsed * 0.2 * 20 * 1e9) / 1e18) * 2500,
          },
        });
      }

      const failureRate =
        (callTrace.transaction_stats.errors /
          callTrace.transaction_stats.total_calls) *
        100;
      if (failureRate > 10) {
        suggestions.push({
          id: "high-failure-rate",
          type: "performance",
          severity: "medium",
          title: "High Call Failure Rate",
          description: `${failureRate.toFixed(1)}% of calls are failing`,
          recommendation:
            "Implement better error handling and input validation to reduce failed calls",
          potentialSavings: {
            gas: Math.round(totalGas * (failureRate / 100) * 0.5),
            percentage: Math.round(failureRate / 2),
            costUSD:
              ((totalGas * (failureRate / 100) * 0.5 * 20 * 1e9) / 1e18) * 2500,
          },
        });
      }
    }

    if (structLog) {
      const opcodeDistribution =
        StructLogProcessor.processOpcodeDistribution(structLog);

      const storageOpcodes = opcodeDistribution.find(
        (op) => op.category === "Storage"
      );
      if (storageOpcodes && storageOpcodes.percentage > 30) {
        suggestions.push({
          id: "storage-optimization",
          type: "gas",
          severity: "high",
          title: "High Storage Gas Usage",
          description: `${storageOpcodes.percentage.toFixed(1)}% of gas is used for storage operations`,
          recommendation:
            "Consider using memory instead of storage where possible, batch storage operations, or use more efficient data structures",
          potentialSavings: {
            gas: Math.round(storageOpcodes.gasUsed * 0.3),
            percentage: 30,
            costUSD: ((storageOpcodes.gasUsed * 0.3 * 20 * 1e9) / 1e18) * 2500,
          },
        });
      }

      const memoryOpcodes = opcodeDistribution.find(
        (op) => op.category === "Memory"
      );
      if (memoryOpcodes && memoryOpcodes.percentage > 25) {
        suggestions.push({
          id: "memory-optimization",
          type: "performance",
          severity: "medium",
          title: "High Memory Operations",
          description: `${memoryOpcodes.percentage.toFixed(1)}% of gas is used for memory operations`,
          recommendation:
            "Optimize memory usage patterns, avoid unnecessary memory allocations, and use fixed-size arrays where possible",
          potentialSavings: {
            gas: Math.round(memoryOpcodes.gasUsed * 0.15),
            percentage: 15,
            costUSD: ((memoryOpcodes.gasUsed * 0.15 * 20 * 1e9) / 1e18) * 2500,
          },
        });
      }
    }

    if (suggestions.length === 0) {
      suggestions.push({
        id: "general-optimization",
        type: "gas",
        severity: "low",
        title: "General Optimization",
        description: "Transaction appears to be well-optimized",
        recommendation:
          "Continue monitoring gas usage patterns and consider implementing gas usage tracking for future optimizations",
      });
    }

    return suggestions.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  private static mapOpcodeToCategory(opcodeCategory: string): string {
    const categoryMap: Record<string, string> = {
      Arithmetic: "Computation",
      Comparison: "Computation",
      Bitwise: "Computation",
      Storage: "Storage Operations",
      Memory: "Memory Operations",
      Stack: "Stack Operations",
      "Control Flow": "Control Flow",
      System: "System Calls",
      Crypto: "Cryptographic Operations",
    };

    // Capitalize the first letter of the category if it's not in the map
    const mappedCategory = categoryMap[opcodeCategory];
    if (mappedCategory) {
      return mappedCategory;
    }

    // Capitalize first letter for categories like 'stack' -> 'Stack', 'flow' -> 'Flow'
    return (
      opcodeCategory.charAt(0).toUpperCase() +
      opcodeCategory.slice(1).toLowerCase()
    );
  }

  private static mapContractToCategory(address: string, name?: string): string {
    // If no name or name is "Unknown Contract", show the contract address
    if (!name || name === "Unknown Contract") {
      return address;
    }

    const lowerName = name.toLowerCase();

    // Check for known contract types and create meaningful categories
    if (lowerName.includes("token") || lowerName.includes("erc20")) {
      return "Token Operations";
    }
    if (
      lowerName.includes("swap") ||
      lowerName.includes("dex") ||
      lowerName.includes("uniswap")
    ) {
      return "DEX Operations";
    }
    if (
      lowerName.includes("lending") ||
      lowerName.includes("compound") ||
      lowerName.includes("aave")
    ) {
      return "Lending Operations";
    }
    if (
      lowerName.includes("nft") ||
      lowerName.includes("erc721") ||
      lowerName.includes("erc1155")
    ) {
      return "NFT Operations";
    }

    // For known contracts (like PYUSD), return the name as is
    return name;
  }
}
