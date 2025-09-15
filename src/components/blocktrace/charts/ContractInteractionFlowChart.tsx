import React, { useCallback, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  CheckCircle,
  Circle,
  Eye,
  Filter,
  GitBranch,
  Hexagon,
  Layers,
  Network,
  Square,
  Triangle,
  Zap,
} from "lucide-react";
import { formatEther, formatGas } from "@/lib/config";

interface ContractCall {
  id: string;
  type:
    | "CALL"
    | "DELEGATECALL"
    | "STATICCALL"
    | "CREATE"
    | "CREATE2"
    | "SELFDESTRUCT";
  from: string;
  to: string;
  value: string;
  gasUsed: number;
  gasLimit: number;
  input: string;
  output: string;
  error?: string;
  depth: number;
  success: boolean;
  children: ContractCall[];
  methodSignature?: string;
  contractName?: string;
  functionName?: string;
  timestamp: number;
}

interface ContractInteractionFlowChartProps {
  calls: ContractCall[];
  className?: string;
  onCallClick?: (call: ContractCall) => void;
  maxDepth?: number;
}

const CallTypeIcon = ({
  type,
  success,
}: {
  type: string;
  success: boolean;
}) => {
  const iconProps = {
    className: `h-4 w-4 ${success ? "text-[#10b981]" : "text-[#ef4444]"}`,
  };

  switch (type) {
    case "CALL":
      return <Circle {...iconProps} />;
    case "DELEGATECALL":
      return <Square {...iconProps} />;
    case "STATICCALL":
      return <Triangle {...iconProps} />;
    case "CREATE":
    case "CREATE2":
      return <Hexagon {...iconProps} />;
    case "SELFDESTRUCT":
      return <AlertTriangle {...iconProps} />;
    default:
      return <Circle {...iconProps} />;
  }
};

