import React, {
  KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { BarChart3, Eye, EyeOff, Keyboard, Table } from "lucide-react";

interface AccessibleChartProps<TData> {
  data: TData[];
  chartComponent: React.ReactNode;
  title: string;
  description: string;
  dataHeaders: string[];
  getRowData: (item: TData) => (string | number)[];
  className?: string;
}

interface AccessibilityOptions {
  showDataTable: boolean;
  highContrast: boolean;
  keyboardNavigation: boolean;
  screenReaderMode: boolean;
}

export function AccessibleChart<TData>({
  data,
  chartComponent,
  title,
  description,
  dataHeaders,
  getRowData,
  className = "",
}: AccessibleChartProps<TData>) {
  const [accessibilityOptions, setAccessibilityOptions] =
    useState<AccessibilityOptions>({
      showDataTable: false,
      highContrast: false,
      keyboardNavigation: true,
      screenReaderMode: false,
    });

  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const chartRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  useEffect(() => {
    const detectScreenReader = () => {
      const hasScreenReader =
        window.navigator.userAgent.includes("NVDA") ||
        window.navigator.userAgent.includes("JAWS") ||
        window.speechSynthesis?.getVoices().length > 0;

      if (hasScreenReader) {
        setAccessibilityOptions((prev) => ({
          ...prev,
          screenReaderMode: true,
        }));
      }
    };

    detectScreenReader();
  }, []);

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!accessibilityOptions.keyboardNavigation) return;

    switch (event.key) {
      case "ArrowUp":
        event.preventDefault();
        setFocusedIndex((prev) => Math.max(0, prev - 1));
        break;
      case "ArrowDown":
        event.preventDefault();
        setFocusedIndex((prev) => Math.min(data.length - 1, prev + 1));
        break;
      case "Home":
        event.preventDefault();
        setFocusedIndex(0);
        break;
      case "End":
        event.preventDefault();
        setFocusedIndex(data.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (focusedIndex >= 0) {
          announceDataPoint(data[focusedIndex]);
        }
        break;
      case "t":
        if (event.ctrlKey) {
          event.preventDefault();
          toggleDataTable();
        }
        break;
      case "h":
        if (event.ctrlKey) {
          event.preventDefault();
          toggleHighContrast();
        }
        break;
    }
  };

  const announceDataPoint = useCallback(
    (dataPoint: TData) => {
      const rowData = getRowData(dataPoint);
      const announcement = dataHeaders
        .map((header, index) => `${header}: ${rowData[index]}`)
        .join(", ");

      const announcement_element = document.createElement("div");
      announcement_element.setAttribute("aria-live", "polite");
      announcement_element.setAttribute("aria-atomic", "true");
      announcement_element.className = "sr-only";
      announcement_element.textContent = announcement;

      document.body.appendChild(announcement_element);
      setTimeout(() => document.body.removeChild(announcement_element), 1000);
    },
    [dataHeaders, getRowData],
  );

  const toggleDataTable = () => {
    setAccessibilityOptions((prev) => ({
      ...prev,
      showDataTable: !prev.showDataTable,
    }));
  };

  const toggleHighContrast = () => {
    setAccessibilityOptions((prev) => ({
      ...prev,
      highContrast: !prev.highContrast,
    }));
  };

  const toggleKeyboardNavigation = () => {
    setAccessibilityOptions((prev) => ({
      ...prev,
      keyboardNavigation: !prev.keyboardNavigation,
    }));
  };

  const generateSummary = () => {
    if (data.length === 0) return "No data available";

    return `Chart contains ${data.length} data points. ${description}`;
  };

  return (
    <div
      className={`${className} ${accessibilityOptions.highContrast ? "high-contrast" : ""}`}
    >
      <div className="mb-4 flex flex-wrap gap-2 p-3 bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg">
        <h4 className="text-sm font-medium text-[#00bfff] w-full mb-2">
          Accessibility Options
        </h4>

        <button
          onClick={toggleDataTable}
          className={`flex items-center gap-2 px-3 py-1 rounded text-sm transition-colors ${
            accessibilityOptions.showDataTable
              ? "bg-[rgba(0,191,255,0.2)] text-[#00bfff] border border-[rgba(0,191,255,0.3)]"
              : "bg-[rgba(15,20,25,0.8)] text-[#8b9dc3] border border-[rgba(0,191,255,0.3)] hover:bg-[rgba(0,191,255,0.1)]"
          }`}
          aria-pressed={accessibilityOptions.showDataTable}
          title="Toggle data table view (Ctrl+T)"
        >
          <Table className="h-4 w-4" />
          Data Table
        </button>

        <button
          onClick={toggleHighContrast}
          className={`flex items-center gap-2 px-3 py-1 rounded text-sm transition-colors ${
            accessibilityOptions.highContrast
              ? "bg-[rgba(0,191,255,0.2)] text-[#00bfff] border border-[rgba(0,191,255,0.3)]"
              : "bg-[rgba(15,20,25,0.8)] text-[#8b9dc3] border border-[rgba(0,191,255,0.3)] hover:bg-[rgba(0,191,255,0.1)]"
          }`}
          aria-pressed={accessibilityOptions.highContrast}
          title="Toggle high contrast mode (Ctrl+H)"
        >
          {accessibilityOptions.highContrast ? (
            <Eye className="h-4 w-4" />
          ) : (
            <EyeOff className="h-4 w-4" />
          )}
          High Contrast
        </button>

        <button
          onClick={toggleKeyboardNavigation}
          className={`flex items-center gap-2 px-3 py-1 rounded text-sm transition-colors ${
            accessibilityOptions.keyboardNavigation
              ? "bg-[rgba(0,191,255,0.2)] text-[#00bfff] border border-[rgba(0,191,255,0.3)]"
              : "bg-[rgba(15,20,25,0.8)] text-[#8b9dc3] border border-[rgba(0,191,255,0.3)] hover:bg-[rgba(0,191,255,0.1)]"
          }`}
          aria-pressed={accessibilityOptions.keyboardNavigation}
          title="Toggle keyboard navigation"
        >
          <Keyboard className="h-4 w-4" />
          Keyboard Nav
        </button>
      </div>

      <div
        ref={chartRef}
        className="relative"
        role="img"
        aria-label={title}
        aria-describedby="chart-description"
        tabIndex={accessibilityOptions.keyboardNavigation ? 0 : -1}
        onKeyDown={handleKeyDown}
      >
        <div id="chart-description" className="sr-only">
          {generateSummary()}
        </div>

        <div
          className={
            accessibilityOptions.highContrast
              ? "filter contrast-150 brightness-110"
              : ""
          }
        >
          {chartComponent}
        </div>

        {accessibilityOptions.keyboardNavigation && (
          <div className="mt-2 text-xs text-[#6b7280]">
            <p>
              Keyboard shortcuts: ↑↓ Navigate, Enter/Space Select, Ctrl+T Table,
              Ctrl+H Contrast
            </p>
          </div>
        )}
      </div>

      {accessibilityOptions.showDataTable && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-5 w-5 text-[#00bfff]" />
            <h4 className="text-lg font-semibold text-[#00bfff]">
              Data Table View
            </h4>
          </div>

          <div className="overflow-x-auto">
            <table
              ref={tableRef}
              className="w-full bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg"
              role="table"
              aria-label={`Data table for ${title}`}
            >
              <thead>
                <tr className="border-b border-[rgba(0,191,255,0.2)]">
                  {dataHeaders.map((header, index) => (
                    <th
                      key={index}
                      className="px-4 py-3 text-left text-sm font-medium text-[#00bfff]"
                      scope="col"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((item, index) => {
                  const rowData = getRowData(item);
                  return (
                    <tr
                      key={index}
                      className={`border-b border-[rgba(0,191,255,0.1)] hover:bg-[rgba(0,191,255,0.05)] ${
                        index === focusedIndex ? "bg-[rgba(0,191,255,0.1)]" : ""
                      }`}
                      tabIndex={0}
                      role="row"
                      aria-rowindex={index + 2}
                    >
                      {rowData.map((cellData, cellIndex) => (
                        <td
                          key={cellIndex}
                          className="px-4 py-3 text-sm text-[#8b9dc3]"
                          role="gridcell"
                        >
                          {cellData}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 text-sm text-[#8b9dc3]">
            <p>
              Table contains {data.length} rows and {dataHeaders.length}{" "}
              columns.
            </p>
          </div>
        </div>
      )}

      <div className="sr-only">
        <h3>Chart Data Summary</h3>
        <p>{generateSummary()}</p>
        <p>
          Use keyboard navigation to explore data points, or enable the data
          table for detailed information.
        </p>
      </div>
    </div>
  );
}
