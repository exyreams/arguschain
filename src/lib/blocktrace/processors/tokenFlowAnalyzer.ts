import { formatPYUSD, formatAddress, generateCacheKey } from "../utils";
import { PYUSD_CONTRACTS, CHART_COLORS } from "../constants";
import type {
  ProcessedBlockTrace,
  PYUSDTransactionDetails,
  TokenFlowAnalysis,
  TokenFlowMetrics,
  TokenNetworkAnalysis,
  NetworkNode,
  NetworkEdge,
  CentralityMetrics,
  FlowDiagramData,
  FlowNode,
  FlowEdge,
  NetworkType,
} from "../types";

export interface TokenFlowInsights {
  topSenders: Array<{ address: string; volume: bigint; count: number }>;
  topReceivers: Array<{ address: string; volume: bigint; count: number }>;
  largestTransfers: Array<{
    from: string;
    to: string;
    amount: bigint;
    txHash: string;
  }>;
  transferPatterns: Array<{
    pattern: string;
    count: number;
    description: string;
  }>;
  networkMetrics: {
    density: number;
    clustering: number;
    centralNodes: string[];
    isolatedNodes: string[];
  };
}

export class TokenFlowAnalyzer {
  private network: NetworkType;
  private cache = new Map<string, any>();

  constructor(network: NetworkType = "mainnet") {
    this.network = network;
  }

  /**
   * Analyze PYUSD token flows within the block
   */
  async analyzePYUSDFlow(
    traces: ProcessedBlockTrace[],
    pyusdDetails: Map<string, PYUSDTransactionDetails>
  ): Promise<TokenFlowAnalysis & { insights: TokenFlowInsights }> {
    console.log(`Analyzing PYUSD token flows for ${traces.length} traces...`);

    // Extract PYUSD transactions
    const pyusdTransactions = this.extractPYUSDTransactions(
      traces,
      pyusdDetails
    );

    if (pyusdTransactions.length === 0) {
      return this.createEmptyAnalysis();
    }

    console.log(`Found ${pyusdTransactions.length} PYUSD transactions`);

    // Calculate flow metrics
    const flowMetrics = this.calculateFlowMetrics(pyusdTransactions);

    // Perform network analysis
    const networkAnalysis = this.performNetworkAnalysis(pyusdTransactions);

    // Generate flow diagram
    const flowDiagram = this.generateFlowDiagram(
      pyusdTransactions,
      networkAnalysis
    );

    // Generate insights
    const insights = this.generateFlowInsights(
      pyusdTransactions,
      networkAnalysis
    );

    const result = {
      pyusdTransactions,
      flowMetrics,
      networkAnalysis,
      flowDiagram,
      insights,
    };

    console.log(
      `Token flow analysis completed. Total volume: ${flowMetrics.totalVolumeFormatted}`
    );
    return result;
  }

  /**
   * Extract PYUSD transactions from traces
   */
  private extractPYUSDTransactions(
    traces: ProcessedBlockTrace[],
    pyusdDetails: Map<string, PYUSDTransactionDetails>
  ): PYUSDTransactionDetails[] {
    const pyusdTransactions: PYUSDTransactionDetails[] = [];

    traces.forEach((trace) => {
      if (trace.pyusdDetails) {
        pyusdTransactions.push(trace.pyusdDetails);
      } else if (pyusdDetails.has(trace.transactionHash)) {
        pyusdTransactions.push(pyusdDetails.get(trace.transactionHash)!);
      }
    });

    return pyusdTransactions.filter(
      (tx) =>
        tx.type === "transfer" ||
        tx.type === "transferFrom" ||
        tx.type === "mint"
    );
  }

  /**
   * Calculate token flow metrics
   */
  private calculateFlowMetrics(
    pyusdTransactions: PYUSDTransactionDetails[]
  ): TokenFlowMetrics {
    let totalVolume = 0n;
    let totalTransfers = 0;
    const senders = new Set<string>();
    const receivers = new Set<string>();
    let largestTransfer = 0n;

    pyusdTransactions.forEach((tx) => {
      if (tx.type === "transfer" || tx.type === "transferFrom") {
        totalVolume += tx.amount;
        totalTransfers++;

        if (tx.from) senders.add(tx.from);
        if (tx.to) receivers.add(tx.to);

        if (tx.amount > largestTransfer) {
          largestTransfer = tx.amount;
        }
      } else if (tx.type === "mint") {
        totalVolume += tx.amount;
        totalTransfers++;
        if (tx.to) receivers.add(tx.to);

        if (tx.amount > largestTransfer) {
          largestTransfer = tx.amount;
        }
      }
    });

    const averageTransferAmount =
      totalTransfers > 0 ? totalVolume / BigInt(totalTransfers) : 0n;

    return {
      totalTransfers,
      totalVolume,
      totalVolumeFormatted: formatPYUSD(totalVolume),
      uniqueSenders: senders.size,
      uniqueReceivers: receivers.size,
      averageTransferAmount,
      averageTransferAmountFormatted: formatPYUSD(averageTransferAmount),
      largestTransfer,
      largestTransferFormatted: formatPYUSD(largestTransfer),
    };
  }

