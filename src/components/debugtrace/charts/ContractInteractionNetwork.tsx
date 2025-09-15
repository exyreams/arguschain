import React, { useCallback, useMemo } from "react";
import {
  ReactFlow,
  addEdge,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { NetworkEdge, NetworkNode } from "@/lib/debugtrace/types";
import { formatGas, shortenAddress } from "@/lib/config";
import { Badge } from "@/components/global";

// Custom Tree Node Component
const TreeNode = ({ data, selected }: { data: any; selected?: boolean }) => {
  const { node, onNodeClick } = data;
  const displayName =
    node.data?.contractName === "Unknown Contract"
      ? shortenAddress(node.label)
      : node.data?.contractName || shortenAddress(node.label);

  const isRoot = node.level === 0;
  const isEOA = node.type === "eoa";

  const handleClick = () => {
    if (onNodeClick) {
      onNodeClick(node);
    }
  };

  return (
    <div className="relative">
      {!isRoot && (
        <Handle
          type="target"
          position={Position.Top}
          className="w-3 h-3 bg-[#00bfff] border-2 border-[rgba(0,191,255,0.5)] hover:bg-[rgba(0,191,255,0.8)] transition-colors"
        />
      )}

      <div
        onClick={handleClick}
        className={`
        bg-[rgba(25,28,40,0.95)] border-2 rounded-lg p-4 min-w-[160px] shadow-lg backdrop-blur-sm cursor-pointer
        transition-all duration-200 hover:scale-105 hover:shadow-xl
        ${
          isRoot
            ? "border-[#00bfff] shadow-[0_0_20px_rgba(0,191,255,0.4)] hover:shadow-[0_0_25px_rgba(0,191,255,0.6)]"
            : isEOA
              ? "border-[#10b981] hover:border-[rgba(16,185,129,0.8)] hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              : "border-[rgba(0,191,255,0.4)] hover:border-[rgba(0,191,255,0.6)] hover:shadow-[0_0_15px_rgba(0,191,255,0.2)]"
        }
        ${selected ? "ring-2 ring-[#00bfff] ring-opacity-50" : ""}
      `}
      >
        {/* Node Type Badge */}
        <div className="flex items-center justify-center mb-3">
          <Badge
            variant="outline"
            className={`text-xs font-mono px-2 py-1 ${
              isRoot
                ? "border-[#00bfff] text-[#00bfff] bg-[rgba(0,191,255,0.15)]"
                : isEOA
                  ? "border-[#10b981] text-[#10b981] bg-[rgba(16,185,129,0.15)]"
                  : "border-[rgba(139,157,195,0.4)] text-[#8b9dc3] bg-[rgba(139,157,195,0.15)]"
            }`}
          >
            {isEOA ? "EOA" : isRoot ? "ROOT" : "Contract"}
          </Badge>
        </div>

        {/* Contract Name */}
        <div className="text-center mb-3">
          <div
            className={`font-semibold text-sm leading-tight ${
              isRoot
                ? "text-[#00bfff]"
                : isEOA
                  ? "text-[#10b981]"
                  : "text-white"
            }`}
          >
            {displayName}
          </div>
          {node.data?.contractName &&
            node.data.contractName !== "Unknown Contract" && (
              <div className="text-xs text-[#8b9dc3] font-mono mt-1 opacity-80">
                {shortenAddress(node.label)}
              </div>
            )}
        </div>

        {/* Metrics */}
        <div className="space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-[#8b9dc3]">Gas:</span>
            <span className="text-[#00bfff] font-medium">
              {formatGas(node.gasUsed)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#8b9dc3]">Calls:</span>
            <span className="text-[#00bfff] font-medium">{node.callCount}</span>
          </div>
          {node.value > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-[#8b9dc3]">Value:</span>
              <span className="text-[#10b981] font-medium">
                {node.value.toFixed(4)} ETH
              </span>
            </div>
          )}
        </div>

        {/* Click indicator */}
        <div className="absolute top-2 right-2 w-2 h-2 bg-[#00bfff] rounded-full opacity-50 animate-pulse"></div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-[#00bfff] border-2 border-[rgba(0,191,255,0.5)] hover:bg-[rgba(0,191,255,0.8)] transition-colors"
      />
    </div>
  );
};

const nodeTypes = {
  treeNode: TreeNode,
};

// Optimized tree layout algorithm for blockchain call traces
const createTreeLayout = (nodes: NetworkNode[], edges: NetworkEdge[]) => {
  if (nodes.length === 0) return [];

  // Find root node - prioritize by outgoing connections (caller nodes)
  const outgoingCounts = new Map<string, number>();
  const incomingCounts = new Map<string, number>();

  edges.forEach((edge) => {
    outgoingCounts.set(edge.source, (outgoingCounts.get(edge.source) || 0) + 1);
    incomingCounts.set(edge.target, (incomingCounts.get(edge.target) || 0) + 1);
  });

  // Root is typically the node with most outgoing calls and fewest incoming
  let rootNode = nodes[0];
  let bestScore = -1;

  nodes.forEach((node) => {
    const outgoing = outgoingCounts.get(node.id) || 0;
    const incoming = incomingCounts.get(node.id) || 0;
    const score = outgoing - incoming * 0.5; // Favor nodes that call others

    if (score > bestScore) {
      bestScore = score;
      rootNode = node;
    }
  });

  // Build tree structure with BFS
  const treeNodes = new Map();
  const visited = new Set<string>();
  const queue = [{ nodeId: rootNode.id, level: 0 }];

  // Add root
  treeNodes.set(rootNode.id, { ...rootNode, level: 0, children: [] });
  visited.add(rootNode.id);

  while (queue.length > 0) {
    const { nodeId, level } = queue.shift()!;

    // Find direct children (nodes this node calls)
    const children = edges
      .filter((edge) => edge.source === nodeId && !visited.has(edge.target))
      .map((edge) => edge.target);

    children.forEach((childId) => {
      const childNode = nodes.find((n) => n.id === childId);
      if (childNode && !visited.has(childId)) {
        treeNodes.set(childId, {
          ...childNode,
          level: level + 1,
          children: [],
        });
        visited.add(childId);
        queue.push({ nodeId: childId, level: level + 1 });
      }
    });
  }

  // Handle orphaned nodes (shouldn't happen in well-formed call traces)
  nodes.forEach((node) => {
    if (!visited.has(node.id)) {
      treeNodes.set(node.id, { ...node, level: 1, children: [] });
    }
  });

  return Array.from(treeNodes.values());
};

// Calculate tree positions with better spacing
const calculateTreePositions = (treeNodes: any[]) => {
  const levelGroups = new Map();

  // Group nodes by level
  treeNodes.forEach((node) => {
    if (!levelGroups.has(node.level)) {
      levelGroups.set(node.level, []);
    }
    levelGroups.get(node.level).push(node);
  });

  const positions = new Map();
  const levelHeight = 200; // Increased from 150 to 200 for more vertical spacing
  const nodeWidth = 220; // Increased from 180 to 220 for more horizontal spacing
  const startY = 80; // Increased top margin

  // Position nodes level by level
  levelGroups.forEach((nodesInLevel, level) => {
    const totalWidth = nodesInLevel.length * nodeWidth;
    const startX = -totalWidth / 2;

    nodesInLevel.forEach((node, index) => {
      positions.set(node.id, {
        x: startX + index * nodeWidth + nodeWidth / 2,
        y: level * levelHeight + startY,
      });
    });
  });

  return positions;
};

interface ContractInteractionNetworkProps {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  height?: number;
  className?: string;
}

const ContractTreeDiagram = ({
  nodes: networkNodes,
  edges: networkEdges,
  height = 500, // Increased default height from 400 to 500
  className = "",
}: ContractInteractionNetworkProps) => {
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(
    null
  );

  // Create tree structure and positions
  const { treeNodes, positions } = useMemo(() => {
    const treeNodes = createTreeLayout(networkNodes, networkEdges);
    const positions = calculateTreePositions(treeNodes);
    return { treeNodes, positions };
  }, [networkNodes, networkEdges]);

  // Handle node click
  const handleNodeClick = useCallback((node: any) => {
    setSelectedNodeId(node.id);
    console.log("Clicked node:", node);
    // You can add more functionality here like showing a modal, copying address, etc.
  }, []);

  // Convert to React Flow format
  const flowNodes = useMemo(() => {
    return treeNodes.map((node) => ({
      id: node.id,
      type: "treeNode",
      position: positions.get(node.id) || { x: 0, y: 0 },
      data: {
        node,
        onNodeClick: handleNodeClick,
      },
      selected: selectedNodeId === node.id,
      draggable: true, // Allow dragging for better interaction
    }));
  }, [treeNodes, positions, handleNodeClick, selectedNodeId]);

  const flowEdges = useMemo(() => {
    return networkEdges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: "smoothstep",
      style: {
        stroke: edge.success ? "#10b981" : "#ef4444",
        strokeWidth: 2,
        strokeOpacity: 0.8,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: edge.success ? "#10b981" : "#ef4444",
      },
    }));
  }, [networkEdges]);

  const [nodes, , onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  const onConnect = useCallback(
    (params) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: "smoothstep",
            markerEnd: { type: MarkerType.ArrowClosed },
          },
          eds
        )
      ),
    [setEdges]
  );

  if (!networkNodes || networkNodes.length === 0) {
    return (
      <div
        className={`flex items-center justify-center bg-[rgba(15,20,25,0.8)] rounded-lg ${className}`}
        style={{ height }}
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-[rgba(0,191,255,0.3)] border-t-[#00bfff] rounded-full animate-spin" />
          </div>
          <p className="text-[#8b9dc3] text-sm">
            No contract interaction data available
          </p>
        </div>
      </div>
    );
  }

  // Handle node selection
  const onNodeClick = useCallback((event: React.MouseEvent, node: any) => {
    setSelectedNodeId(node.id);
    console.log("Selected node:", node);
  }, []);

  return (
    <div
      className={`bg-[rgba(15,20,25,0.8)] rounded-lg border border-[rgba(0,191,255,0.2)] overflow-hidden ${className}`}
      style={{ height }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{
          padding: 0.15, // Reduced padding to show more of the tree
          includeHiddenNodes: false,
        }}
        minZoom={0.4} // Reduced minimum zoom to see more nodes
        maxZoom={2.0} // Increased maximum zoom for detail
        defaultViewport={{ x: 0, y: 0, zoom: 0.7 }} // Better default zoom
        style={{
          background: "transparent",
        }}
        panOnDrag={true}
        zoomOnScroll={true}
        zoomOnPinch={true}
        panOnScroll={false}
        preventScrolling={true}
      >
        <Background
          color="rgba(0,191,255,0.08)"
          gap={25}
          size={1.5}
          variant="dots"
        />
      </ReactFlow>

      {/* Selected Node Info Panel */}
      {selectedNodeId && (
        <div className="absolute top-4 right-4 bg-[rgba(25,28,40,0.95)] border border-[rgba(0,191,255,0.3)] rounded-lg p-3 backdrop-blur-sm max-w-xs">
          <div className="text-[#00bfff] font-medium text-sm mb-2">
            Selected Contract
          </div>
          {(() => {
            const selectedNode = treeNodes.find((n) => n.id === selectedNodeId);
            if (!selectedNode) return null;

            const displayName =
              selectedNode.data?.contractName === "Unknown Contract"
                ? selectedNode.label
                : selectedNode.data?.contractName || selectedNode.label;

            return (
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[#8b9dc3]">Name: </span>
                  <span className="text-white font-medium">{displayName}</span>
                </div>
                <div>
                  <span className="text-[#8b9dc3]">Address: </span>
                  <span className="text-[#00bfff] font-mono">
                    {selectedNode.label}
                  </span>
                </div>
                <div>
                  <span className="text-[#8b9dc3]">Gas Used: </span>
                  <span className="text-[#00bfff]">
                    {formatGas(selectedNode.gasUsed)}
                  </span>
                </div>
                <div>
                  <span className="text-[#8b9dc3]">Call Count: </span>
                  <span className="text-[#00bfff]">
                    {selectedNode.callCount}
                  </span>
                </div>
                {selectedNode.value > 0 && (
                  <div>
                    <span className="text-[#8b9dc3]">Value: </span>
                    <span className="text-[#10b981]">
                      {selectedNode.value.toFixed(4)} ETH
                    </span>
                  </div>
                )}
                <button
                  onClick={() => setSelectedNodeId(null)}
                  className="mt-2 text-xs text-[#8b9dc3] hover:text-[#00bfff] transition-colors"
                >
                  ✕ Close
                </button>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export const ContractInteractionNetwork = ContractTreeDiagram;
