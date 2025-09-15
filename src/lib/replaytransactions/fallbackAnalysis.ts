import { replayDataCache } from "./memoizationStrategies";

interface CostEstimate {
  gasEstimate: number;
  timeEstimate: number;
  rpcCalls: number;
  costLevel: "low" | "medium" | "high" | "very-high";
  alternatives: string[];
}

interface AnalysisMethod {
  id: string;
  name: string;
  description: string;
  cost: CostEstimate;
  reliability: number;
  dataRequirements: string[];
  fallbackFor: string[];
}

interface FallbackResult {
  method: string;
  data: any;
  confidence: number;
  limitations: string[];
  suggestedUpgrade?: string;
  cached: boolean;
}

class AnalysisMethodRegistry {
  private static methods: Map<string, AnalysisMethod> = new Map([
    [
      "trace_replayTransaction",
      {
        id: "trace_replayTransaction",
        name: "Full Transaction Replay",
        description: "Complete transaction replay with all tracers",
        cost: {
          gasEstimate: 0,
          timeEstimate: 5000,
          rpcCalls: 1,
          costLevel: "very-high",
          alternatives: ["receipt_analysis", "log_analysis", "basic_trace"],
        },
        reliability: 0.95,
        dataRequirements: ["transaction_hash", "block_number"],
        fallbackFor: [],
      },
    ],

    [
      "trace_replayBlockTransactions",
      {
        id: "trace_replayBlockTransactions",
        name: "Block Transaction Replay",
        description: "Replay all transactions in a block",
        cost: {
          gasEstimate: 0,
          timeEstimate: 30000,
          rpcCalls: 1,
          costLevel: "very-high",
          alternatives: ["block_analysis", "receipt_batch_analysis"],
        },
        reliability: 0.95,
        dataRequirements: ["block_number"],
        fallbackFor: [],
      },
    ],

    [
      "debug_traceTransaction",
      {
        id: "debug_traceTransaction",
        name: "Debug Trace",
        description: "Transaction trace without state diff",
        cost: {
          gasEstimate: 0,
          timeEstimate: 2000,
          rpcCalls: 1,
          costLevel: "high",
          alternatives: ["receipt_analysis", "log_analysis"],
        },
        reliability: 0.85,
        dataRequirements: ["transaction_hash"],
        fallbackFor: ["trace_replayTransaction"],
      },
    ],

    [
      "basic_trace",
      {
        id: "basic_trace",
        name: "Basic Call Trace",
        description: "Simple call trace without opcode details",
        cost: {
          gasEstimate: 0,
          timeEstimate: 1000,
          rpcCalls: 1,
          costLevel: "medium",
          alternatives: ["receipt_analysis", "log_analysis"],
        },
        reliability: 0.75,
        dataRequirements: ["transaction_hash"],
        fallbackFor: ["trace_replayTransaction", "debug_traceTransaction"],
      },
    ],

    [
      "receipt_analysis",
      {
        id: "receipt_analysis",
        name: "Receipt Analysis",
        description: "Analysis based on transaction receipt and logs",
        cost: {
          gasEstimate: 0,
          timeEstimate: 100,
          rpcCalls: 1,
          costLevel: "low",
          alternatives: ["log_analysis", "basic_info"],
        },
        reliability: 0.6,
        dataRequirements: ["transaction_hash"],
        fallbackFor: [
          "trace_replayTransaction",
          "debug_traceTransaction",
          "basic_trace",
        ],
      },
    ],

    [
      "log_analysis",
      {
        id: "log_analysis",
        name: "Event Log Analysis",
        description: "Analysis based on emitted events only",
        cost: {
          gasEstimate: 0,
          timeEstimate: 50,
          rpcCalls: 1,
          costLevel: "low",
          alternatives: ["basic_info"],
        },
        reliability: 0.45,
        dataRequirements: ["transaction_hash"],
        fallbackFor: [
          "trace_replayTransaction",
          "debug_traceTransaction",
          "receipt_analysis",
        ],
      },
    ],

    [
      "basic_info",
      {
        id: "basic_info",
        name: "Basic Transaction Info",
        description: "Basic transaction information without detailed analysis",
        cost: {
          gasEstimate: 0,
          timeEstimate: 20,
          rpcCalls: 1,
          costLevel: "low",
          alternatives: [],
        },
        reliability: 0.3,
        dataRequirements: ["transaction_hash"],
        fallbackFor: [
          "trace_replayTransaction",
          "debug_traceTransaction",
          "receipt_analysis",
          "log_analysis",
        ],
      },
    ],

    [
      "block_analysis",
      {
        id: "block_analysis",
        name: "Block Header Analysis",
        description:
          "Analysis based on block header and basic transaction info",
        cost: {
          gasEstimate: 0,
          timeEstimate: 200,
          rpcCalls: 2,
          costLevel: "low",
          alternatives: ["receipt_batch_analysis"],
        },
        reliability: 0.5,
        dataRequirements: ["block_number"],
        fallbackFor: ["trace_replayBlockTransactions"],
      },
    ],

    [
      "receipt_batch_analysis",
      {
        id: "receipt_batch_analysis",
        name: "Batch Receipt Analysis",
        description: "Analysis of all transaction receipts in a block",
        cost: {
          gasEstimate: 0,
          timeEstimate: 500,
          rpcCalls: 10,
          costLevel: "medium",
          alternatives: ["block_analysis"],
        },
        reliability: 0.65,
        dataRequirements: ["block_number"],
        fallbackFor: ["trace_replayBlockTransactions"],
      },
    ],
  ]);

