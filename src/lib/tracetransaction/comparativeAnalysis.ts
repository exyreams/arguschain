import type {
  ComparisonDifference,
  ComparisonMetrics,
  ComparisonResult,
  GasAnalysisData,
  PatternAnalysisData,
  SecurityConcern,
  TraceAnalysisResults,
} from "./types";

export class ComparativeAnalysisService {
  static compareTransactions(
    analysis1: TraceAnalysisResults,
    analysis2: TraceAnalysisResults,
  ): ComparisonResult {
    const metrics = this.calculateComparisonMetrics(analysis1, analysis2);
    const differences = this.identifyDifferences(analysis1, analysis2);
    const patternComparison = this.comparePatterns(
      analysis1.patternAnalysis,
      analysis2.patternAnalysis,
    );
    const gasComparison = this.compareGasAnalysis(
      analysis1.gasAnalysis,
      analysis2.gasAnalysis,
    );
    const securityComparison = this.compareSecurityAnalysis(
      analysis1.securityAssessment.concerns,
      analysis2.securityAssessment.concerns,
    );

    return {
      transaction1: {
        hash: analysis1.transactionHash,
        summary: this.generateTransactionSummary(analysis1),
      },
      transaction2: {
        hash: analysis2.transactionHash,
        summary: this.generateTransactionSummary(analysis2),
      },
      metrics,
      differences,
      patternComparison,
      gasComparison,
      securityComparison,
      recommendations: this.generateComparisonRecommendations(
        analysis1,
        analysis2,
        differences,
      ),
    };
  }

  private static calculateComparisonMetrics(
    analysis1: TraceAnalysisResults,
    analysis2: TraceAnalysisResults,
  ): ComparisonMetrics {
    const actions1 = analysis1.processedActions;
    const actions2 = analysis2.processedActions;

    return {
      actionCount: {
        transaction1: actions1.length,
        transaction2: actions2.length,
        difference: actions2.length - actions1.length,
        percentageChange: this.calculatePercentageChange(
          actions1.length,
          actions2.length,
        ),
      },
      gasUsage: {
        transaction1: analysis1.gasAnalysis.totalGas,
        transaction2: analysis2.gasAnalysis.totalGas,
        difference:
          analysis2.gasAnalysis.totalGas - analysis1.gasAnalysis.totalGas,
        percentageChange: this.calculatePercentageChange(
          analysis1.gasAnalysis.totalGas,
          analysis2.gasAnalysis.totalGas,
        ),
      },
      contractCount: {
        transaction1: analysis1.contractInteractions.length,
        transaction2: analysis2.contractInteractions.length,
        difference:
          analysis2.contractInteractions.length -
          analysis1.contractInteractions.length,
        percentageChange: this.calculatePercentageChange(
          analysis1.contractInteractions.length,
          analysis2.contractInteractions.length,
        ),
      },
      maxDepth: {
        transaction1: Math.max(...actions1.map((a) => a.depth)),
        transaction2: Math.max(...actions2.map((a) => a.depth)),
        difference:
          Math.max(...actions2.map((a) => a.depth)) -
          Math.max(...actions1.map((a) => a.depth)),
        percentageChange: this.calculatePercentageChange(
          Math.max(...actions1.map((a) => a.depth)),
          Math.max(...actions2.map((a) => a.depth)),
        ),
      },
      errorCount: {
        transaction1: actions1.filter((a) => a.error).length,
        transaction2: actions2.filter((a) => a.error).length,
        difference:
          actions2.filter((a) => a.error).length -
          actions1.filter((a) => a.error).length,
        percentageChange: this.calculatePercentageChange(
          actions1.filter((a) => a.error).length,
          actions2.filter((a) => a.error).length,
        ),
      },
    };
  }