  /**
   * Perform network analysis on token flows
   */
  private performNetworkAnalysis(
    pyusdTransactions: PYUSDTransactionDetails[]
  ): TokenNetworkAnalysis {
    // Build transfer network
    const { nodes, edges } = this.buildTransferNetwork(pyusdTransactions);

    // Calculate centrality metrics
    const centralityMetrics = this.calculateCentralityMetrics(nodes, edges);

    // Calculate network metrics
    const clusteringCoefficient = this.calculateClusteringCoefficient(
      nodes,
      edges
    );
    const networkDensity = this.calculateNetworkDensity(
      nodes.length,
      edges.length
    );

    return {
      nodes: Array.from(nodes.values()),
      edges,
      centralityMetrics,
      clusteringCoefficient,
      networkDensity,
    };
  }

  /**
   * Build transfer network from PYUSD transactions
   */
  private buildTransferNetwork(pyusdTransactions: PYUSDTransactionDetails[]): {
    nodes: Map<string, NetworkNode>;
    edges: NetworkEdge[];
  } {
    const nodes = new Map<string, NetworkNode>();
    const edgeMap = new Map<string, NetworkEdge>();

    // Process each transaction
    pyusdTransactions.forEach((tx) => {
      let fromAddress: string | undefined;
      let toAddress: string | undefined;

      // Determine addresses based on transaction type
      if (tx.type === "transfer") {
        fromAddress = tx.from;
        toAddress = tx.to;
      } else if (tx.type === "transferFrom") {
        fromAddress = tx.from;
        toAddress = tx.to;
      } else if (tx.type === "mint") {
        // For minting, we don't have a "from" address
        toAddress = tx.to;
      }

      // Add/update nodes
      if (fromAddress) {
        this.addOrUpdateNode(nodes, fromAddress, "sender", tx.amount, 1);
      }
      if (toAddress) {
        this.addOrUpdateNode(nodes, toAddress, "receiver", tx.amount, 1);
      }

      // Add/update edges (only for transfers between addresses)
      if (fromAddress && toAddress) {
        const edgeKey = `${fromAddress}-${toAddress}`;
        if (edgeMap.has(edgeKey)) {
          const edge = edgeMap.get(edgeKey)!;
          edge.volume += tx.amount;
          edge.transactionCount++;
          edge.weight = Number(edge.volume) / 1e6; // Convert to PYUSD units
        } else {
          edgeMap.set(edgeKey, {
            from: fromAddress,
            to: toAddress,
            weight: Number(tx.amount) / 1e6,
            volume: tx.amount,
            transactionCount: 1,
          });
        }
      }
    });

    return {
      nodes,
      edges: Array.from(edgeMap.values()),
    };
  }

  /**
   * Add or update a network node
   */
  private addOrUpdateNode(
    nodes: Map<string, NetworkNode>,
    address: string,
    type: "sender" | "receiver",
    volume: bigint,
    transactionCount: number
  ): void {
    if (nodes.has(address)) {
      const node = nodes.get(address)!;
      node.totalVolume += volume;
      node.transactionCount += transactionCount;

      // Update type if needed
      if (node.type !== type && node.type !== "both") {
        node.type = "both";
      }
    } else {
      nodes.set(address, {
        address,
        label: formatAddress(address),
        type,
        transactionCount,
        totalVolume: volume,
        centrality: 0, // Will be calculated later
      });
    }
  }

