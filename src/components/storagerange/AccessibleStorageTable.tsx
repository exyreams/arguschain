import React, { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/global/Card";
import { Button } from "@/components/global/Button";
import { Badge } from "@/components/global/Badge";
import { ArrowUpDown, Filter, Grid, List, Search, Table } from "lucide-react";
import {
  generateAriaLabel,
  highContrastMode,
  keyboardNavigation,
  screenReader,
} from "@/lib/storagerange/accessibilityUtils";

interface StorageSlot {
  slot: string;
  value: string;
  category: string;
  interpretation?: string;
  type?: string;
}

interface AccessibleStorageTableProps {
  data: StorageSlot[];
  title?: string;
  className?: string;
  onSlotSelect?: (slot: StorageSlot) => void;
}

type ViewMode = "table" | "list" | "grid";
type SortField = "slot" | "value" | "category" | "type";
type SortDirection = "asc" | "desc";

export const AccessibleStorageTable: React.FC<AccessibleStorageTableProps> = ({
  data,
  title = "Storage Data",
  className = "",
  onSlotSelect,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [sortField, setSortField] = useState<SortField>("slot");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [focusedRow, setFocusedRow] = useState(0);
  const [focusedCol, setFocusedCol] = useState(0);
  const [isHighContrast, setIsHighContrast] = useState(false);

  const tableRef = useRef<HTMLTableElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsHighContrast(highContrastMode.isHighContrast());

    const cleanup = highContrastMode.addHighContrastListener((highContrast) => {
      setIsHighContrast(highContrast);
    });

    return cleanup;
  }, []);

  const processedData = React.useMemo(() => {
    let filtered = data.filter((item) => {
      const matchesSearch =
        searchTerm === "" ||
        item.slot.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.interpretation &&
          item.interpretation.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory =
        selectedCategory === "all" || item.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });

    filtered.sort((a, b) => {
      let aValue: string | number = a[sortField] || "";
      let bValue: string | number = b[sortField] || "";

      if (sortField === "slot") {
        aValue = parseInt(a.slot, 16);
        bValue = parseInt(b.slot, 16);
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [data, searchTerm, selectedCategory, sortField, sortDirection]);

  const categories = React.useMemo(() => {
    const cats = Array.from(new Set(data.map((item) => item.category)));
    return ["all", ...cats];
  }, [data]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (viewMode !== "table") return;

      keyboardNavigation.handleGridNavigation(
        event,
        focusedRow,
        focusedCol,
        processedData.length,
        4,
        (row, col) => {
          setFocusedRow(row);
          setFocusedCol(col);

          const item = processedData[row];
          if (item) {
            const columnNames = ["slot", "value", "category", "type"];
            const columnName = columnNames[col];
            const cellValue = item[columnName as keyof StorageSlot] || "";

            screenReader.announce(
              `Row ${row + 1}, ${columnName}: ${cellValue}`,
              "polite",
            );
          }
        },
      );
    },
    [viewMode, focusedRow, focusedCol, processedData],
  );

  useEffect(() => {
    const table = tableRef.current;
    if (table && viewMode === "table") {
      table.addEventListener("keydown", handleKeyDown);
      return () => table.removeEventListener("keydown", handleKeyDown);
    }
  }, [handleKeyDown, viewMode]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }

    screenReader.announce(
      `Sorted by ${field} ${sortDirection === "asc" ? "descending" : "ascending"}`,
      "polite",
    );
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    screenReader.announce(`View changed to ${mode} mode`, "polite");
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    screenReader.announce(
      `Search results: ${processedData.length} items found`,
      "polite",
    );
  };

  const handleCategoryFilter = (category: string) => {
    setSelectedCategory(category);
    screenReader.announce(
      `Filtered by ${category === "all" ? "all categories" : category}: ${processedData.length} items`,
      "polite",
    );
  };

  const handleRowSelect = (item: StorageSlot, index: number) => {
    setFocusedRow(index);
    onSlotSelect?.(item);

    screenReader.announce(
      `Selected storage slot ${item.slot} with value ${item.value}`,
      "polite",
    );
  };

  const getHighContrastStyles = () => {
    if (!isHighContrast) return {};

    const colors = highContrastMode.getHighContrastColors();
    return {
      backgroundColor: colors.background,
      color: colors.foreground,
      border: `2px solid ${colors.border}`,
    };
  };

  return (
    <Card className={`${className}`} style={getHighContrastStyles()}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h3
            className="text-lg font-semibold text-[#00bfff]"
            id="storage-table-title"
          >
            {title}
          </h3>
          <p className="text-sm text-[#8b9dc3] mt-1">
            {processedData.length} of {data.length} storage slots
          </p>
        </div>

        <div
          className="flex items-center gap-2"
          role="tablist"
          aria-label="View mode selection"
        >
          {[
            { mode: "table" as ViewMode, icon: Table, label: "Table view" },
            { mode: "list" as ViewMode, icon: List, label: "List view" },
            { mode: "grid" as ViewMode, icon: Grid, label: "Grid view" },
          ].map(({ mode, icon: Icon, label }) => (
            <Button
              key={mode}
              variant={viewMode === mode ? "default" : "outline"}
              size="sm"
              onClick={() => handleViewModeChange(mode)}
              aria-label={label}
              aria-pressed={viewMode === mode}
              role="tab"
              aria-selected={viewMode === mode}
            >
              <Icon className="h-4 w-4" />
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="flex-1">
          <label htmlFor="storage-search" className="sr-only">
            Search storage slots
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#8b9dc3]" />
            <input
              ref={searchRef}
              id="storage-search"
              type="text"
              placeholder="Search slots, values, or interpretations..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.3)] rounded-lg text-[#8b9dc3] placeholder-[#8b9dc3]/50 focus:outline-none focus:ring-2 focus:ring-[#00bfff] focus:border-transparent"
              aria-describedby="search-help"
            />
          </div>
          <div id="search-help" className="sr-only">
            Search through storage slot addresses, values, and interpretations
          </div>
        </div>

        <div className="lg:w-48">
          <label htmlFor="category-filter" className="sr-only">
            Filter by category
          </label>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#8b9dc3]" />
            <select
              id="category-filter"
              value={selectedCategory}
              onChange={(e) => handleCategoryFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.3)] rounded-lg text-[#8b9dc3] focus:outline-none focus:ring-2 focus:ring-[#00bfff] focus:border-transparent"
              aria-describedby="filter-help"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category === "all" ? "All Categories" : category}
                </option>
              ))}
            </select>
          </div>
          <div id="filter-help" className="sr-only">
            Filter storage slots by their detected category
          </div>
        </div>
      </div>

      {viewMode === "table" && (
        <div className="overflow-x-auto">
          <table
            ref={tableRef}
            className="w-full"
            role="grid"
            aria-labelledby="storage-table-title"
            aria-describedby="storage-table-description"
            tabIndex={0}
            style={getHighContrastStyles()}
          >
            <caption id="storage-table-description" className="sr-only">
              {generateAriaLabel.table(
                processedData.length,
                4,
                "Storage slots with slot addresses, values, categories, and types. Use arrow keys to navigate.",
              )}
            </caption>

            <thead>
              <tr role="row">
                {[
                  { field: "slot" as SortField, label: "Slot Address" },
                  { field: "value" as SortField, label: "Value" },
                  { field: "category" as SortField, label: "Category" },
                  { field: "type" as SortField, label: "Type" },
                ].map(({ field, label }) => (
                  <th
                    key={field}
                    role="columnheader"
                    aria-sort={
                      sortField === field
                        ? sortDirection === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                    className="px-4 py-3 text-left text-sm font-medium text-[#8b9dc3] border-b border-[rgba(0,191,255,0.1)]"
                  >
                    <button
                      onClick={() => handleSort(field)}
                      className="flex items-center gap-2 hover:text-[#00bfff] focus:outline-none focus:text-[#00bfff]"
                      aria-label={`Sort by ${label} ${
                        sortField === field && sortDirection === "asc"
                          ? "descending"
                          : "ascending"
                      }`}
                    >
                      {label}
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {processedData.map((item, index) => (
                <tr
                  key={item.slot}
                  role="row"
                  className={`border-b border-[rgba(0,191,255,0.05)] hover:bg-[rgba(0,191,255,0.05)] cursor-pointer ${
                    focusedRow === index
                      ? "bg-[rgba(0,191,255,0.1)] ring-2 ring-[#00bfff]"
                      : ""
                  }`}
                  onClick={() => handleRowSelect(item, index)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleRowSelect(item, index);
                    }
                  }}
                  tabIndex={focusedRow === index ? 0 : -1}
                  aria-selected={focusedRow === index}
                  aria-label={generateAriaLabel.storageSlot(
                    item.slot,
                    item.value,
                    item.category,
                  )}
                >
                  <td
                    role="gridcell"
                    className="px-4 py-3 text-sm font-mono text-[#00bfff]"
                    aria-describedby={`slot-${index}-desc`}
                  >
                    {item.slot}
                    <div id={`slot-${index}-desc`} className="sr-only">
                      Storage slot address {item.slot}
                    </div>
                  </td>

                  <td
                    role="gridcell"
                    className="px-4 py-3 text-sm font-mono text-[#8b9dc3] max-w-xs truncate"
                    title={item.value}
                    aria-describedby={`value-${index}-desc`}
                  >
                    {item.value}
                    <div id={`value-${index}-desc`} className="sr-only">
                      Storage value: {item.value}
                      {item.interpretation &&
                        `. Interpreted as: ${item.interpretation}`}
                    </div>
                  </td>

                  <td role="gridcell" className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                      aria-label={`Category: ${item.category}`}
                    >
                      {item.category}
                    </Badge>
                  </td>

                  <td
                    role="gridcell"
                    className="px-4 py-3 text-sm text-[#8b9dc3]"
                  >
                    {item.type || "Unknown"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewMode === "list" && (
        <div
          role="list"
          aria-labelledby="storage-table-title"
          className="space-y-3"
        >
          {processedData.map((item, index) => (
            <div
              key={item.slot}
              role="listitem"
              className="p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)] hover:bg-[rgba(0,191,255,0.05)] cursor-pointer"
              onClick={() => handleRowSelect(item, index)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleRowSelect(item, index);
                }
              }}
              tabIndex={0}
              aria-label={generateAriaLabel.storageSlot(
                item.slot,
                item.value,
                item.category,
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="font-mono text-sm text-[#00bfff]">
                  {item.slot}
                </div>
                <Badge
                  variant="outline"
                  className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                >
                  {item.category}
                </Badge>
              </div>

              <div className="text-sm text-[#8b9dc3] font-mono mb-2 break-all">
                {item.value}
              </div>

              {item.interpretation && (
                <div className="text-sm text-[#8b9dc3] italic">
                  {item.interpretation}
                </div>
              )}

              {item.type && (
                <div className="text-xs text-[#8b9dc3] mt-2">
                  Type: {item.type}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {viewMode === "grid" && (
        <div
          role="grid"
          aria-labelledby="storage-table-title"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {processedData.map((item, index) => (
            <div
              key={item.slot}
              role="gridcell"
              className="p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)] hover:bg-[rgba(0,191,255,0.05)] cursor-pointer"
              onClick={() => handleRowSelect(item, index)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleRowSelect(item, index);
                }
              }}
              tabIndex={0}
              aria-label={generateAriaLabel.storageSlot(
                item.slot,
                item.value,
                item.category,
              )}
            >
              <div className="text-center">
                <div className="font-mono text-sm text-[#00bfff] mb-2">
                  {item.slot}
                </div>

                <Badge
                  variant="outline"
                  className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)] mb-3"
                >
                  {item.category}
                </Badge>

                <div className="text-xs text-[#8b9dc3] font-mono break-all">
                  {item.value.length > 20
                    ? `${item.value.substring(0, 20)}...`
                    : item.value}
                </div>

                {item.interpretation && (
                  <div className="text-xs text-[#8b9dc3] italic mt-2">
                    {item.interpretation.length > 30
                      ? `${item.interpretation.substring(0, 30)}...`
                      : item.interpretation}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {processedData.length === 0 && (
        <div className="text-center py-12" role="status" aria-live="polite">
          <div className="text-[#8b9dc3] mb-2">No storage slots found</div>
          <div className="text-sm text-[#8b9dc3]/70">
            {searchTerm || selectedCategory !== "all"
              ? "Try adjusting your search or filter criteria"
              : "No storage data available"}
          </div>
        </div>
      )}

      <div className="sr-only" aria-live="polite" id="keyboard-instructions">
        Use arrow keys to navigate the table. Press Enter or Space to select a
        row. Use Tab to move between controls. Press Escape to clear focus.
      </div>
    </Card>
  );
};
