import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts";
import type { GasComparisonChartData } from "@/lib/transactionsimulation/types";

interface GasComparisonChartProps {
  data: GasComparisonChartData;
  height?: number;
  showTooltip?: boolean;
  interactive?: boolean;
  className?: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[rgba(25,28,40,0.95)] border border-[rgba(0,191,255,0.3)] rounded-lg p-3 shadow-lg">
        <p className="text-[#00bfff] font-medium mb-2">{label}</p>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-[#8b9dc3]">Gas Used:</span>
            <span className="text-white font-mono">
              {payload[0].value.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[#8b9dc3]">Relative Cost:</span>
            <span className="text-white">
              {(data.relativeCost * 100).toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[#8b9dc3]">Efficiency:</span>
            <span className="text-white">{data.efficiency.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[#8b9dc3]">Status:</span>
            <span
              className={
                data.success
                  ? "text-green-400"
                  : data.category === "warning"
                    ? "text-yellow-400"
                    : "text-red-400"
              }
            >
              {data.success ? "Success" : "Failed"}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const GasComparisonChart: React.FC<GasComparisonChartProps> = ({
  data,
  height = 300,
  showTooltip = true,
  interactive = true,
  className = "",
}) => {
  const getBarColor = (entry: any) => {
    if (entry.success) {
      return entry.efficiency > 80 ? data.colors.success : data.colors.primary;
    }
    return data.colors.error;
  };

  return (
    <div className={`w-full ${className}`}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data.data}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,191,255,0.1)" />
          <XAxis
            dataKey="name"
            stroke="#8b9dc3"
            fontSize={12}
            tick={{ fill: "#8b9dc3" }}
          />
          <YAxis
            stroke="#8b9dc3"
            fontSize={12}
            tick={{ fill: "#8b9dc3" }}
            tickFormatter={(value) => value.toLocaleString()}
          />
          {showTooltip && <Tooltip content={<CustomTooltip />} />}
          <Legend
            wrapperStyle={{ color: "#8b9dc3" }}
            iconType="rect"
            formatter={(value) => (
              <span style={{ color: "#8b9dc3" }}>{value}</span>
            )}
          />
          <Bar
            dataKey="gasUsed"
            name="Gas Used"
            radius={[4, 4, 0, 0]}
            stroke="rgba(0,191,255,0.3)"
            strokeWidth={1}
          >
            {data.data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default GasComparisonChart;
