import { ethers } from "ethers";
import {
  categorizeTransaction,
  formatEther,
  formatAddress,
  generateCacheKey,
} from "../utils";
import { PYUSD_CONTRACTS, FUNCTION_SIGNATURES } from "../constants";
import type {
  RawBlockTrace,
  ProcessedBlockTrace,
  TransactionCategory,
  PYUSDTransactionDetails,
  NetworkType,
} from "../types";

export class BlockTraceProcessor {
  private network: NetworkType;

  constructor(network: NetworkType = "mainnet") {
    this.network = network;
  }

  /**
   * Process raw block traces into structured data
   */
  async processTraces(
    rawTraces: RawBlockTrace[]
  ): Promise<ProcessedBlockTrace[]> {
    console.log(`Processing ${rawTraces.length} raw traces...`);

    const processedTraces: ProcessedBlockTrace[] = [];

    for (let i = 0; i < rawTraces.length; i++) {
      try {
        const processed = await this.processTrace(rawTraces[i], i);
        if (processed) {
          processedTraces.push(processed);
        }
      } catch (error) {
        console.warn(`Failed to process trace ${i}:`, error);
        // Create a failed trace entry
        const failedTrace = this.createFailedTrace(rawTraces[i], i, error);
        processedTraces.push(failedTrace);
      }
    }

    console.log(`Successfully processed ${processedTraces.length} traces`);
    return processedTraces;
  }

  /**
   * Process a single trace
   */
  private async processTrace(
    trace: RawBlockTrace,
    index: number
  ): Promise<ProcessedBlockTrace | null> {
    if (!trace.action) {
      return null;
    }

    const {
      action,
      result,
      error,
      transactionHash,
      transactionPosition,
      blockNumber,
      type,
      traceAddress,
    } = trace;

    // Parse values
    const value = BigInt(action.value || "0");
    const gas = BigInt(action.gas || "0");
    const gasUsed = result ? BigInt(result.gasUsed || "0") : 0n;

    // Determine trace type
    const traceType = this.determineTraceType(trace);

    // Calculate depth from trace address
    const depth = traceAddress ? traceAddress.length : 0;

    // Categorize transaction
    const category = categorizeTransaction(
      action.to || null,
      value,
      action.input || "0x",
      this.network
    );

    // Extract PYUSD details if applicable
    let pyusdDetails: PYUSDTransactionDetails | undefined;
    if (category.type === "pyusd_transaction" && action.to) {
      pyusdDetails = await this.extractPYUSDDetails(trace);
    }

    const processedTrace: ProcessedBlockTrace = {
      id: `${transactionHash}-${traceAddress?.join("-") || index}`,
      transactionHash,
      transactionIndex: transactionPosition,
      traceAddress: traceAddress || [],
      type: traceType,
      from: action.from,
      to: action.to,
      value,
      valueEth: parseFloat(formatEther(value)),
      gas,
      gasUsed,
      input: action.input || "0x",
      output: result?.output,
      error: error || undefined,
      success: !error,
      callType: action.callType,
      depth,
      category,
      pyusdDetails,
    };

    return processedTrace;
  }

  /**
   * Determine the trace type from raw trace data
   */
  private determineTraceType(
    trace: RawBlockTrace
  ): "call" | "create" | "suicide" | "reward" {
    if (trace.type) {
      switch (trace.type.toLowerCase()) {
        case "call":
          return "call";
        case "create":
          return "create";
        case "suicide":
        case "selfdestruct":
          return "suicide";
        case "reward":
          return "reward";
        default:
          return "call";
      }
    }

    // Fallback logic
    if (!trace.action.to) {
      return "create";
    }

    return "call";
  }

