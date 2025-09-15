import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { OpcodeDistributionData } from "@/lib/debugtrace/types";
import { formatGas } from "@/lib/config";

interface OpcodeDistributionChartProps {
  data: OpcodeDistributionData[];
  height?: number;
  className?: string;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: OpcodeDistributionData;
  }>;
  label?: string;
}

interface CustomLabelProps {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  payload?: {
    percentage: number;
  };
}

interface LegendProps {
  payload?: Array<{
    value: string;
    color: string;
  }>;
}

const CustomTooltip = ({ active, payload }: TooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[rgba(25,28,40,0.95)] border border-[rgba(0,191,255,0.3)] rounded-lg p-3 shadow-lg">
        <p className="text-[#00bfff] font-medium">{data.category}</p>
        <p className="text-text-secondary text-sm">
          Gas Used:{" "}
          <span className="text-[#00bfff]">{formatGas(data.gasUsed)}</span>
        </p>
        <p className="text-text-secondary text-sm">
          Percentage:{" "}
          <span className="text-[#00bfff]">{data.percentage.toFixed(1)}%</span>
        </p>
        <p className="text-text-secondary text-sm">
          Count:{" "}
          <span className="text-[#00bfff]">{data.count.toLocaleString()}</span>
        </p>
      </div>
    );
  }
  return null;
};

const renderCustomLabel = (props: CustomLabelProps) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, payload } = props;

  if (
    payload === undefined ||
    midAngle === undefined ||
    innerRadius === undefined ||
    outerRadius === undefined ||
    cx === undefined ||
    cy === undefined
  ) {
    return null;
  }

  const { percentage } = payload;
  if (percentage < 5) return null; // Show label only if percentage >= 5%

  const RADIAN = Math.PI / 180;

  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize={12}
      fontWeight="medium"
    >
      {`${percentage.toFixed(0)}%`}
    </text>
  );
};

const CustomLegend = ({ payload }: LegendProps) => {
  return (
    <div className="flex flex-wrap justify-center gap-4 mt-4">
      {payload?.map((entry, index) => (
        <div
          key={`legend-${entry.value}-${index}`}
          className="flex items-center gap-2"
        >
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-[#8b9dc3] text-sm capitalize">
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const OpcodeDistributionSkeleton = ({ height = 300, className = "" }) => {
  return (
    <div className={`bg-[rgba(15,20,25,0.8)] rounded-lg p-4 ${className}`}>
      {/* Chart area skeleton */}
      <div
        className="flex items-center justify-center"
        style={{ height: height - 120 }}
      >
        <div className="relative">
          {/* Pie chart skeleton */}
          <div className="w-48 h-48 rounded-full border-8 border-[rgba(0,191,255,0.1)] animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-[rgba(0,191,255,0.3)] border-t-[#00bfff] rounded-full animate-spin" />
          </div>
        </div>
      </div>

      {/* Legend skeleton */}
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[rgba(0,191,255,0.2)] animate-pulse" />
            <div className="w-16 h-4 bg-[rgba(0,191,255,0.1)] rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Stats skeleton */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="w-8 h-6 bg-[rgba(0,191,255,0.2)] rounded mx-auto mb-1 animate-pulse" />
          <div className="w-16 h-4 bg-[rgba(0,191,255,0.1)] rounded mx-auto animate-pulse" />
        </div>
        <div className="text-center">
          <div className="w-16 h-6 bg-[rgba(0,191,255,0.2)] rounded mx-auto mb-1 animate-pulse" />
          <div className="w-12 h-4 bg-[rgba(0,191,255,0.1)] rounded mx-auto animate-pulse" />
        </div>
      </div>

      {/* Top categories skeleton */}
      <div className="mt-4 space-y-2">
        <div className="w-32 h-4 bg-[rgba(0,191,255,0.1)] rounded animate-pulse mb-2" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[rgba(0,191,255,0.2)] animate-pulse" />
              <div className="w-16 h-4 bg-[rgba(0,191,255,0.1)] rounded animate-pulse" />
            </div>
            <div className="w-12 h-4 bg-[rgba(0,191,255,0.1)] rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
};

export function OpcodeDistributionChart({
  data,
  height = 300,
  className = "",
}: OpcodeDistributionChartProps) {
  if (!data || data.length === 0) {
    return <OpcodeDistributionSkeleton height={height} className={className} />;
  }

  return (
    <div className={`bg-[rgba(15,20,25,0.8)] rounded-lg p-4 ${className}`}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={Math.min(height * 0.35, 120)}
            fill="#8884d8"
            dataKey="gasUsed"
            nameKey="category"
            animationBegin={0}
            animationDuration={800}
          >
            {data.map((entry) => (
              <Cell
                key={`cell-${entry.category}`}
                fill={entry.color}
                stroke="rgba(0,191,255,0.2)"
                strokeWidth={1}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-lg font-bold text-accent-primary">
            {data.length}
          </div>
          <div className="text-sm text-[#8b9dc3]">Categories</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-accent-primary">
            {formatGas(data.reduce((sum, item) => sum + item.gasUsed, 0))}
          </div>
          <div className="text-sm text-[#8b9dc3]">Total Gas</div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <h5 className="text-sm font-medium text-accent-primary mb-2">
          Top Categories by Gas Usage
        </h5>
        {data.slice(0, 3).map((item) => (
          <div
            key={item.category}
            className="flex items-center justify-between py-1"
          >
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-text-secondary capitalize">
                {item.category}
              </span>
            </div>
            <div className="text-sm text-[#00bfff]">
              {item.percentage.toFixed(1)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
