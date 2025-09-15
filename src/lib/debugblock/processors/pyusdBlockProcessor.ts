import {
  BlockTransactionSummary,
  PyusdFunctionCategories,
  PyusdInternalTransaction,
  PyusdTransfer,
  TransferNetworkEdge,
  TransferNetworkNode,
} from "../types";
import { DISPLAY_CONFIG } from "../constants";

export class PyusdBlockProcessor {
  static createTransferNetwork(transfers: PyusdTransfer[]): {
    nodes: TransferNetworkNode[];
    edges: TransferNetworkEdge[];
    aggregatedTransfers: Map<string, number>;
  } {
    const nodes = new Map<string, TransferNetworkNode>();
    const edges: TransferNetworkEdge[] = [];
    const aggregatedTransfers = new Map<string, number>();

    for (const transfer of transfers) {
      const { from, to, value } = transfer;

      if (!nodes.has(from)) {
        nodes.set(from, {
          id: from,
          label: this.shortenAddress(from),
          address: from,
        });
      }

      if (!nodes.has(to)) {
        nodes.set(to, {
          id: to,
          label: this.shortenAddress(to),
          address: to,
        });
      }

      const transferKey = `${from}->${to}`;
      const currentValue = aggregatedTransfers.get(transferKey) || 0;
      aggregatedTransfers.set(transferKey, currentValue + value);
    }

    for (const [transferKey, totalValue] of aggregatedTransfers.entries()) {
      const [from, to] = transferKey.split("->");

      edges.push({
        from,
        to,
        value: totalValue,
        value_formatted: this.formatPyusdValue(totalValue),
      });
    }

    return {
      nodes: Array.from(nodes.values()),
      edges,
      aggregatedTransfers,
    };
  }

