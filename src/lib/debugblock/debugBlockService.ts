import {
  BlockInfo,
  DebugBlockError,
  DebugTraceConfig,
  ProcessedDebugBlockData,
  ValidationResult,
} from "./types";
import { DebugTraceBlockApi, EthBlockApi } from "./api";
import {
  BlockGasProcessor,
  DebugBlockProcessor,
  GasAnalysisResult,
  PyusdBlockProcessor,
} from "./processors";
import { DebugBlockCache } from "./debugBlockCache";
import { DebugBlockValidator } from "./debugBlockValidator";
import { DEBUG_TRACE_CONFIGS, PERFORMANCE_CONFIG } from "./constants";

export class DebugBlockService {
  private static cache = new DebugBlockCache();

  static async traceBlockByNumber(
    blockNumber: string | number,
    options: {
      useCache?: boolean;
      config?: DebugTraceConfig;
      includeGasAnalysis?: boolean;
      gasPrice?: number;
    } = {},
  ): Promise<{
    data: ProcessedDebugBlockData;
    blockInfo: BlockInfo;
    gasAnalysis?: GasAnalysisResult;
    processingTime: number;
  }> {
    const startTime = Date.now();
    const {
      useCache = true,
      config = DEBUG_TRACE_CONFIGS.default,
      includeGasAnalysis = true,
      gasPrice = 20,
    } = options;

    try {
      console.log(`Starting debug block trace by number: ${blockNumber}`);

      const validation =
        await DebugTraceBlockApi.validateBlockIdentifier(blockNumber);
      if (!validation.isValid) {
        throw new Error(
          `Invalid block identifier: ${validation.errors.join(", ")}`,
        );
      }

      const blockInfo = validation.blockInfo!;
      const cacheKey = `debug_block_${blockInfo.number}`;

      if (useCache) {
        const cachedData = this.cache.get(cacheKey);
        if (cachedData) {
          console.log(
            `Retrieved debug block data from cache for block ${blockNumber}`,
          );
          const gasAnalysis = includeGasAnalysis
            ? BlockGasProcessor.analyzeGasUsage(
                cachedData.transactions,
                cachedData.internalTransactions,
                gasPrice,
              )
            : undefined;

          return {
            data: cachedData,
            blockInfo,
            gasAnalysis,
            processingTime: Date.now() - startTime,
          };
        }
      }

      const estimate = DebugTraceBlockApi.estimateProcessingTime(
        blockInfo.transactionCount,
      );
      if (estimate.warning) {
        console.warn(estimate.warning);
      }

      console.log(
        `Fetching trace data for block ${blockNumber} (${blockInfo.transactionCount} transactions)`,
      );
      const traceData = await DebugTraceBlockApi.traceBlockByNumber(
        blockNumber,
        config,
      );

      const traceValidation = DebugBlockValidator.validateTraceData(traceData);
      if (!traceValidation.isValid) {
        console.warn(
          `Trace data validation warnings: ${traceValidation.warnings.join(", ")}`,
        );
      }

      console.log(`Processing trace data for block ${blockNumber}`);
      const processedData = DebugBlockProcessor.processDebugBlockTrace(
        traceData,
        blockNumber.toString(),
      );

      if (useCache) {
        this.cache.set(cacheKey, processedData);
      }

      const gasAnalysis = includeGasAnalysis
        ? BlockGasProcessor.analyzeGasUsage(
            processedData.transactions,
            processedData.internalTransactions,
            gasPrice,
          )
        : undefined;

      const processingTime = Date.now() - startTime;
      console.log(
        `Debug block trace completed for block ${blockNumber} in ${processingTime}ms`,
      );

      return {
        data: processedData,
        blockInfo,
        gasAnalysis,
        processingTime,
      };
    } catch (error) {
      console.error(`Failed to trace block by number ${blockNumber}:`, error);
      throw this.createServiceError(
        error,
        blockNumber.toString(),
        "traceBlockByNumber",
      );
    }
  }