  /**
   * Extract PYUSD transaction details
   */
  private async extractPYUSDDetails(
    trace: RawBlockTrace
  ): Promise<PYUSDTransactionDetails | undefined> {
    const { action, result, error } = trace;

    if (!action.to || !action.input) {
      return undefined;
    }

    // Check if this is a PYUSD contract
    const pyusdAddress = PYUSD_CONTRACTS[this.network];
    if (action.to.toLowerCase() !== pyusdAddress.toLowerCase()) {
      return undefined;
    }

    const input = action.input;
    const functionSignature = input.slice(0, 10).toLowerCase();

    // Decode function based on signature
    let functionName = "unknown";
    let decodedParams: Record<string, any> = {};

    try {
      switch (functionSignature) {
        case FUNCTION_SIGNATURES.transfer:
          functionName = "transfer";
          decodedParams = this.decodeFunctionParameters(input, "transfer");
          break;
        case FUNCTION_SIGNATURES.transferFrom:
          functionName = "transferFrom";
          decodedParams = this.decodeFunctionParameters(input, "transferFrom");
          break;
        case FUNCTION_SIGNATURES.approve:
          functionName = "approve";
          decodedParams = this.decodeFunctionParameters(input, "approve");
          break;
        case FUNCTION_SIGNATURES.mint:
          functionName = "mint";
          decodedParams = this.decodeFunctionParameters(input, "mint");
          break;
        case FUNCTION_SIGNATURES.burn:
          functionName = "burn";
          decodedParams = this.decodeFunctionParameters(input, "burn");
          break;
        default:
          functionName = functionSignature;
      }
    } catch (decodeError) {
      console.warn(`Failed to decode PYUSD function parameters:`, decodeError);
    }

    // Determine transaction type
    let transactionType: PYUSDTransactionDetails["type"] = "other";
    if (["transfer", "transferFrom"].includes(functionName)) {
      transactionType = functionName as "transfer" | "transferFrom";
    } else if (functionName === "approve") {
      transactionType = "approve";
    } else if (functionName === "mint") {
      transactionType = "mint";
    } else if (functionName === "burn") {
      transactionType = "burn";
    }

    // Extract amount (most PYUSD functions have amount as last parameter)
    let amount = 0n;
    let amountFormatted = "0";

    if (decodedParams.amount || decodedParams.value) {
      amount = BigInt(decodedParams.amount || decodedParams.value || "0");
      amountFormatted = this.formatPYUSDAmount(amount);
    }

    const pyusdDetails: PYUSDTransactionDetails = {
      type: transactionType,
      from: decodedParams.from || action.from,
      to: decodedParams.to,
      spender: decodedParams.spender,
      amount,
      amountFormatted,
      functionSignature,
      parameters: decodedParams,
      events: [], // TODO: Extract from logs if available
      success: !error,
      gasUsed: result ? BigInt(result.gasUsed || "0") : 0n,
    };

    return pyusdDetails;
  }

  /**
   * Decode function parameters based on function name
   */
  private decodeFunctionParameters(
    input: string,
    functionName: string
  ): Record<string, any> {
    if (input.length < 10) {
      return {};
    }

    const paramData = input.slice(10); // Remove function signature

    try {
      switch (functionName) {
        case "transfer":
          // transfer(address to, uint256 amount)
          if (paramData.length >= 128) {
            const to = "0x" + paramData.slice(24, 64);
            const amount = "0x" + paramData.slice(64, 128);
            return {
              to: ethers.getAddress(to),
              amount: BigInt(amount).toString(),
            };
          }
          break;

        case "transferFrom":
          // transferFrom(address from, address to, uint256 amount)
          if (paramData.length >= 192) {
            const from = "0x" + paramData.slice(24, 64);
            const to = "0x" + paramData.slice(88, 128);
            const amount = "0x" + paramData.slice(128, 192);
            return {
              from: ethers.getAddress(from),
              to: ethers.getAddress(to),
              amount: BigInt(amount).toString(),
            };
          }
          break;

        case "approve":
          // approve(address spender, uint256 amount)
          if (paramData.length >= 128) {
            const spender = "0x" + paramData.slice(24, 64);
            const amount = "0x" + paramData.slice(64, 128);
            return {
              spender: ethers.getAddress(spender),
              amount: BigInt(amount).toString(),
            };
          }
          break;

        case "mint":
          // mint(address to, uint256 amount)
          if (paramData.length >= 128) {
            const to = "0x" + paramData.slice(24, 64);
            const amount = "0x" + paramData.slice(64, 128);
            return {
              to: ethers.getAddress(to),
              amount: BigInt(amount).toString(),
            };
          }
          break;

        case "burn":
          // burn(uint256 amount)
          if (paramData.length >= 64) {
            const amount = "0x" + paramData.slice(0, 64);
            return {
              amount: BigInt(amount).toString(),
            };
          }
          break;
      }
    } catch (error) {
      console.warn(`Failed to decode ${functionName} parameters:`, error);
    }

    return {};
  }

