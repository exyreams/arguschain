import type { ProcessedTraceAction, TraceAnalysisResults } from "./types";

export class AdvancedMevDetector {
  static analyzeTransaction(
    analysis: TraceAnalysisResults,
  ): AdvancedMevAnalysis {
    const indicators: AdvancedMevIndicator[] = [];
    const patterns: MevPattern[] = [];

    const sandwichAnalysis = this.detectSandwichAttack(analysis);
    if (sandwichAnalysis.detected) {
      indicators.push(...sandwichAnalysis.indicators);
      patterns.push(sandwichAnalysis.pattern);
    }

    const arbitrageAnalysis = this.detectArbitrage(analysis);
    if (arbitrageAnalysis.detected) {
      indicators.push(...arbitrageAnalysis.indicators);
      patterns.push(arbitrageAnalysis.pattern);
    }

    const frontRunAnalysis = this.detectFrontRunning(analysis);
    if (frontRunAnalysis.detected) {
      indicators.push(...frontRunAnalysis.indicators);
      patterns.push(frontRunAnalysis.pattern);
    }

    const liquidationAnalysis = this.detectLiquidationMev(analysis);
    if (liquidationAnalysis.detected) {
      indicators.push(...liquidationAnalysis.indicators);
      patterns.push(liquidationAnalysis.pattern);
    }

    const mevScore = this.calculateMevScore(indicators, patterns);
    const riskLevel = this.calculateRiskLevel(mevScore, patterns);

    return {
      mevDetected: indicators.length > 0,
      mevScore,
      riskLevel,
      patterns,
      indicators,
      recommendations: this.generateMevRecommendations(patterns, indicators),
      blockAnalysis: null,
    };
  }

  static analyzeBlock(transactions: TraceAnalysisResults[]): BlockMevAnalysis {
    const blockPatterns: BlockMevPattern[] = [];
    const correlations: TransactionCorrelation[] = [];

    const sandwichPatterns = this.detectBlockSandwichAttacks(transactions);
    blockPatterns.push(...sandwichPatterns);

    const arbitrageChains = this.detectArbitrageChains(transactions);
    blockPatterns.push(...arbitrageChains);

    const botActivity = this.detectMevBotActivity(transactions);
    blockPatterns.push(...botActivity);

    correlations.push(...this.analyzeTransactionCorrelations(transactions));

    return {
      totalTransactions: transactions.length,
      mevTransactions: transactions.filter(
        (tx) => this.analyzeTransaction(tx).mevDetected,
      ).length,
      blockPatterns,
      correlations,
      mevExtraction: this.calculateMevExtraction(blockPatterns),
      recommendations: this.generateBlockRecommendations(blockPatterns),
    };
  }

  private static detectSandwichAttack(
    analysis: TraceAnalysisResults,
  ): MevDetectionResult {
    const indicators: AdvancedMevIndicator[] = [];
    const traces = analysis.processedActions;

    const dexInteractions = traces.filter((trace) =>
      this.isDexInteraction(trace),
    );

    if (dexInteractions.length === 0) {
      return { detected: false, indicators: [], pattern: null };
    }

    const priceImpactIndicator = this.analyzePriceImpact(dexInteractions);
    if (priceImpactIndicator) {
      indicators.push(priceImpactIndicator);
    }

    const slippageIndicator = this.analyzeSlippage(dexInteractions);
    if (slippageIndicator) {
      indicators.push(slippageIndicator);
    }

    const botSignature = this.analyzeMevBotSignature(traces);
    if (botSignature) {
      indicators.push(botSignature);
    }

    const detected = indicators.length >= 2;

    return {
      detected,
      indicators,
      pattern: detected
        ? {
            type: "sandwich_attack",
            confidence: this.calculatePatternConfidence(indicators),
            description: "Potential sandwich attack detected",
            severity: "high",
            extractedValue: this.estimateExtractedValue(dexInteractions),
          }
        : null,
    };
  }

