import { ReplayApi } from "./api";
import {
  ReplayDataProcessor,
  StateDiffProcessor,
  TraceProcessor,
} from "./processors";
import type {
  PerformanceMetrics,
  ProcessedBlockReplayData,
  ProcessedReplayData,
  ReplayBlockRequest,
  ReplayTracer,
  ReplayTransactionRequest,
  SecurityFlag,
  TokenAnalysis,
} from "./types";
import { REPLAY_CONFIG } from "./constants";

export class ReplayService {
  static async analyzeTransaction(
    txHash: string,
    tracers: ReplayTracer[] = REPLAY_CONFIG.defaultTracers,
    network: string = "mainnet",
  ): Promise<ProcessedReplayData> {
    const request: ReplayTransactionRequest = {
      txHash,
      tracers,
      network,
    };

    const replayResult = await ReplayApi.replayTransactionWithRetry(request);

    const processedData = ReplayDataProcessor.processReplayResult(
      replayResult,
      txHash,
      network,
    );

    return processedData;
  }

  static async analyzeBlock(
    blockIdentifier: string | number,
    tracers: ReplayTracer[] = REPLAY_CONFIG.defaultTracers,
    network: string = "mainnet",
    options?: {
      onProgress?: (progress: {
        completed: number;
        total: number;
        message: string;
      }) => void;
      abortSignal?: AbortSignal;
    },
  ): Promise<ProcessedBlockReplayData> {
    const request: ReplayBlockRequest = {
      blockIdentifier: blockIdentifier.toString(),
      tracers,
      network,
    };

    const replayResults = await ReplayApi.replayBlockTransactionsWithRetry(
      request,
      REPLAY_CONFIG.maxRetries,
      {
        onProgress: (progress) => {
          options?.onProgress?.({
            ...progress,
            message: `Block replay: ${progress.message}`,
          });
        },
        abortSignal: options?.abortSignal,
      },
    );

    const blockData: ProcessedBlockReplayData = {
      blockIdentifier: blockIdentifier.toString(),
      network,
      timestamp: Date.now(),
      tracersUsed: tracers,
      transactionCount: Object.keys(replayResults).length,
      totalGasUsed: 0,
      totalStateChanges: 0,
      totalTokenTransfers: 0,
      totalTokenVolume: 0,
      transactionSummaries: [],
      blockSecurityFlags: [],
      blockTokenAnalysis: {
        tokenTransactionCount: 0,
        tokenTransactionPercentage: 0,
        totalTokenVolume: 0,
        uniqueTokens: [],
        topTokensByVolume: [],
        topHoldersByActivity: [],
      },
      blockPerformanceMetrics: {
        averageGasPerTx: 0,
        gasEfficiencyScore: 0,
        optimizationOpportunities: 0,
        performanceFlags: [],
      },
      activityHeatmap: [],
      volumeDistribution: [],
      stateChangeDistribution: [],
    };

    const tokenAddresses = new Set<string>();
    let totalTokenVolume = 0;
    let tokenTransactionCount = 0;

    for (const [txIndexStr, txReplayResult] of Object.entries(replayResults)) {
      const txIndex = parseInt(txIndexStr);
      const txHash = `tx_${txIndex}`;

      let txGasUsed = 0;
      let txStateChanges = 0;
      let txTokenTransfers = 0;
      let txTokenVolume = 0;
      const txSecurityFlags: SecurityFlag[] = [];

      if (txReplayResult.trace && tracers.includes("trace")) {
        const traceAnalysis = TraceProcessor.processTrace(
          txReplayResult.trace,
          txHash,
        );
        txGasUsed = traceAnalysis.totalGasUsed;

        traceAnalysis.contractInteractions.forEach((interaction) => {
          if (interaction.isToken) {
            tokenAddresses.add(interaction.address);
            tokenTransactionCount++;
          }
        });
      }

      if (txReplayResult.stateDiff && tracers.includes("stateDiff")) {
        const stateDiffAnalysis = StateDiffProcessor.processStateDiff(
          txReplayResult.stateDiff,
          txHash,
        );
        txStateChanges = stateDiffAnalysis.totalChanges;

        stateDiffAnalysis.tokenStateChanges.forEach((change) => {
          tokenAddresses.add(change.tokenAddress);
          if (
            change.changeType === "balance" ||
            change.changeType === "supply"
          ) {
            const volume = Math.abs(parseFloat(change.formattedChange));
            txTokenVolume += volume;
            totalTokenVolume += volume;
          }
        });
      }

      blockData.transactionSummaries.push({
        txIndex,
        txHash,
        hasTokenInteraction: txTokenTransfers > 0 || tokenAddresses.size > 0,
        tokenTransfers: txTokenTransfers,
        tokenVolume: txTokenVolume,
        stateChanges: txStateChanges,
        gasUsed: txGasUsed,
        securityFlags: txSecurityFlags,
        status: txSecurityFlags.some((f) => f.level === "critical")
          ? "failed"
          : "success",
      });

      blockData.totalGasUsed += txGasUsed;
      blockData.totalStateChanges += txStateChanges;
      blockData.totalTokenTransfers += txTokenTransfers;

      blockData.activityHeatmap.push({
        txIndex,
        stateChanges: txStateChanges,
        tokenVolume: txTokenVolume,
        gasUsed: txGasUsed,
        intensity: this.calculateIntensity(
          txStateChanges,
          txTokenVolume,
          txGasUsed,
        ),
      });

      if (txTokenVolume > 0) {
        blockData.volumeDistribution.push({
          txIndex,
          tokenVolume: txTokenVolume,
          transferCount: txTokenTransfers,
          gasUsed: txGasUsed,
        });
      }
    }

    blockData.totalTokenVolume = totalTokenVolume;
    blockData.blockTokenAnalysis.tokenTransactionCount = tokenTransactionCount;
    blockData.blockTokenAnalysis.tokenTransactionPercentage =
      (tokenTransactionCount / blockData.transactionCount) * 100;
    blockData.blockTokenAnalysis.totalTokenVolume = totalTokenVolume;
    blockData.blockTokenAnalysis.uniqueTokens = Array.from(tokenAddresses);

    blockData.blockPerformanceMetrics.averageGasPerTx =
      blockData.totalGasUsed / blockData.transactionCount;
    blockData.blockPerformanceMetrics.gasEfficiencyScore =
      this.calculateBlockGasEfficiency(blockData);

    blockData.stateChangeDistribution =
      this.generateStateChangeDistribution(blockData);

    return blockData;
  }

