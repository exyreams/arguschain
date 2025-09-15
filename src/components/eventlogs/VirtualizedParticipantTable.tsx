import React, {
  useCallback,
  useMemo,
  useState,
  useEffect,
  useRef,
} from "react";
import { VirtualizedChart } from "@/components/debugtrace/VirtualizedChart";
import {
  Button,
  Badge,
  Input,
  TableSkeleton,
  ProgressSkeleton,
} from "@/components/global";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  Copy,
  ExternalLink,
  Search,
  Shield,
  TrendingUp,
  Loader2,
  ChevronDown,
  ChevronUp,
  Settings,
  Zap,
} from "lucide-react";
import { VirtualizedParticipantTable } from ".";

// Define TopParticipant interface
interface TopParticipant {
  address: string;
  total_value: string;
  transactions: number;
  percentage_of_volume: number;
}

interface VirtualizedParticipantTableProps {
  participants: TopParticipant[];
  title: string;
  type: "senders" | "receivers";
  className?: string;
  virtualizationThreshold?: number;
  batchSize?: number;
  enableProgressiveLoading?: boolean;
  onLoadMore?: () => Promise<TopParticipant[]>;
  isLoading?: boolean;
  hasMore?: boolean;
}

type SortField =
  | "address"
  | "total_value"
  | "transactions"
  | "percentage_of_volume";
type SortDirection = "asc" | "desc";

interface TableState {
  sortField: SortField;
  sortDirection: SortDirection;
  searchTerm: string;
  loadedBatches: number;
  isLoadingMore: boolean;
  scrollPosition: number;
  selectedRows: Set<string>;
}

interface PerformanceMetrics {
  renderTime: number;
  scrollPerformance: number;
  memoryUsage: number;
  visibleItems: number;
}

