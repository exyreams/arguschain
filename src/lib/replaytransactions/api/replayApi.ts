import { blockchainService } from "@/lib/blockchainService";
import type {
  ReplayBlockRequest,
  ReplayBlockResult,
  ReplayError,
  ReplayTracer,
  ReplayTransactionRequest,
  ReplayTransactionResult,
} from "../types";
import { ERROR_CODES, RPC_METHODS } from "../constants";

export class ReplayApi {
  static async replayTransaction(
    request: ReplayTransactionRequest,
  ): Promise<ReplayTransactionResult> {
    const { txHash, tracers, network = "mainnet" } = request;

    this.validateTransactionHash(txHash);
    this.validateTracers(tracers);

    try {
      await blockchainService.connect(network);
      const provider = blockchainService.getProvider();

      if (!provider) {
        throw new Error("Provider not available");
      }

      const params = [txHash, tracers];

      const result = await Promise.race([
        provider.send(RPC_METHODS.replayTransaction.method, params),
        this.createTimeoutPromise(RPC_METHODS.replayTransaction.timeout),
      ]);

      return this.validateReplayTransactionResult(result);
    } catch (error) {
      throw this.handleRpcError(error, "replayTransaction");
    }
  }

  static async replayBlockTransactions(
    request: ReplayBlockRequest,
  ): Promise<ReplayBlockResult> {
    const { blockIdentifier, tracers, network = "mainnet" } = request;

    this.validateBlockIdentifier(blockIdentifier);
    this.validateTracers(tracers);

    try {
      await blockchainService.connect(network);
      const provider = blockchainService.getProvider();

      if (!provider) {
        throw new Error("Provider not available");
      }

      const blockParam = this.formatBlockIdentifier(blockIdentifier);

      const params = [blockParam, tracers];

      const result = await Promise.race([
        provider.send(RPC_METHODS.replayBlockTransactions.method, params),
        this.createTimeoutPromise(RPC_METHODS.replayBlockTransactions.timeout),
      ]);

      return this.validateReplayBlockResult(result);
    } catch (error) {
      throw this.handleRpcError(error, "replayBlockTransactions");
    }
  }

