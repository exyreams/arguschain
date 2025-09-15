import { BlockTraceService } from "./blockTraceService";
import { BlockTraceProcessor } from "../processors/blockTraceProcessor";
import { TransactionCategorizer } from "../processors/transactionCategorizer";
import { GasAnalyzer } from "../processors/gasAnalyzer";
import { TokenFlowAnalyzer } from "../processors/tokenFlowAnalyzer";
import { ExportManager } from "../export/exportManager";
import { BlockTraceCache } from "../cache/blockTraceCache";
import {
  calculateExecutionTime,
  generateCacheKey,
  formatDuration,
} from "../utils";
import { CACHE_CONFIG, PERFORMANCE_THRESHOLDS } from "../constants";
import type {
  BlockAnalysis,
  PerformanceMetrics,
  ProcessingStep,
  NetworkType,
  ExportFormat,
  ExportData,
  CacheConfig,
} from "../types";

export interface AnalysisProgress {
  stage:
    | "fetching"
    | "categorizing"
    | "analyzing_gas"
    | "analyzing_flows"
    | "finalizing"
    | "complete"
    | "error";
  progress: number;
  message: string;
  executionTime: number;
  error?: string;
}

export class BlockTraceOrchestrator {
  private blockTraceService: BlockTraceService;
  private blockTraceProcessor: BlockTraceProcessor;
  private transactionCategorizer: TransactionCategorizer;
  private gasAnalyzer: GasAnalyzer;
  private tokenFlowAnalyzer: TokenFlowAnalyzer;
  private exportManager: ExportManager;
  private cache: BlockTraceCache;

  constructor(
    network: NetworkType = "mainnet",
    cacheConfig?: Partial<CacheConfig>
  ) {
    this.blockTraceService = new BlockTraceService();
    this.blockTraceProcessor = new BlockTraceProcessor();
    this.transactionCategorizer = new TransactionCategorizer(network);
    this.gasAnalyzer = new GasAnalyzer(network);
    this.tokenFlowAnalyzer = new TokenFlowAnalyzer(network);
    this.exportManager = new ExportManager();
    this.cache = new BlockTraceCache({
      ...CACHE_CONFIG,
      ...cacheConfig,
    });
  }

  /**
   * Main orchestration method for complete block analysis
   */
  async analyzeBlock(
    blockIdentifier: string | number,
    onProgress?: (progress: AnalysisProgress) => void
  ): Promise<BlockAnalysis> {
    const startTime = Date.now();
    let currentStage: AnalysisProgress["stage"] = "fetching";

    const updateProgress = (
      stage: AnalysisProgress["stage"],
      progress: number,
      message: string,
      error?: string
    ) => {
      currentStage = stage;
      const progressData: AnalysisProgress = {
        stage,
        progress,
        message,
        executionTime: calculateExecutionTime(startTime),
        error,
      };

      console.log(`[${stage.toUpperCase()}] ${message} (${progress}%)`);
      onProgress?.(progressData);
    };

    try {
      // Check cache first
      const cacheKey = generateCacheKey(
        "full_analysis",
        String(blockIdentifier)
      );
      const cachedResult = await this.cache.get(cacheKey);

      if (cachedResult) {
        updateProgress("complete", 100, "Using cached analysis results");
        return cachedResult;
      }

      // Stage 1: Fetch block trace data (0-20%)
      updateProgress("fetching", 0, "Fetching block trace data...");

      const traceResult = await this.blockTraceService.traceBlock(
        blockIdentifier,
        "mainnet",
        {
          useCache: true,
          trackPerformance: true,
        }
      );

      updateProgress(
        "fetching",
        20,
        `Retrieved ${traceResult.blockAnalysis.totalTraces} traces`
      );

      // Stage 2: Process and categorize transactions (20-40%)
      updateProgress("categorizing", 25, "Processing trace data...");

      const processedTraces = await this.blockTraceProcessor.processTraces(
        (traceResult.blockAnalysis as any).rawTraces || []
      );

      updateProgress("categorizing", 35, "Categorizing transactions...");

      const categorizedTransactions =
        await this.transactionCategorizer.categorizeTransactions(
          processedTraces
        );

      updateProgress(
        "categorizing",
        40,
        `Categorized ${categorizedTransactions.length} transactions`
      );

      // Stage 3: Analyze gas usage (40-60%)
      updateProgress("analyzing_gas", 45, "Analyzing gas usage patterns...");

      const gasAnalysis = await this.gasAnalyzer.analyzeGasDistribution(
        processedTraces,
        new Map(categorizedTransactions.map((tx) => [tx.id, tx.category]))
      );

      updateProgress("analyzing_gas", 60, "Gas analysis completed");

      // Stage 4: Analyze token flows (60-80%)
      updateProgress("analyzing_flows", 65, "Analyzing PYUSD token flows...");

      const tokenFlowAnalysis = await this.tokenFlowAnalyzer.analyzePYUSDFlow(
        processedTraces,
        new Map(
          categorizedTransactions
            .filter((tx) => tx.pyusdDetails)
            .map((tx) => [tx.transactionHash, tx.pyusdDetails!])
        )
      );

      updateProgress("analyzing_flows", 80, "Token flow analysis completed");

      // Stage 5: Compile final results (80-100%)
      updateProgress("finalizing", 85, "Compiling analysis results...");

      const finalAnalysis = this.compileAnalysisResults({
        traceResult,
        categorizedTransactions,
        gasAnalysis,
        tokenFlowAnalysis,
        executionTime: calculateExecutionTime(startTime),
      });

      updateProgress("finalizing", 95, "Caching results...");

      // Cache the complete analysis
      await this.cache.set(cacheKey, finalAnalysis, CACHE_CONFIG.ANALYSIS_TTL);

      updateProgress(
        "complete",
        100,
        `Analysis completed in ${formatDuration(calculateExecutionTime(startTime))}`
      );

      return finalAnalysis;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      updateProgress(
        "error",
        0,
        `Analysis failed: ${errorMessage}`,
        errorMessage
      );
      throw error;
    }
  }

