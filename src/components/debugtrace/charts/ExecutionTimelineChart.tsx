import {
  Brush,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ExecutionTimelineData } from "@/lib/debugtrace/types";
import { formatGas } from "@/lib/config";

interface ExecutionTimelineChartProps {
  data: ExecutionTimelineData[];
  height?: number;
  className?: string;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: ExecutionTimelineData;
  }>;
  label?: string;
}

interface CustomDotProps {
  cx?: number;
  cy?: number;
  payload?: ExecutionTimelineData;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[rgba(25,28,40,0.95)] border border-[rgba(0,191,255,0.3)] rounded-lg p-3 shadow-lg">
        <p className="text-[#00bfff] font-medium">Step {label}</p>
        <p className="text-white text-sm">
          Opcode:{" "}
          <span className="text-[#00bfff] font-mono">{data.opcode}</span>
        </p>
        <p className="text-white text-sm">
          Gas Used:{" "}
          <span className="text-[#00bfff]">{formatGas(data.gasUsed)}</span>
        </p>
        <p className="text-white text-sm">
          Cumulative:{" "}
          <span className="text-[#10b981]">
            {formatGas(data.cumulativeGas)}
          </span>
        </p>
        <p className="text-white text-sm">
          Depth: <span className="text-[#8b9dc3]">{data.depth}</span>
        </p>
      </div>
    );
  }
  return null;
};

const CustomDot = (props: CustomDotProps) => {
  const { cx, cy, payload } = props;

  if (!payload || cx === undefined || cy === undefined) {
    return null;
  }

  if (payload.gasUsed > 10000) {
    return (
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill="#f59e0b"
        stroke="#ffffff"
        strokeWidth={1}
        opacity={0.8}
      />
    );
  }

  return null;
};

export function ExecutionTimelineChart({
  data,
  height = 400,
  className = "",
}: ExecutionTimelineChartProps) {
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
            No execution timeline data available
          </p>
        </div>
      </div>
    );
  }

  const totalSteps = data.length;
  const maxGasStep = data.reduce(
    (max, step) => (step.gasUsed > max.gasUsed ? step : max),
    data[0]
  );
  const avgGasPerStep =
    data.reduce((sum, step) => sum + step.gasUsed, 0) / totalSteps;
  const finalCumulativeGas = data[data.length - 1]?.cumulativeGas || 0;

  return (
    <div className={`bg-[rgba(15,20,25,0.8)] rounded-lg p-4 ${className}`}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
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
            tickFormatter={(value) => formatGas(value)}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#10b981"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => formatGas(value)}
          />
          <Tooltip content={<CustomTooltip />} />

          <Line
            yAxisId="left"
            type="monotone"
            dataKey="gasUsed"
            stroke="#00bfff"
            strokeWidth={2}
            dot={<CustomDot />}
            activeDot={{
              r: 4,
              fill: "#00bfff",
              stroke: "#ffffff",
              strokeWidth: 2,
            }}
            animationDuration={1000}
          />

          <Line
            yAxisId="right"
            type="monotone"
            dataKey="cumulativeGas"
            stroke="#10b981"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            animationDuration={1000}
          />

          {data.length > 100 && (
            <Brush
              dataKey="step"
              height={30}
              stroke="#00bfff"
              fill="rgba(0,191,255,0.1)"
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-lg font-bold text-[#00bfff]">
            {totalSteps.toLocaleString()}
          </div>
          <div className="text-sm text-[#8b9dc3]">Total Steps</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-[#00bfff]">
            {formatGas(Math.round(avgGasPerStep))}
          </div>
          <div className="text-sm text-[#8b9dc3]">Avg Gas/Step</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-[#f59e0b]">
            {formatGas(maxGasStep.gasUsed)}
          </div>
          <div className="text-sm text-[#8b9dc3]">Max Gas Step</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-[#10b981]">
            {formatGas(finalCumulativeGas)}
          </div>
          <div className="text-sm text-[#8b9dc3]">Total Gas</div>
        </div>
      </div>

      <div className="mt-4 flex justify-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-[#00bfff]"></div>
          <span className="text-sm text-[#8b9dc3]">Gas per Step</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-[#10b981] border-dashed border-t"></div>
          <span className="text-sm text-[#8b9dc3]">Cumulative Gas</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-[#f59e0b] rounded-full"></div>
          <span className="text-sm text-[#8b9dc3]">High Gas Usage</span>
        </div>
      </div>

      {maxGasStep.gasUsed > avgGasPerStep * 5 && (
        <div className="mt-4 bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.3)] rounded-lg p-3">
          <div className="flex items-center gap-2 text-[#f59e0b] text-sm">
            <div className="w-2 h-2 bg-[#f59e0b] rounded-full"></div>
            <span className="font-medium">High Gas Usage Detected</span>
          </div>
          <p className="text-[#8b9dc3] text-sm mt-1">
            Step {maxGasStep.step} ({maxGasStep.opcode}) used{" "}
            {formatGas(maxGasStep.gasUsed)} gas, which is{" "}
            {Math.round(maxGasStep.gasUsed / avgGasPerStep)}x the average.
          </p>
        </div>
      )}
    </div>
  );
}
