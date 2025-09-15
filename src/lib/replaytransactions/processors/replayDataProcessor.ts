import type {
  ContractInteraction,
  FunctionCall,
  OptimizationSuggestion,
  ProcessedReplayData,
  ReplayTransactionResult,
  SecurityFlag,
  StateDiffAnalysis,
  StateDiffResult,
  TokenAnalysis,
  TokenTransfer,
  TraceAnalysis,
  TraceResult,
  VmTraceAnalysis,
  VmTraceResult,
} from "../types";
import {
  categorizeGasUsage,
  getFunctionSignature,
  getOpcodeCategory,
  getTokenConfig,
  KNOWN_TOKENS,
  SECURITY_THRESHOLDS,
} from "../constants";

export class ReplayDataProcessor {
  static processReplayResult(
    replayResult: ReplayTransactionResult,
    txHash: string,
    network: string = "mainnet",
  ): ProcessedReplayData {
    const processedData: ProcessedReplayData = {
      transactionHash: txHash,
      network,
      timestamp: Date.now(),
      tracersUsed: [],
      securityFlags: [],
      performanceMetrics: {
        gasEfficiency: 0,
        optimizationSuggestions: [],
        gasBreakdown: [],
        costAnalysis: {
          totalGasUsed: 0,
          gasPrice: BigInt(0),
          totalCostWei: BigInt(0),
          totalCostEth: 0,
          totalCostUSD: 0,
          breakdown: {
            execution: 0,
            storage: 0,
            transfer: 0,
            other: 0,
          },
        },
      },
    };

    if (replayResult.trace) processedData.tracersUsed.push("trace");
    if (replayResult.stateDiff) processedData.tracersUsed.push("stateDiff");
    if (replayResult.vmTrace) processedData.tracersUsed.push("vmTrace");

    if (replayResult.trace) {
      processedData.traceAnalysis = this.processTraceData(
        replayResult.trace,
        txHash,
      );
    }

    if (replayResult.stateDiff) {
      processedData.stateDiffAnalysis = this.processStateDiffData(
        replayResult.stateDiff,
        txHash,
      );
    }

    if (replayResult.vmTrace) {
      processedData.vmTraceAnalysis = this.processVmTraceData(
        replayResult.vmTrace,
      );
    }

    processedData.tokenAnalysis = this.generateTokenAnalysis(processedData);

    processedData.securityFlags = this.performSecurityAnalysis(processedData);

    processedData.performanceMetrics =
      this.calculatePerformanceMetrics(processedData);

    return processedData;
  }

  private static processTraceData(
    trace: TraceResult[],
    txHash: string,
  ): TraceAnalysis {
    const contractInteractions = new Map<string, ContractInteraction>();
    const functionCalls: FunctionCall[] = [];
    const valueTransfers: any[] = [];
    const callHierarchy: any[] = [];

    let totalGasUsed = 0;
    let maxDepth = 0;
    let errorCount = 0;

    trace.forEach((traceItem, index) => {
      const { action, result, error, type, traceAddress } = traceItem;

      if (!action) return;

      const { from, to, value, gas, input, callType } = action;
      const gasUsed = result?.gasUsed ? parseInt(result.gasUsed, 16) : 0;
      const depth = traceAddress.length;

      totalGasUsed += gasUsed;
      maxDepth = Math.max(maxDepth, depth);
      if (error) errorCount++;

      const isTokenContract = to && this.isKnownTokenContract(to);
      const tokenConfig = isTokenContract ? getTokenConfig(to) : undefined;

      if (to) {
        const existing = contractInteractions.get(to);
        if (existing) {
          existing.callCount++;
          existing.gasUsed += gasUsed;
          if (input && input !== "0x") {
            const methodSig = input.slice(0, 10);
            const functionInfo = getFunctionSignature(methodSig);
            if (
              functionInfo &&
              !existing.functions.includes(functionInfo.name)
            ) {
              existing.functions.push(functionInfo.name);
            }
          }
        } else {
          const functions: string[] = [];
          if (input && input !== "0x") {
            const methodSig = input.slice(0, 10);
            const functionInfo = getFunctionSignature(methodSig);
            if (functionInfo) {
              functions.push(functionInfo.name);
            }
          }

          contractInteractions.set(to, {
            address: to,
            name: tokenConfig?.name || `Contract ${to.slice(0, 8)}...`,
            callCount: 1,
            gasUsed,
            functions,
            isToken: isTokenContract,
          });
        }
      }

      if (input && input !== "0x" && input.length >= 10) {
        const methodSig = input.slice(0, 10);
        const functionInfo = getFunctionSignature(methodSig);

        if (functionInfo) {
          const gasCategory = categorizeGasUsage(gasUsed, functionInfo.name);

          functionCalls.push({
            signature: methodSig,
            name: functionInfo.name,
            category: functionInfo.category,
            count: 1,
            gasUsed,
            success: !error,
            contractAddress: to || "",
          });
        }
      }

      if (value && value !== "0x0") {
        const valueWei = BigInt(value);
        if (valueWei > 0) {
          valueTransfers.push({
            from: from || "",
            to: to || "",
            value: valueWei,
            gasUsed,
            traceIndex: index,
            success: !error,
          });
        }
      }
    });

    return {
      totalCalls: trace.length,
      maxDepth,
      totalGasUsed,
      errorCount,
      contractInteractions: Array.from(contractInteractions.values()),
      functionCalls,
      valueTransfers,
      callHierarchy,
    };
  }