  /**
   * Format PYUSD amount (6 decimals)
   */
  private formatPYUSDAmount(amount: bigint): string {
    const divisor = 10n ** 6n; // PYUSD has 6 decimals
    const wholePart = amount / divisor;
    const fractionalPart = amount % divisor;

    if (fractionalPart === 0n) {
      return `${wholePart.toString()} PYUSD`;
    }

    const fractionalStr = fractionalPart.toString().padStart(6, "0");
    const trimmedFractional = fractionalStr.replace(/0+$/, "");

    if (trimmedFractional === "") {
      return `${wholePart.toString()} PYUSD`;
    }

    return `${wholePart.toString()}.${trimmedFractional} PYUSD`;
  }

  /**
   * Create a failed trace entry for error handling
   */
  private createFailedTrace(
    trace: RawBlockTrace,
    index: number,
    error: any
  ): ProcessedBlockTrace {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      id: `failed-${trace.transactionHash || "unknown"}-${index}`,
      transactionHash: trace.transactionHash || "unknown",
      transactionIndex: trace.transactionPosition || 0,
      traceAddress: trace.traceAddress || [],
      type: "call",
      from: trace.action?.from || "unknown",
      to: trace.action?.to,
      value: 0n,
      valueEth: 0,
      gas: 0n,
      gasUsed: 0n,
      input: trace.action?.input || "0x",
      output: undefined,
      error: `Processing failed: ${errorMessage}`,
      success: false,
      callType: trace.action?.callType,
      depth: 0,
      category: {
        type: "other",
        subtype: "failed",
        description: "Failed to process trace",
        confidence: 0,
      },
    };
  }

  /**
   * Get processing statistics
   */
  getProcessingStats(traces: ProcessedBlockTrace[]): {
    totalTraces: number;
    successfulTraces: number;
    failedTraces: number;
    pyusdTraces: number;
    categoryDistribution: Record<string, number>;
  } {
    const stats = {
      totalTraces: traces.length,
      successfulTraces: traces.filter((t) => t.success).length,
      failedTraces: traces.filter((t) => !t.success).length,
      pyusdTraces: traces.filter((t) => t.pyusdDetails).length,
      categoryDistribution: {} as Record<string, number>,
    };

    // Calculate category distribution
    traces.forEach((trace) => {
      const category = trace.category.type;
      stats.categoryDistribution[category] =
        (stats.categoryDistribution[category] || 0) + 1;
    });

    return stats;
  }

  /**
   * Filter traces by criteria
   */
  filterTraces(
    traces: ProcessedBlockTrace[],
    criteria: {
      onlySuccessful?: boolean;
      onlyPYUSD?: boolean;
      minValue?: bigint;
      maxValue?: bigint;
      categories?: string[];
    }
  ): ProcessedBlockTrace[] {
    let filtered = traces;

    if (criteria.onlySuccessful) {
      filtered = filtered.filter((t) => t.success);
    }

    if (criteria.onlyPYUSD) {
      filtered = filtered.filter((t) => t.pyusdDetails);
    }

    if (criteria.minValue !== undefined) {
      filtered = filtered.filter((t) => t.value >= criteria.minValue!);
    }

    if (criteria.maxValue !== undefined) {
      filtered = filtered.filter((t) => t.value <= criteria.maxValue!);
    }

    if (criteria.categories && criteria.categories.length > 0) {
      filtered = filtered.filter((t) =>
        criteria.categories!.includes(t.category.type)
      );
    }

    return filtered;
  }
}
