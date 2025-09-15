import React, { useState } from "react";
import { Badge } from "@/components/global/Badge";
import { Button } from "@/components/global/Button";
import {
  Activity,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Zap,
} from "lucide-react";
import { formatGas, shortenAddress } from "@/lib/config";
import type { ProcessedTraceAction } from "@/lib/tracetransaction/types";

interface FilteredTraceTableProps {
  traces: ProcessedTraceAction[];
  className?: string;
}

interface ExpandedRow {
  [key: number]: boolean;
}

export function FilteredTraceTable({
  traces,
  className = "",
}: FilteredTraceTableProps) {
  const [expandedRows, setExpandedRows] = useState<ExpandedRow>({});
  const [sortField, setSortField] =
    useState<keyof ProcessedTraceAction>("index");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const toggleRowExpansion = (index: number) => {
    setExpandedRows((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleSort = (field: keyof ProcessedTraceAction) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedTraces = React.useMemo(() => {
    return [...traces].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      let comparison = 0;
      if (typeof aValue === "string" && typeof bValue === "string") {
        comparison = aValue.localeCompare(bValue);
      } else if (typeof aValue === "number" && typeof bValue === "number") {
        comparison = aValue - bValue;
      } else if (typeof aValue === "boolean" && typeof bValue === "boolean") {
        comparison = aValue === bValue ? 0 : aValue ? 1 : -1;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [traces, sortField, sortDirection]);

  const SortableHeader = ({
    field,
    children,
  }: {
    field: keyof ProcessedTraceAction;
    children: React.ReactNode;
  }) => (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-[#8b9dc3] uppercase tracking-wider cursor-pointer hover:text-[#00bfff] transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          <span className="text-[#00bfff]">
            {sortDirection === "asc" ? "↑" : "↓"}
          </span>
        )}
      </div>
    </th>
  );

  if (traces.length === 0) {
    return (
      <div className={`flex items-center justify-center h-32 ${className}`}>
        <div className="text-center">
          <div className="text-[#8b9dc3] mb-2">
            No trace actions match the current filters
          </div>
          <div className="text-sm text-[#6b7280]">
            Try adjusting your filter criteria to see more results
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg overflow-hidden ${className}`}
    >
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[rgba(0,191,255,0.1)]">
          <thead className="bg-[rgba(0,191,255,0.05)]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#8b9dc3] uppercase tracking-wider w-8"></th>
              <SortableHeader field="index">#</SortableHeader>
              <SortableHeader field="type">Type</SortableHeader>
              <SortableHeader field="from">From</SortableHeader>
              <SortableHeader field="to">To</SortableHeader>
              <SortableHeader field="function">Function</SortableHeader>
              <SortableHeader field="gasUsed">Gas</SortableHeader>
              <SortableHeader field="depth">Depth</SortableHeader>
              <th className="px-4 py-3 text-left text-xs font-medium text-[#8b9dc3] uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(0,191,255,0.05)]">
            {sortedTraces.map((trace, idx) => (
              <React.Fragment key={trace.index}>
                <tr
                  className={`hover:bg-[rgba(0,191,255,0.02)] transition-colors ${
                    trace.isPyusd ? "bg-[rgba(144,238,144,0.02)]" : ""
                  } ${trace.error ? "bg-[rgba(255,99,71,0.02)]" : ""}`}
                >
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleRowExpansion(idx)}
                      className="p-1 h-6 w-6"
                    >
                      {expandedRows[idx] ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                    </Button>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-[#00bfff]">
                    {trace.index}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        trace.type === "CALL"
                          ? "border-blue-400 text-blue-400"
                          : trace.type === "DELEGATECALL"
                            ? "border-purple-400 text-purple-400"
                            : trace.type === "STATICCALL"
                              ? "border-green-400 text-green-400"
                              : trace.type === "CREATE"
                                ? "border-orange-400 text-orange-400"
                                : "border-gray-400 text-gray-400"
                      }`}
                    >
                      {trace.type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-[#8b9dc3]">
                    {shortenAddress(trace.from)}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-[#8b9dc3]">
                    {shortenAddress(trace.to)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className={`${trace.isPyusd ? "text-green-400" : "text-[#8b9dc3]"}`}
                      >
                        {trace.function !== "N/A"
                          ? trace.function.split("(")[0]
                          : trace.type}
                      </span>
                      {trace.isPyusd && (
                        <Badge
                          variant="outline"
                          className="text-xs border-green-400 text-green-400"
                        >
                          PYUSD
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-1">
                      <span className="text-[#00bfff] font-mono">
                        {formatGas(trace.gasUsed)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-1">
                      <span className="text-[#8b9dc3]">{trace.depth}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {trace.error ? (
                      <div className="flex items-center gap-1 text-red-400">
                        <AlertCircle className="h-3 w-3" />
                        <span>Error</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-green-400">
                        <span>Success</span>
                      </div>
                    )}
                  </td>
                </tr>

                {expandedRows[idx] && (
                  <tr className="bg-[rgba(0,191,255,0.02)]">
                    <td colSpan={9} className="px-2 py-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-bg-dark-primary p-4 rounded-lg">
                        <div className="space-y-2">
                          <div>
                            <span className="text-[#8b9dc3]">
                              Full From Address:
                            </span>
                            <div className="font-mono text-[#00bfff] break-all">
                              {trace.from}
                            </div>
                          </div>
                          <div>
                            <span className="text-[#8b9dc3]">
                              Full To Address:
                            </span>
                            <div className="font-mono text-[#00bfff] break-all">
                              {trace.to}
                            </div>
                          </div>
                          <div>
                            <span className="text-[#8b9dc3]">Contract:</span>
                            <div className="text-[#00bfff]">
                              {trace.contract}
                            </div>
                          </div>
                          <div>
                            <span className="text-[#8b9dc3]">Category:</span>
                            <div className="text-[#00bfff]">
                              {trace.category}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div>
                            <span className="text-[#8b9dc3]">Value (ETH):</span>
                            <div className="text-[#00bfff]">
                              {trace.valueEth.toFixed(9)} ETH
                            </div>
                          </div>
                          <div>
                            <span className="text-[#8b9dc3]">
                              Trace Address:
                            </span>
                            <div className="font-mono text-[#00bfff]">
                              [{trace.traceAddress.join(", ")}]
                            </div>
                          </div>
                          <div>
                            <span className="text-[#8b9dc3]">
                              Input Preview:
                            </span>
                            <div className="font-mono text-[#8b9dc3] text-xs break-all">
                              {trace.inputPreview}
                            </div>
                          </div>
                          {trace.error && (
                            <div>
                              <span className="text-red-400">Error:</span>
                              <div className="text-red-400 text-xs">
                                {trace.error}
                              </div>
                            </div>
                          )}
                        </div>

                        {Object.keys(trace.parameters).length > 0 && (
                          <div className="md:col-span-2 mt-4 pt-4 border-t border-[rgba(0,191,255,0.1)]">
                            <span className="text-[#8b9dc3] mb-2 block">
                              Parameters:
                            </span>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {Object.entries(trace.parameters).map(
                                ([key, value]) => (
                                  <div
                                    key={key}
                                    className="flex justify-between"
                                  >
                                    <span className="text-[#8b9dc3] text-xs">
                                      {key}:
                                    </span>
                                    <span className="text-[#00bfff] text-xs font-mono break-all ml-2">
                                      {typeof value === "object"
                                        ? JSON.stringify(value)
                                        : String(value)}
                                    </span>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-[rgba(0,191,255,0.02)] px-4 py-3 border-t border-[rgba(0,191,255,0.1)]">
        <div className="flex items-center justify-between text-sm text-[#8b9dc3]">
          <div>
            Showing {traces.length} trace action{traces.length !== 1 ? "s" : ""}
          </div>
          <div className="flex items-center gap-4">
            <div>
              PYUSD:{" "}
              <span className="text-green-400">
                {traces.filter((t) => t.isPyusd).length}
              </span>
            </div>
            <div>
              Errors:{" "}
              <span className="text-red-400">
                {traces.filter((t) => t.error).length}
              </span>
            </div>
            <div>
              Total Gas:{" "}
              <span className="text-[#00bfff]">
                {formatGas(traces.reduce((sum, t) => sum + t.gasUsed, 0))}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
