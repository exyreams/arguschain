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
} from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import "@xyflow/react/dist/style.css";
import { Badge, Checkbox, Input } from "@/components/global";
import { formatGas, shortenAddress } from "@/lib/config";
import { TransactionAnalysis } from "@/lib/transactionTracer";
import {
  AlertCircle,
  CheckCircle,
  Search,
  Filter,
  GitBranch,
  RotateCcw,
  RotateCw,
} from "lucide-react";

interface InternalCallTreeProps {
  data: TransactionAnalysis["call_data"];
  height?: number;
  className?: string;
}

// Custom Node Component for Internal Calls
const InternalCallNode = ({ data }: { data: any }) => {
  const { call } = data;

  return (
    <div className="bg-[rgba(25,28,40,0.95)] border-2 border-[rgba(0,191,255,0.3)] rounded-lg p-3 min-w-[300px] shadow-lg backdrop-blur-sm">
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-[#00bfff] border-2 border-[rgba(0,191,255,0.5)]"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className={`flex items-center ${!call.error ? "text-[#10b981]" : "text-[#ef4444]"}`}
        >
          {!call.error ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
        </div>

        <Badge
          variant="outline"
          className={`${
            call.error
              ? "border-[#ef4444] text-[#ef4444] bg-[rgba(239,68,68,0.1)]"
              : "border-[rgba(0,191,255,0.4)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
          } text-xs font-mono`}
        >
          {call.type}
        </Badge>

        <span className="text-white font-semibold text-sm truncate flex-1">
          {call.contract || shortenAddress(call.to)}
        </span>
      </div>

      {/* Addresses */}
      <div className="mb-2 text-xs">
        <div className="flex items-center gap-2 text-[#8b9dc3]">
          <span>From:</span>
          <span className="font-mono text-[#00bfff]">
            {shortenAddress(call.from)}
          </span>
          <span>→</span>
          <span className="font-mono text-[#00bfff]">
            {shortenAddress(call.to)}
          </span>
        </div>
      </div>

      {/* Error Message */}
      {call.error && (
        <div className="mb-2">
          <Badge
            variant="outline"
            className="border-[#ef4444] text-[#ef4444] bg-[rgba(239,68,68,0.1)] text-xs"
          >
            ERROR: {call.error}
          </Badge>
        </div>
      )}

      {/* Metrics */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="text-[#8b9dc3]">
            Gas:{" "}
            <span className="text-[#00bfff] font-medium">
              {formatGas(call.gasUsed)}
            </span>
          </span>
          {call.value_eth > 0 && (
            <span className="text-[#8b9dc3]">
              Value:{" "}
              <span className="text-[#10b981] font-medium">
                {call.value_eth.toFixed(6)} ETH
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Input Preview */}
      {call.input_preview && (
        <div className="mt-2 text-xs text-[#8b9dc3]">
          <span>Input: </span>
          <span className="font-mono text-[#6b7280]">{call.input_preview}</span>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-[#00bfff] border-2 border-[rgba(0,191,255,0.5)]"
      />
    </div>
  );
};

const nodeTypes = {
  internalCallNode: InternalCallNode,
};

// Dagre layout configuration
const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
const nodeWidth = 320;
const nodeHeight = 140;

const getLayoutedElements = (nodes: any[], edges: any[], direction = "TB") => {
  const isHorizontal = direction === "LR";
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: 60,
    ranksep: 100,
    marginx: 30,
    marginy: 30,
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

// Convert call data to flow nodes and edges
const convertCallsToFlowElements = (
  calls: TransactionAnalysis["call_data"]
) => {
  const nodes: any[] = [];
  const edges: any[] = [];

  calls.forEach((call) => {
    nodes.push({
      id: call.id,
      type: "internalCallNode",
      data: { call },
      position: { x: 0, y: 0 }, // Will be set by dagre
    });

    if (call.parent_id) {
      edges.push({
        id: `${call.parent_id}-${call.id}`,
        source: call.parent_id,
        target: call.id,
        type: "smoothstep",
        animated: true,
        style: {
          stroke: call.error ? "#ef4444" : "#10b981",
          strokeWidth: 2,
        },
        markerEnd: {
          type: "arrowclosed",
          color: call.error ? "#ef4444" : "#10b981",
        },
      });
    }
  });

  return { nodes, edges };
};

export function InternalCallTree({
  data,
  height = 500,
  className = "",
}: InternalCallTreeProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);
  const [layoutDirection, setLayoutDirection] = useState<"TB" | "LR">("TB");

  // Filter data based on search and error filter
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];

    let filtered = [...data];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (call) =>
          call.contract?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          call.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
          call.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
          call.to.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply error filter
    if (showOnlyErrors) {
      filtered = filtered.filter((call) => call.error);
    }

    return filtered;
  }, [data, searchTerm, showOnlyErrors]);

  // Convert to flow elements and apply layout
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    return convertCallsToFlowElements(filteredData);
  }, [filteredData]);

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
    const currentData = filteredData.length > 0 ? filteredData : data;
    const totalCalls = currentData.length;
    const errorCount = currentData.filter((call) => call.error).length;
    const totalGas = currentData.reduce((sum, call) => sum + call.gasUsed, 0);
    const totalValue = currentData.reduce(
      (sum, call) => sum + call.value_eth,
      0
    );

    return {
      totalCalls,
      errorCount,
      totalGas,
      totalValue,
      successRate:
        totalCalls > 0 ? ((totalCalls - errorCount) / totalCalls) * 100 : 0,
    };
  }, [data, filteredData]);

  if (!data || data.length === 0) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
            <GitBranch className="h-8 w-8 text-[rgba(0,191,255,0.3)]" />
          </div>
          <p className="text-[#8b9dc3] text-sm">
            No internal call data available
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
              placeholder="Search calls, contracts, or addresses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.3)] text-white rounded-lg pl-10 pr-4 py-2 text-sm focus:border-[#00bfff] focus:ring-1 focus:ring-[#00bfff] w-80"
            />
          </div>
          <Checkbox
            checked={showOnlyErrors}
            onChange={setShowOnlyErrors}
            className="text-sm text-text-secondary"
          >
            <div className="flex items-center gap-2 text-text-secondary">
              <Filter className="h-4 w-4" />
              Show only errors
            </div>
          </Checkbox>
        </div>

        <div className="flex items-center gap-6 text-sm text-[#8b9dc3]">
          <span>
            Calls:{" "}
            <span className="text-[#00bfff] font-medium">
              {stats.totalCalls}
            </span>
          </span>
          <span>
            Errors:{" "}
            <span className="text-[#ef4444] font-medium">
              {stats.errorCount}
            </span>
          </span>
          <span>
            Success:{" "}
            <span className="text-[#10b981] font-medium">
              {stats.successRate.toFixed(1)}%
            </span>
          </span>
        </div>
      </div>

      {/* Internal Call Tree */}
      <div
        className="bg-[rgba(15,20,25,0.6)] rounded-lg border border-[rgba(0,191,255,0.2)] overflow-hidden"
        style={{ height: height - 60 }}
      >
        {filteredData.length === 0 && (searchTerm || showOnlyErrors) ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Search className="h-12 w-12 text-[rgba(0,191,255,0.3)] mx-auto mb-3" />
              <p className="text-[#8b9dc3] text-sm">
                No calls match your search criteria
              </p>
              <p className="text-[#6b7280] text-xs mt-1">
                Try adjusting your search or filter settings
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
            {stats.totalCalls}
          </div>
          <div className="text-sm text-[#8b9dc3]">Total Calls</div>
        </div>
        <div className="text-center p-3 bg-[rgba(15,20,25,0.6)] rounded-lg border border-[rgba(0,191,255,0.2)]">
          <div className="text-lg font-bold text-[#00bfff]">
            {formatGas(stats.totalGas)}
          </div>
          <div className="text-sm text-[#8b9dc3]">Total Gas</div>
        </div>
        <div className="text-center p-3 bg-[rgba(15,20,25,0.6)] rounded-lg border border-[rgba(0,191,255,0.2)]">
          <div className="text-lg font-bold text-[#10b981]">
            {stats.totalValue.toFixed(6)} ETH
          </div>
          <div className="text-sm text-[#8b9dc3]">Total Value</div>
        </div>
        <div className="text-center p-3 bg-[rgba(15,20,25,0.6)] rounded-lg border border-[rgba(0,191,255,0.2)]">
          <div
            className={`text-lg font-bold ${stats.errorCount > 0 ? "text-[#ef4444]" : "text-[#10b981]"}`}
          >
            {stats.successRate.toFixed(1)}%
          </div>
          <div className="text-sm text-[#8b9dc3]">Success Rate</div>
        </div>
      </div>
    </div>
  );
}
