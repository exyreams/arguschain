import { blockchainService } from "@/lib/blockchainService";
import {
  BlockInfo,
  DebugBlockError,
  DebugBlockTraceItem,
  DebugTraceConfig,
  ValidationResult,
} from "../types";
import {
  DEBUG_TRACE_CONFIGS,
  getBlockIdentifierType,
  isValidBlockTag,
  PERFORMANCE_CONFIG,
  RPC_METHODS,
} from "../constants";

export class DebugTraceBlockApi {
  static async traceBlockByNumber(
    blockNumber: string | number,
    config: DebugTraceConfig = DEBUG_TRACE_CONFIGS.default,
  ): Promise<DebugBlockTraceItem[]> {
    try {
      if (!blockchainService.isConnected()) {
        await blockchainService.connect();
      }

      const formattedBlockNumber = this.formatBlockIdentifier(blockNumber);

      console.log(
        `Starting debug_traceBlockByNumber for block: ${formattedBlockNumber}`,
      );

      const blockInfo = await this.getBlockInfo(formattedBlockNumber);
      const transactionCount = blockInfo.transactionCount;

      if (transactionCount > PERFORMANCE_CONFIG.MAX_TRACE_ITEMS_IN_MEMORY) {
        console.warn(
          `Block ${formattedBlockNumber} contains ${transactionCount} transactions. This may take a very long time.`,
        );
      }

      const provider = blockchainService.getProvider();
      if (!provider) {
        throw new Error("Blockchain provider not available");
      }

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Request timed out")),
          PERFORMANCE_CONFIG.DEBUG_TRACE_TIMEOUT,
        ),
      );

      const tracePromise = provider.send(
        RPC_METHODS.DEBUG_TRACE_BLOCK_BY_NUMBER,
        [formattedBlockNumber, config],
      );

      const result = await Promise.race([tracePromise, timeoutPromise]);

      console.log(
        `debug_traceBlockByNumber completed for block ${formattedBlockNumber}. Found ${result?.length || 0} traces.`,
      );