  private static processStateDiffData(
    stateDiff: StateDiffResult,
    txHash: string,
  ): StateDiffAnalysis {
    const balanceChanges: any[] = [];
    const storageChanges: any[] = [];
    const codeChanges: any[] = [];
    const nonceChanges: any[] = [];
    const contractsAffected: string[] = [];
    const tokenStateChanges: any[] = [];

    let totalChanges = 0;

    Object.entries(stateDiff).forEach(([address, changes]) => {
      contractsAffected.push(address);
      const isTokenContract = this.isKnownTokenContract(address);
      const tokenConfig = isTokenContract ? getTokenConfig(address) : undefined;

      if (changes.balance?.["*"]) {
        const { from, to } = changes.balance["*"];
        const fromBalance = BigInt(from);
        const toBalance = BigInt(to);
        const change = toBalance - fromBalance;

        balanceChanges.push({
          address,
          contractName:
            tokenConfig?.name || `Contract ${address.slice(0, 8)}...`,
          fromBalance,
          toBalance,
          change,
          changeEth: Number(change) / 1e18,
        });

        totalChanges++;
      }

      if (changes.nonce?.["*"]) {
        const { from, to } = changes.nonce["*"];
        const fromNonce = parseInt(from, 16);
        const toNonce = parseInt(to, 16);

        nonceChanges.push({
          address,
          fromNonce,
          toNonce,
          change: toNonce - fromNonce,
        });

        totalChanges++;
      }

      if (changes.code?.["*"]) {
        const { from, to } = changes.code["*"];
        let changeType: "created" | "destroyed" | "modified" = "modified";

        if (!from && to) changeType = "created";
        else if (from && !to) changeType = "destroyed";

        codeChanges.push({
          address,
          contractName:
            tokenConfig?.name || `Contract ${address.slice(0, 8)}...`,
          changeType,
          fromCodeHash: from ? this.hashCode(from) : undefined,
          toCodeHash: to ? this.hashCode(to) : undefined,
        });

        totalChanges++;
      }

      if (changes.storage) {
        Object.entries(changes.storage).forEach(([slot, slotChange]) => {
          if (slotChange["*"]) {
            const { from, to } = slotChange["*"];
            const interpretation = this.interpretStorageSlot(
              slot,
              to,
              address,
              tokenConfig,
            );

            storageChanges.push({
              address,
              contractName:
                tokenConfig?.name || `Contract ${address.slice(0, 8)}...`,
              slot,
              fromValue: from,
              toValue: to,
              interpretation,
            });

            if (isTokenContract && interpretation) {
              tokenStateChanges.push({
                tokenAddress: address,
                tokenSymbol: tokenConfig?.symbol,
                changeType: interpretation.type,
                affectedAddress: interpretation.metadata?.holderAddress,
                fromValue: from,
                toValue: to,
                change: this.calculateStorageChange(
                  from,
                  to,
                  interpretation.type,
                ),
                formattedChange: interpretation.formattedValue,
              });
            }

            totalChanges++;
          }
        });
      }
    });

    return {
      totalChanges,
      balanceChanges,
      storageChanges,
      codeChanges,
      nonceChanges,
      contractsAffected,
      tokenStateChanges,
    };
  }

