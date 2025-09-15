import React, { useMemo, useState, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ArrowUpDown,
  CheckCircle,
  DollarSign,
  ExternalLink,
  Eye,
  Filter,
  Flame,
  Search,
  TrendingDown,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { Badge, Button, Input } from "@/components/global";
import { formatGas, shortenAddress } from "@/lib/config";
import { cn } from "@/lib/utils";
import { ExportButton } from "./ExportButton";

interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  gasUsed: number;
  status: "success" | "failed";
  type: string;
  gasPrice?: number;
  nonce?: number;
  blockNumber?: number;
  transactionIndex?: number;
  category?: string;
}

interface VirtualizedTransactionTableProps {
  transactions: Transaction[];
  transactionFilter: string;
  setTransactionFilter: (filter: string) => void;
  height?: number;
  className?: string;
}

type SortField = "gasUsed" | "value" | "status" | "type" | "index";
type SortDirection = "asc" | "desc";

interface TransactionRowProps {
  transaction: Transaction;
  index: number;
  isHighGas: boolean;
  onToggleDetails: (hash: string) => void;
  showDetails: boolean;
}

const TransactionRow: React.FC<TransactionRowProps> = ({
  transaction,
  index,
  isHighGas,
  onToggleDetails,
  showDetails,
}) => {
  const getTypeColor = (type: string) => {
    if (type.toLowerCase().includes("pyusd"))
      return "text-[#8b5cf6] bg-[rgba(139,92,246,0.1)] border-[rgba(139,92,246,0.3)]";
    if (type.toLowerCase().includes("contract"))
      return "text-[#00bfff] bg-[rgba(0,191,255,0.1)] border-[rgba(0,191,255,0.3)]";
    if (type.toLowerCase().includes("token"))
      return "text-[#10b981] bg-[rgba(16,185,129,0.1)] border-[rgba(16,185,129,0.3)]";
    if (type.toLowerCase().includes("defi"))
      return "text-[#f59e0b] bg-[rgba(245,158,11,0.1)] border-[rgba(245,158,11,0.3)]";
    return "text-[#8b9dc3] bg-[rgba(139,157,195,0.1)] border-[rgba(139,157,195,0.3)]";
  };

  const getGasEfficiency = (gasUsed: number) => {
    if (gasUsed < 21000) return { label: "Efficient", color: "text-[#10b981]" };
    if (gasUsed < 100000) return { label: "Normal", color: "text-[#00bfff]" };
    if (gasUsed < 500000) return { label: "High", color: "text-[#f59e0b]" };
    return { label: "Very High", color: "text-[#ef4444]" };
  };

  const efficiency = getGasEfficiency(transaction.gasUsed);

  return (
    <div
      className={cn(
        "border-b border-[rgba(0,191,255,0.1)] hover:bg-[rgba(0,191,255,0.05)] transition-colors",
        isHighGas && "bg-[rgba(245,158,11,0.05)] border-[rgba(245,158,11,0.2)]"
      )}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-16 text-sm text-[#8b9dc3] font-mono">
          {(transaction.transactionIndex || index) + 1}
        </div>

        <div className="w-32 font-mono text-sm text-[#00bfff] hover:text-[#40d4ff] cursor-pointer">
          {shortenAddress(transaction.hash)}
        </div>

        <div className="w-32 font-mono text-xs text-[#8b9dc3]">
          {shortenAddress(transaction.from)}
        </div>

        <div className="w-32 font-mono text-xs text-[#8b9dc3]">
          {shortenAddress(transaction.to)}
        </div>

        <div className="w-28 flex items-center gap-2">
          <DollarSign className="h-3 w-3 text-[#10b981]" />
          <span className="text-sm text-[#8b9dc3]">
            {parseFloat(transaction.value).toFixed(4)} ETH
          </span>
        </div>

        <div className="w-32 space-y-1">
          <div className="flex items-center gap-2">
            <Flame className="h-3 w-3 text-[#ff6b35]" />
            <span className="font-mono text-sm text-[#8b9dc3]">
              {formatGas(transaction.gasUsed)}
            </span>
          </div>
          <div className={`text-xs ${efficiency.color}`}>
            {efficiency.label}
          </div>
        </div>

        <div className="w-32">
          <Badge className={`text-xs ${getTypeColor(transaction.type)}`}>
            {transaction.type}
          </Badge>
        </div>

        <div className="w-24 flex items-center gap-2">
          {transaction.status === "success" ? (
            <CheckCircle className="h-4 w-4 text-[#10b981]" />
          ) : (
            <XCircle className="h-4 w-4 text-[#ef4444]" />
          )}
          <span
            className={`text-xs font-medium ${
              transaction.status === "success"
                ? "text-[#10b981]"
                : "text-[#ef4444]"
            }`}
          >
            {transaction.status}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleDetails(transaction.hash)}
            className="text-[#8b9dc3] hover:text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-[#8b9dc3] hover:text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {showDetails && (
        <div className="px-4 pb-4 bg-[rgba(0,191,255,0.02)]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-[#00bfff]">
                Transaction Details
              </h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#8b9dc3]">Full Hash:</span>
                  <span className="font-mono text-[#8b9dc3] break-all">
                    {transaction.hash}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8b9dc3]">From:</span>
                  <span className="font-mono text-[#8b9dc3]">
                    {transaction.from}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8b9dc3]">To:</span>
                  <span className="font-mono text-[#8b9dc3]">
                    {transaction.to}
                  </span>
                </div>
                {transaction.nonce && (
                  <div className="flex justify-between">
                    <span className="text-[#8b9dc3]">Nonce:</span>
                    <span className="text-[#8b9dc3]">{transaction.nonce}</span>
                  </div>
                )}
                {transaction.blockNumber && (
                  <div className="flex justify-between">
                    <span className="text-[#8b9dc3]">Block:</span>
                    <span className="text-[#8b9dc3]">
                      {transaction.blockNumber}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium text-[#00bfff]">
                Gas Information
              </h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#8b9dc3]">Gas Used:</span>
                  <span className="text-[#8b9dc3]">
                    {transaction.gasUsed.toLocaleString()}
                  </span>
                </div>
                {transaction.gasPrice && (
                  <div className="flex justify-between">
                    <span className="text-[#8b9dc3]">Gas Price:</span>
                    <span className="text-[#8b9dc3]">
                      {transaction.gasPrice} gwei
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#8b9dc3]">Efficiency:</span>
                  <span className={efficiency.color}>{efficiency.label}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium text-[#00bfff]">
                Classification
              </h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#8b9dc3]">Type:</span>
                  <span className="text-[#8b9dc3]">{transaction.type}</span>
                </div>
                {transaction.category && (
                  <div className="flex justify-between">
                    <span className="text-[#8b9dc3]">Category:</span>
                    <span className="text-[#8b9dc3]">
                      {transaction.category}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#8b9dc3]">Status:</span>
                  <span
                    className={
                      transaction.status === "success"
                        ? "text-[#10b981]"
                        : "text-[#ef4444]"
                    }
                  >
                    {transaction.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export function VirtualizedTransactionTable({
  transactions,
  transactionFilter,
  setTransactionFilter,
  height = 600,
  className = "",
}: VirtualizedTransactionTableProps) {
  const parentRef = React.useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("index");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [showDetails, setShowDetails] = useState<string | null>(null);

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDirection(sortDirection === "asc" ? "desc" : "asc");
      } else {
        setSortField(field);
        setSortDirection("desc");
      }
    },
    [sortField, sortDirection]
  );

  const getSortIcon = (field: SortField) => {
    if (sortField !== field)
      return <ArrowUpDown className="h-3 w-3 text-[#6b7280]" />;
    return sortDirection === "asc" ? (
      <TrendingUp className="h-3 w-3 text-[#00bfff]" />
    ) : (
      <TrendingDown className="h-3 w-3 text-[#00bfff]" />
    );
  };

  const { filteredAndSortedTransactions, highGasTransactions } = useMemo(() => {
    const filtered = transactions.filter((tx) => {
      if (transactionFilter === "success" && tx.status !== "success")
        return false;
      if (transactionFilter === "failed" && tx.status !== "failed")
        return false;
      if (
        transactionFilter === "pyusd" &&
        !tx.type.toLowerCase().includes("pyusd")
      )
        return false;
      if (transactionFilter === "high-gas" && tx.gasUsed < 500000) return false;
      if (transactionFilter === "high-value" && parseFloat(tx.value) < 1)
        return false;

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          tx.hash.toLowerCase().includes(term) ||
          tx.from.toLowerCase().includes(term) ||
          tx.to.toLowerCase().includes(term) ||
          tx.type.toLowerCase().includes(term)
        );
      }

      return true;
    });

    filtered.sort((a, b) => {
      let aVal: string | number, bVal: string | number;

      switch (sortField) {
        case "gasUsed":
          aVal = a.gasUsed;
          bVal = b.gasUsed;
          break;
        case "value":
          aVal = parseFloat(a.value);
          bVal = parseFloat(b.value);
          break;
        case "status":
          aVal = a.status;
          bVal = b.status;
          break;
        case "type":
          aVal = a.type;
          bVal = b.type;
          break;
        default:
          aVal = a.transactionIndex || 0;
          bVal = b.transactionIndex || 0;
      }

      if (sortDirection === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    const avgGas =
      transactions.reduce((sum, tx) => sum + tx.gasUsed, 0) /
      transactions.length;
    const highGasThreshold = avgGas * 2;
    const highGasTransactions = new Set(
      transactions
        .filter((tx) => tx.gasUsed > highGasThreshold)
        .map((tx) => tx.hash)
    );

    return { filteredAndSortedTransactions: filtered, highGasTransactions };
  }, [transactions, transactionFilter, searchTerm, sortField, sortDirection]);

  const virtualizer = useVirtualizer({
    count: filteredAndSortedTransactions?.length || 0,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(
      (index) => {
        const transaction = filteredAndSortedTransactions[index];
        return showDetails === transaction?.hash ? 250 : 80;
      },
      [filteredAndSortedTransactions, showDetails]
    ),
    overscan: 5,
  });

  const filterOptions = [
    { value: "all", label: "All Transactions", count: transactions.length },
    {
      value: "success",
      label: "Successful",
      count: transactions.filter((tx) => tx.status === "success").length,
    },
    {
      value: "failed",
      label: "Failed",
      count: transactions.filter((tx) => tx.status === "failed").length,
    },
    {
      value: "pyusd",
      label: "PYUSD",
      count: transactions.filter((tx) =>
        tx.type.toLowerCase().includes("pyusd")
      ).length,
    },
    {
      value: "high-gas",
      label: "High Gas (>500k)",
      count: transactions.filter((tx) => tx.gasUsed > 500000).length,
    },
    {
      value: "high-value",
      label: "High Value (>1 ETH)",
      count: transactions.filter((tx) => parseFloat(tx.value) > 1).length,
    },
  ];

  if (!transactions || transactions.length === 0) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-8">
          <div className="text-center">
            <div className="text-[#8b9dc3] mb-2">No transactions found</div>
            <div className="text-sm text-[#6b7280]">
              This block contains no transactions to analyze
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with Export */}
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-[#00bfff]">
          Transactions ({filteredAndSortedTransactions.length.toLocaleString()})
        </h4>
        <div className="flex items-center gap-3">
          <div className="text-sm text-[#8b9dc3]">
            {highGasTransactions.size} high gas transactions detected
          </div>
          <ExportButton
            data={filteredAndSortedTransactions}
            filename="block-transactions"
            analysisType="full"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-[#00bfff]" />
              <span className="text-sm font-medium text-[#8b9dc3]">
                Filter:
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTransactionFilter(option.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    transactionFilter === option.value
                      ? "bg-[rgba(0,191,255,0.2)] border border-[rgba(0,191,255,0.4)] text-[#00bfff]"
                      : "bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)] text-[#8b9dc3] hover:border-[rgba(0,191,255,0.3)]"
                  }`}
                >
                  {option.label}
                  {option.count > 0 && (
                    <span className="ml-1 text-xs opacity-75">
                      ({option.count})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#8b9dc3]" />
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64 bg-[rgba(15,20,25,0.6)] border-[rgba(0,191,255,0.2)] text-[#8b9dc3]"
              />
            </div>
            <div className="text-sm text-[#8b9dc3]">
              {filteredAndSortedTransactions.length} of {transactions.length}
            </div>
          </div>
        </div>
      </div>

      {/* Virtualized Table */}
      <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg overflow-hidden">
        {/* Column Headers */}
        <div className="flex items-center gap-3 px-4 py-3 bg-[rgba(15,20,25,0.8)] border-b border-[rgba(0,191,255,0.2)]">
          <div className="w-16 text-xs font-medium text-[#00bfff] uppercase">
            <div className="flex items-center gap-2">
              #
              <button onClick={() => handleSort("index")}>
                {getSortIcon("index")}
              </button>
            </div>
          </div>
          <div className="w-32 text-xs font-medium text-[#00bfff] uppercase">
            Hash
          </div>
          <div className="w-32 text-xs font-medium text-[#00bfff] uppercase">
            From
          </div>
          <div className="w-32 text-xs font-medium text-[#00bfff] uppercase">
            To
          </div>
          <div className="w-28 text-xs font-medium text-[#00bfff] uppercase">
            <div className="flex items-center gap-2">
              Value
              <button onClick={() => handleSort("value")}>
                {getSortIcon("value")}
              </button>
            </div>
          </div>
          <div className="w-32 text-xs font-medium text-[#00bfff] uppercase">
            <div className="flex items-center gap-2">
              Gas Used
              <button onClick={() => handleSort("gasUsed")}>
                {getSortIcon("gasUsed")}
              </button>
            </div>
          </div>
          <div className="w-32 text-xs font-medium text-[#00bfff] uppercase">
            <div className="flex items-center gap-2">
              Type
              <button onClick={() => handleSort("type")}>
                {getSortIcon("type")}
              </button>
            </div>
          </div>
          <div className="w-24 text-xs font-medium text-[#00bfff] uppercase">
            <div className="flex items-center gap-2">
              Status
              <button onClick={() => handleSort("status")}>
                {getSortIcon("status")}
              </button>
            </div>
          </div>
          <div className="text-xs font-medium text-[#00bfff] uppercase">
            Actions
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
              const transaction =
                filteredAndSortedTransactions[virtualItem.index];
              const isHighGas = highGasTransactions.has(transaction.hash);

              return (
                <div
                  key={virtualItem.key}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    minHeight: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <TransactionRow
                    transaction={transaction}
                    index={virtualItem.index}
                    isHighGas={isHighGas}
                    onToggleDetails={(hash) => {
                      const newShowDetails = showDetails === hash ? null : hash;
                      setShowDetails(newShowDetails);
                    }}
                    showDetails={showDetails === transaction.hash}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {filteredAndSortedTransactions.length === 0 && (
          <div className="p-8 text-center">
            <div className="text-[#8b9dc3] mb-2">
              No transactions match your current filters
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setTransactionFilter("all");
                setSearchTerm("");
              }}
              className="text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-lg font-bold text-[#00bfff]">
            {filteredAndSortedTransactions.length.toLocaleString()}
          </div>
          <div className="text-sm text-[#8b9dc3]">Filtered Transactions</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-[#10b981]">
            {
              filteredAndSortedTransactions.filter(
                (tx) => tx.status === "success"
              ).length
            }
          </div>
          <div className="text-sm text-[#8b9dc3]">Successful</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-[#f59e0b]">
            {
              filteredAndSortedTransactions.filter((tx) =>
                highGasTransactions.has(tx.hash)
              ).length
            }
          </div>
          <div className="text-sm text-[#8b9dc3]">High Gas</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-[#8b5cf6]">
            {
              filteredAndSortedTransactions.filter((tx) =>
                tx.type.toLowerCase().includes("pyusd")
              ).length
            }
          </div>
          <div className="text-sm text-[#8b9dc3]">PYUSD</div>
        </div>
      </div>
    </div>
  );
}