  static async traceBlockByHash(
    blockHash: string,
    options: {
      useCache?: boolean;
      config?: DebugTraceConfig;
      includeGasAnalysis?: boolean;
      gasPrice?: number;
    } = {},
  ): Promise<{
    data: ProcessedDebugBlockData;
    blockInfo: BlockInfo;
    gasAnalysis?: GasAnalysisResult;
    processingTime: number;
  }> {
    const startTime = Date.now();
    const {
      useCache = true,
      config = DEBUG_TRACE_CONFIGS.default,
      includeGasAnalysis = true,
      gasPrice = 20,
    } = options;

    try {
      console.log(`Starting debug block trace by hash: ${blockHash}`);

      const blockInfo = await DebugTraceBlockApi.getBlockInfo(blockHash);
      const cacheKey = `debug_block_${blockInfo.number}`;

      if (useCache) {
        const cachedData = this.cache.get(cacheKey);
        if (cachedData) {
          console.log(
            `Retrieved debug block data from cache for block hash ${blockHash}`,
          );
          const gasAnalysis = includeGasAnalysis
            ? BlockGasProcessor.analyzeGasUsage(
                cachedData.transactions,
                cachedData.internalTransactions,
                gasPrice,
              )
            : undefined;

          return {
            data: cachedData,
            blockInfo,
            gasAnalysis,
            processingTime: Date.now() - startTime,
          };
        }
      }

      const estimate = DebugTraceBlockApi.estimateProcessingTime(
        blockInfo.transactionCount,
      );
      if (estimate.warning) {
        console.warn(estimate.warning);
      }

      console.log(
        `Fetching trace data for block hash ${blockHash} (${blockInfo.transactionCount} transactions)`,
      );
      const traceData = await DebugTraceBlockApi.traceBlockByHash(
        blockHash,
        config,
      );

      const traceValidation = DebugBlockValidator.validateTraceData(traceData);
      if (!traceValidation.isValid) {
        console.warn(
          `Trace data validation warnings: ${traceValidation.warnings.join(", ")}`,
        );
      }

      console.log(`Processing trace data for block hash ${blockHash}`);
      const processedData = DebugBlockProcessor.processDebugBlockTrace(
        traceData,
        blockHash,
      );

      if (useCache) {
        this.cache.set(cacheKey, processedData);
      }

      const gasAnalysis = includeGasAnalysis
        ? BlockGasProcessor.analyzeGasUsage(
            processedData.transactions,
            processedData.internalTransactions,
            gasPrice,
          )
        : undefined;

      const processingTime = Date.now() - startTime;
      console.log(
        `Debug block trace completed for block hash ${blockHash} in ${processingTime}ms`,
      );

      return {
        data: processedData,
        blockInfo,
        gasAnalysis,
        processingTime,
      };
    } catch (error) {
      console.error(`Failed to trace block by hash ${blockHash}:`, error);
      throw this.createServiceError(error, blockHash, "traceBlockByHash");
    }
  }

  static async getBlockInfo(
    blockIdentifier: string | number,
  ): Promise<BlockInfo> {
    try {
      return await DebugTraceBlockApi.getBlockInfo(blockIdentifier);
    } catch (error) {
      console.error(`Failed to get block info for ${blockIdentifier}:`, error);
      throw error;
    }
  }

  static async validateBlockIdentifier(
    blockIdentifier: string | number,
  ): Promise<ValidationResult> {
    try {
      return await DebugTraceBlockApi.validateBlockIdentifier(blockIdentifier);
    } catch (error) {
      console.error(
        `Failed to validate block identifier ${blockIdentifier}:`,
        error,
      );
      return {
        isValid: false,
        errors: [`Validation failed: ${error}`],
        warnings: [],
      };
    }
  }

  static async getRecentBlocks(count: number = 10): Promise<BlockInfo[]> {
    try {
      return await EthBlockApi.getRecentBlocks(count);
    } catch (error) {
      console.error(`Failed to get recent blocks:`, error);
      throw error;
    }
  }

  static async searchBlocks(criteria: {
    minTransactions?: number;
    maxTransactions?: number;
    startBlock?: number;
    endBlock?: number;
    limit?: number;
  }): Promise<BlockInfo[]> {
    try {
      return await EthBlockApi.searchBlocks(criteria);
    } catch (error) {
      console.error(`Failed to search blocks:`, error);
      throw error;
    }
  }

