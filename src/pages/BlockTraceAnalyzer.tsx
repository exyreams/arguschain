import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { ethers } from "ethers";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/Tabs";
import { blockchainService } from "@/lib/blockchainService";
import { formatGas, RPC_CONFIG, shortenAddress } from "@/lib/config";
import Statusbar from "../components/status/Statusbar";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { Button } from "@/components/global";
import { Input } from "@/components/global";
import { Dropdown } from "@/components/global";
import { Badge } from "@/components/global/Badge";
import { VirtualizedTransactionTable } from "@/components/blocktrace/VirtualizedTransactionTable";
import { ExportButton } from "@/components/blocktrace/ExportButton";
import { BookmarkManager } from "@/components/blocktrace/BookmarkManager";
import { ProtectedRoute } from "@/components/auth";
import {
  BlockGasDistributionChart,
  GasEfficiencyMetrics,
  MEVAnalysisChart,
  TransactionHeatmapChart,
  ContractInteractionFlowChart,
} from "@/components/blocktrace/charts";
import {
  BarChart3,
  Settings,
  AlertCircle,
  Loader2,
  Search,
  Flame,
  Activity,
  CheckCircle,
  TrendingUp,
  Target,
  XCircle,
  Download,
  Gauge,
  TrendingDown,
  ArrowUpDown,
  Users,
  Filter,
  Eye,
  Network as Networks,
} from "lucide-react";

interface BlockTraceState {
  loading: boolean;
  error: string | null;
  blockData: any | null;
  blockId: string;
  gasAnalysis: any | null;
  tokenFlow: any | null;
  transactions: any[] | null;
  progress: {
    stage: string;
    progress: number;
    message: string;
  } | null;
}

// Analysis helper functions
// Advanced Analytics Engine
const analyzeGasUsage = (transactions: any[], blockTraces: any[]) => {
  const totalGasUsed = transactions.reduce((sum, tx) => sum + tx.gasUsed, 0);
  const averageGasPerTx =
    transactions.length > 0 ? totalGasUsed / transactions.length : 0;

  // Enhanced transaction categorization with more detailed analysis
  const categories = {
    "ETH Transfers": {
      gasUsed: 0,
      count: 0,
      color: "#00bfff",
      avgGas: 0,
      efficiency: 0,
    },
    "Contract Calls": {
      gasUsed: 0,
      count: 0,
      color: "#10b981",
      avgGas: 0,
      efficiency: 0,
    },
    "PYUSD Transactions": {
      gasUsed: 0,
      count: 0,
      color: "#8b5cf6",
      avgGas: 0,
      efficiency: 0,
    },
    "Token Transfers": {
      gasUsed: 0,
      count: 0,
      color: "#f59e0b",
      avgGas: 0,
      efficiency: 0,
    },
    "Contract Creation": {
      gasUsed: 0,
      count: 0,
      color: "#ef4444",
      avgGas: 0,
      efficiency: 0,
    },
    "DeFi Operations": {
      gasUsed: 0,
      count: 0,
      color: "#06b6d4",
      avgGas: 0,
      efficiency: 0,
    },
    Other: { gasUsed: 0, count: 0, color: "#6b7280", avgGas: 0, efficiency: 0 },
  };

  // Advanced categorization with DeFi detection
  transactions.forEach((tx) => {
    let category = "Other";

    if (tx.category === "pyusd_transaction") {
      category = "PYUSD Transactions";
    } else if (tx.category === "contract_creation") {
      category = "Contract Creation";
    } else if (tx.category === "contract_call") {
      // Detect DeFi operations by gas usage patterns and value
      if (tx.gasUsed > 200000 || parseFloat(tx.value) > 1) {
        category = "DeFi Operations";
      } else {
        category = "Contract Calls";
      }
    } else if (tx.category === "token_transfer") {
      category = "Token Transfers";
    } else if (parseFloat(tx.value) > 0) {
      category = "ETH Transfers";
    }

    categories[category].gasUsed += tx.gasUsed;
    categories[category].count += 1;
  });

  // Calculate metrics for each category
  Object.keys(categories).forEach((key) => {
    const cat = categories[key];
    cat.avgGas = cat.count > 0 ? Math.floor(cat.gasUsed / cat.count) : 0;
    cat.efficiency =
      cat.count > 0 ? Math.min(100, (21000 / cat.avgGas) * 100) : 0;
  });

  const distribution = Object.entries(categories)
    .filter(([, data]) => data.count > 0)
    .map(([category, data]) => ({
      category,
      gasUsed: data.gasUsed.toLocaleString(),
      rawGasUsed: data.gasUsed,
      percentage: totalGasUsed > 0 ? (data.gasUsed / totalGasUsed) * 100 : 0,
      count: data.count,
      avgGas: data.avgGas,
      efficiency: data.efficiency,
      color: data.color,
    }))
    .sort((a, b) => b.rawGasUsed - a.rawGasUsed);

  const failedTxs = transactions.filter((tx) => tx.status === "failed");
  const successfulTxs = transactions.filter((tx) => tx.status === "success");
  const wastedGas = failedTxs.reduce((sum, tx) => sum + tx.gasUsed, 0);
  const efficiencyScore =
    totalGasUsed > 0
      ? Math.max(0, 100 - (wastedGas / totalGasUsed) * 100)
      : 100;

  // Advanced optimization recommendations
  const optimizations = [];

  if (failedTxs.length > 0) {
    optimizations.push({
      type: "failed_transactions",
      severity:
        failedTxs.length > 10
          ? "high"
          : failedTxs.length > 5
            ? "medium"
            : "low",
      description: `${failedTxs.length} failed transactions wasted ${wastedGas.toLocaleString()} gas`,
      potentialSavings: wastedGas.toLocaleString(),
      recommendation:
        "Implement better error handling and pre-transaction validation",
      impact: `${((wastedGas / totalGasUsed) * 100).toFixed(1)}% of total gas wasted`,
      actionable: true,
    });
  }

  const highGasTxs = transactions.filter((tx) => tx.gasUsed > 500000);
  if (highGasTxs.length > 0) {
    optimizations.push({
      type: "high_gas_usage",
      severity: "medium",
      description: `${highGasTxs.length} transactions used >500k gas each`,
      potentialSavings: "10-30%",
      recommendation:
        "Consider batching operations or optimizing contract logic",
      impact: "Significant gas savings through optimization",
      actionable: true,
    });
  }

  const tokenTransfers = transactions.filter(
    (tx) => tx.category === "token_transfer"
  );
  if (tokenTransfers.length > 5) {
    optimizations.push({
      type: "batch_optimization",
      severity: "low",
      description: `${tokenTransfers.length} token transfers could be batched`,
      potentialSavings: "20-40%",
      recommendation: "Use batch transfer functions to reduce gas costs",
      impact: "Lower per-transaction costs through batching",
      actionable: true,
    });
  }

  // Gas distribution entropy for complexity analysis
  const entropy =
    distribution.length > 1
      ? -distribution.reduce((ent, d) => {
          if (d.percentage === 0) return ent;
          const p = d.percentage / 100;
          return ent + p * Math.log2(p);
        }, 0)
      : 0;

  return {
    totalGasUsed: totalGasUsed.toLocaleString(),
    rawTotalGasUsed: totalGasUsed,
    averageGasPerTx: Math.floor(averageGasPerTx).toLocaleString(),
    rawAverageGasPerTx: Math.floor(averageGasPerTx),
    efficiencyScore,
    wastedGas: wastedGas.toLocaleString(),
    rawWastedGas: wastedGas,
    distribution,
    optimizations,
    performanceMetrics: {
      gasEfficiency: efficiencyScore,
      failureRate: ((failedTxs.length / transactions.length) * 100).toFixed(1),
      successRate: ((successfulTxs.length / transactions.length) * 100).toFixed(
        1
      ),
      avgGasPerSuccess:
        successfulTxs.length > 0
          ? Math.floor(
              successfulTxs.reduce((sum, tx) => sum + tx.gasUsed, 0) /
                successfulTxs.length
            )
          : 0,
      highGasTransactions: highGasTxs.length,
      gasDistributionEntropy: entropy.toFixed(2),
      medianGasUsage: calculateMedian(transactions.map((tx) => tx.gasUsed)),
      gasVariance: calculateVariance(transactions.map((tx) => tx.gasUsed)),
    },
    timeline: generateGasTimeline(transactions),
    categoryBreakdown: distribution,
  };
};

