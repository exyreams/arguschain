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
import type { ProxyRelationshipData } from "@/lib/bytecode/types";

interface ProxyRelationshipDiagramProps {
  data: ProxyRelationshipData[];
}

interface ChartDataPoint {
  name: string;
  size: number;
  type: string;
  relationship: string;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: ChartDataPoint;
    value: number;
  }>;
}

export const ProxyRelationshipDiagram: React.FC<
  ProxyRelationshipDiagramProps
> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-[#8b9dc3]">
        No proxy relationships found
      </div>
    );
  }

  const chartData: ChartDataPoint[] = data.flatMap((relationship) => [
    {
      name: relationship.proxyName,
      size: relationship.proxySize,
      type: "Proxy",
      relationship: relationship.relationship,
    },
    {
      name: relationship.implementationName,
      size: relationship.implementationSize,
      type: "Implementation",
      relationship: relationship.relationship,
    },
  ]);

  const getBarColor = (type: string): string => {
    return type === "Proxy" ? "#f59e0b" : "#3b82f6";
  };

  const CustomTooltip = ({ active, payload }: TooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[rgba(15,20,25,0.95)] border border-[rgba(0,191,255,0.3)] rounded-lg p-3 shadow-lg">
          <p className="text-[#00bfff] font-semibold">{data.name}</p>
          <p className="text-[#8b9dc3]">Type: {data.type}</p>
          <p className="text-[#8b9dc3]">Size: {formatBytes(data.size)}</p>
          <p className="text-[#8b9dc3] text-sm mt-1">{data.relationship}</p>
        </div>
      );
    }
    return null;
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes}B`;
    return `${(bytes / 1024).toFixed(1)}KB`;
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {data.map((relationship, index) => (
          <div
            key={index}
            className="p-3 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(25,28,40,0.6)]"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[#00bfff] font-semibold">
                  Proxy → Implementation Relationship
                </p>
                <p className="text-[#8b9dc3] text-sm">
                  {relationship.relationship}
                </p>
              </div>
              <div className="text-right text-sm">
                <p className="text-[#8b9dc3]">
                  Proxy: {formatBytes(relationship.proxySize)}
                </p>
                <p className="text-[#8b9dc3]">
                  Implementation: {formatBytes(relationship.implementationSize)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(139,157,195,0.1)"
            />
            <XAxis
              dataKey="name"
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
              radius={[4, 4, 0, 0]}
              stroke="rgba(0,191,255,0.3)"
              strokeWidth={1}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.type)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
