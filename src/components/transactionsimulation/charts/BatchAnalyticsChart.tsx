import React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts";
import type { BatchGasChartData } from "@/lib/transactionsimulation/types";

interface BatchAnalyticsChartProps {
  data: BatchGasChartData;
  height?: number;
  showCumulative?: boolean;
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
              {data.gasUsed.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[#8b9dc3]">Cumulative:</span>
            <span className="text-white font-mono">
              {data.cumulativeGas.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[#8b9dc3]">Type:</span>
            <span className="text-white">{data.operationType}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[#8b9dc3]">Status:</span>
            <span className={data.success ? "text-green-400" : "text-red-400"}>
              {data.success ? "Success" : "Failed"}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[#8b9dc3]">Efficiency:</span>
            <span className="text-white">{data.efficiency.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const BatchAnalyticsChart: React.FC<BatchAnalyticsChartProps> = ({
  data,
  height = 400,
  showCumulative = true,
  className = "",
}) => {
  const getBarColor = (entry: any) => {
    if (entry.success) {
      return entry.efficiency > 80 ? "#10b981" : "#00bfff";
    }
    return "#ef4444";
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-3">
          <div className="text-xs text-[#8b9dc3]">Total Operations</div>
          <div className="text-lg font-semibold text-[#00bfff]">
            {data.summary.totalOperations}
          </div>
        </div>
        <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-3">
          <div className="text-xs text-[#8b9dc3]">Total Gas</div>
          <div className="text-lg font-semibold text-[#00bfff]">
            {data.summary.totalGas.toLocaleString()}
          </div>
        </div>
        <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-3">
          <div className="text-xs text-[#8b9dc3]">Average Gas</div>
          <div className="text-lg font-semibold text-[#00bfff]">
            {Math.round(data.summary.averageGas).toLocaleString()}
          </div>
        </div>
        <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-3">
          <div className="text-xs text-[#8b9dc3]">Success Rate</div>
          <div className="text-lg font-semibold text-green-400">
            {(data.summary.successRate * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={data.data}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,191,255,0.1)" />
          <XAxis
            dataKey="operation"
            stroke="#8b9dc3"
            fontSize={12}
            tick={{ fill: "#8b9dc3" }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            yAxisId="left"
            stroke="#8b9dc3"
            fontSize={12}
            tick={{ fill: "#8b9dc3" }}
            tickFormatter={(value) => value.toLocaleString()}
          />
          {showCumulative && (
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#8b9dc3"
              fontSize={12}
              tick={{ fill: "#8b9dc3" }}
              tickFormatter={(value) => value.toLocaleString()}
            />
          )}
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ color: "#8b9dc3" }}
            iconType="rect"
            formatter={(value) => (
              <span style={{ color: "#8b9dc3" }}>{value}</span>
            )}
          />
          <Bar
            yAxisId="left"
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
          {showCumulative && (
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cumulativeGas"
              stroke="#8b9dc3"
              strokeWidth={2}
              name="Cumulative Gas"
              dot={{ fill: "#8b9dc3", strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: "#00bfff" }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BatchAnalyticsChart;