  static getMethod(id: string): AnalysisMethod | undefined {
    return this.methods.get(id);
  }

  static getFallbackMethods(primaryMethodId: string): AnalysisMethod[] {
    const fallbacks: AnalysisMethod[] = [];

    this.methods.forEach((method) => {
      if (method.fallbackFor.includes(primaryMethodId)) {
        fallbacks.push(method);
      }
    });

    return fallbacks.sort((a, b) => {
      if (a.reliability !== b.reliability) {
        return b.reliability - a.reliability;
      }
      const costOrder = { low: 1, medium: 2, high: 3, "very-high": 4 };
      return costOrder[a.cost.costLevel] - costOrder[b.cost.costLevel];
    });
  }

  static getAllMethods(): AnalysisMethod[] {
    return Array.from(this.methods.values());
  }
}

export class FallbackAnalysisEngine {
  private static costThresholds = {
    time: 10000,
    rpcCalls: 5,
    userPreference: "medium" as "low" | "medium" | "high" | "very-high",
  };

  static setCostThresholds(thresholds: Partial<typeof this.costThresholds>) {
    this.costThresholds = { ...this.costThresholds, ...thresholds };
  }

  static async analyzeTransaction(
    transactionHash: string,
    options: {
      preferredMethod?: string;
      maxCost?: "low" | "medium" | "high" | "very-high";
      useCache?: boolean;
      blockNumber?: number;
    } = {},
  ): Promise<FallbackResult> {
    const {
      preferredMethod = "trace_replayTransaction",
      maxCost = this.costThresholds.userPreference,
      useCache = true,
      blockNumber,
    } = options;

    if (useCache) {
      const cacheKey = `tx_analysis_${transactionHash}_${preferredMethod}`;
      const cached = replayDataCache.get(cacheKey);
      if (cached) {
        return {
          method: preferredMethod,
          data: cached,
          confidence: 0.95,
          limitations: [],
          cached: true,
        };
      }
    }

    const preferredMethodConfig =
      AnalysisMethodRegistry.getMethod(preferredMethod);
    if (
      preferredMethodConfig &&
      this.isMethodAffordable(preferredMethodConfig, maxCost)
    ) {
      try {
        const result = await this.executeMethod(preferredMethodConfig, {
          transactionHash,
          blockNumber,
        });

        if (useCache) {
          const cacheKey = `tx_analysis_${transactionHash}_${preferredMethod}`;
          replayDataCache.set(cacheKey, result, { ttl: 30 * 60 * 1000 });
        }

        return {
          method: preferredMethod,
          data: result,
          confidence: preferredMethodConfig.reliability,
          limitations: this.getMethodLimitations(preferredMethodConfig),
          cached: false,
        };
      } catch (error) {
        console.warn(`Primary method ${preferredMethod} failed:`, error);
      }
    }

    const fallbackMethods =
      AnalysisMethodRegistry.getFallbackMethods(preferredMethod);

    for (const method of fallbackMethods) {
      if (!this.isMethodAffordable(method, maxCost)) continue;

      try {
        const result = await this.executeMethod(method, {
          transactionHash,
          blockNumber,
        });

        if (useCache) {
          const cacheKey = `tx_analysis_${transactionHash}_${method.id}`;
          replayDataCache.set(cacheKey, result, { ttl: 15 * 60 * 1000 });
        }

        return {
          method: method.id,
          data: result,
          confidence: method.reliability,
          limitations: this.getMethodLimitations(method),
          suggestedUpgrade: preferredMethod,
          cached: false,
        };
      } catch (error) {
        console.warn(`Fallback method ${method.id} failed:`, error);
      }
    }

    try {
      const basicMethod = AnalysisMethodRegistry.getMethod("basic_info")!;
      const result = await this.executeMethod(basicMethod, {
        transactionHash,
        blockNumber,
      });

      return {
        method: "basic_info",
        data: result,
        confidence: 0.3,
        limitations: [
          "Limited analysis depth",
          "No internal call information",
          "No state change details",
          "Basic gas information only",
        ],
        suggestedUpgrade: preferredMethod,
        cached: false,
      };
    } catch (error) {
      throw new Error(
        `All analysis methods failed for transaction ${transactionHash}`,
      );
    }
  }

