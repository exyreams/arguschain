import React, { useMemo, useState, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ExecutionTimelineData } from "@/lib/debugtrace/types";
import { formatGas } from "@/lib/config";
import { cn } from "@/lib/utils";
import { Input } from "@/components/global";
import { ExportButton } from "../ExportButton";

interface VirtualizedExecutionStepsProps {
  data: ExecutionTimelineData[];
  height?: number;
  className?: string;
}

type SortField = "step" | "opcode" | "gasUsed" | "cumulativeGas" | "depth";
type SortDirection = "asc" | "desc";

interface StepRowProps {
  step: ExecutionTimelineData;
  isHighGas: boolean;
  avgGas: number;
}

const StepRow: React.FC<StepRowProps> = ({ step, isHighGas, avgGas }) => {
  const gasRatio = step.gasUsed / avgGas;

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-2 border-b border-[rgba(0,191,255,0.1)] hover:bg-[rgba(0,191,255,0.05)] transition-colors",
        isHighGas && "bg-[rgba(245,158,11,0.1)] border-[rgba(245,158,11,0.2)]"
      )}
    >
      <div className="w-20 text-sm text-text-secondary font-mono">
        {step.step}
      </div>

      <div className="w-52 text-sm font-mono text-[#00bfff]">{step.opcode}</div>

      <div className="w-28 text-sm text-[#00bfff]">
        {formatGas(step.gasUsed)}
      </div>

      <div className="w-28 text-sm text-[#10b981]">
        {formatGas(step.cumulativeGas)}
      </div>

      <div className="w-20 text-sm text-text-secondary">{step.depth}</div>

      <div className="flex-1">
        <div className="w-full h-2 bg-[rgba(0,191,255,0.2)] rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              gasRatio > 5
                ? "bg-[#ef4444]"
                : gasRatio > 2
                  ? "bg-[#f59e0b]"
                  : "bg-[#00bfff]"
            )}
            style={{ width: `${Math.min((gasRatio / 10) * 100, 100)}%` }}
          />
        </div>
      </div>

      {isHighGas && (
        <div className="w-3 h-3 bg-[#f59e0b] rounded-full flex-shrink-0" />
      )}
    </div>
  );
};

