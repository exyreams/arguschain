import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SimilarityHeatmapData } from "@/lib/bytecode/types";

interface ChartDataPoint extends SimilarityHeatmapData {
  pairName: string;
}

interface SimilarityHeatmapProps {
  data: SimilarityHeatmapData[];
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: ChartDataPoint;
    value: number;
  }>;
}

export const SimilarityHeatmap: React.FC<SimilarityHeatmapProps> = ({
  data,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-[#8b9dc3]">
        No similarity data available
      </div>
    );
  }

  const chartData: ChartDataPoint[] = data.map((item) => ({
    ...item,
    pairName: `${shortenAddress(item.contractA)} ↔ ${shortenAddress(item.contractB)}`,
  }));

  const getBarColor = (similarity: number): string => {
    if (similarity >= 80) return "#10b981";
    if (similarity >= 50) return "#f59e0b";
    if (similarity >= 20) return "#3b82f6";
    return "#6b7280";
  };

  const CustomTooltip = ({ active, payload }: TooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[rgba(15,20,25,0.95)] border border-[rgba(0,191,255,0.3)] rounded-lg p-3 shadow-lg">
          <p className="text-[#00bfff] font-semibold">Contract Similarity</p>
          <p className="text-[#8b9dc3] text-sm font-mono">{data.contractA}</p>
          <p className="text-[#8b9dc3] text-sm font-mono">{data.contractB}</p>
          <p className="text-[#00bfff] mt-1">
            Similarity: {data.similarity.toFixed(1)}%
          </p>
          <p className="text-[#8b9dc3] text-sm">
            Shared Functions: {data.sharedFunctions}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,157,195,0.1)" />
          <XAxis
            dataKey="pairName"
            stroke="#8b9dc3"
            fontSize={12}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            stroke="#8b9dc3"
            fontSize={12}
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="similarity"
            radius={[4, 4, 0, 0]}
            stroke="rgba(0,191,255,0.3)"
            strokeWidth={1}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getBarColor(entry.similarity)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

function shortenAddress(address: string, chars: number = 4): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 2 + chars)}...${address.slice(-chars)}`;
}