  private static processVmTraceData(vmTrace: VmTraceResult): VmTraceAnalysis {
    const gasUsed = parseInt(vmTrace.gasUsed, 16);
    const totalSteps = vmTrace.ops.length;

    const opcodeDistribution = new Map<
      string,
      { count: number; gasUsed: number }
    >();
    let memoryOperations = 0;
    let storageOperations = 0;
    let stackOperations = 0;

    vmTrace.ops.forEach((op) => {
      const opcode = op.op;
      const opGas = op.cost || 0;

      const existing = opcodeDistribution.get(opcode);
      if (existing) {
        existing.count++;
        existing.gasUsed += opGas;
      } else {
        opcodeDistribution.set(opcode, { count: 1, gasUsed: opGas });
      }

      const category = getOpcodeCategory(opcode);
      switch (category) {
        case "memory":
          memoryOperations++;
          break;
        case "storage":
          storageOperations++;
          break;
        case "stack":
          stackOperations++;
          break;
      }
    });

    const opcodeDistributionArray = Array.from(opcodeDistribution.entries())
      .map(([opcode, data]) => ({
        opcode,
        count: data.count,
        gasUsed: data.gasUsed,
        percentage: (data.gasUsed / gasUsed) * 100,
      }))
      .sort((a, b) => b.gasUsed - a.gasUsed);

    const topGasOpcodes = opcodeDistributionArray.slice(0, 10);

    return {
      totalSteps,
      gasUsed,
      opcodeDistribution: opcodeDistributionArray,
      memoryOperations,
      storageOperations,
      stackOperations,
      topGasOpcodes,
    };
  }

  private static generateTokenAnalysis(
    processedData: ProcessedReplayData,
  ): TokenAnalysis {
    const tokenTransfers: TokenTransfer[] = [];
    const balanceChanges: any[] = [];
    const supplyChanges: any[] = [];
    const allowanceChanges: any[] = [];
    const uniqueAddresses = new Set<string>();
    let totalVolume = 0;

    if (processedData.traceAnalysis) {
      processedData.traceAnalysis.functionCalls.forEach((call) => {
        if (this.isTokenTransferFunction(call.name)) {
          const tokenConfig = getTokenConfig(call.contractAddress);
          if (tokenConfig) {
            uniqueAddresses.add(call.contractAddress);
          }
        }
      });
    }

    if (processedData.stateDiffAnalysis) {
      processedData.stateDiffAnalysis.tokenStateChanges.forEach((change) => {
        uniqueAddresses.add(change.tokenAddress);
        const volume = Math.abs(parseFloat(change.formattedChange) || 0);
        totalVolume += volume;

        if (change.changeType === "balance") {
          balanceChanges.push({
            tokenAddress: change.tokenAddress,
            tokenSymbol: change.tokenSymbol,
            holderAddress: change.affectedAddress || "",
            fromBalance: BigInt(change.fromValue),
            toBalance: BigInt(change.toValue),
            change: BigInt(change.change),
            formattedChange: parseFloat(change.formattedChange) || 0,
            storageSlot: "",
          });
        }
      });
    }

    return {
      hasTokenInteraction: uniqueAddresses.size > 0,
      tokenTransfers,
      balanceChanges,
      supplyChanges,
      allowanceChanges,
      totalVolume,
      uniqueAddresses: Array.from(uniqueAddresses),
    };
  }

  private static performSecurityAnalysis(
    processedData: ProcessedReplayData,
  ): SecurityFlag[] {
    const flags: SecurityFlag[] = [];

    if (processedData.traceAnalysis) {
      processedData.traceAnalysis.functionCalls.forEach((call) => {
        if (call.category === "admin") {
          flags.push({
            level: "warning",
            type: "admin_function",
            description: `Admin function ${call.name} called on contract`,
            details: {
              function: call.name,
              contract: call.contractAddress,
              gasUsed: call.gasUsed,
            },
            txHash: processedData.transactionHash,
          });
        }
      });
    }

    if (processedData.stateDiffAnalysis) {
      processedData.stateDiffAnalysis.codeChanges.forEach((change) => {
        flags.push({
          level: "critical",
          type: "code_change",
          description: `Contract code was ${change.changeType}`,
          details: {
            address: change.address,
            changeType: change.changeType,
          },
          txHash: processedData.transactionHash,
        });
      });
    }

    if (processedData.tokenAnalysis) {
      const largeTransfers = processedData.tokenAnalysis.balanceChanges.filter(
        (change) =>
          Math.abs(change.formattedChange) > SECURITY_THRESHOLDS.largeTransfer,
      );

      largeTransfers.forEach((transfer) => {
        flags.push({
          level: "info",
          type: "supply_change",
          description: `Large token transfer detected: ${Math.abs(transfer.formattedChange).toLocaleString()} tokens`,
          details: {
            amount: transfer.formattedChange,
            token: transfer.tokenSymbol,
          },
          txHash: processedData.transactionHash,
        });
      });
    }

    return flags;
  }