  private static performSecurityAnalysis(
    data: ProcessedReplayData,
  ): SecurityFlag[] {
    const flags: SecurityFlag[] = [];

    if (data.traceAnalysis) {
    }

    if (data.stateDiffAnalysis) {
    }

    if (data.traceAnalysis && data.stateDiffAnalysis) {
      const traceTokenInteractions =
        data.traceAnalysis.contractInteractions.filter((c) => c.isToken).length;
      const stateDiffTokenChanges =
        data.stateDiffAnalysis.tokenStateChanges.length;

      if (traceTokenInteractions > 0 && stateDiffTokenChanges === 0) {
        flags.push({
          level: "warning",
          type: "suspicious_pattern",
          description:
            "Token interactions detected in trace but no token state changes",
          details: {
            traceInteractions: traceTokenInteractions,
            stateDiffChanges: stateDiffTokenChanges,
          },
          txHash: data.transactionHash,
        });
      }
    }

    return flags;
  }

  private static generateTokenAnalysis(
    data: ProcessedReplayData,
  ): TokenAnalysis {
    const tokenAnalysis: TokenAnalysis = {
      hasTokenInteraction: false,
      tokenTransfers: [],
      balanceChanges: [],
      supplyChanges: [],
      allowanceChanges: [],
      totalVolume: 0,
      uniqueAddresses: [],
    };

    if (data.traceAnalysis) {
      const tokenInteractions = data.traceAnalysis.contractInteractions.filter(
        (c) => c.isToken,
      );
      tokenAnalysis.hasTokenInteraction = tokenInteractions.length > 0;

      tokenInteractions.forEach((interaction) => {
        if (!tokenAnalysis.uniqueAddresses.includes(interaction.address)) {
          tokenAnalysis.uniqueAddresses.push(interaction.address);
        }
      });
    }

    if (data.stateDiffAnalysis) {
      data.stateDiffAnalysis.tokenStateChanges.forEach((change) => {
        if (!tokenAnalysis.uniqueAddresses.includes(change.tokenAddress)) {
          tokenAnalysis.uniqueAddresses.push(change.tokenAddress);
        }

        const volume = Math.abs(parseFloat(change.formattedChange));
        tokenAnalysis.totalVolume += volume;

        if (change.changeType === "supply") {
          tokenAnalysis.supplyChanges.push({
            tokenAddress: change.tokenAddress,
            tokenSymbol: change.tokenSymbol,
            fromSupply: BigInt(change.fromValue),
            toSupply: BigInt(change.toValue),
            change: BigInt(change.change),
            formattedChange: parseFloat(change.formattedChange),
            changeType: volume > 0 ? "mint" : "burn",
          });
        }
      });
    }

    return tokenAnalysis;
  }

