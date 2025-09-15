import React, { useCallback, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AccessibleLogsChart } from "../AccessibleLogsChart";
import { VirtualizedChart } from "@/components/debugtrace/VirtualizedChart";
import { Badge } from "@/components/global/Badge";
import { Button } from "@/components/global/Button";
import type { ParsedTransferLog } from "@/lib/eventlogs";
import { formatPyusdValue } from "@/lib/eventlogs";
import { Accessibility, BarChart3, Eye, EyeOff } from "lucide-react";

interface AccessibleTransferDistributionChartProps {
  transfers: ParsedTransferLog[];
  height?: number;
  className?: string;
  enableVirtualization?: boolean;
  virtualizationThreshold?: number;
}

interface DistributionBucket {
  range: string;
  min: number;
  max: number;
  count: number;
  percentage: number;
  cumulativePercentage: number;
  isOutlier?: boolean;
}

const AccessibleTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as DistributionBucket;
    return (
      <div
        className="bg-[rgba(25,28,40,0.95)] border border-[rgba(0,191,255,0.3)] rounded-lg p-3 shadow-lg"
        role="tooltip"
        aria-live="polite"
      >
        <p className="text-[#00bfff] font-medium" id="tooltip-title">
          {label}
        </p>
        <div className="space-y-1 mt-2" aria-labelledby="tooltip-title">
          <p className="text-white text-sm">
            Range: {formatPyusdValue(data.min)} - {formatPyusdValue(data.max)}{" "}
            PYUSD
          </p>
          <p className="text-white text-sm">
            Transfers: {data.count.toLocaleString()}
          </p>
          <p className="text-white text-sm">
            Percentage: {data.percentage.toFixed(2)}%
          </p>
          <p className="text-white text-sm">
            Cumulative: {data.cumulativePercentage.toFixed(2)}%
          </p>
          {data.isOutlier && (
            <Badge variant="destructive" className="text-xs mt-1">
              Outlier
            </Badge>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export function AccessibleTransferDistributionChart({
  transfers,
  height = 400,
  className = "",
  enableVirtualization = true,
  virtualizationThreshold = 1000,
}: AccessibleTransferDistributionChartProps) {
  const [showOutliers, setShowOutliers] = useState(true);
  const [selectedRange, setSelectedRange] = useState<[number, number] | null>(
    null,
  );
  const [focusedBucket, setFocusedBucket] = useState<number>(-1);

  const distributionData = useMemo((): DistributionBucket[] => {
    if (transfers.length === 0) return [];

    const values = transfers
      .map((t) => parseFloat(t.value))
      .filter((v) => !isNaN(v))
      .sort((a, b) => a - b);

    if (values.length === 0) return [];

    const q1Index = Math.floor(values.length * 0.25);
    const q3Index = Math.floor(values.length * 0.75);
    const q1 = values[q1Index];
    const q3 = values[q3Index];
    const iqr = q3 - q1;
    const outlierThreshold = q3 + 1.5 * iqr;

    const minValue = Math.max(values[0], 0.01);
    const maxValue = values[values.length - 1];
    const bucketCount = Math.min(
      20,
      Math.max(5, Math.floor(Math.sqrt(values.length))),
    );

    const buckets: DistributionBucket[] = [];
    const logMin = Math.log10(minValue);
    const logMax = Math.log10(maxValue);
    const logStep = (logMax - logMin) / bucketCount;

    for (let i = 0; i < bucketCount; i++) {
      const logStart = logMin + i * logStep;
      const logEnd = logMin + (i + 1) * logStep;
      const bucketMin = Math.pow(10, logStart);
      const bucketMax = Math.pow(10, logEnd);

      const count = values.filter(
        (v) => v >= bucketMin && v < bucketMax,
      ).length;
      const percentage = (count / values.length) * 100;
      const cumulativeCount = values.filter((v) => v < bucketMax).length;
      const cumulativePercentage = (cumulativeCount / values.length) * 100;

      const isOutlier = bucketMin > outlierThreshold;

      buckets.push({
        range: `${formatPyusdValue(bucketMin)} - ${formatPyusdValue(bucketMax)}`,
        min: bucketMin,
        max: bucketMax,
        count,
        percentage,
        cumulativePercentage,
        isOutlier,
      });
    }

    return buckets.filter((b) => b.count > 0);
  }, [transfers]);

  const filteredData = useMemo(() => {
    let data = distributionData;

    if (!showOutliers) {
      data = data.filter((bucket) => !bucket.isOutlier);
    }

    if (selectedRange) {
      data = data.filter(
        (bucket) =>
          bucket.min >= selectedRange[0] && bucket.max <= selectedRange[1],
      );
    }

    return data;
  }, [distributionData, showOutliers, selectedRange]);

  const chartComponent = useMemo(
    () => (
      <div className="relative">
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={filteredData}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            role="img"
            aria-label="Transfer distribution histogram"
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(0,191,255,0.1)"
              aria-hidden="true"
            />
            <XAxis
              dataKey="range"
              angle={-45}
              textAnchor="end"
              height={80}
              tick={{ fontSize: 12, fill: "#8b9dc3" }}
              stroke="#8b9dc3"
              aria-label="Transfer value ranges"
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#8b9dc3" }}
              stroke="#8b9dc3"
              aria-label="Number of transfers"
            />
            <Tooltip
              content={<AccessibleTooltip />}
              cursor={{ fill: "rgba(0,191,255,0.1)" }}
            />
            <Bar
              dataKey="count"
              fill="rgba(0,191,255,0.6)"
              stroke="rgba(0,191,255,0.8)"
              strokeWidth={1}
              radius={[2, 2, 0, 0]}
              aria-label="Transfer count bars"
            />

            <ReferenceLine
              y={Math.max(...filteredData.map((d) => d.count)) * 0.5}
              stroke="rgba(255,193,7,0.6)"
              strokeDasharray="5 5"
              label={{ value: "Median", position: "topRight", fill: "#ffc107" }}
            />
          </BarChart>
        </ResponsiveContainer>

        {focusedBucket >= 0 && focusedBucket < filteredData.length && (
          <div
            className="absolute top-4 right-4 bg-[rgba(0,191,255,0.9)] text-white px-3 py-2 rounded-lg text-sm"
            role="status"
            aria-live="polite"
          >
            Focused: {filteredData[focusedBucket].range}
            <br />
            Count: {filteredData[focusedBucket].count}
          </div>
        )}
      </div>
    ),
    [filteredData, height, focusedBucket],
  );

  const chartDescription = useMemo(() => {
    const totalTransfers = transfers.length;
    const totalBuckets = filteredData.length;
    const maxCount = Math.max(...filteredData.map((d) => d.count));
    const maxBucket = filteredData.find((d) => d.count === maxCount);

    let description = `Histogram showing the distribution of ${totalTransfers} PYUSD transfers across ${totalBuckets} value ranges. `;

    if (maxBucket) {
      description += `The most common range is ${maxBucket.range} with ${maxCount} transfers (${maxBucket.percentage.toFixed(1)}%). `;
    }

    const outlierCount = distributionData.filter((d) => d.isOutlier).length;
    if (outlierCount > 0) {
      description += `${outlierCount} ranges contain outlier values. `;
    }

    return description;
  }, [transfers.length, filteredData, distributionData]);

  const getRowData = useCallback(
    (bucket: DistributionBucket) => [
      bucket.range,
      bucket.count.toLocaleString(),
      `${bucket.percentage.toFixed(2)}%`,
      `${bucket.cumulativePercentage.toFixed(2)}%`,
      bucket.isOutlier ? "Yes" : "No",
    ],
    [],
  );

  const dataHeaders = [
    "Value Range",
    "Count",
    "Percentage",
    "Cumulative %",
    "Outlier",
  ];

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          setFocusedBucket((prev) => Math.max(0, prev - 1));
          break;
        case "ArrowRight":
          event.preventDefault();
          setFocusedBucket((prev) =>
            Math.min(filteredData.length - 1, prev + 1),
          );
          break;
        case "Home":
          event.preventDefault();
          setFocusedBucket(0);
          break;
        case "End":
          event.preventDefault();
          setFocusedBucket(filteredData.length - 1);
          break;
      }
    },
    [filteredData.length],
  );

  const renderControls = () => (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-[#00bfff]" />
        <span className="text-sm font-medium text-[#e2e8f0]">
          Transfer Distribution
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={() => setShowOutliers(!showOutliers)}
          variant="outline"
          size="sm"
          className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
          aria-pressed={showOutliers}
        >
          {showOutliers ? (
            <Eye className="h-3 w-3 mr-1" />
          ) : (
            <EyeOff className="h-3 w-3 mr-1" />
          )}
          {showOutliers ? "Hide" : "Show"} Outliers
        </Button>

        <Badge variant="secondary" className="text-xs">
          {filteredData.length} ranges
        </Badge>

        <Badge
          variant="outline"
          className="text-xs border-[rgba(0,191,255,0.3)] text-[#00bfff]"
        >
          <Accessibility className="h-3 w-3 mr-1" />
          Accessible
        </Badge>
      </div>
    </div>
  );

  const renderChart = useCallback(() => {
    if (enableVirtualization && filteredData.length > virtualizationThreshold) {
      return (
        <VirtualizedChart
          data={filteredData}
          renderChart={() => chartComponent}
          itemHeight={height}
          containerHeight={height + 100}
          threshold={virtualizationThreshold}
          className="border border-[rgba(0,191,255,0.2)] rounded-lg"
        />
      );
    }

    return chartComponent;
  }, [
    enableVirtualization,
    filteredData.length,
    virtualizationThreshold,
    chartComponent,
    height,
  ]);

  return (
    <div className={`space-y-4 ${className}`}>
      {renderControls()}

      <AccessibleLogsChart
        data={filteredData}
        chartComponent={
          <div
            onKeyDown={handleKeyDown}
            tabIndex={0}
            className="focus:outline-none focus:ring-2 focus:ring-[rgba(0,191,255,0.5)] rounded"
          >
            {renderChart()}
          </div>
        }
        title="Transfer Distribution Analysis"
        description={chartDescription}
        chartType="distribution"
        transfers={transfers}
        className={className}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div className="bg-[rgba(15,20,25,0.5)] p-3 rounded border border-[rgba(0,191,255,0.1)]">
          <div className="text-lg font-semibold text-[#00bfff]">
            {transfers.length.toLocaleString()}
          </div>
          <div className="text-xs text-[#8b9dc3]">Total Transfers</div>
        </div>
        <div className="bg-[rgba(15,20,25,0.5)] p-3 rounded border border-[rgba(0,191,255,0.1)]">
          <div className="text-lg font-semibold text-[#00bfff]">
            {filteredData.length}
          </div>
          <div className="text-xs text-[#8b9dc3]">Value Ranges</div>
        </div>
        <div className="bg-[rgba(15,20,25,0.5)] p-3 rounded border border-[rgba(0,191,255,0.1)]">
          <div className="text-lg font-semibold text-[#00bfff]">
            {distributionData.filter((d) => d.isOutlier).length}
          </div>
          <div className="text-xs text-[#8b9dc3]">Outlier Ranges</div>
        </div>
        <div className="bg-[rgba(15,20,25,0.5)] p-3 rounded border border-[rgba(0,191,255,0.1)]">
          <div className="text-lg font-semibold text-[#00bfff]">
            {Math.max(...filteredData.map((d) => d.count)).toLocaleString()}
          </div>
          <div className="text-xs text-[#8b9dc3]">Peak Count</div>
        </div>
      </div>
    </div>
  );
}
