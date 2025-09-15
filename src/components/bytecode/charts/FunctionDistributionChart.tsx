import React from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { FunctionDistributionData } from "@/lib/bytecode/types";

interface FunctionDistributionChartProps {
  data: FunctionDistributionData[];
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: FunctionDistributionData;
    value: number;
  }>;
}

interface LegendProps {
  payload?: Array<{
    value: string;
    color: string;
    payload: FunctionDistributionData;
  }>;
}

export const FunctionDistributionChart: React.FC<
  FunctionDistributionChartProps
> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-[#8b9dc3]">
        No function distribution data available
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: TooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[rgba(15,20,25,0.95)] border border-[rgba(0,191,255,0.3)] rounded-lg p-3 shadow-lg">
          <p className="text-[#00bfff] font-semibold">{data.category}</p>
          <p className="text-[#8b9dc3]">
            Functions: {data.count} ({data.percentage.toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: LegendProps) => {
    return (
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-[#8b9dc3] text-sm">
              {entry.value} (
              {data.find((d) => d.category === entry.value)?.count || 0})
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="40%"
            outerRadius={80}
            innerRadius={40}
            paddingAngle={2}
            dataKey="count"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
