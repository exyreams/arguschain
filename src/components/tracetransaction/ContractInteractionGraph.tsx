import React, { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  PYUSD_CONTRACTS,
  VISUALIZATION_COLORS,
} from "@/lib/tracetransaction/constants";
import { shortenAddress } from "@/lib/tracetransaction/functionDecoder";
import type { ContractInteraction } from "@/lib/tracetransaction/types";

interface ContractInteractionGraphProps {
  interactions: ContractInteraction[];
  className?: string;
}

interface GraphNode {
  id: string;
  x: number;
  y: number;
  size: number;
  color: string;
  label: string;
  address: string;
  contractName: string;
  isPyusd: boolean;
  gasUsed: number;
  callCount: number;
}

interface GraphEdge {
  from: string;
  to: string;
  weight: number;
  gasUsed: number;
  callCount: number;
}

export function ContractInteractionGraph({
  interactions,
  className = "",
}: ContractInteractionGraphProps) {
  const { nodes, edges } = useMemo(() => {
    if (!interactions || interactions.length === 0) {
      return { nodes: [], edges: [] };
    }

    const nodeMap = new Map<string, GraphNode>();
    const edgeList: GraphEdge[] = [];

    const uniqueAddresses = new Set<string>();
    interactions.forEach((interaction) => {
      uniqueAddresses.add(interaction.from);
      uniqueAddresses.add(interaction.to);
    });

    const addresses = Array.from(uniqueAddresses);
    const centerX = 50;
    const centerY = 50;
    const radius = 30;

    addresses.forEach((address, index) => {
      const angle = (index * 2 * Math.PI) / addresses.length;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      const isPyusd = address.toLowerCase() in PYUSD_CONTRACTS;
      const contractName = isPyusd
        ? PYUSD_CONTRACTS[address.toLowerCase() as keyof typeof PYUSD_CONTRACTS]
        : "External Contract";

      const totalGas = interactions
        .filter((i) => i.from === address || i.to === address)
        .reduce((sum, i) => sum + (Number(i.gas) || 0), 0);

      const totalCalls = interactions
        .filter((i) => i.from === address || i.to === address)
        .reduce((sum, i) => sum + (Number(i.count) || 0), 0);

      const validTotalGas = Number(totalGas) || 0;
      const scaledSize = validTotalGas / 1000;
      const nodeSize = isNaN(scaledSize)
        ? 100
        : Math.max(100, Math.min(800, scaledSize));

      const node: GraphNode = {
        id: address,
        x: Number(x) || 0,
        y: Number(y) || 0,
        size: nodeSize,
        color: isPyusd
          ? contractName.includes("Token")
            ? VISUALIZATION_COLORS.pyusd_token
            : VISUALIZATION_COLORS.supply_control
          : VISUALIZATION_COLORS.external_contract,
        label: shortenAddress(address),
        address,
        contractName,
        isPyusd,
        gasUsed: totalGas,
        callCount: totalCalls,
      };

      nodeMap.set(address, node);
    });

    interactions.forEach((interaction) => {
      edgeList.push({
        from: interaction.from,
        to: interaction.to,
        weight: interaction.gas,
        gasUsed: interaction.gas,
        callCount: interaction.count,
      });
    });

    return {
      nodes: Array.from(nodeMap.values()),
      edges: edgeList,
    };
  }, [interactions]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[rgba(25,28,40,0.95)] border border-[rgba(0,191,255,0.3)] rounded-lg p-3 shadow-lg">
          <div className="text-[#00bfff] font-semibold mb-2">
            {data.contractName}
          </div>
          <div className="text-sm text-[#8b9dc3] space-y-1">
            <div>
              Address:{" "}
              <span className="font-mono text-[#00bfff]">{data.address}</span>
            </div>
            <div>
              Gas Used:{" "}
              <span className="text-[#00bfff]">
                {data.gasUsed.toLocaleString()}
              </span>
            </div>
            <div>
              Total Calls:{" "}
              <span className="text-[#00bfff]">{data.callCount}</span>
            </div>
            <div>
              Type:{" "}
              <span className="text-[#00bfff]">
                {data.isPyusd ? "PYUSD Contract" : "External Contract"}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    return (
      <circle
        cx={cx}
        cy={cy}
        r={Math.sqrt(payload.size) / 3}
        fill={payload.color}
        stroke="#000"
        strokeWidth={1}
        opacity={0.8}
      />
    );
  };

  if (nodes.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <div className="text-[#8b9dc3] mb-2">
            No contract interactions found
          </div>
          <div className="text-sm text-[#6b7280]">
            Contract interaction data will appear here when available
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full h-96 ${className}`}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart
          margin={{
            top: 20,
            right: 20,
            bottom: 20,
            left: 20,
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(139, 157, 195, 0.2)"
          />
          <XAxis type="number" dataKey="x" domain={[0, 100]} hide />
          <YAxis type="number" dataKey="y" domain={[0, 100]} hide />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ color: "#8b9dc3" }}
            formatter={(value) => (
              <span style={{ color: "#8b9dc3" }}>{value}</span>
            )}
          />

          <Scatter
            name="PYUSD Contracts"
            data={nodes.filter((n) => n.isPyusd)}
            fill={VISUALIZATION_COLORS.pyusd_token}
            shape={<CustomDot />}
          />

          <Scatter
            name="External Contracts"
            data={nodes.filter((n) => !n.isPyusd)}
            fill={VISUALIZATION_COLORS.external_contract}
            shape={<CustomDot />}
          />
        </ScatterChart>
      </ResponsiveContainer>

      <div className="relative -mt-96 h-96 pointer-events-none">
        <svg className="w-full h-full">
          {edges.map((edge, index) => {
            const fromNode = nodes.find((n) => n.id === edge.from);
            const toNode = nodes.find((n) => n.id === edge.to);

            if (!fromNode || !toNode) return null;

            const svgWidth = 400;
            const svgHeight = 400;
            const x1 = (fromNode.x / 100) * svgWidth;
            const y1 = (fromNode.y / 100) * svgHeight;
            const x2 = (toNode.x / 100) * svgWidth;
            const y2 = (toNode.y / 100) * svgHeight;

            return (
              <line
                key={index}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(0, 191, 255, 0.3)"
                strokeWidth={Math.max(1, (Number(edge.callCount) || 1) / 2)}
                opacity={0.6}
              />
            );
          })}
        </svg>
      </div>

      <div className="relative -mt-96 h-96 pointer-events-none">
        {nodes.map((node, index) => (
          <div
            key={index}
            className="absolute text-xs text-[#00bfff] font-mono"
            style={{
              left: `${node.x}%`,
              top: `${node.y + 8}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            {node.label}
          </div>
        ))}
      </div>
    </div>
  );
}