  static generatePyusdAnalysis(data: ProcessedDebugBlockData): {
    transferNetwork: ReturnType<
      typeof PyusdBlockProcessor.createTransferNetwork
    >;
    functionPatterns: ReturnType<
      typeof PyusdBlockProcessor.analyzeFunctionPatterns
    >;
    volumeFlows: ReturnType<typeof PyusdBlockProcessor.analyzeVolumeFlows>;
    internalAnalysis: ReturnType<
      typeof PyusdBlockProcessor.analyzeInternalTransactions
    >;
    activitySummary: ReturnType<
      typeof PyusdBlockProcessor.generateActivitySummary
    >;
  } {
    return {
      transferNetwork: PyusdBlockProcessor.createTransferNetwork(
        data.pyusdTransfers,
      ),
      functionPatterns: PyusdBlockProcessor.analyzeFunctionPatterns(
        data.transactions,
      ),
      volumeFlows: PyusdBlockProcessor.analyzeVolumeFlows(data.pyusdTransfers),
      internalAnalysis: PyusdBlockProcessor.analyzeInternalTransactions(
        data.internalTransactions,
      ),
      activitySummary: PyusdBlockProcessor.generateActivitySummary(
        data.pyusdTransfers,
        data.internalTransactions,
        data.functionCategories,
      ),
    };
  }

  static generateGasReport(
    gasAnalysis: GasAnalysisResult,
  ): ReturnType<typeof BlockGasProcessor.generateGasReport> {
    return BlockGasProcessor.generateGasReport(gasAnalysis);
  }

  static compareWithHistorical(
    currentAnalysis: GasAnalysisResult,
    historicalData: GasAnalysisResult[],
  ): ReturnType<typeof BlockGasProcessor.compareWithHistorical> {
    return BlockGasProcessor.compareWithHistorical(
      currentAnalysis,
      historicalData,
    );
  }

  static clearCache(): void {
    this.cache.clear();
    console.log("Debug block cache cleared");
  }

  static getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    entries: string[];
  } {
    return this.cache.getStats();
  }

  static async estimateProcessingTime(
    blockIdentifier: string | number,
  ): Promise<{
    estimatedSeconds: number;
    category: "fast" | "medium" | "slow" | "very_slow";
    warning?: string;
    blockInfo: BlockInfo;
  }> {
    try {
      const blockInfo = await this.getBlockInfo(blockIdentifier);
      const estimate = DebugTraceBlockApi.estimateProcessingTime(
        blockInfo.transactionCount,
      );

      return {
        ...estimate,
        blockInfo,
      };
    } catch (error) {
      console.error(
        `Failed to estimate processing time for ${blockIdentifier}:`,
        error,
      );
      throw error;
    }
  }

  static async batchTraceBlocks(
    blockIdentifiers: (string | number)[],
    options: {
      useCache?: boolean;
      config?: DebugTraceConfig;
      maxConcurrent?: number;
    } = {},
  ): Promise<
    Array<{
      blockIdentifier: string | number;
      data?: ProcessedDebugBlockData;
      blockInfo?: BlockInfo;
      error?: DebugBlockError;
    }>
  > {
    const {
      useCache = true,
      config = DEBUG_TRACE_CONFIGS.default,
      maxConcurrent = PERFORMANCE_CONFIG.MAX_CONCURRENT_REQUESTS,
    } = options;

    console.log(`Starting batch trace for ${blockIdentifiers.length} blocks`);

    const results: Array<{
      blockIdentifier: string | number;
      data?: ProcessedDebugBlockData;
      blockInfo?: BlockInfo;
      error?: DebugBlockError;
    }> = [];

    for (let i = 0; i < blockIdentifiers.length; i += maxConcurrent) {
      const batch = blockIdentifiers.slice(i, i + maxConcurrent);

      const batchPromises = batch.map(async (blockId) => {
        try {
          const result = await this.traceBlockByNumber(blockId, {
            useCache,
            config,
            includeGasAnalysis: false,
          });
          return {
            blockIdentifier: blockId,
            data: result.data,
            blockInfo: result.blockInfo,
          };
        } catch (error) {
          return {
            blockIdentifier: blockId,
            error: error as DebugBlockError,
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      if (i + maxConcurrent < blockIdentifiers.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log(
      `Batch trace completed. ${results.filter((r) => r.data).length}/${blockIdentifiers.length} successful`,
    );
    return results;
  }

  private static createServiceError(
    error: any,
    blockIdentifier: string,
    operation: string,
  ): DebugBlockError {
    if (error instanceof Error && "type" in error) {
      return error as DebugBlockError;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      type: "rpc_error",
      message: `${operation} failed for block ${blockIdentifier}: ${errorMessage}`,
      blockIdentifier,
      originalError: error instanceof Error ? error : new Error(errorMessage),
      suggestions: [
        "Check your network connection",
        "Verify the block identifier is correct",
        "Try a different RPC endpoint",
        "Consider using a smaller block with fewer transactions",
      ],
    };
  }
}
