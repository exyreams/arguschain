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
import { Badge, Checkbox, Input } from "@/components/global";
import { formatGas, shortenAddress } from "@/lib/config";
import type { ProcessedTraceAction } from "@/lib/tracetransaction/types";
import {
  AlertCircle,
  CheckCircle,
  Search,
  Filter,
  GitBranch,
  RotateCcw,
  RotateCw,
  Zap,
} from "lucide-react";

interface CallHierarchyTreeProps {
  traces: ProcessedTraceAction[];
  height?: number;
  className?: string;
}

// Custom Node Component for Call Hierarchy
const CallNode = ({ data }: { data: any }) => {
  const { trace } = data;

  return (
    <div className="bg-[rgba(25,28,40,0.95)] border-2 border-[rgba(0,191,255,0.3)] rounded-lg p-3 min-w-[320px] shadow-lg backdrop-blur-sm">
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-[#00bfff] border-2 border-[rgba(0,191,255,0.5)]"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className={`flex items-center ${!trace.error ? "text-[#10b981]" : "text-[#ef4444]"}`}
        >
          {!trace.error ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
        </div>

        <Badge
          variant="outline"
          className={`${
            trace.error
              ? "border-[#ef4444] text-[#ef4444] bg-[rgba(239,68,68,0.1)]"
              : trace.isPyusd
                ? "border-[rgba(0,191,255,0.4)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                : "border-[rgba(16,185,129,0.4)] text-[#10b981] bg-[rgba(16,185,129,0.1)]"
          } text-xs font-mono`}
        >
          {trace.type}
        </Badge>

        {trace.isPyusd && <Zap className="h-4 w-4 text-[#00bfff]" />}
      </div>

      {/* Function and Contract */}
      <div className="mb-2">
        <h4 className="text-[#00bfff] font-semibold text-sm truncate">
          {trace.function !== "N/A" ? trace.function.split("(")[0] : trace.type}
        </h4>
        <p className="text-xs text-[#8b9dc3] truncate">
          {trace.contract || shortenAddress(trace.to)}
        </p>
      </div>

      {/* Addresses */}
      <div className="mb-2 text-xs">
        <div className="flex items-center gap-2 text-[#8b9dc3]">
          <span>From:</span>
          <span className="font-mono text-[#00bfff]">
            {shortenAddress(trace.from)}
          </span>
          <span>→</span>
          <span className="font-mono text-[#00bfff]">
            {shortenAddress(trace.to)}
          </span>
        </div>
      </div>

      {/* Error Message */}
      {trace.error && (
        <div className="mb-2">
          <Badge
            variant="outline"
            className="border-[#ef4444] text-[#ef4444] bg-[rgba(239,68,68,0.1)] text-xs"
          >
            ERROR: {trace.error}
          </Badge>
        </div>
      )}

      {/* Metrics */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#8b9dc3]">Gas Used:</span>
          <span className="text-white font-medium bg-[rgba(0,191,255,0.1)] px-2 py-1 rounded">
            {formatGas(trace.gasUsed)}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#8b9dc3]">Depth:</span>
          <span className="text-white font-medium bg-[rgba(16,185,129,0.1)] px-2 py-1 rounded">
            {trace.depth}
          </span>
        </div>
        {trace.valueEth > 0 && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#8b9dc3]">Value:</span>
            <span className="text-white font-medium bg-[rgba(245,158,11,0.1)] px-2 py-1 rounded">
              {trace.valueEth.toFixed(6)} ETH
            </span>
          </div>
        )}
      </div>

      {/* Gas Efficiency */}
      {trace.gasEfficiency && (
        <div className="mt-2">
          <Badge
            variant="outline"
            className={`text-xs ${
              trace.gasEfficiency.efficiency === "excellent"
                ? "border-[#10b981] text-[#10b981] bg-[rgba(16,185,129,0.1)]"
                : trace.gasEfficiency.efficiency === "good"
                  ? "border-[#00bfff] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                  : trace.gasEfficiency.efficiency === "average"
                    ? "border-[#f59e0b] text-[#f59e0b] bg-[rgba(245,158,11,0.1)]"
                    : "border-[#ef4444] text-[#ef4444] bg-[rgba(239,68,68,0.1)]"
            }`}
          >
            {trace.gasEfficiency.efficiency}
          </Badge>
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
  callNode: CallNode,
};

// Dagre layout configuration
const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
const nodeWidth = 340;
const nodeHeight = 180;

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

// Convert traces to flow elements
const convertTracesToFlowElements = (traces: ProcessedTraceAction[]) => {
  const nodes: any[] = [];
  const edges: any[] = [];

  // Create a map to track parent-child relationships
  const traceMap = new Map<string, ProcessedTraceAction>();
  traces.forEach((trace) => {
    const nodeId = trace.traceAddress.join("_") || `root_${trace.index}`;
    traceMap.set(nodeId, trace);
  });

  traces.forEach((trace) => {
    const nodeId = trace.traceAddress.join("_") || `root_${trace.index}`;

    nodes.push({
      id: nodeId,
      type: "callNode",
      data: { trace },
      position: { x: 0, y: 0 }, // Will be set by dagre
    });

    // Create edge to parent if this is not a root call
    if (trace.traceAddress.length > 0) {
      const parentTraceAddr = trace.traceAddress.slice(0, -1);
      const parentId = parentTraceAddr.join("_") || "root";

      // Find parent trace
      const parentTrace = Array.from(traceMap.values()).find((t) => {
        const tId = t.traceAddress.join("_") || `root_${t.index}`;
        return tId === parentId;
      });

      if (parentTrace) {
        const gasUsed = Number(trace.gasUsed) || 0;
        const maxGas = Math.max(...traces.map((t) => Number(t.gasUsed) || 0));
        const strokeWidth = Math.max(2, Math.min(6, (gasUsed / maxGas) * 4));

        edges.push({
          id: `${parentId}-${nodeId}`,
          source: parentId,
          target: nodeId,
          type: "smoothstep",
          animated: trace.isPyusd || trace.error,
          style: {
            stroke: trace.error
              ? "#ef4444"
              : trace.isPyusd
                ? "#00bfff"
                : "#10b981",
            strokeWidth,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: trace.error
              ? "#ef4444"
              : trace.isPyusd
                ? "#00bfff"
                : "#10b981",
          },
          label: formatGas(gasUsed),
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
      }
    }
  });

  return { nodes, edges };
};

export function CallHierarchyTree({
  traces,
  height = 600,
  className = "",
}: CallHierarchyTreeProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);
  const [showOnlyPyusd, setShowOnlyPyusd] = useState(false);
  const [layoutDirection, setLayoutDirection] = useState<"TB" | "LR">("TB");

  // Filter traces based on search and filters
  const filteredTraces = useMemo(() => {
    if (!traces || traces.length === 0) return [];

    let filtered = [...traces];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (trace) =>
          trace.contract?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          trace.function.toLowerCase().includes(searchTerm.toLowerCase()) ||
          trace.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
          trace.to.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply error filter
    if (showOnlyErrors) {
      filtered = filtered.filter((trace) => trace.error);
    }

    // Apply PYUSD filter
    if (showOnlyPyusd) {
      filtered = filtered.filter((trace) => trace.isPyusd);
    }

    return filtered;
  }, [traces, searchTerm, showOnlyErrors, showOnlyPyusd]);

  // Convert to flow elements and apply layout
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    return convertTracesToFlowElements(filteredTraces);
  }, [filteredTraces]);

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
    const currentData = filteredTraces.length > 0 ? filteredTraces : traces;
    const totalCalls = currentData.length;
    const errorCount = currentData.filter((trace) => trace.error).length;
    const pyusdCount = currentData.filter((trace) => trace.isPyusd).length;
    const totalGas = currentData.reduce(
      (sum, trace) => sum + (Number(trace.gasUsed) || 0),
      0
    );
    const totalValue = currentData.reduce(
      (sum, trace) => sum + (Number(trace.valueEth) || 0),
      0
    );
    const maxDepth = Math.max(...currentData.map((trace) => trace.depth || 0));

    return {
      totalCalls,
      errorCount,
      pyusdCount,
      totalGas,
      totalValue,
      maxDepth,
      successRate:
        totalCalls > 0 ? ((totalCalls - errorCount) / totalCalls) * 100 : 0,
    };
  }, [traces, filteredTraces]);

  if (!traces || traces.length === 0) {
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
            No call hierarchy data available
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
          <div className="flex items-center gap-3">
            <Checkbox
              checked={showOnlyErrors}
              onChange={setShowOnlyErrors}
              className="text-sm text-text-secondary"
            >
              <div className="flex items-center gap-2 text-text-secondary">
                <Filter className="h-4 w-4" />
                Errors only
              </div>
            </Checkbox>
            <Checkbox
              checked={showOnlyPyusd}
              onChange={setShowOnlyPyusd}
              className="text-sm text-text-secondary"
            >
              <div className="flex items-center gap-2 text-text-secondary">
                PYUSD only
              </div>
            </Checkbox>
          </div>
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
            PYUSD:{" "}
            <span className="text-[#f59e0b] font-medium">
              {stats.pyusdCount}
            </span>
          </span>
        </div>
      </div>

      {/* Call Hierarchy Tree */}
      <div
        className="bg-[rgba(15,20,25,0.6)] rounded-lg border border-[rgba(0,191,255,0.2)] overflow-hidden"
        style={{ height: height - 60 }}
      >
        {filteredTraces.length === 0 &&
        (searchTerm || showOnlyErrors || showOnlyPyusd) ? (
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
            defaultViewport={{ x: 0, y: 0, zoom: 0.5 }}
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
      <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4">
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
          <div className="text-lg font-bold text-[#f59e0b]">
            {stats.maxDepth}
          </div>
          <div className="text-sm text-[#8b9dc3]">Max Depth</div>
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
