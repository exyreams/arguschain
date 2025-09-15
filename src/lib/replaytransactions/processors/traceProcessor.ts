import type {
  CallHierarchyNode,
  ContractInteraction,
  FunctionCall,
  SecurityFlag,
  TokenTransfer,
  TraceAnalysis,
  TraceResult,
  ValueTransfer,
} from "../types";
import {
  getFunctionSignature,
  getTokenConfig,
  SECURITY_THRESHOLDS,
} from "../constants";

export class TraceProcessor {
  static processTrace(trace: TraceResult[], txHash: string): TraceAnalysis {
    const contractInteractions = new Map<string, ContractInteraction>();
    const functionCalls: FunctionCall[] = [];
    const valueTransfers: ValueTransfer[] = [];
    const callHierarchy: CallHierarchyNode[] = [];
    const securityFlags: SecurityFlag[] = [];
    const tokenTransfers: TokenTransfer[] = [];

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

      if (to) {
        this.updateContractInteraction(
          contractInteractions,
          to,
          gasUsed,
          input,
        );
      }

      if (input && input.length >= 10) {
        const functionCall = this.processFunctionCall(
          input,
          to,
          from,
          gasUsed,
          !error,
          index,
        );
        if (functionCall) {
          functionCalls.push(functionCall);

          const securityFlag = this.checkSecurityFlag(functionCall, txHash);
          if (securityFlag) {
            securityFlags.push(securityFlag);
          }

          const tokenTransfer = this.processTokenTransfer(
            functionCall,
            from,
            to,
            gasUsed,
            index,
            !error,
          );
          if (tokenTransfer) {
            tokenTransfers.push(tokenTransfer);
          }
        }
      }

      if (value && value !== "0x0") {
        const valueTransfer: ValueTransfer = {
          from,
          to: to || "",
          value: BigInt(value),
          gasUsed,
          traceIndex: index,
          success: !error,
        };
        valueTransfers.push(valueTransfer);
      }

      const hierarchyNode = this.buildCallHierarchyNode(
        traceItem,
        index,
        gasUsed,
        depth,
      );
      if (hierarchyNode) {
        callHierarchy.push(hierarchyNode);
      }
    });

    const contractInteractionsArray = Array.from(contractInteractions.values());

    const hierarchyWithRelationships =
      this.buildHierarchyRelationships(callHierarchy);

    return {
      totalCalls: trace.length,
      maxDepth,
      totalGasUsed,
      errorCount,
      contractInteractions: contractInteractionsArray,
      functionCalls,
      valueTransfers,
      callHierarchy: hierarchyWithRelationships,
    };
  }

  private static updateContractInteraction(
    interactions: Map<string, ContractInteraction>,
    address: string,
    gasUsed: number,
    input?: string,
  ): void {
    const existing = interactions.get(address);
    const tokenConfig = getTokenConfig(address);

    if (existing) {
      existing.callCount++;
      existing.gasUsed += gasUsed;

      if (input && input.length >= 10) {
        const signature = input.slice(0, 10);
        const functionInfo = getFunctionSignature(signature);
        if (functionInfo && !existing.functions.includes(functionInfo.name)) {
          existing.functions.push(functionInfo.name);
        }
      }
    } else {
      const functions: string[] = [];
      if (input && input.length >= 10) {
        const signature = input.slice(0, 10);
        const functionInfo = getFunctionSignature(signature);
        if (functionInfo) {
          functions.push(functionInfo.name);
        }
      }

      interactions.set(address, {
        address,
        name: tokenConfig?.name || `Contract ${address.slice(0, 8)}...`,
        callCount: 1,
        gasUsed,
        functions,
        isToken: !!tokenConfig,
      });
    }
  }

  private static processFunctionCall(
    input: string,
    to: string,
    from: string,
    gasUsed: number,
    success: boolean,
    traceIndex: number,
  ): FunctionCall | null {
    if (input.length < 10) return null;

    const signature = input.slice(0, 10);
    const functionInfo = getFunctionSignature(signature);

    if (!functionInfo) {
      return {
        signature,
        name: "unknown",
        category: "unknown",
        count: 1,
        gasUsed,
        success,
        contractAddress: to,
      };
    }

    return {
      signature,
      name: functionInfo.name,
      category: functionInfo.category,
      count: 1,
      gasUsed,
      success,
      contractAddress: to,
    };
  }

  private static checkSecurityFlag(
    functionCall: FunctionCall,
    txHash: string,
  ): SecurityFlag | null {
    if (functionCall.category === "admin") {
      return {
        level: "warning",
        type: "admin_function",
        description: `Admin function ${functionCall.name} called`,
        details: {
          function: functionCall.name,
          contract: functionCall.contractAddress,
          gasUsed: functionCall.gasUsed,
        },
        txHash,
      };
    }

    if (functionCall.gasUsed > SECURITY_THRESHOLDS.highGasUsage) {
      return {
        level: "info",
        type: "suspicious_pattern",
        description: `High gas usage detected: ${functionCall.gasUsed.toLocaleString()} gas`,
        details: {
          function: functionCall.name,
          gasUsed: functionCall.gasUsed,
          threshold: SECURITY_THRESHOLDS.highGasUsage,
        },
        txHash,
      };
    }

    return null;
  }

  private static processTokenTransfer(
    functionCall: FunctionCall,
    from: string,
    to: string,
    gasUsed: number,
    traceIndex: number,
    success: boolean,
  ): TokenTransfer | null {
    const tokenConfig = getTokenConfig(to);
    if (!tokenConfig) return null;

    if (
      !["transfer", "transferFrom", "mint", "burn"].includes(functionCall.name)
    ) {
      return null;
    }

    return {
      tokenAddress: to,
      tokenSymbol: tokenConfig.symbol,
      from:
        functionCall.name === "mint"
          ? "0x0000000000000000000000000000000000000000"
          : from,
      to:
        functionCall.name === "burn"
          ? "0x0000000000000000000000000000000000000000"
          : to,
      value: BigInt(0),
      formattedValue: 0,
      functionType: functionCall.name as
        | "transfer"
        | "transferFrom"
        | "mint"
        | "burn",
      traceIndex,
      gasUsed,
      success,
    };
  }

  private static buildCallHierarchyNode(
    traceItem: TraceResult,
    index: number,
    gasUsed: number,
    depth: number,
  ): CallHierarchyNode | null {
    const { action, error, traceAddress } = traceItem;
    if (!action.to) return null;

    const tokenConfig = getTokenConfig(action.to);
    const functionInfo =
      action.input && action.input.length >= 10
        ? getFunctionSignature(action.input.slice(0, 10))
        : null;

    return {
      id: `call_${index}`,
      contractAddress: action.to,
      contractName: tokenConfig?.name || `Contract ${action.to.slice(0, 8)}...`,
      functionName: functionInfo?.name || "unknown",
      gasUsed,
      value: BigInt(action.value || "0"),
      success: !error,
      depth,
      children: [],
      traceAddress,
    };
  }

  private static buildHierarchyRelationships(
    nodes: CallHierarchyNode[],
  ): CallHierarchyNode[] {
    const nodeMap = new Map<string, CallHierarchyNode>();
    const rootNodes: CallHierarchyNode[] = [];

    nodes.forEach((node) => {
      nodeMap.set(node.id, node);
    });

    nodes.forEach((node) => {
      if (node.depth === 0) {
        rootNodes.push(node);
      } else {
        const parentTraceAddress = node.traceAddress.slice(0, -1);
        const parentNode = nodes.find(
          (n) =>
            n.traceAddress.length === parentTraceAddress.length &&
            n.traceAddress.every((addr, i) => addr === parentTraceAddress[i]),
        );

        if (parentNode) {
          node.parentId = parentNode.id;
          parentNode.children.push(node);
        }
      }
    });

    return rootNodes;
  }

  static generateOptimizationSuggestions(analysis: TraceAnalysis): Array<{
    id: string;
    type: "gas" | "performance";
    severity: "low" | "medium" | "high";
    title: string;
    description: string;
    recommendation: string;
    potentialSavings?: {
      gas: number;
      percentage: number;
    };
  }> {
    const suggestions = [];

    const highGasFunctions = analysis.functionCalls.filter(
      (call) => call.gasUsed > 100000,
    );

    if (highGasFunctions.length > 0) {
      suggestions.push({
        id: "high_gas_functions",
        type: "gas" as const,
        severity: "medium" as const,
        title: "High Gas Usage Functions Detected",
        description: `Found ${highGasFunctions.length} function calls using more than 100k gas`,
        recommendation: "Review these functions for optimization opportunities",
        potentialSavings: {
          gas: highGasFunctions.reduce((sum, fn) => sum + fn.gasUsed, 0) * 0.1,
          percentage: 10,
        },
      });
    }

    const failedCalls = analysis.functionCalls.filter((call) => !call.success);
    if (failedCalls.length > 0) {
      suggestions.push({
        id: "failed_calls",
        type: "performance" as const,
        severity: "high" as const,
        title: "Failed Function Calls",
        description: `${failedCalls.length} function calls failed during execution`,
        recommendation: "Investigate failed calls to prevent gas waste",
      });
    }

    if (analysis.maxDepth > 10) {
      suggestions.push({
        id: "deep_call_stack",
        type: "performance" as const,
        severity: "medium" as const,
        title: "Deep Call Stack Detected",
        description: `Maximum call depth of ${analysis.maxDepth} may indicate inefficient contract design`,
        recommendation:
          "Consider flattening contract interactions to reduce complexity",
      });
    }

    return suggestions;
  }
}