  static analyzeFunctionPatterns(transactions: BlockTransactionSummary[]): {
    functionUsage: Map<string, number>;
    categoryDistribution: PyusdFunctionCategories;
    topFunctions: Array<{ name: string; count: number; percentage: number }>;
    unusualPatterns: string[];
  } {
    const functionUsage = new Map<string, number>();
    const categoryDistribution: PyusdFunctionCategories = {
      token_movement: 0,
      supply_change: 0,
      allowance: 0,
      control: 0,
      admin: 0,
      view: 0,
      other: 0,
    };
    const unusualPatterns: string[] = [];

    const pyusdTransactions = transactions.filter((tx) => tx.pyusd_interaction);

    for (const tx of pyusdTransactions) {
      if (tx.pyusd_function) {
        const currentCount = functionUsage.get(tx.pyusd_function) || 0;
        functionUsage.set(tx.pyusd_function, currentCount + 1);

        const category =
          tx.pyusd_function_category as keyof PyusdFunctionCategories;
        if (category in categoryDistribution) {
          categoryDistribution[category]++;
        }
      }
    }

    const topFunctions = Array.from(functionUsage.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage:
          pyusdTransactions.length > 0
            ? (count / pyusdTransactions.length) * 100
            : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    this.detectUnusualPatterns(transactions, functionUsage, unusualPatterns);

    return {
      functionUsage,
      categoryDistribution,
      topFunctions,
      unusualPatterns,
    };
  }

  static analyzeVolumeFlows(transfers: PyusdTransfer[]): {
    totalVolume: number;
    totalVolumeFormatted: string;
    largestTransfer: PyusdTransfer | null;
    averageTransferSize: number;
    volumeDistribution: Array<{ range: string; count: number; volume: number }>;
    topSenders: Array<{ address: string; volume: number; count: number }>;
    topReceivers: Array<{ address: string; volume: number; count: number }>;
  } {
    if (transfers.length === 0) {
      return {
        totalVolume: 0,
        totalVolumeFormatted: "0 PYUSD",
        largestTransfer: null,
        averageTransferSize: 0,
        volumeDistribution: [],
        topSenders: [],
        topReceivers: [],
      };
    }

    const totalVolume = transfers.reduce(
      (sum, transfer) => sum + transfer.value,
      0,
    );
    const averageTransferSize = totalVolume / transfers.length;

    const largestTransfer = transfers.reduce((largest, current) =>
      current.value > largest.value ? current : largest,
    );

    const volumeRanges = [
      { min: 0, max: 100 * 1e6, label: "< $100" },
      { min: 100 * 1e6, max: 1000 * 1e6, label: "$100 - $1K" },
      { min: 1000 * 1e6, max: 10000 * 1e6, label: "$1K - $10K" },
      { min: 10000 * 1e6, max: 100000 * 1e6, label: "$10K - $100K" },
      { min: 100000 * 1e6, max: Infinity, label: "> $100K" },
    ];

    const volumeDistribution = volumeRanges.map((range) => {
      const transfersInRange = transfers.filter(
        (t) => t.value >= range.min && t.value < range.max,
      );
      return {
        range: range.label,
        count: transfersInRange.length,
        volume: transfersInRange.reduce((sum, t) => sum + t.value, 0),
      };
    });

    const senderStats = new Map<string, { volume: number; count: number }>();
    const receiverStats = new Map<string, { volume: number; count: number }>();

    for (const transfer of transfers) {
      const senderData = senderStats.get(transfer.from) || {
        volume: 0,
        count: 0,
      };
      senderData.volume += transfer.value;
      senderData.count += 1;
      senderStats.set(transfer.from, senderData);

      const receiverData = receiverStats.get(transfer.to) || {
        volume: 0,
        count: 0,
      };
      receiverData.volume += transfer.value;
      receiverData.count += 1;
      receiverStats.set(transfer.to, receiverData);
    }

    const topSenders = Array.from(senderStats.entries())
      .map(([address, stats]) => ({ address, ...stats }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 10);

    const topReceivers = Array.from(receiverStats.entries())
      .map(([address, stats]) => ({ address, ...stats }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 10);

    return {
      totalVolume,
      totalVolumeFormatted: this.formatPyusdValue(totalVolume),
      largestTransfer,
      averageTransferSize,
      volumeDistribution,
      topSenders,
      topReceivers,
    };
  }

  static analyzeInternalTransactions(internalTxs: PyusdInternalTransaction[]): {
    totalInternalCalls: number;
    contractInteractions: Map<string, number>;
    functionDistribution: Map<string, number>;
    depthAnalysis: Map<number, number>;
    gasUsageByFunction: Map<
      string,
      { totalGas: number; avgGas: number; count: number }
    >;
    topContracts: Array<{
      contract: string;
      calls: number;
      functions: string[];
    }>;
  } {
    const contractInteractions = new Map<string, number>();
    const functionDistribution = new Map<string, number>();
    const depthAnalysis = new Map<number, number>();
    const gasUsageByFunction = new Map<
      string,
      { totalGas: number; avgGas: number; count: number }
    >();

    for (const tx of internalTxs) {
      const contractCount = contractInteractions.get(tx.to_contract) || 0;
      contractInteractions.set(tx.to_contract, contractCount + 1);

      const functionCount = functionDistribution.get(tx.function) || 0;
      functionDistribution.set(tx.function, functionCount + 1);

      const depthCount = depthAnalysis.get(tx.depth) || 0;
      depthAnalysis.set(tx.depth, depthCount + 1);

      const gasData = gasUsageByFunction.get(tx.function) || {
        totalGas: 0,
        avgGas: 0,
        count: 0,
      };
      gasData.totalGas += tx.gas_used;
      gasData.count += 1;
      gasData.avgGas = gasData.totalGas / gasData.count;
      gasUsageByFunction.set(tx.function, gasData);
    }

    const contractFunctions = new Map<string, Set<string>>();
    for (const tx of internalTxs) {
      if (!contractFunctions.has(tx.to_contract)) {
        contractFunctions.set(tx.to_contract, new Set());
      }
      contractFunctions.get(tx.to_contract)!.add(tx.function);
    }

    const topContracts = Array.from(contractInteractions.entries())
      .map(([contract, calls]) => ({
        contract,
        calls,
        functions: Array.from(contractFunctions.get(contract) || []),
      }))
      .sort((a, b) => b.calls - a.calls)
      .slice(0, 10);

    return {
      totalInternalCalls: internalTxs.length,
      contractInteractions,
      functionDistribution,
      depthAnalysis,
      gasUsageByFunction,
      topContracts,
    };
  }

  static generateActivitySummary(
    transfers: PyusdTransfer[],
    internalTxs: PyusdInternalTransaction[],
    functionCategories: PyusdFunctionCategories,
  ): {
    summary: string;
    highlights: string[];
    recommendations: string[];
    riskFactors: string[];
  } {
    const highlights: string[] = [];
    const recommendations: string[] = [];
    const riskFactors: string[] = [];

    if (transfers.length > 0) {
      const totalVolume = transfers.reduce((sum, t) => sum + t.value, 0);
      highlights.push(
        `${transfers.length} PYUSD transfers with total volume of ${this.formatPyusdValue(totalVolume)}`,
      );

      const largestTransfer = transfers.reduce((max, t) =>
        t.value > max.value ? t : max,
      );
      if (largestTransfer.value > 1000000 * 1e6) {
        highlights.push(
          `Largest single transfer: ${this.formatPyusdValue(largestTransfer.value)}`,
        );
        riskFactors.push(
          "Large value transfers detected - monitor for unusual activity",
        );
      }
    }

    const totalFunctionCalls = Object.values(functionCategories).reduce(
      (sum, count) => sum + count,
      0,
    );
    if (totalFunctionCalls > 0) {
      const dominantCategory = Object.entries(functionCategories).reduce(
        (max, [category, count]) =>
          count > max.count ? { category, count } : max,
        { category: "", count: 0 },
      );

      if (dominantCategory.count > 0) {
        highlights.push(
          `Primary activity: ${dominantCategory.category.replace("_", " ")} (${dominantCategory.count} calls)`,
        );
      }
    }

    if (internalTxs.length > 0) {
      highlights.push(
        `${internalTxs.length} internal PYUSD contract calls detected`,
      );

      const maxDepth = Math.max(...internalTxs.map((tx) => tx.depth));
      if (maxDepth > 3) {
        riskFactors.push(
          `Deep call stack detected (depth: ${maxDepth}) - potential complex contract interactions`,
        );
      }
    }

    if (transfers.length > 50) {
      recommendations.push(
        "High transfer volume - consider implementing transfer monitoring",
      );
    }

    if (functionCategories.admin > 0) {
      recommendations.push(
        "Admin function calls detected - verify authorization",
      );
    }

    if (functionCategories.supply_change > 0) {
      recommendations.push(
        "Supply change operations detected - monitor for mint/burn activities",
      );
    }

    const summary = `Block contains ${totalFunctionCalls} PYUSD interactions across ${transfers.length} transfers and ${internalTxs.length} internal calls.`;

    return {
      summary,
      highlights,
      recommendations,
      riskFactors,
    };
  }

  private static detectUnusualPatterns(
    transactions: BlockTransactionSummary[],
    functionUsage: Map<string, number>,
    unusualPatterns: string[],
  ): void {
    const pyusdTxs = transactions.filter((tx) => tx.pyusd_interaction);

    if (functionUsage.has("mint") && functionUsage.has("burn")) {
      unusualPatterns.push("Both mint and burn operations in same block");
    }

    const adminFunctions = [
      "pause",
      "unpause",
      "transferOwnership",
      "grantRole",
      "revokeRole",
    ];
    const adminActivity = adminFunctions.reduce(
      (sum, func) => sum + (functionUsage.get(func) || 0),
      0,
    );
    if (adminActivity > 5) {
      unusualPatterns.push(
        `High admin activity: ${adminActivity} admin function calls`,
      );
    }

    const failedPyusdTxs = pyusdTxs.filter((tx) => tx.failed);
    if (failedPyusdTxs.length > pyusdTxs.length * 0.1) {
      unusualPatterns.push(
        `High failure rate: ${failedPyusdTxs.length}/${pyusdTxs.length} PYUSD transactions failed`,
      );
    }

    const gasUsages = pyusdTxs.map((tx) => tx.gas_used);
    if (gasUsages.length > 0) {
      const avgGas =
        gasUsages.reduce((sum, gas) => sum + gas, 0) / gasUsages.length;
      const highGasTxs = gasUsages.filter((gas) => gas > avgGas * 3);
      if (highGasTxs.length > 0) {
        unusualPatterns.push(
          `${highGasTxs.length} transactions with unusually high gas usage`,
        );
      }
    }
  }

  private static shortenAddress(address: string): string {
    if (address.length <= DISPLAY_CONFIG.ADDRESS_DISPLAY_LENGTH) {
      return address;
    }
    const prefixLength = Math.floor(DISPLAY_CONFIG.ADDRESS_DISPLAY_LENGTH / 2);
    const suffixLength =
      DISPLAY_CONFIG.ADDRESS_DISPLAY_LENGTH - prefixLength - 3;
    return `${address.slice(0, prefixLength)}...${address.slice(-suffixLength)}`;
  }

  private static formatPyusdValue(value: number): string {
    if (value === 0) return "0 PYUSD";
    try {
      const pyusdValue = value / 1e6;
      return `${pyusdValue.toFixed(DISPLAY_CONFIG.PYUSD_DECIMAL_PLACES)} PYUSD`;
    } catch (error) {
      console.warn(`Failed to format PYUSD value: ${value}`, error);
      return "0 PYUSD";
    }
  }
}
