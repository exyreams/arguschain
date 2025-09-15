import React, { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  Eye,
  EyeOff,
  Flame,
  PieChart as PieChartIcon,
} from "lucide-react";
import { formatGas } from "@/lib/config";

interface GasDistributionItem {
  category: string;
  gasUsed: string;
  rawGasUsed: number;
  percentage: number;
  count: number;
  avgGas: number;
  efficiency: number;
  color: string;
}

interface BlockGasDistributionChartProps {
  data: GasDistributionItem[];
  height?: number;
  className?: string;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: GasDistributionItem;
    value: number;
  }>;
}

const CustomTooltip = ({ active, payload }: TooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[rgba(25,28,40,0.95)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.3)] rounded-lg p-4 shadow-lg">
        <p className="text-[#00bfff] font-medium mb-2">{data.category}</p>
        <div className="space-y-1">
          <div className="flex justify-between gap-4">
            <span className="text-[#8b9dc3] text-sm">Gas Used:</span>
            <span className="text-[#00bfff] font-mono text-sm">
              {data.gasUsed}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[#8b9dc3] text-sm">Percentage:</span>
            <span className="text-[#00bfff] text-sm">
              {data.percentage.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[#8b9dc3] text-sm">Transactions:</span>
            <span className="text-[#00bfff] text-sm">{data.count}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[#8b9dc3] text-sm">Avg Gas:</span>
            <span className="text-[#10b981] font-mono text-sm">
              {formatGas(data.avgGas)}
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

export function BlockGasDistributionChart({
  data,
  height = 400,
  className = "",
}: BlockGasDistributionChartProps) {
  const [viewMode, setViewMode] = useState<"pie" | "bar">("pie");
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(
    new Set(),
  );

  const visibleData = useMemo(() => {
    return data.filter((item) => !hiddenCategories.has(item.category));
  }, [data, hiddenCategories]);

  const toggleCategory = (category: string) => {
    const newHidden = new Set(hiddenCategories);
    if (newHidden.has(category)) {
      newHidden.delete(category);
    } else {
      newHidden.add(category);
    }
    setHiddenCategories(newHidden);
  };

  const totalGas = visibleData.reduce((sum, item) => sum + item.rawGasUsed, 0);
  const totalTransactions = visibleData.reduce(
    (sum, item) => sum + item.count,
    0,
  );

  if (!data || data.length === 0) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
            <Flame className="h-8 w-8 text-[rgba(0,191,255,0.3)]" />
          </div>
          <p className="text-[#8b9dc3] text-sm">
            No gas distribution data available
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-[#00bfff]" />
          <h3 className="text-lg font-semibold text-[#00bfff]">
            Gas Distribution Analysis
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("pie")}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === "pie"
                ? "bg-[rgba(0,191,255,0.2)] text-[#00bfff] border border-[rgba(0,191,255,0.3)]"
                : "bg-[rgba(15,20,25,0.6)] text-[#8b9dc3] border border-[rgba(0,191,255,0.1)] hover:bg-[rgba(0,191,255,0.1)]"
            }`}
          >
            <PieChartIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("bar")}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === "bar"
                ? "bg-[rgba(0,191,255,0.2)] text-[#00bfff] border border-[rgba(0,191,255,0.3)]"
                : "bg-[rgba(15,20,25,0.6)] text-[#8b9dc3] border border-[rgba(0,191,255,0.1)] hover:bg-[rgba(0,191,255,0.1)]"
            }`}
          >
            <BarChart3 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)] rounded-lg p-4">
        <ResponsiveContainer width="100%" height={height}>
          {viewMode === "pie" ? (
            <PieChart>
              <Pie
                data={visibleData}
                cx="50%"
                cy="50%"
                outerRadius={120}
                innerRadius={60}
                paddingAngle={2}
                dataKey="rawGasUsed"
                animationBegin={0}
                animationDuration={1000}
              >
                {visibleData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          ) : (
            <BarChart
              data={visibleData}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(0,191,255,0.1)"
              />
              <XAxis
                dataKey="category"
                stroke="#8b9dc3"
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                stroke="#8b9dc3"
                fontSize={12}
                tickFormatter={(value) => formatGas(value)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="rawGasUsed"
                fill="#00bfff"
                radius={[4, 4, 0, 0]}
                animationDuration={1000}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      <div className="mt-6 space-y-4">
        <div className="flex flex-wrap gap-2">
          {data.map((item, index) => (
            <button
              key={index}
              onClick={() => toggleCategory(item.category)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                hiddenCategories.has(item.category)
                  ? "opacity-50 bg-[rgba(107,114,128,0.1)] border-[rgba(107,114,128,0.2)]"
                  : "bg-[rgba(15,20,25,0.6)] border-[rgba(0,191,255,0.1)] hover:border-[rgba(0,191,255,0.3)]"
              }`}
            >
              {hiddenCategories.has(item.category) ? (
                <EyeOff className="h-3 w-3 text-[#6b7280]" />
              ) : (
                <Eye className="h-3 w-3 text-[#8b9dc3]" />
              )}
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-[#8b9dc3]">{item.category}</span>
              <span className="text-xs text-[#6b7280]">({item.count})</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-[rgba(0,191,255,0.1)]">
          <div className="text-center p-4 rounded-lg bg-[rgba(0,191,255,0.05)] border border-[rgba(0,191,255,0.1)]">
            <div className="text-xl font-bold text-[#00bfff]">
              {formatGas(totalGas)}
            </div>
            <div className="text-sm text-[#8b9dc3]">Total Gas</div>
            <div className="text-xs text-[#6b7280]">
              {visibleData.length} categories
            </div>
          </div>
          <div className="text-center p-4 rounded-lg bg-[rgba(0,191,255,0.05)] border border-[rgba(0,191,255,0.1)]">
            <div className="text-xl font-bold text-[#10b981]">
              {totalTransactions.toLocaleString()}
            </div>
            <div className="text-sm text-[#8b9dc3]">Transactions</div>
            <div className="text-xs text-[#6b7280]">
              Avg:{" "}
              {totalTransactions > 0
                ? formatGas(Math.floor(totalGas / totalTransactions))
                : "0"}
            </div>
          </div>
          <div className="text-center p-4 rounded-lg bg-[rgba(0,191,255,0.05)] border border-[rgba(0,191,255,0.1)]">
            <div className="text-xl font-bold text-[#8b5cf6]">
              {visibleData.length > 0
                ? (
                    visibleData.reduce(
                      (sum, item) => sum + item.efficiency,
                      0,
                    ) / visibleData.length
                  ).toFixed(1)
                : "0"}
              %
            </div>
            <div className="text-sm text-[#8b9dc3]">Avg Efficiency</div>
            <div className="text-xs text-[#6b7280]">Weighted average</div>
          </div>
        </div>
      </div>
    </div>
  );
}
