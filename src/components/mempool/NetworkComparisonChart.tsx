import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ResponsiveChart } from "@/components/debugtrace/ResponsiveChart";
import type { NetworkConditions } from "@/lib/mempool/types";

interface NetworkComparisonChartProps {
  networks: NetworkConditions[];
  height?: number;
  showLegend?: boolean;
  className?: string;
}

export const NetworkComparisonChart: React.FC<NetworkComparisonChartProps> = ({
  networks,
  height = 400,
  showLegend = true,
  className,
}) => {
  const chartData = networks.map((network) => ({
    network: network.network.charAt(0).toUpperCase() + network.network.slice(1),
    pending: network.txPoolStatus.pending,
    queued: network.txPoolStatus.queued,
    congestionLevel: network.congestionAnalysis.level,
    congestionColor: network.congestionAnalysis.color,
    congestionFactor: network.congestionAnalysis.factor,
    baseFee: network.baseFee,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;

      return (
        <div className="bg-[rgba(25,28,40,0.95)] border border-[rgba(0,191,255,0.3)] rounded-lg p-4 shadow-lg">
          <p className="text-[#00bfff] font-semibold mb-2">{label} Network</p>

          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-[#8b9dc3]">Pending:</span>
              <span className="text-[#00bfff] font-medium">
                {data.pending.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-[#8b9dc3]">Queued:</span>
              <span className="text-blue-300 font-medium">
                {data.queued.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-[#8b9dc3]">Total:</span>
              <span className="text-white font-medium">
                {(data.pending + data.queued).toLocaleString()}
              </span>
            </div>

            <div className="border-t border-[rgba(0,191,255,0.2)] pt-2 mt-2">
              <div className="flex justify-between gap-4">
                <span className="text-[#8b9dc3]">Congestion:</span>
                <span
                  className="font-medium capitalize"
                  style={{ color: data.congestionColor }}
                >
                  {data.congestionLevel}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-[#8b9dc3]">Base Fee:</span>
                <span className="text-[#00bfff] font-medium">
                  {data.baseFee.toFixed(2)} Gwei
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const CustomBar = (props: any) => {
    const { payload, x, y, width, height } = props;

    if (!payload) return null;

    const indicatorY = y - 8;
    const indicatorSize = 6;

    return (
      <g>
        <rect x={x} y={y} width={width} height={height} fill={props.fill} />

        <circle
          cx={x + width / 2}
          cy={indicatorY}
          r={indicatorSize}
          fill={payload.congestionColor}
          stroke="rgba(255,255,255,0.3)"
          strokeWidth={1}
        />
      </g>
    );
  };

  if (networks.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <p className="text-[#8b9dc3]">
          No network data available for comparison
        </p>
      </div>
    );
  }

  return (
    <ResponsiveChart className={className}>
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer>
          <BarChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(139, 157, 195, 0.1)"
            />

            <XAxis
              dataKey="network"
              tick={{ fill: "#8b9dc3", fontSize: 12 }}
              axisLine={{ stroke: "rgba(139, 157, 195, 0.3)" }}
            />

            <YAxis
              tick={{ fill: "#8b9dc3", fontSize: 12 }}
              axisLine={{ stroke: "rgba(139, 157, 195, 0.3)" }}
              tickFormatter={(value) => {
                if (value >= 1000) {
                  return `${(value / 1000).toFixed(1)}k`;
                }
                return value.toString();
              }}
            />

            <Tooltip content={<CustomTooltip />} />

            {showLegend && (
              <Legend
                wrapperStyle={{
                  color: "#8b9dc3",
                  fontSize: "12px",
                  paddingTop: "20px",
                }}
              />
            )}

            <Bar
              dataKey="pending"
              name="Pending Transactions"
              fill="#00bfff"
              radius={[0, 0, 4, 4]}
            />

            <Bar
              dataKey="queued"
              name="Queued Transactions"
              fill="rgba(0, 191, 255, 0.6)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex items-center justify-center gap-6 text-xs text-[#8b9dc3]">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#22c55e]" />
          <span>Low Congestion</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#eab308]" />
          <span>Moderate</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#f97316]" />
          <span>High</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#ef4444]" />
          <span>Extreme</span>
        </div>
      </div>
    </ResponsiveChart>
  );
};
