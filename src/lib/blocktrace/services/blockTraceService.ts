import { ethers } from "ethers";
import { blockchainService } from "@/lib/blockchainService";
import {
  validateBlockIdentifier,
  formatBlockIdentifier,
  parseBlockIdentifier,
  calculateExecutionTime,
  retry,
  generateCacheKey,
  estimateMemoryUsage,
} from "../utils";
import {
  NETWORKS,
  PERFORMANCE_THRESHOLDS,
  ERROR_MESSAGES,
  CACHE_CONFIG,
} from "../constants";
import type {
  BlockIdentifier,
  RawBlockTrace,
  BlockAnalysis,
  PerformanceMetrics,
  ProcessingStep,
  ValidationResult,
  CacheEntry,
  CacheMetrics,
  NetworkType,
} from "../types";

export class BlockTraceService {
  private cache = new Map<string, CacheEntry<any>>();
  private cacheMetrics: CacheMetrics = {
    totalEntries: 0,
    totalSize: 0,
    hitRate: 0,
    missRate: 0,
    evictionCount: 0,
  };
  private performanceHistory: PerformanceMetrics[] = [];

  /**
   * Main method to trace a block and return analysis results
   */
  async traceBlock(
    blockIdentifier: string | number,
    network: NetworkType = "mainnet",
    options: {
      timeout?: number;
      retryAttempts?: number;
      useCache?: boolean;
      trackPerformance?: boolean;
    } = {}
  ): Promise<{
    blockAnalysis: BlockAnalysis;
    performanceMetrics: PerformanceMetrics;
  }> {
    const startTime = Date.now();
    const memoryStart = this.getMemoryUsage();
    const processingSteps: ProcessingStep[] = [];

    const {
      timeout = PERFORMANCE_THRESHOLDS.TIMEOUT,
      retryAttempts = 3,
      useCache = true,
      trackPerformance = true,
    } = options;

    try {
      // Step 1: Validate block identifier
      const validationStep = this.startProcessingStep("validation");
      await this.validateBlockIdentifier(blockIdentifier);
      this.completeProcessingStep(validationStep, processingSteps);

      // Step 2: Check cache
      const cacheStep = this.startProcessingStep("cache_check");
      const cacheKey = generateCacheKey(
        "block_trace",
        network,
        String(blockIdentifier)
      );

      if (useCache) {
        const cachedResult = this.getFromCache<BlockAnalysis>(cacheKey);
        if (cachedResult) {
          this.completeProcessingStep(cacheStep, processingSteps);

          const performanceMetrics: PerformanceMetrics = {
            executionTime: calculateExecutionTime(startTime),
            memoryUsage: this.getMemoryUsage() - memoryStart,
            cacheHitRate: 100,
            rpcCallCount: 0,
            processingSteps,
          };

          return {
            blockAnalysis: cachedResult,
            performanceMetrics,
          };
        }
      }
      this.completeProcessingStep(cacheStep, processingSteps);

      // Step 3: Ensure network connection
      const connectionStep = this.startProcessingStep("network_connection");
      await this.ensureConnection(network);
      this.completeProcessingStep(connectionStep, processingSteps);

      // Step 4: Perform block trace with timeout and retry
      const traceStep = this.startProcessingStep("block_trace");
      const blockAnalysis = await this.executeWithTimeout(
        () =>
          retry(
            () => this.performBlockTrace(blockIdentifier, network),
            retryAttempts
          ),
        timeout
      );
      this.completeProcessingStep(traceStep, processingSteps);

      // Step 5: Cache results
      if (useCache) {
        const cacheStoreStep = this.startProcessingStep("cache_store");
        this.setCache(cacheKey, blockAnalysis, CACHE_CONFIG.BLOCK_TRACE_TTL);
        this.completeProcessingStep(cacheStoreStep, processingSteps);
      }

      // Create performance metrics
      const performanceMetrics = this.createPerformanceMetrics(
        startTime,
        processingSteps,
        memoryStart,
        useCache ? this.cacheMetrics.hitRate : 0
      );

      if (trackPerformance) {
        this.performanceHistory.push(performanceMetrics);
        this.checkPerformanceWarnings(performanceMetrics);
      }

      return {
        blockAnalysis,
        performanceMetrics,
      };
    } catch (error) {
      const enhancedError = this.enhanceError(error, blockIdentifier, network);

      // Record failed step
      if (processingSteps.length > 0) {
        const lastStep = processingSteps[processingSteps.length - 1];
        if (lastStep.status !== "completed") {
          lastStep.status = "failed";
          lastStep.error = enhancedError.message;
          lastStep.endTime = Date.now();
          lastStep.duration = calculateExecutionTime(
            lastStep.startTime,
            lastStep.endTime
          );
        }
      }

      throw enhancedError;
    }
  }

