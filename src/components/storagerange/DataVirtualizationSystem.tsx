import React, { useCallback, useMemo, useRef, useState } from "react";
import { Card } from "@/components/global/Card";
import { Button } from "@/components/global/Button";
import { Input } from "@/components/global/Input";
import { Badge } from "@/components/global/Badge";
import { ChevronDown, Database, Loader, Zap } from "lucide-react";
import type { StorageSlot } from "@/lib/storagerange";

interface DataVirtualizationSystemProps {
  data: StorageSlot[];
  itemHeight?: number;
  containerHeight?: number;
  overscan?: number;
  batchSize?: number;
  onItemsRendered?: (startIndex: number, endIndex: number) => void;
  className?: string;
}

interface VirtualizedTableProps {
  data: StorageSlot[];
  columns: TableColumn[];
  itemHeight: number;
  containerHeight: number;
  overscan: number;
  onRowClick?: (item: StorageSlot, index: number) => void;
}

interface TableColumn {
  key: keyof StorageSlot;
  title: string;
  width: number;
  render?: (value: any, item: StorageSlot) => React.ReactNode;
}

interface ChartDataSampler {
  data: any[];
  maxPoints: number;
  samplingStrategy: "uniform" | "adaptive" | "importance";
}

interface ProgressiveLoader {
  totalItems: number;
  batchSize: number;
  loadedBatches: number;
  isLoading: boolean;
  hasMore: boolean;
}

const useVirtualScroll = (
  itemCount: number,
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5,
) => {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    itemCount - 1,
    Math.floor((scrollTop + containerHeight) / itemHeight),
  );

  const startIndex = Math.max(0, visibleStart - overscan);
  const endIndex = Math.min(itemCount - 1, visibleEnd + overscan);

  const visibleItems = endIndex - startIndex + 1;
  const totalHeight = itemCount * itemHeight;
  const offsetY = startIndex * itemHeight;

  return {
    startIndex,
    endIndex,
    visibleItems,
    totalHeight,
    offsetY,
    setScrollTop,
  };
};

const sampleData = (
  data: any[],
  maxPoints: number,
  strategy: ChartDataSampler["samplingStrategy"],
) => {
  if (data.length <= maxPoints) return data;

  switch (strategy) {
    case "uniform":
      const step = Math.floor(data.length / maxPoints);
      return data.filter((_, index) => index % step === 0).slice(0, maxPoints);

    case "adaptive":
      const bucketSize = Math.ceil(data.length / maxPoints);
      const sampled = [];

      for (let i = 0; i < data.length; i += bucketSize) {
        const bucket = data.slice(i, i + bucketSize);

        const representative = bucket.reduce((prev, curr) => {
          const prevVariance = Math.abs(prev.value - (prev.previousValue || 0));
          const currVariance = Math.abs(curr.value - (curr.previousValue || 0));
          return currVariance > prevVariance ? curr : prev;
        });
        sampled.push(representative);
      }

      return sampled;

    case "importance":
      return data
        .sort((a, b) => {
          const aImportance =
            (a.securityRelevant ? 2 : 0) + (a.isPYUSDRelated ? 1 : 0);
          const bImportance =
            (b.securityRelevant ? 2 : 0) + (b.isPYUSDRelated ? 1 : 0);
          return bImportance - aImportance;
        })
        .slice(0, maxPoints);

    default:
      return data.slice(0, maxPoints);
  }
};

