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
  ReferenceLine,
  Dot,
} from "recharts";
import { Badge, Button } from "@/components/global";
import type { ParsedTransferLog } from "@/lib/eventlogs";
import { formatPyusdValue } from "@/lib/eventlogs";
import { Activity, Users, Zap, Target, BarChart3 } from "lucide-react";

interface VolumeTimelineChartProps {
  transfers: ParsedTransferLog[];
  height?: number | string;
  className?: string;
  onPeakDetected?: (peaks: TimeSeriesPoint[]) => void;
  hideTitle?: boolean;
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
  isPeak?: boolean;
  trend?: "up" | "down" | "stable";
  volatility?: number;
}

const ModernTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as TimeSeriesPoint;
    return (
      <div className="bg-gradient-to-br from-[#0a0f1c] to-[#1a1f2e] border border-[#00d4ff]/30 rounded-xl p-4 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-4 h-4 bg-[#00d4ff] rounded-full opacity-70"></div>
          <p className="text-[#00d4ff] font-semibold text-sm">
            {data.datetime}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[#8b9dc3] text-xs">Volume:</span>
              <span className="text-[#00d4ff] text-xs font-bold">
                {formatPyusdValue(data.volume)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#8b9dc3] text-xs">Transfers:</span>
              <span className="text-[#10b981] text-xs font-semibold">
                {data.transferCount}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#8b9dc3] text-xs">Participants:</span>
              <span className="text-[#f59e0b] text-xs font-semibold">
                {data.uniqueParticipants}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[#8b9dc3] text-xs">Avg Size:</span>
              <span className="text-[#8b5cf6] text-xs font-semibold">
                {formatPyusdValue(data.avgTransferSize)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#8b9dc3] text-xs">Range:</span>
              <span className="text-white text-xs">
                {formatPyusdValue(data.minTransfer)} -{" "}
                {formatPyusdValue(data.maxTransfer)}
              </span>
            </div>
            {data.trend && (
              <div className="flex justify-between items-center">
                <span className="text-[#8b9dc3] text-xs">Trend:</span>
                <span
                  className={`text-xs font-semibold ${
                    data.trend === "up"
                      ? "text-green-400"
                      : data.trend === "down"
                        ? "text-red-400"
                        : "text-yellow-400"
                  }`}
                >
                  {data.trend.toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>
        {data.isPeak && (
          <div className="mt-3 px-3 py-1 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg border border-yellow-500/30">
            <span className="text-yellow-400 text-xs font-medium">
              🚀 Peak Activity Period
            </span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (payload?.isPeak) {
    return (
      <Dot
        cx={cx}
        cy={cy}
        r={6}
        fill="url(#peakGradient)"
        stroke="#fbbf24"
        strokeWidth={2}
      />
    );
  }
  return null;
};

export const VolumeTimelineChart = memo(function VolumeTimelineChart({
  transfers,
  height = 400,
  className = "",
  onPeakDetected,
  hideTitle = false,
}: VolumeTimelineChartProps) {
  const [aggregation, setAggregation] = useState<"minute" | "hour" | "day">(
    "hour"
  );
  const [chartType, setChartType] = useState<"line" | "area">("area");
  const [metric, setMetric] = useState<
    "volume" | "transferCount" | "uniqueParticipants"
  >("volume");
  const [showPeaks, setShowPeaks] = useState(true);

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
        case "minute":
          date.setSeconds(0, 0);
          periodKey = date.toISOString();
          break;
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

    const baseData: TimeSeriesPoint[] = Array.from(groupedData.entries())
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

    // Enhanced analysis
    const volumes = baseData.map((d) => d.volume);
    const mean = volumes.reduce((sum, val) => sum + val, 0) / volumes.length;
    const std = Math.sqrt(
      volumes.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
        volumes.length
    );

    const enhancedData = baseData.map((point, index) => {
      // Peak detection
      const isPeak = point.volume > mean + 1.5 * std;

      // Trend calculation
      let trend: "up" | "down" | "stable" = "stable";
      if (index >= 2) {
        const recent = volumes.slice(index - 2, index + 1);
        const slope = (recent[2] - recent[0]) / 2;
        const threshold = std * 0.1;
        trend =
          slope > threshold ? "up" : slope < -threshold ? "down" : "stable";
      }

      // Volatility
      const volatility = std > 0 ? Math.abs(point.volume - mean) / std : 0;

      return {
        ...point,
        isPeak,
        trend,
        volatility,
      };
    });

    return enhancedData;
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

    const peaks = timeSeriesData.filter((point) => point.isPeak);
    const avgVolatility =
      timeSeriesData.reduce((sum, point) => sum + (point.volatility || 0), 0) /
      timeSeriesData.length;

    return {
      totalVolume,
      totalTransfers,
      avgVolumePerPeriod,
      maxVolumePoint,
      minVolumePoint,
      dataPoints: timeSeriesData.length,
      peaks: peaks.length,
      avgVolatility,
      timeRange: {
        start: new Date(timeSeriesData[0].timestamp).toLocaleDateString(),
        end: new Date(
          timeSeriesData[timeSeriesData.length - 1].timestamp
        ).toLocaleDateString(),
      },
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
          return value.toLocaleString();
        default:
          return formatPyusdValue(value);
      }
    },
    [metric]
  );

  const getMetricColor = () => {
    switch (metric) {
      case "volume":
        return "#00d4ff";
      case "transferCount":
        return "#10b981";
      case "uniqueParticipants":
        return "#f59e0b";
      default:
        return "#00d4ff";
    }
  };

  if (!transfers || transfers.length === 0) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-[#00d4ff]/20 to-[#0099cc]/20 rounded-2xl flex items-center justify-center">
            <div className="w-10 h-10 bg-[#00d4ff] rounded-full opacity-50"></div>
          </div>
          <p className="text-[#8b9dc3] text-lg font-medium">No Timeline Data</p>
          <p className="text-[#6b7280] text-sm mt-2">
            Transfer data with timestamps required
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
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-2xl flex items-center justify-center">
            <div className="w-10 h-10 bg-yellow-400 rounded-full opacity-50"></div>
          </div>
          <p className="text-[#8b9dc3] text-lg font-medium">
            No Timestamp Data
          </p>
          <p className="text-[#6b7280] text-sm mt-2">
            Enable timestamp fetching to see timeline analysis
          </p>
        </div>
      </div>
    );
  }

  const ChartComponent = chartType === "area" ? AreaChart : LineChart;
  const DataComponent = chartType === "area" ? Area : Line;

  return (
    <div className={className}>
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <Badge className="bg-gradient-to-r from-[#00d4ff]/20 to-[#0099cc]/20 text-[#00d4ff] border-[#00d4ff]/30 px-3 py-1">
          {timeSeriesData.length} periods
        </Badge>

        <div className="flex flex-wrap items-center gap-3">
          {/* Time Aggregation */}
          <div className="flex gap-1 bg-[#0a0f1c] rounded-lg p-1 border border-[#00d4ff]/20">
            {["minute", "hour", "day"].map((agg) => (
              <Button
                key={agg}
                variant={aggregation === agg ? "default" : "ghost"}
                size="sm"
                onClick={() => setAggregation(agg as any)}
                className={
                  aggregation === agg
                    ? "bg-gradient-to-r from-[#00d4ff] to-[#0099cc] text-white shadow-lg"
                    : "text-[#8b9dc3] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"
                }
              >
                {agg.charAt(0).toUpperCase() + agg.slice(1)}
              </Button>
            ))}
          </div>

          {/* Metric Selection */}
          <div className="flex gap-1 bg-[#0a0f1c] rounded-lg p-1 border border-[#00d4ff]/20">
            <Button
              variant={metric === "volume" ? "default" : "ghost"}
              size="sm"
              onClick={() => setMetric("volume")}
              className={
                metric === "volume"
                  ? "bg-gradient-to-r from-[#00d4ff] to-[#0099cc] text-white shadow-lg"
                  : "text-[#8b9dc3] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"
              }
            >
              <BarChart3 className="h-4 w-4 mr-1" />
              Volume
            </Button>
            <Button
              variant={metric === "transferCount" ? "default" : "ghost"}
              size="sm"
              onClick={() => setMetric("transferCount")}
              className={
                metric === "transferCount"
                  ? "bg-gradient-to-r from-[#10b981] to-[#059669] text-white shadow-lg"
                  : "text-[#8b9dc3] hover:text-[#10b981] hover:bg-[#10b981]/10"
              }
            >
              <Activity className="h-4 w-4 mr-1" />
              Count
            </Button>
            <Button
              variant={metric === "uniqueParticipants" ? "default" : "ghost"}
              size="sm"
              onClick={() => setMetric("uniqueParticipants")}
              className={
                metric === "uniqueParticipants"
                  ? "bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-white shadow-lg"
                  : "text-[#8b9dc3] hover:text-[#f59e0b] hover:bg-[#f59e0b]/10"
              }
            >
              <Users className="h-4 w-4 mr-1" />
              Participants
            </Button>
          </div>

          {/* Chart Type */}
          <div className="flex gap-1 bg-[#0a0f1c] rounded-lg p-1 border border-[#00d4ff]/20">
            <Button
              variant={chartType === "line" ? "default" : "ghost"}
              size="sm"
              onClick={() => setChartType("line")}
              className={
                chartType === "line"
                  ? "bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white shadow-lg"
                  : "text-[#8b9dc3] hover:text-[#8b5cf6] hover:bg-[#8b5cf6]/10"
              }
            >
              Line
            </Button>
            <Button
              variant={chartType === "area" ? "default" : "ghost"}
              size="sm"
              onClick={() => setChartType("area")}
              className={
                chartType === "area"
                  ? "bg-gradient-to-r from-[#8b5cf6] to-[#7c3aed] text-white shadow-lg"
                  : "text-[#8b9dc3] hover:text-[#8b5cf6] hover:bg-[#8b5cf6]/10"
              }
            >
              Area
            </Button>
          </div>

          {/* Peak Detection Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPeaks(!showPeaks)}
            className={`border-[#fbbf24]/30 transition-all ${
              showPeaks
                ? "bg-[#fbbf24]/10 text-[#fbbf24] border-[#fbbf24]"
                : "text-[#8b9dc3] hover:text-[#fbbf24] hover:bg-[#fbbf24]/10"
            }`}
          >
            <Zap className="h-4 w-4 mr-2" />
            Peaks
          </Button>
        </div>
      </div>

      {/* Chart Container */}
      <div
        className="bg-gradient-to-br from-[#0a0f1c] to-[#1a1f2e] border border-[#00d4ff]/20 rounded-2xl p-6 mb-8 shadow-2xl"
        style={{
          height: typeof height === "string" ? height : `${height}px`,
          minHeight: "400px",
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ChartComponent
            data={timeSeriesData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={getMetricColor()}
                  stopOpacity={0.3}
                />
                <stop
                  offset="100%"
                  stopColor={getMetricColor()}
                  stopOpacity={0.05}
                />
              </linearGradient>
              <linearGradient id="peakGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.7} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#00d4ff"
              strokeOpacity={0.1}
            />

            <XAxis
              dataKey="datetime"
              stroke="#8b9dc3"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => {
                const date = new Date(value);
                switch (aggregation) {
                  case "minute":
                    return date.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                  case "hour":
                    return date.toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                    });
                  case "day":
                    return date.toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                    });
                  default:
                    return date.toLocaleDateString();
                }
              }}
            />

            <YAxis
              stroke="#8b9dc3"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatMetricValue}
            />

            <Tooltip content={<ModernTooltip />} />

            {stats && (
              <ReferenceLine
                y={stats.avgVolumePerPeriod}
                stroke="#10b981"
                strokeDasharray="5 5"
                strokeOpacity={0.7}
                label={{
                  value: "Average",
                  position: "top",
                  fill: "#10b981",
                }}
              />
            )}

            <DataComponent
              type="monotone"
              dataKey={metric}
              stroke={getMetricColor()}
              strokeWidth={3}
              fill={chartType === "area" ? "url(#areaGradient)" : undefined}
              fillOpacity={chartType === "area" ? 1 : undefined}
              dot={showPeaks ? <CustomDot /> : false}
              activeDot={{
                r: 6,
                stroke: getMetricColor(),
                strokeWidth: 2,
                fill: "#ffffff",
                filter: "drop-shadow(0 0 6px rgba(0, 212, 255, 0.6))",
              }}
            />
          </ChartComponent>
        </ResponsiveContainer>
      </div>

      {/* Statistics Grid */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="border border-[rgba(0,191,255,0.1)] rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-[#00d4ff] mb-1">
              {formatPyusdValue(stats.totalVolume)}
            </div>
            <div className="text-sm text-[#8b9dc3]">Total Volume</div>
          </div>

          <div className="border border-[rgba(0,191,255,0.1)] rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-[#10b981] mb-1">
              {stats.totalTransfers.toLocaleString()}
            </div>
            <div className="text-sm text-[#8b9dc3]">Total Transfers</div>
          </div>

          <div className="border border-[rgba(0,191,255,0.1)] rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-[#f59e0b] mb-1">
              {formatPyusdValue(stats.maxVolumePoint.volume)}
            </div>
            <div className="text-sm text-[#8b9dc3]">Peak Volume</div>
          </div>

          <div className="border border-[rgba(0,191,255,0.1)] rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-[#fbbf24] mb-1">
              {stats.peaks}
            </div>
            <div className="text-sm text-[#8b9dc3]">Peak Periods</div>
          </div>
        </div>
      )}
    </div>
  );
});
