import React, { useCallback, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Badge, Button, Input } from "@/components/global";
import {
  Activity,
  BarChart3,
  Coins,
  Download,
  EyeOff,
  Filter,
  Maximize2,
  Minimize2,
  Network,
  Pause,
  Play,
  RotateCcw,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  ResponsiveContainer,
  Sankey,
  Tooltip as RechartsTooltip,
} from "recharts";
import ReactFlow, {
  Background,
  ConnectionMode,
  Controls,
  Position,
  useEdgesState,
  useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";
import type {
  ProcessedReplayData,
  TokenTransfer,
} from "@/lib/replaytransactions/types";

interface TokenFlowVisualizerProps {
  processedData: ProcessedReplayData;
  className?: string;
  onTransferSelect?: (transfer: TokenTransfer) => void;
}

interface FlowNode {
  id: string;
  address: string;
  label: string;
  totalIn: number;
  totalOut: number;
  netFlow: number;
  transferCount: number;
  isContract: boolean;
  isPYUSDContract: boolean;
}

interface FlowEdge {
  id: string;
  from: string;
  to: string;
  amount: number;
  formattedAmount: string;
  transferCount: number;
  transfers: TokenTransfer[];
}

interface FilterState {
  minAmount: number;
  maxAmount: number;
  showOnlyPYUSD: boolean;
  hideSmallTransfers: boolean;
  selectedAddresses: string[];
  transferTypes: string[];
}

const PYUSD_CONTRACT = "0xa2327a938febf5fec13bacfb16ae10ecbc4cbdcf";

export const TokenFlowVisualizer: React.FC<TokenFlowVisualizerProps> = ({
  processedData,
  className,
  onTransferSelect,
}) => {
  const [viewType, setViewType] = useState<"sankey" | "network" | "table">(
    "network",
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterState>({
    minAmount: 0,
    maxAmount: Infinity,
    showOnlyPYUSD: true,
    hideSmallTransfers: true,
    selectedAddresses: [],
    transferTypes: ["transfer", "mint", "burn"],
  });

  const tokenTransfers = useMemo((): TokenTransfer[] => {
    const tokenAnalysis = processedData.tokenAnalysis;
    if (!tokenAnalysis) return [];

    return tokenAnalysis.tokenTransfers.filter((transfer) => {
      const amount = Number(transfer.amount) / 1e6;

      if (amount < filters.minAmount || amount > filters.maxAmount)
        return false;
      if (
        filters.showOnlyPYUSD &&
        transfer.tokenAddress.toLowerCase() !== PYUSD_CONTRACT.toLowerCase()
      )
        return false;
      if (filters.hideSmallTransfers && amount < 1) return false;

      if (filters.selectedAddresses.length > 0) {
        const hasSelectedAddress = filters.selectedAddresses.some(
          (addr) =>
            transfer.from.toLowerCase() === addr.toLowerCase() ||
            transfer.to.toLowerCase() === addr.toLowerCase(),
        );
        if (!hasSelectedAddress) return false;
      }

      return true;
    });
  }, [processedData, filters]);

  const { flowNodes, flowEdges } = useMemo(() => {
    const nodeMap = new Map<string, FlowNode>();
    const edgeMap = new Map<string, FlowEdge>();

    tokenTransfers.forEach((transfer) => {
      const fromAddr = transfer.from;
      const toAddr = transfer.to;
      const amount = Number(transfer.amount) / 1e6;

      if (!nodeMap.has(fromAddr)) {
        nodeMap.set(fromAddr, {
          id: fromAddr,
          address: fromAddr,
          label: getAddressLabel(fromAddr),
          totalIn: 0,
          totalOut: 0,
          netFlow: 0,
          transferCount: 0,
          isContract: isContractAddress(fromAddr),
          isPYUSDContract:
            fromAddr.toLowerCase() === PYUSD_CONTRACT.toLowerCase(),
        });
      }

      if (!nodeMap.has(toAddr)) {
        nodeMap.set(toAddr, {
          id: toAddr,
          address: toAddr,
          label: getAddressLabel(toAddr),
          totalIn: 0,
          totalOut: 0,
          netFlow: 0,
          transferCount: 0,
          isContract: isContractAddress(toAddr),
          isPYUSDContract:
            toAddr.toLowerCase() === PYUSD_CONTRACT.toLowerCase(),
        });
      }

      const fromNode = nodeMap.get(fromAddr)!;
      const toNode = nodeMap.get(toAddr)!;

      fromNode.totalOut += amount;
      fromNode.transferCount++;
      toNode.totalIn += amount;
      toNode.transferCount++;

      const edgeId = `${fromAddr}-${toAddr}`;
      if (!edgeMap.has(edgeId)) {
        edgeMap.set(edgeId, {
          id: edgeId,
          from: fromAddr,
          to: toAddr,
          amount: 0,
          formattedAmount: "",
          transferCount: 0,
          transfers: [],
        });
      }

      const edge = edgeMap.get(edgeId)!;
      edge.amount += amount;
      edge.transferCount++;
      edge.transfers.push(transfer);
      edge.formattedAmount = `${edge.amount.toLocaleString()} PYUSD`;
    });

    nodeMap.forEach((node) => {
      node.netFlow = node.totalIn - node.totalOut;
    });

    return {
      flowNodes: Array.from(nodeMap.values()),
      flowEdges: Array.from(edgeMap.values()),
    };
  }, [tokenTransfers]);

  const [nodes, setNodes, onNodesChange] = useNodesState(
    useMemo(() => {
      return flowNodes.map((node, index) => {
        const angle = (index / flowNodes.length) * 2 * Math.PI;
        const radius = 300;

        return {
          id: node.id,
          type: "default",
          position: {
            x: Math.cos(angle) * radius + 400,
            y: Math.sin(angle) * radius + 300,
          },
          data: {
            label: (
              <div className="text-center">
                <div className="font-medium text-xs mb-1">{node.label}</div>
                <div className="text-xs text-muted-foreground">
                  {node.netFlow > 0 ? "+" : ""}
                  {node.netFlow.toFixed(2)} PYUSD
                </div>
              </div>
            ),
          },
          style: {
            background: node.isPYUSDContract
              ? "#fbbf24"
              : node.isContract
                ? "#3b82f6"
                : node.netFlow > 0
                  ? "#10b981"
                  : node.netFlow < 0
                    ? "#ef4444"
                    : "#6b7280",
            color: "white",
            border:
              selectedNode === node.id
                ? "3px solid #8b5cf6"
                : "1px solid #374151",
            borderRadius: "8px",
            fontSize: "10px",
            width: Math.max(80, Math.min(120, Math.abs(node.netFlow) * 2 + 80)),
            height: Math.max(
              60,
              Math.min(80, Math.abs(node.netFlow) * 1.5 + 60),
            ),
          },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
        };
      });
    }, [flowNodes, selectedNode]),
  );

  const [edges, setEdges, onEdgesChange] = useEdgesState(
    useMemo(() => {
      return flowEdges.map((edge) => ({
        id: edge.id,
        source: edge.from,
        target: edge.to,
        label: edge.formattedAmount,
        style: {
          strokeWidth: Math.max(1, Math.min(8, edge.amount / 1000)),
          stroke: "#8b5cf6",
        },
        labelStyle: {
          fontSize: "10px",
          fontWeight: "bold",
        },
        animated: isAnimating,
      }));
    }, [flowEdges, isAnimating]),
  );

  const sankeyData = useMemo(() => {
    const sankeyNodes = flowNodes.map((node) => ({
      name: node.label,
      id: node.id,
    }));

    const sankeyLinks = flowEdges.map((edge) => ({
      source: flowNodes.findIndex((n) => n.id === edge.from),
      target: flowNodes.findIndex((n) => n.id === edge.to),
      value: edge.amount,
    }));

    return { nodes: sankeyNodes, links: sankeyLinks };
  }, [flowNodes, flowEdges]);

  const onNodeClick = useCallback(
    (event: any, node: any) => {
      setSelectedNode(selectedNode === node.id ? null : node.id);
    },
    [selectedNode],
  );

  const handleExport = useCallback(() => {
    const exportData = {
      nodes: flowNodes,
      edges: flowEdges,
      transfers: tokenTransfers,
      summary: {
        totalTransfers: tokenTransfers.length,
        totalVolume:
          tokenTransfers.reduce((sum, t) => sum + Number(t.amount), 0) / 1e6,
        uniqueAddresses: new Set([
          ...tokenTransfers.map((t) => t.from),
          ...tokenTransfers.map((t) => t.to),
        ]).size,
      },
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `token-flow-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [flowNodes, flowEdges, tokenTransfers]);

  const statistics = useMemo(() => {
    const totalVolume =
      tokenTransfers.reduce((sum, t) => sum + Number(t.amount), 0) / 1e6;
    const uniqueAddresses = new Set([
      ...tokenTransfers.map((t) => t.from),
      ...tokenTransfers.map((t) => t.to),
    ]).size;
    const largestTransfer = Math.max(
      ...tokenTransfers.map((t) => Number(t.amount) / 1e6),
    );
    const averageTransfer = totalVolume / tokenTransfers.length;

    return {
      totalVolume,
      uniqueAddresses,
      largestTransfer,
      averageTransfer,
      transferCount: tokenTransfers.length,
    };
  }, [tokenTransfers]);

  return (
    <div
      className={cn(
        "space-y-4",
        isFullscreen && "fixed inset-0 z-50 bg-background p-4",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Coins className="h-5 w-5 text-yellow-500" />
          <h2 className="text-xl font-semibold">Token Flow Visualization</h2>
          <Badge variant="outline">{statistics.transferCount} transfers</Badge>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex space-x-1 bg-muted rounded-lg p-1">
            {(["network", "sankey", "table"] as const).map((type) => (
              <Button
                key={type}
                variant={viewType === type ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewType(type)}
                className="capitalize"
              >
                {type === "network" && <Network className="h-4 w-4 mr-1" />}
                {type === "sankey" && <BarChart3 className="h-4 w-4 mr-1" />}
                {type === "table" && <Activity className="h-4 w-4 mr-1" />}
                {type}
              </Button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>

          {viewType === "network" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAnimating(!isAnimating)}
            >
              {isAnimating ? (
                <Pause className="h-4 w-4 mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {isAnimating ? "Pause" : "Animate"}
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-card rounded-lg border p-3">
          <div className="flex items-center space-x-2 mb-1">
            <Coins className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium">Total Volume</span>
          </div>
          <p className="text-lg font-bold">
            {statistics.totalVolume.toLocaleString()} PYUSD
          </p>
        </div>

        <div className="bg-card rounded-lg border p-3">
          <div className="flex items-center space-x-2 mb-1">
            <Users className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">Unique Addresses</span>
          </div>
          <p className="text-lg font-bold">{statistics.uniqueAddresses}</p>
        </div>

        <div className="bg-card rounded-lg border p-3">
          <div className="flex items-center space-x-2 mb-1">
            <Activity className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">Transfers</span>
          </div>
          <p className="text-lg font-bold">{statistics.transferCount}</p>
        </div>

        <div className="bg-card rounded-lg border p-3">
          <div className="flex items-center space-x-2 mb-1">
            <TrendingUp className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium">Largest Transfer</span>
          </div>
          <p className="text-lg font-bold">
            {statistics.largestTransfer.toLocaleString()}
          </p>
        </div>

        <div className="bg-card rounded-lg border p-3">
          <div className="flex items-center space-x-2 mb-1">
            <BarChart3 className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-medium">Average Transfer</span>
          </div>
          <p className="text-lg font-bold">
            {statistics.averageTransfer.toFixed(2)}
          </p>
        </div>
      </div>

      {showFilters && (
        <div className="bg-card rounded-lg border p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Min Amount (PYUSD)
              </label>
              <Input
                type="number"
                value={filters.minAmount}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    minAmount: Number(e.target.value) || 0,
                  }))
                }
                placeholder="0"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Max Amount (PYUSD)
              </label>
              <Input
                type="number"
                value={filters.maxAmount === Infinity ? "" : filters.maxAmount}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    maxAmount: Number(e.target.value) || Infinity,
                  }))
                }
                placeholder="No limit"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Options</label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.showOnlyPYUSD}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        showOnlyPYUSD: e.target.checked,
                      }))
                    }
                    className="rounded"
                  />
                  <span className="text-sm">PYUSD Only</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.hideSmallTransfers}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        hideSmallTransfers: e.target.checked,
                      }))
                    }
                    className="rounded"
                  />
                  <span className="text-sm">Hide Small Transfers</span>
                </label>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Selected Address
              </label>
              <Input
                placeholder="0x..."
                value={filters.selectedAddresses[0] || ""}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    selectedAddresses: e.target.value ? [e.target.value] : [],
                  }))
                }
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setFilters({
                  minAmount: 0,
                  maxAmount: Infinity,
                  showOnlyPYUSD: true,
                  hideSmallTransfers: true,
                  selectedAddresses: [],
                  transferTypes: ["transfer", "mint", "burn"],
                })
              }
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset Filters
            </Button>
          </div>
        </div>
      )}

      <div
        className="bg-card rounded-lg border"
        style={{ height: isFullscreen ? "calc(100vh - 300px)" : "600px" }}
      >
        {viewType === "network" && (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            connectionMode={ConnectionMode.Loose}
            fitView
            attributionPosition="bottom-left"
          >
            <Background />
            <Controls />
          </ReactFlow>
        )}

        {viewType === "sankey" && (
          <ResponsiveContainer width="100%" height="100%">
            <Sankey
              data={sankeyData}
              nodeWidth={10}
              nodePadding={60}
              margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
            >
              <RechartsTooltip
                formatter={(value: number, name: string) => [
                  `${value.toLocaleString()} PYUSD`,
                  name,
                ]}
              />
            </Sankey>
          </ResponsiveContainer>
        )}

        {viewType === "table" && (
          <div className="p-4 h-full overflow-auto">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Transfer Details</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">From</th>
                      <th className="text-left py-2">To</th>
                      <th className="text-right py-2">Amount</th>
                      <th className="text-right py-2">Token</th>
                      <th className="text-right py-2">Index</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tokenTransfers.slice(0, 50).map((transfer, index) => (
                      <tr
                        key={index}
                        className="border-b hover:bg-accent/50 cursor-pointer"
                        onClick={() => onTransferSelect?.(transfer)}
                      >
                        <td className="py-2 font-mono text-sm">
                          {getAddressLabel(transfer.from)}
                        </td>
                        <td className="py-2 font-mono text-sm">
                          {getAddressLabel(transfer.to)}
                        </td>
                        <td className="text-right py-2 font-medium">
                          {transfer.formattedAmount}
                        </td>
                        <td className="text-right py-2">
                          <Badge variant="outline">
                            {transfer.tokenSymbol}
                          </Badge>
                        </td>
                        <td className="text-right py-2 text-sm text-muted-foreground">
                          #{transfer.transactionIndex}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {tokenTransfers.length > 50 && (
                  <div className="text-center py-4 text-muted-foreground">
                    Showing first 50 of {tokenTransfers.length} transfers
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedNode && viewType === "network" && (
        <div className="bg-card rounded-lg border p-4">
          {(() => {
            const node = flowNodes.find((n) => n.id === selectedNode);
            if (!node) return null;

            return (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Address Details</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedNode(null)}
                  >
                    <EyeOff className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Address
                    </p>
                    <p className="font-mono text-sm">{node.label}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Total In
                    </p>
                    <p className="text-lg font-bold text-green-600">
                      {node.totalIn.toLocaleString()} PYUSD
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Out
                    </p>
                    <p className="text-lg font-bold text-red-600">
                      {node.totalOut.toLocaleString()} PYUSD
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Net Flow
                    </p>
                    <p
                      className={cn(
                        "text-lg font-bold",
                        node.netFlow > 0
                          ? "text-green-600"
                          : node.netFlow < 0
                            ? "text-red-600"
                            : "text-gray-600",
                      )}
                    >
                      {node.netFlow > 0 ? "+" : ""}
                      {node.netFlow.toLocaleString()} PYUSD
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

function getAddressLabel(address: string): string {
  if (address.toLowerCase() === PYUSD_CONTRACT.toLowerCase()) {
    return "PYUSD Contract";
  }
  if (address === "0x0000000000000000000000000000000000000000") {
    return "Burn Address";
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function isContractAddress(address: string): boolean {
  return (
    address.toLowerCase() === PYUSD_CONTRACT.toLowerCase() ||
    address === "0x0000000000000000000000000000000000000000"
  );
}