  static async analyzeBlock(
    blockNumber: number,
    options: {
      preferredMethod?: string;
      maxCost?: "low" | "medium" | "high" | "very-high";
      useCache?: boolean;
      sampleSize?: number;
    } = {},
  ): Promise<FallbackResult> {
    const {
      preferredMethod = "trace_replayBlockTransactions",
      maxCost = this.costThresholds.userPreference,
      useCache = true,
      sampleSize,
    } = options;

    if (useCache) {
      const cacheKey = `block_analysis_${blockNumber}_${preferredMethod}`;
      const cached = replayDataCache.get(cacheKey);
      if (cached) {
        return {
          method: preferredMethod,
          data: cached,
          confidence: 0.95,
          limitations: [],
          cached: true,
        };
      }
    }

    const preferredMethodConfig =
      AnalysisMethodRegistry.getMethod(preferredMethod);
    if (
      preferredMethodConfig &&
      this.isMethodAffordable(preferredMethodConfig, maxCost)
    ) {
      try {
        const result = await this.executeMethod(preferredMethodConfig, {
          blockNumber,
          sampleSize,
        });

        if (useCache) {
          const cacheKey = `block_analysis_${blockNumber}_${preferredMethod}`;
          replayDataCache.set(cacheKey, result, { ttl: 60 * 60 * 1000 });
        }

        return {
          method: preferredMethod,
          data: result,
          confidence: preferredMethodConfig.reliability,
          limitations: this.getMethodLimitations(preferredMethodConfig),
          cached: false,
        };
      } catch (error) {
        console.warn(`Primary method ${preferredMethod} failed:`, error);
      }
    }

    const fallbackMethods =
      AnalysisMethodRegistry.getFallbackMethods(preferredMethod);

    for (const method of fallbackMethods) {
      if (!this.isMethodAffordable(method, maxCost)) continue;

      try {
        const result = await this.executeMethod(method, {
          blockNumber,
          sampleSize,
        });

        if (useCache) {
          const cacheKey = `block_analysis_${blockNumber}_${method.id}`;
          replayDataCache.set(cacheKey, result, { ttl: 30 * 60 * 1000 });
        }

        return {
          method: method.id,
          data: result,
          confidence: method.reliability,
          limitations: this.getMethodLimitations(method),
          suggestedUpgrade: preferredMethod,
          cached: false,
        };
      } catch (error) {
        console.warn(`Fallback method ${method.id} failed:`, error);
      }
    }

    throw new Error(`All analysis methods failed for block ${blockNumber}`);
  }

  private static isMethodAffordable(
    method: AnalysisMethod,
    maxCost: string,
  ): boolean {
    const costOrder = { low: 1, medium: 2, high: 3, "very-high": 4 };
    return costOrder[method.cost.costLevel] <= costOrder[maxCost];
  }

  private static async executeMethod(
    method: AnalysisMethod,
    params: {
      transactionHash?: string;
      blockNumber?: number;
      sampleSize?: number;
    },
  ): Promise<any> {
    const { transactionHash, blockNumber, sampleSize } = params;

    switch (method.id) {
      case "trace_replayTransaction":
        return this.executeTraceReplay(transactionHash!);

      case "debug_traceTransaction":
        return this.executeDebugTrace(transactionHash!);

      case "basic_trace":
        return this.executeBasicTrace(transactionHash!);

      case "receipt_analysis":
        return this.executeReceiptAnalysis(transactionHash!);

      case "log_analysis":
        return this.executeLogAnalysis(transactionHash!);

      case "basic_info":
        return this.executeBasicInfo(transactionHash!);

      case "block_analysis":
        return this.executeBlockAnalysis(blockNumber!);

      case "receipt_batch_analysis":
        return this.executeReceiptBatchAnalysis(blockNumber!, sampleSize);

      default:
        throw new Error(`Unknown method: ${method.id}`);
    }
  }

