import React, { useEffect, useRef, useState } from "react";
import { Bookmark, Download, FileText, Image, Share2 } from "lucide-react";
import { LuFileJson } from "react-icons/lu";
import { FaFileCsv } from "react-icons/fa6";
import { toast } from "sonner";
import { toPng, toSvg } from "html-to-image";
import { useCreateTransactionSimulationBookmark } from "@/hooks/transactionsimulation/useTransactionSimulationBookmarks";
import type {
  SimulationResult,
  ComparisonResult,
  BatchResult,
} from "@/lib/transactionsimulation/types";

interface ExportButtonProps {
  data?: SimulationResult | BatchResult | ComparisonResult[] | any;
  chartRef?: React.RefObject<HTMLDivElement>;
  analysisType?: "single" | "batch" | "comparison";
  filename?: string;
  className?: string;
  network?: string;
  fromAddress?: string;
  functionName?: string;
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
  analysisType = "single",
  filename = "simulation-results",
  className = "",
  network = "mainnet",
  fromAddress = "",
  functionName = "",
}: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const createBookmark = useCreateTransactionSimulationBookmark();

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
            exportDataAsCSV(data, filename);
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
          if (data) {
            const report = generateSummaryReport(data);
            exportDataAsJSON({ report }, `${filename}-report`, false);
            toast.success("Summary report generated");
          }
          break;

        case "share":
          if (data) {
            const shareUrl = generateShareableURL(data);
            await navigator.clipboard.writeText(shareUrl);
            toast.success("Shareable URL copied to clipboard!");
          }
          break;

        case "bookmark":
          if (data) {
            await saveBookmark(data);
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
              !node.classList.contains("export-button") &&
              node.getAttribute("role") !== "tooltip"
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

  const exportDataAsCSV = (data: any, filename: string) => {
    let csvContent = "";
    let headers: string[] = [];
    let rows: string[][] = [];

    if (analysisType === "single" && data.functionName) {
      // Single simulation
      headers = [
        "Function",
        "Gas Used",
        "Gas Price",
        "Success",
        "Value",
        "Parameters",
      ];
      rows = [
        [
          data.functionName,
          data.gasUsed?.toString() || "0",
          data.gasPrice?.toString() || "0",
          data.success?.toString() || "false",
          data.value?.toString() || "0",
          JSON.stringify(data.parameters || {}),
        ],
      ];
    } else if (analysisType === "batch" && data.results) {
      // Batch simulation
      headers = ["Operation", "Function", "Gas Used", "Success", "Error"];
      rows = data.results.map((result: any, index: number) => [
        `Operation ${index + 1}`,
        result.functionName || "unknown",
        result.gasUsed?.toString() || "0",
        result.success?.toString() || "false",
        result.error || "",
      ]);
    } else if (analysisType === "comparison" && Array.isArray(data)) {
      // Comparison results
      headers = ["Variant", "Gas Used", "Gas Price", "Success", "Parameters"];
      rows = data.map((result: any) => [
        result.name || "Variant",
        result.gasUsed?.toString() || "0",
        result.gasPrice?.toString() || "0",
        result.success?.toString() || "false",
        JSON.stringify(result.parameters || {}),
      ]);
    }

    csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((cell) => {
            if (
              typeof cell === "string" &&
              (cell.includes(",") || cell.includes('"'))
            ) {
              return `"${cell.replace(/"/g, '""')}"`;
            }
            return cell;
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
            analysisType,
            network,
            fromAddress,
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

  const generateSummaryReport = (data: any) => {
    const timestamp = new Date().toISOString();
    let report = `# Transaction Simulation Report\n\n`;
    report += `**Analysis Type:** ${analysisType}\n`;
    report += `**Generated:** ${timestamp}\n`;
    report += `**Network:** ${network}\n`;
    report += `**From Address:** ${fromAddress}\n\n`;

    if (analysisType === "single" && data.functionName) {
      report += `## Single Simulation Results\n`;
      report += `- Function: ${data.functionName}\n`;
      report += `- Gas Used: ${data.gasUsed?.toLocaleString() || 0}\n`;
      report += `- Gas Price: ${data.gasPrice?.toLocaleString() || 0} gwei\n`;
      report += `- Success: ${data.success ? "✅" : "❌"}\n`;
      report += `- Value: ${data.value || 0} ETH\n\n`;

      if (data.parameters && Object.keys(data.parameters).length > 0) {
        report += `## Parameters\n`;
        Object.entries(data.parameters).forEach(([key, value]) => {
          report += `- ${key}: ${value}\n`;
        });
      }
    } else if (analysisType === "batch" && data.results) {
      report += `## Batch Simulation Results\n`;
      report += `- Total Operations: ${data.results.length}\n`;
      report += `- Total Gas Used: ${data.totalGasUsed?.toLocaleString() || 0}\n`;
      report += `- Success Rate: ${((data.results.filter((r: any) => r.success).length / data.results.length) * 100).toFixed(1)}%\n\n`;

      report += `## Individual Operations\n`;
      data.results.forEach((result: any, index: number) => {
        report += `${index + 1}. ${result.functionName || "Unknown"}: ${result.gasUsed || 0} gas (${result.success ? "✅" : "❌"})\n`;
      });
    } else if (analysisType === "comparison" && Array.isArray(data)) {
      report += `## Comparison Results\n`;
      report += `- Variants Compared: ${data.length}\n`;
      report += `- Function: ${functionName}\n\n`;

      report += `## Variant Analysis\n`;
      data.forEach((result: any, index: number) => {
        report += `${index + 1}. ${result.name || `Variant ${index + 1}`}\n`;
        report += `   - Gas Used: ${result.gasUsed?.toLocaleString() || 0}\n`;
        report += `   - Success: ${result.success ? "✅" : "❌"}\n`;
        report += `   - Gas Price: ${result.gasPrice?.toLocaleString() || 0} gwei\n\n`;
      });
    }

    return report;
  };

  const generateShareableURL = (data: any) => {
    const baseUrl = window.location.origin;
    const params = new URLSearchParams({
      type: analysisType,
      network,
      from: fromAddress,
    });

    if (analysisType === "single" && data.functionName) {
      params.set("function", data.functionName);
      params.set("gas", data.gasUsed?.toString() || "0");
    } else if (analysisType === "batch" && data.results) {
      params.set("operations", data.results.length.toString());
      params.set("totalGas", data.totalGasUsed?.toString() || "0");
    } else if (analysisType === "comparison" && Array.isArray(data)) {
      params.set("variants", data.length.toString());
      params.set("function", functionName);
    }

    return `${baseUrl}/transaction-simulation?${params.toString()}`;
  };

  const saveBookmark = async (data: any) => {
    try {
      let title = "";
      let analysisResults = {};
      let queryConfig: any = {
        network,
        fromAddress,
        simulationType: analysisType,
        functionName,
      };

      if (analysisType === "single" && data.functionName) {
        title = `${data.functionName} Simulation (${network})`;
        analysisResults = {
          gasUsed: data.gasUsed,
          gasPrice: data.gasPrice,
          success: data.success,
        };
        queryConfig = {
          ...queryConfig,
          parameters: data.parameters,
        };
      } else if (analysisType === "batch" && data.results) {
        title = `Batch Simulation - ${data.results.length} operations (${network})`;
        analysisResults = {
          totalOperations: data.results.length,
          gasUsed: data.totalGasUsed,
          successRate:
            (data.results.filter((r: any) => r.success).length /
              data.results.length) *
            100,
        };
        queryConfig = {
          ...queryConfig,
          operations: data.results.map((r: any) => ({
            functionName: r.functionName,
            gasUsed: r.gasUsed,
          })),
        };
      } else if (analysisType === "comparison" && Array.isArray(data)) {
        title = `${functionName} Comparison - ${data.length} variants (${network})`;
        analysisResults = {
          totalOperations: data.length,
          gasUsed: data.reduce(
            (sum: number, r: any) => sum + (r.gasUsed || 0),
            0
          ),
          successRate:
            (data.filter((r: any) => r.success).length / data.length) * 100,
        };
        queryConfig = {
          ...queryConfig,
          variants: data.map((r: any) => ({
            name: r.name,
            gasUsed: r.gasUsed,
          })),
        };
      }

      const bookmarkData = {
        title,
        description: `${analysisType} simulation on ${network} from ${fromAddress.slice(0, 8)}...`,
        bookmark_type: "transactions_simulation" as const,
        query_config: queryConfig,
        analysis_results: analysisResults,
      };

      await createBookmark.mutateAsync(bookmarkData);
    } catch (error) {
      console.error("Failed to save bookmark:", error);
      throw error;
    }
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

            {data && (
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
