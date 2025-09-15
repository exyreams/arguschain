import { DEFAULT_GAS_LIMITS, GAS_CATEGORIES } from "../constants";
import type { GasAnalysis, SimulationResult } from "../types";

export class GasProcessor {
  static categorizeGasUsage(functionName: string, gasUsed: number): string {
    let operationCategory = "Other Operation";
    for (const [category, functions] of Object.entries(GAS_CATEGORIES)) {
      if (functions.includes(functionName)) {
        operationCategory = category;
        break;
      }
    }

    const expectedGas =
      DEFAULT_GAS_LIMITS[functionName as keyof typeof DEFAULT_GAS_LIMITS] ||
      50000;
    const efficiency = this.calculateEfficiency(gasUsed, expectedGas);

    return `${operationCategory} (${efficiency})`;
  }

  private static calculateEfficiency(
    actualGas: number,
    expectedGas: number,
  ): string {
    const ratio = actualGas / expectedGas;

    if (ratio <= 0.8) {
      return "Highly Efficient";
    } else if (ratio <= 1.0) {
      return "Efficient";
    } else if (ratio <= 1.3) {
      return "Moderate";
    } else if (ratio <= 1.6) {
      return "High Gas";
    } else {
      return "Very High Gas";
    }
  }

  static analyzeGasUsage(results: SimulationResult[]): GasAnalysis[] {
    if (results.length === 0) return [];

    const totalGas = results.reduce((sum, result) => sum + result.gasUsed, 0);
    const analyses: GasAnalysis[] = [];

    const categoryGroups = new Map<string, SimulationResult[]>();
    results.forEach((result) => {
      const category = this.getOperationCategory(result.functionName);
      if (!categoryGroups.has(category)) {
        categoryGroups.set(category, []);
      }
      categoryGroups.get(category)!.push(result);
    });

    categoryGroups.forEach((categoryResults, category) => {
      const categoryGas = categoryResults.reduce(
        (sum, result) => sum + result.gasUsed,
        0,
      );
      const percentage = (categoryGas / totalGas) * 100;
      const avgGas = categoryGas / categoryResults.length;

      const efficiency = this.determineEfficiency(category, avgGas);
      const recommendation = this.getOptimizationRecommendation(
        category,
        avgGas,
        efficiency,
      );

      analyses.push({
        category,
        gasUsed: categoryGas,
        percentage,
        efficiency,
        recommendation,
      });
    });

    return analyses.sort((a, b) => b.gasUsed - a.gasUsed);
  }

  private static getOperationCategory(functionName: string): string {
    for (const [category, functions] of Object.entries(GAS_CATEGORIES)) {
      if (functions.includes(functionName)) {
        return category;
      }
    }
    return "Other Operation";
  }

  private static determineEfficiency(
    category: string,
    avgGas: number,
  ): "high" | "medium" | "low" {
    const thresholds = {
      Query: { high: 30000, medium: 40000 },
      "Basic Transfer": { high: 50000, medium: 70000 },
      Authorization: { high: 45000, medium: 60000 },
      "Advanced Transfer": { high: 65000, medium: 85000 },
      "Supply Management": { high: 70000, medium: 100000 },
      Administrative: { high: 40000, medium: 60000 },
    };

    const threshold = thresholds[category as keyof typeof thresholds] || {
      high: 50000,
      medium: 80000,
    };

    if (avgGas <= threshold.high) return "high";
    if (avgGas <= threshold.medium) return "medium";
    return "low";
  }

  private static getOptimizationRecommendation(
    category: string,
    avgGas: number,
    efficiency: "high" | "medium" | "low",
  ): string | undefined {
    if (efficiency === "high") return undefined;

    const recommendations = {
      "Basic Transfer": {
        medium:
          "Consider batching multiple transfers to reduce per-transaction overhead",
        low: "Review token contract implementation for gas optimization opportunities",
      },
      Authorization: {
        medium:
          "Use increaseAllowance/decreaseAllowance instead of setting allowance to 0 first",
        low: "Consider using permit() for gasless approvals where supported",
      },
      "Advanced Transfer": {
        medium:
          "Ensure sufficient allowance is set to avoid failed transactions",
        low: "Consider direct transfers instead of transferFrom when possible",
      },
      "Supply Management": {
        medium: "Batch mint/burn operations when possible",
        low: "Review access control patterns for gas efficiency",
      },
      Administrative: {
        medium: "Combine administrative operations in a single transaction",
        low: "Consider using proxy patterns for upgradeable contracts",
      },
      Query: {
        medium: "Use view functions locally instead of transactions",
        low: "Cache query results to avoid repeated calls",
      },
    };

    const categoryRecs =
      recommendations[category as keyof typeof recommendations];
    return categoryRecs?.[efficiency];
  }

