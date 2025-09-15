import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DataKey } from "recharts/types/util/types";

import { GasBreakdownData } from "@/lib/debugtrace/types";
import { formatGas } from "@/lib/config";

interface GasBreakdownChartProps {
  data: GasBreakdownData[];
  height?: number;
  className?: string;
}

interface LegendsProps {
  payload?: readonly {
    value: string;
    color?: string;
    dataKey?: DataKey<GasBreakdownData>;
    type?: string;
    id?: string;
  }[];
  onToggle: (dataKey: string) => void;
  hiddenSeries: Set<string>;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: GasBreakdownData;
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;

    // Get the full address from the original category data, not the truncated displayLabel
    const fullAddress = data.category;
    const isContractAddress =
      typeof fullAddress === "string" &&
      fullAddress.length === 42 &&
      fullAddress.startsWith("0x");

    return (
      <div className="bg-[rgba(25,28,40,0.95)] border border-[rgba(0,191,255,0.3)] rounded-lg p-3 shadow-lg max-w-sm">
        <div className="mb-2">
          <p className="text-[#00bfff] font-medium text-sm">
            {isContractAddress ? "Contract Address" : "Category"}
          </p>
          <p className="text-accent-primary text-xs font-mono break-all mt-1">
            {fullAddress}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-text-secondary text-sm">
            Contract Gas:{" "}
            <span className="text-[#10b981]">
              {formatGas(data.contractGas)}
            </span>
          </p>
          <p className="text-text-secondary text-sm">
            Opcode Gas:{" "}
            <span className="text-[#f59e0b]">{formatGas(data.opcodeGas)}</span>
          </p>
          <p className="text-text-secondary text-sm">
            Total:{" "}
            <span className="text-[#00bfff]">{formatGas(data.total)}</span>
          </p>
          <p className="text-text-secondary text-sm">
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

const CustomLegend = ({ payload, onToggle, hiddenSeries }: LegendsProps) => {
  if (!payload || !onToggle || !hiddenSeries) return null;

  return (
    <div className="flex justify-center gap-6 mt-16">
      {payload.map((entry) => {
        const dataKey = String(entry.dataKey);
        const isHidden = hiddenSeries.has(dataKey);

        return (
          <button
            key={dataKey}
            onClick={() => onToggle(dataKey)}
            className={`flex items-center gap-2 px-3 py-1 rounded transition-all ${
              isHidden
                ? "opacity-50 bg-[rgba(107,114,128,0.1)]"
                : "bg-[rgba(0,191,255,0.1)] hover:bg-[rgba(0,191,255,0.2)]"
            }`}
          >
            <div
              className="w-3 h-3 rounded"
              style={{
                backgroundColor: isHidden
                  ? "#6b7280"
                  : entry.color || "#8b9dc3",
              }}
            />
            <span
              className={`text-sm ${isHidden ? "text-[#6b7280]" : "text-[#8b9dc3]"}`}
            >
              {entry.value}
            </span>
          </button>
        );
      })}
    </div>
  );
};

// Helper function to format category labels for display
const formatCategoryLabel = (category: string): string => {
  // Check if it's a contract address
  if (category.length === 42 && category.startsWith("0x")) {
    return `${category.slice(0, 6)}...${category.slice(-4)}`;
  }
  return category;
};

export function GasBreakdownChart({
  data,
  height = 450,
  className = "",
}: GasBreakdownChartProps) {
  const [displayMode, setDisplayMode] = useState<"absolute" | "percentage">(
    "absolute"
  );
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());

  if (!data || data.length === 0) {
    return (
      <div
        className={`flex items-center justify-center bg-[rgba(15,20,25,0.8)] rounded-lg ${className}`}
        style={{ height }}
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-[rgba(0,191,255,0.3)] border-t-[#00bfff] rounded-full animate-spin" />
          </div>
          <p className="text-[#8b9dc3] text-sm">
            No gas breakdown data available
          </p>
        </div>
      </div>
    );
  }

  const toggleSeries = (dataKey: string) => {
    const newHidden = new Set(hiddenSeries);
    if (newHidden.has(dataKey)) {
      newHidden.delete(dataKey);
    } else {
      newHidden.add(dataKey);
    }
    setHiddenSeries(newHidden);
  };

  const chartData = data.map((item) => {
    // Use the category as is since we fixed the mapping in the processor
    const displayCategory = item.category;

    if (displayMode === "percentage") {
      const total = item.contractGas + item.opcodeGas;
      return {
        ...item,
        category: displayCategory,
        displayLabel: formatCategoryLabel(displayCategory),
        contractGas: total > 0 ? (item.contractGas / total) * 100 : 0,
        opcodeGas: total > 0 ? (item.opcodeGas / total) * 100 : 0,
      };
    }
    return {
      ...item,
      category: displayCategory,
      displayLabel: formatCategoryLabel(displayCategory),
    };
  });

  const totalContractGas = data.reduce(
    (sum, item) => sum + item.contractGas,
    0
  );
  const totalOpcodeGas = data.reduce((sum, item) => sum + item.opcodeGas, 0);
  const grandTotal = totalContractGas + totalOpcodeGas;

  return (
    <div className={`bg-[rgba(15,20,25,0.8)] rounded-lg p-4 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-[#8b9dc3]">
          {data.length} categories analyzed
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setDisplayMode("absolute")}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              displayMode === "absolute"
                ? "bg-[rgba(0,191,255,0.2)] text-[#00bfff] border border-[rgba(0,191,255,0.3)]"
                : "bg-[rgba(15,20,25,0.8)] text-[#8b9dc3] border border-[rgba(0,191,255,0.3)] hover:bg-[rgba(0,191,255,0.1)]"
            }`}
          >
            Absolute
          </button>
          <button
            onClick={() => setDisplayMode("percentage")}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              displayMode === "percentage"
                ? "bg-[rgba(0,191,255,0.2)] text-[#00bfff] border border-[rgba(0,191,255,0.3)]"
                : "bg-[rgba(15,20,25,0.8)] text-[#8b9dc3] border border-[rgba(0,191,255,0.3)] hover:bg-[rgba(0,191,255,0.1)]"
            }`}
          >
            Percentage
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
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
            height={60}
          />
          <YAxis
            stroke="#8b9dc3"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) =>
              displayMode === "percentage" ? `${value}%` : formatGas(value)
            }
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            content={(props) => (
              <CustomLegend
                {...props}
                onToggle={toggleSeries}
                hiddenSeries={hiddenSeries}
              />
            )}
          />

          <Bar
            dataKey="contractGas"
            name="Contract Gas"
            stackId="gas"
            fill="#10b981"
            fillOpacity={hiddenSeries.has("contractGas") ? 0.1 : 1}
            radius={[0, 0, 0, 0]}
            animationDuration={1000}
          />

          <Bar
            dataKey="opcodeGas"
            name="Opcode Gas"
            stackId="gas"
            fill="#f59e0b"
            fillOpacity={hiddenSeries.has("opcodeGas") ? 0.1 : 1}
            radius={[4, 4, 0, 0]}
            animationDuration={1000}
          />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-lg font-bold text-[#10b981]">
            {formatGas(totalContractGas)}
          </div>
          <div className="text-sm text-[#8b9dc3]">Contract Gas</div>
          <div className="text-xs text-[#6b7280]">
            {grandTotal > 0
              ? ((totalContractGas / grandTotal) * 100).toFixed(1)
              : 0}
            %
          </div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-[#f59e0b]">
            {formatGas(totalOpcodeGas)}
          </div>
          <div className="text-sm text-[#8b9dc3]">Opcode Gas</div>
          <div className="text-xs text-[#6b7280]">
            {grandTotal > 0
              ? ((totalOpcodeGas / grandTotal) * 100).toFixed(1)
              : 0}
            %
          </div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-[#00bfff]">
            {formatGas(grandTotal)}
          </div>
          <div className="text-sm text-[#8b9dc3]">Total Gas</div>
          <div className="text-xs text-[#6b7280]">100%</div>
        </div>
      </div>

      <div className="mt-4 bg-[rgba(0,191,255,0.05)] border border-[rgba(0,191,255,0.1)] rounded-lg p-3">
        <div className="text-sm text-[#8b9dc3]">
          <span className="font-medium text-[#00bfff]">
            Gas Distribution Analysis:
          </span>
          {totalContractGas > totalOpcodeGas ? (
            <span>
              {" "}
              Contract-level operations dominate gas usage (
              {((totalContractGas / grandTotal) * 100).toFixed(1)}%). Focus on
              contract call optimization.
            </span>
          ) : totalOpcodeGas > totalContractGas ? (
            <span>
              {" "}
              Opcode-level operations dominate gas usage (
              {((totalOpcodeGas / grandTotal) * 100).toFixed(1)}%). Focus on
              low-level optimizations.
            </span>
          ) : (
            <span>
              {" "}
              Balanced gas distribution between contract and opcode operations.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