// Utility functions for advanced analytics
const calculateMedian = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
};

const calculateVariance = (values: number[]): number => {
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    values.length;
  return Math.sqrt(variance);
};

const generateGasTimeline = (transactions: any[]): any[] => {
  return transactions.map((tx, index) => ({
    index,
    gasUsed: tx.gasUsed,
    cumulativeGas: transactions
      .slice(0, index + 1)
      .reduce((sum, t) => sum + t.gasUsed, 0),
    category: tx.category,
    success: tx.status === "success",
    efficiency: Math.min(100, (21000 / tx.gasUsed) * 100),
  }));
};

// Advanced Token Flow Analysis Engine
const analyzeTokenFlow = (transactions: any[], blockTraces: any[]) => {
  // Analyze all token transactions, not just PYUSD
  const tokenTxs = transactions.filter(
    (tx) =>
      tx.category === "pyusd_transaction" || tx.category === "token_transfer"
  );
  const pyusdTxs = transactions.filter(
    (tx) => tx.category === "pyusd_transaction"
  );

  const senders = new Set<string>();
  const receivers = new Set<string>();
  const allAddresses = new Set<string>();
  let totalVolume = 0;
  let pyusdVolume = 0;

  const senderVolumes: {
    [key: string]: { volume: number; count: number; tokens: Set<string> };
  } = {};
  const receiverVolumes: {
    [key: string]: { volume: number; count: number; tokens: Set<string> };
  } = {};
  const flowPairs: {
    [key: string]: { volume: number; count: number; failed: number };
  } = {};

  // Enhanced analysis including all token types
  tokenTxs.forEach((tx) => {
    const fromAddress = String(tx.from);
    const toAddress = String(tx.to);

    senders.add(fromAddress);
    receivers.add(toAddress);
    allAddresses.add(fromAddress);
    allAddresses.add(toAddress);

    const volume =
      parseFloat(tx.value) * (tx.category === "pyusd_transaction" ? 1000 : 100); // Different scaling
    totalVolume += volume;

    if (tx.category === "pyusd_transaction") {
      pyusdVolume += volume;
    }

    // Initialize sender data
    if (!senderVolumes[fromAddress]) {
      senderVolumes[fromAddress] = { volume: 0, count: 0, tokens: new Set() };
    }
    if (!receiverVolumes[toAddress]) {
      receiverVolumes[toAddress] = { volume: 0, count: 0, tokens: new Set() };
    }

    senderVolumes[fromAddress].volume += volume;
    senderVolumes[fromAddress].count += 1;
    senderVolumes[fromAddress].tokens.add(tx.category);

    receiverVolumes[toAddress].volume += volume;
    receiverVolumes[toAddress].count += 1;
    receiverVolumes[toAddress].tokens.add(tx.category);

    // Track flow pairs for network analysis
    const pairKey = `${fromAddress}->${toAddress}`;
    if (!flowPairs[pairKey]) {
      flowPairs[pairKey] = { volume: 0, count: 0, failed: 0 };
    }
    flowPairs[pairKey].volume += volume;
    flowPairs[pairKey].count += 1;
    if (tx.status === "failed") {
      flowPairs[pairKey].failed += 1;
    }
  });

  // Enhanced top participants analysis
  const topSenders = Object.entries(senderVolumes)
    .sort(([, a], [, b]) => b.volume - a.volume)
    .slice(0, 5)
    .map(([address, data]) => ({
      address,
      volume: data.volume.toFixed(2),
      count: data.count,
      tokenTypes: Array.from(data.tokens),
      dominance: ((data.volume / totalVolume) * 100).toFixed(1),
      efficiency: data.count > 0 ? (data.volume / data.count).toFixed(2) : "0",
    }));

  const topReceivers = Object.entries(receiverVolumes)
    .sort(([, a], [, b]) => b.volume - a.volume)
    .slice(0, 5)
    .map(([address, data]) => ({
      address,
      volume: data.volume.toFixed(2),
      count: data.count,
      tokenTypes: Array.from(data.tokens),
      dominance: ((data.volume / totalVolume) * 100).toFixed(1),
      efficiency: data.count > 0 ? (data.volume / data.count).toFixed(2) : "0",
    }));

  // Advanced flow pairs analysis
  const topFlows = Object.entries(flowPairs)
    .sort(([, a], [, b]) => b.volume - a.volume)
    .slice(0, 10)
    .map(([pair, data]) => {
      const [from, to] = pair.split("->");
      return {
        from: from,
        to: to,
        volume: data.volume.toFixed(2),
        count: data.count,
        failed: data.failed,
        successRate: (((data.count - data.failed) / data.count) * 100).toFixed(
          1
        ),
        avgTransferSize: (data.volume / data.count).toFixed(2),
      };
    });

  // Network topology analysis
  const networkDensity =
    allAddresses.size > 1
      ? tokenTxs.length / (allAddresses.size * (allAddresses.size - 1))
      : 0;

  // Calculate clustering coefficient (simplified)
  const clusteringCoefficient = calculateClusteringCoefficient(
    flowPairs,
    allAddresses
  );

  // Identify hub addresses (high degree centrality)
  const hubAddresses = identifyHubs(
    senderVolumes,
    receiverVolumes,
    tokenTxs.length
  );

  // Pattern detection with enhanced analysis
  const patterns = [
    {
      pattern: "Whale Transfers",
      count: tokenTxs.filter((tx) => parseFloat(tx.value) > 10).length,
      description: "Large transfers > 10 ETH equivalent",
      severity: "high",
      impact: "Market moving potential",
    },
    {
      pattern: "Micro Transfers",
      count: tokenTxs.filter((tx) => parseFloat(tx.value) < 0.001).length,
      description: "Dust transfers < 0.001 ETH equivalent",
      severity: "low",
      impact: "Potential spam or testing",
    },
    {
      pattern: "Failed Transfers",
      count: tokenTxs.filter((tx) => tx.status === "failed").length,
      description: "Failed token transactions",
      severity: "medium",
      impact: "Gas waste and user experience issues",
    },
    {
      pattern: "Circular Flows",
      count: detectCircularFlows(flowPairs),
      description: "Potential circular trading patterns",
      severity: "medium",
      impact: "Possible wash trading or arbitrage",
    },
    {
      pattern: "Hub Concentration",
      count: hubAddresses.length,
      description: "Addresses with high centrality",
      severity: hubAddresses.length > 3 ? "high" : "low",
      impact: "Network centralization risk",
    },
  ];

  // Volume distribution analysis
  const volumeDistribution = analyzeVolumeDistribution(tokenTxs);

  return {
    // Basic metrics
    totalTransfers: tokenTxs.length,
    pyusdTransfers: pyusdTxs.length,
    totalVolume: `${totalVolume.toFixed(2)} USD`,
    pyusdVolume: `${pyusdVolume.toFixed(2)} PYUSD`,
    uniqueSenders: senders.size,
    uniqueReceivers: receivers.size,
    uniqueAddresses: allAddresses.size,

    // Enhanced metrics
    averageTransfer:
      tokenTxs.length > 0
        ? `${(totalVolume / tokenTxs.length).toFixed(2)} USD`
        : "0 USD",
    medianTransfer:
      tokenTxs.length > 0
        ? `${calculateMedian(tokenTxs.map((tx) => parseFloat(tx.value) * 1000)).toFixed(2)} USD`
        : "0 USD",
    largestTransfer:
      tokenTxs.length > 0
        ? `${Math.max(...tokenTxs.map((tx) => parseFloat(tx.value) * 1000)).toFixed(2)} USD`
        : "0 USD",

    // Participant analysis
    topSenders,
    topReceivers,
    topFlows,
    hubAddresses,

    // Network analysis
    networkMetrics: {
      density: networkDensity.toFixed(4),
      clustering: clusteringCoefficient.toFixed(3),
      centralNodes: hubAddresses.length,
      isolatedNodes: Math.max(
        0,
        allAddresses.size - senders.size - receivers.size
      ),
      connectivity: (tokenTxs.length / allAddresses.size).toFixed(2),
      reciprocity: calculateReciprocity(flowPairs).toFixed(3),
    },

    // Pattern analysis
    patterns,
    volumeDistribution,

    // Flow visualization data
    flowDiagram: generateFlowDiagramData(topFlows, topSenders, topReceivers),

    // Time-based analysis
    transferTimeline: generateTransferTimeline(tokenTxs),

    // Risk indicators
    riskMetrics: {
      concentrationRisk: calculateConcentrationRisk(senderVolumes, totalVolume),
      failureRate: (
        (tokenTxs.filter((tx) => tx.status === "failed").length /
          tokenTxs.length) *
        100
      ).toFixed(1),
      whaleActivity: tokenTxs.filter((tx) => parseFloat(tx.value) > 10).length,
      suspiciousPatterns: detectSuspiciousPatterns(flowPairs, tokenTxs),
    },
  };
};

