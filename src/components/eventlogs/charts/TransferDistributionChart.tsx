import { useMemo, useState, useCallback } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import { Badge, Button, Dropdown } from "@/components/global";
import type { ParsedTransferLog } from "@/lib/eventlogs";
import { formatPyusdValue } from "@/lib/eventlogs";
import { Eye, EyeOff, TrendingUp, Zap, Target } from "lucide-react";

interface TransferDistributionChartProps {
  transfers: ParsedTransferLog[];
  height?: number | string;
  className?: string;
  onRangeSelect?: (min: number, max: number) => void;
  hideTitle?: boolean;
}

interface DistributionBucket {
  range: string;
  min: number;
  max: number;
  count: number;
  percentage: number;
  avgValue: number;
  isOutlier?: boolean;
  density: number;
}

const ModernTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as DistributionBucket;
    return (
      <div className="bg-gradient-to-br from-[#0a0f1c] to-[#1a1f2e] border border-[#00d4ff]/30 rounded-xl p-4 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-[#00d4ff] to-[#0099cc]"></div>
          <p className="text-[#00d4ff] font-semibold text-sm">{label}</p>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[#8b9dc3] text-xs">Range:</span>
            <span className="text-white text-xs font-mono bg-[#00d4ff]/10 px-2 py-1 rounded">
              {formatPyusdValue(data.min)} - {formatPyusdValue(data.max)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#8b9dc3] text-xs">Transfers:</span>
            <span className="text-[#00d4ff] text-xs font-bold">
              {data.count.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#8b9dc3] text-xs">Percentage:</span>
            <span className="text-[#10b981] text-xs font-semibold">
              {data.percentage.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#8b9dc3] text-xs">Avg Value:</span>
            <span className="text-[#f59e0b] text-xs font-semibold">
              {formatPyusdValue(data.avgValue)}
            </span>
          </div>
          {data.isOutlier && (
            <div className="mt-2 px-2 py-1 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded border border-orange-500/30">
              <span className="text-orange-400 text-xs font-medium">
                ⚡ High Value Range
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export function TransferDistributionChart({
  transfers,
  height = 400,
  className = "",
  onRangeSelect,
  hideTitle = false,
}: TransferDistributionChartProps) {
  const [bucketCount, setBucketCount] = useState(20);
  const [showOutliers, setShowOutliers] = useState(true);
  const [displayMode, setDisplayMode] = useState<"count" | "percentage">(
    "count"
  );
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);

  const distributionData = useMemo(() => {
    if (!transfers || transfers.length === 0) return [];

    const values = transfers
      .map((t) => t.value_pyusd)
      .filter((v) => v > 0)
      .sort((a, b) => a - b);

    if (values.length === 0) return [];

    const minValue = values[0];
    const maxValue = values[values.length - 1];

    // Calculate quartiles for outlier detection
    const q1Index = Math.floor(values.length * 0.25);
    const q3Index = Math.floor(values.length * 0.75);
    const q1 = values[q1Index];
    const q3 = values[q3Index];
    const iqr = q3 - q1;
    const outlierThreshold = q3 + 1.5 * iqr;

    if (minValue === maxValue) {
      return [
        {
          range: formatPyusdValue(minValue),
          min: minValue,
          max: maxValue,
          count: values.length,
          percentage: 100,
          avgValue: minValue,
          isOutlier: false,
          density: 1,
        },
      ];
    }

    const buckets: DistributionBucket[] = [];
    const bucketSize = (maxValue - minValue) / bucketCount;

    for (let i = 0; i < bucketCount; i++) {
      const bucketMin = minValue + i * bucketSize;
      const bucketMax =
        i === bucketCount - 1 ? maxValue : minValue + (i + 1) * bucketSize;

      const bucketValues = values.filter(
        (v) => v >= bucketMin && v <= bucketMax
      );
      const count = bucketValues.length;

      if (count > 0) {
        const percentage = (count / values.length) * 100;
        const isOutlier = bucketMin > outlierThreshold;
        const avgValue =
          bucketValues.reduce((sum, val) => sum + val, 0) / count;
        const density = count / bucketSize;

        const range = `${formatPyusdValue(bucketMin)}-${formatPyusdValue(bucketMax)}`;
        buckets.push({
          range,
          min: bucketMin,
          max: bucketMax,
          count,
          percentage,
          avgValue,
          isOutlier,
          density,
        });
      }
    }

    return buckets;
  }, [transfers, bucketCount]);

  const chartData = useMemo(() => {
    let filtered = distributionData;
    if (!showOutliers) {
      filtered = filtered.filter((bucket) => !bucket.isOutlier);
    }
    return filtered;
  }, [distributionData, showOutliers]);

  const stats = useMemo(() => {
    if (!transfers || transfers.length === 0) return null;

    const values = transfers.map((t) => t.value_pyusd).sort((a, b) => a - b);
    const total = values.reduce((sum, val) => sum + val, 0);
    const mean = total / values.length;
    const median = values[Math.floor(values.length / 2)];

    const q1 = values[Math.floor(values.length * 0.25)];
    const q3 = values[Math.floor(values.length * 0.75)];
    const iqr = q3 - q1;
    const outlierThreshold = q3 + 1.5 * iqr;
    const outlierCount = values.filter((v) => v > outlierThreshold).length;

    return {
      mean,
      median,
      min: values[0],
      max: values[values.length - 1],
      q1,
      q3,
      outlierCount,
      outlierPercentage: (outlierCount / values.length) * 100,
      totalVolume: total,
    };
  }, [transfers]);

  const handleBucketClick = useCallback(
    (data: DistributionBucket) => {
      const bucketId = data.range;
      setSelectedBucket(selectedBucket === bucketId ? null : bucketId);
      if (onRangeSelect) {
        onRangeSelect(data.min, data.max);
      }
    },
    [selectedBucket, onRangeSelect]
  );

  const getBarColor = (entry: DistributionBucket, index: number) => {
    if (selectedBucket === entry.range) {
      return "#10b981";
    }
    if (entry.isOutlier) {
      return "#f59e0b";
    }
    return "#00bfff";
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
          <p className="text-[#8b9dc3] text-lg font-medium">No Transfer Data</p>
          <p className="text-[#6b7280] text-sm mt-2">
            Upload transfer data to see distribution analysis
          </p>
        </div>
      </div>
    );
  }

  try {
    return (
      <div className={className}>
        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <Badge className="bg-gradient-to-r from-[#00d4ff]/20 to-[#0099cc]/20 text-[#00d4ff] border-[#00d4ff]/30 px-3 py-1">
            {transfers.length.toLocaleString()} transfers
          </Badge>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#8b9dc3] font-medium">
                Buckets:
              </span>
              <Dropdown
                value={bucketCount.toString()}
                onValueChange={(value) => setBucketCount(Number(value))}
                options={[
                  { value: "10", label: "10" },
                  { value: "15", label: "15" },
                  { value: "20", label: "20" },
                  { value: "25", label: "25" },
                  { value: "30", label: "30" },
                ]}
                className="min-w-[80px]"
              />
            </div>

            <div className="flex gap-1 bg-[#0a0f1c] rounded-lg p-1 border border-[#00d4ff]/20">
              <Button
                variant={displayMode === "count" ? "default" : "ghost"}
                size="sm"
                onClick={() => setDisplayMode("count")}
                className={
                  displayMode === "count"
                    ? "bg-gradient-to-r from-[#00d4ff] to-[#0099cc] text-white shadow-lg"
                    : "text-[#8b9dc3] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"
                }
              >
                Count
              </Button>
              <Button
                variant={displayMode === "percentage" ? "default" : "ghost"}
                size="sm"
                onClick={() => setDisplayMode("percentage")}
                className={
                  displayMode === "percentage"
                    ? "bg-gradient-to-r from-[#00d4ff] to-[#0099cc] text-white shadow-lg"
                    : "text-[#8b9dc3] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"
                }
              >
                Percentage
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowOutliers(!showOutliers)}
              className={`border-[#00d4ff]/30 transition-all ${
                showOutliers
                  ? "bg-[#00d4ff]/10 text-[#00d4ff] border-[#00d4ff]"
                  : "text-[#8b9dc3] hover:text-[#00d4ff] hover:bg-[#00d4ff]/10"
              }`}
            >
              {showOutliers ? (
                <Eye className="h-4 w-4 mr-2" />
              ) : (
                <EyeOff className="h-4 w-4 mr-2" />
              )}
              Outliers
            </Button>
          </div>
        </div>

        {/* Chart Container */}
        <div
          data-chart-container="true"
          className="bg-gradient-to-br from-[#0a0f1c] to-[#1a1f2e] border border-[#00d4ff]/20 rounded-2xl p-6 mb-8 shadow-2xl"
          style={{
            height: typeof height === "string" ? height : `${height}px`,
            minHeight: "400px",
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              onClick={(data) => {
                if (data && data.activePayload && data.activePayload[0]) {
                  handleBucketClick(data.activePayload[0].payload);
                }
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#00d4ff"
                strokeOpacity={0.1}
              />

              <XAxis
                dataKey="range"
                stroke="#8b9dc3"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
              />

              <YAxis
                stroke="#8b9dc3"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) =>
                  displayMode === "percentage"
                    ? `${value.toFixed(1)}%`
                    : value.toLocaleString()
                }
              />

              <Tooltip content={<ModernTooltip />} />

              {stats && (
                <ReferenceLine
                  y={
                    displayMode === "percentage"
                      ? (stats.mean / stats.totalVolume) * 100
                      : undefined
                  }
                  stroke="#10b981"
                  strokeDasharray="5 5"
                  strokeOpacity={0.7}
                  label={{
                    value: "Mean",
                    position: "topRight",
                    fill: "#10b981",
                  }}
                />
              )}

              <Bar
                dataKey={displayMode === "percentage" ? "percentage" : "count"}
                radius={[6, 6, 0, 0]}
                cursor="pointer"
                stroke="#00d4ff"
                strokeWidth={selectedBucket ? 2 : 0}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getBarColor(entry, index)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Statistics Grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="border border-[rgba(0,191,255,0.1)] rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-[#10b981] mb-1">
                {formatPyusdValue(stats.mean)}
              </div>
              <div className="text-sm text-[#8b9dc3]">Mean Value</div>
            </div>

            <div className="border border-[rgba(0,191,255,0.1)] rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-[#f59e0b] mb-1">
                {formatPyusdValue(stats.median)}
              </div>
              <div className="text-sm text-[#8b9dc3]">Median Value</div>
            </div>

            <div className="border border-[rgba(0,191,255,0.1)] rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-[#8b5cf6] mb-1">
                {formatPyusdValue(stats.max)}
              </div>
              <div className="text-sm text-[#8b9dc3]">Max Value</div>
            </div>

            <div className="border border-[rgba(0,191,255,0.1)] rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-[#f97316] mb-1">
                {stats.outlierCount}
              </div>
              <div className="text-sm text-[#8b9dc3]">
                Outliers ({stats.outlierPercentage.toFixed(1)}%)
              </div>
            </div>
          </div>
        )}

        {/* Selected Range Info */}
        {selectedBucket && (
          <div className="bg-gradient-to-r from-[#10b981]/10 to-[#059669]/10 border border-[#10b981]/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-[#10b981]"></div>
                <h4 className="text-sm font-semibold text-[#10b981]">
                  Selected Range: {selectedBucket}
                </h4>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedBucket(null)}
                className="border-red-500/50 text-red-400 hover:bg-red-500/10"
              >
                Clear Selection
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error("TransferDistributionChart error:", error);
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-2xl flex items-center justify-center">
            <div className="w-10 h-10 bg-red-500 rounded-full opacity-50"></div>
          </div>
          <p className="text-red-400 text-lg font-medium">
            Chart Rendering Error
          </p>
          <p className="text-[#6b7280] text-sm mt-2">
            Unable to render the chart with the current data
          </p>
          <p className="text-[#6b7280] text-xs mt-1">
            This might be due to insufficient data or data format issues
          </p>
        </div>
      </div>
    );
  }
}
