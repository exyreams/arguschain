import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MemoryUsageData } from "@/lib/debugtrace/types";

interface MemoryUsageChartProps {
  data: MemoryUsageData[];
  height?: number;
  className?: string;
}

interface LegendProps {
  payload?: Array<{
    value: string;
    color: string;
  }>;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: MemoryUsageData;
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[rgba(25,28,40,0.95)] border border-[rgba(0,191,255,0.3)] rounded-lg p-3 shadow-lg">
        <p className="text-[#00bfff] font-medium">Step {label}</p>
        <p className="text-text-secondary text-sm">
          Stack Depth: <span className="text-[#00bfff]">{data.stackDepth}</span>
        </p>
        <p className="text-text-secondary text-sm">
          Memory Size:{" "}
          <span className="text-[#10b981]">
            {(data.memorySize / 1024).toFixed(1)} KB
          </span>
        </p>
        <p className="text-text-secondary text-sm">
          Gas Used:{" "}
          <span className="text-[#8b9dc3]">
            {data.gasUsed.toLocaleString()}
          </span>
        </p>
      </div>
    );
  }
  return null;
};

const CustomLegend = ({ payload }: LegendProps) => {
  return (
    <div className="flex justify-center gap-6 mt-4">
      {payload.map((entry) => (
        <div key={`legend-${entry.value}`} className="flex items-center gap-2">
          <div
            className="w-4 h-2 rounded"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-[#8b9dc3] text-sm">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

const MemoryUsageSkeleton = ({ height = 300, className = "" }) => {
  return (
    <div className={`bg-[rgba(15,20,25,0.8)] rounded-lg p-4 ${className}`}>
      {/* Chart area skeleton */}
      <div className="relative" style={{ height: height - 120 }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-[rgba(0,191,255,0.3)] border-t-[#00bfff] rounded-full animate-spin" />
            </div>
            <p className="text-[#8b9dc3] text-sm">
              Processing memory usage data...
            </p>
          </div>
        </div>
        {/* Chart skeleton lines */}
        <div className="absolute bottom-0 left-0 right-0 h-32 opacity-20">
          <div className="w-full h-full bg-gradient-to-t from-[rgba(0,191,255,0.1)] to-transparent rounded animate-pulse" />
          <div className="absolute top-4 w-full h-16 bg-gradient-to-t from-[rgba(16,185,129,0.1)] to-transparent rounded animate-pulse" />
        </div>
      </div>

      {/* Legend skeleton */}
      <div className="flex justify-center gap-6 mt-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-4 h-2 bg-[rgba(0,191,255,0.2)] rounded animate-pulse" />
            <div className="w-20 h-4 bg-[rgba(0,191,255,0.1)] rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Stats skeleton */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="text-center">
            <div className="w-16 h-6 bg-[rgba(0,191,255,0.2)] rounded mx-auto mb-1 animate-pulse" />
            <div className="w-12 h-4 bg-[rgba(0,191,255,0.1)] rounded mx-auto animate-pulse" />
          </div>
        ))}
      </div>

      {/* Analysis section skeleton */}
      <div className="mt-4 space-y-2">
        <div className="w-40 h-4 bg-[rgba(0,191,255,0.1)] rounded animate-pulse mb-2" />

        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center justify-between py-1">
            <div className="w-24 h-4 bg-[rgba(0,191,255,0.1)] rounded animate-pulse" />
            <div className="flex items-center gap-2">
              <div className="w-20 h-2 bg-[rgba(0,191,255,0.1)] rounded animate-pulse" />
              <div className="w-8 h-4 bg-[rgba(0,191,255,0.1)] rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export function MemoryUsageChart({
  data,
  height = 300,
  className = "",
}: MemoryUsageChartProps) {
  if (!data || data.length === 0) {
    return <MemoryUsageSkeleton height={height} className={className} />;
  }

  const maxStackDepth = Math.max(...data.map((d) => d.stackDepth));
  const maxMemorySize = Math.max(...data.map((d) => d.memorySize));
  const avgStackDepth =
    data.reduce((sum, d) => sum + d.stackDepth, 0) / data.length;
  const avgMemorySize =
    data.reduce((sum, d) => sum + d.memorySize, 0) / data.length;

  const processedData = data.map((item) => ({
    ...item,
    memorySizeKB: item.memorySize / 1024,
  }));

  return (
    <div className={`bg-[rgba(15,20,25,0.8)] rounded-lg p-4 ${className}`}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={processedData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <defs>
            <linearGradient id="stackGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00bfff" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#00bfff" stopOpacity={0.1} />
            </linearGradient>

            <linearGradient id="memoryGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(0,191,255,0.1)"
            horizontal={true}
            vertical={false}
          />
          <XAxis
            dataKey="step"
            stroke="#8b9dc3"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="left"
            stroke="#00bfff"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            label={{
              value: "Stack Depth",
              angle: -90,
              position: "insideLeft",
              style: { textAnchor: "middle", fill: "#00bfff" },
            }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#10b981"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            label={{
              value: "Memory (KB)",
              angle: 90,
              position: "insideRight",
              style: { textAnchor: "middle", fill: "#10b981" },
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />

          <Area
            yAxisId="left"
            type="monotone"
            dataKey="stackDepth"
            stroke="#00bfff"
            strokeWidth={2}
            fill="url(#stackGradient)"
            name="Stack Depth"
            animationDuration={1000}
          />

          <Area
            yAxisId="right"
            type="monotone"
            dataKey="memorySizeKB"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#memoryGradient)"
            name="Memory (KB)"
            animationDuration={1000}
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-lg font-bold text-[#00bfff]">
            {maxStackDepth}
          </div>
          <div className="text-sm text-[#8b9dc3]">Max Stack</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-[#00bfff]">
            {avgStackDepth.toFixed(1)}
          </div>
          <div className="text-sm text-[#8b9dc3]">Avg Stack</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-[#10b981]">
            {(maxMemorySize / 1024).toFixed(1)} KB
          </div>
          <div className="text-sm text-[#8b9dc3]">Max Memory</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-[#10b981]">
            {(avgMemorySize / 1024).toFixed(1)} KB
          </div>
          <div className="text-sm text-[#8b9dc3]">Avg Memory</div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <h5 className="text-sm font-medium text-accent-primary">
          Memory Efficiency Analysis
        </h5>

        <div className="flex items-center justify-between py-1">
          <span className="text-sm text-text-secondary">Stack Utilization</span>
          <div className="flex items-center gap-2">
            <div className="w-20 h-2 bg-[rgba(0,191,255,0.2)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#00bfff] rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min((avgStackDepth / 16) * 100, 100)}%`,
                }}
              />
            </div>
            <span className="text-sm text-[#00bfff] w-12 text-right">
              {((avgStackDepth / 16) * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between py-1">
          <span className="text-sm text-text-secondary">Memory Growth</span>
          <span className="text-sm text-[#10b981]">
            {maxMemorySize > avgMemorySize * 2 ? "Variable" : "Stable"}
          </span>
        </div>

        <div className="flex items-center justify-between py-1">
          <span className="text-sm text-text-secondary">Efficiency Score</span>
          <span
            className={`text-sm font-medium ${
              avgStackDepth < 8 && maxMemorySize < 10240
                ? "text-[#10b981]"
                : avgStackDepth < 12 && maxMemorySize < 20480
                  ? "text-[#f59e0b]"
                  : "text-[#ef4444]"
            }`}
          >
            {avgStackDepth < 8 && maxMemorySize < 10240
              ? "Excellent"
              : avgStackDepth < 12 && maxMemorySize < 20480
                ? "Good"
                : "Needs Optimization"}
          </span>
        </div>
      </div>

      {(maxStackDepth > 14 || maxMemorySize > 32768) && (
        <div className="mt-4 bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.3)] rounded-lg p-3">
          <div className="flex items-center gap-2 text-[#f59e0b] text-sm font-medium mb-1">
            <div className="w-2 h-2 bg-[#f59e0b] rounded-full"></div>
            Memory Usage Warning
          </div>
          <div className="text-[#8b9dc3] text-sm space-y-1">
            {maxStackDepth > 14 && (
              <p>
                • High stack depth detected ({maxStackDepth}). Consider
                optimizing recursive calls.
              </p>
            )}
            {maxMemorySize > 32768 && (
              <p>
                • High memory usage detected (
                {(maxMemorySize / 1024).toFixed(1)} KB). Consider optimizing
                data structures.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