  static compareGasUsage(results: SimulationResult[]): {
    mostEfficient: SimulationResult | null;
    leastEfficient: SimulationResult | null;
    averageGas: number;
    gasRange: { min: number; max: number };
    recommendations: string[];
  } {
    if (results.length === 0) {
      return {
        mostEfficient: null,
        leastEfficient: null,
        averageGas: 0,
        gasRange: { min: 0, max: 0 },
        recommendations: [],
      };
    }

    const successfulResults = results.filter(
      (r) => r.success || r.hypotheticalSuccess,
    );
    if (successfulResults.length === 0) {
      return {
        mostEfficient: null,
        leastEfficient: null,
        averageGas: 0,
        gasRange: { min: 0, max: 0 },
        recommendations: ["No successful simulations to compare"],
      };
    }

    const gasValues = successfulResults.map((r) => r.gasUsed);
    const mostEfficient = successfulResults.reduce((min, current) =>
      current.gasUsed < min.gasUsed ? current : min,
    );
    const leastEfficient = successfulResults.reduce((max, current) =>
      current.gasUsed > max.gasUsed ? current : max,
    );

    const averageGas =
      gasValues.reduce((sum, gas) => sum + gas, 0) / gasValues.length;
    const gasRange = {
      min: Math.min(...gasValues),
      max: Math.max(...gasValues),
    };

    const recommendations =
      this.generateComparisonRecommendations(successfulResults);

    return {
      mostEfficient,
      leastEfficient,
      averageGas,
      gasRange,
      recommendations,
    };
  }

  private static generateComparisonRecommendations(
    results: SimulationResult[],
  ): string[] {
    const recommendations: string[] = [];

    if (results.length < 2) return recommendations;

    const gasValues = results.map((r) => r.gasUsed);
    const maxGas = Math.max(...gasValues);
    const minGas = Math.min(...gasValues);
    const gasVariation = ((maxGas - minGas) / minGas) * 100;

    if (gasVariation > 50) {
      recommendations.push(
        "Significant gas variation detected. Consider using the most efficient variant.",
      );
    }

    if (gasVariation > 20) {
      recommendations.push(
        "Moderate gas differences found. Review parameters for optimization opportunities.",
      );
    }

    const functionTypes = new Set(results.map((r) => r.functionName));
    if (functionTypes.size > 1) {
      recommendations.push(
        "Different function types have varying gas costs. Choose the most appropriate method for your use case.",
      );
    }

    const failedCount = results.filter(
      (r) => !r.success && !r.hypotheticalSuccess,
    ).length;
    if (failedCount > 0) {
      recommendations.push(
        `${failedCount} simulation(s) failed. Address the underlying issues to avoid wasted gas.`,
      );
    }

    return recommendations;
  }

  static calculateGasCost(
    gasUsed: number,
    gasPriceGwei: number,
    ethPriceUSD: number = 2000,
  ): { costETH: number; costUSD: number } {
    const gasPriceWei = gasPriceGwei * 1e9;
    const costWei = gasUsed * gasPriceWei;
    const costETH = costWei / 1e18;
    const costUSD = costETH * ethPriceUSD;

    return { costETH, costUSD };
  }

  static getOptimizationSuggestions(
    functionName: string,
    gasUsed: number,
  ): string[] {
    const suggestions: string[] = [];
    const expectedGas =
      DEFAULT_GAS_LIMITS[functionName as keyof typeof DEFAULT_GAS_LIMITS];

    if (!expectedGas) return suggestions;

    const efficiency = gasUsed / expectedGas;

    if (efficiency > 1.5) {
      suggestions.push(
        "Gas usage is significantly higher than expected. Review transaction parameters.",
      );
    }

    switch (functionName) {
      case "transfer":
        if (efficiency > 1.2) {
          suggestions.push(
            "Consider checking recipient address validity before transaction.",
          );
        }
        break;

      case "transferFrom":
        if (efficiency > 1.3) {
          suggestions.push(
            "Ensure sufficient allowance is set to avoid additional gas costs.",
          );
        }
        break;

      case "approve":
        if (efficiency > 1.2) {
          suggestions.push(
            "Consider using increaseAllowance/decreaseAllowance for better gas efficiency.",
          );
        }
        break;

      case "mint":
      case "burn":
        if (efficiency > 1.4) {
          suggestions.push(
            "Administrative functions may have higher gas costs due to access control checks.",
          );
        }
        break;
    }

    return suggestions;
  }
}