  private static async executeTraceReplay(
    transactionHash: string,
  ): Promise<any> {
    await this.delay(2000);
    return {
      type: "full_replay",
      transactionHash,
      trace: { calls: [], gasUsed: 150000 },
      stateDiff: { storage: {}, balance: {} },
      vmTrace: { structLogs: [] },
      gasAnalysis: { efficiency: 85, breakdown: [] },
      securityFlags: [],
      tokenActivity: { transfers: [], volume: 0 },
    };
  }

  private static async executeDebugTrace(
    transactionHash: string,
  ): Promise<any> {
    await this.delay(1000);
    return {
      type: "debug_trace",
      transactionHash,
      trace: { calls: [], gasUsed: 150000 },
      gasAnalysis: { efficiency: 80, breakdown: [] },
      limitations: ["No state diff available", "Limited opcode details"],
    };
  }

  private static async executeBasicTrace(
    transactionHash: string,
  ): Promise<any> {
    await this.delay(500);
    return {
      type: "basic_trace",
      transactionHash,
      calls: [],
      gasUsed: 150000,
      limitations: ["No internal state changes", "Basic call information only"],
    };
  }

  private static async executeReceiptAnalysis(
    transactionHash: string,
  ): Promise<any> {
    await this.delay(100);
    return {
      type: "receipt_analysis",
      transactionHash,
      status: "success",
      gasUsed: 150000,
      logs: [],
      tokenActivity: { transfers: [], volume: 0 },
      limitations: ["No internal calls", "Event-based analysis only"],
    };
  }

  private static async executeLogAnalysis(
    transactionHash: string,
  ): Promise<any> {
    await this.delay(50);
    return {
      type: "log_analysis",
      transactionHash,
      events: [],
      tokenTransfers: [],
      limitations: ["Events only", "No gas breakdown", "No call trace"],
    };
  }

  private static async executeBasicInfo(transactionHash: string): Promise<any> {
    await this.delay(20);
    return {
      type: "basic_info",
      transactionHash,
      from: "0x...",
      to: "0x...",
      value: "0",
      gasUsed: 150000,
      status: "success",
      limitations: ["Minimal information", "No analysis depth"],
    };
  }

  private static async executeBlockAnalysis(blockNumber: number): Promise<any> {
    await this.delay(200);
    return {
      type: "block_analysis",
      blockNumber,
      transactionCount: 150,
      totalGasUsed: 15000000,
      avgGasPrice: "20000000000",
      limitations: ["No transaction details", "Aggregate data only"],
    };
  }

  private static async executeReceiptBatchAnalysis(
    blockNumber: number,
    sampleSize?: number,
  ): Promise<any> {
    await this.delay(500);
    return {
      type: "receipt_batch_analysis",
      blockNumber,
      analyzedTransactions: sampleSize || 50,
      totalTransactions: 150,
      gasAnalysis: { avgEfficiency: 75 },
      tokenActivity: { totalVolume: 1000000 },
      limitations: sampleSize ? [`Sampled ${sampleSize} transactions`] : [],
    };
  }

  private static getMethodLimitations(method: AnalysisMethod): string[] {
    const limitations: Record<string, string[]> = {
      trace_replayTransaction: [],
      debug_traceTransaction: ["No state diff", "Limited storage analysis"],
      basic_trace: ["No state changes", "Basic call info only"],
      receipt_analysis: ["No internal calls", "Event-based only"],
      log_analysis: ["Events only", "No gas breakdown"],
      basic_info: ["Minimal data", "No analysis depth"],
      block_analysis: ["No transaction details", "Aggregate only"],
      receipt_batch_analysis: ["Limited transaction depth"],
    };

    return limitations[method.id] || [];
  }