  /**
   * Calculate centrality metrics
   */
  private calculateCentralityMetrics(
    nodes: Map<string, NetworkNode>,
    edges: NetworkEdge[]
  ): CentralityMetrics {
    const addresses = Array.from(nodes.keys());
    const adjacencyMatrix = this.buildAdjacencyMatrix(addresses, edges);

    // Calculate degree centrality
    const degreeCentrality: Record<string, number> = {};
    addresses.forEach((address) => {
      const connections = adjacencyMatrix.get(address) || new Map();
      degreeCentrality[address] = connections.size;
    });

    // Calculate betweenness centrality (simplified)
    const betweennessCentrality: Record<string, number> = {};
    addresses.forEach((address) => {
      betweennessCentrality[address] = this.calculateBetweennessCentrality(
        address,
        adjacencyMatrix
      );
    });

    // Calculate closeness centrality (simplified)
    const closenessCentrality: Record<string, number> = {};
    addresses.forEach((address) => {
      closenessCentrality[address] = this.calculateClosenessCentrality(
        address,
        adjacencyMatrix
      );
    });

    // Update node centrality values
    nodes.forEach((node, address) => {
      node.centrality = degreeCentrality[address] || 0;
    });

    return {
      betweennessCentrality,
      closenessCentrality,
      degreeCentrality,
    };
  }

  /**
   * Build adjacency matrix for network analysis
   */
  private buildAdjacencyMatrix(
    addresses: string[],
    edges: NetworkEdge[]
  ): Map<string, Map<string, number>> {
    const matrix = new Map<string, Map<string, number>>();

    // Initialize matrix
    addresses.forEach((address) => {
      matrix.set(address, new Map());
    });

    // Populate matrix with edges
    edges.forEach((edge) => {
      const fromConnections = matrix.get(edge.from);
      const toConnections = matrix.get(edge.to);

      if (fromConnections) {
        fromConnections.set(edge.to, edge.weight);
      }
      if (toConnections) {
        toConnections.set(edge.from, edge.weight);
      }
    });

    return matrix;
  }

  /**
   * Calculate betweenness centrality (simplified implementation)
   */
  private calculateBetweennessCentrality(
    address: string,
    adjacencyMatrix: Map<string, Map<string, number>>
  ): number {
    // Simplified calculation - in a full implementation, this would use
    // shortest path algorithms like Floyd-Warshall or Dijkstra
    const connections = adjacencyMatrix.get(address) || new Map();
    return connections.size * 0.1; // Placeholder calculation
  }

  /**
   * Calculate closeness centrality (simplified implementation)
   */
  private calculateClosenessCentrality(
    address: string,
    adjacencyMatrix: Map<string, Map<string, number>>
  ): number {
    // Simplified calculation
    const connections = adjacencyMatrix.get(address) || new Map();
    const totalNodes = adjacencyMatrix.size;
    return totalNodes > 1 ? connections.size / (totalNodes - 1) : 0;
  }

  /**
   * Calculate clustering coefficient
   */
  private calculateClusteringCoefficient(
    nodes: Map<string, NetworkNode>,
    edges: NetworkEdge[]
  ): number {
    if (nodes.size < 3) return 0;

    const adjacencyMatrix = this.buildAdjacencyMatrix(
      Array.from(nodes.keys()),
      edges
    );
    let totalClustering = 0;
    let nodeCount = 0;

    adjacencyMatrix.forEach((connections, address) => {
      if (connections.size >= 2) {
        const neighbors = Array.from(connections.keys());
        let triangles = 0;
        let possibleTriangles = 0;

        for (let i = 0; i < neighbors.length; i++) {
          for (let j = i + 1; j < neighbors.length; j++) {
            possibleTriangles++;
            const neighbor1Connections = adjacencyMatrix.get(neighbors[i]);
            if (
              neighbor1Connections &&
              neighbor1Connections.has(neighbors[j])
            ) {
              triangles++;
            }
          }
        }

        if (possibleTriangles > 0) {
          totalClustering += triangles / possibleTriangles;
          nodeCount++;
        }
      }
    });

    return nodeCount > 0 ? totalClustering / nodeCount : 0;
  }

  /**
   * Calculate network density
   */
  private calculateNetworkDensity(
    nodeCount: number,
    edgeCount: number
  ): number {
    if (nodeCount < 2) return 0;
    const maxPossibleEdges = (nodeCount * (nodeCount - 1)) / 2;
    return edgeCount / maxPossibleEdges;
  }