export function VirtualizedExecutionSteps({
  data,
  height = 400,
  className = "",
}: VirtualizedExecutionStepsProps) {
  const parentRef = React.useRef<HTMLDivElement>(null);
  const [sortField, setSortField] = useState<SortField>("step");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [filterOpcode, setFilterOpcode] = useState("");
  const [minGasFilter, setMinGasFilter] = useState("");

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDirection(sortDirection === "asc" ? "desc" : "asc");
      } else {
        setSortField(field);
        setSortDirection("asc");
      }
    },
    [sortField, sortDirection]
  );

  const { filteredAndSortedData, avgGas, highGasSteps } = useMemo(() => {
    if (!data || data.length === 0)
      return { filteredAndSortedData: [], avgGas: 0, highGasSteps: new Set() };

    // Filter data
    let filtered = data;
    if (filterOpcode) {
      filtered = filtered.filter((step) =>
        step.opcode.toLowerCase().includes(filterOpcode.toLowerCase())
      );
    }
    if (minGasFilter) {
      const minGas = parseInt(minGasFilter);
      if (!isNaN(minGas)) {
        filtered = filtered.filter((step) => step.gasUsed >= minGas);
      }
    }

    // Sort data
    const sorted = [...filtered].sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === "opcode") {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    const totalGas = data.reduce((sum, step) => sum + step.gasUsed, 0);
    const avgGas = totalGas / data.length;
    const highGasSteps = new Set(
      data.filter((step) => step.gasUsed > avgGas * 3).map((step) => step.step)
    );

    return { filteredAndSortedData: sorted, avgGas, highGasSteps };
  }, [data, sortField, sortDirection, filterOpcode, minGasFilter]);

  const virtualizer = useVirtualizer({
    count: filteredAndSortedData?.length || 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 10,
  });

  if (!data || data.length === 0) {
    return (
      <div className={cn("space-y-4", className)}>
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="w-48 h-6 bg-[rgba(0,191,255,0.2)] rounded animate-pulse" />
          <div className="flex items-center gap-3">
            <div className="w-32 h-4 bg-[rgba(0,191,255,0.1)] rounded animate-pulse" />
            <div className="w-20 h-8 bg-[rgba(0,191,255,0.1)] rounded animate-pulse" />
          </div>
        </div>

        {/* Filters skeleton */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-8 bg-[rgba(0,191,255,0.1)] rounded animate-pulse" />
          <div className="w-40 h-8 bg-[rgba(0,191,255,0.1)] rounded animate-pulse" />
        </div>

        <div className="border border-[rgba(0,191,255,0.2)] rounded-lg overflow-hidden">
          {/* Column Headers skeleton */}
          <div className="flex items-center gap-4 px-4 py-2 bg-[rgba(0,191,255,0.1)] border-b border-[rgba(0,191,255,0.2)]">
            <div className="w-20 h-4 bg-[rgba(0,191,255,0.2)] rounded animate-pulse" />
            <div className="w-48 h-4 bg-[rgba(0,191,255,0.2)] rounded animate-pulse" />
            <div className="w-28 h-4 bg-[rgba(0,191,255,0.2)] rounded animate-pulse" />
            <div className="w-28 h-4 bg-[rgba(0,191,255,0.2)] rounded animate-pulse" />
            <div className="w-16 h-4 bg-[rgba(0,191,255,0.2)] rounded animate-pulse" />
            <div className="flex-1 h-4 bg-[rgba(0,191,255,0.2)] rounded animate-pulse ml-2" />
          </div>

          {/* Table rows skeleton */}
          <div className="bg-[rgba(15,20,25,0.8)]" style={{ height }}>
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-[rgba(0,191,255,0.3)] border-t-[#00bfff] rounded-full animate-spin" />
                </div>
                <p className="text-[#8b9dc3] text-sm">
                  Processing execution steps...
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Stats skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="text-center">
              <div className="w-16 h-6 bg-[rgba(0,191,255,0.2)] rounded mx-auto mb-1 animate-pulse" />
              <div className="w-20 h-4 bg-[rgba(0,191,255,0.1)] rounded mx-auto animate-pulse" />
            </div>
          ))}
        </div>

        {/* Legend skeleton */}
        <div className="flex justify-center gap-6 text-sm">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-4 h-2 bg-[rgba(0,191,255,0.2)] rounded animate-pulse" />
              <div className="w-16 h-4 bg-[rgba(0,191,255,0.1)] rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with Export */}
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-[#00bfff]">
          Execution Steps ({filteredAndSortedData.length.toLocaleString()})
        </h4>
        <div className="flex items-center gap-3">
          <div className="text-sm text-text-secondary">
            {highGasSteps.size} high gas steps detected
          </div>
          <ExportButton
            data={filteredAndSortedData}
            filename="execution-steps"
            analysisType="structlog"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Input
            placeholder="Filter by opcode..."
            value={filterOpcode}
            onChange={(e) => setFilterOpcode(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="w-40">
          <Input
            placeholder="Min gas used..."
            value={minGasFilter}
            onChange={(e) => setMinGasFilter(e.target.value)}
            className="h-8 text-sm"
            type="number"
          />
        </div>
      </div>

      <div className="border border-[rgba(0,191,255,0.2)] rounded-lg overflow-hidden">
        {/* Column Headers with Sorting */}
        <div className="flex items-center gap-4 px-4 py-2 bg-[rgba(0,191,255,0.1)] border-b border-[rgba(0,191,255,0.2)]">
          <button
            onClick={() => handleSort("step")}
            className="w-20 text-xs font-medium text-accent-primary uppercase hover:text-white/70 transition-colors text-left"
          >
            Step {sortField === "step" && (sortDirection === "asc" ? "↑" : "↓")}
          </button>
          <button
            onClick={() => handleSort("opcode")}
            className="w-48 text-xs font-medium text-accent-primary uppercase hover:text-white/70 transition-colors text-left"
          >
            Opcode{" "}
            {sortField === "opcode" && (sortDirection === "asc" ? "↑" : "↓")}
          </button>
          <button
            onClick={() => handleSort("gasUsed")}
            className="w-28 text-xs font-medium text-accent-primary uppercase hover:text-white/70 transition-colors text-left"
          >
            Gas Used{" "}
            {sortField === "gasUsed" && (sortDirection === "asc" ? "↑" : "↓")}
          </button>
          <button
            onClick={() => handleSort("cumulativeGas")}
            className="w-28 text-xs font-medium text-accent-primary uppercase hover:text-white/70 transition-colors text-left"
          >
            Cumulative{" "}
            {sortField === "cumulativeGas" &&
              (sortDirection === "asc" ? "↑" : "↓")}
          </button>
          <button
            onClick={() => handleSort("depth")}
            className="w-16 text-xs font-medium text-accent-primary uppercase hover:text-white/70 transition-colors text-left"
          >
            Depth{" "}
            {sortField === "depth" && (sortDirection === "asc" ? "↑" : "↓")}
          </button>
          <div className="ml-2 flex-1 text-xs font-medium text-accent-primary uppercase">
            Ratio
          </div>
        </div>

        {/* Virtualized List */}
        <div
          ref={parentRef}
          className="bg-[rgba(15,20,25,0.8)] overflow-auto"
          style={{ height }}
        >
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const step = filteredAndSortedData[virtualItem.index];
              const isHighGas = highGasSteps.has(step.step);

              return (
                <div
                  key={virtualItem.key}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <StepRow step={step} isHighGas={isHighGas} avgGas={avgGas} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
        <div className="text-center">
          <div className="text-lg font-bold text-[#00bfff]">
            {filteredAndSortedData.length.toLocaleString()}
          </div>
          <div className="text-sm text-text-secondary">Filtered Steps</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-[#00bfff]">
            {formatGas(Math.round(avgGas))}
          </div>
          <div className="text-sm text-text-secondary">Avg Gas/Step</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-[#f59e0b]">
            {highGasSteps.size}
          </div>
          <div className="text-sm text-text-secondary">High Gas Steps</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-[#10b981]">
            {formatGas(data[data.length - 1]?.cumulativeGas || 0)}
          </div>
          <div className="text-sm text-text-secondary">Total Gas</div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-2 bg-[#00bfff] rounded"></div>
          <span className="text-text-secondary">Normal Gas</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-2 bg-[#f59e0b] rounded"></div>
          <span className="text-text-secondary">Moderate Gas</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-2 bg-[#ef4444] rounded"></div>
          <span className="text-text-secondary">High Gas</span>
        </div>
      </div>
    </div>
  );
}