  private static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  static analyzeCostBenefit(
    methods: string[],
    requirements: {
      accuracy: number;
      speed: number;
      cost: number;
    },
  ): { method: string; score: number; reasoning: string }[] {
    const results = methods
      .map((methodId) => {
        const method = AnalysisMethodRegistry.getMethod(methodId);
        if (!method) return null;

        const accuracyScore = method.reliability * requirements.accuracy;
        const speedScore =
          (1 - method.cost.timeEstimate / 30000) * requirements.speed;
        const costScore =
          (1 -
            ["low", "medium", "high", "very-high"].indexOf(
              method.cost.costLevel,
            ) /
              3) *
          requirements.cost;

        const totalScore = (accuracyScore + speedScore + costScore) / 3;

        return {
          method: methodId,
          score: totalScore,
          reasoning: `Accuracy: ${(accuracyScore * 100).toFixed(0)}%, Speed: ${(speedScore * 100).toFixed(0)}%, Cost: ${(costScore * 100).toFixed(0)}%`,
        };
      })
      .filter(Boolean) as {
      method: string;
      score: number;
      reasoning: string;
    }[];

    return results.sort((a, b) => b.score - a.score);
  }

  static selectOptimalMethod(
    primaryMethod: string,
    constraints: {
      maxTime?: number;
      maxCost?: "low" | "medium" | "high" | "very-high";
      minReliability?: number;
    } = {},
  ): string {
    const {
      maxTime = this.costThresholds.time,
      maxCost = this.costThresholds.userPreference,
      minReliability = 0.5,
    } = constraints;

    const primaryMethodConfig = AnalysisMethodRegistry.getMethod(primaryMethod);
    if (
      primaryMethodConfig &&
      this.isMethodAffordable(primaryMethodConfig, maxCost) &&
      primaryMethodConfig.cost.timeEstimate <= maxTime &&
      primaryMethodConfig.reliability >= minReliability
    ) {
      return primaryMethod;
    }

    const fallbacks = AnalysisMethodRegistry.getFallbackMethods(primaryMethod);

    for (const method of fallbacks) {
      if (
        this.isMethodAffordable(method, maxCost) &&
        method.cost.timeEstimate <= maxTime &&
        method.reliability >= minReliability
      ) {
        return method.id;
      }
    }

    return "basic_info";
  }
}

export function useFallbackAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [result, setResult] = React.useState<FallbackResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [costSettings, setCostSettings] = React.useState({
    maxCost: "medium" as "low" | "medium" | "high" | "very-high",
    useCache: true,
    preferSpeed: false,
  });

  const analyzeTransaction = React.useCallback(
    async (
      transactionHash: string,
      options: {
        preferredMethod?: string;
        blockNumber?: number;
      } = {},
    ) => {
      setIsAnalyzing(true);
      setError(null);

      try {
        const result = await FallbackAnalysisEngine.analyzeTransaction(
          transactionHash,
          {
            ...options,
            maxCost: costSettings.maxCost,
            useCache: costSettings.useCache,
          },
        );
        setResult(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Analysis failed");
      } finally {
        setIsAnalyzing(false);
      }
    },
    [costSettings],
  );

  const analyzeBlock = React.useCallback(
    async (
      blockNumber: number,
      options: {
        preferredMethod?: string;
        sampleSize?: number;
      } = {},
    ) => {
      setIsAnalyzing(true);
      setError(null);

      try {
        const result = await FallbackAnalysisEngine.analyzeBlock(blockNumber, {
          ...options,
          maxCost: costSettings.maxCost,
          useCache: costSettings.useCache,
        });
        setResult(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Analysis failed");
      } finally {
        setIsAnalyzing(false);
      }
    },
    [costSettings],
  );

  const getAvailableMethods = React.useCallback((primaryMethod: string) => {
    return AnalysisMethodRegistry.getFallbackMethods(primaryMethod);
  }, []);

  const estimateCost = React.useCallback((methodId: string) => {
    const method = AnalysisMethodRegistry.getMethod(methodId);
    return method?.cost;
  }, []);

  return {
    isAnalyzing,
    result,
    error,
    costSettings,
    setCostSettings,
    analyzeTransaction,
    analyzeBlock,
    getAvailableMethods,
    estimateCost,
    hasResult: result !== null,
    confidence: result?.confidence || 0,
    limitations: result?.limitations || [],
    suggestedUpgrade: result?.suggestedUpgrade,
  };
}

export { AnalysisMethodRegistry, FallbackAnalysisEngine };
export type { CostEstimate, AnalysisMethod, FallbackResult };
