import React, { useCallback, useMemo } from "react";
import ReactFlow, {
  Background,
  ConnectionMode,
  Controls,
  Edge,
  Node,
  Panel,
  useEdgesState,
  useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";
import { Badge } from "@/components/global/Badge";
import { Card } from "@/components/global/Card";
import type { BytecodeAnalysis, ContractComparison } from "@/lib/bytecode";

interface ContractArchitectureDiagramProps {
  comparison: ContractComparison;
  className?: string;
}

interface ContractNode extends Node {
  data: {
    contract: BytecodeAnalysis;
    label: string;
    type: "proxy" | "implementation" | "contract";
    size: number;
    standards: string[];
  };
}

export const ContractArchitectureDiagram: React.FC<
  ContractArchitectureDiagramProps
> = ({ comparison, className }) => {
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: ContractNode[] = [];
    const edges: Edge[] = [];

    comparison.contracts.forEach((contract, index) => {
      const nodeType = contract.proxy.isProxy
        ? "proxy"
        : contract.standards.length > 0
          ? "implementation"
          : "contract";

      nodes.push({
        id: contract.address,
        type: "custom",
        position: {
          x: (index % 3) * 300 + 50,
          y: Math.floor(index / 3) * 200 + 50,
        },
        data: {
          contract,
          label: contract.contractName,
          type: nodeType,
          size: contract.size,
          standards: contract.standards,
        },
        style: {
          background: getNodeColor(nodeType),
          border: `2px solid ${getNodeBorderColor(nodeType)}`,
          borderRadius: "8px",
          padding: "10px",
          minWidth: "200px",
        },
      });
    });

    comparison.relationships.forEach((relationship, index) => {
      if (relationship.contracts.length >= 2) {
        const [source, target] = relationship.contracts;
        edges.push({
          id: `edge-${index}`,
          source,
          target,
          type: "smoothstep",
          label: getRelationshipLabel(relationship.type),
          style: {
            stroke: getEdgeColor(relationship.type),
            strokeWidth: 2,
          },
          labelStyle: {
            fill: "#00bfff",
            fontWeight: 600,
            fontSize: "12px",
          },
        });
      }
    });

    comparison.similarities
      .filter((sim) => sim.similarity > 70)
      .forEach((similarity, index) => {
        edges.push({
          id: `similarity-${index}`,
          source: similarity.contractA,
          target: similarity.contractB,
          type: "straight",
          label: `${similarity.similarity.toFixed(1)}% similar`,
          style: {
            stroke: "#8b9dc3",
            strokeWidth: 1,
            strokeDasharray: "5,5",
          },
          labelStyle: {
            fill: "#8b9dc3",
            fontSize: "10px",
          },
        });
      });

    return { initialNodes: nodes, initialEdges: edges };
  }, [comparison]);

  const [nodes, _setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, _setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const CustomNode = useCallback(({ data }: { data: ContractNode["data"] }) => {
    const formatBytes = (bytes: number): string => {
      if (bytes < 1024) return `${bytes}B`;
      return `${(bytes / 1024).toFixed(1)}KB`;
    };

    return (
      <div className="p-3 bg-[rgba(25,28,40,0.9)] border border-[rgba(0,191,255,0.3)] rounded-lg min-w-[180px]">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Badge className={`text-xs ${getTypeBadgeColor(data.type)}`}>
              {data.type.toUpperCase()}
            </Badge>
            <span className="text-xs text-[#8b9dc3] font-mono">
              {formatBytes(data.size)}
            </span>
          </div>

          <h4 className="text-sm font-semibold text-[#00bfff] truncate">
            {data.label}
          </h4>

          <div className="text-xs text-[#8b9dc3] font-mono">
            {shortenAddress(data.contract.address)}
          </div>

          {data.standards.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {data.standards.slice(0, 2).map((standard, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="text-xs border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                >
                  {standard}
                </Badge>
              ))}
              {data.standards.length > 2 && (
                <span className="text-xs text-[#8b9dc3]">
                  +{data.standards.length - 2}
                </span>
              )}
            </div>
          )}

          <div className="flex justify-between text-xs text-[#8b9dc3]">
            <span>Functions: {data.contract.functions.length}</span>
            <span>Complexity: {data.contract.complexity.level}</span>
          </div>
        </div>
      </div>
    );
  }, []);

  const nodeTypes = useMemo(
    () => ({
      custom: CustomNode,
    }),
    [CustomNode],
  );

  return (
    <Card className={`h-96 ${className}`}>
      <div className="h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Loose}
          fitView
          fitViewOptions={{ padding: 0.2 }}
        >
          <Background color="#1a1d28" gap={20} />
          <Controls
            style={{
              background: "rgba(25,28,40,0.9)",
              border: "1px solid rgba(0,191,255,0.3)",
            }}
          />
          <Panel position="top-left">
            <div className="bg-[rgba(25,28,40,0.9)] border border-[rgba(0,191,255,0.3)] rounded-lg p-3">
              <h4 className="text-sm font-semibold text-[#00bfff] mb-2">
                Contract Architecture
              </h4>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-purple-500/50"></div>
                  <span className="text-[#8b9dc3]">Proxy Contract</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-blue-500/50"></div>
                  <span className="text-[#8b9dc3]">Implementation</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-green-500/50"></div>
                  <span className="text-[#8b9dc3]">Standard Contract</span>
                </div>
              </div>
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </Card>
  );
};

function getNodeColor(type: string): string {
  switch (type) {
    case "proxy":
      return "rgba(147, 51, 234, 0.2)";
    case "implementation":
      return "rgba(59, 130, 246, 0.2)";
    case "contract":
      return "rgba(34, 197, 94, 0.2)";
    default:
      return "rgba(139, 157, 195, 0.2)";
  }
}

function getNodeBorderColor(type: string): string {
  switch (type) {
    case "proxy":
      return "rgba(147, 51, 234, 0.5)";
    case "implementation":
      return "rgba(59, 130, 246, 0.5)";
    case "contract":
      return "rgba(34, 197, 94, 0.5)";
    default:
      return "rgba(139, 157, 195, 0.5)";
  }
}

function getTypeBadgeColor(type: string): string {
  switch (type) {
    case "proxy":
      return "text-purple-400 bg-purple-500/20 border-purple-500/50";
    case "implementation":
      return "text-blue-400 bg-blue-500/20 border-blue-500/50";
    case "contract":
      return "text-green-400 bg-green-500/20 border-green-500/50";
    default:
      return "text-[#8b9dc3] bg-[rgba(0,191,255,0.1)] border-[rgba(0,191,255,0.3)]";
  }
}

function getRelationshipLabel(type: string): string {
  switch (type) {
    case "proxy-implementation":
      return "delegates to";
    case "similar":
      return "similar to";
    case "related":
      return "related to";
    default:
      return "connected to";
  }
}

function getEdgeColor(type: string): string {
  switch (type) {
    case "proxy-implementation":
      return "#9333ea";
    case "similar":
      return "#3b82f6";
    case "related":
      return "#22c55e";
    default:
      return "#8b9dc3";
  }
}

function shortenAddress(address: string, chars: number = 4): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 2 + chars)}...${address.slice(-chars)}`;
}
