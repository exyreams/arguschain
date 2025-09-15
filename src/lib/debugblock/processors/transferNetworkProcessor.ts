import {
  PyusdTransfer,
  TransferNetworkEdge,
  TransferNetworkNode,
} from "../types";
import { DISPLAY_CONFIG } from "../constants";

export interface GraphvizDiagramData {
  dotSource: string;
  nodes: TransferNetworkNode[];
  edges: TransferNetworkEdge[];
  metadata: {
    totalNodes: number;
    totalEdges: number;
    totalVolume: number;
    maxTransferValue: number;
    networkDensity: number;
  };
}

export interface NetworkTopology {
  centralNodes: Array<{
    address: string;
    centrality: number;
    type: "hub" | "authority";
  }>;
  isolatedNodes: string[];
  clusters: Array<{ nodes: string[]; totalVolume: number }>;
  criticalPaths: Array<{ path: string[]; volume: number }>;
}

export class TransferNetworkProcessor {
  static generateGraphvizDiagram(
    transfers: PyusdTransfer[],
    options: {
      layout?: "dot" | "neato" | "fdp" | "sfdp" | "circo" | "twopi";
      showLabels?: boolean;
      colorScheme?: "default" | "volume" | "frequency";
      minTransferValue?: number;
      maxNodes?: number;
    } = {},
  ): GraphvizDiagramData {
    const {
      layout = "fdp",
      showLabels = true,
      colorScheme = "volume",
      minTransferValue = 0,
      maxNodes = 50,
    } = options;

    const filteredTransfers = transfers.filter(
      (t) => t.value >= minTransferValue,
    );

    if (filteredTransfers.length === 0) {
      return this.createEmptyDiagram();
    }

    const transferMap = new Map<string, { value: number; count: number }>();
    const nodeSet = new Set<string>();

    for (const transfer of filteredTransfers) {
      const key = `${transfer.from}->${transfer.to}`;
      const existing = transferMap.get(key) || { value: 0, count: 0 };
      transferMap.set(key, {
        value: existing.value + transfer.value,
        count: existing.count + 1,
      });

      nodeSet.add(transfer.from);
      nodeSet.add(transfer.to);
    }

    let nodes = Array.from(nodeSet);
    if (nodes.length > maxNodes) {
      const nodeVolumes = new Map<string, number>();
      for (const [key, data] of transferMap.entries()) {
        const [from, to] = key.split("->");
        nodeVolumes.set(from, (nodeVolumes.get(from) || 0) + data.value);
        nodeVolumes.set(to, (nodeVolumes.get(to) || 0) + data.value);
      }

      nodes = nodes
        .sort((a, b) => (nodeVolumes.get(b) || 0) - (nodeVolumes.get(a) || 0))
        .slice(0, maxNodes);

      const nodeSetFiltered = new Set(nodes);
      for (const [key, data] of transferMap.entries()) {
        const [from, to] = key.split("->");
        if (!nodeSetFiltered.has(from) || !nodeSetFiltered.has(to)) {
          transferMap.delete(key);
        }
      }
    }

    const totalVolume = Array.from(transferMap.values()).reduce(
      (sum, data) => sum + data.value,
      0,
    );
    const maxTransferValue = Math.max(
      ...Array.from(transferMap.values()).map((data) => data.value),
    );

    const networkNodes: TransferNetworkNode[] = nodes.map((address) => ({
      id: address,
      label: this.shortenAddress(address),
      address,
    }));

    const networkEdges: TransferNetworkEdge[] = Array.from(
      transferMap.entries(),
    ).map(([key, data]) => {
      const [from, to] = key.split("->");
      return {
        from,
        to,
        value: data.value,
        value_formatted: this.formatPyusdValue(data.value),
      };
    });

    const dotSource = this.generateDotSource(networkNodes, networkEdges, {
      layout,
      showLabels,
      colorScheme,
      maxTransferValue,
      totalVolume,
    });

    const metadata = {
      totalNodes: networkNodes.length,
      totalEdges: networkEdges.length,
      totalVolume,
      maxTransferValue,
      networkDensity:
        networkEdges.length / (networkNodes.length * (networkNodes.length - 1)),
    };

    return {
      dotSource,
      nodes: networkNodes,
      edges: networkEdges,
      metadata,
    };
  }