  private static detectArbitrage(
    analysis: TraceAnalysisResults,
  ): MevDetectionResult {
    const indicators: AdvancedMevIndicator[] = [];
    const traces = analysis.processedActions;

    const dexInteractions = traces.filter((trace) =>
      this.isDexInteraction(trace),
    );
    const uniqueDexes = new Set(dexInteractions.map((trace) => trace.to));

    if (uniqueDexes.size < 2) {
      return { detected: false, indicators: [], pattern: null };
    }

    const priceDiscrepancy = this.analyzePriceDiscrepancy(dexInteractions);
    if (priceDiscrepancy) {
      indicators.push(priceDiscrepancy);
    }

    const flashLoanUsage = this.analyzeFlashLoanUsage(traces);
    if (flashLoanUsage) {
      indicators.push(flashLoanUsage);
    }

    const atomicExecution = this.analyzeAtomicExecution(traces);
    if (atomicExecution) {
      indicators.push(atomicExecution);
    }

    const detected = indicators.length >= 2;

    return {
      detected,
      indicators,
      pattern: detected
        ? {
            type: "arbitrage",
            confidence: this.calculatePatternConfidence(indicators),
            description: "Arbitrage opportunity exploitation detected",
            severity: "medium",
            extractedValue: this.estimateArbitrageValue(dexInteractions),
          }
        : null,
    };
  }

  private static detectFrontRunning(
    analysis: TraceAnalysisResults,
  ): MevDetectionResult {
    const indicators: AdvancedMevIndicator[] = [];
    const traces = analysis.processedActions;

    const gasAnalysis = analysis.gasAnalysis;
    if (
      gasAnalysis.totalGas >
      gasAnalysis.benchmarkComparison[0]?.benchmarkGas * 1.5
    ) {
      indicators.push({
        type: "high_gas_price",
        confidence: 0.7,
        description: "Unusually high gas price suggesting front-running",
        severity: "medium",
        evidence: {
          actualGas: gasAnalysis.totalGas,
          benchmarkGas: gasAnalysis.benchmarkComparison[0]?.benchmarkGas || 0,
        },
      });
    }

    const botPattern = this.analyzeFrontRunningBotPattern(traces);
    if (botPattern) {
      indicators.push(botPattern);
    }

    const timingPattern = this.analyzeTimingPattern(analysis);
    if (timingPattern) {
      indicators.push(timingPattern);
    }

    const detected = indicators.length >= 1;

    return {
      detected,
      indicators,
      pattern: detected
        ? {
            type: "front_running",
            confidence: this.calculatePatternConfidence(indicators),
            description: "Front-running pattern detected",
            severity: "high",
            extractedValue: this.estimateFrontRunningValue(traces),
          }
        : null,
    };
  }

  private static detectLiquidationMev(
    analysis: TraceAnalysisResults,
  ): MevDetectionResult {
    const indicators: AdvancedMevIndicator[] = [];
    const traces = analysis.processedActions;

    const liquidationCalls = traces.filter((trace) =>
      this.isLiquidationCall(trace),
    );

    if (liquidationCalls.length === 0) {
      return { detected: false, indicators: [], pattern: null };
    }

    const bonusExtraction = this.analyzeLiquidationBonus(liquidationCalls);
    if (bonusExtraction) {
      indicators.push(bonusExtraction);
    }

    const flashLoanLiquidation = this.analyzeFlashLoanLiquidation(traces);
    if (flashLoanLiquidation) {
      indicators.push(flashLoanLiquidation);
    }

    const detected = indicators.length >= 1;

    return {
      detected,
      indicators,
      pattern: detected
        ? {
            type: "liquidation_mev",
            confidence: this.calculatePatternConfidence(indicators),
            description: "Liquidation MEV extraction detected",
            severity: "medium",
            extractedValue: this.estimateLiquidationValue(liquidationCalls),
          }
        : null,
    };
  }