  private static identifyDifferences(
    analysis1: TraceAnalysisResults,
    analysis2: TraceAnalysisResults,
  ): ComparisonDifference[] {
    const differences: ComparisonDifference[] = [];

    if (
      analysis1.patternAnalysis.pattern !== analysis2.patternAnalysis.pattern
    ) {
      differences.push({
        category: "pattern",
        type: "pattern_type_change",
        description: `Transaction pattern changed from ${analysis1.patternAnalysis.pattern} to ${analysis2.patternAnalysis.pattern}`,
        impact: "medium",
        transaction1Value: analysis1.patternAnalysis.pattern,
        transaction2Value: analysis2.patternAnalysis.pattern,
      });
    }

    const gasChange =
      analysis2.gasAnalysis.totalGas - analysis1.gasAnalysis.totalGas;
    const gasPercentageChange = this.calculatePercentageChange(
      analysis1.gasAnalysis.totalGas,
      analysis2.gasAnalysis.totalGas,
    );

    if (Math.abs(gasPercentageChange) > 10) {
      differences.push({
        category: "gas",
        type: "gas_usage_change",
        description: `Gas usage ${gasChange > 0 ? "increased" : "decreased"} by ${Math.abs(gasChange).toLocaleString()} (${Math.abs(gasPercentageChange).toFixed(1)}%)`,
        impact: Math.abs(gasPercentageChange) > 25 ? "high" : "medium",
        transaction1Value: analysis1.gasAnalysis.totalGas.toString(),
        transaction2Value: analysis2.gasAnalysis.totalGas.toString(),
      });
    }

    const security1Count = analysis1.securityAssessment.concerns.length;
    const security2Count = analysis2.securityAssessment.concerns.length;
    if (security1Count !== security2Count) {
      differences.push({
        category: "security",
        type: "security_concern_change",
        description: `Security concerns ${security2Count > security1Count ? "increased" : "decreased"} from ${security1Count} to ${security2Count}`,
        impact: security2Count > security1Count ? "high" : "low",
        transaction1Value: security1Count.toString(),
        transaction2Value: security2Count.toString(),
      });
    }

    const contracts1 = new Set(analysis1.contractInteractions.map((c) => c.to));
    const contracts2 = new Set(analysis2.contractInteractions.map((c) => c.to));

    const newContracts = [...contracts2].filter((c) => !contracts1.has(c));
    const removedContracts = [...contracts1].filter((c) => !contracts2.has(c));

    if (newContracts.length > 0) {
      differences.push({
        category: "contracts",
        type: "new_contracts",
        description: `New contract interactions: ${newContracts.slice(0, 3).join(", ")}${newContracts.length > 3 ? "..." : ""}`,
        impact: "medium",
        transaction1Value: "N/A",
        transaction2Value: newContracts.length.toString(),
      });
    }

    if (removedContracts.length > 0) {
      differences.push({
        category: "contracts",
        type: "removed_contracts",
        description: `Removed contract interactions: ${removedContracts.slice(0, 3).join(", ")}${removedContracts.length > 3 ? "..." : ""}`,
        impact: "medium",
        transaction1Value: removedContracts.length.toString(),
        transaction2Value: "N/A",
      });
    }

    return differences;
  }

  private static comparePatterns(
    pattern1: PatternAnalysisData,
    pattern2: PatternAnalysisData,
  ) {
    return {
      typeChanged: pattern1.pattern !== pattern2.pattern,
      confidenceChange: pattern2.confidence - pattern1.confidence,
      complexityChange: pattern2.complexity - pattern1.complexity,
      indicatorChanges: this.compareArrays(
        pattern1.indicators.map((i) => i.type),
        pattern2.indicators.map((i) => i.type),
      ),
      summary:
        pattern1.pattern === pattern2.pattern
          ? `Both transactions follow the same ${pattern1.pattern} pattern`
          : `Pattern changed from ${pattern1.pattern} to ${pattern2.pattern}`,
    };
  }

  private static compareGasAnalysis(
    gas1: GasAnalysisData,
    gas2: GasAnalysisData,
  ) {
    const gasChange = gas2.totalGas - gas1.totalGas;
    const gasPercentageChange = this.calculatePercentageChange(
      gas1.totalGas,
      gas2.totalGas,
    );

    return {
      totalGasChange: gasChange,
      totalGasPercentageChange: gasPercentageChange,
      efficiencyChange: 0,
      categoryChanged: false,
      optimizationOpportunities: this.compareArrays(
        gas1.optimizationSuggestions.map((s) => s.title),
        gas2.optimizationSuggestions.map((s) => s.title),
      ),
      summary:
        gasChange === 0
          ? "Gas usage remained the same"
          : `Gas usage ${gasChange > 0 ? "increased" : "decreased"} by ${Math.abs(gasChange).toLocaleString()} (${Math.abs(gasPercentageChange).toFixed(1)}%)`,
    };
  }

