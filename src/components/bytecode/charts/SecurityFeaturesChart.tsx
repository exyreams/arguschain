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
import type { SecurityFeaturesData } from "@/lib/bytecode/types";

interface SecurityFeaturesChartProps {
  data: SecurityFeaturesData[];
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: SecurityFeaturesData;
    value: number;
  }>;
}

export const SecurityFeaturesChart: React.FC<SecurityFeaturesChartProps> = ({
  data,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-[#8b9dc3]">
        No security features data available
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: TooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[rgba(15,20,25,0.95)] border border-[rgba(0,191,255,0.3)] rounded-lg p-3 shadow-lg">
          <p className="text-[#00bfff] font-semibold">{data.feature}</p>
          <p className="text-[#8b9dc3]">
            Contracts: {data.count} ({data.percentage.toFixed(1)}%)
          </p>
          <div className="mt-2">
            <p className="text-[#8b9dc3] text-sm">Found in:</p>
            {data.contractsWithFeature
              .slice(0, 3)
              .map((contract: string, index: number) => (
                <p key={index} className="text-[#00bfff] text-xs font-mono">
                  • {contract}
                </p>
              ))}
            {data.contractsWithFeature.length > 3 && (
              <p className="text-[#8b9dc3] text-xs">
                ... and {data.contractsWithFeature.length - 3} more
              </p>
            )}
          </div>
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
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,157,195,0.1)" />
          <XAxis
            dataKey="feature"
            stroke="#8b9dc3"
            fontSize={12}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis stroke="#8b9dc3" fontSize={12} />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="count"
            fill="#ef4444"
            radius={[4, 4, 0, 0]}
            stroke="rgba(239,68,68,0.3)"
            strokeWidth={1}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
