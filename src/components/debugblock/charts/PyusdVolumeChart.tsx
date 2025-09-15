import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PyusdTransfer } from "@/lib/debugblock/types";
import { shortenAddress } from "@/lib/config";
import { ArrowUpDown, DollarSign, TrendingUp, Users } from "lucide-react";

interface PyusdVolumeChartProps {
  transfers: PyusdTransfer[];
  height?: number;
  className?: string;
}

interface VolumeDataPoint {
  index: number;
  cumulativeVolume: number;
  transferValue: number;
  from: string;
  to: string;
  hash: string;
}

interface VolumeRange {
  range: string;
  count: number;
  totalVolume: number;
  color: string;
}

interface PieTooltipProps {
  payload: VolumeRange;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: VolumeDataPoint;
  }>;
  label?: string | number;
}

const CustomTooltip = ({ active, payload }: TooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[rgba(25,28,40,0.95)] border border-[rgba(0,191,255,0.3)] rounded-lg p-3 shadow-lg">
        <p className="text-[#00bfff] font-medium">Transfer #{data.index}</p>
        <div className="space-y-1 mt-2">
          <p className="text-white text-sm">
            Value:{" "}
            <span className="text-[#10b981]">
              {(data.transferValue / 1e6).toFixed(2)} PYUSD
            </span>
          </p>
          <p className="text-white text-sm">
            Cumulative:{" "}
            <span className="text-[#00bfff]">
              {(data.cumulativeVolume / 1e6).toFixed(2)} PYUSD
            </span>
          </p>
          <p className="text-white text-sm">
            From:{" "}
            <span className="text-[#8b9dc3] font-mono">
              {shortenAddress(data.from)}
            </span>
          </p>
          <p className="text-white text-sm">
            To:{" "}
            <span className="text-[#8b9dc3] font-mono">
              {shortenAddress(data.to)}
            </span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export function PyusdVolumeChart({
  transfers,
  height = 400,
  className = "",
}: PyusdVolumeChartProps) {
  const [chartType, setChartType] = useState<"cumulative" | "distribution">(
    "cumulative",
  );

  if (!transfers || transfers.length === 0) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
            <DollarSign className="h-8 w-8 text-[#00bfff]" />
          </div>
          <p className="text-[#8b9dc3] text-sm">
            No PYUSD transfer data available
          </p>
        </div>
      </div>
    );
  }

  const volumeData: VolumeDataPoint[] = transfers
    .sort((a, b) => a.value - b.value)
    .reduce((acc, transfer, index) => {
      const cumulativeVolume =
        (acc[index - 1]?.cumulativeVolume || 0) + transfer.value;
      acc.push({
        index: index + 1,
        cumulativeVolume,
        transferValue: transfer.value,
        from: transfer.from,
        to: transfer.to,
        hash: transfer.tx_hash,
      });
      return acc;
    }, [] as VolumeDataPoint[]);

  const createVolumeDistribution = (): VolumeRange[] => {
    const ranges = [
      { min: 0, max: 100 * 1e6, label: "< $100", color: "#6b7280" },
      {
        min: 100 * 1e6,
        max: 1000 * 1e6,
        label: "$100 - $1K",
        color: "#3b82f6",
      },
      {
        min: 1000 * 1e6,
        max: 10000 * 1e6,
        label: "$1K - $10K",
        color: "#10b981",
      },
      {
        min: 10000 * 1e6,
        max: 100000 * 1e6,
        label: "$10K - $100K",
        color: "#f59e0b",
      },
      { min: 100000 * 1e6, max: Infinity, label: "> $100K", color: "#ef4444" },
    ];

    return ranges
      .map((range) => {
        const transfersInRange = transfers.filter(
          (t) => t.value >= range.min && t.value < range.max,
        );
        const totalVolume = transfersInRange.reduce(
          (sum, t) => sum + t.value,
          0,
        );

        return {
          range: range.label,
          count: transfersInRange.length,
          totalVolume,
          color: range.color,
        };
      })
      .filter((range) => range.count > 0);
  };

  const distributionData = createVolumeDistribution();

  const totalVolume = transfers.reduce((sum, t) => sum + t.value, 0);
  const averageTransfer = totalVolume / transfers.length;
  const medianTransfer =
    transfers.sort((a, b) => a.value - b.value)[
      Math.floor(transfers.length / 2)
    ]?.value || 0;
  const largestTransfer = Math.max(...transfers.map((t) => t.value));
  const smallestTransfer = Math.min(...transfers.map((t) => t.value));

  const getTopParticipants = (type: "senders" | "receivers") => {
    const participantMap = new Map<string, { volume: number; count: number }>();

    transfers.forEach((transfer) => {
      const address = type === "senders" ? transfer.from : transfer.to;
      const current = participantMap.get(address) || { volume: 0, count: 0 };
      current.volume += transfer.value;
      current.count += 1;
      participantMap.set(address, current);
    });

    return Array.from(participantMap.entries())
      .map(([address, data]) => ({ address, ...data }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 5);
  };

  const topSenders = getTopParticipants("senders");
  const topReceivers = getTopParticipants("receivers");

  const renderChart = () => {
    switch (chartType) {
      case "cumulative":
        return (
          <ResponsiveContainer width="100%" height={height - 150}>
            <AreaChart
              data={volumeData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(0,191,255,0.1)"
              />
              <XAxis
                dataKey="index"
                stroke="#8b9dc3"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#8b9dc3"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${(value / 1e6).toFixed(0)}K`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="cumulativeVolume"
                stroke="#00bfff"
                strokeWidth={2}
                fill="url(#volumeGradient)"
                animationDuration={1000}
              />
              <defs>
                <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00bfff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00bfff" stopOpacity={0.05} />
                </linearGradient>
              </defs>
            </AreaChart>
          </ResponsiveContainer>
        );

      case "distribution":
        return (
          <div className="flex justify-center">
            <ResponsiveContainer width="60%" height={height - 150}>
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={2}
                  dataKey="count"
                  animationDuration={1000}
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(
                    value: number,
                    _name: string,
                    props: PieTooltipProps,
                  ) => [`${value} transfers`, props.payload.range]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold text-[#00bfff]">
            PYUSD Volume Analysis
          </h3>
          <p className="text-sm text-[#8b9dc3]">
            {transfers.length} transfers • {(totalVolume / 1e6).toFixed(2)}{" "}
            PYUSD total volume
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setChartType("cumulative")}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              chartType === "cumulative"
                ? "bg-[rgba(0,191,255,0.2)] text-[#00bfff] border border-[rgba(0,191,255,0.3)]"
                : "bg-[rgba(15,20,25,0.8)] text-[#8b9dc3] border border-[rgba(0,191,255,0.3)] hover:bg-[rgba(0,191,255,0.1)]"
            }`}
          >
            <TrendingUp className="h-4 w-4 inline mr-1" />
            Cumulative
          </button>
          <button
            onClick={() => setChartType("distribution")}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              chartType === "distribution"
                ? "bg-[rgba(0,191,255,0.2)] text-[#00bfff] border border-[rgba(0,191,255,0.3)]"
                : "bg-[rgba(15,20,25,0.8)] text-[#8b9dc3] border border-[rgba(0,191,255,0.3)] hover:bg-[rgba(0,191,255,0.1)]"
            }`}
          >
            <ArrowUpDown className="h-4 w-4 inline mr-1" />
            Distribution
          </button>
        </div>
      </div>

      <div className="mb-6">{renderChart()}</div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[rgba(15,20,25,0.6)] rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-[#10b981]">
            {(totalVolume / 1e6).toFixed(2)}
          </div>
          <div className="text-sm text-[#8b9dc3]">Total Volume</div>
          <div className="text-xs text-[#6b7280]">PYUSD</div>
        </div>
        <div className="bg-[rgba(15,20,25,0.6)] rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-[#00bfff]">
            {(averageTransfer / 1e6).toFixed(2)}
          </div>
          <div className="text-sm text-[#8b9dc3]">Average Transfer</div>
          <div className="text-xs text-[#6b7280]">PYUSD</div>
        </div>
        <div className="bg-[rgba(15,20,25,0.6)] rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-[#f59e0b]">
            {(largestTransfer / 1e6).toFixed(2)}
          </div>
          <div className="text-sm text-[#8b9dc3]">Largest Transfer</div>
          <div className="text-xs text-[#6b7280]">PYUSD</div>
        </div>
        <div className="bg-[rgba(15,20,25,0.6)] rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-[#6b7280]">
            {" "}
            {(smallestTransfer / 1e6).toFixed(2)}
          </div>
          <div className="text-sm text-[#8b9dc3]">Smallest Transfer</div>
          <div className="text-xs text-[#6b7280]">PYUSD</div>
        </div>
        <div className="bg-[rgba(15,20,25,0.6)] rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-[#8b5cf6]">
            {(medianTransfer / 1e6).toFixed(2)}
          </div>
          <div className="text-sm text-[#8b9dc3]">Median Transfer</div>
          <div className="text-xs text-[#6b7280]">PYUSD</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[rgba(15,20,25,0.6)] rounded-lg p-4">
          <h4 className="text-sm font-medium text-[#ef4444] mb-3 flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4" />
            Top Senders
          </h4>
          <div className="space-y-2">
            {topSenders.map((sender, index) => (
              <div
                key={sender.address}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[#00bfff] font-bold">#{index + 1}</span>
                  <span className="text-[#8b9dc3] font-mono">
                    {shortenAddress(sender.address)}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-[#10b981] font-medium">
                    {(sender.volume / 1e6).toFixed(2)}
                  </div>
                  <div className="text-xs text-[#6b7280]">
                    {sender.count} transfers
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[rgba(15,20,25,0.6)] rounded-lg p-4">
          <h4 className="text-sm font-medium text-[#10b981] mb-3 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Top Receivers
          </h4>
          <div className="space-y-2">
            {topReceivers.map((receiver, index) => (
              <div
                key={receiver.address}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[#00bfff] font-bold">#{index + 1}</span>
                  <span className="text-[#8b9dc3] font-mono">
                    {shortenAddress(receiver.address)}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-[#10b981] font-medium">
                    {(receiver.volume / 1e6).toFixed(2)}
                  </div>
                  <div className="text-xs text-[#6b7280]">
                    {receiver.count} transfers
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {chartType === "distribution" && (
        <div className="mt-6 flex justify-center">
          <div className="bg-[rgba(15,20,25,0.6)] rounded-lg p-4">
            <div className="grid grid-cols-3 gap-4 text-xs">
              {distributionData.map((range) => (
                <div key={range.range} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: range.color }}
                  />
                  <div>
                    <div className="text-[#8b9dc3]">{range.range}</div>
                    <div className="text-[#6b7280]">
                      {range.count} transfers
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