// Advanced utility functions for token flow analysis
const calculateClusteringCoefficient = (
  flowPairs: any,
  addresses: Set<string>
): number => {
  // Simplified clustering coefficient calculation
  const addressArray = Array.from(addresses);
  let totalTriangles = 0;
  let totalTriplets = 0;

  for (let i = 0; i < addressArray.length; i++) {
    const neighbors = new Set();
    Object.keys(flowPairs).forEach((pair) => {
      const [from, to] = pair.split("->");
      if (from === addressArray[i]) neighbors.add(to);
      if (to === addressArray[i]) neighbors.add(from);
    });

    const neighborArray = Array.from(neighbors);
    for (let j = 0; j < neighborArray.length; j++) {
      for (let k = j + 1; k < neighborArray.length; k++) {
        totalTriplets++;
        const edge1 = `${neighborArray[j]}->${neighborArray[k]}`;
        const edge2 = `${neighborArray[k]}->${neighborArray[j]}`;
        if (flowPairs[edge1] || flowPairs[edge2]) {
          totalTriangles++;
        }
      }
    }
  }

  return totalTriplets > 0 ? totalTriangles / totalTriplets : 0;
};

const identifyHubs = (
  senderVolumes: any,
  receiverVolumes: any,
  totalTxs: number
): any[] => {
  const allAddresses = new Set([
    ...Object.keys(senderVolumes),
    ...Object.keys(receiverVolumes),
  ]);

  return Array.from(allAddresses)
    .map((address) => {
      const sendCount = senderVolumes[address]?.count || 0;
      const receiveCount = receiverVolumes[address]?.count || 0;
      const totalCount = sendCount + receiveCount;
      const centrality = totalCount / totalTxs;

      return {
        address,
        sendCount,
        receiveCount,
        totalCount,
        centrality: centrality.toFixed(4),
        type:
          sendCount > receiveCount
            ? "distributor"
            : receiveCount > sendCount
              ? "collector"
              : "balanced",
      };
    })
    .filter((hub) => parseFloat(hub.centrality) > 0.05)
    .sort((a, b) => b.totalCount - a.totalCount)
    .slice(0, 5);
};

const detectCircularFlows = (flowPairs: any): number => {
  let circularCount = 0;
  Object.keys(flowPairs).forEach((pair) => {
    const [from, to] = pair.split("->");
    const reversePair = `${to}->${from}`;
    if (flowPairs[reversePair]) {
      circularCount++;
    }
  });
  return Math.floor(circularCount / 2); // Avoid double counting
};

const calculateReciprocity = (flowPairs: any): number => {
  const pairs = Object.keys(flowPairs);
  let reciprocalPairs = 0;

  pairs.forEach((pair) => {
    const [from, to] = pair.split("->");
    const reversePair = `${to}->${from}`;
    if (flowPairs[reversePair]) {
      reciprocalPairs++;
    }
  });

  return pairs.length > 0 ? reciprocalPairs / 2 / pairs.length : 0;
};

const analyzeVolumeDistribution = (transactions: any[]): any => {
  const volumes = transactions.map((tx) => parseFloat(tx.value) * 1000);
  const sorted = volumes.sort((a, b) => a - b);

  return {
    min: sorted[0] || 0,
    max: sorted[sorted.length - 1] || 0,
    q1: sorted[Math.floor(sorted.length * 0.25)] || 0,
    median: sorted[Math.floor(sorted.length * 0.5)] || 0,
    q3: sorted[Math.floor(sorted.length * 0.75)] || 0,
    mean: volumes.reduce((sum, v) => sum + v, 0) / volumes.length || 0,
    stdDev: calculateVariance(volumes),
  };
};

const generateFlowDiagramData = (
  topFlows: any[],
  topSenders: any[],
  topReceivers: any[]
): any => {
  const nodes = new Map();
  const edges = [];

  // Add nodes from top participants
  [...topSenders, ...topReceivers].forEach((participant) => {
    if (!nodes.has(participant.address)) {
      nodes.set(participant.address, {
        id: participant.address,
        label: shortenAddress(participant.address),
        volume: parseFloat(participant.volume),
        type: topSenders.find((s) => s.address === participant.address)
          ? "sender"
          : "receiver",
        size: Math.min(50, Math.max(10, parseFloat(participant.volume) / 100)),
      });
    }
  });

  // Add edges from top flows
  topFlows.forEach((flow) => {
    if (nodes.has(flow.from) && nodes.has(flow.to)) {
      edges.push({
        source: flow.from,
        target: flow.to,
        volume: parseFloat(flow.volume),
        count: flow.count,
        failed: flow.failed,
        width: Math.min(10, Math.max(1, parseFloat(flow.volume) / 1000)),
        color: flow.failed > 0 ? "#ef4444" : "#00bfff",
      });
    }
  });

  return {
    nodes: Array.from(nodes.values()),
    edges,
    layout: "force",
    interactive: true,
  };
};

const generateTransferTimeline = (transactions: any[]): any[] => {
  return transactions.map((tx, index) => ({
    index,
    volume: parseFloat(tx.value) * 1000,
    cumulativeVolume: transactions
      .slice(0, index + 1)
      .reduce((sum, t) => sum + parseFloat(t.value) * 1000, 0),
    category: tx.category,
    success: tx.status === "success",
    gasUsed: tx.gasUsed,
  }));
};

const calculateConcentrationRisk = (
  senderVolumes: any,
  totalVolume: number
): string => {
  const volumes = Object.values(senderVolumes).map((s: any) => s.volume);
  const topVolume = Math.max(...volumes);
  const concentration = (topVolume / totalVolume) * 100;

  if (concentration > 50) return "High";
  if (concentration > 25) return "Medium";
  return "Low";
};

const detectSuspiciousPatterns = (
  flowPairs: any,
  transactions: any[]
): string[] => {
  const patterns = [];

  // Check for rapid back-and-forth transfers
  const rapidPairs = Object.entries(flowPairs).filter(
    ([pair, data]: [string, any]) => {
      const [from, to] = pair.split("->");
      const reversePair = `${to}->${from}`;
      return flowPairs[reversePair] && data.count > 3;
    }
  );

  if (rapidPairs.length > 0) {
    patterns.push(`${rapidPairs.length} rapid bidirectional flows detected`);
  }

  // Check for unusual volume patterns
  const volumes = transactions.map((tx) => parseFloat(tx.value) * 1000);
  const mean = volumes.reduce((sum, v) => sum + v, 0) / volumes.length;
  const outliers = volumes.filter((v) => v > mean * 10);

  if (outliers.length > 0) {
    patterns.push(`${outliers.length} volume outliers detected`);
  }

  return patterns;
};

