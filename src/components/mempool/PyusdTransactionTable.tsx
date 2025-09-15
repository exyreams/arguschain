import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { Badge } from "@/components/global/Badge";
import { Button } from "@/components/global/Button";
import { Input } from "@/components/global/Input";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Filter,
  Search,
} from "lucide-react";
import type { PyusdTransaction } from "@/lib/mempool/types";
import { shortenAddress } from "@/lib/config";

interface PyusdTransactionTableProps {
  transactions: PyusdTransaction[];
  totalItems: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  sortConfig: { field: string; direction: "asc" | "desc" };
  searchQuery: string;
  loading?: boolean;
  onSort: (field: string) => void;
  onSearch: (query: string) => void;
  onPageChange: (page: number) => void;
  onTransactionClick?: (transaction: PyusdTransaction) => void;
  className?: string;
}

export const PyusdTransactionTable: React.FC<PyusdTransactionTableProps> = ({
  transactions,
  totalItems,
  currentPage,
  totalPages,
  pageSize,
  sortConfig,
  searchQuery,
  loading = false,
  onSort,
  onSearch,
  onPageChange,
  onTransactionClick,
  className,
}) => {
  const getSortIcon = (field: string) => {
    if (sortConfig.field !== field) {
      return <ArrowUpDown className="h-4 w-4 text-[#6b7280]" />;
    }
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="h-4 w-4 text-[#00bfff]" />
    ) : (
      <ChevronDown className="h-4 w-4 text-[#00bfff]" />
    );
  };

  const getStatusBadgeVariant = (status: "pending" | "queued") => {
    return status === "pending" ? "default" : "secondary";
  };

  const getFunctionBadgeColor = (functionName: string) => {
    const colors: Record<string, string> = {
      transfer: "bg-green-500/20 border-green-500/50 text-green-400",
      transferFrom: "bg-blue-500/20 border-blue-500/50 text-blue-400",
      approve: "bg-yellow-500/20 border-yellow-500/50 text-yellow-400",
      mint: "bg-purple-500/20 border-purple-500/50 text-purple-400",
      burn: "bg-red-500/20 border-red-500/50 text-red-400",
    };
    return (
      colors[functionName] || "bg-gray-500/20 border-gray-500/50 text-gray-400"
    );
  };

  const formatGasPrice = (gasPrice: number) => {
    return `${gasPrice.toFixed(2)} Gwei`;
  };

  const formatValue = (value?: number) => {
    if (!value || value === 0) return "-";
    return `${value.toFixed(6)} ETH`;
  };

  const openEtherscan = (hash: string) => {
    const baseUrl = "https://etherscan.io/tx/";
    window.open(`${baseUrl}${hash}`, "_blank");
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-10 bg-[rgba(25,28,40,0.6)] rounded mb-4" />
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-16 bg-[rgba(25,28,40,0.6)] rounded mb-2"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#6b7280]" />
          <Input
            placeholder="Search by hash, address, or function..."
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>

      <div className="flex items-center justify-between text-sm text-[#8b9dc3] mb-4">
        <span>
          Showing {transactions.length} of {totalItems.toLocaleString()} PYUSD
          transactions
        </span>
        <span>
          Page {currentPage} of {totalPages}
        </span>
      </div>

      <div className="border border-[rgba(0,191,255,0.2)] rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[rgba(0,191,255,0.2)] bg-[rgba(15,20,25,0.8)]">
              <TableHead
                className="cursor-pointer hover:bg-[rgba(0,191,255,0.1)] transition-colors"
                onClick={() => onSort("hash")}
              >
                <div className="flex items-center gap-2">
                  Transaction Hash
                  {getSortIcon("hash")}
                </div>
              </TableHead>

              <TableHead
                className="cursor-pointer hover:bg-[rgba(0,191,255,0.1)] transition-colors"
                onClick={() => onSort("function")}
              >
                <div className="flex items-center gap-2">
                  Function
                  {getSortIcon("function")}
                </div>
              </TableHead>

              <TableHead>From</TableHead>
              <TableHead>To</TableHead>

              <TableHead
                className="cursor-pointer hover:bg-[rgba(0,191,255,0.1)] transition-colors"
                onClick={() => onSort("gasPrice")}
              >
                <div className="flex items-center gap-2">
                  Gas Price
                  {getSortIcon("gasPrice")}
                </div>
              </TableHead>

              <TableHead
                className="cursor-pointer hover:bg-[rgba(0,191,255,0.1)] transition-colors"
                onClick={() => onSort("value")}
              >
                <div className="flex items-center gap-2">
                  Value
                  {getSortIcon("value")}
                </div>
              </TableHead>

              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-8 text-[#8b9dc3]"
                >
                  No PYUSD transactions found
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((transaction) => (
                <TableRow
                  key={transaction.hash}
                  className="border-b border-[rgba(0,191,255,0.1)] hover:bg-[rgba(25,28,40,0.6)] transition-colors cursor-pointer"
                  onClick={() => onTransactionClick?.(transaction)}
                >
                  <TableCell className="font-mono text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-[#00bfff]">
                        {shortenAddress(transaction.hash)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEtherscan(transaction.hash);
                        }}
                        className="h-6 w-6 p-0 hover:bg-[rgba(0,191,255,0.1)]"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant="outline"
                      className={getFunctionBadgeColor(
                        transaction.function.name,
                      )}
                    >
                      {transaction.function.name}
                    </Badge>
                  </TableCell>

                  <TableCell className="font-mono text-sm text-[#8b9dc3]">
                    {shortenAddress(transaction.from)}
                  </TableCell>

                  <TableCell className="font-mono text-sm text-[#8b9dc3]">
                    {shortenAddress(transaction.to)}
                  </TableCell>

                  <TableCell className="font-mono text-sm text-[#00bfff]">
                    {formatGasPrice(transaction.gasPriceGwei)}
                  </TableCell>

                  <TableCell className="font-mono text-sm">
                    {formatValue(transaction.valueEth)}
                  </TableCell>

                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(transaction.status)}>
                      {transaction.status}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEtherscan(transaction.hash);
                        }}
                        className="h-8 w-8 p-0 hover:bg-[rgba(0,191,255,0.1)]"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-[#8b9dc3]">
            Showing {(currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, totalItems)} of {totalItems}{" "}
            results
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)] disabled:opacity-50"
            >
              Previous
            </Button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(1, currentPage - 2) + i;
              if (pageNum > totalPages) return null;

              return (
                <Button
                  key={pageNum}
                  variant={pageNum === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(pageNum)}
                  className={
                    pageNum === currentPage
                      ? "bg-[#00bfff] text-[#0f1419]"
                      : "border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                  }
                >
                  {pageNum}
                </Button>
              );
            })}

            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)] disabled:opacity-50"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
