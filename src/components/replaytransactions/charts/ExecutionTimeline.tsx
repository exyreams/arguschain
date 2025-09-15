import React, { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge, Button } from "@/components/global";
import { BarChart3, TrendingUp, Zap } from "lucide-react";
import type { VmTraceAnalysis } from "@/lib/replaytransactions";
import {
  getOpcodeCategory,
  VISUALIZATION_COLORS,
} from "@/lib/replaytransactions";

interface ExecutionTimelineProps {
  vmTraceAnalysis?: VmTraceAnalysis;
  className?: string;
}

type ViewMode = "timeline" | "distribution" | "cumulative";

export const ExecutionTimeline: React.FC<ExecutionTimelineProps> = ({
  vmTraceAnalysis,
  className = "",
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>("timeline");

  if (!vmTraceAnalysis) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <Zap className="h-16 w-16 text-[rgba(0,191,255,0.3)] mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-[#00bfff] mb-2">
          No VM Trace Data Available
        </h3>
        <p className="text-[#8b9dc3] mb-4">
          VM trace data is not available for this transaction.
        </p>
        <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-4 max-w-md mx-auto">
          <h4 className="text-sm font-medium text-[#00bfff] mb-2">
            To see VM traces:
          </h4>
          <ul className="text-sm text-[#8b9dc3] space-y-1 text-left">
            <li>• Enable the "vmTrace" tracer in the configuration</li>
            <li>• Ensure the RPC endpoint supports VM tracing</li>
            <li>
              • Note: VM traces are very detailed and may take longer to load
            </li>
          </ul>
        </div>
      </div>
    );
  }

  const timelineData = useMemo(() => {
    if (!vmTraceAnalysis || !vmTraceAnalysis.opcodeDistribution) return [];

    const data = vmTraceAnalysis.opcodeDistribution.map((opcode, index) => {
      const category = getOpcodeCategory(opcode.opcode);

      return {
        step: index,
        opcode: opcode.opcode,
        gasUsed: opcode.gasUsed,
        count: opcode.count,
        percentage: opcode.percentage,
        category,
        cumulativeGas: vmTraceAnalysis.opcodeDistribution
          .slice(0, index + 1)
          .reduce((sum, op) => sum + op.gasUsed, 0),
      };
    });

    return data;
  }, [vmTraceAnalysis]);

  const processedData = useMemo(() => {
    if (!vmTraceAnalysis || timelineData.length === 0) return [];

    switch (viewMode) {
      case "timeline":
        return timelineData.slice(0, 50);

      case "distribution":
        const categoryMap = new Map<
          string,
          { gasUsed: number; count: number }
        >();

        (vmTraceAnalysis.opcodeDistribution || []).forEach((opcode) => {
          const category = getOpcodeCategory(opcode.opcode);
          const existing = categoryMap.get(category);

          if (existing) {
            existing.gasUsed += opcode.gasUsed;
            existing.count += opcode.count;
          } else {
            categoryMap.set(category, {
              gasUsed: opcode.gasUsed,
              count: opcode.count,
            });
          }
        });

        return Array.from(categoryMap.entries()).map(([category, data]) => ({
          category,
          gasUsed: data.gasUsed,
          count: data.count,
          percentage: (data.gasUsed / (vmTraceAnalysis.gasUsed || 1)) * 100,
        }));

      case "cumulative":
        return timelineData.slice(0, 30).map((item, index) => ({
          ...item,
          cumulativeGas: timelineData
            .slice(0, index + 1)
            .reduce((sum, op) => sum + op.gasUsed, 0),
        }));

      default:
        return timelineData;
    }
  }, [vmTraceAnalysis, timelineData, viewMode]);

  // Show error state if no processed data available
  if (!processedData || processedData.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <BarChart3 className="h-16 w-16 text-[rgba(0,191,255,0.3)] mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-[#00bfff] mb-2">
          No VM Execution Data
        </h3>
        <p className="text-[#8b9dc3] mb-4">
          The VM trace analysis didn't produce any opcode execution data.
        </p>
        <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-4 max-w-md mx-auto">
          <h4 className="text-sm font-medium text-[#00bfff] mb-2">
            This might happen if:
          </h4>
          <ul className="text-sm text-[#8b9dc3] space-y-1 text-left">
            <li>• The transaction was a simple ETH transfer</li>
            <li>• The vmTrace tracer wasn't properly enabled</li>
            <li>• The transaction failed before execution</li>
            <li>• The RPC endpoint has limited tracing support</li>
          </ul>
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;

      return (
        <div className="bg-[rgba(25,28,40,0.95)] border border-[rgba(0,191,255,0.3)] rounded-lg p-3 text-sm">
          {viewMode === "timeline" && (
            <>
              <div className="text-[#00bfff] font-semibold mb-2">
                Step {data.step}
              </div>
              <div className="text-[#8b9dc3] mb-1">
                Opcode:{" "}
                <span className="font-mono text-[#00bfff]">{data.opcode}</span>
              </div>
              <div className="text-[#8b9dc3] mb-1">
                Category: <span className="capitalize">{data.category}</span>
              </div>
              <div className="text-[#8b9dc3] mb-1">
                Gas Used:{" "}
                <span className="text-[#00bfff]">
                  {data.gasUsed.toLocaleString()}
                </span>
              </div>
              <div className="text-[#8b9dc3]">
                Count: <span className="text-[#00bfff]">{data.count}</span>
              </div>
            </>
          )}

          {viewMode === "distribution" && (
            <>
              <div className="text-[#00bfff] font-semibold mb-2 capitalize">
                {data.category}
              </div>
              <div className="text-[#8b9dc3] mb-1">
                Gas Used:{" "}
                <span className="text-[#00bfff]">
                  {data.gasUsed.toLocaleString()}
                </span>
              </div>
              <div className="text-[#8b9dc3] mb-1">
                Operations: <span className="text-[#00bfff]">{data.count}</span>
              </div>
              <div className="text-[#8b9dc3]">
                Percentage:{" "}
                <span className="text-[#00bfff]">
                  {data.percentage.toFixed(1)}%
                </span>
              </div>
            </>
          )}

          {viewMode === "cumulative" && (
            <>
              <div className="text-[#00bfff] font-semibold mb-2">
                Step {data.step}
              </div>
              <div className="text-[#8b9dc3] mb-1">
                Opcode:{" "}
                <span className="font-mono text-[#00bfff]">{data.opcode}</span>
              </div>
              <div className="text-[#8b9dc3] mb-1">
                Step Gas:{" "}
                <span className="text-[#00bfff]">
                  {data.gasUsed.toLocaleString()}
                </span>
              </div>
              <div className="text-[#8b9dc3]">
                Cumulative:{" "}
                <span className="text-[#00bfff]">
                  {data.cumulativeGas.toLocaleString()}
                </span>
              </div>
            </>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-[#00bfff]">
            {(vmTraceAnalysis.totalSteps || 0).toLocaleString()}
          </div>
          <div className="text-sm text-[#8b9dc3]">Total Steps</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-[#00bfff]">
            {(vmTraceAnalysis.gasUsed || 0).toLocaleString()}
          </div>
          <div className="text-sm text-[#8b9dc3]">Gas Used</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-[#00bfff]">
            {vmTraceAnalysis.storageOperations || 0}
          </div>
          <div className="text-sm text-[#8b9dc3]">Storage Ops</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-[#00bfff]">
            {vmTraceAnalysis.memoryOperations || 0}
          </div>
          <div className="text-sm text-[#8b9dc3]">Memory Ops</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <Button
          variant={viewMode === "timeline" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("timeline")}
          className={
            viewMode === "timeline"
              ? "bg-[#00bfff] text-[#0f1419]"
              : "border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
          }
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          Timeline
        </Button>
        <Button
          variant={viewMode === "distribution" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("distribution")}
          className={
            viewMode === "distribution"
              ? "bg-[#00bfff] text-[#0f1419]"
              : "border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
          }
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          Distribution
        </Button>
        <Button
          variant={viewMode === "cumulative" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("cumulative")}
          className={
            viewMode === "cumulative"
              ? "bg-[#00bfff] text-[#0f1419]"
              : "border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
          }
        >
          <Zap className="h-4 w-4 mr-2" />
          Cumulative
        </Button>
      </div>

      <div className="h-80">
        {viewMode === "timeline" && processedData.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={processedData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={VISUALIZATION_COLORS.background.border}
                opacity={0.3}
              />
              <XAxis
                dataKey="step"
                stroke={VISUALIZATION_COLORS.secondary}
                fontSize={12}
              />
              <YAxis stroke={VISUALIZATION_COLORS.secondary} fontSize={12} />
              <Tooltip content={CustomTooltip} />
              <Legend />
              <Line
                type="monotone"
                dataKey="gasUsed"
                stroke={VISUALIZATION_COLORS.primary}
                strokeWidth={2}
                dot={{
                  fill: VISUALIZATION_COLORS.primary,
                  strokeWidth: 2,
                  r: 3,
                }}
                activeDot={{
                  r: 5,
                  stroke: VISUALIZATION_COLORS.primary,
                  strokeWidth: 2,
                }}
                name="Gas Used"
              />
            </LineChart>
          </ResponsiveContainer>
        )}

        {viewMode === "distribution" && processedData.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={processedData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={VISUALIZATION_COLORS.background.border}
                opacity={0.3}
              />
              <XAxis
                dataKey="category"
                stroke={VISUALIZATION_COLORS.secondary}
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis stroke={VISUALIZATION_COLORS.secondary} fontSize={12} />
              <Tooltip content={CustomTooltip} />
              <Legend />
              <Bar
                dataKey="gasUsed"
                fill={VISUALIZATION_COLORS.primary}
                name="Gas Used"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}

        {viewMode === "cumulative" && processedData.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={processedData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={VISUALIZATION_COLORS.background.border}
                opacity={0.3}
              />
              <XAxis
                dataKey="step"
                stroke={VISUALIZATION_COLORS.secondary}
                fontSize={12}
              />
              <YAxis stroke={VISUALIZATION_COLORS.secondary} fontSize={12} />
              <Tooltip content={CustomTooltip} />
              <Legend />
              <Area
                type="monotone"
                dataKey="cumulativeGas"
                stroke={VISUALIZATION_COLORS.primary}
                fill={`${VISUALIZATION_COLORS.primary}40`}
                strokeWidth={2}
                name="Cumulative Gas"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-6">
        <h4 className="text-lg font-semibold text-[#00bfff] mb-3">
          Top Gas-Consuming Opcodes
        </h4>
        {!vmTraceAnalysis.topGasOpcodes ||
        vmTraceAnalysis.topGasOpcodes.length === 0 ? (
          <div className="text-center py-8">
            <Zap className="h-12 w-12 text-[rgba(0,191,255,0.3)] mx-auto mb-3" />
            <p className="text-[#8b9dc3] text-sm">No opcode data available</p>
            <p className="text-[#6b7280] text-xs mt-1">
              VM trace analysis may be incomplete
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {vmTraceAnalysis.topGasOpcodes.slice(0, 6).map((opcode) => (
              <div
                key={opcode.opcode}
                className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge
                    variant="outline"
                    className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                  >
                    {opcode.opcode}
                  </Badge>
                  <span className="text-sm text-[#8b9dc3]">
                    {opcode.percentage.toFixed(1)}%
                  </span>
                </div>
                <div className="text-sm text-[#8b9dc3]">
                  Gas:{" "}
                  <span className="text-[#00bfff]">
                    {opcode.gasUsed.toLocaleString()}
                  </span>
                </div>
                <div className="text-sm text-[#8b9dc3]">
                  Count: <span className="text-[#00bfff]">{opcode.count}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
