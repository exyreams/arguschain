import React, { useMemo, useState } from "react";
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

interface TransactionsSectionProps {
  transactions: Transaction[];
  transactionFilter: string;
  setTransactionFilter: (filter: string) => void;
}

type SortField = "gasUsed" | "value" | "status" | "type" | "index";
type SortDirection = "asc" | "desc";

export const TransactionsSection: React.FC<TransactionsSectionProps> = ({
  transactions,
  transactionFilter,
  setTransactionFilter,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("index");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [showDetails, setShowDetails] = useState<string | null>(null);

  const filteredAndSortedTransactions = useMemo(() => {
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

    return filtered;
  }, [transactions, transactionFilter, searchTerm, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field)
      return <ArrowUpDown className="h-3 w-3 text-[#6b7280]" />;
    return sortDirection === "asc" ? (
      <TrendingUp className="h-3 w-3 text-[#00bfff]" />
    ) : (
      <TrendingDown className="h-3 w-3 text-[#00bfff]" />
    );
  };

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
        tx.type.toLowerCase().includes("pyusd"),
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

  return (
    <div className="space-y-6">
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

      <div className="bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[rgba(15,20,25,0.8)] border-b border-[rgba(0,191,255,0.2)]">
              <tr>
                <th className="text-left p-4 font-medium text-[#00bfff]">
                  <div className="flex items-center gap-2">
                    #
                    <button onClick={() => handleSort("index")}>
                      {getSortIcon("index")}
                    </button>
                  </div>
                </th>
                <th className="text-left p-4 font-medium text-[#00bfff]">
                  Hash
                </th>
                <th className="text-left p-4 font-medium text-[#00bfff]">
                  From → To
                </th>
                <th className="text-left p-4 font-medium text-[#00bfff]">
                  <div className="flex items-center gap-2">
                    Value
                    <button onClick={() => handleSort("value")}>
                      {getSortIcon("value")}
                    </button>
                  </div>
                </th>
                <th className="text-left p-4 font-medium text-[#00bfff]">
                  <div className="flex items-center gap-2">
                    Gas Used
                    <button onClick={() => handleSort("gasUsed")}>
                      {getSortIcon("gasUsed")}
                    </button>
                  </div>
                </th>
                <th className="text-left p-4 font-medium text-[#00bfff]">
                  <div className="flex items-center gap-2">
                    Type
                    <button onClick={() => handleSort("type")}>
                      {getSortIcon("type")}
                    </button>
                  </div>
                </th>
                <th className="text-left p-4 font-medium text-[#00bfff]">
                  <div className="flex items-center gap-2">
                    Status
                    <button onClick={() => handleSort("status")}>
                      {getSortIcon("status")}
                    </button>
                  </div>
                </th>
                <th className="text-left p-4 font-medium text-[#00bfff]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedTransactions.slice(0, 50).map((tx, index) => {
                const efficiency = getGasEfficiency(tx.gasUsed);
                const isExpanded = showDetails === tx.hash;

                return (
                  <React.Fragment key={tx.hash}>
                    <tr className="border-t border-[rgba(0,191,255,0.1)] hover:bg-[rgba(0,191,255,0.05)] transition-colors">
                      <td className="p-4">
                        <div className="text-sm text-[#8b9dc3] font-mono">
                          {(tx.transactionIndex || index) + 1}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-mono text-sm text-[#00bfff] hover:text-[#40d4ff] cursor-pointer">
                          {shortenAddress(tx.hash)}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="font-mono text-xs text-[#8b9dc3]">
                            {shortenAddress(tx.from)}
                          </div>
                          <div className="text-xs text-[#6b7280]">↓</div>
                          <div className="font-mono text-xs text-[#8b9dc3]">
                            {shortenAddress(tx.to)}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-3 w-3 text-[#10b981]" />
                          <span className="text-sm text-[#8b9dc3]">
                            {parseFloat(tx.value).toFixed(4)} ETH
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Flame className="h-3 w-3 text-[#ff6b35]" />
                            <span className="font-mono text-sm text-[#8b9dc3]">
                              {formatGas(tx.gasUsed)}
                            </span>
                          </div>
                          <div className={`text-xs ${efficiency.color}`}>
                            {efficiency.label}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge className={`text-xs ${getTypeColor(tx.type)}`}>
                          {tx.type}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {tx.status === "success" ? (
                            <CheckCircle className="h-4 w-4 text-[#10b981]" />
                          ) : (
                            <XCircle className="h-4 w-4 text-[#ef4444]" />
                          )}
                          <span
                            className={`text-xs font-medium ${
                              tx.status === "success"
                                ? "text-[#10b981]"
                                : "text-[#ef4444]"
                            }`}
                          >
                            {tx.status}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setShowDetails(isExpanded ? null : tx.hash)
                            }
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
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="border-t border-[rgba(0,191,255,0.1)] bg-[rgba(0,191,255,0.02)]">
                        <td colSpan={8} className="p-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-[#00bfff]">
                                Transaction Details
                              </h4>
                              <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-[#8b9dc3]">
                                    Full Hash:
                                  </span>
                                  <span className="font-mono text-[#8b9dc3]">
                                    {tx.hash}
                                  </span>
                                </div>
                                {tx.nonce && (
                                  <div className="flex justify-between">
                                    <span className="text-[#8b9dc3]">
                                      Nonce:
                                    </span>
                                    <span className="text-[#8b9dc3]">
                                      {tx.nonce}
                                    </span>
                                  </div>
                                )}
                                {tx.blockNumber && (
                                  <div className="flex justify-between">
                                    <span className="text-[#8b9dc3]">
                                      Block:
                                    </span>
                                    <span className="text-[#8b9dc3]">
                                      {tx.blockNumber}
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
                                  <span className="text-[#8b9dc3]">
                                    Gas Used:
                                  </span>
                                  <span className="text-[#8b9dc3]">
                                    {tx.gasUsed.toLocaleString()}
                                  </span>
                                </div>
                                {tx.gasPrice && (
                                  <div className="flex justify-between">
                                    <span className="text-[#8b9dc3]">
                                      Gas Price:
                                    </span>
                                    <span className="text-[#8b9dc3]">
                                      {tx.gasPrice} gwei
                                    </span>
                                  </div>
                                )}
                                <div className="flex justify-between">
                                  <span className="text-[#8b9dc3]">
                                    Efficiency:
                                  </span>
                                  <span className={efficiency.color}>
                                    {efficiency.label}
                                  </span>
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
                                  <span className="text-[#8b9dc3]">
                                    {tx.type}
                                  </span>
                                </div>
                                {tx.category && (
                                  <div className="flex justify-between">
                                    <span className="text-[#8b9dc3]">
                                      Category:
                                    </span>
                                    <span className="text-[#8b9dc3]">
                                      {tx.category}
                                    </span>
                                  </div>
                                )}
                                <div className="flex justify-between">
                                  <span className="text-[#8b9dc3]">
                                    Status:
                                  </span>
                                  <span
                                    className={
                                      tx.status === "success"
                                        ? "text-[#10b981]"
                                        : "text-[#ef4444]"
                                    }
                                  >
                                    {tx.status}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredAndSortedTransactions.length > 50 && (
          <div className="p-4 border-t border-[rgba(0,191,255,0.2)] bg-[rgba(15,20,25,0.6)]">
            <div className="text-center text-sm text-[#8b9dc3]">
              Showing first 50 transactions of{" "}
              {filteredAndSortedTransactions.length} filtered results.
              <br />
              <span className="text-xs text-[#6b7280]">
                Use export functionality to download complete data.
              </span>
            </div>
          </div>
        )}

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
    </div>
  );
};
