import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { GasAttributionData } from "@/lib/debugtrace/types";
import { formatGas, shortenAddress } from "@/lib/config";
import { useState } from "react";
import { Dropdown } from "@/components/global";

interface GasAttributionChartProps {
  data: GasAttributionData[];
  height?: number;
  className?: string;
}

interface CustomLabelProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  value?: number;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: GasAttributionData;
  }>;
  label?: string;
}

type SortOption = "gas" | "calls" | "name";

const CustomTooltip = ({ active, payload }: TooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const displayName =
      data.contractName === "Unknown Contract"
        ? data.contractAddress
        : data.contractName;

    return (
      <div className="bg-[rgba(25,28,40,0.95)] border border-[rgba(0,191,255,0.3)] rounded-lg p-3 shadow-lg">
        <p className="text-[#00bfff] font-medium">{displayName}</p>
        {data.contractName !== "Unknown Contract" && (
          <p className="text-white text-sm font-mono">
            {shortenAddress(data.contractAddress)}
          </p>
        )}
        <p className="text-text-secondary text-sm">
          Gas Used:{" "}
          <span className="text-[#00bfff]">{formatGas(data.gasUsed)}</span>
        </p>
        <p className="text-text-secondary text-sm">
          Percentage:{" "}
          <span className="text-[#00bfff]">{data.percentage.toFixed(1)}%</span>
        </p>
        <p className="text-text-secondary text-sm">
          Call Count: <span className="text-[#00bfff]">{data.callCount}</span>
        </p>
      </div>
    );
  }
  return null;
};

const CustomLabel = ({ x, y, width, height, value }: CustomLabelProps) => {
  if (
    x === undefined ||
    y === undefined ||
    width === undefined ||
    height === undefined ||
    value === undefined
  ) {
    return null;
  }

  if (width < 60) return null;

  return (
    <text
      x={x + width - 5}
      y={y + height / 2}
      fill="white"
      textAnchor="end"
      dominantBaseline="central"
      fontSize={11}
      fontWeight="medium"
    >
      {formatGas(value)}
    </text>
  );
};

export function GasAttributionChart({
  data,
  height = 350,
  className = "",
}: GasAttributionChartProps) {
  const [sortBy, setSortBy] = useState<SortOption>("gas");

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
            No gas attribution data available
          </p>
        </div>
      </div>
    );
  }

  const sortedData = [...data].sort((a, b) => {
    switch (sortBy) {
      case "gas":
        return b.gasUsed - a.gasUsed;
      case "calls":
        return b.callCount - a.callCount;
      case "name":
        return a.contractName.localeCompare(b.contractName);
      default:
        return 0;
    }
  });

  const displayData = sortedData.slice(0, 10);

  const sortOptions = [
    { value: "gas", label: "Gas Usage" },
    { value: "calls", label: "Call Count" },
    { value: "name", label: "Contract Name" },
  ];

  return (
    <div className={`bg-[rgba(15,20,25,0.8)] rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-[#8b9dc3]">
          Showing top {displayData.length} contracts
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#8b9dc3]">Sort by:</span>
          <Dropdown
            value={sortBy}
            onValueChange={(value) => setSortBy(value as SortOption)}
            options={sortOptions}
            className="w-40"
          />
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height - 60}>
        <BarChart
          data={displayData}
          layout="horizontal"
          margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(0,191,255,0.1)"
            horizontal={false}
          />
          <XAxis
            type="number"
            stroke="#8b9dc3"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => formatGas(value)}
          />
          <YAxis
            type="category"
            dataKey="contractName"
            stroke="#8b9dc3"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={90}
            tickFormatter={(value) => {
              const displayName =
                value === "Unknown Contract"
                  ? displayData.find((d) => d.contractName === value)
                      ?.contractAddress || value
                  : value;
              return displayName.length > 12
                ? `${displayName.slice(0, 12)}...`
                : displayName;
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="gasUsed" radius={[0, 4, 4, 0]} label={<CustomLabel />}>
            {displayData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
                stroke="rgba(0,191,255,0.2)"
                strokeWidth={1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-lg font-bold text-[#00bfff]">
            {displayData.length}
          </div>
          <div className="text-sm text-[#8b9dc3]">Contracts</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-[#00bfff]">
            {formatGas(
              displayData.reduce((sum, item) => sum + item.gasUsed, 0)
            )}
          </div>
          <div className="text-sm text-[#8b9dc3]">Total Gas</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-[#00bfff]">
            {displayData.reduce((sum, item) => sum + item.callCount, 0)}
          </div>
          <div className="text-sm text-[#8b9dc3]">Total Calls</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-[#00bfff]">
            {displayData[0]?.percentage.toFixed(1) || 0}%
          </div>
          <div className="text-sm text-[#8b9dc3]">Top Contract</div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <h5 className="text-sm font-medium text-[#8b9dc3] mb-2">
          Top Gas Consumers
        </h5>
        {displayData.slice(0, 5).map((item, index) => {
          const displayName =
            item.contractName === "Unknown Contract"
              ? item.contractAddress
              : item.contractName;

          return (
            <div
              key={index}
              className="flex items-center justify-between py-2 px-3 rounded-lg bg-[rgba(15,20,25,0.6)] hover:bg-[rgba(15,20,25,0.8)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="text-sm font-bold text-[#00bfff] w-6">
                  #{index + 1}
                </div>
                <div>
                  <div className="text-sm text-accent-primary font-medium">
                    {displayName}
                  </div>
                  {item.contractName !== "Unknown Contract" && (
                    <div className="text-xs text-[#8b9dc3] font-mono">
                      {shortenAddress(item.contractAddress)}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-[#00bfff]">
                  {formatGas(item.gasUsed)}
                </div>
                <div className="text-xs text-[#8b9dc3]">
                  {item.callCount} calls • {item.percentage.toFixed(1)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 bg-[rgba(15,20,25,0.6)] rounded-lg p-3">
        <h5 className="text-sm font-medium text-accent-primary mb-2">
          Gas Efficiency Analysis
        </h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-[#8b9dc3]">Most Efficient: </span>
            <span className="text-[#10b981] font-medium">
              {(() => {
                const mostEfficient = displayData.reduce((min, contract) =>
                  contract.gasUsed / contract.callCount <
                  min.gasUsed / min.callCount
                    ? contract
                    : min
                );
                const displayName =
                  mostEfficient.contractName === "Unknown Contract"
                    ? shortenAddress(mostEfficient.contractAddress)
                    : mostEfficient.contractName.length > 16
                      ? `${mostEfficient.contractName.slice(0, 16)}...`
                      : mostEfficient.contractName;
                return displayName;
              })()}
            </span>
          </div>
          <div>
            <span className="text-[#8b9dc3]">Least Efficient: </span>
            <span className="text-[#f59e0b] font-medium">
              {(() => {
                const leastEfficient = displayData.reduce((max, contract) =>
                  contract.gasUsed / contract.callCount >
                  max.gasUsed / max.callCount
                    ? contract
                    : max
                );
                const displayName =
                  leastEfficient.contractName === "Unknown Contract"
                    ? shortenAddress(leastEfficient.contractAddress)
                    : leastEfficient.contractName.length > 16
                      ? `${leastEfficient.contractName.slice(0, 16)}...`
                      : leastEfficient.contractName;
                return displayName;
              })()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