const CallNode = ({
  call,
  onCallClick,
  isSelected = false,
  showDetails = true,
}: {
  call: ContractCall;
  onCallClick?: (call: ContractCall) => void;
  isSelected?: boolean;
  showDetails?: boolean;
}) => {
  const gasEfficiency = (call.gasUsed / call.gasLimit) * 100;
  const hasValue = parseFloat(call.value) > 0;

  const getCallTypeColor = (type: string) => {
    switch (type) {
      case "CALL":
        return "border-[#00bfff]";
      case "DELEGATECALL":
        return "border-[#8b5cf6]";
      case "STATICCALL":
        return "border-[#10b981]";
      case "CREATE":
      case "CREATE2":
        return "border-[#f59e0b]";
      case "SELFDESTRUCT":
        return "border-[#ef4444]";
      default:
        return "border-[#6b7280]";
    }
  };

  const getCallTypeBg = (type: string) => {
    switch (type) {
      case "CALL":
        return "bg-[rgba(0,191,255,0.05)]";
      case "DELEGATECALL":
        return "bg-[rgba(139,92,246,0.05)]";
      case "STATICCALL":
        return "bg-[rgba(16,185,129,0.05)]";
      case "CREATE":
      case "CREATE2":
        return "bg-[rgba(245,158,11,0.05)]";
      case "SELFDESTRUCT":
        return "bg-[rgba(239,68,68,0.05)]";
      default:
        return "bg-[rgba(107,114,128,0.05)]";
    }
  };

  return (
    <div
      className={`
        relative group cursor-pointer transition-all duration-200 rounded-lg border-2 p-3
        ${getCallTypeColor(call.type)} ${getCallTypeBg(call.type)}
        ${isSelected ? "ring-2 ring-[#00bfff] ring-opacity-50" : ""}
        ${call.success ? "" : "border-dashed"}
        hover:shadow-lg hover:scale-105
      `}
      onClick={() => onCallClick?.(call)}
      style={{ minWidth: "200px" }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <CallTypeIcon type={call.type} success={call.success} />
          <span className="text-sm font-medium text-[#00bfff]">
            {call.type}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {hasValue && <Zap className="h-3 w-3 text-[#f59e0b]" />}
          {!call.success && (
            <AlertTriangle className="h-3 w-3 text-[#ef4444]" />
          )}
        </div>
      </div>

      <div className="space-y-1 mb-3">
        {call.contractName && (
          <div className="text-xs text-[#8b9dc3]">
            <span className="font-medium">{call.contractName}</span>
          </div>
        )}
        {call.functionName && (
          <div className="text-xs text-[#00bfff] font-mono">
            {call.functionName}
          </div>
        )}
        <div className="text-xs text-[#6b7280] font-mono">
          {call.to.slice(0, 10)}...{call.to.slice(-8)}
        </div>
      </div>

      {showDetails && (
        <>
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-[#8b9dc3]">Gas:</span>
            <span className="text-white">{formatGas(call.gasUsed)}</span>
          </div>

          <div className="mb-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-[#8b9dc3]">Efficiency:</span>
              <span
                className={`${gasEfficiency > 80 ? "text-[#10b981]" : gasEfficiency > 50 ? "text-[#f59e0b]" : "text-[#ef4444]"}`}
              >
                {gasEfficiency.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-[rgba(107,114,128,0.2)] rounded-full h-1">
              <div
                className={`h-1 rounded-full transition-all duration-300 ${
                  gasEfficiency > 80
                    ? "bg-[#10b981]"
                    : gasEfficiency > 50
                      ? "bg-[#f59e0b]"
                      : "bg-[#ef4444]"
                }`}
                style={{ width: `${Math.min(100, gasEfficiency)}%` }}
              />
            </div>
          </div>

          {hasValue && (
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-[#8b9dc3]">Value:</span>
              <span className="text-[#f59e0b]">
                {formatEther(call.value)} ETH
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs">
            <span className="text-[#8b9dc3]">Status:</span>
            <div className="flex items-center gap-1">
              {call.success ? (
                <CheckCircle className="h-3 w-3 text-[#10b981]" />
              ) : (
                <AlertTriangle className="h-3 w-3 text-[#ef4444]" />
              )}
              <span
                className={call.success ? "text-[#10b981]" : "text-[#ef4444]"}
              >
                {call.success ? "Success" : "Failed"}
              </span>
            </div>
          </div>
        </>
      )}

      {call.error && (
        <div className="mt-2 p-2 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] rounded text-xs text-[#ef4444]">
          {call.error}
        </div>
      )}

      <div className="absolute -left-2 top-1/2 transform -translate-y-1/2">
        <div
          className="w-4 h-0.5 bg-[#00bfff]"
          style={{ opacity: 0.3 + call.depth * 0.1 }}
        />
      </div>
    </div>
  );
};

const FlowConnector = ({
  isVertical = true,
  hasChildren = false,
  isLast = false,
}: {
  isVertical?: boolean;
  hasChildren?: boolean;
  isLast?: boolean;
}) => {
  if (isVertical) {
    return (
      <div className="flex flex-col items-center py-2">
        <ArrowDown className="h-4 w-4 text-[#00bfff] opacity-60" />
        {hasChildren && !isLast && (
          <div className="w-0.5 h-4 bg-[#00bfff] opacity-30 mt-1" />
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center px-2">
      <ArrowRight className="h-4 w-4 text-[#00bfff] opacity-60" />
    </div>
  );
};

const CallTree = ({
  calls,
  onCallClick,
  selectedCall,
  maxDepth,
  currentDepth = 0,
}: {
  calls: ContractCall[];
  onCallClick?: (call: ContractCall) => void;
  selectedCall?: string;
  maxDepth?: number;
  currentDepth?: number;
}) => {
  if (maxDepth !== undefined && currentDepth >= maxDepth) {
    return null;
  }

  return (
    <div className="space-y-4">
      {calls.map((call, index) => (
        <div key={call.id} className="flex flex-col">
          <div style={{ marginLeft: `${currentDepth * 24}px` }}>
            <CallNode
              call={call}
              onCallClick={onCallClick}
              isSelected={selectedCall === call.id}
              showDetails={currentDepth < 3}
            />
          </div>

          {call.children.length > 0 && (
            <>
              <div style={{ marginLeft: `${currentDepth * 24 + 100}px` }}>
                <FlowConnector
                  hasChildren={call.children.length > 0}
                  isLast={index === calls.length - 1}
                />
              </div>
              <CallTree
                calls={call.children}
                onCallClick={onCallClick}
                selectedCall={selectedCall}
                maxDepth={maxDepth}
                currentDepth={currentDepth + 1}
              />
            </>
          )}
        </div>
      ))}
    </div>
  );
};

const FlowStats = ({ calls }: { calls: ContractCall[] }) => {
  const stats = useMemo(() => {
    const flatten = (calls: ContractCall[]): ContractCall[] => {
      return calls.reduce((acc, call) => {
        acc.push(call);
        if (call.children.length > 0) {
          acc.push(...flatten(call.children));
        }
        return acc;
      }, [] as ContractCall[]);
    };

    const allCalls = flatten(calls);
    const totalGas = allCalls.reduce((sum, call) => sum + call.gasUsed, 0);
    const successfulCalls = allCalls.filter((call) => call.success).length;
    const failedCalls = allCalls.length - successfulCalls;
    const maxDepth = Math.max(...allCalls.map((call) => call.depth), 0);
    const totalValue = allCalls.reduce(
      (sum, call) => sum + parseFloat(call.value),
      0,
    );

    const callTypes = allCalls.reduce(
      (acc, call) => {
        acc[call.type] = (acc[call.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalCalls: allCalls.length,
      totalGas,
      successfulCalls,
      failedCalls,
      maxDepth,
      totalValue: totalValue.toString(),
      callTypes,
    };
  }, [calls]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
      <div className="p-3 bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)] rounded-lg">
        <div className="flex items-center gap-2 mb-1">
          <Network className="h-4 w-4 text-[#00bfff]" />
          <span className="text-xs text-[#8b9dc3]">Total Calls</span>
        </div>
        <div className="text-lg font-bold text-[#00bfff]">
          {stats.totalCalls}
        </div>
      </div>

      <div className="p-3 bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)] rounded-lg">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle className="h-4 w-4 text-[#10b981]" />
          <span className="text-xs text-[#8b9dc3]">Successful</span>
        </div>
        <div className="text-lg font-bold text-[#10b981]">
          {stats.successfulCalls}
        </div>
      </div>

      <div className="p-3 bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)] rounded-lg">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="h-4 w-4 text-[#ef4444]" />
          <span className="text-xs text-[#8b9dc3]">Failed</span>
        </div>
        <div className="text-lg font-bold text-[#ef4444]">
          {stats.failedCalls}
        </div>
      </div>

      <div className="p-3 bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)] rounded-lg">
        <div className="flex items-center gap-2 mb-1">
          <Layers className="h-4 w-4 text-[#8b5cf6]" />
          <span className="text-xs text-[#8b9dc3]">Max Depth</span>
        </div>
        <div className="text-lg font-bold text-[#8b5cf6]">{stats.maxDepth}</div>
      </div>

      <div className="p-3 bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)] rounded-lg">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="h-4 w-4 text-[#f59e0b]" />
          <span className="text-xs text-[#8b9dc3]">Total Gas</span>
        </div>
        <div className="text-lg font-bold text-[#f59e0b]">
          {formatGas(stats.totalGas)}
        </div>
      </div>

      <div className="p-3 bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)] rounded-lg">
        <div className="flex items-center gap-2 mb-1">
          <Eye className="h-4 w-4 text-[#10b981]" />
          <span className="text-xs text-[#8b9dc3]">Total Value</span>
        </div>
        <div className="text-lg font-bold text-[#10b981]">
          {formatEther(stats.totalValue)} ETH
        </div>
      </div>
    </div>
  );
};

export function ContractInteractionFlowChart({
  calls,
  className = "",
  onCallClick,
  maxDepth = 10,
}: ContractInteractionFlowChartProps) {
  const [selectedCall, setSelectedCall] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"tree" | "compact">("tree");
  const [filterType, setFilterType] = useState<string>("all");

  const filteredCalls = useMemo(() => {
    if (filterType === "all") return calls;

    const filterRecursive = (calls: ContractCall[]): ContractCall[] => {
      return calls
        .filter((call) => {
          if (call.type === filterType) return true;
          if (call.children.length > 0) {
            const filteredChildren = filterRecursive(call.children);
            return filteredChildren.length > 0;
          }
          return false;
        })
        .map((call) => ({
          ...call,
          children:
            call.children.length > 0 ? filterRecursive(call.children) : [],
        }));
    };

    return filterRecursive(calls);
  }, [calls, filterType]);

  const handleCallClick = useCallback(
    (call: ContractCall) => {
      setSelectedCall(call.id);
      onCallClick?.(call);
    },
    [onCallClick],
  );

  const callTypes = useMemo(() => {
    const types = new Set<string>();
    const collectTypes = (calls: ContractCall[]) => {
      calls.forEach((call) => {
        types.add(call.type);
        if (call.children.length > 0) {
          collectTypes(call.children);
        }
      });
    };
    collectTypes(calls);
    return Array.from(types);
  }, [calls]);

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-[#00bfff]" />
          <h3 className="text-lg font-semibold text-[#00bfff]">
            Contract Interaction Flow
          </h3>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#8b9dc3]">View:</span>
            <select
              value={viewMode}
              onChange={(e) =>
                setViewMode(e.target.value as "tree" | "compact")
              }
              className="px-2 py-1 text-sm bg-[#1a1f2e] border border-[rgba(0,191,255,0.2)] rounded text-white"
            >
              <option value="tree">Tree</option>
              <option value="compact">Compact</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-[#00bfff]" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-2 py-1 text-sm bg-[#1a1f2e] border border-[rgba(0,191,255,0.2)] rounded text-white"
            >
              <option value="all">All Types</option>
              {callTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <FlowStats calls={filteredCalls} />

      <div className="bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)] rounded-lg p-6">
        {filteredCalls.length === 0 ? (
          <div className="text-center py-12 text-[#8b9dc3]">
            No contract interactions found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <CallTree
              calls={filteredCalls}
              onCallClick={handleCallClick}
              selectedCall={selectedCall}
              maxDepth={maxDepth}
            />
          </div>
        )}
      </div>

      <div className="mt-4 p-4 bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)] rounded-lg">
        <div className="text-sm font-medium text-[#8b9dc3] mb-3">
          Call Types
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-xs">
          <div className="flex items-center gap-2">
            <Circle className="h-3 w-3 text-[#00bfff]" />
            <span className="text-[#8b9dc3]">CALL - Regular call</span>
          </div>
          <div className="flex items-center gap-2">
            <Square className="h-3 w-3 text-[#8b5cf6]" />
            <span className="text-[#8b9dc3]">DELEGATECALL - Delegate call</span>
          </div>
          <div className="flex items-center gap-2">
            <Triangle className="h-3 w-3 text-[#10b981]" />
            <span className="text-[#8b9dc3]">STATICCALL - Static call</span>
          </div>
          <div className="flex items-center gap-2">
            <Hexagon className="h-3 w-3 text-[#f59e0b]" />
            <span className="text-[#8b9dc3]">CREATE - Contract creation</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3 w-3 text-[#ef4444]" />
            <span className="text-[#8b9dc3]">SELFDESTRUCT - Self destruct</span>
          </div>
        </div>
      </div>
    </div>
  );
}