  private static calculatePerformanceMetrics(
    data: ProcessedReplayData,
  ): PerformanceMetrics {
    let gasEfficiency = 50;

    if (data.traceAnalysis) {
      const errorRate =
        data.traceAnalysis.errorCount / data.traceAnalysis.totalCalls;
      gasEfficiency -= errorRate * 30;

      if (data.traceAnalysis.maxDepth > 10) {
        gasEfficiency -= 10;
      }
    }

    if (data.vmTraceAnalysis) {
      const storageOpsRatio =
        data.vmTraceAnalysis.storageOperations /
        data.vmTraceAnalysis.totalSteps;
      if (storageOpsRatio > 0.2) {
        gasEfficiency -= 15;
      }
    }

    gasEfficiency = Math.max(0, Math.min(100, gasEfficiency));

    return {
      gasEfficiency,
      optimizationSuggestions:
        data.performanceMetrics?.optimizationSuggestions || [],
      gasBreakdown: this.generateGasBreakdown(data),
      costAnalysis: data.performanceMetrics?.costAnalysis || {
        totalGasUsed: 0,
        gasPrice: BigInt(0),
        totalCostWei: BigInt(0),
        totalCostEth: 0,
        totalCostUSD: 0,
        breakdown: { execution: 0, storage: 0, transfer: 0, other: 0 },
      },
    };
  }

  private static generateGasBreakdown(data: ProcessedReplayData): Array<{
    category: string;
    gasUsed: number;
    percentage: number;
    description: string;
  }> {
    const breakdown = [];
    const totalGas = data.performanceMetrics?.costAnalysis.totalGasUsed || 0;

    if (totalGas === 0) return breakdown;

    if (data.vmTraceAnalysis) {
      const storageGas = data.vmTraceAnalysis.storageOperations * 5000;
      const memoryGas = data.vmTraceAnalysis.memoryOperations * 100;
      const computationGas = totalGas - storageGas - memoryGas;

      breakdown.push(
        {
          category: "Storage Operations",
          gasUsed: storageGas,
          percentage: (storageGas / totalGas) * 100,
          description: "Gas used for storage reads and writes",
        },
        {
          category: "Memory Operations",
          gasUsed: memoryGas,
          percentage: (memoryGas / totalGas) * 100,
          description: "Gas used for memory operations",
        },
        {
          category: "Computation",
          gasUsed: computationGas,
          percentage: (computationGas / totalGas) * 100,
          description: "Gas used for computation and logic",
        },
      );
    } else {
      breakdown.push({
        category: "Transaction Execution",
        gasUsed: totalGas,
        percentage: 100,
        description: "Total gas used for transaction execution",
      });
    }

    return breakdown;
  }

  private static calculateIntensity(
    stateChanges: number,
    tokenVolume: number,
    gasUsed: number,
  ): number {
    const stateIntensity = Math.min(stateChanges / 50, 1);
    const volumeIntensity = Math.min(tokenVolume / 1000000, 1);
    const gasIntensity = Math.min(gasUsed / 500000, 1);

    return (stateIntensity + volumeIntensity + gasIntensity) / 3;
  }

  private static calculateBlockGasEfficiency(
    data: ProcessedBlockReplayData,
  ): number {
    const avgGas = data.blockPerformanceMetrics.averageGasPerTx;
    const failedTxs = data.transactionSummaries.filter(
      (tx) => tx.status === "failed",
    ).length;
    const failureRate = failedTxs / data.transactionCount;

    let efficiency = 70;

    if (avgGas < 100000) efficiency += 20;
    else if (avgGas > 500000) efficiency -= 20;

    efficiency -= failureRate * 30;

    return Math.max(0, Math.min(100, efficiency));
  }

  private static generateStateChangeDistribution(
    data: ProcessedBlockReplayData,
  ): Array<{ changeType: string; count: number; percentage: number }> {
    const distribution = new Map<string, number>();

    data.transactionSummaries.forEach((tx) => {
      if (tx.stateChanges > 0) {
        const category =
          tx.stateChanges < 5
            ? "Low"
            : tx.stateChanges < 20
              ? "Medium"
              : "High";
        distribution.set(category, (distribution.get(category) || 0) + 1);
      }
    });

    const total = Array.from(distribution.values()).reduce(
      (sum, count) => sum + count,
      0,
    );

    return Array.from(distribution.entries()).map(([changeType, count]) => ({
      changeType,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    }));
  }
}