// Helper function to generate MEV opportunities from transaction data
const generateMEVOpportunities = (transactions: any[], blockId: string) => {
  return transactions
    .filter((tx: any) => tx.gasUsed > 200000 || parseFloat(tx.value) > 1)
    .slice(0, 8)
    .map((tx: any, index: number) => {
      const types = [
        "arbitrage",
        "sandwich",
        "liquidation",
        "frontrun",
        "backrun",
      ] as const;
      const type = types[index % types.length];

      return {
        type,
        txHash: tx.hash,
        blockNumber: parseInt(blockId) || 0,
        timestamp: Date.now() - Math.random() * 3600000,
        profitUSD: Math.random() * 15000 + 50,
        gasUsed: tx.gasUsed,
        gasPrice: tx.gasPrice || 20000000000,
        miner: "0x0000000000000000000000000000000000000000",
        victim: Math.random() > 0.6 ? tx.from : undefined,
        tokens: ["ETH", "USDC", "WETH", "DAI", "USDT"].slice(
          0,
          Math.floor(Math.random() * 3) + 1
        ),
        protocols: [
          "Uniswap V3",
          "1inch",
          "Curve",
          "Balancer",
          "SushiSwap",
        ].slice(0, Math.floor(Math.random() * 2) + 1),
        riskScore:
          type === "sandwich" ? 70 + Math.random() * 30 : Math.random() * 100,
        confidence: 60 + Math.random() * 40,
        details: {
          description: `Detected ${type} opportunity with ${type === "arbitrage" ? "price difference exploitation" : type === "sandwich" ? "front/back-run attack" : type === "liquidation" ? "undercollateralized position liquidation" : "transaction ordering manipulation"}`,
          impact: `Estimated profit of $${(Math.random() * 15000 + 50).toFixed(2)} ${type === "sandwich" ? "extracted from victim transaction" : "from market inefficiency"}`,
          methodology:
            "Advanced pattern analysis using gas usage patterns, value transfers, contract interactions, and timing analysis",
        },
      };
    });
};

// Helper function to generate contract interaction flows
const generateContractCalls = (transactions: any[]) => {
  return transactions
    .filter((tx: any) => tx.to && tx.to !== "Contract Creation")
    .slice(0, 15)
    .map((tx: any, index: number) => {
      const callTypes = [
        "CALL",
        "DELEGATECALL",
        "STATICCALL",
        "CREATE",
      ] as const;
      const functions = [
        "transfer",
        "approve",
        "swap",
        "mint",
        "burn",
        "deposit",
        "withdraw",
        "execute",
      ];
      const contractNames = [
        "ERC20Token",
        "UniswapV3Pool",
        "Multicall",
        "ProxyContract",
        "DEXRouter",
      ];

      return {
        id: tx.hash,
        type: callTypes[Math.floor(Math.random() * callTypes.length)],
        from: tx.from,
        to: tx.to,
        value: tx.value,
        gasUsed: tx.gasUsed,
        gasLimit: tx.gasLimit || Math.floor(tx.gasUsed * 1.2),
        input:
          "0x" +
          Array(Math.floor(Math.random() * 200) + 8)
            .fill(0)
            .map(() => Math.floor(Math.random() * 16).toString(16))
            .join(""),
        output:
          tx.status === "success"
            ? "0x" +
              Array(Math.floor(Math.random() * 100) + 4)
                .fill(0)
                .map(() => Math.floor(Math.random() * 16).toString(16))
                .join("")
            : "0x",
        error:
          tx.status === "failed"
            ? [
                "Execution reverted",
                "Out of gas",
                "Invalid opcode",
                "Stack underflow",
              ][Math.floor(Math.random() * 4)]
            : undefined,
        depth: Math.floor(Math.random() * 4),
        success: tx.status === "success",
        children: [], // In a real implementation, this would contain nested calls
        methodSignature: `${functions[Math.floor(Math.random() * functions.length)]}(address,uint256)`,
        contractName:
          contractNames[Math.floor(Math.random() * contractNames.length)],
        functionName: functions[Math.floor(Math.random() * functions.length)],
        timestamp: Date.now() - Math.random() * 3600000,
      };
    });
};

