import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BlockTransactionSummary } from "@/lib/debugblock/types";
import { formatGas, shortenAddress } from "@/lib/config";
import { Activity, BarChart3, TrendingUp, Zap } from "lucide-react";

interface BlockTransactionChartProps {
  transactions: BlockTransactionSummary[];
  height?: number;
  className?: string;
}

interface ChartDataPoint {
  index: number;
  gasUsed: number;
  isPyusd: boolean;
  failed: boolean;
  transferValue: number;
  hash: string;
  from: string;
  to: string;
}

interface CustomDotProps {
  cx?: number;
  cy?: number;
  payload?: ChartDataPoint;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: ChartDataPoint;
  }>;
  label?: string | number;
}

const CustomTooltip = ({ active, payload }: TooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[rgba(25,28,40,0.95)] border border-[rgba(0,191,255,0.3)] rounded-lg p-3 shadow-lg">
        <p className="text-[#00bfff] font-medium">Transaction #{data.index}</p>
        <div className="space-y-1 mt-2">
          <p className="text-white text-sm">
            Hash:{" "}
            <span className="text-[#8b9dc3] font-mono">
              {shortenAddress(data.hash)}
            </span>
          </p>
          <p className="text-white text-sm">
            Gas Used:{" "}
            <span className="text-[#f59e0b]">{formatGas(data.gasUsed)}</span>
          </p>
          <p className="text-white text-sm">
            From:{" "}
            <span className="text-[#8b9dc3] font-mono">
              {shortenAddress(data.from)}
            </span>
          </p>
          <p className="text-white text-sm">
            To:{" "}
            <span className="text-[#8b9dc3] font-mono">
              {shortenAddress(data.to)}
            </span>
          </p>
          {data.isPyusd && (
            <p className="text-white text-sm">
              PYUSD Value:{" "}
              <span className="text-[#10b981]">
                {(data.transferValue / 1e6).toFixed(2)}
              </span>
            </p>
          )}
          <p className="text-white text-sm">
            Status:{" "}
            <span className={data.failed ? "text-[#ef4444]" : "text-[#10b981]"}>
              {data.failed ? "Failed" : "Success"}
            </span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export function BlockTransactionChart({
  transactions,
  height = 400,
  className = "",
}: BlockTransactionChartProps) {
  const [chartType, setChartType] = useState<
    "timeline" | "distribution" | "scatter"
  >("timeline");
  const [showPyusdOnly, setShowPyusdOnly] = useState(false);

  if (!transactions || transactions.length === 0) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
            <Activity className="h-8 w-8 text-[#00bfff]" />
          </div>
          <p className="text-[#8b9dc3] text-sm">
            No transaction data available
          </p>
        </div>
      </div>
    );
  }

  const chartData: ChartDataPoint[] = transactions
    .filter((tx) => !showPyusdOnly || tx.pyusd_interaction)
    .map((tx) => ({
      index: tx.tx_index,
      gasUsed: tx.gas_used,
      isPyusd: tx.pyusd_interaction,
      failed: tx.failed,
      transferValue: tx.transfer_value,
      hash: tx.tx_hash,
      from: tx.from,
      to: tx.to,
    }));

  const totalTransactions = transactions.length;
  const pyusdTransactions = transactions.filter(
    (tx) => tx.pyusd_interaction,
  ).length;
  const failedTransactions = transactions.filter((tx) => tx.failed).length;
  const totalGasUsed = transactions.reduce((sum, tx) => sum + tx.gas_used, 0);
  const averageGas = totalGasUsed / totalTransactions;

  const createGasDistribution = () => {
    const gasValues = chartData.map((d) => d.gasUsed);
    const minGas = Math.min(...gasValues);
    const maxGas = Math.max(...gasValues);
    const binCount = 15;
    const binSize = (maxGas - minGas) / binCount;

    const bins = [];
    for (let i = 0; i < binCount; i++) {
      const binMin = minGas + i * binSize;
      const binMax = minGas + (i + 1) * binSize;
      const txsInBin = chartData.filter(
        (tx) => tx.gasUsed >= binMin && tx.gasUsed < binMax,
      );

      bins.push({
        range: `${formatGas(binMin)} - ${formatGas(binMax)}`,
        count: txsInBin.length,
        pyusdCount: txsInBin.filter((tx) => tx.isPyusd).length,
        failedCount: txsInBin.filter((tx) => tx.failed).length,
        minGas: binMin,
        maxGas: binMax,
      });
    }

    return bins.filter((bin) => bin.count > 0);
  };

  const distributionData = createGasDistribution();

  const renderChart = () => {
    switch (chartType) {
      case "timeline":
        return (
          <ResponsiveContainer width="100%" height={height - 150}>
            <LineChart
              data={chartData}
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
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#8b9dc3"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatGas(value)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="gasUsed"
                stroke="#00bfff"
                strokeWidth={2}
                dot={(props: CustomDotProps) => {
                  const { cx, cy, payload } = props;
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill={
                        payload.failed
                          ? "#ef4444"
                          : payload.isPyusd
                            ? "#10b981"
                            : "#00bfff"
                      }
                      stroke="white"
                      strokeWidth={1}
                    />
                  );
                }}
                activeDot={{ r: 6, stroke: "#00bfff", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case "distribution":
        return (
          <ResponsiveContainer width="100%" height={height - 150}>
            <BarChart
              data={distributionData}
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
              />
              <Tooltip />
              <Bar
                dataKey="count"
                name="Total"
                fill="#00bfff"
                radius={[2, 2, 0, 0]}
              />
              <Bar
                dataKey="pyusdCount"
                name="PYUSD"
                fill="#10b981"
                radius={[2, 2, 0, 0]}
              />
              <Bar
                dataKey="failedCount"
                name="Failed"
                fill="#ef4444"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        );

      case "scatter":
        return (
          <ResponsiveContainer width="100%" height={height - 150}>
            <ScatterChart
              data={chartData}
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
                tickLine={false}
                axisLine={false}
                name="Transaction Index"
              />
              <YAxis
                dataKey="gasUsed"
                stroke="#8b9dc3"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatGas(value)}
                name="Gas Used"
              />
              <Tooltip content={<CustomTooltip />} />
              <Scatter
                name="Regular Transactions"
                data={chartData.filter((d) => !d.isPyusd && !d.failed)}
                fill="#00bfff"
              />
              <Scatter
                name="PYUSD Transactions"
                data={chartData.filter((d) => d.isPyusd && !d.failed)}
                fill="#10b981"
              />
              <Scatter
                name="Failed Transactions"
                data={chartData.filter((d) => d.failed)}
                fill="#ef4444"
              />
            </ScatterChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold text-[#00bfff]">
            Block Transaction Analysis
          </h3>
          <p className="text-sm text-[#8b9dc3]">
            {chartData.length} of {totalTransactions} transactions shown
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setChartType("timeline")}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              chartType === "timeline"
                ? "bg-[rgba(0,191,255,0.2)] text-[#00bfff] border border-[rgba(0,191,255,0.3)]"
                : "bg-[rgba(15,20,25,0.8)] text-[#8b9dc3] border border-[rgba(0,191,255,0.3)] hover:bg-[rgba(0,191,255,0.1)]"
            }`}
          >
            <TrendingUp className="h-4 w-4 inline mr-1" />
            Timeline
          </button>
          <button
            onClick={() => setChartType("distribution")}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              chartType === "distribution"
                ? "bg-[rgba(0,191,255,0.2)] text-[#00bfff] border border-[rgba(0,191,255,0.3)]"
                : "bg-[rgba(15,20,25,0.8)] text-[#8b9dc3] border border-[rgba(0,191,255,0.3)] hover:bg-[rgba(0,191,255,0.1)]"
            }`}
          >
            <BarChart3 className="h-4 w-4 inline mr-1" />
            Distribution
          </button>
          <button
            onClick={() => setChartType("scatter")}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              chartType === "scatter"
                ? "bg-[rgba(0,191,255,0.2)] text-[#00bfff] border border-[rgba(0,191,255,0.3)]"
                : "bg-[rgba(15,20,25,0.8)] text-[#8b9dc3] border border-[rgba(0,191,255,0.3)] hover:bg-[rgba(0,191,255,0.1)]"
            }`}
          >
            <Zap className="h-4 w-4 inline mr-1" />
            Scatter
          </button>
          <button
            onClick={() => setShowPyusdOnly(!showPyusdOnly)}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              showPyusdOnly
                ? "bg-[rgba(16,185,129,0.2)] text-[#10b981] border border-[rgba(16,185,129,0.3)]"
                : "bg-[rgba(15,20,25,0.8)] text-[#8b9dc3] border border-[rgba(0,191,255,0.3)] hover:bg-[rgba(0,191,255,0.1)]"
            }`}
          >
            PYUSD Only
          </button>
        </div>
      </div>

      <div className="mb-6">{renderChart()}</div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[rgba(15,20,25,0.6)] rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-[#00bfff]">
            {totalTransactions}
          </div>
          <div className="text-sm text-[#8b9dc3]">Total Transactions</div>
        </div>
        <div className="bg-[rgba(15,20,25,0.6)] rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-[#10b981]">
            {pyusdTransactions}
          </div>
          <div className="text-sm text-[#8b9dc3]">PYUSD Transactions</div>
          <div className="text-xs text-[#6b7280]">
            {((pyusdTransactions / totalTransactions) * 100).toFixed(1)}%
          </div>
        </div>
        <div className="bg-[rgba(15,20,25,0.6)] rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-[#f59e0b]">
            {formatGas(averageGas)}
          </div>
          <div className="text-sm text-[#8b9dc3]">Average Gas</div>
        </div>
        <div className="bg-[rgba(15,20,25,0.6)] rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-[#ef4444]">
            {failedTransactions}
          </div>
          <div className="text-sm text-[#8b9dc3]">Failed Transactions</div>
          <div className="text-xs text-[#6b7280]">
            {((failedTransactions / totalTransactions) * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-center">
        <div className="bg-[rgba(15,20,25,0.6)] rounded-lg p-3">
          <div className="flex items-center gap-6 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[#00bfff] rounded-full"></div>
              <span className="text-[#8b9dc3]">Regular Transaction</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[#10b981] rounded-full"></div>
              <span className="text-[#8b9dc3]">PYUSD Transaction</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[#ef4444] rounded-full"></div>
              <span className="text-[#8b9dc3]">Failed Transaction</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