  private static isDexInteraction(trace: ProcessedTraceAction): boolean {
    const dexPatterns = [
      "swap",
      "exchange",
      "trade",
      "uniswap",
      "sushiswap",
      "curve",
      "balancer",
    ];
    return dexPatterns.some(
      (pattern) =>
        trace.function.toLowerCase().includes(pattern) ||
        trace.contract.toLowerCase().includes(pattern),
    );
  }

  private static isLiquidationCall(trace: ProcessedTraceAction): boolean {
    const liquidationPatterns = ["liquidate", "seize", "repay"];
    return liquidationPatterns.some((pattern) =>
      trace.function.toLowerCase().includes(pattern),
    );
  }

  private static analyzePriceImpact(
    dexInteractions: ProcessedTraceAction[],
  ): AdvancedMevIndicator | null {
    const highValueSwaps = dexInteractions.filter(
      (trace) => trace.valueEth > 10,
    );

    if (highValueSwaps.length > 0) {
      return {
        type: "high_price_impact",
        confidence: 0.8,
        description:
          "High value swaps detected indicating potential price manipulation",
        severity: "high",
        evidence: {
          swapCount: highValueSwaps.length,
          totalValue: highValueSwaps.reduce(
            (sum, trace) => sum + trace.valueEth,
            0,
          ),
        },
      };
    }
    return null;
  }

  private static analyzeSlippage(
    dexInteractions: ProcessedTraceAction[],
  ): AdvancedMevIndicator | null {
    if (dexInteractions.length > 2) {
      return {
        type: "unusual_slippage",
        confidence: 0.6,
        description:
          "Multiple DEX interactions suggesting slippage exploitation",
        severity: "medium",
        evidence: {
          interactionCount: dexInteractions.length,
        },
      };
    }
    return null;
  }

  private static analyzeMevBotSignature(
    traces: ProcessedTraceAction[],
  ): AdvancedMevIndicator | null {
    const complexInteractions = traces.filter((trace) => trace.depth > 3);
    const gasOptimizations = traces.filter((trace) => trace.gasUsed < 21000);

    if (complexInteractions.length > 5 && gasOptimizations.length > 0) {
      return {
        type: "mev_bot_signature",
        confidence: 0.9,
        description: "MEV bot signature detected in transaction pattern",
        severity: "high",
        evidence: {
          complexInteractions: complexInteractions.length,
          gasOptimizations: gasOptimizations.length,
        },
      };
    }
    return null;
  }

  private static analyzePriceDiscrepancy(
    dexInteractions: ProcessedTraceAction[],
  ): AdvancedMevIndicator | null {
    const uniqueDexes = new Set(dexInteractions.map((trace) => trace.to));

    if (uniqueDexes.size >= 2) {
      return {
        type: "price_discrepancy",
        confidence: 0.7,
        description: "Price discrepancy exploitation across multiple DEXes",
        severity: "medium",
        evidence: {
          dexCount: uniqueDexes.size,
          interactions: dexInteractions.length,
        },
      };
    }
    return null;
  }

  private static analyzeFlashLoanUsage(
    traces: ProcessedTraceAction[],
  ): AdvancedMevIndicator | null {
    const flashLoanPatterns = ["flashloan", "borrow", "repay"];
    const flashLoanCalls = traces.filter((trace) =>
      flashLoanPatterns.some((pattern) =>
        trace.function.toLowerCase().includes(pattern),
      ),
    );

    if (flashLoanCalls.length > 0) {
      return {
        type: "flash_loan_usage",
        confidence: 0.8,
        description: "Flash loan usage detected for capital efficiency",
        severity: "medium",
        evidence: {
          flashLoanCalls: flashLoanCalls.length,
        },
      };
    }
    return null;
  }

  private static analyzeAtomicExecution(
    traces: ProcessedTraceAction[],
  ): AdvancedMevIndicator | null {
    const hasRevert = traces.some((trace) => trace.error);
    const complexFlow = traces.length > 10;

    if (!hasRevert && complexFlow) {
      return {
        type: "atomic_execution",
        confidence: 0.6,
        description: "Atomic execution pattern suggesting MEV strategy",
        severity: "low",
        evidence: {
          traceCount: traces.length,
          noReverts: !hasRevert,
        },
      };
    }
    return null;
  }

