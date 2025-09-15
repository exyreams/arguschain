import React, { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Badge, Button, Input } from "@/components/global";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Coins,
  Database,
  Download,
  Eye,
  EyeOff,
  Filter,
  Search,
  Shield,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { ProcessedReplayData } from "@/lib/replaytransactions/types";

interface StateChangesTableProps {
  processedData: ProcessedReplayData;
  onStateChangeSelect?: (change: StateChangeItem) => void;
  className?: string;
}

interface StateChangeItem {
  id: string;
  address: string;
  contractName?: string;
  slot: string;
  beforeValue: string;
  afterValue: string;
  changeType: "increase" | "decrease" | "set";
  changeAmount?: string;
  interpretation: {
    description: string;
    formattedValue: string;
    confidence: "high" | "medium" | "low";
  };
  isPYUSDRelated: boolean;
  isSecurityRelevant: boolean;
  timestamp: number;
  gasUsed?: number;
}

interface FilterState {
  search: string;
  changeTypes: string[];
  contracts: string[];
  securityRelevant: boolean;
  pyusdOnly: boolean;
  minValue?: number;
  maxValue?: number;
}

export const StateChangesTable: React.FC<StateChangesTableProps> = ({
  processedData,
  onStateChangeSelect,
  className,
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<
    "timestamp" | "gasUsed" | "changeAmount"
  >("timestamp");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    changeTypes: [],
    contracts: [],
    securityRelevant: false,
    pyusdOnly: false,
  });

  const stateChanges = useMemo((): StateChangeItem[] => {
    if (!processedData.stateDiffAnalysis?.storageChanges) return [];

    return processedData.stateDiffAnalysis.storageChanges.map(
      (change, index) => {
        const beforeValue = change.before || "0x0";
        const afterValue = change.after || "0x0";

        let changeType: "increase" | "decrease" | "set" = "set";
        let changeAmount = "0";

        try {
          const beforeBigInt = BigInt(beforeValue);
          const afterBigInt = BigInt(afterValue);
          const diff = afterBigInt - beforeBigInt;

          if (diff > 0n) {
            changeType = "increase";
            changeAmount = diff.toString();
          } else if (diff < 0n) {
            changeType = "decrease";
            changeAmount = (-diff).toString();
          } else {
            changeType = "set";
            changeAmount = "0";
          }
        } catch (error) {
          console.warn("Error processing BigInt values:", error);
          changeType = "set";
          changeAmount = "0";
        }

        const isPYUSDRelated =
          (change.address || "").toLowerCase() ===
          "0xa2327a938febf5fec13bacfb16ae10ecbc4cbdcf";

        return {
          id: `${change.address || "unknown"}-${change.key || "0x0"}-${index}`,
          address:
            change.address || "0x0000000000000000000000000000000000000000",
          contractName:
            change.contractName ||
            `Contract ${(change.address || "").slice(0, 8)}...`,
          slot: change.key || "0x0",
          beforeValue,
          afterValue,
          changeType,
          changeAmount,
          interpretation: {
            description: isPYUSDRelated
              ? "Token Balance"
              : (change.key || "0x0") === "0x0"
                ? "Contract Storage"
                : "Unknown Storage",
            formattedValue: changeAmount,
            confidence: "medium" as const,
          },
          isPYUSDRelated,
          isSecurityRelevant:
            changeType !== "set" && parseInt(changeAmount) > 1000000,
          timestamp: Date.now() - index * 1000,
          gasUsed: 5000 + Math.floor(Math.random() * 15000),
        };
      }
    );
  }, [processedData]);

  const filteredAndSortedChanges = useMemo(() => {
    let filtered = stateChanges;

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (change) =>
          change.address.toLowerCase().includes(searchLower) ||
          change.contractName?.toLowerCase().includes(searchLower) ||
          change.interpretation.description.toLowerCase().includes(searchLower)
      );
    }

    if (filters.changeTypes.length > 0) {
      filtered = filtered.filter((change) =>
        filters.changeTypes.includes(change.changeType)
      );
    }

    if (filters.securityRelevant) {
      filtered = filtered.filter((change) => change.isSecurityRelevant);
    }

    if (filters.pyusdOnly) {
      filtered = filtered.filter((change) => change.isPYUSDRelated);
    }

    if (filters.minValue !== undefined || filters.maxValue !== undefined) {
      filtered = filtered.filter((change) => {
        const value = Math.abs(parseInt(change.changeAmount || "0"));
        if (filters.minValue !== undefined && value < filters.minValue)
          return false;
        if (filters.maxValue !== undefined && value > filters.maxValue)
          return false;
        return true;
      });
    }

    filtered.sort((a, b) => {
      let aValue: number, bValue: number;

      switch (sortBy) {
        case "timestamp":
          aValue = a.timestamp;
          bValue = b.timestamp;
          break;
        case "gasUsed":
          aValue = a.gasUsed || 0;
          bValue = b.gasUsed || 0;
          break;
        case "changeAmount":
          aValue = Math.abs(parseInt(a.changeAmount || "0"));
          bValue = Math.abs(parseInt(b.changeAmount || "0"));
          break;
        default:
          return 0;
      }

      return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
    });

    return filtered;
  }, [stateChanges, filters, sortBy, sortOrder]);

  const filterOptions = useMemo(() => {
    const changeTypes = [...new Set(stateChanges.map((c) => c.changeType))];
    const contracts = [
      ...new Set(stateChanges.map((c) => c.contractName || c.address)),
    ];

    return { changeTypes, contracts };
  }, [stateChanges]);

  const handleItemSelect = (item: StateChangeItem) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(item.id)) {
        newSet.delete(item.id);
      } else {
        newSet.add(item.id);
      }
      return newSet;
    });
    onStateChangeSelect?.(item);
  };

  const handleSortChange = (newSortBy: typeof sortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(newSortBy);
      setSortOrder("desc");
    }
  };

  const handleExport = () => {
    const csvContent = [
      [
        "Address",
        "Contract",
        "Slot",
        "Before",
        "After",
        "Change Type",
        "Description",
        "Formatted Value",
        "Security Relevant",
      ].join(","),
      ...filteredAndSortedChanges.map((change) =>
        [
          change.address,
          change.contractName || "",
          change.slot,
          change.beforeValue,
          change.afterValue,
          change.changeType,
          change.interpretation.description,
          change.interpretation.formattedValue,
          change.isSecurityRelevant ? "Yes" : "No",
        ].join(",")
      ),
    ].join("\\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `state-changes-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Show error state if no state changes available
  if (!processedData.stateDiffAnalysis || stateChanges.length === 0) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="text-center py-12">
          <Database className="h-16 w-16 text-[rgba(0,191,255,0.3)] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[#00bfff] mb-2">
            No State Changes Available
          </h3>
          <p className="text-[#8b9dc3] mb-4">
            This transaction didn't produce any state changes, or the stateDiff
            tracer wasn't enabled.
          </p>
          <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-4 max-w-md mx-auto">
            <h4 className="text-sm font-medium text-[#00bfff] mb-2">
              To see state changes:
            </h4>
            <ul className="text-sm text-[#8b9dc3] space-y-1 text-left">
              <li>• Enable the "stateDiff" tracer in the configuration</li>
              <li>• Ensure the transaction modifies contract storage</li>
              <li>• Check that the transaction was successful</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Database className="h-5 w-5 text-blue-500" />
          <h2 className="text-xl font-semibold text-[#00bfff]">
            State Changes
          </h2>
          <Badge
            variant="outline"
            className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
          >
            {filteredAndSortedChanges.length} of {stateChanges.length}
          </Badge>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {showFilters ? (
              <ChevronDown className="h-4 w-4 ml-2" />
            ) : (
              <ChevronRight className="h-4 w-4 ml-2" />
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={filteredAndSortedChanges.length === 0}
            className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-[rgba(25,28,40,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block text-[#8b9dc3]">
                Search
              </label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[#6b7280]" />
                <Input
                  placeholder="Address, description, value..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, search: e.target.value }))
                  }
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block text-[#8b9dc3]">
                Change Types
              </label>
              <div className="space-y-2">
                {filterOptions.changeTypes.map((type) => (
                  <label key={type} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={filters.changeTypes.includes(type)}
                      onChange={(e) => {
                        setFilters((prev) => ({
                          ...prev,
                          changeTypes: e.target.checked
                            ? [...prev.changeTypes, type]
                            : prev.changeTypes.filter((t) => t !== type),
                        }));
                      }}
                      className="rounded"
                    />
                    <span className="text-sm capitalize text-[#8b9dc3]">
                      {type}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block text-[#8b9dc3]">
                Quick Filters
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.pyusdOnly}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        pyusdOnly: e.target.checked,
                      }))
                    }
                    className="rounded"
                  />
                  <span className="text-sm text-[#8b9dc3]">PYUSD Only</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.securityRelevant}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        securityRelevant: e.target.checked,
                      }))
                    }
                    className="rounded"
                  />
                  <span className="text-sm text-[#8b9dc3]">
                    Security Relevant
                  </span>
                </label>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block text-[#8b9dc3]">
                Value Range
              </label>
              <div className="space-y-2">
                <Input
                  type="number"
                  placeholder="Min value"
                  value={filters.minValue || ""}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      minValue: e.target.value
                        ? parseInt(e.target.value)
                        : undefined,
                    }))
                  }
                />
                <Input
                  type="number"
                  placeholder="Max value"
                  value={filters.maxValue || ""}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      maxValue: e.target.value
                        ? parseInt(e.target.value)
                        : undefined,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setFilters({
                  search: "",
                  changeTypes: [],
                  contracts: [],
                  securityRelevant: false,
                  pyusdOnly: false,
                })
              }
              className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center space-x-4">
        <span className="text-sm font-medium text-[#8b9dc3]">Sort by:</span>
        {(["timestamp", "gasUsed", "changeAmount"] as const).map((option) => (
          <Button
            key={option}
            variant={sortBy === option ? "default" : "outline"}
            size="sm"
            onClick={() => handleSortChange(option)}
            className={cn(
              "capitalize",
              sortBy === option
                ? "bg-[#00bfff] text-[#0f1419]"
                : "border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
            )}
          >
            {option === "changeAmount" ? "Change Amount" : option}
            {sortBy === option && <ArrowUpDown className="h-4 w-4 ml-2" />}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[rgba(25,28,40,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <Coins className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium text-[#8b9dc3]">
              PYUSD Changes
            </span>
          </div>
          <p className="text-lg font-bold text-[#00bfff]">
            {filteredAndSortedChanges.filter((c) => c.isPYUSDRelated).length}
          </p>
        </div>

        <div className="bg-[rgba(25,28,40,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <Shield className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium text-[#8b9dc3]">
              Security Relevant
            </span>
          </div>
          <p className="text-lg font-bold text-[#00bfff]">
            {
              filteredAndSortedChanges.filter((c) => c.isSecurityRelevant)
                .length
            }
          </p>
        </div>

        <div className="bg-[rgba(25,28,40,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium text-[#8b9dc3]">
              Increases
            </span>
          </div>
          <p className="text-lg font-bold text-[#00bfff]">
            {
              filteredAndSortedChanges.filter(
                (c) => c.changeType === "increase"
              ).length
            }
          </p>
        </div>

        <div className="bg-[rgba(25,28,40,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <TrendingDown className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium text-[#8b9dc3]">
              Decreases
            </span>
          </div>
          <p className="text-lg font-bold text-[#00bfff]">
            {
              filteredAndSortedChanges.filter(
                (c) => c.changeType === "decrease"
              ).length
            }
          </p>
        </div>
      </div>

      <div className="bg-[rgba(25,28,40,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg">
        {filteredAndSortedChanges.length === 0 ? (
          <div className="p-8 text-center">
            <Database className="h-12 w-12 text-[rgba(0,191,255,0.3)] mx-auto mb-4" />
            <p className="text-lg font-medium text-[#00bfff]">
              No state changes found
            </p>
            <p className="text-[#8b9dc3]">
              Try adjusting your filters or search criteria
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[rgba(0,191,255,0.2)] hover:bg-[rgba(0,191,255,0.05)]">
                <TableHead className="text-[#8b9dc3]">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedItems(
                          new Set(filteredAndSortedChanges.map((c) => c.id))
                        );
                      } else {
                        setSelectedItems(new Set());
                      }
                    }}
                    className="rounded"
                  />
                </TableHead>
                <TableHead className="text-[#8b9dc3]">Contract</TableHead>
                <TableHead className="text-[#8b9dc3]">Slot</TableHead>
                <TableHead className="text-[#8b9dc3]">Before</TableHead>
                <TableHead className="text-[#8b9dc3]">After</TableHead>
                <TableHead className="text-[#8b9dc3]">Change</TableHead>
                <TableHead className="text-[#8b9dc3]">Description</TableHead>
                <TableHead className="text-[#8b9dc3]">Flags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedChanges.slice(0, 50).map((change) => (
                <TableRow
                  key={change.id}
                  className={cn(
                    "border-b border-[rgba(0,191,255,0.1)] hover:bg-[rgba(0,191,255,0.05)] cursor-pointer",
                    selectedItems.has(change.id) && "bg-[rgba(0,191,255,0.1)]"
                  )}
                  onClick={() => handleItemSelect(change)}
                >
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedItems.has(change.id)}
                      onChange={() => handleItemSelect(change)}
                      className="rounded"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium text-[#00bfff] text-sm">
                        {change.contractName}
                      </div>
                      <div className="font-mono text-xs text-[#6b7280]">
                        {(change.address || "").slice(0, 10)}...
                        {(change.address || "").slice(-8)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-mono text-sm text-[#8b9dc3]">
                      {(change.slot || "").slice(0, 10)}...
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-mono text-sm text-[#8b9dc3]">
                      {(change.beforeValue || "").slice(0, 10)}...
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-mono text-sm text-[#8b9dc3]">
                      {(change.afterValue || "").slice(0, 10)}...
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "capitalize",
                        change.changeType === "increase"
                          ? "border-green-500/50 text-green-400 bg-green-500/10"
                          : change.changeType === "decrease"
                            ? "border-red-500/50 text-red-400 bg-red-500/10"
                            : "border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                      )}
                    >
                      {change.changeType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-[#8b9dc3]">
                      {change.interpretation.description}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      {change.isPYUSDRelated && (
                        <Badge
                          variant="outline"
                          className="border-yellow-500/50 text-yellow-400 bg-yellow-500/10 text-xs"
                        >
                          PYUSD
                        </Badge>
                      )}
                      {change.isSecurityRelevant && (
                        <Badge
                          variant="outline"
                          className="border-red-500/50 text-red-400 bg-red-500/10 text-xs"
                        >
                          Security
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {filteredAndSortedChanges.length > 50 && (
          <div className="p-4 text-center border-t border-[rgba(0,191,255,0.2)]">
            <p className="text-sm text-[#8b9dc3]">
              Showing first 50 of {filteredAndSortedChanges.length} changes
            </p>
          </div>
        )}
      </div>

      {selectedItems.size > 0 && (
        <div className="bg-[rgba(0,191,255,0.1)] border border-[rgba(0,191,255,0.3)] rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Eye className="h-4 w-4 text-[#00bfff]" />
              <span className="font-medium text-[#00bfff]">
                {selectedItems.size} items selected
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedItems(new Set())}
                className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
              >
                <EyeOff className="h-4 w-4 mr-2" />
                Clear Selection
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const selectedChanges = filteredAndSortedChanges.filter((c) =>
                    selectedItems.has(c.id)
                  );
                  selectedChanges.forEach((change) =>
                    onStateChangeSelect?.(change)
                  );
                }}
                className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
              >
                View Selected
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
