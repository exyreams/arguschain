import React from "react";
import { ResponsiveContainer, Sankey, Tooltip } from "recharts";
import type { TransactionFlowData } from "@/lib/transactionsimulation/types";

interface TransactionFlowChartProps {
  data: TransactionFlowData;
  height?: number;
  className?: string;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;

    if (data.name) {
      return (
        <div className="bg-[rgba(25,28,40,0.95)] border border-[rgba(0,191,255,0.3)] rounded-lg p-3 shadow-lg">
          <p className="text-[#00bfff] font-medium mb-2">{data.name}</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-[#8b9dc3]">Address:</span>
              <span className="text-white font-mono text-xs">
                {data.address}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[#8b9dc3]">Type:</span>
              <span className="text-white capitalize">{data.nodeType}</span>
            </div>
            {data.value && (
              <div className="flex justify-between gap-4">
                <span className="text-[#8b9dc3]">Value:</span>
                <span className="text-white">
                  {data.value.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (data.source !== undefined && data.target !== undefined) {
      return (
        <div className="bg-[rgba(25,28,40,0.95)] border border-[rgba(0,191,255,0.3)] rounded-lg p-3 shadow-lg">
          <p className="text-[#00bfff] font-medium mb-2">Transaction Flow</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-[#8b9dc3]">Type:</span>
              <span className="text-white capitalize">{data.type}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[#8b9dc3]">Amount:</span>
              <span className="text-white">{data.value.toLocaleString()}</span>
            </div>
            {data.label && (
              <div className="flex justify-between gap-4">
                <span className="text-[#8b9dc3]">Label:</span>
                <span className="text-white">{data.label}</span>
              </div>
            )}
          </div>
        </div>
      );
    }
  }
  return null;
};

const CustomNode = ({ payload, ...props }: any) => {
  const { x, y, width, height, index } = props;
  const nodeData = payload;

  const getNodeColor = (nodeType: string) => {
    switch (nodeType) {
      case "sender":
        return "#ef4444";
      case "receiver":
        return "#10b981";
      case "contract":
        return "#00bfff";
      case "minter":
        return "#f59e0b";
      case "burner":
        return "#8b5cf6";
      default:
        return "#8b9dc3";
    }
  };

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={getNodeColor(nodeData.nodeType)}
        fillOpacity={0.8}
        stroke="rgba(0,191,255,0.3)"
        strokeWidth={1}
        rx={4}
      />
      <text
        x={x + width / 2}
        y={y + height / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={12}
        fill="white"
        fontWeight="medium"
      >
        {nodeData.name}
      </text>
    </g>
  );
};

export const TransactionFlowChart: React.FC<TransactionFlowChartProps> = ({
  data,
  height = 400,
  className = "",
}) => {
  const sankeyData = {
    nodes: data.nodes.map((node, index) => ({
      ...node,
      nodeId: index,
    })),
    links: data.links.map((link) => ({
      ...link,
      source: data.nodes.findIndex((n) => n.id === link.source),
      target: data.nodes.findIndex((n) => n.id === link.target),
    })),
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="mb-4">
        <h4 className="text-lg font-semibold text-[#00bfff] mb-2">
          Transaction Flow
        </h4>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span className="text-[#8b9dc3]">Sender</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-[#8b9dc3]">Receiver</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 bg-[#00bfff] rounded"></div>
            <span className="text-[#8b9dc3]">Contract</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
            <span className="text-[#8b9dc3]">Minter</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 bg-purple-500 rounded"></div>
            <span className="text-[#8b9dc3]">Burner</span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <Sankey
          data={sankeyData}
          nodePadding={50}
          margin={{ top: 20, right: 80, bottom: 20, left: 80 }}
          link={{
            stroke: "#00bfff",
            strokeOpacity: 0.6,
            strokeWidth: 2,
          }}
          node={{
            fill: "#8b9dc3",
            fillOpacity: 0.8,
            stroke: "rgba(0,191,255,0.3)",
            strokeWidth: 1,
          }}
        >
          <Tooltip content={<CustomTooltip />} />
        </Sankey>
      </ResponsiveContainer>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-3">
          <div className="text-xs text-[#8b9dc3]">Total Nodes</div>
          <div className="text-lg font-semibold text-[#00bfff]">
            {data.nodes.length}
          </div>
        </div>
        <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-3">
          <div className="text-xs text-[#8b9dc3]">Total Flows</div>
          <div className="text-lg font-semibold text-[#00bfff]">
            {data.links.length}
          </div>
        </div>
        <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-3">
          <div className="text-xs text-[#8b9dc3]">Total Value</div>
          <div className="text-lg font-semibold text-[#00bfff]">
            {data.links
              .reduce((sum, link) => sum + link.value, 0)
              .toLocaleString()}
          </div>
        </div>
        <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-3">
          <div className="text-xs text-[#8b9dc3]">Unique Addresses</div>
          <div className="text-lg font-semibold text-[#00bfff]">
            {new Set(data.nodes.map((n) => n.address)).size}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionFlowChart;