  private static analyzeFrontRunningBotPattern(
    traces: ProcessedTraceAction[],
  ): AdvancedMevIndicator | null {
    const quickExecution = traces.length < 5;
    const highGasEfficiency = traces.every((trace) => trace.gasUsed > 0);

    if (quickExecution && highGasEfficiency) {
      return {
        type: "frontrun_bot_pattern",
        confidence: 0.7,
        description: "Front-running bot execution pattern detected",
        severity: "high",
        evidence: {
          quickExecution,
          gasEfficient: highGasEfficiency,
        },
      };
    }
    return null;
  }

  private static analyzeTimingPattern(
    analysis: TraceAnalysisResults,
  ): AdvancedMevIndicator | null {
    const gasAnalysis = analysis.gasAnalysis;
    const highGasPrice = gasAnalysis.totalGas > 100000;

    if (highGasPrice) {
      return {
        type: "timing_pattern",
        confidence: 0.5,
        description: "Timing pattern suggesting strategic execution",
        severity: "low",
        evidence: {
          gasUsed: gasAnalysis.totalGas,
        },
      };
    }
    return null;
  }

  private static analyzeLiquidationBonus(
    liquidationCalls: ProcessedTraceAction[],
  ): AdvancedMevIndicator | null {
    if (liquidationCalls.length > 0) {
      return {
        type: "liquidation_bonus",
        confidence: 0.8,
        description: "Liquidation bonus extraction detected",
        severity: "medium",
        evidence: {
          liquidationCalls: liquidationCalls.length,
        },
      };
    }
    return null;
  }

  private static analyzeFlashLoanLiquidation(
    traces: ProcessedTraceAction[],
  ): AdvancedMevIndicator | null {
    const hasFlashLoan = traces.some((trace) =>
      trace.function.toLowerCase().includes("flashloan"),
    );
    const hasLiquidation = traces.some((trace) =>
      trace.function.toLowerCase().includes("liquidate"),
    );

    if (hasFlashLoan && hasLiquidation) {
      return {
        type: "flash_loan_liquidation",
        confidence: 0.9,
        description: "Flash loan liquidation strategy detected",
        severity: "high",
        evidence: {
          hasFlashLoan,
          hasLiquidation,
        },
      };
    }
    return null;
  }

  private static detectBlockSandwichAttacks(
    transactions: TraceAnalysisResults[],
  ): BlockMevPattern[] {
    return [];
  }

  private static detectArbitrageChains(
    transactions: TraceAnalysisResults[],
  ): BlockMevPattern[] {
    return [];
  }

  private static detectMevBotActivity(
    transactions: TraceAnalysisResults[],
  ): BlockMevPattern[] {
    return [];
  }

  private static analyzeTransactionCorrelations(
    transactions: TraceAnalysisResults[],
  ): TransactionCorrelation[] {
    return [];
  }

  private static calculateMevScore(
    indicators: AdvancedMevIndicator[],
    patterns: MevPattern[],
  ): number {
    const indicatorScore =
      indicators.reduce((sum, indicator) => sum + indicator.confidence, 0) /
      Math.max(indicators.length, 1);

    const patternScore =
      patterns.reduce((sum, pattern) => sum + pattern.confidence, 0) /
      Math.max(patterns.length, 1);

    return (indicatorScore + patternScore) / 2;
  }

  private static calculateRiskLevel(
    score: number,
    patterns: MevPattern[],
  ): "low" | "medium" | "high" | "critical" {
    const hasHighSeverity = patterns.some((p) => p.severity === "high");

    if (score > 0.8 || hasHighSeverity) return "critical";
    if (score > 0.6) return "high";
    if (score > 0.3) return "medium";
    return "low";
  }

