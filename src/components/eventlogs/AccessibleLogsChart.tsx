import React, {
  KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { AccessibleChart } from "@/components/debugtrace/AccessibleChart";
import type { ParsedTransferLog, TopParticipant } from "@/lib/eventlogs";
import { formatPyusdValue, shortenAddress } from "@/lib/eventlogs";
import {
  Contrast,
  Focus,
  Keyboard,
  Table,
  Volume2,
  VolumeX,
} from "lucide-react";

interface AccessibleLogsChartProps {
  data: any[];
  chartComponent: React.ReactNode;
  title: string;
  description: string;
  chartType:
    | "distribution"
    | "timeline"
    | "network"
    | "heatmap"
    | "bubble"
    | "flow";
  transfers?: ParsedTransferLog[];
  participants?: TopParticipant[];
  className?: string;
}

interface LogsAccessibilityOptions {
  showDataTable: boolean;
  highContrast: boolean;
  keyboardNavigation: boolean;
  screenReaderMode: boolean;
  audioFeedback: boolean;
  focusIndicators: boolean;
}

export function AccessibleLogsChart({
  data,
  chartComponent,
  title,
  description,
  chartType,
  transfers = [],
  participants = [],
  className = "",
}: AccessibleLogsChartProps) {
  const [accessibilityOptions, setAccessibilityOptions] =
    useState<LogsAccessibilityOptions>({
      showDataTable: false,
      highContrast: false,
      keyboardNavigation: true,
      screenReaderMode: false,
      audioFeedback: false,
      focusIndicators: true,
    });

  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const chartRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  useEffect(() => {
    const detectAccessibilityFeatures = () => {
      const hasScreenReader =
        window.navigator.userAgent.includes("NVDA") ||
        window.navigator.userAgent.includes("JAWS") ||
        window.speechSynthesis?.getVoices().length > 0 ||
        window.navigator.userAgent.includes("VoiceOver");

      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      const prefersHighContrast = window.matchMedia(
        "(prefers-contrast: high)",
      ).matches;

      if (hasScreenReader) {
        setAccessibilityOptions((prev) => ({
          ...prev,
          screenReaderMode: true,
          keyboardNavigation: true,
        }));
      }

      if (prefersHighContrast) {
        setAccessibilityOptions((prev) => ({
          ...prev,
          highContrast: true,
        }));
      }
    };

    detectAccessibilityFeatures();
  }, []);

  const getChartDataConfig = useCallback(() => {
    switch (chartType) {
      case "distribution":
        return {
          headers: ["Value Range", "Count", "Percentage"],
          getRowData: (item: any) => [
            item.range || item.label || "Unknown",
            item.count || item.value || 0,
            `${((item.count / data.length) * 100).toFixed(2)}%`,
          ],
        };

      case "timeline":
        return {
          headers: ["Time", "Volume", "Transaction Count"],
          getRowData: (item: any) => [
            new Date(item.timestamp || item.time).toLocaleString(),
            formatPyusdValue(item.volume || item.value || "0"),
            item.transactions || item.count || 0,
          ],
        };

      case "network":
        return {
          headers: ["From", "To", "Value", "Transactions"],
          getRowData: (item: any) => [
            shortenAddress(item.from || item.source || ""),
            shortenAddress(item.to || item.target || ""),
            formatPyusdValue(item.value || "0"),
            item.transactions || item.count || 1,
          ],
        };

      case "heatmap":
        return {
          headers: ["Address", "Interaction Count", "Total Value"],
          getRowData: (item: any) => [
            shortenAddress(item.address || item.id || ""),
            item.interactions || item.count || 0,
            formatPyusdValue(item.totalValue || item.value || "0"),
          ],
        };

      case "bubble":
        return {
          headers: ["Participant", "Volume", "Transactions", "Category"],
          getRowData: (item: any) => [
            shortenAddress(item.address || item.id || ""),
            formatPyusdValue(item.volume || item.value || "0"),
            item.transactions || item.count || 0,
            item.category || "Regular",
          ],
        };

      case "flow":
        return {
          headers: ["Flow Path", "Volume", "Frequency"],
          getRowData: (item: any) => [
            `${shortenAddress(item.from || "")} → ${shortenAddress(item.to || "")}`,
            formatPyusdValue(item.volume || item.value || "0"),
            item.frequency || item.count || 1,
          ],
        };

      default:
        return {
          headers: ["Item", "Value"],
          getRowData: (item: any) => [
            item.label || item.name || "Unknown",
            item.value || item.count || 0,
          ],
        };
    }
  }, [chartType, data]);

  const generateChartSummary = useCallback(() => {
    const config = getChartDataConfig();
    const totalItems = data.length;

    if (totalItems === 0) return "No data available for this chart";

    let summary = `${title}: ${description}. `;
    summary += `This ${chartType} chart contains ${totalItems} data points. `;

    switch (chartType) {
      case "distribution":
        const maxValue = Math.max(...data.map((d) => d.count || d.value || 0));
        const avgValue =
          data.reduce((sum, d) => sum + (d.count || d.value || 0), 0) /
          totalItems;
        summary += `The highest value is ${maxValue}, with an average of ${avgValue.toFixed(2)}. `;
        break;

      case "timeline":
        const timeRange = data.length > 1 ? "over time" : "at a single point";
        summary += `Shows volume and transaction patterns ${timeRange}. `;
        break;

      case "network":
        const uniqueAddresses = new Set([
          ...data.map((d) => d.from || d.source),
          ...data.map((d) => d.to || d.target),
        ]).size;
        summary += `Network shows interactions between ${uniqueAddresses} unique addresses. `;
        break;

      case "bubble":
        const categories = [...new Set(data.map((d) => d.category))].filter(
          Boolean,
        );
        summary += `Participants are categorized into ${categories.length} groups: ${categories.join(", ")}. `;
        break;
    }

    summary +=
      "Use keyboard navigation to explore data points, or enable the data table for detailed information.";
    return summary;
  }, [title, description, chartType, data, getChartDataConfig]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
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
          if (focusedIndex >= 0 && focusedIndex < data.length) {
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

        case "k":
          if (event.ctrlKey) {
            event.preventDefault();
            toggleKeyboardNavigation();
          }
          break;
      }
    },
    [accessibilityOptions.keyboardNavigation, focusedIndex, data],
  );

  const announceDataPoint = useCallback(
    (dataPoint: any) => {
      const config = getChartDataConfig();
      const rowData = config.getRowData(dataPoint);
      const announcement = `${config.headers
        .map((header, index) => `${header}: ${rowData[index]}`)
        .join(", ")}`;

      const announcementElement = document.createElement("div");
      announcementElement.setAttribute("aria-live", "polite");
      announcementElement.setAttribute("aria-atomic", "true");
      announcementElement.className = "sr-only";
      announcementElement.textContent = announcement;

      document.body.appendChild(announcementElement);
      setTimeout(() => document.body.removeChild(announcementElement), 1000);

      if (accessibilityOptions.audioFeedback && "speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(announcement);
        utterance.rate = 1.2;
        utterance.volume = 0.7;
        window.speechSynthesis.speak(utterance);
      }
    },
    [getChartDataConfig, accessibilityOptions.audioFeedback],
  );

  const toggleDataTable = useCallback(() => {
    setAccessibilityOptions((prev) => ({
      ...prev,
      showDataTable: !prev.showDataTable,
    }));
  }, []);

  const toggleHighContrast = useCallback(() => {
    setAccessibilityOptions((prev) => ({
      ...prev,
      highContrast: !prev.highContrast,
    }));
  }, []);

  const toggleKeyboardNavigation = useCallback(() => {
    setAccessibilityOptions((prev) => ({
      ...prev,
      keyboardNavigation: !prev.keyboardNavigation,
    }));
  }, []);

  const toggleAudioFeedback = useCallback(() => {
    setAccessibilityOptions((prev) => ({
      ...prev,
      audioFeedback: !prev.audioFeedback,
    }));
  }, []);

  const toggleFocusIndicators = useCallback(() => {
    setAccessibilityOptions((prev) => ({
      ...prev,
      focusIndicators: !prev.focusIndicators,
    }));
  }, []);

  const config = getChartDataConfig();

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex flex-wrap gap-2 p-3 bg-[rgba(15,20,25,0.8)] rounded-lg border border-[rgba(0,191,255,0.2)]">
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
          <Table className="size-4" />
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
          <Contrast className="size-4" />
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
          title="Toggle keyboard navigation (Ctrl+K)"
        >
          <Keyboard className="size-4" />
          Keyboard Nav
        </button>

        {accessibilityOptions.screenReaderMode && (
          <button
            onClick={toggleAudioFeedback}
            className={`flex items-center gap-2 px-3 py-1 rounded text-sm transition-colors ${
              accessibilityOptions.audioFeedback
                ? "bg-[rgba(0,191,255,0.2)] text-[#00bfff] border border-[rgba(0,191,255,0.3)]"
                : "bg-[rgba(15,20,25,0.8)] text-[#8b9dc3] border border-[rgba(0,191,255,0.3)] hover:bg-[rgba(0,191,255,0.1)]"
            }`}
            aria-pressed={accessibilityOptions.audioFeedback}
            title="Toggle audio feedback"
          >
            {accessibilityOptions.audioFeedback ? (
              <Volume2 className="size-4" />
            ) : (
              <VolumeX className="size-4" />
            )}
            Audio
          </button>
        )}

        <button
          onClick={toggleFocusIndicators}
          className={`flex items-center gap-2 px-3 py-1 rounded text-sm transition-colors ${
            accessibilityOptions.focusIndicators
              ? "bg-[rgba(0,191,255,0.2)] text-[#00bfff] border border-[rgba(0,191,255,0.3)]"
              : "bg-[rgba(15,20,25,0.8)] text-[#8b9dc3] border border-[rgba(0,191,255,0.3)] hover:bg-[rgba(0,191,255,0.1)]"
          }`}
          aria-pressed={accessibilityOptions.focusIndicators}
          title="Toggle focus indicators"
        >
          <Focus className="size-4" />
          Focus
        </button>
      </div>

      <AccessibleChart
        data={data}
        chartComponent={chartComponent}
        title={title}
        description={generateChartSummary()}
        dataHeaders={config.headers}
        getRowData={config.getRowData}
        className={`
          ${accessibilityOptions.highContrast ? "high-contrast" : ""}
          ${accessibilityOptions.focusIndicators ? "focus-indicators" : ""}
        `}
      />

      {accessibilityOptions.keyboardNavigation && (
        <div className="text-xs text-[#8b9dc3] bg-[rgba(15,20,25,0.5)] p-3 rounded border border-[rgba(0,191,255,0.1)]">
          <p className="font-medium mb-1">Keyboard Shortcuts:</p>
          <div className="grid grid-cols-2 gap-2">
            <span>↑↓ Navigate data points</span>
            <span>Enter/Space Select point</span>
            <span>Ctrl+T Toggle table</span>
            <span>Ctrl+H High contrast</span>
            <span>Ctrl+K Keyboard nav</span>
            <span>Home/End First/Last</span>
          </div>
        </div>
      )}

      <div className="sr-only">
        <h3>Chart Data Summary</h3>
        <p>{generateChartSummary()}</p>
        <p>
          This chart contains {data.length} data points. Use keyboard navigation
          to explore individual data points, or enable the data table for
          detailed tabular information.
        </p>
      </div>
    </div>
  );
}

