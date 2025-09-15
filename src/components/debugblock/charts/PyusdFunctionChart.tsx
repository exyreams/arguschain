import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { FunctionCategoryData } from "@/lib/debugblock/types";

interface PyusdFunctionChartProps {
  data: FunctionCategoryData[];
  height?: number;
  className?: string;
}

const CATEGORY_COLORS = {
  "Token Movement": "#10b981",
  "Supply Change": "#f59e0b",
  Allowance: "#3b82f6",
  Control: "#8b5cf6",
  Admin: "#ef4444",
  View: "#6b7280",
  Other: "#8b9dc3",
};

interface LegendProps {
  payload: Array<{
    color: string;
    payload: ChartDataPoint;
  }>;
  onToggle: (category: string) => void;
  hiddenCategories: Set<string>;
}

interface ChartDataPoint extends FunctionCategoryData {
  color: string;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: ChartDataPoint;
  }>;
}

const CustomTooltip = ({ active, payload }: TooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[rgba(25,28,40,0.95)] border border-[rgba(0,191,255,0.3)] rounded-lg p-3 shadow-lg">
        <p className="text-[#00bfff] font-medium">{data.category}</p>
        <div className="space-y-1 mt-2">
          <p className="text-white text-sm">
            Count: <span className="text-[#10b981]">{data.count}</span>
          </p>
          <p className="text-white text-sm">
            Percentage:{" "}
            <span className="text-[#00bfff]">
              {data.percentage.toFixed(1)}%
            </span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

const CustomLegend = ({ payload, onToggle, hiddenCategories }: LegendProps) => {
  return (
    <div className="grid grid-cols-2 gap-2 mt-4">
      {payload.map((entry, index) => (
        <button
          key={index}
          onClick={() => onToggle(entry.payload.category)}
          className={`flex items-center gap-2 px-3 py-2 rounded transition-all text-left ${
            hiddenCategories.has(entry.payload.category)
              ? "opacity-50 bg-[rgba(107,114,128,0.1)]"
              : "bg-[rgba(0,191,255,0.1)] hover:bg-[rgba(0,191,255,0.2)]"
          }`}
        >
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <div className="flex-1 min-w-0">
            <div className="text-sm text-[#8b9dc3] truncate">
              {entry.payload.category}
            </div>
            <div className="text-xs text-[#6b7280]">
              {entry.payload.count} calls ({entry.payload.percentage.toFixed(1)}
              %)
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};

export function PyusdFunctionChart({
  data,
  height = 400,
  className = "",
}: PyusdFunctionChartProps) {
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(
    new Set(),
  );

  if (!data || data.length === 0) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-[rgba(0,191,255,0.3)] border-t-[#00bfff] rounded-full animate-spin" />
          </div>
          <p className="text-[#8b9dc3] text-sm">
            No PYUSD function data available
          </p>
        </div>
      </div>
    );
  }

  const toggleCategory = (category: string) => {
    const newHidden = new Set(hiddenCategories);
    if (newHidden.has(category)) {
      newHidden.delete(category);
    } else {
      newHidden.add(category);
    }
    setHiddenCategories(newHidden);
  };

  const visibleData = data.filter(
    (item) => !hiddenCategories.has(item.category),
  );

  const totalCalls = data.reduce((sum, item) => sum + item.count, 0);
  const visibleCalls = visibleData.reduce((sum, item) => sum + item.count, 0);

  const chartData = visibleData.map((item) => ({
    ...item,
    color:
      CATEGORY_COLORS[item.category as keyof typeof CATEGORY_COLORS] ||
      CATEGORY_COLORS.Other,
  }));

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold text-[#00bfff]">
            PYUSD Function Distribution
          </h3>
          <p className="text-sm text-[#8b9dc3]">
            {totalCalls} total function calls across {data.length} categories
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-[#8b9dc3]">
            Showing: {visibleCalls} / {totalCalls} calls
          </div>
          {hiddenCategories.size > 0 && (
            <button
              onClick={() => setHiddenCategories(new Set())}
              className="text-xs text-[#00bfff] hover:underline"
            >
              Show All
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <ResponsiveContainer width="100%" height={height - 100}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={2}
                dataKey="count"
                animationDuration={1000}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          <div className="relative -mt-32 flex flex-col items-center justify-center h-32 pointer-events-none">
            <div className="text-2xl font-bold text-[#00bfff]">
              {visibleCalls}
            </div>
            <div className="text-sm text-[#8b9dc3]">Total Calls</div>
          </div>
        </div>

        <div>
          <CustomLegend
            payload={chartData.map((item) => ({
              color: item.color,
              payload: item,
            }))}
            onToggle={toggleCategory}
            hiddenCategories={hiddenCategories}
          />

          <div className="mt-6">
            <h4 className="text-sm font-medium text-[#8b9dc3] mb-3">
              Top Function Categories
            </h4>
            <div className="space-y-2">
              {data
                .sort((a, b) => b.count - a.count)
                .slice(0, 3)
                .map((item, index) => (
                  <div
                    key={item.category}
                    className="flex items-center justify-between p-2 bg-[rgba(15,20,25,0.6)] rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-bold text-[#00bfff]">
                        #{index + 1}
                      </div>
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor:
                            CATEGORY_COLORS[
                              item.category as keyof typeof CATEGORY_COLORS
                            ] || CATEGORY_COLORS.Other,
                        }}
                      />
                      <div className="text-sm text-[#8b9dc3]">
                        {item.category}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-[#10b981]">
                        {item.count} calls
                      </div>
                      <div className="text-xs text-[#6b7280]">
                        {item.percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-[rgba(0,191,255,0.05)] border border-[rgba(0,191,255,0.1)] rounded-lg p-4">
        <h4 className="text-sm font-medium text-[#00bfff] mb-2">
          Function Analysis Insights
        </h4>
        <div className="text-sm text-[#8b9dc3] space-y-1">
          {data.length > 0 && (
            <>
              <div>
                • Most common function category:{" "}
                <span className="text-[#10b981] font-medium">
                  {data.sort((a, b) => b.count - a.count)[0].category}
                </span>{" "}
                ({data.sort((a, b) => b.count - a.count)[0].count} calls)
              </div>
              {data.find((item) => item.category === "Token Movement") && (
                <div>
                  • Token movement operations:{" "}
                  <span className="text-[#10b981] font-medium">
                    {data.find((item) => item.category === "Token Movement")
                      ?.count || 0}
                  </span>{" "}
                  calls (
                  {data
                    .find((item) => item.category === "Token Movement")
                    ?.percentage.toFixed(1) || 0}
                  %)
                </div>
              )}
              {data.find((item) => item.category === "Admin") && (
                <div>
                  • Administrative functions detected:{" "}
                  <span className="text-[#ef4444] font-medium">
                    {data.find((item) => item.category === "Admin")?.count || 0}
                  </span>{" "}
                  calls - monitor for security
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