  /**
   * Get raw block trace data using trace_block RPC method
   */
  async getBlockTrace(
    blockIdentifier: string | number,
    network: NetworkType = "mainnet"
  ): Promise<RawBlockTrace[]> {
    await this.ensureConnection(network);

    const formattedBlockId = formatBlockIdentifier(blockIdentifier);
    const provider = blockchainService.getProvider();

    if (!provider) {
      throw new Error("Provider not available");
    }

    try {
      console.log(`Calling trace_block for block: ${formattedBlockId}`);

      // Use trace_block RPC method
      const traces = await provider.send("trace_block", [formattedBlockId]);

      if (!Array.isArray(traces)) {
        throw new Error("Invalid trace_block response format");
      }

      console.log(
        `Retrieved ${traces.length} traces for block ${formattedBlockId}`
      );
      return traces;
    } catch (error) {
      console.error(`trace_block failed for block ${formattedBlockId}:`, error);
      throw new Error(
        `Failed to trace block: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Validates block identifier
   */
  private async validateBlockIdentifier(
    blockIdentifier: string | number
  ): Promise<void> {
    const validation = validateBlockIdentifier(blockIdentifier);

    if (!validation.isValid) {
      const errorMessages = validation.errors.map((e) => e.message).join(", ");
      throw new Error(`${ERROR_MESSAGES.INVALID_BLOCK_ID}: ${errorMessages}`);
    }

    // Log warnings if any
    if (validation.warnings.length > 0) {
      validation.warnings.forEach((warning) => {
        console.warn(`Block validation warning: ${warning.message}`);
      });
    }
  }

  /**
   * Ensures connection to the specified network
   */
  private async ensureConnection(network: NetworkType): Promise<void> {
    try {
      if (
        !blockchainService.isConnected() ||
        blockchainService.getCurrentNetworkType() !== network
      ) {
        console.log(`Connecting to ${network} network...`);
        await blockchainService.connect(network);
      }
    } catch (error) {
      throw new Error(
        `${ERROR_MESSAGES.NETWORK_ERROR}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Performs the actual block trace operation
   */
  private async performBlockTrace(
    blockIdentifier: string | number,
    network: NetworkType
  ): Promise<BlockAnalysis> {
    const startTime = Date.now();

    try {
      // Get raw trace data
      const rawTraces = await this.getBlockTrace(blockIdentifier, network);

      // Get block information
      const provider = blockchainService.getProvider();
      if (!provider) {
        throw new Error("Provider not available");
      }

      const formattedBlockId = formatBlockIdentifier(blockIdentifier);
      const blockInfo = await provider.getBlock(formattedBlockId);

      if (!blockInfo) {
        throw new Error(ERROR_MESSAGES.BLOCK_NOT_FOUND);
      }

      // Create basic block analysis structure
      const blockAnalysis: BlockAnalysis = {
        blockNumber: blockInfo.number,
        blockHash: blockInfo.hash,
        timestamp: blockInfo.timestamp,
        totalTransactions: blockInfo.transactions.length,
        totalTraces: rawTraces.length,
        totalGasUsed: BigInt(blockInfo.gasUsed?.toString() || "0"),
        failedTraces: rawTraces.filter((trace) => trace.error).length,
        summary: {
          totalTransactions: blockInfo.transactions.length,
          successfulTransactions:
            blockInfo.transactions.length -
            rawTraces.filter((trace) => trace.error).length,
          failedTransactions: rawTraces.filter((trace) => trace.error).length,
          successRate: 0, // Will be calculated by processors
          pyusdTransactions: 0, // Will be calculated by processors
          pyusdPercentage: 0, // Will be calculated by processors
          totalValue: "0", // Will be calculated by processors
          totalGasUsed: blockInfo.gasUsed?.toString() || "0",
          averageGasPerTx: "0", // Will be calculated by processors
        },
        traces: [], // Will be processed by BlockTraceProcessor
        gasAnalysis: {
          totalGasUsed: BigInt(blockInfo.gasUsed?.toString() || "0"),
          averageGasPerTrace: 0,
          gasDistribution: [],
          gasEfficiency: {
            successRate: 0,
            averageGasPerSuccess: 0,
            averageGasPerFailure: 0,
            wastedGas: 0n,
            efficiencyScore: 0,
          },
          optimizationOpportunities: [],
        },
        tokenFlowAnalysis: {
          pyusdTransactions: [],
          flowMetrics: {
            totalTransfers: 0,
            totalVolume: 0n,
            totalVolumeFormatted: "0",
            uniqueSenders: 0,
            uniqueReceivers: 0,
            averageTransferAmount: 0n,
            averageTransferAmountFormatted: "0",
            largestTransfer: 0n,
            largestTransferFormatted: "0",
          },
          networkAnalysis: {
            nodes: [],
            edges: [],
            centralityMetrics: {
              betweennessCentrality: {},
              closenessCentrality: {},
              degreeCentrality: {},
            },
            clusteringCoefficient: 0,
            networkDensity: 0,
          },
          flowDiagram: {
            nodes: [],
            edges: [],
            graphvizDot: "",
          },
        },
        performanceMetrics: {
          executionTime: calculateExecutionTime(startTime),
          memoryUsage: 0,
          cacheHitRate: 0,
          rpcCallCount: 1,
          processingSteps: [],
        },
      };

      // Store raw traces for processing by other components
      (blockAnalysis as any).rawTraces = rawTraces;

      return blockAnalysis;
    } catch (error) {
      throw new Error(
        `${ERROR_MESSAGES.PROCESSING_ERROR}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Executes a function with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(ERROR_MESSAGES.TIMEOUT_ERROR));
      }, timeoutMs);

      fn()
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Cache management methods
   */
  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.cacheMetrics.missRate++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.cacheMetrics.evictionCount++;
      this.cacheMetrics.missRate++;
      return null;
    }

    entry.accessCount++;
    this.cacheMetrics.hitRate++;
    return entry.data;
  }

  private setCache<T>(
    key: string,
    data: T,
    ttl: number = CACHE_CONFIG.DEFAULT_TTL
  ): void {
    try {
      const size = estimateMemoryUsage(data);
      const entry: CacheEntry<T> = {
        key,
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttl,
        size,
        accessCount: 0,
      };

      // Check cache size limits
      if (this.cache.size >= CACHE_CONFIG.MAX_CACHE_SIZE) {
        this.cleanupCache();
      }

      this.cache.set(key, entry);
      this.updateCacheMetrics();
    } catch (error) {
      console.warn(
        `${ERROR_MESSAGES.CACHE_ERROR}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  private cleanupCache(): void {
    const now = Date.now();
    let evicted = 0;

    // Remove expired entries
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        evicted++;
      }
    }

    // If still over limit, remove least recently used
    if (this.cache.size >= CACHE_CONFIG.MAX_CACHE_SIZE) {
      const entries = Array.from(this.cache.entries()).sort(
        ([, a], [, b]) => a.accessCount - b.accessCount
      );

      const toRemove = entries.slice(
        0,
        Math.floor(CACHE_CONFIG.MAX_CACHE_SIZE * 0.2)
      );
      toRemove.forEach(([key]) => {
        this.cache.delete(key);
        evicted++;
      });
    }

    this.cacheMetrics.evictionCount += evicted;
    this.updateCacheMetrics();
  }

  private updateCacheMetrics(): void {
    this.cacheMetrics.totalEntries = this.cache.size;
    this.cacheMetrics.totalSize = Array.from(this.cache.values()).reduce(
      (total, entry) => total + entry.size,
      0
    );

    const totalRequests =
      this.cacheMetrics.hitRate + this.cacheMetrics.missRate;
    if (totalRequests > 0) {
      this.cacheMetrics.hitRate =
        (this.cacheMetrics.hitRate / totalRequests) * 100;
      this.cacheMetrics.missRate =
        (this.cacheMetrics.missRate / totalRequests) * 100;
    }
  }

  /**
   * Performance monitoring methods
   */
  private startProcessingStep(name: string): ProcessingStep {
    return {
      name,
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      memoryDelta: 0,
      status: "completed",
    };
  }

  private completeProcessingStep(
    step: ProcessingStep,
    steps: ProcessingStep[]
  ): void {
    step.endTime = Date.now();
    step.duration = calculateExecutionTime(step.startTime, step.endTime);
    steps.push(step);
  }

  private createPerformanceMetrics(
    startTime: number,
    processingSteps: ProcessingStep[],
    memoryStart: number,
    cacheHitRate: number
  ): PerformanceMetrics {
    return {
      executionTime: calculateExecutionTime(startTime),
      memoryUsage: this.getMemoryUsage() - memoryStart,
      cacheHitRate,
      rpcCallCount: processingSteps.filter(
        (step) => step.name.includes("trace") || step.name.includes("block")
      ).length,
      processingSteps,
    };
  }

  private checkPerformanceWarnings(metrics: PerformanceMetrics): void {
    if (metrics.executionTime > PERFORMANCE_THRESHOLDS.SLOW_EXECUTION) {
      console.warn(`Slow block trace execution: ${metrics.executionTime}ms`);
    }

    if (metrics.memoryUsage > PERFORMANCE_THRESHOLDS.MEMORY_WARNING) {
      console.warn(
        `High memory usage: ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`
      );
    }

    if (metrics.cacheHitRate < 50) {
      console.warn(`Low cache hit rate: ${metrics.cacheHitRate.toFixed(1)}%`);
    }
  }

  private getMemoryUsage(): number {
    if (typeof performance !== "undefined" && performance.memory) {
      return performance.memory.usedJSHeapSize;
    }
    return 0;
  }

  private enhanceError(
    error: unknown,
    blockIdentifier: string | number,
    network: string
  ): Error {
    const baseMessage = error instanceof Error ? error.message : String(error);
    const enhancedMessage = `Block trace failed for ${blockIdentifier} on ${network}: ${baseMessage}`;

    const enhancedError = new Error(enhancedMessage);
    enhancedError.cause = error;

    return enhancedError;
  }

  /**
   * Public utility methods
   */
  getCacheMetrics(): CacheMetrics {
    return { ...this.cacheMetrics };
  }

  getPerformanceHistory(): PerformanceMetrics[] {
    return [...this.performanceHistory];
  }

  clearCache(): void {
    this.cache.clear();
    this.cacheMetrics = {
      totalEntries: 0,
      totalSize: 0,
      hitRate: 0,
      missRate: 0,
      evictionCount: 0,
    };
  }

  getSupportedNetworks(): NetworkType[] {
    return Object.keys(NETWORKS) as NetworkType[];
  }
}
