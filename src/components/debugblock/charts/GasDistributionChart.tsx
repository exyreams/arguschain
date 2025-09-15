import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { GasDistributionData } from "@/lib/debugblock/types";
import { formatGas } from "@/lib/config";

interface GasDistributionChartProps {
  data: GasDistributionData[];
  height?: number;
  className?: string;
}

interface HistogramBin {
  range: string;
  pyusdCount: number;
  otherCount: number;
  totalCount: number;
  minGas: number;
  maxGas: number;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: HistogramBin;
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[rgba(25,28,40,0.95)] border border-[rgba(0,191,255,0.3)] rounded-lg p-3 shadow-lg">
        <p className="text-[#00bfff] font-medium">{label}</p>
        <div className="space-y-1 mt-2">
          <p className="text-white text-sm">
            PYUSD Transactions:{" "}
            <span className="text-[#10b981]">{data.pyusdCount}</span>
          </p>
          <p className="text-white text-sm">
            Other Transactions:{" "}
            <span className="text-[#3b82f6]">{data.otherCount}</span>
          </p>
          <p className="text-white text-sm">
            Total: <span className="text-[#00bfff]">{data.totalCount}</span>
          </p>
          <p className="text-white text-sm">
            Gas Range:{" "}
            <span className="text-[#8b9dc3]">
              {formatGas(data.minGas)} - {formatGas(data.maxGas)}
            </span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export function GasDistributionChart({
  data,
  height = 400,
  className = "",
}: GasDistributionChartProps) {
  const [viewMode, setViewMode] = useState<"histogram" | "scatter">(
    "histogram",
  );
  const [logScale, setLogScale] = useState(false);

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
            No gas distribution data available
          </p>
        </div>
      </div>
    );
  }

  const pyusdTransactions = data.filter(
    (item) => item.interaction_type === "PYUSD Transaction",
  );
  const otherTransactions = data.filter(
    (item) => item.interaction_type === "Other Transaction",
  );

  const createHistogramBins = (binCount: number = 20): HistogramBin[] => {
    const allGasValues = data.map((item) => item.gas_used);
    const minGas = Math.min(...allGasValues);
    const maxGas = Math.max(...allGasValues);
    const binSize = (maxGas - minGas) / binCount;

    const bins: HistogramBin[] = [];

    for (let i = 0; i < binCount; i++) {
      const binMin = minGas + i * binSize;
      const binMax = minGas + (i + 1) * binSize;

      const pyusdInBin = pyusdTransactions.filter(
        (tx) => tx.gas_used >= binMin && tx.gas_used < binMax,
      );
      const otherInBin = otherTransactions.filter(
        (tx) => tx.gas_used >= binMin && tx.gas_used < binMax,
      );

      bins.push({
        range: `${formatGas(binMin)} - ${formatGas(binMax)}`,
        pyusdCount: pyusdInBin.length,
        otherCount: otherInBin.length,
        totalCount: pyusdInBin.length + otherInBin.length,
        minGas: binMin,
        maxGas: binMax,
      });
    }

    return bins.filter((bin) => bin.totalCount > 0);
  };

  const histogramData = createHistogramBins();

  const pyusdGasValues = pyusdTransactions.map((tx) => tx.gas_used);
  const otherGasValues = otherTransactions.map((tx) => tx.gas_used);

  const pyusdStats = {
    count: pyusdGasValues.length,
    avg:
      pyusdGasValues.length > 0
        ? pyusdGasValues.reduce((a, b) => a + b, 0) / pyusdGasValues.length
        : 0,
    min: pyusdGasValues.length > 0 ? Math.min(...pyusdGasValues) : 0,
    max: pyusdGasValues.length > 0 ? Math.max(...pyusdGasValues) : 0,
  };

  const otherStats = {
    count: otherGasValues.length,
    avg:
      otherGasValues.length > 0
        ? otherGasValues.reduce((a, b) => a + b, 0) / otherGasValues.length
        : 0,
    min: otherGasValues.length > 0 ? Math.min(...otherGasValues) : 0,
    max: otherGasValues.length > 0 ? Math.max(...otherGasValues) : 0,
  };

  const scatterData = data.map((item, index) => ({
    x: index,
    y: item.gas_used,
    type: item.interaction_type,
  }));

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold text-[#00bfff]">
            Gas Usage Distribution
          </h3>
          <p className="text-sm text-[#8b9dc3]">
            {data.length} transactions analyzed
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("histogram")}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              viewMode === "histogram"
                ? "bg-[rgba(0,191,255,0.2)] text-[#00bfff] border border-[rgba(0,191,255,0.3)]"
                : "bg-[rgba(15,20,25,0.8)] text-[#8b9dc3] border border-[rgba(0,191,255,0.3)] hover:bg-[rgba(0,191,255,0.1)]"
            }`}
          >
            Histogram
          </button>
          <button
            onClick={() => setViewMode("scatter")}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              viewMode === "scatter"
                ? "bg-[rgba(0,191,255,0.2)] text-[#00bfff] border border-[rgba(0,191,255,0.3)]"
                : "bg-[rgba(15,20,25,0.8)] text-[#8b9dc3] border border-[rgba(0,191,255,0.3)] hover:bg-[rgba(0,191,255,0.1)]"
            }`}
          >
            Scatter
          </button>
          <button
            onClick={() => setLogScale(!logScale)}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              logScale
                ? "bg-[rgba(0,191,255,0.2)] text-[#00bfff] border border-[rgba(0,191,255,0.3)]"
                : "bg-[rgba(15,20,25,0.8)] text-[#8b9dc3] border border-[rgba(0,191,255,0.3)] hover:bg-[rgba(0,191,255,0.1)]"
            }`}
          >
            Log Scale
          </button>
        </div>
      </div>

      <div className="mb-6">
        <ResponsiveContainer width="100%" height={height - 200}>
          {viewMode === "histogram" ? (
            <BarChart
              data={histogramData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(0,191,255,0.1)"
              />
              <XAxis
                dataKey="range"
                stroke="#8b9dc3"
                fontSize={10}
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
                scale={logScale ? "log" : "linear"}
                domain={logScale ? ["dataMin", "dataMax"] : [0, "dataMax"]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar
                dataKey="pyusdCount"
                name="PYUSD Transactions"
                fill="#10b981"
                radius={[2, 2, 0, 0]}
                animationDuration={1000}
              />
              <Bar
                dataKey="otherCount"
                name="Other Transactions"
                fill="#3b82f6"
                radius={[2, 2, 0, 0]}
                animationDuration={1000}
              />
            </BarChart>
          ) : (
            <ScatterChart
              data={scatterData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(0,191,255,0.1)"
              />
              <XAxis
                dataKey="x"
                stroke="#8b9dc3"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                name="Transaction Index"
              />
              <YAxis
                dataKey="y"
                stroke="#8b9dc3"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                scale={logScale ? "log" : "linear"}
                domain={logScale ? ["dataMin", "dataMax"] : [0, "dataMax"]}
                tickFormatter={(value) => formatGas(value)}
                name="Gas Used"
              />
              <Tooltip
                formatter={(value: number, _name: string) => [
                  formatGas(value),
                  "Gas Used",
                ]}
                labelFormatter={(value) => `Transaction #${value}`}
              />
              <Scatter
                name="PYUSD Transactions"
                data={scatterData.filter(
                  (item) => item.type === "PYUSD Transaction",
                )}
                fill="#10b981"
              />
              <Scatter
                name="Other Transactions"
                data={scatterData.filter(
                  (item) => item.type === "Other Transaction",
                )}
                fill="#3b82f6"
              />
            </ScatterChart>
          )}
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[rgba(15,20,25,0.6)] rounded-lg p-4">
          <h4 className="text-sm font-medium text-[#10b981] mb-3 flex items-center gap-2">
            <div className="w-3 h-3 bg-[#10b981] rounded-full" />
            PYUSD Transactions
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#8b9dc3]">Count:</span>
              <span className="text-[#10b981] font-medium">
                {pyusdStats.count}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8b9dc3]">Average Gas:</span>
              <span className="text-[#10b981] font-medium">
                {formatGas(pyusdStats.avg)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8b9dc3]">Min Gas:</span>
              <span className="text-[#10b981] font-medium">
                {formatGas(pyusdStats.min)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8b9dc3]">Max Gas:</span>
              <span className="text-[#10b981] font-medium">
                {formatGas(pyusdStats.max)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-[rgba(15,20,25,0.6)] rounded-lg p-4">
          <h4 className="text-sm font-medium text-[#3b82f6] mb-3 flex items-center gap-2">
            <div className="w-3 h-3 bg-[#3b82f6] rounded-full" />
            Other Transactions
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#8b9dc3]">Count:</span>
              <span className="text-[#3b82f6] font-medium">
                {otherStats.count}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8b9dc3]">Average Gas:</span>
              <span className="text-[#3b82f6] font-medium">
                {formatGas(otherStats.avg)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8b9dc3]">Min Gas:</span>
              <span className="text-[#3b82f6] font-medium">
                {formatGas(otherStats.min)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8b9dc3]">Max Gas:</span>
              <span className="text-[#3b82f6] font-medium">
                {formatGas(otherStats.max)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-[rgba(0,191,255,0.05)] border border-[rgba(0,191,255,0.1)] rounded-lg p-4">
        <h4 className="text-sm font-medium text-[#00bfff] mb-2">
          Gas Usage Analysis
        </h4>
        <div className="text-sm text-[#8b9dc3] space-y-1">
          <div>
            • PYUSD transactions represent{" "}
            <span className="text-[#10b981] font-medium">
              {((pyusdStats.count / data.length) * 100).toFixed(1)}%
            </span>{" "}
            of all transactions
          </div>
          {pyusdStats.avg > otherStats.avg ? (
            <div>
              • PYUSD transactions use{" "}
              <span className="text-[#f59e0b] font-medium">
                {(
                  ((pyusdStats.avg - otherStats.avg) / otherStats.avg) *
                  100
                ).toFixed(1)}
                %
              </span>{" "}
              more gas on average
            </div>
          ) : (
            <div>
              • PYUSD transactions use{" "}
              <span className="text-[#10b981] font-medium">
                {(
                  ((otherStats.avg - pyusdStats.avg) / otherStats.avg) *
                  100
                ).toFixed(1)}
                %
              </span>{" "}
              less gas on average
            </div>
          )}
          <div>
            • Gas efficiency can be improved by optimizing{" "}
            <span className="text-[#00bfff] font-medium">
              {pyusdStats.avg > otherStats.avg ? "PYUSD" : "regular"}
            </span>{" "}
            transaction patterns
          </div>
        </div>
      </div>
    </div>
  );
}