  private static calculatePatternConfidence(
    indicators: AdvancedMevIndicator[],
  ): number {
    return (
      indicators.reduce((sum, indicator) => sum + indicator.confidence, 0) /
      Math.max(indicators.length, 1)
    );
  }

  private static estimateExtractedValue(
    dexInteractions: ProcessedTraceAction[],
  ): number {
    return dexInteractions.reduce((sum, trace) => sum + trace.valueEth, 0);
  }

  private static estimateArbitrageValue(
    dexInteractions: ProcessedTraceAction[],
  ): number {
    return (
      dexInteractions.reduce((sum, trace) => sum + trace.valueEth, 0) * 0.1
    );
  }

  private static estimateFrontRunningValue(
    traces: ProcessedTraceAction[],
  ): number {
    return traces.reduce((sum, trace) => sum + trace.valueEth, 0) * 0.05;
  }

  private static estimateLiquidationValue(
    liquidationCalls: ProcessedTraceAction[],
  ): number {
    return (
      liquidationCalls.reduce((sum, trace) => sum + trace.valueEth, 0) * 0.15
    );
  }

  private static calculateMevExtraction(patterns: BlockMevPattern[]): number {
    return patterns.reduce(
      (sum, pattern) => sum + (pattern.extractedValue || 0),
      0,
    );
  }

  private static generateMevRecommendations(
    patterns: MevPattern[],
    indicators: AdvancedMevIndicator[],
  ): string[] {
    const recommendations: string[] = [];

    if (patterns.some((p) => p.type === "sandwich_attack")) {
      recommendations.push(
        "Consider using private mempools to avoid sandwich attacks",
      );
      recommendations.push(
        "Implement slippage protection in your transactions",
      );
    }

    if (patterns.some((p) => p.type === "front_running")) {
      recommendations.push(
        "Use commit-reveal schemes for sensitive transactions",
      );
      recommendations.push(
        "Consider using flashbots or similar MEV protection services",
      );
    }

    if (patterns.some((p) => p.type === "arbitrage")) {
      recommendations.push(
        "Monitor for arbitrage opportunities in your protocol",
      );
      recommendations.push("Consider implementing dynamic fees to capture MEV");
    }

    if (indicators.some((i) => i.type === "high_gas_price")) {
      recommendations.push("Optimize gas usage to reduce MEV extraction costs");
    }

    return recommendations;
  }

  private static generateBlockRecommendations(
    patterns: BlockMevPattern[],
  ): string[] {
    const recommendations: string[] = [];

    if (patterns.length > 0) {
      recommendations.push("High MEV activity detected in this block");
      recommendations.push(
        "Consider using MEV protection services for future transactions",
      );
    }

    return recommendations;
  }
}

interface AdvancedMevAnalysis {
  mevDetected: boolean;
  mevScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  patterns: MevPattern[];
  indicators: AdvancedMevIndicator[];
  recommendations: string[];
  blockAnalysis: BlockMevAnalysis | null;
}

interface MevPattern {
  type: "sandwich_attack" | "arbitrage" | "front_running" | "liquidation_mev";
  confidence: number;
  description: string;
  severity: "low" | "medium" | "high";
  extractedValue: number;
}

interface AdvancedMevIndicator {
  type: string;
  confidence: number;
  description: string;
  severity: "low" | "medium" | "high";
  evidence: Record<string, any>;
}

interface MevDetectionResult {
  detected: boolean;
  indicators: AdvancedMevIndicator[];
  pattern: MevPattern | null;
}

interface BlockMevAnalysis {
  totalTransactions: number;
  mevTransactions: number;
  blockPatterns: BlockMevPattern[];
  correlations: TransactionCorrelation[];
  mevExtraction: number;
  recommendations: string[];
}

interface BlockMevPattern {
  type: string;
  transactions: string[];
  extractedValue?: number;
  description: string;
}

interface TransactionCorrelation {
  transaction1: string;
  transaction2: string;
  correlationType: string;
  confidence: number;
}
