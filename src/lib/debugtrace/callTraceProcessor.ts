import { TransactionAnalysis } from "@/lib/transactionTracer";
import {
  CallHierarchyNode,
  GasAttributionData,
  NetworkEdge,
  NetworkNode,
  ProcessedCallTraceData,
  SuccessRateData,
  ValueTransferData,
} from "./types";
import { getColorByIndex } from "./chartTheme";
import { shortenAddress } from "@/lib/config";

export class CallTraceProcessor {
  static processContractInteractions(callTrace: TransactionAnalysis): {
    nodes: NetworkNode[];
    edges: NetworkEdge[];
  } {
    const nodeMap = new Map<string, NetworkNode>();
    const edges: NetworkEdge[] = [];

    callTrace.call_data.forEach((call, index) => {
      if (!nodeMap.has(call.from)) {
        nodeMap.set(call.from, {
          id: call.from,
          label: shortenAddress(call.from),
          type: call.from.length === 42 ? "contract" : "eoa",
          gasUsed: 0,
          callCount: 0,
          value: 0,
          data: {
            address: call.from,
            contractName: call.contract || "Unknown",
            functions: [],
          },
        });
      }

      if (!nodeMap.has(call.to)) {
        nodeMap.set(call.to, {
          id: call.to,
          label: shortenAddress(call.to),
          type: "contract",
          gasUsed: 0,
          callCount: 0,
          value: 0,
          data: {
            address: call.to,
            contractName: call.contract || "Unknown",
            functions: [],
          },
        });
      }

      const sourceNode = nodeMap.get(call.from)!;
      const targetNode = nodeMap.get(call.to)!;

      sourceNode.callCount++;
      targetNode.gasUsed += call.gasUsed;
      targetNode.value += call.value_eth;

      const edgeId = `${call.from}-${call.to}-${index}`;
      edges.push({
        id: edgeId,
        source: call.from,
        target: call.to,
        gasUsed: call.gasUsed,
        value: call.value_eth,
        callType: call.type,
        success: !call.error,
        label: call.type,
      });
    });

    return {
      nodes: Array.from(nodeMap.values()),
      edges,
    };
  }

  static processGasAttribution(
    callTrace: TransactionAnalysis,
  ): GasAttributionData[] {
    const gasMap = new Map<
      string,
      { gasUsed: number; callCount: number; contractName: string }
    >();

    callTrace.call_data.forEach((call) => {
      const existing = gasMap.get(call.to);
      if (existing) {
        existing.gasUsed += call.gasUsed;
        existing.callCount++;
      } else {
        gasMap.set(call.to, {
          gasUsed: call.gasUsed,
          callCount: 1,
          contractName: call.contract || "Unknown Contract",
        });
      }
    });

    const totalGas = callTrace.transaction_stats.total_gas;

    return Array.from(gasMap.entries())
      .map(([address, data], index) => ({
        contractAddress: address,
        contractName: data.contractName,
        gasUsed: data.gasUsed,
        percentage: (data.gasUsed / totalGas) * 100,
        callCount: data.callCount,
        color: getColorByIndex(index),
      }))
      .sort((a, b) => b.gasUsed - a.gasUsed);
  }

  static processCallHierarchy(
    callTrace: TransactionAnalysis,
  ): CallHierarchyNode[] {
    const nodeMap = new Map<string, CallHierarchyNode>();

    callTrace.call_data.forEach((call) => {
      const node: CallHierarchyNode = {
        id: call.id,
        parentId: call.parent_id,
        contractAddress: call.to,
        contractName: call.contract || "Unknown",
        functionName: call.input_preview || call.type,
        gasUsed: call.gasUsed,
        value: call.value_eth,
        success: !call.error,
        depth: call.depth,
        children: [],
      };

      nodeMap.set(call.id, node);
    });

    const rootNodes: CallHierarchyNode[] = [];

    nodeMap.forEach((node) => {
      if (node.parentId) {
        const parent = nodeMap.get(node.parentId);
        if (parent) {
          parent.children.push(node);
        }
      } else {
        rootNodes.push(node);
      }
    });

    return rootNodes;
  }

  static processValueTransfers(
    callTrace: TransactionAnalysis,
  ): ValueTransferData[] {
    return callTrace.call_data
      .filter((call) => call.value_eth > 0)
      .map((call, index) => ({
        from: call.from,
        to: call.to,
        value: call.value_eth,
        gasUsed: call.gasUsed,
        success: !call.error,
        step: index,
      }))
      .sort((a, b) => b.value - a.value);
  }

