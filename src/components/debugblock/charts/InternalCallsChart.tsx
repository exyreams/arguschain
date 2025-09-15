import { useState } from "react";
import { PyusdInternalTransaction } from "@/lib/debugblock/types";
import { formatGas, shortenAddress } from "@/lib/config";
import { ChevronDown, ChevronRight, Layers, Zap } from "lucide-react";

interface InternalCallsChartProps {
  internalTransactions: PyusdInternalTransaction[];
  height?: number;
  className?: string;
}

interface CallHierarchy {
  tx_hash: string;
  calls: PyusdInternalTransaction[];
  totalGas: number;
  maxDepth: number;
}

export function InternalCallsChart({
  internalTransactions,
  height = 400,
  className = "",
}: InternalCallsChartProps) {
  const [expandedTxs, setExpandedTxs] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<"gas" | "depth" | "calls">("gas");

  if (!internalTransactions || internalTransactions.length === 0) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
            <Layers className="h-8 w-8 text-[#00bfff]" />
          </div>
          <p className="text-[#8b9dc3] text-sm">
            No internal calls data available
          </p>
        </div>
      </div>
    );
  }

  const callHierarchies: CallHierarchy[] = Object.entries(
    internalTransactions.reduce(
      (acc, call) => {
        if (!acc[call.tx_hash]) {
          acc[call.tx_hash] = [];
        }
        acc[call.tx_hash].push(call);
        return acc;
      },
      {} as Record<string, PyusdInternalTransaction[]>,
    ),
  ).map(([tx_hash, calls]) => ({
    tx_hash,
    calls: calls.sort((a, b) => a.depth - b.depth),
    totalGas: calls.reduce((sum, call) => sum + call.gas_used, 0),
    maxDepth: Math.max(...calls.map((call) => call.depth)),
  }));

  const sortedHierarchies = [...callHierarchies].sort((a, b) => {
    switch (sortBy) {
      case "gas":
        return b.totalGas - a.totalGas;
      case "depth":
        return b.maxDepth - a.maxDepth;
      case "calls":
        return b.calls.length - a.calls.length;
      default:
        return 0;
    }
  });

  const toggleExpansion = (txHash: string) => {
    const newExpanded = new Set(expandedTxs);
    if (newExpanded.has(txHash)) {
      newExpanded.delete(txHash);
    } else {
      newExpanded.add(txHash);
    }
    setExpandedTxs(newExpanded);
  };

  const getDepthColor = (depth: number) => {
    const colors = ["#00bfff", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"];
    return colors[Math.min(depth, colors.length - 1)];
  };

  const totalCalls = internalTransactions.length;
  const uniqueTransactions = callHierarchies.length;
  const totalGasUsed = internalTransactions.reduce(
    (sum, call) => sum + call.gas_used,
    0,
  );
  const averageDepth =
    internalTransactions.reduce((sum, call) => sum + call.depth, 0) /
    totalCalls;
  const maxDepth = Math.max(...internalTransactions.map((call) => call.depth));

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold text-[#00bfff]">
            Internal PYUSD Calls
          </h3>
          <p className="text-sm text-[#8b9dc3]">
            {totalCalls} internal calls across {uniqueTransactions} transactions
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as "gas" | "depth" | "calls")
            }
            className="px-3 py-1 rounded text-sm bg-[rgba(15,20,25,0.8)] text-[#8b9dc3] border border-[rgba(0,191,255,0.3)]"
          >
            <option value="gas">Sort by Gas</option>
            <option value="depth">Sort by Depth</option>
            <option value="calls">Sort by Call Count</option>
          </select>
          <button
            onClick={() =>
              setExpandedTxs(new Set(callHierarchies.map((h) => h.tx_hash)))
            }
            className="px-3 py-1 rounded text-sm bg-[rgba(15,20,25,0.8)] text-[#8b9dc3] border border-[rgba(0,191,255,0.3)] hover:bg-[rgba(0,191,255,0.1)]"
          >
            Expand All
          </button>
          <button
            onClick={() => setExpandedTxs(new Set())}
            className="px-3 py-1 rounded text-sm bg-[rgba(15,20,25,0.8)] text-[#8b9dc3] border border-[rgba(0,191,255,0.3)] hover:bg-[rgba(0,191,255,0.1)]"
          >
            Collapse All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div
            className="bg-[rgba(15,20,25,0.6)] rounded-lg border border-[rgba(0,191,255,0.2)] p-4 overflow-auto"
            style={{ height: height - 100 }}
          >
            <div className="space-y-3">
              {sortedHierarchies.map((hierarchy) => (
                <div
                  key={hierarchy.tx_hash}
                  className="border border-[rgba(0,191,255,0.1)] rounded-lg"
                >
                  <button
                    onClick={() => toggleExpansion(hierarchy.tx_hash)}
                    className="w-full flex items-center justify-between p-3 hover:bg-[rgba(0,191,255,0.05)] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {expandedTxs.has(hierarchy.tx_hash) ? (
                        <ChevronDown className="h-4 w-4 text-[#8b9dc3]" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-[#8b9dc3]" />
                      )}
                      <div className="text-left">
                        <div className="text-sm font-mono text-[#00bfff]">
                          {shortenAddress(hierarchy.tx_hash)}
                        </div>
                        <div className="text-xs text-[#8b9dc3]">
                          {hierarchy.calls.length} calls • Max depth:{" "}
                          {hierarchy.maxDepth}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-[#f59e0b]">
                        {formatGas(hierarchy.totalGas)}
                      </div>
                      <div className="text-xs text-[#6b7280]">Total Gas</div>
                    </div>
                  </button>

                  {expandedTxs.has(hierarchy.tx_hash) && (
                    <div className="border-t border-[rgba(0,191,255,0.1)] p-3">
                      <div className="space-y-2">
                        {hierarchy.calls.map((call, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-3 p-2 rounded bg-[rgba(25,28,40,0.4)]"
                            style={{ marginLeft: `${call.depth * 20}px` }}
                          >
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{
                                backgroundColor: getDepthColor(call.depth),
                              }}
                            />

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-[#8b9dc3]">
                                  {call.function}
                                </span>
                                <span className="text-[#6b7280]">→</span>
                                <span className="text-[#10b981] font-mono">
                                  {shortenAddress(call.to)}
                                </span>
                              </div>
                              <div className="text-xs text-[#6b7280]">
                                {call.to_contract} • {call.call_type}
                              </div>
                            </div>

                            <div className="text-right flex-shrink-0">
                              <div className="text-sm text-[#f59e0b]">
                                {formatGas(call.gas_used)}
                              </div>
                              <div className="text-xs text-[#6b7280]">
                                Depth {call.depth}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-[rgba(15,20,25,0.6)] rounded-lg p-4">
            <h4 className="text-sm font-medium text-[#00bfff] mb-3">
              Call Statistics
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#8b9dc3]">Total Calls:</span>
                <span className="text-[#00bfff] font-medium">{totalCalls}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8b9dc3]">Transactions:</span>
                <span className="text-[#00bfff] font-medium">
                  {uniqueTransactions}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8b9dc3]">Total Gas:</span>
                <span className="text-[#f59e0b] font-medium">
                  {formatGas(totalGasUsed)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8b9dc3]">Avg Depth:</span>
                <span className="text-[#8b5cf6] font-medium">
                  {averageDepth.toFixed(1)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8b9dc3]">Max Depth:</span>
                <span className="text-[#ef4444] font-medium">{maxDepth}</span>
              </div>
            </div>
          </div>

          <div className="bg-[rgba(15,20,25,0.6)] rounded-lg p-4">
            <h4 className="text-sm font-medium text-[#00bfff] mb-3">
              Depth Distribution
            </h4>
            <div className="space-y-2">
              {Array.from({ length: maxDepth + 1 }, (_, depth) => {
                const callsAtDepth = internalTransactions.filter(
                  (call) => call.depth === depth,
                );
                const percentage = (callsAtDepth.length / totalCalls) * 100;

                return (
                  <div key={depth} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getDepthColor(depth) }}
                    />
                    <div className="flex-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-[#8b9dc3]">Depth {depth}</span>
                        <span className="text-[#00bfff]">
                          {callsAtDepth.length}
                        </span>
                      </div>
                      <div className="w-full bg-[rgba(0,191,255,0.1)] rounded-full h-1.5 mt-1">
                        <div
                          className="h-1.5 rounded-full transition-all duration-300"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: getDepthColor(depth),
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-[rgba(15,20,25,0.6)] rounded-lg p-4">
            <h4 className="text-sm font-medium text-[#00bfff] mb-3">
              Top Functions
            </h4>
            <div className="space-y-2">
              {Object.entries(
                internalTransactions.reduce(
                  (acc, call) => {
                    acc[call.function] = (acc[call.function] || 0) + 1;
                    return acc;
                  },
                  {} as Record<string, number>,
                ),
              )
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([func, count], index) => (
                  <div
                    key={func}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[#00bfff] font-bold">
                        #{index + 1}
                      </span>
                      <span className="text-[#8b9dc3]">{func}</span>
                    </div>
                    <span className="text-[#10b981] font-medium">{count}</span>
                  </div>
                ))}
            </div>
          </div>

          <div className="bg-[rgba(15,20,25,0.6)] rounded-lg p-4">
            <h4 className="text-sm font-medium text-[#00bfff] mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Performance Insights
            </h4>
            <div className="text-sm text-[#8b9dc3] space-y-1">
              {maxDepth > 5 && (
                <div className="text-[#f59e0b]">
                  • Deep call stack detected (depth {maxDepth}) - may impact gas
                  efficiency
                </div>
              )}
              {totalGasUsed > 1000000 && (
                <div className="text-[#f59e0b]">
                  • High gas usage in internal calls - consider optimization
                </div>
              )}
              {averageDepth > 3 && (
                <div className="text-[#8b9dc3]">
                  • Complex call patterns detected - review contract
                  interactions
                </div>
              )}
              <div className="text-[#10b981]">
                •{" "}
                {(
                  (internalTransactions.filter((c) => c.depth <= 2).length /
                    totalCalls) *
                  100
                ).toFixed(0)}
                % of calls at shallow depth (≤2)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
