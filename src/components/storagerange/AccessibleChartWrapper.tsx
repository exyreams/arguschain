import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/global/Button";
import { Card } from "@/components/global/Card";
import {
  AccessibleDataTable,
  AriaLabelManager,
  ScreenReaderManager,
} from "@/lib/storagerange/accessibilityUtils";
import { EyeOff, Table } from "lucide-react";

interface AccessibleChartWrapperProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  data: any[];
  chartType: "pie" | "bar" | "line" | "area";
  dataKeys?: string[];
  className?: string;
  onDataPointFocus?: (dataPoint: any, index: number) => void;
}

export const AccessibleChartWrapper: React.FC<AccessibleChartWrapperProps> = ({
  children,
  title,
  description,
  data,
  chartType,
  dataKeys = [],
  className = "",
  onDataPointFocus,
}) => {
  const [showDataTable, setShowDataTable] = useState(false);
  const [focusedDataIndex, setFocusedDataIndex] = useState(-1);
  const [isKeyboardMode, setIsKeyboardMode] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  const chartId = `chart-${title.toLowerCase().replace(/\s+/g, "-")}`;
  const tableId = `table-${title.toLowerCase().replace(/\s+/g, "-")}`;
  const descriptionId = `desc-${title.toLowerCase().replace(/\s+/g, "-")}`;

  useEffect(() => {
    AriaLabelManager.setLabel(chartId, `${title} ${chartType} chart`);

    if (description) {
      AriaLabelManager.setLabel(descriptionId, description);
    }

    ScreenReaderManager.announceChartData(chartType, data);
  }, [chartId, descriptionId, title, chartType, description, data]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isKeyboardMode) return;

      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
          event.preventDefault();
          setFocusedDataIndex((prev) => {
            const newIndex = prev < data.length - 1 ? prev + 1 : 0;
            const dataPoint = data[newIndex];

            if (onDataPointFocus) {
              onDataPointFocus(dataPoint, newIndex);
            }

            const label = AriaLabelManager.generateChartLabel(
              chartType,
              dataPoint,
            );
            ScreenReaderManager.announce(label);

            return newIndex;
          });
          break;

        case "ArrowLeft":
        case "ArrowUp":
          event.preventDefault();
          setFocusedDataIndex((prev) => {
            const newIndex = prev > 0 ? prev - 1 : data.length - 1;
            const dataPoint = data[newIndex];

            if (onDataPointFocus) {
              onDataPointFocus(dataPoint, newIndex);
            }

            const label = AriaLabelManager.generateChartLabel(
              chartType,
              dataPoint,
            );
            ScreenReaderManager.announce(label);

            return newIndex;
          });
          break;

        case "Home":
          event.preventDefault();
          setFocusedDataIndex(0);
          if (onDataPointFocus && data[0]) {
            onDataPointFocus(data[0], 0);
          }
          break;

        case "End":
          event.preventDefault();
          const lastIndex = data.length - 1;
          setFocusedDataIndex(lastIndex);
          if (onDataPointFocus && data[lastIndex]) {
            onDataPointFocus(data[lastIndex], lastIndex);
          }
          break;

        case "Enter":
        case " ":
          event.preventDefault();
          setShowDataTable(!showDataTable);
          ScreenReaderManager.announce(
            showDataTable
              ? "Chart view activated"
              : "Data table view activated",
          );
          break;

        case "Escape":
          event.preventDefault();
          setIsKeyboardMode(false);
          setFocusedDataIndex(-1);
          break;
      }
    },
    [isKeyboardMode, data, chartType, onDataPointFocus, showDataTable],
  );

  useEffect(() => {
    const chartElement = chartRef.current;
    if (!chartElement) return;

    chartElement.addEventListener("keydown", handleKeyDown);

    return () => {
      chartElement.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  const handleChartFocus = useCallback(() => {
    setIsKeyboardMode(true);
    if (focusedDataIndex === -1 && data.length > 0) {
      setFocusedDataIndex(0);
      if (onDataPointFocus) {
        onDataPointFocus(data[0], 0);
      }
    }

    ScreenReaderManager.announce(
      `${title} chart focused. Use arrow keys to navigate data points, Enter to toggle table view.`,
    );
  }, [title, focusedDataIndex, data, onDataPointFocus]);

  const handleChartBlur = useCallback(() => {
    setIsKeyboardMode(false);
    setFocusedDataIndex(-1);
  }, []);

  const toggleDataTable = useCallback(() => {
    setShowDataTable((prev) => {
      const newValue = !prev;
      ScreenReaderManager.announce(
        newValue ? "Data table view activated" : "Chart view activated",
      );
      return newValue;
    });
  }, []);

  const tableColumns =
    dataKeys.length > 0 ? dataKeys : Object.keys(data[0] || {});

  return (
    <Card className={`${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3
            id={chartId}
            className="text-lg font-semibold text-[#00bfff]"
            role="heading"
            aria-level={3}
          >
            {title}
          </h3>
          {description && (
            <p id={descriptionId} className="text-sm text-[#8b9dc3] mt-1">
              {description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleDataTable}
            className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
            aria-label={`${showDataTable ? "Hide" : "Show"} data table for ${title}`}
          >
            {showDataTable ? (
              <>
                <EyeOff className="h-4 w-4 mr-1" />
                Hide Table
              </>
            ) : (
              <>
                <Table className="h-4 w-4 mr-1" />
                Show Table
              </>
            )}
          </Button>
        </div>
      </div>

      {showDataTable ? (
        <div className="overflow-x-auto">
          <table
            ref={tableRef}
            id={tableId}
            className="w-full border-collapse"
            role="table"
            aria-label={AccessibleDataTable.generateTableDescription(
              data,
              tableColumns,
            )}
          >
            <caption className="sr-only">
              {AccessibleDataTable.generateTableDescription(data, tableColumns)}
            </caption>

            <thead>
              <tr role="row">
                {tableColumns.map((column, index) => (
                  <th
                    key={column}
                    role="columnheader"
                    className="border border-[rgba(0,191,255,0.3)] bg-[rgba(15,20,25,0.6)] px-4 py-2 text-left text-[#00bfff] font-medium"
                    aria-sort="none"
                    tabIndex={0}
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {data.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  role="row"
                  className={`${
                    rowIndex === focusedDataIndex
                      ? "bg-[rgba(0,191,255,0.1)] border-[rgba(0,191,255,0.5)]"
                      : "hover:bg-[rgba(0,191,255,0.05)]"
                  }`}
                >
                  {tableColumns.map((column, colIndex) => (
                    <td
                      key={`${rowIndex}-${colIndex}`}
                      role="gridcell"
                      className="border border-[rgba(0,191,255,0.2)] px-4 py-2 text-[#8b9dc3]"
                      aria-describedby={`${tableId}-cell-desc-${rowIndex}-${colIndex}`}
                      tabIndex={0}
                    >
                      {row[column]}
                      <span
                        id={`${tableId}-cell-desc-${rowIndex}-${colIndex}`}
                        className="sr-only"
                      >
                        {AccessibleDataTable.generateCellDescription(
                          row[column],
                          rowIndex,
                          colIndex,
                          column,
                        )}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 p-3 bg-[rgba(15,20,25,0.6)] rounded-lg">
            <h4 className="text-sm font-medium text-[#00bfff] mb-2">
              Data Summary
            </h4>
            <div className="text-xs text-[#8b9dc3] space-y-1">
              {tableColumns
                .filter((col) =>
                  data.some((row) => typeof row[col] === "number"),
                )
                .map((column) => (
                  <div key={column}>
                    {AccessibleDataTable.generateSummaryStats(data, column)}
                  </div>
                ))}
            </div>
          </div>
        </div>
      ) : (
        <div
          ref={chartRef}
          role="img"
          tabIndex={0}
          aria-labelledby={chartId}
          aria-describedby={description ? descriptionId : undefined}
          aria-label={`${title} ${chartType} chart with ${data.length} data points. Press Enter to view as table, use arrow keys to navigate.`}
          onFocus={handleChartFocus}
          onBlur={handleChartBlur}
          className="focus:outline-none focus:ring-2 focus:ring-[#00bfff] focus:ring-offset-2 focus:ring-offset-[rgba(25,28,40,0.8)] rounded-lg"
        >
          {children}

          <div className="sr-only" aria-live="polite" aria-atomic="true">
            {isKeyboardMode &&
              focusedDataIndex >= 0 &&
              data[focusedDataIndex] &&
              AriaLabelManager.generateChartLabel(
                chartType,
                data[focusedDataIndex],
              )}
          </div>
        </div>
      )}

      <div className="mt-4 p-3 bg-[rgba(15,20,25,0.6)] rounded-lg">
        <details>
          <summary className="text-sm font-medium text-[#00bfff] cursor-pointer">
            Keyboard Shortcuts
          </summary>
          <div className="mt-2 text-xs text-[#8b9dc3] space-y-1">
            <div>
              <kbd className="bg-[rgba(0,191,255,0.2)] px-1 rounded">Tab</kbd> -
              Focus chart
            </div>
            <div>
              <kbd className="bg-[rgba(0,191,255,0.2)] px-1 rounded">
                Arrow Keys
              </kbd>{" "}
              - Navigate data points
            </div>
            <div>
              <kbd className="bg-[rgba(0,191,255,0.2)] px-1 rounded">
                Enter/Space
              </kbd>{" "}
              - Toggle table view
            </div>
            <div>
              <kbd className="bg-[rgba(0,191,255,0.2)] px-1 rounded">
                Home/End
              </kbd>{" "}
              - First/Last data point
            </div>
            <div>
              <kbd className="bg-[rgba(0,191,255,0.2)] px-1 rounded">
                Escape
              </kbd>{" "}
              - Exit navigation mode
            </div>
          </div>
        </details>
      </div>
    </Card>
  );
};
