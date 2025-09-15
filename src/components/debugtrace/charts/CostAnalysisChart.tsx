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
import { useState } from "react";
import { CostAnalysisData } from "@/lib/debugtrace/types";
import { formatGas } from "@/lib/config";
import { DollarSign, TrendingUp } from "lucide-react";
import { Tooltip as UITooltip } from "@/components/global";

interface CostAnalysisChartProps {
  data: CostAnalysisData[];
  height?: number;
  className?: string;
}

interface ChartDataPoint extends CostAnalysisData {
  color: string;
}

interface TooltipProps<TPayload> {
  active?: boolean;
  payload?: Array<{
    payload: TPayload;
  }>;
  label?: string;
}

type PieTooltipProps = TooltipProps<ChartDataPoint>;
type BarTooltipProps = TooltipProps<ChartDataPoint>;

const PieTooltip = ({ active, payload }: PieTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[rgba(25,28,40,0.95)] border border-[rgba(0,191,255,0.3)] rounded-lg p-3 shadow-lg">
        <p className="text-[#00bfff] font-medium">{data.category}</p>
        <div className="space-y-1 mt-2">
          <p className="text-text-secondary text-sm">
            Cost:{" "}
            <span className="text-[#10b981]">${data.costUSD.toFixed(4)}</span>
          </p>
          <p className="text-text-secondary text-sm">
            Gas:{" "}
            <span className="text-[#f59e0b]">{formatGas(data.gasUsed)}</span>
          </p>
          <p className="text-text-secondary text-sm">
            Share:{" "}
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

const BarTooltip = ({ active, payload, label }: BarTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;

    // Get the full address from the original data
    const fullAddress = data.contractAddress || data.category;
    const isContractAddress =
      typeof fullAddress === "string" &&
      fullAddress.length === 42 &&
      fullAddress.startsWith("0x");

    return (
      <div className="bg-[rgba(25,28,40,0.95)] border border-[rgba(0,191,255,0.3)] rounded-lg p-3 shadow-lg max-w-sm">
        <div className="mb-2">
          <p className="text-accent-primary font-medium text-sm">
            {isContractAddress ? "Contract Address" : "Category"}
          </p>
          <p className="text-accent-primary text-xs font-mono break-all mt-1">
            {fullAddress}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-text-secondary text-sm">
            USD Cost:{" "}
            <span className="text-[#10b981]">${data.costUSD.toFixed(4)}</span>
          </p>
          <p className="text-text-secondary text-sm">
            Gas Used:{" "}
            <span className="text-[#f59e0b]">{formatGas(data.gasUsed)}</span>
          </p>
          <p className="text-text-secondary text-sm">
            Cost per Gas:{" "}
            <span className="text-accent-primary">
              ${((data.costUSD / data.gasUsed) * 1000000).toFixed(2)}/M gas
            </span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

const COLORS = [
  "#00bfff",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#6366f1",
  "#14b8a6",
  "#ec4899",
  "#22c55e",
  "#eab308",
  "#3b82f6",
  "#d946ef",
  "#f43f5e",
  "#a855f7",
  "#0ea5e9",
];

const ContractLabel = ({
  category,
  contractAddress,
}: {
  category: string;
  contractAddress?: string;
}) => {
  // Check if category looks like a contract address (42 chars starting with 0x)
  const isContractAddress = category.length === 42 && category.startsWith("0x");

  if (isContractAddress && contractAddress) {
    return (
      <UITooltip content={contractAddress} placement="top" maxWidth={500}>
        <span className="text-sm text-[#8b9dc3] truncate cursor-help">
          {category.slice(0, 8)}...{category.slice(-6)}
        </span>
      </UITooltip>
    );
  }

  return <span className="text-sm text-[#8b9dc3] truncate">{category}</span>;
};

// Helper function to format category labels for X-axis display
const formatCategoryForAxis = (category: string): string => {
  // Check if it's a contract address
  if (category.length === 42 && category.startsWith("0x")) {
    return `${category.slice(0, 6)}...${category.slice(-4)}`;
  }
  return category;
};

export function CostAnalysisChart({
  data,
  height = 300,
  className = "",
}: CostAnalysisChartProps) {
  const [viewMode, setViewMode] = useState<"pie" | "bar">("pie");

  if (!data || data.length === 0) {
    return (
      <div
        className={`flex items-center justify-center bg-[rgba(15,20,25,0.8)] rounded-lg ${className}`}
        style={{ height }}
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
            <DollarSign className="h-8 w-8 text-[rgba(0,191,255,0.3)]" />
          </div>
          <p className="text-[#8b9dc3] text-sm">
            No cost analysis data available
          </p>
        </div>
      </div>
    );
  }

  const totalCostUSD = data.reduce((sum, item) => sum + item.costUSD, 0);
  const totalGasUsed = data.reduce((sum, item) => sum + item.gasUsed, 0);
  const avgCostPerGas = totalGasUsed > 0 ? totalCostUSD / totalGasUsed : 0;

  const chartData = data.map((item, index) => ({
    ...item,
    color: COLORS[index % COLORS.length],
    displayLabel: formatCategoryForAxis(item.category),
  }));

  return (
    <div className={`bg-[rgba(15,20,25,0.8)] rounded-lg p-4 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-[#8b9dc3]">
          Total: ${totalCostUSD.toFixed(4)} USD
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("pie")}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              viewMode === "pie"
                ? "bg-[rgba(0,191,255,0.2)] text-[#00bfff] border border-[rgba(0,191,255,0.3)]"
                : "bg-[rgba(15,20,25,0.8)] text-[#8b9dc3] border border-[rgba(0,191,255,0.3)] hover:bg-[rgba(0,191,255,0.1)]"
            }`}
          >
            Pie Chart
          </button>
          <button
            onClick={() => setViewMode("bar")}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              viewMode === "bar"
                ? "bg-[rgba(0,191,255,0.2)] text-[#00bfff] border border-[rgba(0,191,255,0.3)]"
                : "bg-[rgba(15,20,25,0.8)] text-[#8b9dc3] border border-[rgba(0,191,255,0.3)] hover:bg-[rgba(0,191,255,0.1)]"
            }`}
          >
            Bar Chart
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        {viewMode === "pie" ? (
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={120}
              paddingAngle={2}
              dataKey="costUSD"
              animationDuration={1000}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<PieTooltip />} />
          </PieChart>
        ) : (
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,191,255,0.1)" />
            <XAxis
              dataKey="displayLabel"
              stroke="#8b9dc3"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              stroke="#8b9dc3"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${value.toFixed(3)}`}
            />
            <Tooltip content={<BarTooltip />} />
            <Bar
              dataKey="costUSD"
              radius={[4, 4, 0, 0]}
              animationDuration={1000}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>

      {viewMode === "pie" && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {chartData.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <ContractLabel
                category={item.category}
                contractAddress={item.contractAddress}
              />
              <span className="text-sm text-[#00bfff] ml-auto">
                ${item.costUSD.toFixed(3)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-lg font-bold text-[#10b981]">
            ${totalCostUSD.toFixed(4)}
          </div>
          <div className="text-sm text-[#8b9dc3]">Total Cost</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-[#f59e0b]">
            {formatGas(totalGasUsed)}
          </div>
          <div className="text-sm text-[#8b9dc3]">Total Gas</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-[#00bfff]">
            ${(avgCostPerGas * 1000000).toFixed(2)}
          </div>
          <div className="text-sm text-[#8b9dc3]">$/M Gas</div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <h5 className="text-sm font-medium text-[#8b9dc3] mb-2">
          Top Cost Categories
        </h5>
        {chartData.slice(0, 3).map((item, index) => (
          <div key={index} className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <ContractLabel
                category={item.category}
                contractAddress={item.contractAddress}
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-[#10b981]">
                ${item.costUSD.toFixed(4)}
              </span>
              <span className="text-sm text-[#8b9dc3]">
                {item.percentage.toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 bg-[rgba(0,191,255,0.05)] border border-[rgba(0,191,255,0.1)] rounded-lg p-3">
        <div className="text-sm text-[#8b9dc3]">
          <span className="font-medium text-[#00bfff]">
            Cost Efficiency Analysis:
          </span>
          {avgCostPerGas * 1000000 > 100 ? (
            <span>
              {" "}
              High cost per gas unit (${(avgCostPerGas * 1000000).toFixed(2)}/M
              gas). Consider optimizing gas-intensive operations.
            </span>
          ) : avgCostPerGas * 1000000 > 50 ? (
            <span>
              {" "}
              Moderate cost efficiency. Some optimization opportunities may
              exist.
            </span>
          ) : (
            <span>
              {" "}
              Good cost efficiency with ${(avgCostPerGas * 1000000).toFixed(2)}
              /M gas ratio.
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 bg-[rgba(16,185,129,0.05)] border border-[rgba(16,185,129,0.1)] rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-4 w-4 text-[#10b981]" />
          <span className="text-sm font-medium text-[#10b981]">
            Cost Projections
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm text-[#8b9dc3]">
          <div>
            <span>At 50 gwei: </span>
            <span className="text-[#00bfff]">
              ${(totalCostUSD * 2.5).toFixed(4)}
            </span>
          </div>
          <div>
            <span>At 10 gwei: </span>
            <span className="text-[#10b981]">
              ${(totalCostUSD * 0.5).toFixed(4)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
