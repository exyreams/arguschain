import React from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { ComplexityDistributionData } from "@/lib/bytecode/types";

interface ComplexityDistributionChartProps {
  data: ComplexityDistributionData[];
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: ComplexityDistributionData;
    value: number;
  }>;
}

interface LegendsProps {
  payload?: Array<{
    value: string;
    color: string;
    payload: ComplexityDistributionData;
  }>;
}

export const ComplexityDistributionChart: React.FC<
  ComplexityDistributionChartProps
> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-[#8b9dc3]">
        No complexity distribution data available
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: TooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[rgba(15,20,25,0.95)] border border-[rgba(0,191,255,0.3)] rounded-lg p-3 shadow-lg">
          <p className="text-[#00bfff] font-semibold">
            {data.complexityLevel} Complexity
          </p>
          <p className="text-[#8b9dc3]">Contracts: {data.count}</p>
          <div className="mt-2">
            <p className="text-[#8b9dc3] text-sm">Contracts:</p>
            {data.contracts
              .slice(0, 3)
              .map((contract: string, index: number) => (
                <p key={index} className="text-[#00bfff] text-xs font-mono">
                  • {contract}
                </p>
              ))}
            {data.contracts.length > 3 && (
              <p className="text-[#8b9dc3] text-xs">
                ... and {data.contracts.length - 3} more
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: LegendsProps) => {
    return (
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {payload?.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-[#8b9dc3] text-sm">
              {entry.value} (
              {data.find((d) => d.complexityLevel === entry.value)?.count || 0})
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