      return this.validateAndProcessTraceResult(result, formattedBlockNumber);
    } catch (error) {
      console.error(`Failed to trace block by number ${blockNumber}:`, error);
      throw this.createDebugBlockError(
        error,
        blockNumber.toString(),
        "debug_traceBlockByNumber",
      );
    }
  }

  static async traceBlockByHash(
    blockHash: string,
    config: DebugTraceConfig = DEBUG_TRACE_CONFIGS.default,
  ): Promise<DebugBlockTraceItem[]> {
    try {
      if (!blockchainService.isConnected()) {
        await blockchainService.connect();
      }

      if (!this.isValidBlockHash(blockHash)) {
        throw new Error(`Invalid block hash format: ${blockHash}`);
      }

      console.log(
        `Starting debug_traceBlockByHash for block hash: ${blockHash}`,
      );

      const blockInfo = await this.getBlockInfo(blockHash);
      const transactionCount = blockInfo.transactionCount;

      if (transactionCount > PERFORMANCE_CONFIG.MAX_TRACE_ITEMS_IN_MEMORY) {
        console.warn(
          `Block ${blockHash} contains ${transactionCount} transactions. This may take a very long time.`,
        );
      }

      const provider = blockchainService.getProvider();
      if (!provider) {
        throw new Error("Blockchain provider not available");
      }

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Request timed out")),
          PERFORMANCE_CONFIG.DEBUG_TRACE_TIMEOUT,
        ),
      );

      const tracePromise = provider.send(
        RPC_METHODS.DEBUG_TRACE_BLOCK_BY_HASH,
        [blockHash, config],
      );

      const result = await Promise.race([tracePromise, timeoutPromise]);

      console.log(
        `debug_traceBlockByHash completed for block ${blockHash}. Found ${result?.length || 0} traces.`,
      );

      return this.validateAndProcessTraceResult(result, blockHash);
    } catch (error) {
      console.error(`Failed to trace block by hash ${blockHash}:`, error);
      throw this.createDebugBlockError(
        error,
        blockHash,
        "debug_traceBlockByHash",
      );
    }
  }

  static async getBlockInfo(
    blockIdentifier: string | number,
  ): Promise<BlockInfo> {
    try {
      const block = await blockchainService.getBlock(blockIdentifier, false);

      if (!block) {
        throw new Error(`Block not found: ${blockIdentifier}`);
      }

      return {
        number: block.number,
        hash: block.hash,
        parentHash: block.parentHash,
        timestamp: block.timestamp,
        gasUsed: block.gasUsed.toString(),
        gasLimit: block.gasLimit.toString(),
        transactions: block.transactions,
        transactionCount: block.transactions.length,
      };
    } catch (error) {
      console.error(`Failed to get block info for ${blockIdentifier}:`, error);
      throw error;
    }
  }

  static async resolveBlockHash(
    blockIdentifier: string | number,
  ): Promise<string> {
    try {
      const blockInfo = await this.getBlockInfo(blockIdentifier);
      return blockInfo.hash;
    } catch (error) {
      throw new Error(
        `Failed to resolve block hash for identifier ${blockIdentifier}: ${error}`,
      );
    }
  }

  static async validateBlockIdentifier(
    blockIdentifier: string | number,
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let blockInfo: BlockInfo | undefined;

    try {
      const identifierType =
        typeof blockIdentifier === "string"
          ? getBlockIdentifierType(blockIdentifier)
          : "block_number";

      if (identifierType === "invalid") {
        errors.push(`Invalid block identifier format: ${blockIdentifier}`);
        errors.push(
          "Please provide a valid block number, block hash, or block tag (latest, earliest, pending)",
        );
        return { isValid: false, errors, warnings };
      }

      if (identifierType === "contract_address") {
        errors.push(
          `Contract address provided instead of block identifier: ${blockIdentifier}`,
        );
        errors.push(
          "This tool analyzes blocks, not individual contracts. Please provide a block number or block hash.",
        );
        errors.push(
          "Example: Use '21000000' for block number or '0x1234...' (64 characters) for block hash",
        );
        return { isValid: false, errors, warnings };
      }

      if (identifierType === "block_hash_or_tx_hash") {
        warnings.push(
          "64-character hex string detected. If this is a transaction hash, please find the block containing this transaction instead.",
        );
      }

      try {
        blockInfo = await this.getBlockInfo(blockIdentifier);

        const currentBlock = await blockchainService.getCurrentBlock();
        const blockAge = currentBlock - blockInfo.number;

        if (blockAge < 12) {
          warnings.push(
            `Block ${blockInfo.number} is very recent (${blockAge} blocks old) and might be subject to reorganization`,
          );
        }

        if (blockInfo.transactionCount > 500) {
          warnings.push(
            `Block contains ${blockInfo.transactionCount} transactions. Tracing may take several minutes.`,
          );
        } else if (blockInfo.transactionCount > 200) {
          warnings.push(
            `Block contains ${blockInfo.transactionCount} transactions. Tracing may take longer than usual.`,
          );
        }
      } catch (blockError) {
        if (identifierType === "block_hash_or_tx_hash") {
          errors.push(`Block not found: ${blockIdentifier}`);
          errors.push(
            "This appears to be a transaction hash rather than a block hash.",
          );
          errors.push(
            "To analyze a transaction, please find the block containing it first.",
          );
          errors.push(
            "You can use a block explorer to find the block number for this transaction.",
          );
        } else if (identifierType === "hex_block_number") {
          errors.push(`Block not found: ${blockIdentifier}`);
          errors.push(
            "This hex number may be too large or may not correspond to an existing block.",
          );
          errors.push(
            "Please verify the block number exists on the current network.",
          );
        } else {
          errors.push(`Block not found or inaccessible: ${blockIdentifier}`);
          errors.push(
            "Please verify the block identifier is correct and the block exists on the current network.",
          );
        }
        return { isValid: false, errors, warnings };
      }
    } catch (error) {
      errors.push(`Validation failed: ${error}`);
      return { isValid: false, errors, warnings };
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      blockInfo,
    };
  }

  private static formatBlockIdentifier(
    blockIdentifier: string | number,
  ): string {
    if (typeof blockIdentifier === "number") {
      return "0x" + blockIdentifier.toString(16);
    }

    const identifier = blockIdentifier.toString().trim();

    if (isValidBlockTag(identifier)) {
      return identifier.toLowerCase();
    }

    if (identifier.startsWith("0x")) {
      return identifier;
    }

    const blockNum = parseInt(identifier, 10);
    if (!isNaN(blockNum) && blockNum >= 0) {
      return "0x" + blockNum.toString(16);
    }

    throw new Error(`Invalid block identifier: ${blockIdentifier}`);
  }

  private static isValidBlockHash(hash: string): boolean {
    return /^0x[0-9a-fA-F]{64}$/.test(hash);
  }

  private static validateAndProcessTraceResult(
    result: any,
    blockIdentifier: string,
  ): DebugBlockTraceItem[] {
    if (!Array.isArray(result)) {
      throw new Error(`Expected array from debug trace, got ${typeof result}`);
    }

    if (result.length === 0) {
      console.warn(`No trace results for block ${blockIdentifier}`);
      return [];
    }

    const validatedTraces: DebugBlockTraceItem[] = [];

    for (let i = 0; i < result.length; i++) {
      const traceItem = result[i];

      try {
        const validatedTrace: DebugBlockTraceItem = {
          txHash: traceItem.txHash || `tx_${i}`,
          result: traceItem.result || {},
          error: traceItem.error,
        };

        validatedTraces.push(validatedTrace);
      } catch (error) {
        console.warn(`Failed to validate trace item ${i}:`, error);

        validatedTraces.push({
          txHash: `tx_${i}`,
          result: {},
          error: `Validation failed: ${error}`,
        });
      }
    }

    return validatedTraces;
  }

  private static createDebugBlockError(
    error: any,
    blockIdentifier: string,
    method: string,
  ): DebugBlockError {
    const errorMessage = error instanceof Error ? error.message : String(error);

    let errorType: DebugBlockError["type"] = "rpc_error";
    const suggestions: string[] = [];

    if (
      errorMessage.includes("timeout") ||
      errorMessage.includes("timed out")
    ) {
      errorType = "network_error";
      suggestions.push("Try a different RPC endpoint");
      suggestions.push("Analyze a smaller block with fewer transactions");
      suggestions.push("Check your network connection");
    } else if (
      errorMessage.includes("not found") ||
      errorMessage.includes("null")
    ) {
      errorType = "validation_error";
      suggestions.push("Verify the block identifier is correct");
      suggestions.push("Check you're connected to the right network");
      suggestions.push("Try using 'latest' for the most recent block");
    } else if (
      errorMessage.includes("parse") ||
      errorMessage.includes("invalid")
    ) {
      errorType = "parsing_error";
      suggestions.push("The block data may be corrupted");
      suggestions.push("Try a different block");
    } else if (
      errorMessage.includes("network") ||
      errorMessage.includes("connection")
    ) {
      errorType = "network_error";
      suggestions.push("Check your internet connection");
      suggestions.push("Try switching to a different network");
    }

    return {
      type: errorType,
      message: `${method} failed for block ${blockIdentifier}: ${errorMessage}`,
      blockIdentifier,
      originalError: error instanceof Error ? error : new Error(errorMessage),
      suggestions,
    };
  }

  static estimateProcessingTime(transactionCount: number): {
    estimatedSeconds: number;
    category: "fast" | "medium" | "slow" | "very_slow";
    warning?: string;
  } {
    let estimatedSeconds: number;
    let category: "fast" | "medium" | "slow" | "very_slow";
    let warning: string | undefined;

    if (transactionCount <= 50) {
      estimatedSeconds = 30;
      category = "fast";
    } else if (transactionCount <= 200) {
      estimatedSeconds = 120;
      category = "medium";
    } else if (transactionCount <= 500) {
      estimatedSeconds = 300;
      category = "slow";
      warning =
        "This block contains many transactions and may take several minutes to process.";
    } else {
      estimatedSeconds = 600;
      category = "very_slow";
      warning =
        "This block contains a very large number of transactions and may take 10+ minutes to process.";
    }

    return { estimatedSeconds, category, warning };
  }
}