export function useLogsAccessibility() {
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [isScreenReaderActive, setIsScreenReaderActive] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const highContrastQuery = window.matchMedia("(prefers-contrast: high)");
    setIsHighContrast(highContrastQuery.matches);

    const handleHighContrastChange = (e: MediaQueryListEvent) => {
      setIsHighContrast(e.matches);
    };

    highContrastQuery.addEventListener("change", handleHighContrastChange);

    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    setPrefersReducedMotion(reducedMotionQuery.matches);

    const handleReducedMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    reducedMotionQuery.addEventListener("change", handleReducedMotionChange);

    return () => {
      highContrastQuery.removeEventListener("change", handleHighContrastChange);
      reducedMotionQuery.removeEventListener(
        "change",
        handleReducedMotionChange,
      );
    };
  }, []);

  useEffect(() => {
    const hasScreenReader =
      "speechSynthesis" in window ||
      navigator.userAgent.includes("NVDA") ||
      navigator.userAgent.includes("JAWS") ||
      navigator.userAgent.includes("VoiceOver");

    setIsScreenReaderActive(hasScreenReader);
  }, []);

  const announceToScreenReader = useCallback((message: string) => {
    const announcement = document.createElement("div");
    announcement.setAttribute("aria-live", "polite");
    announcement.setAttribute("aria-atomic", "true");
    announcement.className = "sr-only";
    announcement.textContent = message;

    document.body.appendChild(announcement);
    setTimeout(() => document.body.removeChild(announcement), 1000);
  }, []);

  return {
    isHighContrast,
    isScreenReaderActive,
    prefersReducedMotion,
    announceToScreenReader,
  };
}
