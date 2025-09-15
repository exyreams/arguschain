import React, { useCallback, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Badge, Button, Input } from "@/components/global";
import {
  Activity,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Coins,
  Database,
  Download,
  Eye,
  EyeOff,
  Filter,
  Minus,
  Search,
  Shield,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { FixedSizeList as List } from "react-window";
import type {
  ProcessedReplayData,
  StorageInterpretation,
} from "@/lib/replaytransactions/types";
import { StorageSlotInterpreter } from "@/lib/replaytransactions/utils/storageSlotInterpreter";

interface StateChangesExplorerProps {
  processedData: ProcessedReplayData;
  className?: string;
  onStateChangeSelect?: (change: StateChangeItem) => void;
}

interface StateChangeItem {
  id: string;
  address: string;
  contractName?: string;
  slot: string;
  beforeValue: string;
  afterValue: string;
  interpretation: StorageInterpretation;
  changeType: "increase" | "decrease" | "set" | "clear";
  changeAmount?: string;
  transactionIndex?: number;
  gasUsed?: number;
  timestamp: number;
  isSecurityRelevant: boolean;
  isPYUSDRelated: boolean;
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

const ITEM_HEIGHT = 80;
const VISIBLE_ITEMS = 10;

export const StateChangesExplorer: React.FC<StateChangesExplorerProps> = ({
  processedData,
  className,
  onStateChangeSelect,
}) => {
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    changeTypes: [],
    contracts: [],
    securityRelevant: false,
    pyusdOnly: false,
  });
  const [sortBy, setSortBy] = useState<
    "timestamp" | "gasUsed" | "changeAmount"
  >("timestamp");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const stateChanges = useMemo((): StateChangeItem[] => {
    const stateDiffAnalysis = processedData.stateDiffAnalysis;
    if (!stateDiffAnalysis || !stateDiffAnalysis.storageChanges) return [];

    const changes: StateChangeItem[] = [];

    try {
      stateDiffAnalysis.storageChanges.forEach((change, index) => {
        if (!change || !change.slot || !change.address) return;

        const interpretation = StorageSlotInterpreter.interpretPYUSDStorageSlot(
          change.slot,
          change.after || "0x0",
          change.address
        );

        // Safely handle hex conversion with fallbacks
        let beforeNum = 0;
        let afterNum = 0;

        try {
          beforeNum = change.before ? parseInt(change.before, 16) : 0;
        } catch (e) {
          beforeNum = 0;
        }

        try {
          afterNum = change.after ? parseInt(change.after, 16) : 0;
        } catch (e) {
          afterNum = 0;
        }

        const changeAmount = (afterNum - beforeNum).toString();

        let changeType: StateChangeItem["changeType"] = "set";
        if (beforeNum === 0 && afterNum > 0) changeType = "set";
        else if (beforeNum > 0 && afterNum === 0) changeType = "clear";
        else if (afterNum > beforeNum) changeType = "increase";
        else if (afterNum < beforeNum) changeType = "decrease";

        const isPYUSDRelated =
          change.address.toLowerCase() ===
          "0xa2327a938febf5fec13bacfb16ae10ecbc4cbdcf";
        const isSecurityRelevant =
          interpretation.type === "owner" ||
          interpretation.type === "paused" ||
          (interpretation.type === "total_supply" &&
            Math.abs(parseInt(changeAmount)) > 1000000);

        changes.push({
          id: `${change.address}-${change.slot}-${index}`,
          address: change.address,
          contractName: isPYUSDRelated ? "PYUSD" : undefined,
          slot: change.slot,
          beforeValue: change.before || "0x0",
          afterValue: change.after || "0x0",
          interpretation,
          changeType,
          changeAmount,
          transactionIndex: change.transactionIndex || 0,
          gasUsed: change.gasUsed || 0,
          timestamp: Date.now() - index * 1000,
          isSecurityRelevant,
          isPYUSDRelated,
        });
      });
    } catch (error) {
      console.error("Error processing state changes:", error);
      return [];
    }

    return changes;
  }, [processedData]);

  const filteredAndSortedChanges = useMemo(() => {
    let filtered = stateChanges;

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (change) =>
          change.address.toLowerCase().includes(searchLower) ||
          change.interpretation.description
            .toLowerCase()
            .includes(searchLower) ||
          change.interpretation.formattedValue
            .toLowerCase()
            .includes(searchLower) ||
          change.slot.toLowerCase().includes(searchLower)
      );
    }

    if (filters.changeTypes.length > 0) {
      filtered = filtered.filter((change) =>
        filters.changeTypes.includes(change.changeType)
      );
    }

    if (filters.contracts.length > 0) {
      filtered = filtered.filter(
        (change) =>
          filters.contracts.includes(change.address) ||
          (change.contractName &&
            filters.contracts.includes(change.contractName))
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

  const handleItemSelect = useCallback(
    (item: StateChangeItem) => {
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
    },
    [onStateChangeSelect]
  );

  const handleSortChange = useCallback(
    (newSortBy: typeof sortBy) => {
      if (sortBy === newSortBy) {
        setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        setSortBy(newSortBy);
        setSortOrder("desc");
      }
    },
    [sortBy]
  );

  const handleExport = useCallback(() => {
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
  }, [filteredAndSortedChanges]);

  const StateChangeRow = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const change = filteredAndSortedChanges[index];
      const isSelected = selectedItems.has(change.id);

      return (
        <div
          style={style}
          className={cn(
            "flex items-center space-x-4 p-4 border-b hover:bg-accent/50 cursor-pointer transition-colors",
            isSelected && "bg-accent"
          )}
          onClick={() => handleItemSelect(change)}
        >
          <div className="flex flex-col space-y-1">
            {change.isPYUSDRelated && (
              <Coins className="h-4 w-4 text-yellow-500" />
            )}
            {change.isSecurityRelevant && (
              <Shield className="h-4 w-4 text-red-500" />
            )}
            {!change.isPYUSDRelated && !change.isSecurityRelevant && (
              <Database className="h-4 w-4 text-gray-400" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium truncate">
                {change.contractName ||
                  `${change.address.slice(0, 8)}...${change.address.slice(-6)}`}
              </p>
              {change.contractName && (
                <Badge variant="outline" className="text-xs">
                  {change.contractName}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              Slot: {change.slot}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {change.changeType === "increase" && (
              <TrendingUp className="h-4 w-4 text-green-500" />
            )}
            {change.changeType === "decrease" && (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
            {change.changeType === "set" && (
              <Activity className="h-4 w-4 text-blue-500" />
            )}
            {change.changeType === "clear" && (
              <Minus className="h-4 w-4 text-gray-500" />
            )}

            <Badge
              variant={
                change.changeType === "increase"
                  ? "default"
                  : change.changeType === "decrease"
                    ? "destructive"
                    : change.changeType === "set"
                      ? "secondary"
                      : "outline"
              }
            >
              {change.changeType}
            </Badge>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {change.interpretation.description}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {change.interpretation.formattedValue}
            </p>
          </div>

          {change.gasUsed && (
            <div className="text-right">
              <p className="text-sm font-medium">
                {change.gasUsed.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">gas</p>
            </div>
          )}
        </div>
      );
    },
    [filteredAndSortedChanges, selectedItems, handleItemSelect]
  );

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
          <h2 className="text-xl font-semibold">State Changes</h2>
          <Badge variant="outline">
            {filteredAndSortedChanges.length} of {stateChanges.length}
          </Badge>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
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
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-card rounded-lg border p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
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
              <label className="text-sm font-medium mb-2 block">
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
                    <span className="text-sm capitalize">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
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
                  <span className="text-sm">PYUSD Only</span>
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
                  <span className="text-sm">Security Relevant</span>
                </label>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
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
            >
              Clear Filters
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center space-x-4">
        <span className="text-sm font-medium">Sort by:</span>
        {(["timestamp", "gasUsed", "changeAmount"] as const).map((option) => (
          <Button
            key={option}
            variant={sortBy === option ? "default" : "outline"}
            size="sm"
            onClick={() => handleSortChange(option)}
            className="capitalize"
          >
            {option === "changeAmount" ? "Change Amount" : option}
            {sortBy === option && <ArrowUpDown className="h-4 w-4 ml-2" />}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg border p-3">
          <div className="flex items-center space-x-2">
            <Coins className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium">PYUSD Changes</span>
          </div>
          <p className="text-lg font-bold">
            {filteredAndSortedChanges.filter((c) => c.isPYUSDRelated).length}
          </p>
        </div>

        <div className="bg-card rounded-lg border p-3">
          <div className="flex items-center space-x-2">
            <Shield className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium">Security Relevant</span>
          </div>
          <p className="text-lg font-bold">
            {
              filteredAndSortedChanges.filter((c) => c.isSecurityRelevant)
                .length
            }
          </p>
        </div>

        <div className="bg-card rounded-lg border p-3">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">Increases</span>
          </div>
          <p className="text-lg font-bold">
            {
              filteredAndSortedChanges.filter(
                (c) => c.changeType === "increase"
              ).length
            }
          </p>
        </div>

        <div className="bg-card rounded-lg border p-3">
          <div className="flex items-center space-x-2">
            <TrendingDown className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium">Decreases</span>
          </div>
          <p className="text-lg font-bold">
            {
              filteredAndSortedChanges.filter(
                (c) => c.changeType === "decrease"
              ).length
            }
          </p>
        </div>
      </div>

      <div className="bg-card rounded-lg border">
        {filteredAndSortedChanges.length === 0 ? (
          <div className="p-8 text-center">
            <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">No state changes found</p>
            <p className="text-muted-foreground">
              Try adjusting your filters or search criteria
            </p>
          </div>
        ) : (
          <List
            height={
              ITEM_HEIGHT *
              Math.min(VISIBLE_ITEMS, filteredAndSortedChanges.length)
            }
            itemCount={filteredAndSortedChanges.length}
            itemSize={ITEM_HEIGHT}
            itemData={filteredAndSortedChanges}
          >
            {StateChangeRow}
          </List>
        )}
      </div>

      {selectedItems.size > 0 && (
        <div className="bg-accent rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Eye className="h-4 w-4" />
              <span className="font-medium">
                {selectedItems.size} items selected
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedItems(new Set())}
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