// Utility functions
const formatPyusdValue = (value: string): string => {
  const num = parseFloat(value);
  if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M PYUSD`;
  if (num >= 1000) return `${(num / 1000).toFixed(2)}K PYUSD`;
  return `${num.toFixed(2)} PYUSD`;
};

const shortenAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Custom hook for infinite scroll
const useInfiniteScroll = (
  callback: () => void,
  hasMore: boolean,
  isLoading: boolean
) => {
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
          document.documentElement.offsetHeight - 1000 &&
        hasMore &&
        !isLoading
      ) {
        callback();
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [callback, hasMore, isLoading]);
};

export function VirtualizedParticipantTable({
  participants,
  title,
  type,
  className = "",
  virtualizationThreshold = 100,
  batchSize = 50,
  enableProgressiveLoading = true,
  onLoadMore,
  isLoading = false,
  hasMore = false,
}: VirtualizedParticipantTableProps) {
  // Use progressive data if enabled, otherwise use all data
  const displayParticipants = enableProgressiveLoading
    ? participants.slice(0, batchSize)
    : participants;

  // Infinite scroll for progressive loading
  useInfiniteScroll(
    () => {
      if (onLoadMore) {
        onLoadMore();
      }
    },
    hasMore && enableProgressiveLoading,
    isLoading
  );

  const [tableState, setTableState] = useState<TableState>({
    sortField: "total_value",
    sortDirection: "desc",
    searchTerm: "",
    loadedBatches: 1,
    isLoadingMore: false,
    scrollPosition: 0,
    selectedRows: new Set(),
  });
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [performanceMetrics, setPerformanceMetrics] =
    useState<PerformanceMetrics>({
      renderTime: 0,
      scrollPerformance: 0,
      memoryUsage: 0,
      visibleItems: 0,
    });
  const [showPerformancePanel, setShowPerformancePanel] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const renderStartTime = useRef<number>(0);
  const lastScrollTime = useRef<number>(0);

  // Progressive loading with batching
  const processedData = useMemo(() => {
    renderStartTime.current = performance.now();

    let filtered = displayParticipants;

    // Apply search filter
    if (tableState.searchTerm) {
      const searchLower = tableState.searchTerm.toLowerCase();
      filtered = displayParticipants.filter(
        (p: TopParticipant) =>
          p.address.toLowerCase().includes(searchLower) ||
          formatPyusdValue(p.total_value).toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    filtered.sort((a: TopParticipant, b: TopParticipant) => {
      let aValue: any = a[tableState.sortField];
      let bValue: any = b[tableState.sortField];

      if (tableState.sortField === "total_value") {
        aValue = parseFloat(a.total_value);
        bValue = parseFloat(b.total_value);
      }

      if (tableState.sortDirection === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    // Apply progressive loading if enabled
    if (enableProgressiveLoading && filtered.length > batchSize) {
      const loadedItems = tableState.loadedBatches * batchSize;
      filtered = filtered.slice(0, Math.min(loadedItems, filtered.length));
    }

    // Update performance metrics
    const renderTime = performance.now() - renderStartTime.current;
    setPerformanceMetrics((prev) => ({
      ...prev,
      renderTime,
      visibleItems: filtered.length,
    }));

    return filtered;
  }, [displayParticipants, tableState, enableProgressiveLoading, batchSize]);

  // Memory usage monitoring
  useEffect(() => {
    const updateMemoryUsage = () => {
      if ("memory" in performance) {
        const memInfo = (performance as any).memory;
        setPerformanceMetrics((prev) => ({
          ...prev,
          memoryUsage: memInfo.usedJSHeapSize / 1024 / 1024, // MB
        }));
      }
    };

    const interval = setInterval(updateMemoryUsage, 2000);
    return () => clearInterval(interval);
  }, []);

  // Scroll performance monitoring
  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const currentTime = performance.now();
      const scrollDelta = currentTime - lastScrollTime.current;
      lastScrollTime.current = currentTime;

      setPerformanceMetrics((prev) => ({
        ...prev,
        scrollPerformance: scrollDelta,
      }));

      setTableState((prev) => ({
        ...prev,
        scrollPosition: event.currentTarget.scrollTop,
      }));

      // Load more data when near bottom
      if (enableProgressiveLoading && hasMore && !tableState.isLoadingMore) {
        const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
        const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

        if (scrollPercentage > 0.8) {
          loadMoreData();
        }
      }
    },
    [enableProgressiveLoading, hasMore, tableState.isLoadingMore]
  );

  // Load more data function
  const loadMoreData = useCallback(async () => {
    if (tableState.isLoadingMore || !onLoadMore) return;

    setTableState((prev) => ({ ...prev, isLoadingMore: true }));

    try {
      await onLoadMore();
      setTableState((prev) => ({
        ...prev,
        loadedBatches: prev.loadedBatches + 1,
        isLoadingMore: false,
      }));
    } catch (error) {
      console.error("Failed to load more data:", error);
      setTableState((prev) => ({ ...prev, isLoadingMore: false }));
    }
  }, [tableState.isLoadingMore, onLoadMore]);

  const handleSearch = useCallback((value: string) => {
    setTableState((prev) => ({ ...prev, searchTerm: value }));
  }, []);

  const handleSort = useCallback((field: SortField) => {
    setTableState((prev) => ({
      ...prev,
      sortField: field,
      sortDirection:
        prev.sortField === field && prev.sortDirection === "desc"
          ? "asc"
          : "desc",
    }));
  }, []);

  const handleCopyAddress = useCallback(async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (error) {
      console.error("Failed to copy address:", error);
    }
  }, []);

  const getParticipantCategory = useCallback((participant: TopParticipant) => {
    const value = parseFloat(participant.total_value);
    const txCount = participant.transactions;

    if (value > 1000000) return "whale";
    if (txCount > 100) return "frequent_trader";
    if (txCount === 1) return "one_time_user";
    return "regular";
  }, []);

  const renderTableRow = useCallback(
    (participant: TopParticipant, index: number) => {
      const category = getParticipantCategory(participant);
      const isEven = index % 2 === 0;

      return (
        <tr
          key={participant.address}
          className={`
            border-b border-[rgba(0,191,255,0.1)] transition-colors hover:bg-[rgba(0,191,255,0.05)]
            ${isEven ? "bg-[rgba(15,20,25,0.3)]" : "bg-[rgba(15,20,25,0.5)]"}
          `}
        >
          <td className="px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-[#e2e8f0]">
                    {shortenAddress(participant.address)}
                  </span>
                  <button
                    onClick={() => handleCopyAddress(participant.address)}
                    className="text-[#8b9dc3] hover:text-[#00bfff] transition-colors"
                    title="Copy address"
                  >
                    {copiedAddress === participant.address ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                  <a
                    href={`https://etherscan.io/address/${participant.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#8b9dc3] hover:text-[#00bfff] transition-colors"
                    title="View on Etherscan"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <Badge
                  variant={
                    category === "whale"
                      ? "destructive"
                      : category === "frequent_trader"
                        ? "default"
                        : "secondary"
                  }
                  className="text-xs w-fit mt-1"
                >
                  {category.replace("_", " ")}
                </Badge>
              </div>
            </div>
          </td>
          <td className="px-4 py-3 text-right">
            <div className="flex flex-col items-end">
              <span className="text-[#e2e8f0] font-medium">
                {formatPyusdValue(participant.total_value)}
              </span>
              <span className="text-xs text-[#8b9dc3]">
                {participant.percentage_of_volume.toFixed(2)}%
              </span>
            </div>
          </td>
          <td className="px-4 py-3 text-right">
            <div className="flex items-center justify-end gap-2">
              <span className="text-[#e2e8f0]">{participant.transactions}</span>
              {participant.transactions > 50 && (
                <TrendingUp className="h-3 w-3 text-green-400" />
              )}
            </div>
          </td>
        </tr>
      );
    },
    [getParticipantCategory, handleCopyAddress, copiedAddress]
  );

  const renderVirtualizedTable = useCallback(
    (data: TopParticipant[], startIndex: number, endIndex: number) => {
      return (
        <div className="overflow-hidden rounded-lg border border-[rgba(0,191,255,0.2)]">
          <table className="w-full">
            <thead className="bg-[rgba(15,20,25,0.8)] border-b border-[rgba(0,191,255,0.2)]">
              <tr>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort("address")}
                    className="flex items-center gap-2 text-[#8b9dc3] hover:text-[#00bfff] transition-colors"
                  >
                    Address
                    {tableState.sortField === "address" &&
                      (tableState.sortDirection === "desc" ? (
                        <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUp className="h-3 w-3" />
                      ))}
                    {tableState.sortField !== "address" && (
                      <ArrowUpDown className="h-3 w-3 opacity-50" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleSort("total_value")}
                    className="flex items-center gap-2 text-[#8b9dc3] hover:text-[#00bfff] transition-colors ml-auto"
                  >
                    Total Value
                    {tableState.sortField === "total_value" &&
                      (tableState.sortDirection === "desc" ? (
                        <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUp className="h-3 w-3" />
                      ))}
                    {tableState.sortField !== "total_value" && (
                      <ArrowUpDown className="h-3 w-3 opacity-50" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleSort("transactions")}
                    className="flex items-center gap-2 text-[#8b9dc3] hover:text-[#00bfff] transition-colors ml-auto"
                  >
                    Transactions
                    {tableState.sortField === "transactions" &&
                      (tableState.sortDirection === "desc" ? (
                        <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUp className="h-3 w-3" />
                      ))}
                    {tableState.sortField !== "transactions" && (
                      <ArrowUpDown className="h-3 w-3 opacity-50" />
                    )}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {data
                .slice(startIndex, endIndex)
                .map((participant, index) =>
                  renderTableRow(participant, startIndex + index)
                )}
            </tbody>
          </table>
        </div>
      );
    },
    [tableState, handleSort, renderTableRow]
  );

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with Performance Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-[#e2e8f0]">{title}</h3>
          <Badge variant="secondary" className="text-xs">
            {processedData.length} participants
          </Badge>
          {enableProgressiveLoading && (
            <Badge
              variant="outline"
              className="text-xs border-green-500/50 text-green-400"
            >
              <Zap className="h-3 w-3 mr-1" />
              Progressive Loading
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPerformancePanel(!showPerformancePanel)}
            className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
          >
            <Settings className="h-4 w-4 mr-1" />
            Performance
            {showPerformancePanel ? (
              <ChevronUp className="h-3 w-3 ml-1" />
            ) : (
              <ChevronDown className="h-3 w-3 ml-1" />
            )}
          </Button>
        </div>
      </div>

      {/* Performance Panel */}
      {showPerformancePanel && (
        <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-lg font-bold text-[#00bfff]">
                {performanceMetrics.renderTime.toFixed(1)}ms
              </div>
              <div className="text-[#8b9dc3]">Render Time</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-[#00bfff]">
                {performanceMetrics.visibleItems}
              </div>
              <div className="text-[#8b9dc3]">Visible Items</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-[#00bfff]">
                {performanceMetrics.memoryUsage.toFixed(1)}MB
              </div>
              <div className="text-[#8b9dc3]">Memory Usage</div>
            </div>
            <div className="text-center">
              <div
                className={`text-lg font-bold ${
                  performanceMetrics.scrollPerformance < 16
                    ? "text-green-400"
                    : performanceMetrics.scrollPerformance < 32
                      ? "text-yellow-400"
                      : "text-red-400"
                }`}
              >
                {performanceMetrics.scrollPerformance.toFixed(1)}ms
              </div>
              <div className="text-[#8b9dc3]">Scroll Performance</div>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#8b9dc3]" />
        <Input
          placeholder="Search by address or value..."
          value={tableState.searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Progressive Loading Progress */}
      {enableProgressiveLoading && isLoading && (
        <ProgressSkeleton
          progress={75}
          label={`Loading ${type}... ${processedData.length}/${participants.length}`}
          className="mb-4"
        />
      )}

      {/* Table Container with Scroll Monitoring */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="relative"
      >
        {/* Show skeleton while initially loading */}
        {isLoading && processedData.length === 0 ? (
          <TableSkeleton
            rows={10}
            columns={3}
            className="border border-[rgba(0,191,255,0.2)] rounded-lg p-4"
          />
        ) : processedData.length > virtualizationThreshold ? (
          <VirtualizedChart
            data={processedData}
            renderChart={renderVirtualizedTable}
            itemHeight={60}
            containerHeight={600}
            threshold={virtualizationThreshold}
            className="border border-[rgba(0,191,255,0.2)] rounded-lg"
          />
        ) : (
          renderVirtualizedTable(processedData, 0, processedData.length)
        )}

        {/* Loading More Indicator */}
        {tableState.isLoadingMore && (
          <div className="flex items-center justify-center py-4 border-t border-[rgba(0,191,255,0.2)]">
            <Loader2 className="h-4 w-4 animate-spin mr-2 text-[#00bfff]" />
            <span className="text-sm text-[#8b9dc3]">
              Loading more participants...
            </span>
          </div>
        )}

        {/* Load More Button */}
        {enableProgressiveLoading && hasMore && !tableState.isLoadingMore && (
          <div className="flex items-center justify-center py-4 border-t border-[rgba(0,191,255,0.2)]">
            <Button
              variant="outline"
              size="sm"
              onClick={loadMoreData}
              className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
            >
              Load More ({batchSize} items)
            </Button>
          </div>
        )}
      </div>

      {/* Performance Status */}
      <div className="flex items-center justify-between text-xs text-[#8b9dc3]">
        <div className="flex items-center gap-4">
          {processedData.length > virtualizationThreshold && (
            <div className="flex items-center gap-2">
              <Shield className="h-3 w-3" />
              Virtualization enabled ({processedData.length} items)
            </div>
          )}
          {enableProgressiveLoading && (
            <div className="flex items-center gap-2">
              <Zap className="h-3 w-3" />
              Batch {tableState.loadedBatches} of{" "}
              {Math.ceil(participants.length / batchSize)}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`${
              performanceMetrics.renderTime < 50
                ? "text-green-400"
                : performanceMetrics.renderTime < 100
                  ? "text-yellow-400"
                  : "text-red-400"
            }`}
          >
            {performanceMetrics.renderTime.toFixed(1)}ms render
          </span>
        </div>
      </div>
    </div>
  );
}