  static analyzeNetworkTopology(
    nodes: TransferNetworkNode[],
    edges: TransferNetworkEdge[],
  ): NetworkTopology {
    const inDegree = new Map<string, number>();
    const outDegree = new Map<string, number>();
    const volumeIn = new Map<string, number>();
    const volumeOut = new Map<string, number>();

    for (const node of nodes) {
      inDegree.set(node.id, 0);
      outDegree.set(node.id, 0);
      volumeIn.set(node.id, 0);
      volumeOut.set(node.id, 0);
    }

    for (const edge of edges) {
      inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
      outDegree.set(edge.from, (outDegree.get(edge.from) || 0) + 1);
      volumeIn.set(edge.to, (volumeIn.get(edge.to) || 0) + edge.value);
      volumeOut.set(edge.from, (volumeOut.get(edge.from) || 0) + edge.value);
    }

    const centralNodes: Array<{
      address: string;
      centrality: number;
      type: "hub" | "authority";
    }> = [];

    for (const node of nodes) {
      const inDeg = inDegree.get(node.id) || 0;
      const outDeg = outDegree.get(node.id) || 0;
      const volIn = volumeIn.get(node.id) || 0;
      const volOut = volumeOut.get(node.id) || 0;

      if (outDeg >= 3 && volOut > 0) {
        centralNodes.push({
          address: node.id,
          centrality: outDeg + volOut / 1e6,
          type: "hub",
        });
      }

      if (inDeg >= 3 && volIn > 0) {
        centralNodes.push({
          address: node.id,
          centrality: inDeg + volIn / 1e6,
          type: "authority",
        });
      }
    }

    centralNodes.sort((a, b) => b.centrality - a.centrality);

    const isolatedNodes = nodes
      .filter((node) => {
        const inDeg = inDegree.get(node.id) || 0;
        const outDeg = outDegree.get(node.id) || 0;
        return inDeg === 0 && outDeg === 0;
      })
      .map((node) => node.id);

    const clusters: Array<{ nodes: string[]; totalVolume: number }> = [];
    const processedNodes = new Set<string>();

    for (const hub of centralNodes
      .filter((n) => n.type === "hub")
      .slice(0, 5)) {
      if (processedNodes.has(hub.address)) continue;

      const clusterNodes = [hub.address];
      let clusterVolume = volumeOut.get(hub.address) || 0;

      for (const edge of edges) {
        if (edge.from === hub.address && !processedNodes.has(edge.to)) {
          clusterNodes.push(edge.to);
          clusterVolume += edge.value;
          processedNodes.add(edge.to);
        }
      }

      if (clusterNodes.length > 1) {
        clusters.push({ nodes: clusterNodes, totalVolume: clusterVolume });
      }

      processedNodes.add(hub.address);
    }

    const criticalPaths: Array<{ path: string[]; volume: number }> = [];
    const highVolumeEdges = edges
      .filter(
        (edge) =>
          edge.value >
          edges.reduce((sum, e) => sum + e.value, 0) / edges.length,
      )
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    for (const edge of highVolumeEdges) {
      criticalPaths.push({
        path: [edge.from, edge.to],
        volume: edge.value,
      });
    }

    return {
      centralNodes: centralNodes.slice(0, 10),
      isolatedNodes,
      clusters,
      criticalPaths,
    };
  }

  static generateLayoutSuggestions(
    nodes: TransferNetworkNode[],
    edges: TransferNetworkEdge[],
  ): {
    recommendedLayout: string;
    layoutOptions: Array<{
      layout: string;
      description: string;
      bestFor: string;
      performance: "fast" | "medium" | "slow";
    }>;
    optimizationTips: string[];
  } {
    const nodeCount = nodes.length;
    const edgeCount = edges.length;
    const density = edgeCount / (nodeCount * (nodeCount - 1));

    let recommendedLayout = "fdp";
    const optimizationTips: string[] = [];

    if (nodeCount <= 10) {
      recommendedLayout = "dot";
    } else if (nodeCount <= 50 && density > 0.1) {
      recommendedLayout = "neato";
    } else if (nodeCount <= 100) {
      recommendedLayout = "fdp";
    } else {
      recommendedLayout = "sfdp";
      optimizationTips.push(
        "Large network detected - consider filtering to show only high-value transfers",
      );
    }

    if (density > 0.3) {
      optimizationTips.push(
        "Dense network - consider increasing minimum transfer value filter",
      );
    }

    if (edgeCount > nodeCount * 2) {
      optimizationTips.push(
        "Many connections per node - edge bundling might improve readability",
      );
    }

    const layoutOptions = [
      {
        layout: "dot",
        description: "Hierarchical layout with clear direction",
        bestFor: "Small networks with clear flow direction",
        performance: "fast" as const,
      },
      {
        layout: "neato",
        description: "Spring model layout for balanced positioning",
        bestFor: "Medium networks with moderate connectivity",
        performance: "medium" as const,
      },
      {
        layout: "fdp",
        description: "Force-directed layout with good node separation",
        bestFor: "Medium to large networks with complex relationships",
        performance: "medium" as const,
      },
      {
        layout: "sfdp",
        description: "Scalable force-directed layout for large networks",
        bestFor: "Large networks with many nodes",
        performance: "slow" as const,
      },
      {
        layout: "circo",
        description: "Circular layout emphasizing cycles",
        bestFor: "Networks with circular flow patterns",
        performance: "fast" as const,
      },
    ];

    return {
      recommendedLayout,
      layoutOptions,
      optimizationTips,
    };
  }

