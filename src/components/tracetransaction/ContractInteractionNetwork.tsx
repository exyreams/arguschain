import React, { useCallback, useMemo, useState } from "react";
import {
  Background,
  ReactFlow,
  addEdge,
  ConnectionLineType,
  Panel,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  MarkerType,
} from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import "@xyflow/react/dist/style.css";
import { Badge, Input } from "@/components/global";
import { formatGas, shortenAddress } from "@/lib/config";
import {
  PYUSD_CONTRACTS,
  VISUALIZATION_COLORS,
} from "@/lib/tracetransaction/constants";
import type { ContractInteraction } from "@/lib/tracetransaction/types";
import {
  Search,
  Network,
  RotateCcw,
  RotateCw,
  Zap,
  ExternalLink,
} from "lucide-react";

interface ContractInteractionNetworkProps {
  interactions: ContractInteraction[];
  height?: number;
  className?: string;
}

// Custom Node Component for Contract Interactions
const ContractNode = ({ data }: { data: any }) => {
  const { contract } = data;

  return (
    <div className="bg-[rgba(25,28,40,0.95)] border-2 border-[rgba(0,191,255,0.3)] rounded-lg p-4 min-w-[280px] shadow-lg backdrop-blur-sm">
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-[#00bfff] border-2 border-[rgba(0,191,255,0.5)]"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className={`flex items-center ${contract.isPyusd ? "text-[#00bfff]" : "text-[#10b981]"}`}
        >
          {contract.isPyusd ? (
            <Zap className="h-5 w-5" />
          ) : (
            <ExternalLink className="h-5 w-5" />
          )}
        </div>

        <Badge
          variant="outline"
          className={`${
            contract.isPyusd
              ? "border-[rgba(0,191,255,0.4)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
              : "border-[rgba(16,185,129,0.4)] text-[#10b981] bg-[rgba(16,185,129,0.1)]"
          } text-xs font-mono`}
        >
          {contract.isPyusd ? "PYUSD" : "External"}
        </Badge>
      </div>

      {/* Contract Name */}
      <div className="mb-2">
        <h4 className="text-accent-primary font-semibold text-sm truncate">
          {contract.contractName}
        </h4>
        <p className="text-xs font-mono text-[#8b9dc3] truncate">
          {shortenAddress(contract.address)}
        </p>
      </div>

      {/* Metrics */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#8b9dc3]">Gas Used:</span>
          <span className="text-[#00bfff] font-medium">
            {formatGas(contract.totalGas)}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#8b9dc3]">Interactions:</span>
          <span className="text-[#10b981] font-medium">
            {contract.callCount}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#8b9dc3]">Avg Gas/Call:</span>
          <span className="text-[#f59e0b] font-medium">
            {formatGas(Math.round(contract.totalGas / contract.callCount))}
          </span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-[#00bfff] border-2 border-[rgba(0,191,255,0.5)]"
      />
    </div>
  );
};

const nodeTypes = {
  contractNode: ContractNode,
};

// Dagre layout configuration
const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
const nodeWidth = 300;
const nodeHeight = 160;

const getLayoutedElements = (nodes: any[], edges: any[], direction = "TB") => {
  const isHorizontal = direction === "LR";
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: 80,
    ranksep: 120,
    marginx: 40,
    marginy: 40,
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const newNode = {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
    return newNode;
  });

  return { nodes: newNodes, edges };
};

// Convert interactions to flow elements
const convertInteractionsToFlowElements = (
  interactions: ContractInteraction[]
) => {
  const nodes: any[] = [];
  const edges: any[] = [];
  const contractMap = new Map<string, any>();

  // Create nodes for unique contracts
  interactions.forEach((interaction) => {
    [interaction.from, interaction.to].forEach((address) => {
      if (!contractMap.has(address)) {
        const isPyusd = address.toLowerCase() in PYUSD_CONTRACTS;
        const contractName = isPyusd
          ? PYUSD_CONTRACTS[
              address.toLowerCase() as keyof typeof PYUSD_CONTRACTS
            ]
          : "External Contract";

        // Calculate total gas and call count for this contract
        const totalGas = interactions
          .filter((i) => i.from === address || i.to === address)
          .reduce((sum, i) => sum + (Number(i.gas) || 0), 0);

        const callCount = interactions
          .filter((i) => i.from === address || i.to === address)
          .reduce((sum, i) => sum + (Number(i.count) || 0), 0);

        const contract = {
          address,
          contractName,
          isPyusd,
          totalGas,
          callCount,
        };

        contractMap.set(address, contract);

        nodes.push({
          id: address,
          type: "contractNode",
          data: { contract },
          position: { x: 0, y: 0 }, // Will be set by dagre
        });
      }
    });
  });

  // Create edges for interactions
  interactions.forEach((interaction, index) => {
    const edgeId = `${interaction.from}-${interaction.to}-${index}`;
    const gasUsed = Number(interaction.gas) || 0;
    const callCount = Number(interaction.count) || 0;

    // Calculate edge thickness based on gas usage
    const maxGas = Math.max(...interactions.map((i) => Number(i.gas) || 0));
    const strokeWidth = Math.max(2, Math.min(8, (gasUsed / maxGas) * 6));

    edges.push({
      id: edgeId,
      source: interaction.from,
      target: interaction.to,
      type: "smoothstep",
      animated: gasUsed > maxGas * 0.5, // Animate high-gas interactions
      style: {
        stroke: gasUsed > maxGas * 0.7 ? "#ef4444" : "#10b981",
        strokeWidth,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: gasUsed > maxGas * 0.7 ? "#ef4444" : "#10b981",
      },
      label: `${formatGas(gasUsed)} (${callCount}x)`,
      labelStyle: {
        fontSize: 10,
        fill: "#8b9dc3",
        fontWeight: 500,
      },
      labelBgStyle: {
        fill: "rgba(25,28,40,0.9)",
        fillOpacity: 0.8,
      },
    });
  });

  return { nodes, edges };
};

export function ContractInteractionNetwork({
  interactions,
  height = 600,
  className = "",
}: ContractInteractionNetworkProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [layoutDirection, setLayoutDirection] = useState<"TB" | "LR">("TB");

  // Filter interactions based on search
  const filteredInteractions = useMemo(() => {
    if (!interactions || interactions.length === 0) return [];

    if (!searchTerm) return interactions;

    return interactions.filter(
      (interaction) =>
        interaction.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
        interaction.to.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [interactions, searchTerm]);

  // Convert to flow elements and apply layout
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    return convertInteractionsToFlowElements(filteredInteractions);
  }, [filteredInteractions]);

  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(() => {
    return getLayoutedElements(initialNodes, initialEdges, layoutDirection);
  }, [initialNodes, initialEdges, layoutDirection]);

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  const onConnect = useCallback(
    (params: any) =>
      setEdges((eds) =>
        addEdge(
          { ...params, type: ConnectionLineType.SmoothStep, animated: true },
          eds
        )
      ),
    []
  );

  const onLayout = useCallback(
    (direction: "TB" | "LR") => {
      const { nodes: newLayoutedNodes, edges: newLayoutedEdges } =
        getLayoutedElements(nodes, edges, direction);
      setNodes([...newLayoutedNodes]);
      setEdges([...newLayoutedEdges]);
      setLayoutDirection(direction);
    },
    [nodes, edges, setNodes, setEdges]
  );

  // Calculate stats
  const stats = useMemo(() => {
    const currentData =
      filteredInteractions.length > 0 ? filteredInteractions : interactions;
    const totalInteractions = currentData.length;
    const uniqueContracts = new Set([
      ...currentData.map((i) => i.from),
      ...currentData.map((i) => i.to),
    ]).size;
    const totalGas = currentData.reduce(
      (sum, i) => sum + (Number(i.gas) || 0),
      0
    );
    const pyusdInteractions = currentData.filter(
      (i) =>
        i.from.toLowerCase() in PYUSD_CONTRACTS ||
        i.to.toLowerCase() in PYUSD_CONTRACTS
    ).length;

    return {
      totalInteractions,
      uniqueContracts,
      totalGas,
      pyusdInteractions,
      avgGasPerInteraction:
        totalInteractions > 0 ? totalGas / totalInteractions : 0,
    };
  }, [interactions, filteredInteractions]);

  if (!interactions || interactions.length === 0) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
            <Network className="h-8 w-8 text-[rgba(0,191,255,0.3)]" />
          </div>
          <p className="text-[#8b9dc3] text-sm">
            No contract interactions available
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header with controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#8b9dc3]" />
            <Input
              type="text"
              placeholder="Search contract addresses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.3)] text-white rounded-lg pl-10 pr-4 py-2 text-sm focus:border-[#00bfff] focus:ring-1 focus:ring-[#00bfff] w-80"
            />
          </div>
        </div>

        <div className="flex items-center gap-6 text-sm text-[#8b9dc3]">
          <span>
            Contracts:{" "}
            <span className="text-[#00bfff] font-medium">
              {stats.uniqueContracts}
            </span>
          </span>
          <span>
            Interactions:{" "}
            <span className="text-[#10b981] font-medium">
              {stats.totalInteractions}
            </span>
          </span>
          <span>
            PYUSD:{" "}
            <span className="text-[#f59e0b] font-medium">
              {stats.pyusdInteractions}
            </span>
          </span>
        </div>
      </div>

      {/* Contract Interaction Network */}
      <div
        className="bg-[rgba(15,20,25,0.6)] rounded-lg border border-[rgba(0,191,255,0.2)] overflow-hidden"
        style={{ height: height - 60 }}
      >
        {filteredInteractions.length === 0 && searchTerm ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Search className="h-12 w-12 text-[rgba(0,191,255,0.3)] mx-auto mb-3" />
              <p className="text-[#8b9dc3] text-sm">
                No interactions match your search
              </p>
              <p className="text-[#6b7280] text-xs mt-1">
                Try adjusting your search criteria
              </p>
            </div>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            connectionLineType={ConnectionLineType.SmoothStep}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{
              padding: 0.2,
              includeHiddenNodes: false,
            }}
            minZoom={0.1}
            maxZoom={2}
            defaultViewport={{ x: 0, y: 0, zoom: 0.6 }}
          >
            <Panel position="top-right" className="flex gap-2">
              <button
                className="px-3 py-1 bg-[rgba(0,191,255,0.1)] border border-[rgba(0,191,255,0.3)] text-[#00bfff] rounded text-sm hover:bg-[rgba(0,191,255,0.2)] transition-colors flex items-center gap-1"
                onClick={() => onLayout("TB")}
              >
                <RotateCcw className="h-3 w-3" />
                Vertical
              </button>
              <button
                className="px-3 py-1 bg-[rgba(0,191,255,0.1)] border border-[rgba(0,191,255,0.3)] text-[#00bfff] rounded text-sm hover:bg-[rgba(0,191,255,0.2)] transition-colors flex items-center gap-1"
                onClick={() => onLayout("LR")}
              >
                <RotateCw className="h-3 w-3" />
                Horizontal
              </button>
            </Panel>
            <Background
              color="#00bfff"
              gap={20}
              size={1}
              style={{ opacity: 0.1 }}
            />
          </ReactFlow>
        )}
      </div>

      {/* Stats Grid */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-3 bg-[rgba(15,20,25,0.6)] rounded-lg border border-[rgba(0,191,255,0.2)]">
          <div className="text-lg font-bold text-[#00bfff]">
            {stats.uniqueContracts}
          </div>
          <div className="text-sm text-[#8b9dc3]">Unique Contracts</div>
        </div>
        <div className="text-center p-3 bg-[rgba(15,20,25,0.6)] rounded-lg border border-[rgba(0,191,255,0.2)]">
          <div className="text-lg font-bold text-[#10b981]">
            {stats.totalInteractions}
          </div>
          <div className="text-sm text-[#8b9dc3]">Total Interactions</div>
        </div>
        <div className="text-center p-3 bg-[rgba(15,20,25,0.6)] rounded-lg border border-[rgba(0,191,255,0.2)]">
          <div className="text-lg font-bold text-[#00bfff]">
            {formatGas(stats.totalGas)}
          </div>
          <div className="text-sm text-[#8b9dc3]">Total Gas</div>
        </div>
        <div className="text-center p-3 bg-[rgba(15,20,25,0.6)] rounded-lg border border-[rgba(0,191,255,0.2)]">
          <div className="text-lg font-bold text-[#f59e0b]">
            {formatGas(Math.round(stats.avgGasPerInteraction))}
          </div>
          <div className="text-sm text-[#8b9dc3]">Avg Gas/Interaction</div>
        </div>
      </div>
    </div>
  );
}