  static processCallSuccessRates(
    callTrace: TransactionAnalysis,
  ): SuccessRateData[] {
    const contractStats = new Map<
      string,
      { total: number; successful: number; contractName: string }
    >();

    callTrace.call_data.forEach((call) => {
      const existing = contractStats.get(call.to);
      if (existing) {
        existing.total++;
        if (!call.error) existing.successful++;
      } else {
        contractStats.set(call.to, {
          total: 1,
          successful: call.error ? 0 : 1,
          contractName: call.contract || "Unknown",
        });
      }
    });

    return Array.from(contractStats.entries()).map(([address, stats]) => ({
      contractAddress: address,
      contractName: stats.contractName,
      totalCalls: stats.total,
      successfulCalls: stats.successful,
      failedCalls: stats.total - stats.successful,
      successRate: (stats.successful / stats.total) * 100,
    }));
  }

  static processAll(callTrace: TransactionAnalysis): ProcessedCallTraceData {
    const { nodes, edges } = this.processContractInteractions(callTrace);

    return {
      contractInteractions: nodes,
      networkEdges: edges,
      gasAttribution: this.processGasAttribution(callTrace),
      callHierarchy: this.processCallHierarchy(callTrace),
      valueTransfers: this.processValueTransfers(callTrace),
      callSuccessRates: this.processCallSuccessRates(callTrace),
    };
  }

  static analyzeInteractionPatterns(callTrace: TransactionAnalysis) {
    const { call_data } = callTrace;

    const uniqueContracts = new Set(call_data.map((call) => call.to)).size;

    const contractCallCounts = new Map<string, number>();
    call_data.forEach((call) => {
      contractCallCounts.set(
        call.to,
        (contractCallCounts.get(call.to) || 0) + 1,
      );
    });

    const mostActivePair = Array.from(contractCallCounts.entries()).sort(
      (a, b) => b[1] - a[1],
    )[0];

    const avgDepth =
      call_data.reduce((sum, call) => sum + call.depth, 0) / call_data.length;

    const failedCalls = call_data.filter((call) => call.error).length;

    const totalValueTransferred = call_data.reduce(
      (sum, call) => sum + call.value_eth,
      0,
    );

    return {
      uniqueContracts,
      mostActiveContract: mostActivePair
        ? {
            address: mostActivePair[0],
            callCount: mostActivePair[1],
          }
        : null,
      averageCallDepth: avgDepth,
      failedCallsCount: failedCalls,
      failureRate: (failedCalls / call_data.length) * 100,
      totalValueTransferred,
      complexityScore: uniqueContracts * avgDepth + failedCalls,
    };
  }

  static generateOptimizationSuggestions(callTrace: TransactionAnalysis) {
    const patterns = this.analyzeInteractionPatterns(callTrace);
    const suggestions = [];

    if (patterns.failureRate > 10) {
      suggestions.push({
        type: "security" as const,
        severity: "high" as const,
        title: "High Call Failure Rate",
        description: `${patterns.failureRate.toFixed(1)}% of calls failed during execution`,
        recommendation:
          "Review error handling and input validation in smart contracts",
      });
    }

    if (patterns.complexityScore > 50) {
      suggestions.push({
        type: "performance" as const,
        severity: "medium" as const,
        title: "Complex Interaction Pattern",
        description: `Transaction involves ${patterns.uniqueContracts} contracts with average depth ${patterns.averageCallDepth.toFixed(1)}`,
        recommendation:
          "Consider simplifying contract interactions to reduce gas costs",
      });
    }

    const avgGasPerCall =
      callTrace.transaction_stats.total_gas /
      callTrace.transaction_stats.total_calls;
    if (avgGasPerCall > 50000) {
      suggestions.push({
        type: "gas" as const,
        severity: "medium" as const,
        title: "High Gas per Call",
        description: `Average gas per call (${Math.round(avgGasPerCall).toLocaleString()}) is above recommended levels`,
        recommendation:
          "Optimize contract functions to reduce gas consumption per call",
      });
    }

    return suggestions;
  }

  static getInteractionSummary(callTrace: TransactionAnalysis) {
    const patterns = this.analyzeInteractionPatterns(callTrace);
    const gasAttribution = this.processGasAttribution(callTrace);
    const valueTransfers = this.processValueTransfers(callTrace);

    return {
      totalContracts: patterns.uniqueContracts,
      totalCalls: callTrace.transaction_stats.total_calls,
      totalGasUsed: callTrace.transaction_stats.total_gas,
      totalValueTransferred: patterns.totalValueTransferred,
      successRate: 100 - patterns.failureRate,
      mostExpensiveContract: gasAttribution[0],
      largestValueTransfer: valueTransfers[0],
      complexityScore: patterns.complexityScore,
    };
  }
}
