import React, { useCallback, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  ConnectionMode,
  Controls,
  Edge,
  EdgeTypes,
  MiniMap,
  Node,
  NodeTypes,
  Panel,
  useEdgesState,
  useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";
import { Card } from "@/components/global";
import { cn } from "@/lib/utils";

interface TokenTransfer {
  from: string;
  to: string;
  amount: string;
  formattedAmount: string;
  tokenSymbol: string;
  transactionHash: string;
  gasUsed?: number;
}

interface TokenFlowNetworkProps {
  transfers: TokenTransfer[];
  className?: string;
  onNodeSelect?: (nodeId: string, nodeData: any) => void;
  onEdgeSelect?: (edgeId: string, edgeData: any) => void;
  showMiniMap?: boolean;
  showControls?: boolean;
  animated?: boolean;
}

interface AddressNode extends Node {
  data: {
    address: string;
    label: string;
    totalIn: number;
    totalOut: number;
    transactionCount: number;
    isHighActivity: boolean;
    cluster?: string;
  };
}

interface FlowEdge extends Edge {
  data: {
    transfers: TokenTransfer[];
    totalAmount: number;
    formattedAmount: string;
    transactionCount: number;
  };
}

const AddressNode = ({ data, selected }: { data: any; selected: boolean }) => {
  const {
    address,
    label,
    totalIn,
    totalOut,
    transactionCount,
    isHighActivity,
  } = data;

  return (
    <div
      className={cn(
        "px-3 py-2 rounded-lg border-2 bg-background text-foreground shadow-md transition-all duration-200",
        selected && "border-primary shadow-lg scale-105",
        isHighActivity && "border-orange-500 bg-orange-50 dark:bg-orange-950",
        !isHighActivity && "border-border hover:border-primary/50",
      )}
    >
      <div className="text-xs font-medium truncate max-w-24" title={address}>
        {label}
      </div>
      <div className="text-xs text-muted-foreground mt-1">
        <div>In: {totalIn.toFixed(2)}</div>
        <div>Out: {totalOut.toFixed(2)}</div>
        <div>Txs: {transactionCount}</div>
      </div>
    </div>
  );
};

const FlowEdge = ({ data, selected }: { data: any; selected: boolean }) => {
  return (
    <div
      className={cn(
        "text-xs bg-background border rounded px-2 py-1 shadow-sm",
        selected && "border-primary bg-primary/10",
      )}
    >
      <div className="font-medium">{data.formattedAmount}</div>
      <div className="text-muted-foreground">{data.transactionCount} tx</div>
    </div>
  );
};

const nodeTypes: NodeTypes = {
  address: AddressNode,
};

const edgeTypes: EdgeTypes = {
  flow: FlowEdge,
};

export const TokenFlowNetwork: React.FC<TokenFlowNetworkProps> = ({
  transfers,
  className,
  onNodeSelect,
  onEdgeSelect,
  showMiniMap = true,
  showControls = true,
  animated = true,
}) => {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [clusteringEnabled, setClusteringEnabled] = useState(true);
  const [minAmountFilter, setMinAmountFilter] = useState(0);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const addressStats = new Map<
      string,
      {
        totalIn: number;
        totalOut: number;
        transactionCount: number;
        transfers: TokenTransfer[];
      }
    >();

    const edgeMap = new Map<
      string,
      {
        transfers: TokenTransfer[];
        totalAmount: number;
      }
    >();

    transfers.forEach((transfer) => {
      const amount = parseFloat(transfer.amount) || 0;

      if (amount < minAmountFilter) return;

      const fromStats = addressStats.get(transfer.from) || {
        totalIn: 0,
        totalOut: 0,
        transactionCount: 0,
        transfers: [],
      };
      fromStats.totalOut += amount;
      fromStats.transactionCount += 1;
      fromStats.transfers.push(transfer);
      addressStats.set(transfer.from, fromStats);

      const toStats = addressStats.get(transfer.to) || {
        totalIn: 0,
        totalOut: 0,
        transactionCount: 0,
        transfers: [],
      };
      toStats.totalIn += amount;
      toStats.transactionCount += 1;
      toStats.transfers.push(transfer);
      addressStats.set(transfer.to, toStats);

      const edgeKey = `${transfer.from}-${transfer.to}`;
      const edgeData = edgeMap.get(edgeKey) || {
        transfers: [],
        totalAmount: 0,
      };
      edgeData.transfers.push(transfer);
      edgeData.totalAmount += amount;
      edgeMap.set(edgeKey, edgeData);
    });

    const nodes: AddressNode[] = [];
    const addressPositions = new Map<string, { x: number; y: number }>();

    let nodeIndex = 0;
    const radius = 300;
    const centerX = 400;
    const centerY = 300;

    Array.from(addressStats.entries()).forEach(([address, stats]) => {
      const isHighActivity =
        stats.transactionCount > 5 || stats.totalIn + stats.totalOut > 10000;

      let x, y;
      if (clusteringEnabled && isHighActivity) {
        const angle =
          (nodeIndex * 2 * Math.PI) / Math.max(addressStats.size, 8);
        x = centerX + radius * 0.5 * Math.cos(angle);
        y = centerY + radius * 0.5 * Math.sin(angle);
      } else {
        const angle = (nodeIndex * 2 * Math.PI) / addressStats.size;
        x = centerX + radius * Math.cos(angle);
        y = centerY + radius * Math.sin(angle);
      }

      addressPositions.set(address, { x, y });

      nodes.push({
        id: address,
        type: "address",
        position: { x, y },
        data: {
          address,
          label: `${address.slice(0, 6)}...${address.slice(-4)}`,
          totalIn: stats.totalIn,
          totalOut: stats.totalOut,
          transactionCount: stats.transactionCount,
          isHighActivity,
          cluster: isHighActivity ? "high-activity" : "normal",
        },
      });

      nodeIndex++;
    });

    const edges: FlowEdge[] = Array.from(edgeMap.entries()).map(
      ([edgeKey, edgeData]) => {
        const [from, to] = edgeKey.split("-");
        const totalAmount = edgeData.totalAmount;

        return {
          id: edgeKey,
          source: from,
          target: to,
          type: "flow",
          animated: animated && totalAmount > 1000,
          style: {
            strokeWidth: Math.max(1, Math.min(8, totalAmount / 1000)),
            stroke:
              totalAmount > 10000
                ? "#ef4444"
                : totalAmount > 1000
                  ? "#f97316"
                  : "#6b7280",
          },
          data: {
            transfers: edgeData.transfers,
            totalAmount,
            formattedAmount: `${totalAmount.toFixed(2)} PYUSD`,
            transactionCount: edgeData.transfers.length,
          },
          label: `${totalAmount.toFixed(2)} PYUSD`,
          labelStyle: {
            fontSize: "10px",
            fontWeight: "bold",
          },
          labelBgStyle: {
            fill: "#ffffff",
            fillOpacity: 0.8,
          },
        };
      },
    );

    return { nodes, edges };
  }, [transfers, clusteringEnabled, minAmountFilter, animated]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      setSelectedNode(node.id);
      setSelectedEdge(null);
      onNodeSelect?.(node.id, node.data);
    },
    [onNodeSelect],
  );

  const handleEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      setSelectedEdge(edge.id);
      setSelectedNode(null);
      onEdgeSelect?.(edge.id, edge.data);
    },
    [onEdgeSelect],
  );

  const autoLayout = useCallback(() => {
    const layoutedNodes = nodes.map((node, index) => {
      const angle = (index * 2 * Math.PI) / nodes.length;
      const radius = node.data.isHighActivity ? 200 : 350;
      const centerX = 400;
      const centerY = 300;

      return {
        ...node,
        position: {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
        },
      };
    });

    setNodes(layoutedNodes);
  }, [nodes, setNodes]);

  const highlightConnectedNodes = useCallback(
    (nodeId: string) => {
      const connectedEdges = edges.filter(
        (edge) => edge.source === nodeId || edge.target === nodeId,
      );

      const connectedNodeIds = new Set([
        nodeId,
        ...connectedEdges.flatMap((edge) => [edge.source, edge.target]),
      ]);

      setNodes((nodes) =>
        nodes.map((node) => ({
          ...node,
          style: {
            ...node.style,
            opacity: connectedNodeIds.has(node.id) ? 1 : 0.3,
          },
        })),
      );

      setEdges((edges) =>
        edges.map((edge) => ({
          ...edge,
          style: {
            ...edge.style,
            opacity: connectedEdges.some((ce) => ce.id === edge.id) ? 1 : 0.1,
          },
        })),
      );
    },
    [edges, setNodes, setEdges],
  );

  const resetHighlighting = useCallback(() => {
    setNodes((nodes) =>
      nodes.map((node) => ({
        ...node,
        style: {
          ...node.style,
          opacity: 1,
        },
      })),
    );

    setEdges((edges) =>
      edges.map((edge) => ({
        ...edge,
        style: {
          ...edge.style,
          opacity: 1,
        },
      })),
    );
  }, [setNodes, setEdges]);

  return (
    <Card className={cn("h-96", className)}>
      <div className="h-full relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          connectionMode={ConnectionMode.Loose}
          fitView
          attributionPosition="bottom-left"
        >
          {showControls && <Controls />}
          <Background />

          {showMiniMap && (
            <MiniMap
              nodeStrokeColor="#374151"
              nodeColor="#f3f4f6"
              nodeBorderRadius={2}
              position="top-right"
            />
          )}

          <Panel
            position="top-left"
            className="bg-background border rounded-lg p-3 shadow-sm"
          >
            <div className="space-y-2">
              <div className="text-sm font-medium">Network Controls</div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="clustering"
                  checked={clusteringEnabled}
                  onChange={(e) => setClusteringEnabled(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="clustering" className="text-xs">
                  Enable Clustering
                </label>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  Min Amount Filter
                </label>
                <input
                  type="number"
                  value={minAmountFilter}
                  onChange={(e) => setMinAmountFilter(Number(e.target.value))}
                  className="w-full px-2 py-1 text-xs border rounded"
                  placeholder="0"
                />
              </div>

              <div className="flex space-x-1">
                <button
                  onClick={autoLayout}
                  className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
                >
                  Auto Layout
                </button>
                <button
                  onClick={resetHighlighting}
                  className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
                >
                  Reset
                </button>
              </div>
            </div>
          </Panel>

          {selectedNode && (
            <Panel
              position="bottom-right"
              className="bg-background border rounded-lg p-3 shadow-sm max-w-xs"
            >
              <div className="space-y-2">
                <div className="text-sm font-medium">Selected Address</div>
                <div className="text-xs space-y-1">
                  <div>
                    <strong>Address:</strong> {selectedNode}
                  </div>
                  <div>
                    <strong>Total In:</strong>{" "}
                    {nodes
                      .find((n) => n.id === selectedNode)
                      ?.data.totalIn.toFixed(2)}{" "}
                    PYUSD
                  </div>
                  <div>
                    <strong>Total Out:</strong>{" "}
                    {nodes
                      .find((n) => n.id === selectedNode)
                      ?.data.totalOut.toFixed(2)}{" "}
                    PYUSD
                  </div>
                  <div>
                    <strong>Transactions:</strong>{" "}
                    {
                      nodes.find((n) => n.id === selectedNode)?.data
                        .transactionCount
                    }
                  </div>
                </div>
                <button
                  onClick={() => highlightConnectedNodes(selectedNode)}
                  className="w-full px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
                >
                  Highlight Connections
                </button>
              </div>
            </Panel>
          )}

          {selectedEdge && (
            <Panel
              position="bottom-left"
              className="bg-background border rounded-lg p-3 shadow-sm max-w-xs"
            >
              <div className="space-y-2">
                <div className="text-sm font-medium">Selected Flow</div>
                <div className="text-xs space-y-1">
                  <div>
                    <strong>Total Amount:</strong>{" "}
                    {
                      edges.find((e) => e.id === selectedEdge)?.data
                        .formattedAmount
                    }
                  </div>
                  <div>
                    <strong>Transactions:</strong>{" "}
                    {
                      edges.find((e) => e.id === selectedEdge)?.data
                        .transactionCount
                    }
                  </div>
                  <div>
                    <strong>From:</strong> {selectedEdge.split("-")[0]}
                  </div>
                  <div>
                    <strong>To:</strong> {selectedEdge.split("-")[1]}
                  </div>
                </div>
              </div>
            </Panel>
          )}
        </ReactFlow>
      </div>
    </Card>
  );
};