  private static calculatePerformanceMetrics(
    processedData: ProcessedReplayData,
  ): any {
    let gasEfficiency = 70;
    const optimizationSuggestions: OptimizationSuggestion[] = [];
    const gasBreakdown: any[] = [];

    let totalGasUsed = 0;
    if (processedData.traceAnalysis) {
      totalGasUsed = processedData.traceAnalysis.totalGasUsed;
    } else if (processedData.vmTraceAnalysis) {
      totalGasUsed = processedData.vmTraceAnalysis.gasUsed;
    }

    if (processedData.traceAnalysis) {
      const errorRate =
        processedData.traceAnalysis.errorCount /
        processedData.traceAnalysis.totalCalls;
      gasEfficiency -= errorRate * 30;

      if (processedData.traceAnalysis.maxDepth > 10) {
        gasEfficiency -= 10;
        optimizationSuggestions.push({
          id: "deep-call-stack",
          type: "gas",
          severity: "medium",
          title: "Deep Call Stack Detected",
          description:
            "Transaction has a deep call stack which can increase gas costs",
          recommendation:
            "Consider flattening the call structure or reducing nested calls",
          potentialSavings: {
            gas: Math.floor(totalGasUsed * 0.05),
            percentage: 5,
            costUSD: 0,
          },
        });
      }
    }

    if (processedData.vmTraceAnalysis) {
      const storageOpsRatio =
        processedData.vmTraceAnalysis.storageOperations /
        processedData.vmTraceAnalysis.totalSteps;

      if (storageOpsRatio > 0.2) {
        gasEfficiency -= 15;
        optimizationSuggestions.push({
          id: "excessive-storage-ops",
          type: "gas",
          severity: "high",
          title: "Excessive Storage Operations",
          description: "High ratio of storage operations detected",
          recommendation:
            "Consider using memory variables or optimizing storage access patterns",
          potentialSavings: {
            gas: Math.floor(totalGasUsed * 0.15),
            percentage: 15,
            costUSD: 0,
          },
        });
      }

      const categories = new Map<string, number>();
      processedData.vmTraceAnalysis.opcodeDistribution.forEach((opcode) => {
        const category = getOpcodeCategory(opcode.opcode);
        categories.set(
          category,
          (categories.get(category) || 0) + opcode.gasUsed,
        );
      });

      Array.from(categories.entries()).forEach(([category, gasUsed]) => {
        gasBreakdown.push({
          category: category.charAt(0).toUpperCase() + category.slice(1),
          gasUsed,
          percentage: (gasUsed / totalGasUsed) * 100,
          description: this.getCategoryDescription(category),
        });
      });
    }

    gasEfficiency = Math.max(0, Math.min(100, gasEfficiency));

    return {
      gasEfficiency,
      optimizationSuggestions,
      gasBreakdown,
      costAnalysis: {
        totalGasUsed,
        gasPrice: BigInt(0),
        totalCostWei: BigInt(0),
        totalCostEth: 0,
        totalCostUSD: 0,
        breakdown: {
          execution: totalGasUsed * 0.6,
          storage: totalGasUsed * 0.25,
          transfer: totalGasUsed * 0.1,
          other: totalGasUsed * 0.05,
        },
      },
    };
  }

  private static isKnownTokenContract(address: string): boolean {
    return KNOWN_TOKENS.some(
      (token) => token.address.toLowerCase() === address.toLowerCase(),
    );
  }

  private static isTokenTransferFunction(functionName: string): boolean {
    return ["transfer", "transferFrom", "mint", "burn"].includes(functionName);
  }

  private static interpretStorageSlot(
    slot: string,
    value: string,
    contractAddress: string,
    tokenConfig?: any,
  ): any {
    const slotInt = parseInt(slot, 16);
    const valueInt = parseInt(value, 16);

    if (tokenConfig) {
      if (slotInt === 0) {
        return {
          type: "total_supply",
          description: "Total Supply",
          formattedValue: `${valueInt / 10 ** tokenConfig.decimals} ${tokenConfig.symbol}`,
          metadata: { rawValue: valueInt },
        };
      }
    }

    return {
      type: "unknown",
      description: "Unknown Storage",
      formattedValue: value,
      metadata: { rawValue: valueInt },
    };
  }

  private static calculateStorageChange(
    from: string,
    to: string,
    type: string,
  ): string {
    const fromInt = parseInt(from, 16);
    const toInt = parseInt(to, 16);
    return (toInt - fromInt).toString();
  }

  private static hashCode(code: string): string {
    let hash = 0;
    for (let i = 0; i < code.length; i++) {
      const char = code.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  private static getCategoryDescription(category: string): string {
    const descriptions: Record<string, string> = {
      arithmetic: "Mathematical operations and calculations",
      storage: "Storage reads and writes",
      memory: "Memory operations and data handling",
      stack: "Stack manipulation operations",
      flow: "Control flow and jumps",
      system: "System calls and external interactions",
      comparison: "Comparison and logical operations",
    };
    return descriptions[category] || "Other operations";
  }
}