  /**
   * Analyze multiple blocks in batch
   */
  async analyzeBlocks(
    blockIdentifiers: (string | number)[],
    onProgress?: (blockIndex: number, progress: AnalysisProgress) => void
  ): Promise<BlockAnalysis[]> {
    const results: BlockAnalysis[] = [];

    for (let i = 0; i < blockIdentifiers.length; i++) {
      const blockId = blockIdentifiers[i];

      try {
        const result = await this.analyzeBlock(blockId, (progress) => {
          onProgress?.(i, progress);
        });

        results.push(result);
      } catch (error) {
        console.error(`Failed to analyze block ${blockId}:`, error);
        // Continue with other blocks
      }
    }

    return results;
  }

  /**
   * Export analysis results in various formats
   */
  async exportAnalysis(
    analysis: BlockAnalysis,
    format: ExportFormat,
    filename?: string
  ): Promise<string> {
    const exportData: ExportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        blockNumber: analysis.blockNumber,
        blockHash: analysis.blockHash,
        network: "mainnet", // TODO: Make this dynamic
        analysisVersion: "1.0.0",
        exportFormat: format,
      },
      blockAnalysis: analysis,
      performanceMetrics: analysis.performanceMetrics,
    };

    return await this.exportManager.exportData(exportData, format, filename);
  }

  /**
   * Compare multiple blocks
   */
  async compareBlocks(results: BlockAnalysis[]): Promise<{
    comparison: any;
    insights: string[];
    recommendations: string[];
  }> {
    if (results.length < 2) {
      throw new Error("At least 2 blocks are required for comparison");
    }

    // Calculate comparison metrics
    const comparison = {
      blocks: results.map((result) => ({
        blockNumber: result.blockNumber,
        totalTransactions: result.totalTransactions,
        totalGasUsed: Number(result.totalGasUsed),
        successRate: result.summary.successRate,
        pyusdTransactions: result.summary.pyusdTransactions,
        executionTime: result.performanceMetrics.executionTime,
      })),
      averages: {
        transactionCount:
          results.reduce((sum, r) => sum + r.totalTransactions, 0) /
          results.length,
        gasUsed:
          results.reduce((sum, r) => sum + Number(r.totalGasUsed), 0) /
          results.length,
        successRate:
          results.reduce((sum, r) => sum + r.summary.successRate, 0) /
          results.length,
        pyusdActivity:
          results.reduce((sum, r) => sum + r.summary.pyusdTransactions, 0) /
          results.length,
      },
    };

    // Generate insights
    const insights = this.generateComparisonInsights(results);
    const recommendations = this.generateComparisonRecommendations(results);

    return {
      comparison,
      insights,
      recommendations,
    };
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    cacheStats: any;
    performanceHistory: PerformanceMetrics[];
    memoryUsage: number;
  } {
    return {
      cacheStats: this.cache.getStats(),
      performanceHistory: this.blockTraceService.getPerformanceHistory(),
      memoryUsage: this.getMemoryUsage(),
    };
  }

  /**
   * Clear all caches
   */
  async clearCache(): Promise<void> {
    this.blockTraceService.clearCache();
    await this.cache.clear();
  }

  /**
   * Initialize the orchestrator
   */
  async initialize(): Promise<void> {
    await this.cache.initialize();
    console.log("BlockTraceOrchestrator initialized successfully");
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    await this.cache.destroy();
    console.log("BlockTraceOrchestrator destroyed");
  }

  /**
   * Private helper methods
   */
  private compileAnalysisResults(data: {
    traceResult: {
      blockAnalysis: BlockAnalysis;
      performanceMetrics: PerformanceMetrics;
    };
    categorizedTransactions: any[];
    gasAnalysis: any;
    tokenFlowAnalysis: any;
    executionTime: number;
  }): BlockAnalysis {
    const {
      traceResult,
      categorizedTransactions,
      gasAnalysis,
      tokenFlowAnalysis,
    } = data;
    const { blockAnalysis } = traceResult;

    // Update block analysis with processed data
    const updatedAnalysis: BlockAnalysis = {
      ...blockAnalysis,
      traces: categorizedTransactions,
      gasAnalysis,
      tokenFlowAnalysis,
      summary: {
        ...blockAnalysis.summary,
        successRate: this.calculateSuccessRate(categorizedTransactions),
        pyusdTransactions: categorizedTransactions.filter(
          (tx) => tx.pyusdDetails
        ).length,
        pyusdPercentage: this.calculatePYUSDPercentage(categorizedTransactions),
        totalValue: this.calculateTotalValue(categorizedTransactions),
        averageGasPerTx: this.calculateAverageGasPerTx(categorizedTransactions),
      },
      performanceMetrics: {
        ...traceResult.performanceMetrics,
        executionTime: data.executionTime,
      },
    };

    return updatedAnalysis;
  }

  private calculateSuccessRate(transactions: any[]): number {
    if (transactions.length === 0) return 0;
    const successful = transactions.filter((tx) => tx.success).length;
    return (successful / transactions.length) * 100;
  }

  private calculatePYUSDPercentage(transactions: any[]): number {
    if (transactions.length === 0) return 0;
    const pyusdTxs = transactions.filter((tx) => tx.pyusdDetails).length;
    return (pyusdTxs / transactions.length) * 100;
  }

  private calculateTotalValue(transactions: any[]): string {
    const totalValue = transactions.reduce((sum, tx) => sum + tx.valueEth, 0);
    return totalValue.toFixed(6);
  }

  private calculateAverageGasPerTx(transactions: any[]): string {
    if (transactions.length === 0) return "0";
    const totalGas = transactions.reduce(
      (sum, tx) => sum + Number(tx.gasUsed),
      0
    );
    return Math.round(totalGas / transactions.length).toString();
  }

  private generateComparisonInsights(results: BlockAnalysis[]): string[] {
    const insights: string[] = [];

    // Transaction volume insights
    const txCounts = results.map((r) => r.totalTransactions);
    const maxTx = Math.max(...txCounts);
    const minTx = Math.min(...txCounts);

    if (maxTx > minTx * 2) {
      insights.push(
        `Transaction volume varies significantly (${minTx} to ${maxTx} transactions)`
      );
    }

    // Gas usage insights
    const gasUsages = results.map((r) => Number(r.totalGasUsed));
    const avgGas = gasUsages.reduce((a, b) => a + b, 0) / gasUsages.length;
    const highGasBlocks = gasUsages.filter((g) => g > avgGas * 1.5).length;

    if (highGasBlocks > 0) {
      insights.push(`${highGasBlocks} blocks show unusually high gas usage`);
    }

    // PYUSD activity insights
    const pyusdCounts = results.map((r) => r.summary.pyusdTransactions);
    const totalPyusd = pyusdCounts.reduce((a, b) => a + b, 0);

    if (totalPyusd > 0) {
      insights.push(
        `PYUSD activity detected in ${pyusdCounts.filter((c) => c > 0).length} blocks`
      );
    }

    return insights;
  }

  private generateComparisonRecommendations(
    results: BlockAnalysis[]
  ): string[] {
    const recommendations: string[] = [];

    // Performance recommendations
    const executionTimes = results.map(
      (r) => r.performanceMetrics.executionTime
    );
    const avgExecutionTime =
      executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;

    if (avgExecutionTime > PERFORMANCE_THRESHOLDS.SLOW_EXECUTION) {
      recommendations.push(
        "Consider using caching to improve analysis performance"
      );
    }

    // Gas efficiency recommendations
    const successRates = results.map((r) => r.summary.successRate);
    const avgSuccessRate =
      successRates.reduce((a, b) => a + b, 0) / successRates.length;

    if (avgSuccessRate < 95) {
      recommendations.push(
        "High failure rate detected - investigate failed transactions"
      );
    }

    return recommendations;
  }

  private getMemoryUsage(): number {
    if (typeof performance !== "undefined" && performance.memory) {
      return performance.memory.usedJSHeapSize;
    }
    return 0;
  }
}
