import React, { useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  Filter,
  Thermometer,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";
import { formatEther, formatGas } from "@/lib/config";

interface TransactionData {
  hash: string;
  blockNumber: number;
  transactionIndex: number;
  gasUsed: number;
  gasPrice: number;
  value: string;
  status: "success" | "failed" | "pending";
  timestamp: number;
  from: string;
  to: string;
  methodId?: string;
  gasLimit: number;
  priority: "high" | "medium" | "low";
  mevRisk: number;
}

interface TransactionHeatmapChartProps {
  transactions: TransactionData[];
  className?: string;
  onTransactionClick?: (transaction: TransactionData) => void;
}

type FilterState = {
  status: "all" | "success" | "failed" | "pending";
  priority: "all" | "high" | "medium" | "low";
  mevRisk: "all" | "high" | "medium" | "low";
};

const HeatmapCell = ({
  transaction,
  intensity,
  onClick,
  isSelected = false,
}: {
  transaction: TransactionData & { intensity: number };
  intensity: number;
  onClick?: () => void;
  isSelected?: boolean;
}) => {
  const getIntensityColor = (intensity: number, status: string) => {
    const alpha = Math.max(0.1, intensity);

    switch (status) {
      case "success":
        return `rgba(16, 185, 129, ${alpha})`;
      case "failed":
        return `rgba(239, 68, 68, ${alpha})`;
      case "pending":
        return `rgba(245, 158, 11, ${alpha})`;
      default:
        return `rgba(0, 191, 255, ${alpha})`;
    }
  };

  const getBorderColor = (status: string) => {
    switch (status) {
      case "success":
        return "border-[#10b981]";
      case "failed":
        return "border-[#ef4444]";
      case "pending":
        return "border-[#f59e0b]";
      default:
        return "border-[#00bfff]";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-3 w-3 text-[#10b981]" />;
      case "failed":
        return <XCircle className="h-3 w-3 text-[#ef4444]" />;
      case "pending":
        return <Clock className="h-3 w-3 text-[#f59e0b]" />;
      default:
        return <Activity className="h-3 w-3 text-[#00bfff]" />;
    }
  };

  const gasEfficiency = (transaction.gasUsed / transaction.gasLimit) * 100;
  const mevRiskLevel =
    transaction.mevRisk > 70
      ? "high"
      : transaction.mevRisk > 30
        ? "medium"
        : "low";

  return (
    <div
      className={`
        relative group cursor-pointer transition-all duration-200 rounded-sm border
        ${getBorderColor(transaction.status)}
        ${isSelected ? "ring-2 ring-[#00bfff] ring-opacity-50" : ""}
        hover:scale-110 hover:z-10 hover:shadow-lg
      `}
      style={{
        backgroundColor: getIntensityColor(intensity, transaction.status),
        minWidth: "24px",
        minHeight: "24px",
      }}
      onClick={onClick}
    >
      <div className="absolute top-0.5 left-0.5">
        {getStatusIcon(transaction.status)}
      </div>

      {transaction.mevRisk > 50 && (
        <div className="absolute top-0.5 right-0.5">
          <AlertCircle className="h-2 w-2 text-[#ef4444]" />
        </div>
      )}

      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-[#1a1f2e] border border-[rgba(0,191,255,0.2)] rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20 min-w-[280px]">
        <div className="text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[#8b9dc3]">Transaction</span>
            <span className="text-[#00bfff] font-mono text-[10px]">
              {transaction.hash.slice(0, 10)}...
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#8b9dc3]">Block</span>
            <span className="text-white">{transaction.blockNumber}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#8b9dc3]">Gas Used</span>
            <span className="text-white">{formatGas(transaction.gasUsed)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#8b9dc3]">Gas Price</span>
            <span className="text-white">
              {(transaction.gasPrice / 1e9).toFixed(2)} Gwei
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#8b9dc3]">Value</span>
            <span className="text-white">
              {formatEther(transaction.value)} ETH
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#8b9dc3]">Efficiency</span>
            <span
              className={`${
                gasEfficiency > 80
                  ? "text-[#10b981]"
                  : gasEfficiency > 50
                    ? "text-[#f59e0b]"
                    : "text-[#ef4444]"
              }`}
            >
              {gasEfficiency.toFixed(1)}%
            </span>
          </div>

          {transaction.mevRisk > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-[#8b9dc3]">MEV Risk</span>
              <span
                className={`${
                  mevRiskLevel === "high"
                    ? "text-[#ef4444]"
                    : mevRiskLevel === "medium"
                      ? "text-[#f59e0b]"
                      : "text-[#10b981]"
                }`}
              >
                {transaction.mevRisk.toFixed(0)}%
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-[#8b9dc3]">Status</span>
            <div className="flex items-center gap-1">
              {getStatusIcon(transaction.status)}
              <span className="capitalize text-white">
                {transaction.status}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface FilterControlsProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

const FilterControls = ({ filters, onFiltersChange }: FilterControlsProps) => {
  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)] rounded-lg">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-[#00bfff]" />
        <span className="text-sm font-medium text-[#8b9dc3]">Filters</span>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-[#8b9dc3]">Status:</label>
        <select
          value={filters.status}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              status: e.target.value as FilterState["status"],
            })
          }
          className="px-2 py-1 text-xs bg-[#1a1f2e] border border-[rgba(0,191,255,0.2)] rounded text-white"
        >
          <option value="all">All</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-[#8b9dc3]">Priority:</label>
        <select
          value={filters.priority}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              priority: e.target.value as FilterState["priority"],
            })
          }
          className="px-2 py-1 text-xs bg-[#1a1f2e] border border-[rgba(0,191,255,0.2)] rounded text-white"
        >
          <option value="all">All</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-[#8b9dc3]">MEV Risk:</label>
        <select
          value={filters.mevRisk}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              mevRisk: e.target.value as FilterState["mevRisk"],
            })
          }
          className="px-2 py-1 text-xs bg-[#1a1f2e] border border-[rgba(0,191,255,0.2)] rounded text-white"
        >
          <option value="all">All</option>
          <option value="high">High ({">"}70%)</option>
          <option value="medium">Medium (30-70%)</option>
          <option value="low">Low ({"<"}30%)</option>
        </select>
      </div>
    </div>
  );
};