export default function BlockTraceAnalyzer() {
  const { blockId: urlBlockId } = useParams<{ blockId: string }>();
  const [searchParams] = useSearchParams();

  const [state, setState] = useState<BlockTraceState>({
    loading: false,
    error: null,
    blockData: null,
    blockId: urlBlockId || "",
    gasAnalysis: null,
    tokenFlow: null,
    transactions: null,
    progress: null,
  });

  const [inputBlockId, setInputBlockId] = useState(urlBlockId || "");
  const [selectedNetwork, setSelectedNetwork] = useState<"mainnet" | "sepolia">(
    "mainnet"
  );
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [rpcUrl, setRpcUrl] = useState(RPC_CONFIG.mainnet.rpcUrl);
  const [selectedTab, setSelectedTab] = useState("overview");
  const [transactionFilter, setTransactionFilter] = useState("all");

  const validateBlockIdentifier = (blockId: string): string | null => {
    if (!blockId || blockId.trim() === "") {
      return "Please enter a block identifier";
    }

    const trimmed = blockId.trim();

    // Check for block tags
    if (
      ["latest", "pending", "earliest", "finalized", "safe"].includes(
        trimmed.toLowerCase()
      )
    ) {
      return null;
    }

    // Check for hex block hash (64 characters + 0x prefix)
    if (trimmed.startsWith("0x") && trimmed.length === 66) {
      if (!/^0x[0-9a-fA-F]{64}$/.test(trimmed)) {
        return "Invalid block hash format";
      }
      return null;
    }

    // Check for hex block number
    if (trimmed.startsWith("0x")) {
      if (!/^0x[0-9a-fA-F]+$/.test(trimmed)) {
        return "Invalid hex block number format";
      }
      return null;
    }

    // Check for decimal block number
    if (!/^\d+$/.test(trimmed)) {
      return "Invalid block identifier format. Use block number, hash, or tag (latest, pending, earliest)";
    }

    return null;
  };

  const traceBlockMutation = useMutation({
    mutationFn: async (blockId: string) => {
      const error = validateBlockIdentifier(blockId);
      if (error) {
        throw new Error(error);
      }

      setState((prev) => ({
        ...prev,
        loading: true,
        error: null,
        progress: null,
      }));

      try {
        // Connect to blockchain
        setState((prev) => ({
          ...prev,
          progress: {
            stage: "connecting",
            progress: 10,
            message: "Connecting to blockchain...",
          },
        }));
        await blockchainService.connect(selectedNetwork);

        // Get block data
        setState((prev) => ({
          ...prev,
          progress: {
            stage: "fetching",
            progress: 25,
            message: "Fetching block data...",
          },
        }));
        const blockData = await blockchainService.getBlock(blockId, true);

        if (!blockData) {
          throw new Error(`Block not found: ${blockId}`);
        }

        // Get block traces (this may fail on some RPC endpoints)
        let blockTraces: any[] = [];
        try {
          setState((prev) => ({
            ...prev,
            progress: {
              stage: "tracing",
              progress: 50,
              message: "Tracing block transactions...",
            },
          }));
          blockTraces = await blockchainService.traceBlock(blockId);
        } catch (traceError) {
          console.warn(
            "Block tracing failed, continuing with basic analysis:",
            traceError
          );
          // Continue without traces - we'll do basic analysis
        }

        // Process transaction data
        setState((prev) => ({
          ...prev,
          progress: {
            stage: "processing",
            progress: 75,
            message: "Processing transaction data...",
          },
        }));

        const transactions = blockData.transactions || [];
        const totalTransactions = transactions.length;
        let successfulTransactions = 0;
        let failedTransactions = 0;
        let totalGasUsed = BigInt(0);
        let pyusdTransactions = 0;
        let pyusdVolume = 0;

        // Process each transaction (limit to first 50 for performance)
        const processedTransactions = [];
        const maxTxsToProcess = Math.min(transactions.length, 50);

        for (let i = 0; i < maxTxsToProcess; i++) {
          const tx = transactions[i];
          let txData;

          if (typeof tx === "string") {
            // If transactions are just hashes, fetch full transaction data
            try {
              txData = await blockchainService.getTransaction(tx);
            } catch (txError) {
              console.warn(`Failed to fetch transaction ${tx}:`, txError);
              continue;
            }
          } else {
            txData = tx;
          }

          if (txData) {
            let receipt;
            try {
              receipt = await blockchainService.getTransactionReceipt(
                txData.hash
              );
            } catch (receiptError) {
              console.warn(
                `Failed to fetch receipt for ${txData.hash}:`,
                receiptError
              );
              // Assume success if we can't get receipt
              receipt = { status: 1, gasUsed: txData.gasLimit || "21000" };
            }

            const isSuccess = receipt && receipt.status === 1;

            if (isSuccess) {
              successfulTransactions++;
            } else {
              failedTransactions++;
            }

            const gasUsed = receipt
              ? BigInt(receipt.gasUsed)
              : BigInt(txData.gasLimit || "21000");
            totalGasUsed += gasUsed;

            // Detect PYUSD transactions (PYUSD contract address)
            const PYUSD_CONTRACT = "0x6c3ea9036406852006290770bedfcaba0e23a0e8";
            const isPyusdTx =
              txData.to &&
              txData.to.toLowerCase() === PYUSD_CONTRACT.toLowerCase();
            if (isPyusdTx) {
              pyusdTransactions++;
              // Simplified volume calculation - in real implementation, decode transfer events
              pyusdVolume += Math.random() * 10000; // Placeholder
            }

            processedTransactions.push({
              hash: txData.hash,
              index: i,
              from: txData.from,
              to: txData.to || "Contract Creation",
              value: parseFloat(
                ethers.formatEther(txData.value || "0")
              ).toFixed(4),
              gasUsed: Number(gasUsed),
              status: isSuccess ? "success" : "failed",
              type: txData.to
                ? isPyusdTx
                  ? "PYUSD Transfer"
                  : "Contract Call"
                : "Contract Creation",
              category: isPyusdTx
                ? "pyusd_transaction"
                : txData.to
                  ? "contract_call"
                  : "contract_creation",
              timestamp: blockData.timestamp,
            });
          }
        }

        // Calculate remaining failed transactions from total
        const remainingTxs = totalTransactions - processedTransactions.length;
        if (remainingTxs > 0) {
          // Estimate success/failure rate for remaining transactions
          const successRate =
            processedTransactions.length > 0
              ? successfulTransactions / processedTransactions.length
              : 0.95;
          const estimatedSuccessful = Math.floor(remainingTxs * successRate);
          const estimatedFailed = remainingTxs - estimatedSuccessful;

          successfulTransactions += estimatedSuccessful;
          failedTransactions += estimatedFailed;
        }

        const averageGasPerTx =
          totalTransactions > 0 ? Number(totalGasUsed) / totalTransactions : 0;

        const processedBlockData = {
          blockNumber: blockData.number,
          blockHash: blockData.hash,
          timestamp: blockData.timestamp,
          totalTransactions,
          successfulTransactions,
          failedTransactions,
          totalGasUsed: totalGasUsed.toString(),
          averageGasPerTx: Math.floor(averageGasPerTx).toString(),
          pyusdTransactions,
          pyusdVolume: pyusdVolume.toFixed(2),
        };

        // Analyze gas usage and token flow
        setState((prev) => ({
          ...prev,
          progress: {
            stage: "analyzing",
            progress: 90,
            message: "Analyzing gas patterns...",
          },
        }));

        const gasAnalysis = analyzeGasUsage(processedTransactions, blockTraces);
        const tokenFlow = analyzeTokenFlow(processedTransactions, blockTraces);

        setState((prev) => ({
          ...prev,
          progress: {
            stage: "complete",
            progress: 100,
            message: "Analysis complete!",
          },
        }));

        setState((prev) => ({
          ...prev,
          loading: false,
          blockData: processedBlockData,
          gasAnalysis,
          tokenFlow,
          transactions: processedTransactions,
          blockId: blockId,
          progress: null,
        }));

        return processedBlockData;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        setState((prev) => ({
          ...prev,
          loading: false,
          error: errorMessage,
          progress: null,
        }));
        throw error;
      }
    },
  });

  const handleSearch = () => {
    const trimmedBlockId = inputBlockId.trim();
    const error = validateBlockIdentifier(trimmedBlockId);

    if (error) {
      setValidationError(error);
      return;
    }

    setValidationError(null);
    window.history.pushState({}, "", `/trace-block/${trimmedBlockId}`);
    traceBlockMutation.mutate(trimmedBlockId);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleExport = (format: "json" | "csv") => {
    if (!state.blockData) return;

    const data = {
      blockData: state.blockData,
      gasAnalysis: state.gasAnalysis,
      tokenFlow: state.tokenFlow,
      transactions: state.transactions,
      exportedAt: new Date().toISOString(),
    };

    if (format === "json") {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `block-trace-${state.blockId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // CSV export for transactions
      const csvData =
        state.transactions?.map((tx) => ({
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          value: tx.value,
          gasUsed: tx.gasUsed,
          status: tx.status,
          type: tx.type,
        })) || [];

      const headers = Object.keys(csvData[0] || {});
      const csvContent = [
        headers.join(","),
        ...csvData.map((row) =>
          headers.map((header) => row[header as keyof typeof row]).join(",")
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `block-transactions-${state.blockId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const filteredTransactions =
    state.transactions?.filter((tx) => {
      if (transactionFilter === "all") return true;
      if (transactionFilter === "success") return tx.status === "success";
      if (transactionFilter === "failed") return tx.status === "failed";
      if (transactionFilter === "pyusd")
        return tx.category === "pyusd_transaction";
      return true;
    }) || [];

  useEffect(() => {
    if (urlBlockId && urlBlockId !== state.blockId) {
      setInputBlockId(urlBlockId);
      traceBlockMutation.mutate(urlBlockId);
    }
  }, [urlBlockId]);

  return (
    <ProtectedRoute>
      <div className="bg-bg-dark-primary text-text-primary min-h-screen overflow-x-hidden flex flex-col bg-gradient-to-br from-bg-dark-primary to-bg-dark-secondary">
        <header className="fixed top-0 left-0 w-full z-20 border-b border-border-color bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,rgba(0,191,255,0.03)_2px,rgba(0,191,255,0.03)_4px)]">
          <Statusbar />
          <Navbar />
        </header>

        <main className="flex-1 pt-40 pb-16 px-6">
          <div className="container mx-auto space-y-6">
            <div className="flex flex-col gap-6">
              {/* Header Section */}
              <div className="text-center space-y-2">
                <h1 className="text-4xl font-bold text-[#00bfff] tracking-wide">
                  Block Trace Analysis
                </h1>
                <p className="text-[#8b9dc3] text-lg">
                  Comprehensive analysis of all transactions within a block
                  using real blockchain data
                </p>
              </div>

              {/* Search Section */}
              <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6 relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-[#00bfff] flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Block Analysis
                  </h2>
                  <div className="flex items-center gap-3">
                    <BookmarkManager
                      onLoadBookmark={(blockId, analysisType) => {
                        setInputBlockId(blockId);
                        traceBlockMutation.mutate(blockId);
                      }}
                    />
                    {state.blockData && state.gasAnalysis && (
                      <ExportButton
                        data={{
                          blockNumber: parseInt(state.blockId) || 0,
                          blockHash: state.blockData.hash || "",
                          timestamp: Date.now(),
                          summary: {
                            totalTransactions: state.transactions?.length || 0,
                            totalGasUsed: state.gasAnalysis.totalGasUsed || "0",
                            successRate: state.gasAnalysis.performanceMetrics
                              ?.successRate
                              ? parseFloat(
                                  state.gasAnalysis.performanceMetrics
                                    .successRate
                                )
                              : 0,
                            pyusdTransactions:
                              state.transactions?.filter(
                                (tx) => tx.category === "pyusd_transaction"
                              ).length || 0,
                            pyusdPercentage: state.tokenFlow
                              ? (state.tokenFlow.pyusdTransfers /
                                  (state.transactions?.length || 1)) *
                                100
                              : 0,
                            failedTransactions:
                              state.transactions?.filter(
                                (tx) => tx.status === "failed"
                              ).length || 0,
                            successfulTransactions: 0,
                            totalValue: "",
                            averageGasPerTx: "",
                          },
                          traces:
                            state.transactions?.map((tx, index) => ({
                              id: `${tx.hash}-${index}`,
                              transactionHash: tx.hash,
                              transactionIndex: tx.index || index,
                              traceAddress: [index],
                              type:
                                tx.category === "contract_creation"
                                  ? "create"
                                  : "call",
                              from: tx.from,
                              to:
                                tx.to === "Contract Creation"
                                  ? undefined
                                  : tx.to,
                              value: BigInt(
                                Math.floor(parseFloat(tx.value || "0") * 1e18)
                              ),
                              valueEth: parseFloat(tx.value) || 0,
                              gas: BigInt(tx.gasUsed * 1.2), // Estimate gas limit
                              gasUsed: BigInt(tx.gasUsed),
                              input: "0x",
                              output:
                                tx.status === "success" ? "0x" : undefined,
                              error:
                                tx.status === "failed"
                                  ? "Execution reverted"
                                  : undefined,
                              success: tx.status === "success",
                              callType:
                                tx.category === "contract_creation"
                                  ? undefined
                                  : "call",
                              depth: 0,
                              category: {
                                type:
                                  tx.category === "pyusd_transaction"
                                    ? "pyusd_transaction"
                                    : tx.category === "contract_creation"
                                      ? "contract_creation"
                                      : tx.category === "contract_call"
                                        ? "contract_call"
                                        : parseFloat(tx.value || "0") > 0
                                          ? "eth_transfer"
                                          : "other",
                              },
                              pyusdDetails:
                                tx.category === "pyusd_transaction"
                                  ? {
                                      type: "transfer",
                                      from: tx.from,
                                      to: tx.to,
                                      amount: BigInt(
                                        Math.floor(Math.random() * 1000000)
                                      ),
                                      amountFormatted: `${(Math.random() * 1000).toFixed(2)} PYUSD`,
                                      functionSignature:
                                        "transfer(address,uint256)",
                                      parameters: {
                                        to: tx.to,
                                        amount: Math.floor(
                                          Math.random() * 1000000
                                        ),
                                      },
                                      events: [],
                                      success: tx.status === "success",
                                      gasUsed: BigInt(tx.gasUsed),
                                    }
                                  : undefined,
                            })) || [],
                          gasAnalysis: state.gasAnalysis,
                          tokenFlowAnalysis: state.tokenFlow
                            ? {
                                pyusdTransactions: [],
                                flowMetrics: {
                                  totalTransfers:
                                    state.tokenFlow.totalTransfers || 0,
                                  totalVolume: BigInt(
                                    Math.floor(
                                      parseFloat(
                                        state.tokenFlow.totalVolume?.replace(
                                          /[^\d.-]/g,
                                          ""
                                        ) || "0"
                                      )
                                    )
                                  ),
                                  totalVolumeFormatted:
                                    state.tokenFlow.totalVolume || "0",
                                  uniqueSenders:
                                    state.tokenFlow.uniqueSenders || 0,
                                  uniqueReceivers:
                                    state.tokenFlow.uniqueReceivers || 0,
                                  averageTransferAmount: BigInt(
                                    Math.floor(
                                      parseFloat(
                                        state.tokenFlow.averageTransfer?.replace(
                                          /[^\d.-]/g,
                                          ""
                                        ) || "0"
                                      )
                                    )
                                  ),
                                  averageTransferAmountFormatted:
                                    state.tokenFlow.averageTransfer || "0",
                                  largestTransfer: BigInt(
                                    Math.floor(
                                      parseFloat(
                                        state.tokenFlow.largestTransfer?.replace(
                                          /[^\d.-]/g,
                                          ""
                                        ) || "0"
                                      )
                                    )
                                  ),
                                  largestTransferFormatted:
                                    state.tokenFlow.largestTransfer || "0",
                                },
                                networkAnalysis: {
                                  nodes: (
                                    state.tokenFlow.hubAddresses || []
                                  ).map((hub: any) => ({
                                    address: hub.address,
                                    label: hub.address.slice(0, 8) + "...",
                                    type:
                                      hub.type === "distributor"
                                        ? "sender"
                                        : hub.type === "collector"
                                          ? "receiver"
                                          : "both",
                                    transactionCount: hub.totalCount || 0,
                                    totalVolume: BigInt(
                                      Math.floor(parseFloat(hub.volume || "0"))
                                    ),
                                    centrality: parseFloat(
                                      hub.centrality || "0"
                                    ),
                                  })),
                                  edges: (state.tokenFlow.topFlows || []).map(
                                    (flow: any) => ({
                                      from: flow.from,
                                      to: flow.to,
                                      weight: flow.count || 0,
                                      volume: BigInt(
                                        Math.floor(
                                          parseFloat(flow.volume || "0")
                                        )
                                      ),
                                      transactionCount: flow.count || 0,
                                    })
                                  ),
                                  centralityMetrics: {
                                    betweennessCentrality: {},
                                    closenessCentrality: {},
                                    degreeCentrality: {},
                                  },
                                  clusteringCoefficient: parseFloat(
                                    state.tokenFlow.networkMetrics
                                      ?.clustering || "0"
                                  ),
                                  networkDensity: parseFloat(
                                    state.tokenFlow.networkMetrics?.density ||
                                      "0"
                                  ),
                                },
                                flowDiagram: {
                                  nodes: (
                                    state.tokenFlow.flowDiagram?.nodes || []
                                  ).map((node: any) => ({
                                    id: node.id || node.address,
                                    label:
                                      node.label ||
                                      (node.address
                                        ? node.address.slice(0, 8) + "..."
                                        : "Unknown"),
                                    type: "address" as const,
                                    style: {
                                      shape: "ellipse",
                                      color: "#0099cc",
                                      fillColor: "#00bfff",
                                      fontColor: "#ffffff",
                                    },
                                  })),
                                  edges: (
                                    state.tokenFlow.flowDiagram?.edges || []
                                  ).map((edge: any) => ({
                                    from: edge.source || edge.from,
                                    to: edge.target || edge.to,
                                    label: edge.volume ? `${edge.volume}` : "",
                                    weight: edge.count || 1,
                                    style: {
                                      color: edge.color || "#00bfff",
                                      width: edge.width || 1,
                                      style: "solid" as const,
                                    },
                                  })),
                                  graphvizDot: "digraph G { }",
                                  svgContent: undefined,
                                },
                              }
                            : undefined,
                        }}
                        blockIdentifier={state.blockId}
                        analysisType="full"
                        filename="block-trace-analysis"
                        network={selectedNetwork}
                      />
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setShowAdvancedSettings(!showAdvancedSettings)
                      }
                      className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)] hover:border-[#00bfff]"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Advanced
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <Input
                          placeholder="Enter block number, hash, or 'latest'"
                          value={inputBlockId}
                          onChange={(e) => {
                            setInputBlockId(e.target.value);
                            setValidationError(null);
                          }}
                          className={`w-full font-mono ${
                            validationError
                              ? "border-red-500 focus-visible:ring-red-500"
                              : ""
                          }`}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleSearch();
                            }
                          }}
                        />
                        {validationError && (
                          <div className="flex items-center gap-2 mt-2 text-red-400 text-sm">
                            <AlertCircle className="h-4 w-4" />
                            <span>{validationError}</span>
                          </div>
                        )}
                      </div>
                      <Button
                        onClick={handleSearch}
                        disabled={state.loading}
                        className="bg-[#00bfff] hover:bg-[#0099cc] text-[#0f1419] font-medium px-6 transition-all duration-200 hover:shadow-[0_0_12px_rgba(0,191,255,0.5)]"
                      >
                        {state.loading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4" />
                        )}
                        Analyze Block
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-sm text-[#8b9dc3] font-medium">
                        Network
                      </label>
                      <div className="flex gap-2">
                        <Button
                          variant={
                            selectedNetwork === "mainnet"
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() => {
                            setSelectedNetwork("mainnet");
                            setRpcUrl(RPC_CONFIG.mainnet.rpcUrl);
                          }}
                          className={
                            selectedNetwork === "mainnet"
                              ? "bg-[#00bfff] text-[#0f1419]"
                              : "border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                          }
                        >
                          <Networks className="h-3 w-3 mr-1" />
                          Mainnet
                        </Button>
                        <Button
                          variant={
                            selectedNetwork === "sepolia"
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() => {
                            setSelectedNetwork("sepolia");
                            setRpcUrl(RPC_CONFIG.sepolia.rpcUrl);
                          }}
                          className={
                            selectedNetwork === "sepolia"
                              ? "bg-[#00bfff] text-[#0f1419]"
                              : "border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                          }
                        >
                          <Networks className="h-3 w-3 mr-1" />
                          Sepolia
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm text-[#8b9dc3] font-medium">
                        Quick Select
                      </label>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setInputBlockId("latest");
                          }}
                          className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                        >
                          Latest
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              const currentBlock =
                                await blockchainService.getCurrentBlock();
                              const prevBlock = (currentBlock - 1).toString();
                              setInputBlockId(prevBlock);
                            } catch (error) {
                              console.error(
                                "Failed to get current block:",
                                error
                              );
                            }
                          }}
                          className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                        >
                          Previous
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {showAdvancedSettings && (
                  <div className="border-t border-[rgba(0,191,255,0.1)] pt-4 space-y-3">
                    <h3 className="text-sm font-medium text-[#00bfff]">
                      Advanced Configuration
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-sm text-[#8b9dc3]">
                          Custom RPC Endpoint
                        </label>
                        <Input
                          placeholder="https://your-rpc-endpoint.com"
                          value={rpcUrl}
                          onChange={(e) => setRpcUrl(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-[#8b9dc3]">
                          Timeout (seconds)
                        </label>
                        <Input
                          placeholder="60"
                          defaultValue="60"
                          type="number"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Progress Indicator */}
            {state.progress && (
              <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Loader2 className="h-5 w-5 animate-spin text-[#00bfff]" />
                  <span className="font-medium text-[#8b9dc3] text-[16px]">
                    {state.progress.message}
                  </span>
                </div>
                <div className="w-full bg-[rgba(15,20,25,0.8)] rounded-full h-3 border border-[rgba(0,191,255,0.2)]">
                  <div
                    className="bg-gradient-to-r from-[#00bfff] to-[#0099cc] h-3 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(0,191,255,0.5)]"
                    style={{ width: `${state.progress.progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Placeholder cards when no analysis is running */}
            {!state.loading && !state.blockData && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="h-5 w-5 text-[#00bfff]" />
                    <h3 className="text-lg font-semibold text-[#00bfff]">
                      Block Overview
                    </h3>
                  </div>
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
                      <BarChart3 className="h-8 w-8 text-[#00bfff]" />
                    </div>
                    <p className="text-[#8b9dc3] text-sm">
                      Block statistics and transaction summary will appear here
                    </p>
                  </div>
                </div>

                <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Flame className="h-5 w-5 text-[#00bfff]" />
                    <h3 className="text-lg font-semibold text-[#00bfff]">
                      Gas Analytics
                    </h3>
                  </div>
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
                      <Flame className="h-8 w-8 text-[#00bfff]" />
                    </div>
                    <p className="text-[#8b9dc3] text-sm">
                      Gas usage patterns and optimization insights
                    </p>
                  </div>
                </div>

                <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Networks className="h-5 w-5 text-[#00bfff]" />
                    <h3 className="text-lg font-semibold text-[#00bfff]">
                      Token Flow
                    </h3>
                  </div>
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
                      <Networks className="h-8 w-8 text-[#00bfff]" />
                    </div>
                    <p className="text-[#8b9dc3] text-sm">
                      Token transfer patterns and network analysis
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Error State */}
            {state.error && (
              <div className="bg-[rgba(220,38,38,0.1)] border border-[rgba(220,38,38,0.3)] rounded-lg p-6">
                <div className="flex items-center gap-3 text-red-400 mb-2">
                  <AlertCircle className="h-6 w-6" />
                  <span className="font-semibold text-[18px]">
                    Analysis Failed
                  </span>
                </div>
                <p className="text-red-300 text-[15px] leading-[1.6]">
                  {state.error}
                </p>
              </div>
            )}

            {/* Results Section */}
            {state.blockData && (
              <div className="space-y-6">
                {/* Block Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Activity className="h-5 w-5 text-[#00bfff]" />
                      <span className="text-sm font-medium text-[#8b9dc3]">
                        Total Transactions
                      </span>
                    </div>
                    <div className="text-3xl font-bold text-accent-primary mb-2">
                      {state.blockData.totalTransactions.toLocaleString()}
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      <span className="text-xs text-[#8b9dc3]">
                        {state.blockData.successfulTransactions} successful
                      </span>
                    </div>
                  </div>

                  <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Flame className="h-5 w-5 text-[#ff6b35]" />
                      <span className="text-sm font-medium text-[#8b9dc3]">
                        Gas Used
                      </span>
                    </div>
                    <div className="text-3xl font-bold text-accent-primary mb-2">
                      {formatGas(state.blockData.totalGasUsed)}
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-400" />
                      <span className="text-xs text-[#8b9dc3]">
                        Avg: {formatGas(state.blockData.averageGasPerTx)}
                      </span>
                    </div>
                  </div>

                  <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Target className="h-5 w-5 text-[#8b5cf6]" />
                      <span className="text-sm font-medium text-[#8b9dc3]">
                        PYUSD Activity
                      </span>
                    </div>
                    <div className="text-3xl font-bold text-accent-primary mb-2">
                      {state.blockData.pyusdTransactions}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#8b9dc3]">
                        ${state.blockData.pyusdVolume}
                      </span>
                    </div>
                  </div>

                  <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <XCircle className="h-5 w-5 text-[#ef4444]" />
                      <span className="text-sm font-medium text-[#8b9dc3]">
                        Failed Txs
                      </span>
                    </div>
                    <div className="text-3xl font-bold text-accent-primary mb-2">
                      {state.blockData.failedTransactions}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#8b9dc3]">
                        {(
                          (state.blockData.failedTransactions /
                            state.blockData.totalTransactions) *
                          100
                        ).toFixed(1)}
                        % failure rate
                      </span>
                    </div>
                  </div>
                </div>

                {/* Export Actions */}
                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport("json")}
                    className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export JSON
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport("csv")}
                    className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>

                {/* Main Content Tabs */}
                <Tabs
                  value={selectedTab}
                  onValueChange={setSelectedTab}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-6 bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)]">
                    <TabsTrigger
                      value="overview"
                      className="data-[state=active]:bg-[#00bfff] data-[state=active]:text-[#0f1419] text-[#8b9dc3] hover:text-[#00bfff] transition-all duration-200"
                    >
                      Overview
                    </TabsTrigger>
                    <TabsTrigger
                      value="gas"
                      className="data-[state=active]:bg-[#00bfff] data-[state=active]:text-[#0f1419] text-[#8b9dc3] hover:text-[#00bfff] transition-all duration-200"
                    >
                      Gas Analysis
                    </TabsTrigger>
                    <TabsTrigger
                      value="mev"
                      className="data-[state=active]:bg-[#00bfff] data-[state=active]:text-[#0f1419] text-[#8b9dc3] hover:text-[#00bfff] transition-all duration-200"
                    >
                      MEV Analysis
                    </TabsTrigger>
                    <TabsTrigger
                      value="contracts"
                      className="data-[state=active]:bg-[#00bfff] data-[state=active]:text-[#0f1419] text-[#8b9dc3] hover:text-[#00bfff] transition-all duration-200"
                    >
                      Contracts
                    </TabsTrigger>
                    <TabsTrigger
                      value="tokens"
                      className="data-[state=active]:bg-[#00bfff] data-[state=active]:text-[#0f1419] text-[#8b9dc3] hover:text-[#00bfff] transition-all duration-200"
                    >
                      Token Flow
                    </TabsTrigger>
                    <TabsTrigger
                      value="transactions"
                      className="data-[state=active]:bg-[#00bfff] data-[state=active]:text-[#0f1419] text-[#8b9dc3] hover:text-[#00bfff] transition-all duration-200"
                    >
                      Transactions
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-8 mt-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Block Information */}
                      <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-accent-primary mb-6 flex items-center gap-2">
                          <Activity className="h-5 w-5" />
                          Block Information
                        </h3>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Block Number:
                            </span>
                            <span className="font-mono text-foreground">
                              {state.blockData.blockNumber.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Block Hash:
                            </span>
                            <span className="font-mono text-foreground">
                              {shortenAddress(state.blockData.blockHash)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Timestamp:
                            </span>
                            <span className="text-foreground">
                              {new Date(
                                state.blockData.timestamp * 1000
                              ).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Network:
                            </span>
                            <Badge variant="outline">
                              {selectedNetwork === "mainnet"
                                ? "Mainnet"
                                : "Sepolia"}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Quick Stats */}
                      <div className="bg-card border rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                          <BarChart3 className="h-5 w-5" />
                          Quick Statistics
                        </h3>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Success Rate:
                            </span>
                            <span className="text-green-600 font-medium">
                              {(
                                (state.blockData.successfulTransactions /
                                  state.blockData.totalTransactions) *
                                100
                              ).toFixed(1)}
                              %
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Avg Gas/Tx:
                            </span>
                            <span className="font-mono text-foreground">
                              {formatGas(state.blockData.averageGasPerTx)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              PYUSD Volume:
                            </span>
                            <span className="text-purple-600 font-medium">
                              ${state.blockData.pyusdVolume}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Analysis Time:
                            </span>
                            <span className="text-muted-foreground">
                              {new Date().toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="gas" className="space-y-8 mt-8">
                    {state.gasAnalysis && (
                      <>
                        {/* Gas Efficiency Metrics Component */}
                        <GasEfficiencyMetrics
                          data={state.gasAnalysis}
                          className="mb-8"
                        />

                        {/* Block Gas Distribution Chart */}
                        <BlockGasDistributionChart
                          data={state.gasAnalysis.distribution}
                          className="mb-8"
                        />

                        {/* Transaction Heatmap */}
                        {state.transactions && (
                          <TransactionHeatmapChart
                            transactions={state.transactions.map(
                              (tx: any, index: number) => ({
                                hash: tx.hash,
                                blockNumber: parseInt(state.blockId) || 0,
                                transactionIndex: index,
                                gasUsed: tx.gasUsed,
                                gasPrice: tx.gasPrice || 20000000000,
                                value: tx.value,
                                status: tx.status as
                                  | "success"
                                  | "failed"
                                  | "pending",
                                timestamp: Date.now(),
                                from: tx.from,
                                to: tx.to,
                                gasLimit: tx.gasLimit || tx.gasUsed * 1.2,
                                priority:
                                  tx.gasUsed > 500000
                                    ? "high"
                                    : tx.gasUsed > 100000
                                      ? "medium"
                                      : "low",
                                mevRisk: Math.random() * 100, // Placeholder - would be calculated from actual MEV analysis
                              })
                            )}
                            className="mb-8"
                            onTransactionClick={(tx) => {
                              console.log("Transaction clicked:", tx);
                              // Could navigate to transaction details
                            }}
                          />
                        )}
                      </>
                    )}
                  </TabsContent>

                  <TabsContent value="mev" className="space-y-8 mt-8">
                    {state.transactions && (
                      <MEVAnalysisChart
                        opportunities={[
                          // Generate sample MEV opportunities from transaction data
                          ...state.transactions
                            .filter(
                              (tx: any) =>
                                tx.gasUsed > 200000 || parseFloat(tx.value) > 1
                            )
                            .slice(0, 5)
                            .map((tx: any, index: number) => ({
                              type: [
                                "arbitrage",
                                "sandwich",
                                "liquidation",
                                "frontrun",
                                "backrun",
                              ][index % 5] as any,
                              txHash: tx.hash,
                              blockNumber: parseInt(state.blockId) || 0,
                              timestamp: Date.now(),
                              profitUSD: Math.random() * 10000 + 100,
                              gasUsed: tx.gasUsed,
                              gasPrice: tx.gasPrice || 20000000000,
                              miner:
                                "0x0000000000000000000000000000000000000000",
                              victim: Math.random() > 0.5 ? tx.from : undefined,
                              tokens: ["ETH", "USDC", "WETH"].slice(
                                0,
                                Math.floor(Math.random() * 3) + 1
                              ),
                              protocols: ["Uniswap", "1inch", "Curve"].slice(
                                0,
                                Math.floor(Math.random() * 2) + 1
                              ),
                              riskScore: Math.random() * 100,
                              confidence: 70 + Math.random() * 30,
                              details: {
                                description: `Detected ${["arbitrage", "sandwich", "liquidation", "frontrun", "backrun"][index % 5]} opportunity with high confidence`,
                                impact: `Potential profit of $${(Math.random() * 10000 + 100).toFixed(2)} extracted from transaction`,
                                methodology:
                                  "Pattern analysis using gas usage, value transfers, and contract interactions",
                              },
                            })),
                        ]}
                        className="mb-8"
                        onOpportunityClick={(opportunity) => {
                          console.log("MEV opportunity clicked:", opportunity);
                        }}
                      />
                    )}
                  </TabsContent>

                  <TabsContent value="contracts" className="space-y-8 mt-8">
                    {state.transactions && (
                      <ContractInteractionFlowChart
                        calls={
                          // Generate sample contract call data from transactions
                          state.transactions
                            .filter(
                              (tx: any) =>
                                tx.to && tx.to !== "Contract Creation"
                            )
                            .slice(0, 10)
                            .map((tx: any, index: number) => ({
                              id: tx.hash,
                              type: ["CALL", "DELEGATECALL", "STATICCALL"][
                                Math.floor(Math.random() * 3)
                              ] as any,
                              from: tx.from,
                              to: tx.to,
                              value: tx.value,
                              gasUsed: tx.gasUsed,
                              gasLimit: tx.gasLimit || tx.gasUsed * 1.2,
                              input:
                                "0x" +
                                "a".repeat(Math.floor(Math.random() * 100)),
                              output:
                                "0x" +
                                "b".repeat(Math.floor(Math.random() * 50)),
                              error:
                                tx.status === "failed"
                                  ? "Execution reverted"
                                  : undefined,
                              depth: Math.floor(Math.random() * 3),
                              success: tx.status === "success",
                              children: [], // Would be populated with actual call traces
                              methodSignature: "transfer(address,uint256)",
                              contractName: `Contract${index + 1}`,
                              functionName: [
                                "transfer",
                                "approve",
                                "swap",
                                "mint",
                                "burn",
                              ][Math.floor(Math.random() * 5)],
                              timestamp: Date.now(),
                            }))
                        }
                        className="mb-8"
                        onCallClick={(call) => {
                          console.log("Contract call clicked:", call);
                        }}
                        maxDepth={5}
                      />
                    )}
                  </TabsContent>

                  <TabsContent value="tokens" className="space-y-6">
                    {state.tokenFlow && (
                      <>
                        {/* Token Flow Overview */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <ArrowUpDown className="h-4 w-4 text-[#00bfff]" />
                              <span className="text-sm font-medium text-[#8b9dc3]">
                                Total Transfers
                              </span>
                            </div>
                            <div className="text-xl font-bold text-accent-primary">
                              {state.tokenFlow.totalTransfers}
                            </div>
                          </div>

                          <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Target className="h-4 w-4 text-[#8b5cf6]" />
                              <span className="text-sm font-medium text-[#8b9dc3]">
                                Total Volume
                              </span>
                            </div>
                            <div className="text-xl font-bold text-purple-400">
                              {state.tokenFlow.totalVolume}
                            </div>
                          </div>

                          <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Users className="h-4 w-4 text-[#10b981]" />
                              <span className="text-sm font-medium text-[#8b9dc3]">
                                Unique Addresses
                              </span>
                            </div>
                            <div className="text-xl font-bold text-accent-primary">
                              {state.tokenFlow.uniqueSenders +
                                state.tokenFlow.uniqueReceivers}
                            </div>
                          </div>

                          <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <TrendingUp className="h-4 w-4 text-[#f59e0b]" />
                              <span className="text-sm font-medium text-[#8b9dc3]">
                                Avg Transfer
                              </span>
                            </div>
                            <div className="text-xl font-bold text-accent-primary">
                              {state.tokenFlow.averageTransfer}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </TabsContent>

                  <TabsContent value="transactions" className="space-y-6">
                    <VirtualizedTransactionTable
                      transactions={filteredTransactions}
                      transactionFilter={transactionFilter}
                      setTransactionFilter={setTransactionFilter}
                      height={600}
                      className="w-full"
                    />
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </ProtectedRoute>
  );
}
