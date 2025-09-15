import React, { useCallback, useMemo } from "react";
import ReactFlow, {
  Background,
  ConnectionMode,
  Controls,
  Edge,
  MarkerType,
  Node,
  useEdgesState,
  useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";
import type { TokenAnalysis, TraceAnalysis } from "@/lib/replaytransactions";
import { getTokenConfig, VISUALIZATION_COLORS } from "@/lib/replaytransactions";

// Define nodeTypes and edgeTypes outside component to prevent recreation
const nodeTypes = {};
const edgeTypes = {};

interface TokenFlowDiagramProps {
  tokenAnalysis?: TokenAnalysis;
  traceAnalysis?: TraceAnalysis;
  className?: string;
}

interface FlowNode extends Node {
  data: {
    label: string;
    type: "address" | "contract" | "zero";
    value?: number;
    tokenSymbol?: string;
    isHighlighted?: boolean;
  };
}

interface FlowEdge extends Edge {
  data?: {
    value: number;
    tokenSymbol?: string;
    functionType: string;
    gasUsed: number;
  };
}

export const TokenFlowDiagram: React.FC<TokenFlowDiagramProps> = ({
  tokenAnalysis,
  traceAnalysis,
  className = "",
}) => {
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: FlowNode[] = [];
    const edges: FlowEdge[] = [];
    const nodeMap = new Map<string, FlowNode>();

    if (!tokenAnalysis && !traceAnalysis) {
      return { initialNodes: nodes, initialEdges: edges };
    }

    if (tokenAnalysis?.tokenTransfers) {
      tokenAnalysis.tokenTransfers.forEach((transfer, index) => {
        const { from, to, formattedValue, tokenSymbol, functionType, gasUsed } =
          transfer;

        if (!nodeMap.has(from)) {
          const isZeroAddress =
            from === "0x0000000000000000000000000000000000000000";
          const tokenConfig = getTokenConfig(from);

          nodeMap.set(from, {
            id: from,
            type: "default",
            position: { x: Math.random() * 400, y: Math.random() * 300 },
            data: {
              label: isZeroAddress
                ? "Mint/Burn"
                : tokenConfig?.name ||
                  `${from.slice(0, 6)}...${from.slice(-4)}`,
              type: isZeroAddress
                ? "zero"
                : tokenConfig
                  ? "contract"
                  : "address",
              value: formattedValue,
              tokenSymbol,
            },
            style: {
              background: isZeroAddress
                ? VISUALIZATION_COLORS.tokenFlow.mint
                : tokenConfig
                  ? VISUALIZATION_COLORS.tokenFlow.transfer
                  : VISUALIZATION_COLORS.background.accent,
              color: "#ffffff",
              border: `2px solid ${VISUALIZATION_COLORS.primary}`,
              borderRadius: "8px",
              fontSize: "12px",
              padding: "8px",
            },
          });
        }

        if (!nodeMap.has(to)) {
          const isZeroAddress =
            to === "0x0000000000000000000000000000000000000000";
          const tokenConfig = getTokenConfig(to);

          nodeMap.set(to, {
            id: to,
            type: "default",
            position: { x: Math.random() * 400 + 200, y: Math.random() * 300 },
            data: {
              label: isZeroAddress
                ? "Burn"
                : tokenConfig?.name || `${to.slice(0, 6)}...${to.slice(-4)}`,
              type: isZeroAddress
                ? "zero"
                : tokenConfig
                  ? "contract"
                  : "address",
              value: formattedValue,
              tokenSymbol,
            },
            style: {
              background: isZeroAddress
                ? VISUALIZATION_COLORS.tokenFlow.burn
                : tokenConfig
                  ? VISUALIZATION_COLORS.tokenFlow.transfer
                  : VISUALIZATION_COLORS.background.accent,
              color: "#ffffff",
              border: `2px solid ${VISUALIZATION_COLORS.primary}`,
              borderRadius: "8px",
              fontSize: "12px",
              padding: "8px",
            },
          });
        }

        const edgeColor =
          functionType === "mint"
            ? VISUALIZATION_COLORS.tokenFlow.mint
            : functionType === "burn"
              ? VISUALIZATION_COLORS.tokenFlow.burn
              : VISUALIZATION_COLORS.tokenFlow.transfer;

        edges.push({
          id: `transfer-${index}`,
          source: from,
          target: to,
          type: "smoothstep",
          animated: true,
          label: `${formattedValue.toFixed(2)} ${tokenSymbol || ""}`,
          labelStyle: {
            fontSize: "10px",
            color: "#ffffff",
            background: "rgba(0,0,0,0.7)",
            padding: "2px 4px",
            borderRadius: "4px",
          },
          style: {
            stroke: edgeColor,
            strokeWidth: Math.max(2, Math.min(8, formattedValue / 1000)),
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: edgeColor,
          },
          data: {
            value: formattedValue,
            tokenSymbol,
            functionType,
            gasUsed,
          },
        });
      });
    }

    if (traceAnalysis?.contractInteractions) {
      traceAnalysis.contractInteractions
        .filter((interaction) => interaction.isToken)
        .forEach((interaction) => {
          if (!nodeMap.has(interaction.address)) {
            const tokenConfig = getTokenConfig(interaction.address);

            nodeMap.set(interaction.address, {
              id: interaction.address,
              type: "default",
              position: {
                x: Math.random() * 400 + 100,
                y: Math.random() * 300 + 100,
              },
              data: {
                label:
                  interaction.name ||
                  tokenConfig?.name ||
                  `${interaction.address.slice(0, 6)}...`,
                type: "contract",
                tokenSymbol: tokenConfig?.symbol,
              },
              style: {
                background: VISUALIZATION_COLORS.tokenFlow.transfer,
                color: "#ffffff",
                border: `2px solid ${VISUALIZATION_COLORS.primary}`,
                borderRadius: "8px",
                fontSize: "12px",
                padding: "8px",
              },
            });
          }
        });
    }

    return {
      initialNodes: Array.from(nodeMap.values()),
      initialEdges: edges,
    };
  }, [tokenAnalysis, traceAnalysis]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          style: {
            ...n.style,
            opacity: n.id === node.id ? 1 : 0.5,
          },
        }))
      );

      setEdges((eds) =>
        eds.map((e) => ({
          ...e,
          style: {
            ...e.style,
            opacity: e.source === node.id || e.target === node.id ? 1 : 0.3,
          },
        }))
      );
    },
    [setNodes, setEdges]
  );

  const onPaneClick = useCallback(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        style: {
          ...n.style,
          opacity: 1,
        },
      }))
    );

    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        style: {
          ...e.style,
          opacity: 1,
        },
      }))
    );
  }, [setNodes, setEdges]);

  if (initialNodes.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-[#8b9dc3]">No token flow data available</div>
      </div>
    );
  }

  return (
    <div className={`h-96 w-full ${className}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        attributionPosition="bottom-left"
        style={{
          background: "rgba(15,20,25,0.8)",
          borderRadius: "8px",
        }}
      >
        <Background
          color={VISUALIZATION_COLORS.primary}
          gap={20}
          size={1}
          style={{ opacity: 0.1 }}
        />
        <Controls
          style={{
            background: "rgba(25,28,40,0.9)",
            border: `1px solid ${VISUALIZATION_COLORS.background.border}`,
          }}
        />
      </ReactFlow>

      <div className="mt-4 flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded"
            style={{ background: VISUALIZATION_COLORS.tokenFlow.mint }}
          />
          <span className="text-[#8b9dc3]">Mint</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded"
            style={{ background: VISUALIZATION_COLORS.tokenFlow.burn }}
          />
          <span className="text-[#8b9dc3]">Burn</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded"
            style={{ background: VISUALIZATION_COLORS.tokenFlow.transfer }}
          />
          <span className="text-[#8b9dc3]">Transfer</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded"
            style={{ background: VISUALIZATION_COLORS.tokenFlow.approve }}
          />
          <span className="text-[#8b9dc3]">Contract</span>
        </div>
      </div>
    </div>
  );
};