  /**
   * Generate flow diagram data
   */
  private generateFlowDiagram(
    pyusdTransactions: PYUSDTransactionDetails[],
    networkAnalysis: TokenNetworkAnalysis
  ): FlowDiagramData {
    // Limit to top flows for readability
    const topFlows = this.getTopFlows(pyusdTransactions, 10);

    // Create nodes
    const nodeMap = new Map<string, FlowNode>();
    const nodes: FlowNode[] = [];

    topFlows.forEach((tx) => {
      if (tx.from && !nodeMap.has(tx.from)) {
        const node: FlowNode = {
          id: tx.from,
          label: formatAddress(tx.from),
          type: "address",
          style: this.getNodeStyle("sender", 0),
        };
        nodeMap.set(tx.from, node);
        nodes.push(node);
      }

      if (tx.to && !nodeMap.has(tx.to)) {
        const node: FlowNode = {
          id: tx.to,
          label: formatAddress(tx.to),
          type: "address",
          style: this.getNodeStyle("receiver", 0),
        };
        nodeMap.set(tx.to, node);
        nodes.push(node);
      }
    });

    // Create edges
    const edges: FlowEdge[] = [];
    const edgeMap = new Map<string, FlowEdge>();

    topFlows.forEach((tx) => {
      if (tx.from && tx.to) {
        const edgeKey = `${tx.from}-${tx.to}`;
        if (edgeMap.has(edgeKey)) {
          const edge = edgeMap.get(edgeKey)!;
          edge.weight += Number(tx.amount) / 1e6;
        } else {
          const edge: FlowEdge = {
            from: tx.from,
            to: tx.to,
            label: formatPYUSD(tx.amount),
            weight: Number(tx.amount) / 1e6,
            style: this.getEdgeStyle(tx.success),
          };
          edgeMap.set(edgeKey, edge);
          edges.push(edge);
        }
      }
    });

    // Generate Graphviz DOT notation
    const graphvizDot = this.generateGraphvizDot(nodes, edges);

    return {
      nodes,
      edges,
      graphvizDot,
    };
  }

  /**
   * Get top flows by amount
   */
  private getTopFlows(
    pyusdTransactions: PYUSDTransactionDetails[],
    limit: number
  ): PYUSDTransactionDetails[] {
    return pyusdTransactions
      .filter(
        (tx) =>
          tx.type === "transfer" ||
          tx.type === "transferFrom" ||
          tx.type === "mint"
      )
      .sort((a, b) => Number(b.amount) - Number(a.amount))
      .slice(0, limit);
  }

  /**
   * Generate Graphviz DOT notation
   */
  private generateGraphvizDot(nodes: FlowNode[], edges: FlowEdge[]): string {
    let dot = "digraph TokenFlow {\n";
    dot += "  rankdir=LR;\n";
    dot += "  node [shape=box, style=rounded];\n";
    dot += "  edge [fontsize=10];\n\n";

    // Add nodes
    nodes.forEach((node) => {
      dot += `  "${node.id}" [label="${node.label}", fillcolor="${node.style.fillColor}", color="${node.style.color}"];\n`;
    });

    dot += "\n";

    // Add edges
    edges.forEach((edge) => {
      const style = edge.style.style === "dashed" ? ", style=dashed" : "";
      dot += `  "${edge.from}" -> "${edge.to}" [label="${edge.label}", color="${edge.style.color}"${style}];\n`;
    });

    dot += "}";
    return dot;
  }

  /**
   * Generate flow insights
   */
  private generateFlowInsights(
    pyusdTransactions: PYUSDTransactionDetails[],
    networkAnalysis: TokenNetworkAnalysis
  ): TokenFlowInsights {
    // Calculate top senders and receivers
    const senderMap = new Map<string, { volume: bigint; count: number }>();
    const receiverMap = new Map<string, { volume: bigint; count: number }>();
    const transfers: Array<{
      from: string;
      to: string;
      amount: bigint;
      txHash: string;
    }> = [];

    pyusdTransactions.forEach((tx) => {
      if (tx.from) {
        const sender = senderMap.get(tx.from) || { volume: 0n, count: 0 };
        sender.volume += tx.amount;
        sender.count++;
        senderMap.set(tx.from, sender);
      }

      if (tx.to) {
        const receiver = receiverMap.get(tx.to) || { volume: 0n, count: 0 };
        receiver.volume += tx.amount;
        receiver.count++;
        receiverMap.set(tx.to, receiver);
      }

      if (tx.from && tx.to) {
        transfers.push({
          from: tx.from,
          to: tx.to,
          amount: tx.amount,
          txHash: "unknown", // Would need to be passed from trace data
        });
      }
    });

    // Get top senders and receivers
    const topSenders = Array.from(senderMap.entries())
      .map(([address, data]) => ({ address, ...data }))
      .sort((a, b) => Number(b.volume) - Number(a.volume))
      .slice(0, 5);

    const topReceivers = Array.from(receiverMap.entries())
      .map(([address, data]) => ({ address, ...data }))
      .sort((a, b) => Number(b.volume) - Number(a.volume))
      .slice(0, 5);

    // Get largest transfers
    const largestTransfers = transfers
      .sort((a, b) => Number(b.amount) - Number(a.amount))
      .slice(0, 5);

    // Identify transfer patterns
    const transferPatterns = this.identifyTransferPatterns(pyusdTransactions);

    // Calculate network metrics
    const centralNodes = networkAnalysis.nodes
      .sort((a, b) => b.centrality - a.centrality)
      .slice(0, 3)
      .map((node) => node.address);

    const isolatedNodes = networkAnalysis.nodes
      .filter((node) => node.centrality === 0)
      .map((node) => node.address);

    return {
      topSenders,
      topReceivers,
      largestTransfers,
      transferPatterns,
      networkMetrics: {
        density: networkAnalysis.networkDensity,
        clustering: networkAnalysis.clusteringCoefficient,
        centralNodes,
        isolatedNodes,
      },
    };
  }

