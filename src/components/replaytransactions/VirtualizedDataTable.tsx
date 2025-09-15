import React, { useCallback, useMemo, useRef, useState } from "react";
import { Badge, Button, Card, Input } from "@/components/global";
import { ArrowDown, ArrowUp, ArrowUpDown, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface VirtualizedColumn {
  id: string;
  label: string;
  width: number;
  minWidth?: number;
  maxWidth?: number;
  sortable?: boolean;
  filterable?: boolean;
  resizable?: boolean;
  render?: (value: any, row: any, index: number) => React.ReactNode;
  accessor?: string | ((row: any) => any);
}

interface VirtualizedDataTableProps {
  data: any[];
  columns: VirtualizedColumn[];
  height?: number;
  rowHeight?: number;
  overscan?: number;
  onRowSelect?: (row: any, index: number) => void;
  onRowsSelect?: (rows: any[]) => void;
  className?: string;
  showHeader?: boolean;
  showFooter?: boolean;
  selectable?: boolean;
  multiSelect?: boolean;
  stickyHeader?: boolean;
  virtualized?: boolean;
  batchSize?: number;
}

interface SortState {
  columnId: string;
  direction: "asc" | "desc";
}

interface FilterState {
  columnId: string;
  value: string;
  operator: "contains" | "equals" | "greater" | "less";
}

const useVirtualScroll = (
  itemCount: number,
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5,
) => {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const end = Math.min(
      itemCount - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight),
    );

    return {
      start: Math.max(0, start - overscan),
      end: Math.min(itemCount - 1, end + overscan),
      visibleStart: start,
      visibleEnd: end,
    };
  }, [scrollTop, itemHeight, containerHeight, itemCount, overscan]);

  const totalHeight = itemCount * itemHeight;
  const offsetY = visibleRange.start * itemHeight;

  return {
    visibleRange,
    totalHeight,
    offsetY,
    setScrollTop,
  };
};

const useSampledData = (data: any[], maxSampleSize: number = 10000) => {
  return useMemo(() => {
    if (data.length <= maxSampleSize) {
      return { sampledData: data, isSampled: false, sampleRatio: 1 };
    }

    const sampleRatio = maxSampleSize / data.length;
    const step = Math.floor(data.length / maxSampleSize);
    const sampledData = data
      .filter((_, index) => index % step === 0)
      .slice(0, maxSampleSize);

    return { sampledData, isSampled: true, sampleRatio };
  }, [data, maxSampleSize]);
};

const useProgressiveLoading = (data: any[], batchSize: number = 1000) => {
  const [loadedCount, setLoadedCount] = useState(
    Math.min(batchSize, data.length),
  );
  const [isLoading, setIsLoading] = useState(false);

  const loadMore = useCallback(() => {
    if (loadedCount >= data.length || isLoading) return;

    setIsLoading(true);

    setTimeout(() => {
      setLoadedCount((prev) => Math.min(prev + batchSize, data.length));
      setIsLoading(false);
    }, 100);
  }, [loadedCount, data.length, batchSize, isLoading]);

  const loadedData = useMemo(() => {
    return data.slice(0, loadedCount);
  }, [data, loadedCount]);

  return {
    loadedData,
    loadedCount,
    totalCount: data.length,
    hasMore: loadedCount < data.length,
    isLoading,
    loadMore,
  };
};