  static async replayTransactionWithRetry(
    request: ReplayTransactionRequest,
    maxRetries: number = RPC_METHODS.replayTransaction.maxRetries,
  ): Promise<ReplayTransactionResult> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.replayTransaction(request);
      } catch (error) {
        lastError = error as Error;

        if (this.isValidationError(error)) {
          throw error;
        }

        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  static async replayBlockTransactionsWithRetry(
    request: ReplayBlockRequest,
    maxRetries: number = RPC_METHODS.replayBlockTransactions.maxRetries,
    options?: {
      onProgress?: (progress: {
        completed: number;
        total: number;
        message: string;
      }) => void;
      abortSignal?: AbortSignal;
    },
  ): Promise<ReplayBlockResult> {
    let lastError: Error;

    if (options?.abortSignal?.aborted) {
      throw new ReplayError(
        ERROR_CODES.OPERATION_CANCELLED,
        "Operation was cancelled",
      );
    }

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        options?.onProgress?.({
          completed: attempt,
          total: maxRetries + 1,
          message:
            attempt === 0
              ? "Starting block replay..."
              : `Retry attempt ${attempt}...`,
        });

        return await this.replayBlockTransactionsWithProgress(request, options);
      } catch (error) {
        lastError = error as Error;

        if (options?.abortSignal?.aborted) {
          throw new ReplayError(
            ERROR_CODES.OPERATION_CANCELLED,
            "Operation was cancelled",
          );
        }

        if (this.isValidationError(error)) {
          throw error;
        }

        if (attempt < maxRetries) {
          const delay = Math.min(2000 * Math.pow(2, attempt), 30000);

          options?.onProgress?.({
            completed: attempt + 1,
            total: maxRetries + 1,
            message: `Retrying in ${delay / 1000} seconds...`,
          });

          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  private static async replayBlockTransactionsWithProgress(
    request: ReplayBlockRequest,
    options?: {
      onProgress?: (progress: {
        completed: number;
        total: number;
        message: string;
      }) => void;
      abortSignal?: AbortSignal;
    },
  ): Promise<ReplayBlockResult> {
    const { blockIdentifier, tracers, network = "mainnet" } = request;

    this.validateBlockIdentifier(blockIdentifier);
    this.validateTracers(tracers);

    try {
      await blockchainService.connect(network);
      const provider = blockchainService.getProvider();

      if (!provider) {
        throw new Error("Provider not available");
      }

      const blockParam = this.formatBlockIdentifier(blockIdentifier);

      options?.onProgress?.({
        completed: 1,
        total: 4,
        message: "Fetching block information...",
      });

      const blockInfo = await provider.send("eth_getBlockByNumber", [
        blockParam,
        false,
      ]);
      const txCount = blockInfo?.transactions?.length || 0;

      if (options?.abortSignal?.aborted) {
        throw new ReplayError(
          ERROR_CODES.OPERATION_CANCELLED,
          "Operation was cancelled",
        );
      }

      options?.onProgress?.({
        completed: 2,
        total: 4,
        message: `Processing ${txCount} transactions...`,
      });

      const params = [blockParam, tracers];

      const result = await Promise.race([
        provider.send(RPC_METHODS.replayBlockTransactions.method, params),
        this.createTimeoutPromise(RPC_METHODS.replayBlockTransactions.timeout),
        this.createCancellationPromise(options?.abortSignal),
      ]);

      options?.onProgress?.({
        completed: 4,
        total: 4,
        message: "Processing complete",
      });

      return this.validateReplayBlockResult(result);
    } catch (error) {
      throw this.handleRpcError(error, "replayBlockTransactions");
    }
  }

  static getEstimatedCost(
    operation: "transaction" | "block",
    transactionCount: number = 1,
  ): {
    costMultiplier: number;
    estimatedTime: string;
    recommendation: string;
  } {
    if (operation === "transaction") {
      return {
        costMultiplier: RPC_METHODS.replayTransaction.costMultiplier,
        estimatedTime: "30-60 seconds",
        recommendation: "Use for detailed analysis of specific transactions",
      };
    } else {
      return {
        costMultiplier:
          RPC_METHODS.replayBlockTransactions.costMultiplier * transactionCount,
        estimatedTime: `${Math.ceil(transactionCount / 10)}-${Math.ceil(transactionCount / 5)} minutes`,
        recommendation:
          transactionCount > 50
            ? "Consider analyzing smaller block ranges or specific transactions"
            : "Suitable for comprehensive block analysis",
      };
    }
  }

  private static validateTransactionHash(txHash: string): void {
    if (!txHash || typeof txHash !== "string") {
      throw new ReplayError(
        ERROR_CODES.INVALID_TX_HASH,
        "Transaction hash is required",
      );
    }

    if (!txHash.startsWith("0x")) {
      throw new ReplayError(
        ERROR_CODES.INVALID_TX_HASH,
        "Transaction hash must start with 0x",
      );
    }

    if (txHash.length !== 66) {
      throw new ReplayError(
        ERROR_CODES.INVALID_TX_HASH,
        "Transaction hash must be 66 characters long",
      );
    }

    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      throw new ReplayError(
        ERROR_CODES.INVALID_TX_HASH,
        "Invalid transaction hash format",
      );
    }
  }

  private static validateBlockIdentifier(blockId: string | number): void {
    if (blockId === null || blockId === undefined) {
      throw new ReplayError(
        ERROR_CODES.INVALID_BLOCK_ID,
        "Block identifier is required",
      );
    }

    if (typeof blockId === "number") {
      if (blockId < 0 || !Number.isInteger(blockId)) {
        throw new ReplayError(
          ERROR_CODES.INVALID_BLOCK_ID,
          "Block number must be a non-negative integer",
        );
      }
    } else if (typeof blockId === "string") {
      if (blockId.startsWith("0x")) {
        if (blockId.length === 66) {
          if (!/^0x[a-fA-F0-9]{64}$/.test(blockId)) {
            throw new ReplayError(
              ERROR_CODES.INVALID_BLOCK_ID,
              "Invalid block hash format",
            );
          }
        } else {
          if (!/^0x[a-fA-F0-9]+$/.test(blockId)) {
            throw new ReplayError(
              ERROR_CODES.INVALID_BLOCK_ID,
              "Invalid hex block number format",
            );
          }
        }
      } else if (/^\d+$/.test(blockId)) {
        const num = parseInt(blockId, 10);
        if (num < 0) {
          throw new ReplayError(
            ERROR_CODES.INVALID_BLOCK_ID,
            "Block number must be non-negative",
          );
        }
      } else {
        throw new ReplayError(
          ERROR_CODES.INVALID_BLOCK_ID,
          "Invalid block identifier format",
        );
      }
    } else {
      throw new ReplayError(
        ERROR_CODES.INVALID_BLOCK_ID,
        "Block identifier must be a number or string",
      );
    }
  }

  private static validateTracers(tracers: ReplayTracer[]): void {
    if (!Array.isArray(tracers) || tracers.length === 0) {
      throw new ReplayError(
        ERROR_CODES.UNSUPPORTED_TRACER,
        "At least one tracer must be specified",
      );
    }

    const validTracers: ReplayTracer[] = ["trace", "stateDiff", "vmTrace"];
    const invalidTracers = tracers.filter(
      (tracer) => !validTracers.includes(tracer),
    );

    if (invalidTracers.length > 0) {
      throw new ReplayError(
        ERROR_CODES.UNSUPPORTED_TRACER,
        `Unsupported tracers: ${invalidTracers.join(", ")}. Valid tracers: ${validTracers.join(", ")}`,
      );
    }
  }

  private static formatBlockIdentifier(blockId: string | number): string {
    if (typeof blockId === "number") {
      return `0x${blockId.toString(16)}`;
    }

    if (typeof blockId === "string") {
      if (blockId.startsWith("0x")) {
        return blockId;
      } else if (/^\d+$/.test(blockId)) {
        return `0x${parseInt(blockId, 10).toString(16)}`;
      }
    }

    return blockId.toString();
  }

  private static validateReplayTransactionResult(
    result: any,
  ): ReplayTransactionResult {
    if (!result || typeof result !== "object") {
      throw new ReplayError(
        ERROR_CODES.PARSING_ERROR,
        "Invalid replay transaction result format",
      );
    }

    const validatedResult: ReplayTransactionResult = {};

    if (result.trace !== undefined) {
      if (!Array.isArray(result.trace)) {
        throw new ReplayError(
          ERROR_CODES.PARSING_ERROR,
          "Trace result must be an array",
        );
      }
      validatedResult.trace = result.trace;
    }

    if (result.stateDiff !== undefined) {
      if (typeof result.stateDiff !== "object") {
        throw new ReplayError(
          ERROR_CODES.PARSING_ERROR,
          "StateDiff result must be an object",
        );
      }
      validatedResult.stateDiff = result.stateDiff;
    }

    if (result.vmTrace !== undefined) {
      if (typeof result.vmTrace !== "object") {
        throw new ReplayError(
          ERROR_CODES.PARSING_ERROR,
          "VmTrace result must be an object",
        );
      }
      validatedResult.vmTrace = result.vmTrace;
    }

    return validatedResult;
  }

  private static validateReplayBlockResult(result: any): ReplayBlockResult {
    if (!Array.isArray(result)) {
      throw new ReplayError(
        ERROR_CODES.PARSING_ERROR,
        "Replay block result must be an array",
      );
    }

    const validatedResult: ReplayBlockResult = {};

    result.forEach((txResult, index) => {
      validatedResult[index] = this.validateReplayTransactionResult(txResult);
    });

    return validatedResult;
  }

  private static createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(
          new ReplayError(
            ERROR_CODES.TIMEOUT,
            `Operation timed out after ${timeout}ms`,
          ),
        );
      }, timeout);
    });
  }

  private static createCancellationPromise(
    abortSignal?: AbortSignal,
  ): Promise<never> {
    return new Promise((_, reject) => {
      if (abortSignal) {
        abortSignal.addEventListener("abort", () => {
          reject(
            new ReplayError(
              ERROR_CODES.OPERATION_CANCELLED,
              "Operation was cancelled",
            ),
          );
        });
      }
    });
  }

  private static handleRpcError(error: any, operation: string): ReplayError {
    if (error instanceof ReplayError) {
      return error;
    }

    if (error.code === -32602) {
      return new ReplayError(
        ERROR_CODES.VALIDATION_ERROR,
        "Invalid RPC parameters",
      );
    }

    if (error.code === -32603) {
      return new ReplayError(ERROR_CODES.RPC_ERROR, "Internal RPC error");
    }

    if (error.code === 429) {
      return new ReplayError(ERROR_CODES.RATE_LIMITED, "Rate limit exceeded");
    }

    if (error.message?.includes("timeout")) {
      return new ReplayError(ERROR_CODES.TIMEOUT, "RPC request timed out");
    }

    if (error.message?.includes("network")) {
      return new ReplayError(
        ERROR_CODES.NETWORK_ERROR,
        "Network connection error",
      );
    }

    return new ReplayError(
      ERROR_CODES.RPC_ERROR,
      `${operation} failed: ${error.message || "Unknown error"}`,
    );
  }

  private static isValidationError(error: any): boolean {
    return (
      error instanceof ReplayError &&
      [
        ERROR_CODES.INVALID_TX_HASH,
        ERROR_CODES.INVALID_BLOCK_ID,
        ERROR_CODES.UNSUPPORTED_TRACER,
        ERROR_CODES.VALIDATION_ERROR,
      ].includes(error.code)
    );
  }
}

class ReplayError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, any>,
  ) {
    super(message);
    this.name = "ReplayError";
  }
}