  /**
   * Identify transfer patterns
   */
  private identifyTransferPatterns(
    pyusdTransactions: PYUSDTransactionDetails[]
  ): Array<{
    pattern: string;
    count: number;
    description: string;
  }> {
    const patterns: Array<{
      pattern: string;
      count: number;
      description: string;
    }> = [];

    // Pattern 1: Large transfers (>$10,000 equivalent)
    const largeTransfers = pyusdTransactions.filter(
      (tx) => Number(tx.amount) > 10000 * 1e6
    );
    if (largeTransfers.length > 0) {
      patterns.push({
        pattern: "large_transfers",
        count: largeTransfers.length,
        description: "Transfers larger than $10,000 PYUSD",
      });
    }

    // Pattern 2: Micro transfers (<$1 equivalent)
    const microTransfers = pyusdTransactions.filter(
      (tx) => Number(tx.amount) < 1 * 1e6
    );
    if (microTransfers.length > 0) {
      patterns.push({
        pattern: "micro_transfers",
        count: microTransfers.length,
        description: "Transfers smaller than $1 PYUSD",
      });
    }

    // Pattern 3: Failed transfers
    const failedTransfers = pyusdTransactions.filter((tx) => !tx.success);
    if (failedTransfers.length > 0) {
      patterns.push({
        pattern: "failed_transfers",
        count: failedTransfers.length,
        description: "Failed PYUSD transfers",
      });
    }

    // Pattern 4: Minting activity
    const mintTransactions = pyusdTransactions.filter(
      (tx) => tx.type === "mint"
    );
    if (mintTransactions.length > 0) {
      patterns.push({
        pattern: "minting_activity",
        count: mintTransactions.length,
        description: "PYUSD minting transactions",
      });
    }

    return patterns;
  }

  /**
   * Helper methods for styling
   */
  private getNodeStyle(
    type: "sender" | "receiver",
    centrality: number
  ): {
    shape: string;
    color: string;
    fillColor: string;
    fontColor: string;
  } {
    const baseColor =
      type === "sender" ? CHART_COLORS.PRIMARY : CHART_COLORS.SUCCESS;
    const intensity = Math.min(centrality / 10, 1); // Normalize centrality

    return {
      shape: "box",
      color: baseColor,
      fillColor: `${baseColor}${Math.floor(intensity * 255)
        .toString(16)
        .padStart(2, "0")}`,
      fontColor: "#000000",
    };
  }

  private getEdgeStyle(success: boolean): {
    color: string;
    width: number;
    style: "solid" | "dashed" | "dotted";
  } {
    return {
      color: success ? CHART_COLORS.SUCCESS : CHART_COLORS.ERROR,
      width: success ? 2 : 1,
      style: success ? "solid" : "dashed",
    };
  }

  /**
   * Create empty analysis for blocks with no PYUSD activity
   */
  private createEmptyAnalysis(): TokenFlowAnalysis & {
    insights: TokenFlowInsights;
  } {
    return {
      pyusdTransactions: [],
      flowMetrics: {
        totalTransfers: 0,
        totalVolume: 0n,
        totalVolumeFormatted: "0 PYUSD",
        uniqueSenders: 0,
        uniqueReceivers: 0,
        averageTransferAmount: 0n,
        averageTransferAmountFormatted: "0 PYUSD",
        largestTransfer: 0n,
        largestTransferFormatted: "0 PYUSD",
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
        graphvizDot: "digraph EmptyFlow { }",
      },
      insights: {
        topSenders: [],
        topReceivers: [],
        largestTransfers: [],
        transferPatterns: [],
        networkMetrics: {
          density: 0,
          clustering: 0,
          centralNodes: [],
          isolatedNodes: [],
        },
      },
    };
  }
}