export const VirtualizedDataTable: React.FC<VirtualizedDataTableProps> = ({
  data,
  columns,
  height = 400,
  rowHeight = 40,
  overscan = 5,
  onRowSelect,
  onRowsSelect,
  className,
  showHeader = true,
  showFooter = true,
  selectable = false,
  multiSelect = false,
  stickyHeader = true,
  virtualized = true,
  batchSize = 1000,
}) => {
  const [sortState, setSortState] = useState<SortState | null>(null);
  const [filters, setFilters] = useState<FilterState[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(columns.map((col) => col.id)),
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  const { loadedData, loadedCount, totalCount, hasMore, isLoading, loadMore } =
    useProgressiveLoading(data, batchSize);

  const { sampledData, isSampled, sampleRatio } = useSampledData(
    loadedData,
    50000,
  );

  const processedData = useMemo(() => {
    let result = sampledData;

    filters.forEach((filter) => {
      const column = columns.find((col) => col.id === filter.columnId);
      if (!column) return;

      result = result.filter((row) => {
        const value =
          typeof column.accessor === "function"
            ? column.accessor(row)
            : row[column.accessor || column.id];

        const stringValue = String(value).toLowerCase();
        const filterValue = filter.value.toLowerCase();

        switch (filter.operator) {
          case "contains":
            return stringValue.includes(filterValue);
          case "equals":
            return stringValue === filterValue;
          case "greater":
            return Number(value) > Number(filter.value);
          case "less":
            return Number(value) < Number(filter.value);
          default:
            return true;
        }
      });
    });

    if (sortState) {
      const column = columns.find((col) => col.id === sortState.columnId);
      if (column) {
        result = [...result].sort((a, b) => {
          const aValue =
            typeof column.accessor === "function"
              ? column.accessor(a)
              : a[column.accessor || column.id];
          const bValue =
            typeof column.accessor === "function"
              ? column.accessor(b)
              : b[column.accessor || column.id];

          let comparison = 0;
          if (aValue < bValue) comparison = -1;
          if (aValue > bValue) comparison = 1;

          return sortState.direction === "desc" ? -comparison : comparison;
        });
      }
    }

    return result;
  }, [sampledData, filters, sortState, columns]);

  const { visibleRange, totalHeight, offsetY, setScrollTop } = useVirtualScroll(
    processedData.length,
    rowHeight,
    height - (showHeader ? 40 : 0) - (showFooter ? 40 : 0),
    overscan,
  );

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const scrollTop = e.currentTarget.scrollTop;
      setScrollTop(scrollTop);

      if (hasMore && !isLoading) {
        const scrollPercentage =
          scrollTop /
          (e.currentTarget.scrollHeight - e.currentTarget.clientHeight);
        if (scrollPercentage > 0.8) {
          loadMore();
        }
      }
    },
    [setScrollTop, hasMore, isLoading, loadMore],
  );

  const handleSort = useCallback(
    (columnId: string) => {
      const column = columns.find((col) => col.id === columnId);
      if (!column?.sortable) return;

      setSortState((prev) => {
        if (prev?.columnId === columnId) {
          return prev.direction === "asc"
            ? { columnId, direction: "desc" }
            : null;
        }
        return { columnId, direction: "asc" };
      });
    },
    [columns],
  );

  const handleFilter = useCallback(
    (
      columnId: string,
      value: string,
      operator: FilterState["operator"] = "contains",
    ) => {
      setFilters((prev) => {
        const existing = prev.find((f) => f.columnId === columnId);
        if (existing) {
          if (value === "") {
            return prev.filter((f) => f.columnId !== columnId);
          }
          return prev.map((f) =>
            f.columnId === columnId ? { ...f, value, operator } : f,
          );
        }
        return value === "" ? prev : [...prev, { columnId, value, operator }];
      });
    },
    [],
  );

  const handleRowSelect = useCallback(
    (index: number, row: any) => {
      if (!selectable) return;

      if (multiSelect) {
        setSelectedRows((prev) => {
          const newSet = new Set(prev);
          if (newSet.has(index)) {
            newSet.delete(index);
          } else {
            newSet.add(index);
          }

          const selectedRowData = Array.from(newSet).map(
            (i) => processedData[i],
          );
          onRowsSelect?.(selectedRowData);

          return newSet;
        });
      } else {
        setSelectedRows(new Set([index]));
        onRowSelect?.(row, index);
      }
    },
    [selectable, multiSelect, processedData, onRowSelect, onRowsSelect],
  );

  const handleColumnResize = useCallback((columnId: string, width: number) => {
    setColumnWidths((prev) => ({
      ...prev,
      [columnId]: width,
    }));
  }, []);

  const toggleColumnVisibility = useCallback((columnId: string) => {
    setVisibleColumns((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(columnId)) {
        newSet.delete(columnId);
      } else {
        newSet.add(columnId);
      }
      return newSet;
    });
  }, []);

  const visibleColumnsData = useMemo(() => {
    return columns.filter((col) => visibleColumns.has(col.id));
  }, [columns, visibleColumns]);

  const renderHeader = () => (
    <div
      ref={headerRef}
      className={cn(
        "flex border-b bg-muted/50",
        stickyHeader && "sticky top-0 z-10",
      )}
      style={{ height: 40 }}
    >
      {selectable && (
        <div className="flex items-center justify-center w-12 border-r">
          {multiSelect && (
            <input
              type="checkbox"
              checked={
                selectedRows.size === processedData.length &&
                processedData.length > 0
              }
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedRows(new Set(processedData.map((_, i) => i)));
                  onRowsSelect?.(processedData);
                } else {
                  setSelectedRows(new Set());
                  onRowsSelect?.([]);
                }
              }}
              className="rounded"
            />
          )}
        </div>
      )}

      {visibleColumnsData.map((column) => {
        const width = columnWidths[column.id] || column.width;
        const isSorted = sortState?.columnId === column.id;

        return (
          <div
            key={column.id}
            className="flex items-center px-3 border-r last:border-r-0 bg-background"
            style={{
              width,
              minWidth: column.minWidth,
              maxWidth: column.maxWidth,
            }}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium truncate">
                  {column.label}
                </span>
                {column.sortable && (
                  <button
                    onClick={() => handleSort(column.id)}
                    className="p-1 hover:bg-muted rounded"
                  >
                    {isSorted ? (
                      sortState?.direction === "asc" ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3" />
                    )}
                  </button>
                )}
              </div>

              {column.filterable && (
                <div className="ml-2">
                  <Input
                    placeholder="Filter..."
                    className="h-6 w-20 text-xs"
                    onChange={(e) => handleFilter(column.id, e.target.value)}
                  />
                </div>
              )}
            </div>

            {column.resizable && (
              <div
                className="w-1 h-full cursor-col-resize hover:bg-primary/50 ml-2"
                onMouseDown={(e) => {
                  const startX = e.clientX;
                  const startWidth = width;

                  const handleMouseMove = (e: MouseEvent) => {
                    const newWidth = Math.max(
                      column.minWidth || 50,
                      Math.min(
                        column.maxWidth || 500,
                        startWidth + (e.clientX - startX),
                      ),
                    );
                    handleColumnResize(column.id, newWidth);
                  };

                  const handleMouseUp = () => {
                    document.removeEventListener("mousemove", handleMouseMove);
                    document.removeEventListener("mouseup", handleMouseUp);
                  };

                  document.addEventListener("mousemove", handleMouseMove);
                  document.addEventListener("mouseup", handleMouseUp);
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  const renderRow = (row: any, index: number) => {
    const isSelected = selectedRows.has(index);

    return (
      <div
        key={index}
        className={cn(
          "flex border-b hover:bg-muted/50 cursor-pointer",
          isSelected && "bg-primary/10 border-primary/20",
        )}
        style={{ height: rowHeight }}
        onClick={() => handleRowSelect(index, row)}
      >
        {selectable && (
          <div className="flex items-center justify-center w-12 border-r">
            <input
              type={multiSelect ? "checkbox" : "radio"}
              checked={isSelected}
              onChange={() => handleRowSelect(index, row)}
              className="rounded"
            />
          </div>
        )}

        {visibleColumnsData.map((column) => {
          const width = columnWidths[column.id] || column.width;
          const value =
            typeof column.accessor === "function"
              ? column.accessor(row)
              : row[column.accessor || column.id];

          return (
            <div
              key={column.id}
              className="flex items-center px-3 border-r last:border-r-0 truncate"
              style={{
                width,
                minWidth: column.minWidth,
                maxWidth: column.maxWidth,
              }}
            >
              {column.render ? (
                column.render(value, row, index)
              ) : (
                <span className="text-sm truncate">{String(value)}</span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderFooter = () => (
    <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/50 text-sm">
      <div className="flex items-center space-x-4">
        <span>
          Showing {processedData.length.toLocaleString()} of{" "}
          {totalCount.toLocaleString()} rows
        </span>
        {isSampled && (
          <Badge variant="outline" className="text-xs">
            Sampled ({(sampleRatio * 100).toFixed(1)}%)
          </Badge>
        )}
        {filters.length > 0 && (
          <Badge variant="outline" className="text-xs">
            {filters.length} filter{filters.length !== 1 ? "s" : ""} active
          </Badge>
        )}
        {selectedRows.size > 0 && (
          <Badge variant="outline" className="text-xs">
            {selectedRows.size} selected
          </Badge>
        )}
      </div>

      <div className="flex items-center space-x-2">
        {hasMore && (
          <Button
            size="sm"
            variant="outline"
            onClick={loadMore}
            disabled={isLoading}
          >
            {isLoading
              ? "Loading..."
              : `Load More (${totalCount - loadedCount} remaining)`}
          </Button>
        )}

        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowColumnSettings(!showColumnSettings)}
        >
          <Settings className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );

  return (
    <Card className={cn("overflow-hidden", className)}>
      {showColumnSettings && (
        <div className="p-4 border-b bg-muted/50">
          <h4 className="text-sm font-medium mb-3">Column Settings</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {columns.map((column) => (
              <div key={column.id} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={visibleColumns.has(column.id)}
                  onChange={() => toggleColumnVisibility(column.id)}
                  className="rounded"
                />
                <span className="text-sm truncate">{column.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showHeader && renderHeader()}

      <div
        ref={containerRef}
        className="overflow-auto"
        style={{
          height: height - (showHeader ? 40 : 0) - (showFooter ? 40 : 0),
        }}
        onScroll={virtualized ? handleScroll : undefined}
      >
        {virtualized ? (
          <div style={{ height: totalHeight, position: "relative" }}>
            <div style={{ transform: `translateY(${offsetY}px)` }}>
              {processedData
                .slice(visibleRange.start, visibleRange.end + 1)
                .map((row, index) =>
                  renderRow(row, visibleRange.start + index),
                )}
            </div>
          </div>
        ) : (
          <div>{processedData.map((row, index) => renderRow(row, index))}</div>
        )}
      </div>
      {showFooter && renderFooter()}
    </Card>
  );
};