  private static compareSecurityAnalysis(
    security1: SecurityConcern[],
    security2: SecurityConcern[],
  ) {
    const risk1 = this.calculateOverallRisk(security1);
    const risk2 = this.calculateOverallRisk(security2);

    return {
      riskLevelChange: risk2 - risk1,
      concernCountChange: security2.length - security1.length,
      newConcerns: security2.filter(
        (s2) =>
          !security1.some(
            (s1) => s1.description === s2.description && s1.level === s2.level,
          ),
      ),
      resolvedConcerns: security1.filter(
        (s1) =>
          !security2.some(
            (s2) => s2.description === s1.description && s2.level === s1.level,
          ),
      ),
      summary:
        security1.length === security2.length && risk1 === risk2
          ? "Security profile remained the same"
          : `Security ${risk2 > risk1 ? "risk increased" : "risk decreased"} with ${security2.length} total concerns`,
    };
  }

  private static generateComparisonRecommendations(
    analysis1: TraceAnalysisResults,
    analysis2: TraceAnalysisResults,
    differences: ComparisonDifference[],
  ): string[] {
    const recommendations: string[] = [];

    const gasChange =
      analysis2.gasAnalysis.totalGas - analysis1.gasAnalysis.totalGas;
    if (gasChange > 0) {
      recommendations.push(
        `Transaction 2 uses ${gasChange.toLocaleString()} more gas. Consider optimizing contract interactions.`,
      );
    } else if (gasChange < 0) {
      recommendations.push(
        `Transaction 2 is more gas efficient, saving ${Math.abs(gasChange).toLocaleString()} gas. Good optimization!`,
      );
    }

    const securityDiff = differences.find((d) => d.category === "security");
    if (securityDiff && securityDiff.impact === "high") {
      recommendations.push(
        "Security concerns have changed significantly. Review the security analysis for both transactions.",
      );
    }

    const patternDiff = differences.find((d) => d.category === "pattern");
    if (patternDiff) {
      recommendations.push(
        "Transaction patterns differ. Ensure the change aligns with your intended operation.",
      );
    }

    const contractDiff = differences.filter((d) => d.category === "contracts");
    if (contractDiff.length > 0) {
      recommendations.push(
        "Contract interactions have changed. Verify that all necessary contracts are being called.",
      );
    }

    return recommendations;
  }

  private static generateTransactionSummary(analysis: TraceAnalysisResults) {
    return {
      pattern: analysis.patternAnalysis.pattern,
      gasUsed: analysis.gasAnalysis.totalGas,
      gasEfficiency: "average",
      actionCount: analysis.processedActions.length,
      contractCount: analysis.contractInteractions.length,
      securityRisk: this.calculateOverallRisk(
        analysis.securityAssessment.concerns,
      ),
      hasErrors: analysis.processedActions.some((a) => a.error),
    };
  }

  private static calculatePercentageChange(
    oldValue: number,
    newValue: number,
  ): number {
    if (oldValue === 0) return newValue === 0 ? 0 : 100;
    return ((newValue - oldValue) / oldValue) * 100;
  }

  private static compareArrays<T>(array1: T[], array2: T[]) {
    return {
      added: array2.filter((item) => !array1.includes(item)),
      removed: array1.filter((item) => !array2.includes(item)),
      common: array1.filter((item) => array2.includes(item)),
    };
  }

  private static calculateOverallRisk(concerns: SecurityConcern[]): number {
    const riskWeights = { low: 1, medium: 3, high: 5, critical: 10 };
    return concerns.reduce(
      (total, concern) => total + riskWeights[concern.level],
      0,
    );
  }
}