  private static generateDotSource(
    nodes: TransferNetworkNode[],
    edges: TransferNetworkEdge[],
    options: {
      layout: string;
      showLabels: boolean;
      colorScheme: string;
      maxTransferValue: number;
      totalVolume: number;
    },
  ): string {
    const { layout, showLabels, colorScheme, maxTransferValue } = options;

    let dotSource = `digraph PyusdTransferNetwork {\n`;
    dotSource += `  layout=${layout};\n`;
    dotSource += `  rankdir=LR;\n`;
    dotSource += `  node [shape=ellipse, style=filled];\n`;
    dotSource += `  edge [arrowhead=vee];\n`;
    dotSource += `  bgcolor=transparent;\n\n`;

    for (const node of nodes) {
      const nodeId = this.sanitizeNodeId(node.id);
      const label = showLabels ? node.label : "";
      const color = this.getNodeColor(node, colorScheme);

      dotSource += `  "${nodeId}" [label="${label}", fillcolor="${color}", fontsize=10];\n`;
    }

    dotSource += `\n`;

    for (const edge of edges) {
      const fromId = this.sanitizeNodeId(edge.from);
      const toId = this.sanitizeNodeId(edge.to);
      const weight = Math.max(
        1,
        Math.round((edge.value / maxTransferValue) * 10),
      );
      const color = this.getEdgeColor(edge, colorScheme, maxTransferValue);
      const label = showLabels ? edge.value_formatted : "";

      dotSource += `  "${fromId}" -> "${toId}" [weight=${weight}, color="${color}", penwidth=${Math.max(1, weight / 2)}, label="${label}", fontsize=8];\n`;
    }

    dotSource += `}\n`;

    return dotSource;
  }

  private static createEmptyDiagram(): GraphvizDiagramData {
    return {
      dotSource: `digraph EmptyNetwork {\n  label="No PYUSD transfers found";\n  labelloc=c;\n}\n`,
      nodes: [],
      edges: [],
      metadata: {
        totalNodes: 0,
        totalEdges: 0,
        totalVolume: 0,
        maxTransferValue: 0,
        networkDensity: 0,
      },
    };
  }

  private static sanitizeNodeId(nodeId: string): string {
    return nodeId.replace(/[^a-zA-Z0-9]/g, "_");
  }

  private static getNodeColor(
    node: TransferNetworkNode,
    colorScheme: string,
  ): string {
    switch (colorScheme) {
      case "volume":
        return "#4CAF50";
      case "frequency":
        return "#2196F3";
      default:
        return "#9E9E9E";
    }
  }

  private static getEdgeColor(
    edge: TransferNetworkEdge,
    colorScheme: string,
    maxValue: number,
  ): string {
    const intensity = edge.value / maxValue;

    switch (colorScheme) {
      case "volume":
        const red = Math.round(255 * intensity);
        return `#${red.toString(16).padStart(2, "0")}4444`;
      case "frequency":
        return "#1976D2";
      default:
        return "#666666";
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
    if (value === 0) return "0";
    try {
      const pyusdValue = value / 1e6;
      if (pyusdValue >= 1000000) {
        return `${(pyusdValue / 1000000).toFixed(1)}M`;
      } else if (pyusdValue >= 1000) {
        return `${(pyusdValue / 1000).toFixed(1)}K`;
      } else {
        return pyusdValue.toFixed(DISPLAY_CONFIG.PYUSD_DECIMAL_PLACES);
      }
    } catch (error) {
      return "0";
    }
  }
}
