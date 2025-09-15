import React, { useEffect, useRef, useState } from "react";
import { Bookmark, Download, FileText, Image, Share2 } from "lucide-react";
import { LuFileJson } from "react-icons/lu";
import { FaFileCsv } from "react-icons/fa6";
import { toast } from "sonner";
import { toPng, toSvg } from "html-to-image";

interface ExportButtonProps {
  data?: any;
  chartRef?: React.RefObject<HTMLDivElement>;
  contractAddress?: string;
  blockNumber?: string;
  analysisType?: "storage_range";
  filename?: string;
  className?: string;
  network?: string;
  analysisDepth?: "basic" | "detailed" | "comprehensive";
  blockCount?: number;
  blockInterval?: number;
}

type ExportFormat =
  | "png"
  | "svg"
  | "csv"
  | "json"
  | "report"
  | "share"
  | "bookmark";

export function ExportButton({
  data,
  chartRef,
  contractAddress,
  blockNumber,
  analysisType = "storage_range",
  filename = "storage-range-analysis",
  className = "",
  network = "mainnet",
  analysisDepth = "basic",
  blockCount = 100,
  blockInterval = 500,
}: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleExport = async (format: ExportFormat) => {
    setIsOpen(false);
    setIsExporting(true);

    // Small delay to ensure dropdown is closed
    await new Promise((resolve) => setTimeout(resolve, 150));

    try {
      switch (format) {
        case "png":
        case "svg":
          if (chartRef?.current) {
            await exportChartAsImage(chartRef.current, { format, filename });
            toast.success(`Chart exported as ${format.toUpperCase()}`);
          }
          break;

        case "csv":
          if (data) {
            exportDataAsCSV(Array.isArray(data) ? data : [data], filename);
            toast.success("Data exported as CSV");
          }
          break;

        case "json":
          if (data) {
            exportDataAsJSON(data, filename, true);
            toast.success("Data exported as JSON");
          }
          break;

        case "report":
          if (contractAddress && data) {
            const report = generateSummaryReport(
              contractAddress,
              blockNumber || "",
              data
            );
            exportDataAsJSON({ report }, `${filename}-report`, false);
            toast.success("Summary report generated");
          }
          break;

        case "share":
          if (contractAddress && data) {
            const summary = {
              blockCount,
              blockInterval,
              analysisDepth,
              dataPoints: data.dataPoints?.length || 0,
              changeEvents: data.changeEvents?.length || 0,
            };
            const shareUrl = generateShareableURL(
              contractAddress,
              blockNumber || "",
              summary
            );
            await navigator.clipboard.writeText(shareUrl);
            toast.success("Shareable URL copied to clipboard!");
          }
          break;

        case "bookmark":
          if (contractAddress && data) {
            const summary = {
              blockCount,
              blockInterval,
              analysisDepth,
              dataPoints: data.dataPoints?.length || 0,
              changeEvents: data.changeEvents?.length || 0,
            };
            saveBookmark(
              contractAddress,
              blockNumber || "",
              analysisType,
              summary,
              `Storage Range Analysis (${analysisDepth}) - ${contractAddress.slice(0, 10)}... @ Block ${blockNumber}`
            );
            toast.success("Analysis has been bookmarked!");
          }
          break;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      console.error("Export failed:", error);
      toast.error(`Export failed: ${errorMessage}`);
    } finally {
      setIsExporting(false);
    }
  };

  // High-quality chart export with proper scaling and centering
  const exportChartAsImage = async (
    element: HTMLElement,
    options: { format: "png" | "svg"; filename: string }
  ) => {
    const { format, filename } = options;

    // Find the chart container
    const chartElement =
      (element.querySelector("[data-chart-content]") as HTMLElement) ||
      (element.querySelector(".recharts-wrapper") as HTMLElement) ||
      (element.querySelector(".chart-container") as HTMLElement) ||
      (element.querySelector("[data-chart-container]") as HTMLElement) ||
      element;

    if (!chartElement) {
      throw new Error("Chart container not found");
    }

    // Calculate content bounds
    const rect = chartElement.getBoundingClientRect();
    const PADDING = 100;
    const contentWidth = Math.max(1200, rect.width + PADDING * 2);
    const contentHeight = Math.max(800, rect.height + PADDING * 2);

    // Store original styles
    const originalStyles = {
      width: chartElement.style.width,
      height: chartElement.style.height,
      overflow: chartElement.style.overflow,
      position: chartElement.style.position,
    };

    try {
      // Temporarily adjust container for export
      chartElement.style.width = `${contentWidth}px`;
      chartElement.style.height = `${contentHeight}px`;
      chartElement.style.overflow = "visible";
      chartElement.style.position = "relative";

      // Wait for layout to settle
      await new Promise((resolve) => setTimeout(resolve, 100));

      // High-quality export settings
      const exportOptions = {
        backgroundColor: "#0f1419",
        quality: 1.0,
        pixelRatio: 4,
        width: contentWidth * 4,
        height: contentHeight * 4,
        skipAutoScale: true,
        cacheBust: true,
        style: {
          transform: "scale(1)",
          transformOrigin: "top left",
          fontSmooth: "always",
          webkitFontSmoothing: "antialiased",
          mozOsxFontSmoothing: "grayscale",
        },
        filter: (node: Element) => {
          if (node.classList) {
            return (
              !node.classList.contains("dropdown-content") &&
              !node.classList.contains("tooltip") &&
              !node.classList.contains("export-button")
            );
          }
          return true;
        },
      };

      let dataUrl: string;

      if (format === "svg") {
        dataUrl = await toSvg(chartElement, exportOptions);
      } else {
        toast.loading("Generating high-quality export...", {
          id: "export-progress",
        });

        dataUrl = await toPng(chartElement, exportOptions);
        toast.dismiss("export-progress");
      }

      // Download the image
      const link = document.createElement("a");
      link.download = `${filename}.${format}`;
      link.href = dataUrl;
      link.click();

      // Show file size
      const fileSizeKB = Math.round((dataUrl.length * 0.75) / 1024);
      const fileSizeMB =
        fileSizeKB > 1024
          ? (fileSizeKB / 1024).toFixed(1) + "MB"
          : fileSizeKB + "KB";

      toast.success(
        `High-quality ${format.toUpperCase()} exported (${fileSizeMB})`
      );
    } catch (error) {
      toast.dismiss("export-progress");
      console.error(`Failed to export as ${format}:`, error);
      throw new Error(`Failed to export chart as ${format.toUpperCase()}`);
    } finally {
      // Restore original styles
      chartElement.style.width = originalStyles.width;
      chartElement.style.height = originalStyles.height;
      chartElement.style.overflow = originalStyles.overflow;
      chartElement.style.position = originalStyles.position;
    }
  };

  const exportDataAsCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            if (
              typeof value === "string" &&
              (value.includes(",") || value.includes('"'))
            ) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `${filename}.csv`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportDataAsJSON = (
    data: any,
    filename: string,
    includeMetadata: boolean
  ) => {
    const exportData = includeMetadata
      ? {
          metadata: {
            exportedAt: new Date().toISOString(),
            contractAddress,
            blockNumber,
            network,
            analysisType,
            analysisDepth,
            blockCount,
            blockInterval,
          },
          data,
        }
      : data;

    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `${filename}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const generateSummaryReport = (
    contractAddress: string,
    blockNumber: string,
    data: any
  ) => {
    return {
      contractAddress,
      blockNumber,
      network,
      analysisType: `Storage Range Analysis (${analysisDepth})`,
      timestamp: new Date().toISOString(),
      configuration: {
        blockCount,
        blockInterval,
        analysisDepth,
      },
      summary: {
        dataPoints: data.dataPoints?.length || 0,
        changeEvents: data.changeEvents?.length || 0,
        trend: data.statistics?.trend || "unknown",
        totalChanges: data.statistics?.totalChanges || 0,
        trendStrength: data.statistics?.trendStrength || 0,
      },
      statistics: data.statistics || {},
      interpretation: data.interpretation || "No interpretation available",
    };
  };

  const generateShareableURL = (
    contractAddress: string,
    blockNumber: string,
    summary: any
  ) => {
    const baseUrl = window.location.origin;
    const params = new URLSearchParams({
      contract: contractAddress,
      block: blockNumber,
      network,
      depth: summary.analysisDepth,
      blockCount: summary.blockCount.toString(),
      blockInterval: summary.blockInterval.toString(),
      dataPoints: summary.dataPoints.toString(),
      events: summary.changeEvents.toString(),
    });
    return `${baseUrl}/storage-range?${params.toString()}`;
  };

  const saveBookmark = (
    contractAddress: string,
    blockNumber: string,
    analysisType: string,
    summary: any,
    title: string
  ) => {
    const bookmarks = JSON.parse(
      localStorage.getItem("arguschain_bookmarks") || "[]"
    );
    const bookmark = {
      id: `${contractAddress}_${blockNumber}_${summary.analysisDepth}`,
      title,
      analysisType,
      contractAddress,
      blockNumber,
      network,
      analysisDepth: summary.analysisDepth,
      blockCount: summary.blockCount,
      blockInterval: summary.blockInterval,
      summary,
      createdAt: new Date().toISOString(),
      url: window.location.href,
    };

    // Remove existing bookmark with same ID
    const filteredBookmarks = bookmarks.filter(
      (b: any) => b.id !== bookmark.id
    );
    filteredBookmarks.unshift(bookmark);

    // Keep only last 50 bookmarks
    const trimmedBookmarks = filteredBookmarks.slice(0, 50);
    localStorage.setItem(
      "arguschain_bookmarks",
      JSON.stringify(trimmedBookmarks)
    );
  };

  // Effect to handle clicking outside the dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className={`relative export-button ${className}`} ref={dropdownRef}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className="flex items-center gap-2 px-3 py-2 bg-[rgba(0,191,255,0.1)] border border-[rgba(0,191,255,0.3)] rounded-lg text-[#00bfff] hover:bg-[rgba(0,191,255,0.2)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isExporting ? (
          <div className="w-4 h-4 border-2 border-[rgba(0,191,255,0.3)] border-t-[#00bfff] rounded-full animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        <span className="text-sm font-medium">
          {isExporting ? "Exporting..." : "Export"}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-[rgba(25,28,40,0.98)] backdrop-blur-md border border-[rgba(0,191,255,0.3)] rounded-lg shadow-2xl z-[10001]">
          <div className="py-2">
            {chartRef && (
              <div className="p-2">
                <div className="px-3 py-1 text-xs font-medium text-gray-400">
                  Chart Export
                </div>
                <div className="my-2 h-[1px] w-full bg-gradient-to-r from-transparent via-[rgba(0,191,255,0.5)] to-transparent" />
                <button
                  onClick={() => handleExport("png")}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-[rgba(0,191,255,0.1)] hover:text-accent-primary transition-colors"
                >
                  <Image className="h-4 w-4 text-accent-primary" />
                  Export as PNG
                </button>
                <button
                  onClick={() => handleExport("svg")}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-[rgba(0,191,255,0.1)] hover:text-accent-primary transition-colors"
                >
                  <Image className="h-4 w-4 text-accent-primary" />
                  Export as SVG
                </button>
              </div>
            )}

            {data && (
              <div className="p-2">
                <div className="px-3 py-1 text-xs font-medium text-gray-400">
                  Data Export
                </div>
                <div className="my-2 h-[1px] w-full bg-gradient-to-r from-transparent via-[rgba(0,191,255,0.5)] to-transparent" />
                <button
                  onClick={() => handleExport("csv")}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-[rgba(0,191,255,0.1)] hover:text-accent-primary transition-colors"
                >
                  <FaFileCsv className="h-4 w-4 text-accent-primary" />
                  Export as CSV
                </button>
                <button
                  onClick={() => handleExport("json")}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-[rgba(0,191,255,0.1)] hover:text-accent-primary transition-colors"
                >
                  <LuFileJson className="h-4 w-4 text-accent-primary" />
                  Export as JSON
                </button>
              </div>
            )}

            {contractAddress && data && (
              <div className="p-2">
                <div className="px-3 py-1 text-xs font-medium text-gray-400">
                  Reports & Sharing
                </div>
                <div className="my-2 h-[1px] w-full bg-gradient-to-r from-transparent via-[rgba(0,191,255,0.5)] to-transparent" />
                <button
                  onClick={() => handleExport("report")}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-[rgba(0,191,255,0.1)] hover:text-accent-primary transition-colors"
                >
                  <FileText className="h-4 w-4 text-accent-primary" />
                  Generate Report
                </button>
                <button
                  onClick={() => handleExport("share")}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-[rgba(0,191,255,0.1)] hover:text-accent-primary transition-colors"
                >
                  <Share2 className="h-4 w-4 text-accent-primary" />
                  Copy Share URL
                </button>
                <button
                  onClick={() => handleExport("bookmark")}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-[rgba(0,191,255,0.1)] hover:text-accent-primary transition-colors"
                >
                  <Bookmark className="h-4 w-4 text-accent-primary" />
                  Save Bookmark
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