export function TransactionHeatmapChart({
  transactions,
  className = "",
  onTransactionClick,
}: TransactionHeatmapChartProps) {
  const [selectedTransaction, setSelectedTransaction] = useState<string | null>(
    null,
  );
  const [filters, setFilters] = useState<FilterState>({
    status: "all",
    priority: "all",
    mevRisk: "all",
  });

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (filters.status !== "all" && tx.status !== filters.status)
        return false;
      if (filters.priority !== "all" && tx.priority !== filters.priority)
        return false;
      if (filters.mevRisk !== "all") {
        const risk = tx.mevRisk;
        if (filters.mevRisk === "high" && risk <= 70) return false;
        if (filters.mevRisk === "medium" && (risk <= 30 || risk > 70))
          return false;
        if (filters.mevRisk === "low" && risk >= 30) return false;
      }
      return true;
    });
  }, [transactions, filters]);

  const { heatmapData, stats } = useMemo(() => {
    if (filteredTransactions.length === 0) {
      return {
        heatmapData: [],
        stats: { maxGas: 0, minGas: 0, avgGas: 0, totalValue: "0" },
      };
    }

    const maxGas = Math.max(...filteredTransactions.map((tx) => tx.gasUsed));
    const minGas = Math.min(...filteredTransactions.map((tx) => tx.gasUsed));
    const avgGas =
      filteredTransactions.reduce((sum, tx) => sum + tx.gasUsed, 0) /
      filteredTransactions.length;
    const totalValue = filteredTransactions
      .reduce((sum, tx) => sum + parseFloat(tx.value), 0)
      .toString();

    const blockGroups = filteredTransactions.reduce(
      (groups, tx) => {
        if (!groups[tx.blockNumber]) {
          groups[tx.blockNumber] = [];
        }
        groups[tx.blockNumber].push(tx);
        return groups;
      },
      {} as Record<number, TransactionData[]>,
    );

    const sortedBlocks = Object.keys(blockGroups)
      .map(Number)
      .sort((a, b) => a - b);

    const heatmapData = sortedBlocks.map((blockNumber) => {
      const blockTxs = blockGroups[blockNumber].sort(
        (a, b) => a.transactionIndex - b.transactionIndex,
      );
      return {
        blockNumber,
        transactions: blockTxs.map((tx) => ({
          ...tx,
          intensity: maxGas > 0 ? tx.gasUsed / maxGas : 0,
        })),
      };
    });

    return {
      heatmapData,
      stats: { maxGas, minGas, avgGas, totalValue },
    };
  }, [filteredTransactions]);

  const handleTransactionClick = (transaction: TransactionData) => {
    setSelectedTransaction(transaction.hash);
    onTransactionClick?.(transaction);
  };

  const getStatusCounts = () => {
    const counts: Record<TransactionData["status"], number> = {
      success: 0,
      failed: 0,
      pending: 0,
    };
    filteredTransactions.forEach((tx) => {
      counts[tx.status]++;
    });
    return counts;
  };

  const statusCounts = getStatusCounts();

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Thermometer className="h-5 w-5 text-[#00bfff]" />
          <h3 className="text-lg font-semibold text-[#00bfff]">
            Transaction Heatmap
          </h3>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-[#10b981]" />
            <span className="text-[#8b9dc3]">
              {statusCounts.success} Success
            </span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-[#ef4444]" />
            <span className="text-[#8b9dc3]">{statusCounts.failed} Failed</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#f59e0b]" />
            <span className="text-[#8b9dc3]">
              {statusCounts.pending} Pending
            </span>
          </div>
        </div>
      </div>

      <FilterControls filters={filters} onFiltersChange={setFilters} />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 my-6">
        <div className="p-4 bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)] rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-[#00bfff]" />
            <span className="text-sm text-[#8b9dc3]">Max Gas</span>
          </div>
          <div className="text-xl font-bold text-[#00bfff]">
            {formatGas(stats.maxGas)}
          </div>
        </div>

        <div className="p-4 bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)] rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-[#10b981]" />
            <span className="text-sm text-[#8b9dc3]">Avg Gas</span>
          </div>
          <div className="text-xl font-bold text-[#10b981]">
            {formatGas(stats.avgGas)}
          </div>
        </div>

        <div className="p-4 bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)] rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-[#f59e0b]" />
            <span className="text-sm text-[#8b9dc3]">Total Value</span>
          </div>
          <div className="text-xl font-bold text-[#f59e0b]">
            {formatEther(stats.totalValue)} ETH
          </div>
        </div>

        <div className="p-4 bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)] rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="h-4 w-4 text-[#8b5cf6]" />
            <span className="text-sm text-[#8b9dc3]">Transactions</span>
          </div>
          <div className="text-xl font-bold text-[#8b5cf6]">
            {filteredTransactions.length}
          </div>
        </div>
      </div>

      <div className="bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)] rounded-lg p-6">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[#8b9dc3]">
              Gas Usage Intensity
            </span>
            <div className="flex items-center gap-2 text-xs text-[#6b7280]">
              <span>Low</span>
              <div className="w-20 h-2 bg-gradient-to-r from-[rgba(0,191,255,0.1)] to-[rgba(0,191,255,0.8)] rounded"></div>
              <span>High</span>
            </div>
          </div>
        </div>

        {heatmapData.length === 0 ? (
          <div className="text-center py-12 text-[#8b9dc3]">
            No transactions match the current filters
          </div>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {heatmapData.map(({ blockNumber, transactions }) => (
              <div key={blockNumber} className="flex items-center gap-2">
                <div className="w-20 text-xs text-[#8b9dc3] font-mono">
                  Block {blockNumber}
                </div>
                <div className="flex flex-wrap gap-1">
                  {transactions.map((tx) => (
                    <HeatmapCell
                      key={tx.hash}
                      transaction={tx}
                      intensity={tx.intensity}
                      onClick={() => handleTransactionClick(tx)}
                      isSelected={selectedTransaction === tx.hash}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 p-4 bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)] rounded-lg">
        <div className="text-sm font-medium text-[#8b9dc3] mb-3">Legend</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-3 w-3 text-[#10b981]" />
            <span className="text-[#8b9dc3]">Successful Transaction</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="h-3 w-3 text-[#ef4444]" />
            <span className="text-[#8b9dc3]">Failed Transaction</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3 text-[#f59e0b]" />
            <span className="text-[#8b9dc3]">Pending Transaction</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-3 w-3 text-[#ef4444]" />
            <span className="text-[#8b9dc3]">High MEV Risk</span>
          </div>
        </div>
      </div>
    </div>
  );
}
