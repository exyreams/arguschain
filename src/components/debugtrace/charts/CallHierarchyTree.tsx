import React, { useCallback, useMemo, useState } from "react";
import {
  addEdge,
  Background,
  ConnectionLineType,
  Handle,
  Panel,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import "@xyflow/react/dist/style.css";
import { Badge, Checkbox, Input } from "@/components/global";
import { formatGas, shortenAddress } from "@/lib/config";
import { CallHierarchyNode } from "@/lib/debugtrace/types";
import {
  AlertCircle,
  CheckCircle,
  Filter,
  GitBranch,
  RotateCcw,
  RotateCw,
  Search,
  Zap,
} from "lucide-react";

interface CallHierarchyTreeProps {
  data: CallHierarchyNode[];
  height?: number;
  className?: string;
}

const CallNode = ({ data }: { data: any }) => {
  const { node } = data;
  const isEfficient =
    node.value > 0
      ? node.gasUsed / (node.value * 1000000) < 50
      : node.gasUsed / 1000 < 50;

  return (
    <div className="bg-[rgba(25,28,40,0.95)] border-2 border-[rgba(0,191,255,0.3)] rounded-lg p-3 min-w-[280px] shadow-lg backdrop-blur-sm">
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-[#00bfff] border-2 border-[rgba(0,191,255,0.5)]"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className={`flex items-center ${node.success ? "text-[#10b981]" : "text-[#ef4444]"}`}
        >
          {node.success ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
        </div>

        <span className="text-white font-semibold text-sm truncate flex-1">
          {node.contractName !== "Unknown Contract"
            ? node.contractName
            : shortenAddress(node.contractAddress)}
        </span>

        {isEfficient && (
          <Badge
            variant="outline"
            className="border-[rgba(16,185,129,0.4)] text-[#10b981] bg-[rgba(16,185,129,0.1)] text-xs"
          >
            <Zap className="h-3 w-3 mr-1" />
            Efficient
          </Badge>
        )}
      </div>

      {/* Function */}
      <div className="mb-2">
        <Badge
          variant="outline"
          className="border-[rgba(0,191,255,0.4)] text-[#00bfff] bg-[rgba(0,191,255,0.1)] text-xs font-mono"
        >
          {node.functionName}
        </Badge>
      </div>

      {/* Address */}
      <div className="text-xs text-[#8b9dc3] font-mono mb-2">
        {shortenAddress(node.contractAddress)}
      </div>

      {/* Metrics */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="text-[#8b9dc3]">
            Gas:{" "}
            <span className="text-[#00bfff] font-medium">
              {formatGas(node.gasUsed)}
            </span>
          </span>
          {node.value > 0 && (
            <span className="text-[#8b9dc3]">
              Value:{" "}
              <span className="text-[#10b981] font-medium">
                {node.value.toFixed(4)} ETH
              </span>
            </span>
          )}
        </div>
        <span className="text-[#8b9dc3]">
          Depth: <span className="text-[#00bfff]">{node.depth}</span>
        </span>
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
  callNode: CallNode,
};

const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
const nodeWidth = 300;
const nodeHeight = 120;

const getLayoutedElements = (nodes: any[], edges: any[], direction = "TB") => {
  const isHorizontal = direction === "LR";
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: 50,
    ranksep: 80,
    marginx: 20,
    marginy: 20,
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

const convertToFlowElements = (data: CallHierarchyNode[]) => {
  const nodes: any[] = [];
  const edges: any[] = [];

  const processNode = (node: CallHierarchyNode) => {
    nodes.push({
      id: node.id,
      type: "callNode",
      data: { node },
      position: { x: 0, y: 0 },
    });

    if (node.children && node.children.length > 0) {
      node.children.forEach((child) => {
        edges.push({
          id: `${node.id}-${child.id}`,
          source: node.id,
          target: child.id,
          type: "smoothstep",
          animated: true,
          style: {
            stroke: child.success ? "#10b981" : "#ef4444",
            strokeWidth: 2,
          },
          markerEnd: {
            type: "arrowclosed",
            color: child.success ? "#10b981" : "#ef4444",
          },
        });
        processNode(child);
      });
    }
  };

  data.forEach(processNode);
  return { nodes, edges };
};

export function CallHierarchyTree({
  data,
  height = 400,
  className = "",
}: CallHierarchyTreeProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);
  const [layoutDirection, setLayoutDirection] = useState<"TB" | "LR">("TB");

  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];

    let filtered = [...data];

    if (searchTerm) {
      const filterNodes = (nodes: CallHierarchyNode[]): CallHierarchyNode[] => {
        return nodes
          .filter((node) => {
            const matchesSearch =
              node.contractName
                .toLowerCase()
                .includes(searchTerm.toLowerCase()) ||
              node.functionName
                .toLowerCase()
                .includes(searchTerm.toLowerCase()) ||
              node.contractAddress
                .toLowerCase()
                .includes(searchTerm.toLowerCase());

            const hasMatchingChildren =
              node.children && filterNodes(node.children).length > 0;

            return matchesSearch || hasMatchingChildren;
          })
          .map((node) => ({
            ...node,
            children: node.children ? filterNodes(node.children) : [],
          }));
      };
      filtered = filterNodes(filtered);
    }

    if (showOnlyErrors) {
      const filterErrors = (
        nodes: CallHierarchyNode[],
      ): CallHierarchyNode[] => {
        return nodes
          .filter((node) => {
            const hasError = !node.success;
            const hasErrorChildren =
              node.children && filterErrors(node.children).length > 0;

            return hasError || hasErrorChildren;
          })
          .map((node) => ({
            ...node,
            children: node.children ? filterErrors(node.children) : [],
          }));
      };
      filtered = filterErrors(filtered);
    }

    return filtered;
  }, [data, searchTerm, showOnlyErrors]);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    return convertToFlowElements(filteredData);
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
          eds,
        ),
      ),
    [],
  );

  const onLayout = useCallback(
    (direction: "TB" | "LR") => {
      const { nodes: newLayoutedNodes, edges: newLayoutedEdges } =
        getLayoutedElements(nodes, edges, direction);
      setNodes([...newLayoutedNodes]);
      setEdges([...newLayoutedEdges]);
      setLayoutDirection(direction);
    },
    [nodes, edges, setNodes, setEdges],
  );

  const stats = useMemo(() => {
    const calculateStats = (nodes: CallHierarchyNode[]) => {
      let totalNodes = 0;
      let totalGas = 0;
      let errorCount = 0;
      let maxDepth = 0;

      const traverse = (nodeList: CallHierarchyNode[]) => {
        nodeList.forEach((node) => {
          totalNodes++;
          totalGas += node.gasUsed;
          if (!node.success) errorCount++;
          maxDepth = Math.max(maxDepth, node.depth);

          if (node.children) {
            traverse(node.children);
          }
        });
      };

      traverse(nodes);

      return {
        totalNodes,
        totalGas,
        errorCount,
        maxDepth,
        successRate:
          totalNodes > 0 ? ((totalNodes - errorCount) / totalNodes) * 100 : 0,
      };
    };

    return calculateStats(filteredData.length > 0 ? filteredData : data);
  }, [data, filteredData]);

  if (!data || data.length === 0) {
    return (
      <div
        className={`flex items-center justify-center bg-[rgba(15,20,25,0.8)] rounded-lg ${className}`}
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
    <div className={`bg-[rgba(15,20,25,0.8)] rounded-lg p-4 ${className}`}>
      {/* Header with controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#8b9dc3]" />
            <Input
              type="text"
              placeholder="Search contracts or functions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.3)] text-white rounded-lg pl-10 pr-4 py-2 text-sm focus:border-[#00bfff] focus:ring-1 focus:ring-[#00bfff] w-72"
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
            Nodes:{" "}
            <span className="text-[#00bfff] font-medium">
              {stats.totalNodes}
            </span>
          </span>
          <span>
            Max Depth:{" "}
            <span className="text-[#00bfff] font-medium">{stats.maxDepth}</span>
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

      {/* Call Hierarchy Tree */}
      <div
        className="bg-[rgba(15,20,25,0.6)] rounded-lg border border-[rgba(0,191,255,0.2)] overflow-hidden"
        style={{ height: height - 60 }}
      >
        {filteredData.length === 0 && (searchTerm || showOnlyErrors) ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Search className="h-12 w-12 text-[rgba(0,191,255,0.3)] mx-auto mb-3" />
              <p className="text-[#8b9dc3] text-sm">
                No nodes match your search criteria
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
            defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
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
            {stats.totalNodes}
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
          <div className="text-lg font-bold text-[#00bfff]">
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

      {/* Analysis Summary */}
      <div className="mt-4 bg-[rgba(15,20,25,0.6)] rounded-lg p-4 border border-[rgba(0,191,255,0.2)]">
        <h5 className="text-sm font-medium text-[#00bfff] mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Call Pattern Analysis
        </h5>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-[#8b9dc3]">Call Complexity:</span>
            <Badge
              variant="outline"
              className={`${
                stats.maxDepth > 5
                  ? "border-[#ef4444] text-[#ef4444] bg-[rgba(239,68,68,0.1)]"
                  : stats.maxDepth > 3
                    ? "border-[#f59e0b] text-[#f59e0b] bg-[rgba(245,158,11,0.1)]"
                    : "border-[#10b981] text-[#10b981] bg-[rgba(16,185,129,0.1)]"
              }`}
            >
              {stats.maxDepth > 5
                ? "High"
                : stats.maxDepth > 3
                  ? "Medium"
                  : "Low"}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#8b9dc3]">Error Rate:</span>
            <Badge
              variant="outline"
              className={`${
                stats.errorCount / stats.totalNodes > 0.1
                  ? "border-[#ef4444] text-[#ef4444] bg-[rgba(239,68,68,0.1)]"
                  : stats.errorCount > 0
                    ? "border-[#f59e0b] text-[#f59e0b] bg-[rgba(245,158,11,0.1)]"
                    : "border-[#10b981] text-[#10b981] bg-[rgba(16,185,129,0.1)]"
              }`}
            >
              {((stats.errorCount / stats.totalNodes) * 100).toFixed(1)}%
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#8b9dc3]">Avg Gas per Call:</span>
            <span className="text-[#00bfff] font-medium">
              {formatGas(Math.round(stats.totalGas / stats.totalNodes))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
