import { useMemo, useState } from "react";
import {
  PyusdTransfer,
  TransferNetworkEdge,
  TransferNetworkNode,
} from "@/lib/debugblock/types";
import { shortenAddress } from "@/lib/config";
import { Network } from "lucide-react";

interface TransferNetworkChartProps {
  transfers: PyusdTransfer[];
  height?: number;
  className?: string;
}

interface NetworkNode extends TransferNetworkNode {
  x: number;
  y: number;
  totalVolume: number;
  transferCount: number;
  nodeType: "sender" | "receiver" | "both";
}

interface NetworkEdge extends TransferNetworkEdge {
  id: string;
  thickness: number;
}

export function TransferNetworkChart({
  transfers,
  height = 400,
  className = "",
}: TransferNetworkChartProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showLabels, setShowLabels] = useState(true);

  const { nodes, edges, networkStats } = useMemo(() => {
    if (!transfers || transfers.length === 0) {
      return {
        nodes: [],
        edges: [],
        networkStats: { totalVolume: 0, uniqueAddresses: 0, maxTransfer: 0 },
      };
    }

    const nodeMap = new Map<
      string,
      {
        address: string;
        totalSent: number;
        totalReceived: number;
        transferCount: number;
        connections: Set<string>;
      }
    >();

    const edgeMap = new Map<
      string,
      {
        from: string;
        to: string;
        totalValue: number;
        transferCount: number;
      }
    >();

    let totalVolume = 0;
    let maxTransfer = 0;

    transfers.forEach((transfer) => {
      const { from, to, value } = transfer;
      totalVolume += value;
      maxTransfer = Math.max(maxTransfer, value);

      if (!nodeMap.has(from)) {
        nodeMap.set(from, {
          address: from,
          totalSent: 0,
          totalReceived: 0,
          transferCount: 0,
          connections: new Set(),
        });
      }
      if (!nodeMap.has(to)) {
        nodeMap.set(to, {
          address: to,
          totalSent: 0,
          totalReceived: 0,
          transferCount: 0,
          connections: new Set(),
        });
      }

      const fromNode = nodeMap.get(from)!;
      const toNode = nodeMap.get(to)!;

      fromNode.totalSent += value;
      fromNode.transferCount++;
      fromNode.connections.add(to);

      toNode.totalReceived += value;
      toNode.transferCount++;
      toNode.connections.add(from);

      const edgeKey = `${from}->${to}`;
      if (!edgeMap.has(edgeKey)) {
        edgeMap.set(edgeKey, {
          from,
          to,
          totalValue: 0,
          transferCount: 0,
        });
      }
      const edge = edgeMap.get(edgeKey)!;
      edge.totalValue += value;
      edge.transferCount++;
    });

    const nodeArray = Array.from(nodeMap.entries());
    const centerX = 200;
    const centerY = 200;
    const radius = 150;

    const nodes: NetworkNode[] = nodeArray.map(([address, data], index) => {
      const angle = (index / nodeArray.length) * 2 * Math.PI;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      const nodeType =
        data.totalSent > 0 && data.totalReceived > 0
          ? "both"
          : data.totalSent > 0
            ? "sender"
            : "receiver";

      return {
        id: address,
        label: shortenAddress(address),
        address,
        x,
        y,
        totalVolume: data.totalSent + data.totalReceived,
        transferCount: data.transferCount,
        nodeType,
      };
    });

    const edges: NetworkEdge[] = Array.from(edgeMap.entries()).map(
      ([key, data]) => {
        const thickness = Math.max(
          2,
          Math.min(8, (data.totalValue / maxTransfer) * 8),
        );

        return {
          id: key,
          from: data.from,
          to: data.to,
          value: data.totalValue,
          value_formatted: `${(data.totalValue / 1e6).toFixed(2)} PYUSD`,
          thickness,
        };
      },
    );

    return {
      nodes,
      edges,
      networkStats: {
        totalVolume,
        uniqueAddresses: nodeArray.length,
        maxTransfer,
      },
    };
  }, [transfers]);

  if (!transfers || transfers.length === 0) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
            <Network className="h-8 w-8 text-[#00bfff]" />
          </div>
          <p className="text-[#8b9dc3] text-sm">
            No PYUSD transfer data available
          </p>
        </div>
      </div>
    );
  }

  const getNodeColor = (node: NetworkNode) => {
    if (selectedNode === node.id) return "#00bfff";
    switch (node.nodeType) {
      case "sender":
        return "#ef4444";
      case "receiver":
        return "#10b981";
      case "both":
        return "#8b5cf6";
      default:
        return "#6b7280";
    }
  };

  const getNodeSize = (node: NetworkNode) => {
    const minSize = 8;
    const maxSize = 20;
    const ratio =
      networkStats.totalVolume > 0
        ? node.totalVolume / networkStats.totalVolume
        : 0;
    return Math.max(minSize, ratio * maxSize * nodes.length);
  };

  const getEdgeOpacity = (edge: NetworkEdge) => {
    if (!selectedNode) return 0.6;
    return edge.from === selectedNode || edge.to === selectedNode ? 1 : 0.2;
  };

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold text-[#00bfff]">
            PYUSD Transfer Network
          </h3>
          <p className="text-sm text-[#8b9dc3]">
            {transfers.length} transfers between {networkStats.uniqueAddresses}{" "}
            addresses
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowLabels(!showLabels)}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              showLabels
                ? "bg-[rgba(0,191,255,0.2)] text-[#00bfff] border border-[rgba(0,191,255,0.3)]"
                : "bg-[rgba(15,20,25,0.8)] text-[#8b9dc3] border border-[rgba(0,191,255,0.3)] hover:bg-[rgba(0,191,255,0.1)]"
            }`}
          >
            Labels
          </button>
          <button
            onClick={() => setSelectedNode(null)}
            className="px-3 py-1 rounded text-sm bg-[rgba(15,20,25,0.8)] text-[#8b9dc3] border border-[rgba(0,191,255,0.3)] hover:bg-[rgba(0,191,255,0.1)]"
          >
            Clear Selection
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div
            className="bg-[rgba(15,20,25,0.6)] rounded-lg border border-[rgba(0,191,255,0.2)] relative overflow-hidden"
            style={{ height: height - 50 }}
          >
            <svg width="100%" height="100%" viewBox="0 0 400 400">
              {edges.map((edge) => {
                const fromNode = nodes.find((n) => n.id === edge.from);
                const toNode = nodes.find((n) => n.id === edge.to);

                if (!fromNode || !toNode) return null;

                return (
                  <g key={edge.id}>
                    <line
                      x1={fromNode.x}
                      y1={fromNode.y}
                      x2={toNode.x}
                      y2={toNode.y}
                      stroke="#00bfff"
                      strokeWidth={edge.thickness}
                      opacity={getEdgeOpacity(edge)}
                      className="transition-opacity duration-200"
                    />

                    <defs>
                      <marker
                        id={`arrow-${edge.id}`}
                        viewBox="0 0 10 10"
                        refX="9"
                        refY="3"
                        markerWidth="6"
                        markerHeight="6"
                        orient="auto"
                      >
                        <path
                          d="M0,0 L0,6 L9,3 z"
                          fill="#00bfff"
                          opacity={getEdgeOpacity(edge)}
                        />
                      </marker>
                    </defs>
                    <line
                      x1={fromNode.x}
                      y1={fromNode.y}
                      x2={toNode.x}
                      y2={toNode.y}
                      stroke="transparent"
                      strokeWidth={edge.thickness}
                      markerEnd={`url(#arrow-${edge.id})`}
                    />
                  </g>
                );
              })}

              {nodes.map((node) => (
                <g key={node.id}>
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={getNodeSize(node)}
                    fill={getNodeColor(node)}
                    stroke={
                      selectedNode === node.id ? "#ffffff" : "transparent"
                    }
                    strokeWidth="2"
                    className="cursor-pointer transition-all duration-200 hover:stroke-white"
                    onClick={() =>
                      setSelectedNode(selectedNode === node.id ? null : node.id)
                    }
                  />

                  {showLabels && (
                    <text
                      x={node.x}
                      y={node.y + getNodeSize(node) + 12}
                      textAnchor="middle"
                      className="text-xs fill-[#8b9dc3] pointer-events-none"
                      fontSize="10"
                    >
                      {node.label}
                    </text>
                  )}
                </g>
              ))}
            </svg>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-[rgba(15,20,25,0.6)] rounded-lg p-4">
            <h4 className="text-sm font-medium text-[#00bfff] mb-3">
              Network Statistics
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#8b9dc3]">Total Volume:</span>
                <span className="text-[#10b981] font-medium">
                  {(networkStats.totalVolume / 1e6).toFixed(2)} PYUSD
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8b9dc3]">Addresses:</span>
                <span className="text-[#00bfff] font-medium">
                  {networkStats.uniqueAddresses}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8b9dc3]">Transfers:</span>
                <span className="text-[#00bfff] font-medium">
                  {transfers.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8b9dc3]">Largest Transfer:</span>
                <span className="text-[#f59e0b] font-medium">
                  {(networkStats.maxTransfer / 1e6).toFixed(2)} PYUSD
                </span>
              </div>
            </div>
          </div>

          {selectedNode && (
            <div className="bg-[rgba(15,20,25,0.6)] rounded-lg p-4">
              <h4 className="text-sm font-medium text-[#00bfff] mb-3">
                Selected Address
              </h4>
              {(() => {
                const node = nodes.find((n) => n.id === selectedNode);
                if (!node) return null;

                const relatedTransfers = transfers.filter(
                  (t) => t.from === selectedNode || t.to === selectedNode,
                );

                return (
                  <div className="space-y-2 text-sm">
                    <div className="font-mono text-[#00bfff] text-xs break-all">
                      {node.address}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8b9dc3]">Type:</span>
                      <span
                        className={`font-medium capitalize ${
                          node.nodeType === "sender"
                            ? "text-[#ef4444]"
                            : node.nodeType === "receiver"
                              ? "text-[#10b981]"
                              : "text-[#8b5cf6]"
                        }`}
                      >
                        {node.nodeType}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8b9dc3]">Total Volume:</span>
                      <span className="text-[#10b981] font-medium">
                        {(node.totalVolume / 1e6).toFixed(2)} PYUSD
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8b9dc3]">Transfers:</span>
                      <span className="text-[#00bfff] font-medium">
                        {relatedTransfers.length}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          <div className="bg-[rgba(15,20,25,0.6)] rounded-lg p-4">
            <h4 className="text-sm font-medium text-[#00bfff] mb-3">Legend</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#ef4444] rounded-full"></div>
                <span className="text-[#8b9dc3]">Sender Only</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#10b981] rounded-full"></div>
                <span className="text-[#8b9dc3]">Receiver Only</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#8b5cf6] rounded-full"></div>
                <span className="text-[#8b9dc3]">Both Sender & Receiver</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-[#00bfff]"></div>
                <span className="text-[#8b9dc3]">Transfer Flow</span>
              </div>
            </div>
          </div>

          <div className="bg-[rgba(15,20,25,0.6)] rounded-lg p-4">
            <h4 className="text-sm font-medium text-[#00bfff] mb-3">
              Top Participants
            </h4>
            <div className="space-y-2">
              {nodes
                .sort((a, b) => b.totalVolume - a.totalVolume)
                .slice(0, 3)
                .map((node, index) => (
                  <div
                    key={node.id}
                    className="flex items-center justify-between text-xs cursor-pointer hover:bg-[rgba(0,191,255,0.1)] p-1 rounded"
                    onClick={() => setSelectedNode(node.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[#00bfff] font-bold">
                        #{index + 1}
                      </span>
                      <span className="text-[#8b9dc3] font-mono">
                        {node.label}
                      </span>
                    </div>
                    <span className="text-[#10b981] font-medium">
                      {(node.totalVolume / 1e6).toFixed(1)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
