import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ContractSizeData } from "@/lib/bytecode/types";

interface ContractSizeChartProps {
  data: ContractSizeData[];
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: ContractSizeData;
    value: number;
  }>;
}

export const ContractSizeChart: React.FC<ContractSizeChartProps> = ({
  data,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-[#8b9dc3]">
        No contract size data available
      </div>
    );
  }

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes}B`;
    return `${(bytes / 1024).toFixed(1)}KB`;
  };

  const CustomTooltip = ({ active, payload }: TooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[rgba(15,20,25,0.95)] border border-[rgba(0,191,255,0.3)] rounded-lg p-3 shadow-lg">
          <p className="text-[#00bfff] font-semibold">{data.contractName}</p>
          <p className="text-[#8b9dc3] text-sm font-mono">{data.address}</p>
          <p className="text-[#00bfff] mt-1">
            Size: {formatBytes(data.size)} ({data.percentage.toFixed(1)}%)
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
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,157,195,0.1)" />
          <XAxis
            dataKey="contractName"
            stroke="#8b9dc3"
            fontSize={12}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis stroke="#8b9dc3" fontSize={12} tickFormatter={formatBytes} />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="size"
            fill="#00bfff"
            radius={[4, 4, 0, 0]}
            stroke="rgba(0,191,255,0.3)"
            strokeWidth={1}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
