import { memo, useCallback, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge, Button } from "@/components/global";
import type { ParsedTransferLog } from "@/lib/eventlogs";
import { formatPyusdValue } from "@/lib/eventlogs";
import { TrendingUp, Clock, Activity, BarChart3 } from "lucide-react";

interface EnhancedVolumeTimelineChartProps {
  transfers: ParsedTransferLog[];
  height?: number;
  className?: string;
}

interface TimeSeriesPoint {
  timestamp: number;
  datetime: string;
  volume: number;
  transferCount: number;
  uniqueParticipants: number;
  avgTransferSize: number;
  maxTransfer: number;
  minTransfer: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as TimeSeriesPoint;
    return (
      <div className="bg-[rgba(15,20,25,0.95)] border border-[rgba(0,191,255,0.3)] rounded-lg p-4 shadow-xl backdrop-blur-sm">
        <p className="text-[#00bfff] font-semibold text-sm mb-3">
          {data.datetime}
        </p>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[#8b9dc3] text-xs">Volume:</span>
            <span className="text-[#00bfff] text-xs font-bold">
              {formatPyusdValue(data.volume)} PYUSD
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#8b9dc3] text-xs">Transfers:</span>
            <span className="text-[#10b981] text-xs">{data.transferCount}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#8b9dc3] text-xs">Participants:</span>
            <span className="text-[#f59e0b] text-xs">
              {data.uniqueParticipants}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#8b9dc3] text-xs">Avg Size:</span>
            <span className="text-[#8b5cf6] text-xs">
              {formatPyusdValue(data.avgTransferSize)} PYUSD
            </span>
          </div>
          <div className="border-t border-[rgba(0,191,255,0.1)] pt-2 mt-2">
            <div className="flex justify-between items-center">
              <span className="text-[#8b9dc3] text-xs">Range:</span>
              <span className="text-white text-xs">
                {formatPyusdValue(data.minTransfer)} -{" "}
                {formatPyusdValue(data.maxTransfer)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const EnhancedVolumeTimelineChart = memo(
  function EnhancedVolumeTimelineChart({
    transfers,
    height = 400,
    className = "",
  }: EnhancedVolumeTimelineChartProps) {
    const [aggregation, setAggregation] = useState<"hour" | "day">("hour");
    const [chartType, setChartType] = useState<"line" | "area">("area");
    const [metric, setMetric] = useState<
      "volume" | "transferCount" | "uniqueParticipants"
    >("volume");

    const timeSeriesData = useMemo(() => {
      if (!transfers || transfers.length === 0) return [];

      const timestampedTransfers = transfers.filter(
        (t) => t.timestamp && t.datetime
      );
      if (timestampedTransfers.length === 0) return [];

      const groupedData = new Map<
        string,
        {
          timestamp: number;
          transfers: ParsedTransferLog[];
          participants: Set<string>;
        }
      >();

      timestampedTransfers.forEach((transfer) => {
        const date = new Date(transfer.datetime!);
        let periodKey: string;

        switch (aggregation) {
          case "hour":
            date.setMinutes(0, 0, 0);
            periodKey = date.toISOString();
            break;
          case "day":
            date.setHours(0, 0, 0, 0);
            periodKey = date.toISOString();
            break;
          default:
            date.setMinutes(0, 0, 0);
            periodKey = date.toISOString();
        }

        if (!groupedData.has(periodKey)) {
          groupedData.set(periodKey, {
            timestamp: date.getTime(),
            transfers: [],
            participants: new Set(),
          });
        }

        const group = groupedData.get(periodKey)!;
        group.transfers.push(transfer);
        group.participants.add(transfer.from);
        group.participants.add(transfer.to);
      });

      return Array.from(groupedData.entries())
        .map(([, group]) => {
          const volume = group.transfers.reduce(
            (sum, t) => sum + t.value_pyusd,
            0
          );
          const transferValues = group.transfers.map((t) => t.value_pyusd);

          return {
            timestamp: group.timestamp,
            datetime: new Date(group.timestamp).toLocaleString(),
            volume,
            transferCount: group.transfers.length,
            uniqueParticipants: group.participants.size,
            avgTransferSize: volume / group.transfers.length,
            maxTransfer: Math.max(...transferValues),
            minTransfer: Math.min(...transferValues),
          };
        })
        .sort((a, b) => a.timestamp - b.timestamp);
    }, [transfers, aggregation]);

    const stats = useMemo(() => {
      if (timeSeriesData.length === 0) return null;

      const totalVolume = timeSeriesData.reduce(
        (sum, point) => sum + point.volume,
        0
      );
      const totalTransfers = timeSeriesData.reduce(
        (sum, point) => sum + point.transferCount,
        0
      );
      const avgVolumePerPeriod = totalVolume / timeSeriesData.length;
      const maxVolumePoint = timeSeriesData.reduce((max, point) =>
        point.volume > max.volume ? point : max
      );
      const minVolumePoint = timeSeriesData.reduce((min, point) =>
        point.volume < min.volume ? point : min
      );

      // Calculate trend
      const volumes = timeSeriesData.map((d) => d.volume);
      const n = volumes.length;
      if (n < 2) return null;

      const x = volumes.map((_, i) => i);
      const y = volumes;
      const sumX = x.reduce((sum, val) => sum + val, 0);
      const sumY = y.reduce((sum, val) => sum + val, 0);
      const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
      const sumXX = x.reduce((sum, val) => sum + val * val, 0);

      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      const trend =
        slope > 0.01 ? "increasing" : slope < -0.01 ? "decreasing" : "stable";

      return {
        totalVolume,
        totalTransfers,
        avgVolumePerPeriod,
        maxVolumePoint,
        minVolumePoint,
        trend,
        dataPoints: timeSeriesData.length,
      };
    }, [timeSeriesData]);

    const getMetricValue = useCallback(
      (point: TimeSeriesPoint) => {
        switch (metric) {
          case "volume":
            return point.volume;
          case "transferCount":
            return point.transferCount;
          case "uniqueParticipants":
            return point.uniqueParticipants;
          default:
            return point.volume;
        }
      },
      [metric]
    );

    const formatMetricValue = useCallback(
      (value: number) => {
        switch (metric) {
          case "volume":
            return formatPyusdValue(value);
          case "transferCount":
          case "uniqueParticipants":
            return value.toString();
          default:
            return formatPyusdValue(value);
        }
      },
      [metric]
    );

    if (!transfers || transfers.length === 0) {
      return (
        <div
          className={`flex items-center justify-center ${className}`}
          style={{ height }}
        >
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
              <TrendingUp className="h-8 w-8 text-[#00bfff]" />
            </div>
            <p className="text-[#8b9dc3] text-sm">
              No timestamp data available
            </p>
          </div>
        </div>
      );
    }

    if (timeSeriesData.length === 0) {
      return (
        <div
          className={`flex items-center justify-center ${className}`}
          style={{ height }}
        >
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(255,193,7,0.1)] rounded-full flex items-center justify-center">
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
            <p className="text-[#8b9dc3] text-sm">
              No transfers with timestamp data found
            </p>
          </div>
        </div>
      );
    }

    const ChartComponent = chartType === "area" ? AreaChart : LineChart;

    return (
      <div className={className}>
        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-[#00bfff]" />
            <h3 className="text-lg font-semibold text-[#00bfff]">
              Volume Timeline
            </h3>
            <Badge
              variant="outline"
              className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
            >
              {timeSeriesData.length} periods
            </Badge>
            {stats && (
              <Badge
                variant="outline"
                className={`border-[rgba(0,191,255,0.3)] ${
                  stats.trend === "increasing"
                    ? "text-green-400 bg-green-500/10"
                    : stats.trend === "decreasing"
                      ? "text-red-400 bg-red-500/10"
                      : "text-yellow-400 bg-yellow-500/10"
                }`}
              >
                {stats.trend === "increasing"
                  ? "↗"
                  : stats.trend === "decreasing"
                    ? "↘"
                    : "→"}{" "}
                {stats.trend}
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-1">
              {["hour", "day"].map((agg) => (
                <Button
                  key={agg}
                  variant={aggregation === agg ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAggregation(agg as any)}
                  className={
                    aggregation === agg
                      ? "bg-[#00bfff] text-[#0f1419]"
                      : "border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                  }
                >
                  {agg.charAt(0).toUpperCase() + agg.slice(1)}
                </Button>
              ))}
            </div>

            <div className="flex gap-1">
              <Button
                variant={metric === "volume" ? "default" : "outline"}
                size="sm"
                onClick={() => setMetric("volume")}
                className={
                  metric === "volume"
                    ? "bg-[#00bfff] text-[#0f1419]"
                    : "border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                }
              >
                Volume
              </Button>
              <Button
                variant={metric === "transferCount" ? "default" : "outline"}
                size="sm"
                onClick={() => setMetric("transferCount")}
                className={
                  metric === "transferCount"
                    ? "bg-[#00bfff] text-[#0f1419]"
                    : "border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                }
              >
                Count
              </Button>
              <Button
                variant={
                  metric === "uniqueParticipants" ? "default" : "outline"
                }
                size="sm"
                onClick={() => setMetric("uniqueParticipants")}
                className={
                  metric === "uniqueParticipants"
                    ? "bg-[#00bfff] text-[#0f1419]"
                    : "border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                }
              >
                Participants
              </Button>
            </div>

            <div className="flex gap-1">
              <Button
                variant={chartType === "line" ? "default" : "outline"}
                size="sm"
                onClick={() => setChartType("line")}
                className={
                  chartType === "line"
                    ? "bg-[#00bfff] text-[#0f1419]"
                    : "border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                }
              >
                Line
              </Button>
              <Button
                variant={chartType === "area" ? "default" : "outline"}
                size="sm"
                onClick={() => setChartType("area")}
                className={
                  chartType === "area"
                    ? "bg-[#00bfff] text-[#0f1419]"
                    : "border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                }
              >
                Area
              </Button>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-4 mb-6">
          <ResponsiveContainer width="100%" height={height}>
            <ChartComponent
              data={timeSeriesData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(0,191,255,0.1)"
              />
              <XAxis
                dataKey="datetime"
                stroke="#8b9dc3"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return aggregation === "hour"
                    ? date.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : date.toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                      });
                }}
              />
              <YAxis
                stroke="#8b9dc3"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatMetricValue}
              />
              <Tooltip content={<CustomTooltip />} />
              {chartType === "area" ? (
                <Area
                  type="monotone"
                  dataKey={metric}
                  stroke="#00bfff"
                  strokeWidth={2}
                  fill="url(#colorGradient)"
                  fillOpacity={0.3}
                />
              ) : (
                <Line
                  type="monotone"
                  dataKey={metric}
                  stroke="#00bfff"
                  strokeWidth={2}
                  dot={{ fill: "#00bfff", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: "#00bfff", strokeWidth: 2 }}
                />
              )}
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00bfff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00bfff" stopOpacity={0.05} />
                </linearGradient>
              </defs>
            </ChartComponent>
          </ResponsiveContainer>
        </div>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-[rgba(15,20,25,0.8)] rounded-lg border border-[rgba(0,191,255,0.1)]">
              <div className="text-xl font-bold text-[#00bfff] mb-1">
                {formatPyusdValue(stats.totalVolume)}
              </div>
              <div className="text-sm text-[#8b9dc3]">Total Volume</div>
            </div>
            <div className="text-center p-4 bg-[rgba(15,20,25,0.8)] rounded-lg border border-[rgba(0,191,255,0.1)]">
              <div className="text-xl font-bold text-[#10b981] mb-1">
                {stats.totalTransfers}
              </div>
              <div className="text-sm text-[#8b9dc3]">Total Transfers</div>
            </div>
            <div className="text-center p-4 bg-[rgba(15,20,25,0.8)] rounded-lg border border-[rgba(0,191,255,0.1)]">
              <div className="text-xl font-bold text-[#f59e0b] mb-1">
                {formatPyusdValue(stats.avgVolumePerPeriod)}
              </div>
              <div className="text-sm text-[#8b9dc3]">
                Avg per {aggregation}
              </div>
            </div>
            <div className="text-center p-4 bg-[rgba(15,20,25,0.8)] rounded-lg border border-[rgba(0,191,255,0.1)]">
              <div className="text-xl font-bold text-[#8b5cf6] mb-1">
                {formatPyusdValue(stats.maxVolumePoint.volume)}
              </div>
              <div className="text-sm text-[#8b9dc3]">Peak Volume</div>
            </div>
          </div>
        )}
      </div>
    );
  }
);
