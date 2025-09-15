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
import type { StandardsComplianceData } from "@/lib/bytecode/types";

interface StandardsComplianceChartProps {
  data: StandardsComplianceData[];
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: StandardsComplianceData;
    value: number;
  }>;
}

export const StandardsComplianceChart: React.FC<
  StandardsComplianceChartProps
> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-[#8b9dc3]">
        No standards compliance data available
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: TooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[rgba(15,20,25,0.95)] border border-[rgba(0,191,255,0.3)] rounded-lg p-3 shadow-lg">
          <p className="text-[#00bfff] font-semibold">
            {data.standard} Standard
          </p>
          <p className="text-[#8b9dc3]">
            Compliant Contracts: {data.compliantContracts} /{" "}
            {data.totalContracts}
          </p>
          <p className="text-[#00bfff]">
            Compliance Rate: {data.percentage.toFixed(1)}%
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
          <XAxis dataKey="standard" stroke="#8b9dc3" fontSize={12} />
          <YAxis
            stroke="#8b9dc3"
            fontSize={12}
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="percentage"
            radius={[4, 4, 0, 0]}
            stroke="rgba(0,191,255,0.3)"
            strokeWidth={1}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
