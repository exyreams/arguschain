import React, { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  BarChart3,
  Clock,
  Eye,
  EyeOff,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { formatGas } from "@/lib/config";

interface TimelineDataPoint {
  index: number;
  gasUsed: number;
  cumulativeGas: number;
  category: string;
  success: boolean;
  efficiency: number;
}

interface TransactionTimelineChartProps {
  data: TimelineDataPoint[];
  height?: number;
  className?: string;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: TimelineDataPoint;
    value: number;
  }>;
}

interface ScatterShapeProps {
  cx: number;
  cy: number;
  payload: TimelineDataPoint;
}

const CustomTooltip = ({ active, payload }: TooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[rgba(25,28,40,0.95)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.3)] rounded-lg p-4 shadow-lg">
        <p className="text-[#00bfff] font-medium mb-2">
          Transaction #{data.index + 1}
        </p>
        <div className="space-y-1">
          <div className="flex justify-between gap-4">
            <span className="text-[#8b9dc3] text-sm">Gas Used:</span>
            <span className="text-[#00bfff] font-mono text-sm">
              {formatGas(data.gasUsed)}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[#8b9dc3] text-sm">Cumulative:</span>
            <span className="text-[#8b5cf6] font-mono text-sm">
              {formatGas(data.cumulativeGas)}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[#8b9dc3] text-sm">Category:</span>
            <span className="text-[#f59e0b] text-sm capitalize">
              {data.category.replace(/_/g, " ")}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[#8b9dc3] text-sm">Status:</span>
            <span
              className={`text-sm ${data.success ? "text-[#10b981]" : "text-[#ef4444]"}`}
            >
              {data.success ? "Success" : "Failed"}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[#8b9dc3] text-sm">Efficiency:</span>
            <span
              className={`text-sm ${data.efficiency >= 80 ? "text-[#10b981]" : data.efficiency >= 60 ? "text-[#f59e0b]" : "text-[#ef4444]"}`}
            >
              {data.efficiency.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function TransactionTimelineChart({
  data,
  height = 400,
  className = "",
}: TransactionTimelineChartProps) {
  const [viewMode, setViewMode] = useState<
    "gas" | "cumulative" | "efficiency" | "scatter"
  >("gas");
  const [showFailures, setShowFailures] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredData = useMemo(() => {
    let filtered = data;

    if (!showFailures) {
      filtered = filtered.filter((item) => item.success);
    }

    if (selectedCategory) {
      filtered = filtered.filter((item) => item.category === selectedCategory);
    }

    return filtered;
  }, [data, showFailures, selectedCategory]);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(data.map((item) => item.category)));
    return cats.map((cat) => ({
      name: cat,
      count: data.filter((item) => item.category === cat).length,
      color: getCategoryColor(cat),
    }));
  }, [data]);

  const stats = useMemo(() => {
    const totalGas = filteredData.reduce((sum, item) => sum + item.gasUsed, 0);
    const avgGas = filteredData.length > 0 ? totalGas / filteredData.length : 0;
    const maxGas = Math.max(...filteredData.map((item) => item.gasUsed));
    const minGas = Math.min(...filteredData.map((item) => item.gasUsed));
    const successRate =
      filteredData.length > 0
        ? (filteredData.filter((item) => item.success).length /
            filteredData.length) *
          100
        : 0;

    return { totalGas, avgGas, maxGas, minGas, successRate };
  }, [filteredData]);

  function getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      eth_transfer: "#00bfff",
      contract_call: "#10b981",
      pyusd_transaction: "#8b5cf6",
      token_transfer: "#f59e0b",
      contract_creation: "#ef4444",
      defi_interaction: "#06b6d4",
      other: "#6b7280",
    };
    return colors[category] || "#6b7280";
  }

  if (!data || data.length === 0) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
            <Clock className="h-8 w-8 text-[rgba(0,191,255,0.3)]" />
          </div>
          <p className="text-[#8b9dc3] text-sm">No timeline data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-[#00bfff]" />
          <h3 className="text-lg font-semibold text-[#00bfff]">
            Transaction Timeline
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)] rounded-lg p-1">
            <button
              onClick={() => setViewMode("gas")}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                viewMode === "gas"
                  ? "bg-[rgba(0,191,255,0.2)] text-[#00bfff]"
                  : "text-[#8b9dc3] hover:text-[#00bfff]"
              }`}
            >
              <Zap className="h-3 w-3 mr-1 inline" />
              Gas
            </button>
            <button
              onClick={() => setViewMode("cumulative")}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                viewMode === "cumulative"
                  ? "bg-[rgba(0,191,255,0.2)] text-[#00bfff]"
                  : "text-[#8b9dc3] hover:text-[#00bfff]"
              }`}
            >
              <TrendingUp className="h-3 w-3 mr-1 inline" />
              Cumulative
            </button>
            <button
              onClick={() => setViewMode("efficiency")}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                viewMode === "efficiency"
                  ? "bg-[rgba(0,191,255,0.2)] text-[#00bfff]"
                  : "text-[#8b9dc3] hover:text-[#00bfff]"
              }`}
            >
              <Target className="h-3 w-3 mr-1 inline" />
              Efficiency
            </button>
            <button
              onClick={() => setViewMode("scatter")}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                viewMode === "scatter"
                  ? "bg-[rgba(0,191,255,0.2)] text-[#00bfff]"
                  : "text-[#8b9dc3] hover:text-[#00bfff]"
              }`}
            >
              <BarChart3 className="h-3 w-3 mr-1 inline" />
              Scatter
            </button>
          </div>

          <button
            onClick={() => setShowFailures(!showFailures)}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg border text-xs transition-colors ${
              showFailures
                ? "bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.2)] text-[#ef4444]"
                : "bg-[rgba(15,20,25,0.6)] border-[rgba(0,191,255,0.1)] text-[#8b9dc3]"
            }`}
          >
            {showFailures ? (
              <Eye className="h-3 w-3" />
            ) : (
              <EyeOff className="h-3 w-3" />
            )}
            Failures
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-3 py-1 rounded-lg border text-xs transition-colors ${
            selectedCategory === null
              ? "bg-[rgba(0,191,255,0.2)] border-[rgba(0,191,255,0.3)] text-[#00bfff]"
              : "bg-[rgba(15,20,25,0.6)] border-[rgba(0,191,255,0.1)] text-[#8b9dc3] hover:border-[rgba(0,191,255,0.3)]"
          }`}
        >
          All Categories
        </button>
        {categories.map((cat) => (
          <button
            key={cat.name}
            onClick={() => setSelectedCategory(cat.name)}
            className={`flex items-center gap-2 px-3 py-1 rounded-lg border text-xs transition-colors ${
              selectedCategory === cat.name
                ? "bg-[rgba(0,191,255,0.2)] border-[rgba(0,191,255,0.3)] text-[#00bfff]"
                : "bg-[rgba(15,20,25,0.6)] border-[rgba(0,191,255,0.1)] text-[#8b9dc3] hover:border-[rgba(0,191,255,0.3)]"
            }`}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: cat.color }}
            />
            {cat.name.replace(/_/g, " ")} ({cat.count})
          </button>
        ))}
      </div>

      <div className="bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)] rounded-lg p-4">
        <ResponsiveContainer width="100%" height={height}>
          <>
            {viewMode === "gas" && (
              <AreaChart
                data={filteredData}
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
                  tickFormatter={(value) => `#${value + 1}`}
                />
                <YAxis
                  stroke="#8b9dc3"
                  fontSize={12}
                  tickFormatter={(value) => formatGas(value)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="gasUsed"
                  stroke="#00bfff"
                  fill="rgba(0,191,255,0.1)"
                  strokeWidth={2}
                  dot={{ fill: "#00bfff", strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 5, fill: "#00bfff" }}
                />
              </AreaChart>
            )}

            {viewMode === "cumulative" && (
              <LineChart
                data={filteredData}
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
                  tickFormatter={(value) => `#${value + 1}`}
                />
                <YAxis
                  stroke="#8b9dc3"
                  fontSize={12}
                  tickFormatter={(value) => formatGas(value)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="cumulativeGas"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  dot={{ fill: "#8b5cf6", strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 5, fill: "#8b5cf6" }}
                />
              </LineChart>
            )}

            {viewMode === "efficiency" && (
              <AreaChart
                data={filteredData}
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
                  tickFormatter={(value) => `#${value + 1}`}
                />
                <YAxis
                  stroke="#8b9dc3"
                  fontSize={12}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={80} stroke="#10b981" strokeDasharray="5 5" />
                <ReferenceLine y={60} stroke="#f59e0b" strokeDasharray="5 5" />
                <Area
                  type="monotone"
                  dataKey="efficiency"
                  stroke="#10b981"
                  fill="rgba(16,185,129,0.1)"
                  strokeWidth={2}
                  dot={{ fill: "#10b981", strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 5, fill: "#10b981" }}
                />
              </AreaChart>
            )}

            {viewMode === "scatter" && (
              <ScatterChart
                data={filteredData}
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
                  tickFormatter={(value) => `#${value + 1}`}
                />
                <YAxis
                  stroke="#8b9dc3"
                  fontSize={12}
                  tickFormatter={(value) => formatGas(value)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Scatter
                  dataKey="gasUsed"
                  fill="#00bfff"
                  shape={(props: ScatterShapeProps) => {
                    const { cx, cy, payload } = props;
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={4}
                        fill={payload.success ? "#10b981" : "#ef4444"}
                        stroke={payload.success ? "#10b981" : "#ef4444"}
                        strokeWidth={2}
                        opacity={0.8}
                      />
                    );
                  }}
                />
              </ScatterChart>
            )}
          </>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
        <div className="text-center p-3 rounded-lg bg-[rgba(0,191,255,0.05)] border border-[rgba(0,191,255,0.1)]">
          <div className="text-lg font-bold text-[#00bfff]">
            {filteredData.length}
          </div>
          <div className="text-xs text-[#8b9dc3]">Transactions</div>
        </div>
        <div className="text-center p-3 rounded-lg bg-[rgba(0,191,255,0.05)] border border-[rgba(0,191,255,0.1)]">
          <div className="text-lg font-bold text-[#00bfff]">
            {formatGas(stats.totalGas)}
          </div>
          <div className="text-xs text-[#8b9dc3]">Total Gas</div>
        </div>
        <div className="text-center p-3 rounded-lg bg-[rgba(0,191,255,0.05)] border border-[rgba(0,191,255,0.1)]">
          <div className="text-lg font-bold text-[#10b981]">
            {formatGas(stats.avgGas)}
          </div>
          <div className="text-xs text-[#8b9dc3]">Avg Gas</div>
        </div>
        <div className="text-center p-3 rounded-lg bg-[rgba(0,191,255,0.05)] border border-[rgba(0,191,255,0.1)]">
          <div className="text-lg font-bold text-[#f59e0b]">
            {formatGas(stats.maxGas)}
          </div>
          <div className="text-xs text-[#8b9dc3]">Max Gas</div>
        </div>
        <div className="text-center p-3 rounded-lg bg-[rgba(0,191,255,0.05)] border border-[rgba(0,191,255,0.1)]">
          <div className="text-lg font-bold text-[#10b981]">
            {stats.successRate.toFixed(1)}%
          </div>
          <div className="text-xs text-[#8b9dc3]">Success Rate</div>
        </div>
      </div>
    </div>
  );
}