const VirtualizedTable: React.FC<VirtualizedTableProps> = ({
  data,
  columns,
  itemHeight,
  containerHeight,
  overscan,
  onRowClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const { startIndex, endIndex, totalHeight, offsetY, setScrollTop } =
    useVirtualScroll(data.length, itemHeight, containerHeight, overscan);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(e.currentTarget.scrollTop);
    },
    [setScrollTop],
  );

  const visibleItems = useMemo(() => {
    return data.slice(startIndex, endIndex + 1);
  }, [data, startIndex, endIndex]);

  return (
    <div className="relative">
      <div className="flex border-b border-[rgba(0,191,255,0.1)] bg-[rgba(25,28,40,0.95)] sticky top-0 z-10">
        {columns.map((column) => (
          <div
            key={column.key}
            className="px-3 py-2 text-sm font-medium text-[#8b9dc3]"
            style={{ width: column.width }}
          >
            {column.title}
          </div>
        ))}
      </div>

      <div
        ref={containerRef}
        className="overflow-auto custom-scrollbar"
        style={{ height: containerHeight }}
        onScroll={handleScroll}
      >
        <div style={{ height: totalHeight, position: "relative" }}>
          <div style={{ transform: `translateY(${offsetY}px)` }}>
            {visibleItems.map((item, index) => {
              const actualIndex = startIndex + index;
              return (
                <div
                  key={item.slotHex || actualIndex}
                  className="flex border-b border-[rgba(0,191,255,0.05)] hover:bg-[rgba(0,191,255,0.05)] cursor-pointer"
                  style={{ height: itemHeight }}
                  onClick={() => onRowClick?.(item, actualIndex)}
                >
                  {columns.map((column) => (
                    <div
                      key={column.key}
                      className="px-3 py-2 text-sm text-[#8b9dc3] flex items-center"
                      style={{ width: column.width }}
                    >
                      {column.render
                        ? column.render(item[column.key], item)
                        : String(item[column.key] || "")}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="absolute bottom-2 right-2 bg-[rgba(25,28,40,0.9)] border border-[rgba(0,191,255,0.3)] rounded px-2 py-1 text-xs text-[#8b9dc3]">
        Showing {startIndex + 1}-{Math.min(endIndex + 1, data.length)} of{" "}
        {data.length}
      </div>
    </div>
  );
};

const ProgressiveDataLoader: React.FC<{
  loader: ProgressiveLoader;
  onLoadMore: () => void;
  onBatchSizeChange: (size: number) => void;
}> = ({ loader, onLoadMore, onBatchSizeChange }) => {
  return (
    <div className="p-4 border-t border-[rgba(0,191,255,0.1)]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-[#00bfff]" />
          <span className="text-sm text-[#8b9dc3]">
            Loaded {loader.loadedBatches * loader.batchSize} of{" "}
            {loader.totalItems} items
          </span>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-[#8b9dc3]">Batch Size:</label>
          <Input
            type="number"
            value={loader.batchSize}
            onChange={(e) => onBatchSizeChange(parseInt(e.target.value) || 100)}
            min="10"
            max="1000"
            className="w-20 h-6 text-xs bg-[rgba(15,20,25,0.8)] border-[rgba(0,191,255,0.3)] text-[#8b9dc3]"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 bg-[rgba(0,191,255,0.1)] rounded-full h-2">
          <div
            className="bg-[#00bfff] h-2 rounded-full transition-all duration-300"
            style={{
              width: `${Math.min(100, ((loader.loadedBatches * loader.batchSize) / loader.totalItems) * 100)}%`,
            }}
          />
        </div>

        <Button
          onClick={onLoadMore}
          disabled={loader.isLoading || !loader.hasMore}
          size="sm"
          className="bg-[rgba(0,191,255,0.1)] border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.2)]"
        >
          {loader.isLoading ? (
            <Loader className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <ChevronDown className="h-4 w-4 mr-1" />
          )}
          {loader.isLoading ? "Loading..." : "Load More"}
        </Button>
      </div>
    </div>
  );
};

export const DataVirtualizationSystem: React.FC<
  DataVirtualizationSystemProps
> = ({
  data,
  itemHeight = 40,
  containerHeight = 400,
  overscan = 5,
  batchSize = 100,
  onItemsRendered,
  className = "",
}) => {
  const [virtualizationEnabled, setVirtualizationEnabled] = useState(
    data.length > 1000,
  );
  const [samplingEnabled, setSamplingEnabled] = useState(data.length > 5000);
  const [samplingStrategy, setSamplingStrategy] =
    useState<ChartDataSampler["samplingStrategy"]>("adaptive");
  const [maxChartPoints, setMaxChartPoints] = useState(1000);
  const [currentBatchSize, setCurrentBatchSize] = useState(batchSize);
  const [loadedItems, setLoadedItems] = useState(
    Math.min(batchSize, data.length),
  );

  const progressiveLoader: ProgressiveLoader = useMemo(
    () => ({
      totalItems: data.length,
      batchSize: currentBatchSize,
      loadedBatches: Math.ceil(loadedItems / currentBatchSize),
      isLoading: false,
      hasMore: loadedItems < data.length,
    }),
    [data.length, currentBatchSize, loadedItems],
  );

  const tableColumns: TableColumn[] = useMemo(
    () => [
      {
        key: "slotDisplay",
        title: "Slot",
        width: 120,
        render: (value) => (
          <span className="font-mono text-[#00bfff]">{value}</span>
        ),
      },
      {
        key: "category",
        title: "Category",
        width: 100,
        render: (value) => (
          <Badge
            variant="outline"
            className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
          >
            {value}
          </Badge>
        ),
      },
      {
        key: "decodedValue",
        title: "Decoded Value",
        width: 200,
        render: (value) => (
          <span className="truncate" title={value}>
            {value}
          </span>
        ),
      },
      {
        key: "interpretation",
        title: "Interpretation",
        width: 250,
        render: (value) => (
          <span className="truncate text-[#8b9dc3]" title={value}>
            {value || "—"}
          </span>
        ),
      },
      {
        key: "securityRelevant",
        title: "Security",
        width: 80,
        render: (value) => (
          <Badge
            variant="outline"
            className={
              value
                ? "border-red-500/50 text-red-400 bg-red-500/10"
                : "border-gray-500/50 text-gray-400 bg-gray-500/10"
            }
          >
            {value ? "Yes" : "No"}
          </Badge>
        ),
      },
    ],
    [],
  );

  const sampledData = useMemo(() => {
    if (!samplingEnabled) return data.slice(0, loadedItems);
    return sampleData(
      data.slice(0, loadedItems),
      maxChartPoints,
      samplingStrategy,
    );
  }, [data, loadedItems, samplingEnabled, maxChartPoints, samplingStrategy]);

  const handleLoadMore = useCallback(() => {
    const newLoadedItems = Math.min(
      loadedItems + currentBatchSize,
      data.length,
    );
    setLoadedItems(newLoadedItems);

    if (onItemsRendered) {
      onItemsRendered(0, newLoadedItems - 1);
    }
  }, [loadedItems, currentBatchSize, data.length, onItemsRendered]);

  const performanceMetrics = useMemo(() => {
    const memoryUsage = loadedItems * 200;
    const renderingItems = virtualizationEnabled
      ? Math.min(
          Math.ceil(containerHeight / itemHeight) + overscan * 2,
          loadedItems,
        )
      : loadedItems;

    return {
      memoryUsage: Math.round(memoryUsage / 1024),
      renderingItems,
      virtualizationSavings: virtualizationEnabled
        ? Math.round(((loadedItems - renderingItems) / loadedItems) * 100)
        : 0,
      samplingSavings: samplingEnabled
        ? Math.round(((loadedItems - sampledData.length) / loadedItems) * 100)
        : 0,
    };
  }, [
    loadedItems,
    virtualizationEnabled,
    containerHeight,
    itemHeight,
    overscan,
    samplingEnabled,
    sampledData.length,
  ]);

  return (
    <Card
      className={`bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)] ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-[#00bfff]" />
          <h3 className="text-lg font-semibold text-[#00bfff]">
            Data Virtualization
          </h3>
          <Badge
            variant="outline"
            className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
          >
            {data.length.toLocaleString()} Items
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-green-500/50 text-green-400 bg-green-500/10"
          >
            {performanceMetrics.memoryUsage}KB Memory
          </Badge>
          {virtualizationEnabled && (
            <Badge
              variant="outline"
              className="border-blue-500/50 text-blue-400 bg-blue-500/10"
            >
              {performanceMetrics.virtualizationSavings}% Saved
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="space-y-4">
          <h4 className="font-medium text-[#00bfff]">
            Virtualization Settings
          </h4>

          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={virtualizationEnabled}
                onChange={(e) => setVirtualizationEnabled(e.target.checked)}
                className="rounded border-[rgba(0,191,255,0.3)]"
              />
              <span className="text-[#8b9dc3] text-sm">
                Enable Virtual Scrolling
              </span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#8b9dc3] mb-1">
                  Item Height
                </label>
                <Input
                  type="number"
                  value={itemHeight}
                  readOnly
                  className="bg-[rgba(15,20,25,0.8)] border-[rgba(0,191,255,0.3)] text-[#8b9dc3]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#8b9dc3] mb-1">
                  Overscan
                </label>
                <Input
                  type="number"
                  value={overscan}
                  readOnly
                  className="bg-[rgba(15,20,25,0.8)] border-[rgba(0,191,255,0.3)] text-[#8b9dc3]"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-medium text-[#00bfff]">Data Sampling</h4>

          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={samplingEnabled}
                onChange={(e) => setSamplingEnabled(e.target.checked)}
                className="rounded border-[rgba(0,191,255,0.3)]"
              />
              <span className="text-[#8b9dc3] text-sm">
                Enable Chart Sampling
              </span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#8b9dc3] mb-1">
                  Max Points
                </label>
                <Input
                  type="number"
                  value={maxChartPoints}
                  onChange={(e) =>
                    setMaxChartPoints(parseInt(e.target.value) || 1000)
                  }
                  min="100"
                  max="10000"
                  className="bg-[rgba(15,20,25,0.8)] border-[rgba(0,191,255,0.3)] text-[#8b9dc3]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#8b9dc3] mb-1">
                  Strategy
                </label>
                <select
                  value={samplingStrategy}
                  onChange={(e) => setSamplingStrategy(e.target.value as any)}
                  className="w-full bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.3)] text-[#8b9dc3] rounded-md px-2 py-1 text-xs"
                >
                  <option value="uniform">Uniform</option>
                  <option value="adaptive">Adaptive</option>
                  <option value="importance">Importance</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-3 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
          <div className="text-sm text-[#8b9dc3] mb-1">Rendering</div>
          <div className="text-xl font-bold text-[#00bfff]">
            {performanceMetrics.renderingItems.toLocaleString()}
          </div>
          <div className="text-xs text-[#6b7280]">DOM elements</div>
        </div>

        <div className="p-3 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
          <div className="text-sm text-[#8b9dc3] mb-1">Memory</div>
          <div className="text-xl font-bold text-[#00bfff]">
            {performanceMetrics.memoryUsage}KB
          </div>
          <div className="text-xs text-[#6b7280]">Estimated usage</div>
        </div>

        <div className="p-3 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
          <div className="text-sm text-[#8b9dc3] mb-1">Virtual Savings</div>
          <div className="text-xl font-bold text-green-400">
            {performanceMetrics.virtualizationSavings}%
          </div>
          <div className="text-xs text-[#6b7280]">Render reduction</div>
        </div>

        <div className="p-3 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
          <div className="text-sm text-[#8b9dc3] mb-1">Sample Savings</div>
          <div className="text-xl font-bold text-blue-400">
            {performanceMetrics.samplingSavings}%
          </div>
          <div className="text-xs text-[#6b7280]">Chart reduction</div>
        </div>
      </div>

      <div className="border border-[rgba(0,191,255,0.1)] rounded-lg overflow-hidden">
        {virtualizationEnabled ? (
          <VirtualizedTable
            data={data.slice(0, loadedItems)}
            columns={tableColumns}
            itemHeight={itemHeight}
            containerHeight={containerHeight}
            overscan={overscan}
            onRowClick={(item, index) => {
              console.log("Row clicked:", item, index);
            }}
          />
        ) : (
          <div className="max-h-96 overflow-auto custom-scrollbar">
            <div className="flex border-b border-[rgba(0,191,255,0.1)] bg-[rgba(25,28,40,0.95)] sticky top-0">
              {tableColumns.map((column) => (
                <div
                  key={column.key}
                  className="px-3 py-2 text-sm font-medium text-[#8b9dc3]"
                  style={{ width: column.width }}
                >
                  {column.title}
                </div>
              ))}
            </div>
            {data.slice(0, loadedItems).map((item, index) => (
              <div
                key={item.slotHex || index}
                className="flex border-b border-[rgba(0,191,255,0.05)] hover:bg-[rgba(0,191,255,0.05)]"
              >
                {tableColumns.map((column) => (
                  <div
                    key={column.key}
                    className="px-3 py-2 text-sm text-[#8b9dc3] flex items-center"
                    style={{ width: column.width, height: itemHeight }}
                  >
                    {column.render
                      ? column.render(item[column.key], item)
                      : String(item[column.key] || "")}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {progressiveLoader.hasMore && (
          <ProgressiveDataLoader
            loader={progressiveLoader}
            onLoadMore={handleLoadMore}
            onBatchSizeChange={setCurrentBatchSize}
          />
        )}
      </div>
    </Card>
  );
};
