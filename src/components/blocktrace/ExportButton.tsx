import React, { useEffect, useRef, useState } from "react";
import { Bookmark, Download, FileText, Image, Share2 } from "lucide-react";
import { LuFileJson } from "react-icons/lu";
import { FaFileCsv } from "react-icons/fa6";
import { toast } from "sonner";
import { toPng, toSvg } from "html-to-image";
import { useCreateBlockTraceBookmark } from "@/hooks/blocktrace/useBlockTraceBookmarks";
import type { BlockAnalysis } from "@/lib/blocktrace/types";

interface ExportButtonProps {
  data?: BlockAnalysis;
  chartRef?: React.RefObject<HTMLDivElement>;
  blockIdentifier?: string;
  analysisType?: "full" | "summary" | "custom";
  filename?: string;
  className?: string;
  network?: string;
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
  blockIdentifier,
  analysisType = "full",
  filename = "block-trace-analysis",
  className = "",
  network = "mainnet",
}: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const createBookmark = useCreateBlockTraceBookmark();

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
          if (blockIdentifier && data) {
            const report = generateSummaryReport(blockIdentifier, data);
            exportDataAsJSON({ report }, `${filename}-report`, false);
            toast.success("Summary report generated");
          }
          break;

        case "share":
          if (blockIdentifier && data) {
            const shareUrl = generateShareableURL(blockIdentifier, data);
            await navigator.clipboard.writeText(shareUrl);
            toast.success("Shareable URL copied to clipboard!");
          }
          break;

        case "bookmark":
          if (blockIdentifier && data) {
            await saveBookmark(blockIdentifier, data);
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

  const exportDataAsCSV = (data: BlockAnalysis, filename: string) => {
    let csvContent = "";
    let headers: string[] = [];
    let rows: string[][] = [];

    // Export block summary
    headers = [
      "Block Number",
      "Block Hash",
      "Total Transactions",
      "Total Gas Used",
      "Success Rate",
      "PYUSD Transactions",
      "PYUSD Percentage",
      "Failed Transactions",
    ];

    rows = [
      [
        data.blockNumber.toString(),
        data.blockHash,
        data.summary.totalTransactions.toString(),
        data.summary.totalGasUsed,
        `${data.summary.successRate.toFixed(2)}%`,
        data.summary.pyusdTransactions.toString(),
        `${data.summary.pyusdPercentage.toFixed(2)}%`,
        data.summary.failedTransactions.toString(),
      ],
    ];

    // Add transaction details
    if (data.traces && data.traces.length > 0) {
      csvContent += headers.join(",") + "\n";
      csvContent += rows.map((row) => row.join(",")).join("\n") + "\n\n";

      // Transaction details
      const txHeaders = [
        "Transaction Hash",
        "Transaction Index",
        "From",
        "To",
        "Value (ETH)",
        "Gas Used",
        "Success",
        "Type",
        "Category",
      ];

      const txRows = data.traces
        .slice(0, 1000)
        .map((trace) => [
          trace.transactionHash,
          trace.transactionIndex.toString(),
          trace.from,
          trace.to || "",
          trace.valueEth.toString(),
          trace.gasUsed.toString(),
          trace.success.toString(),
          trace.type,
          trace.category.type,
        ]);

      csvContent += "Transaction Details\n";
      csvContent += txHeaders.join(",") + "\n";
      csvContent += txRows
        .map((row) =>
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
        )
        .join("\n");
    } else {
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
    }

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
            blockIdentifier,
            analysisType,
            network,
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
    blockIdentifier: string,
    data: BlockAnalysis
  ) => {
    const timestamp = new Date().toISOString();
    let report = `# Block Trace Analysis Report\n\n`;
    report += `**Block Identifier:** ${blockIdentifier}\n`;
    report += `**Analysis Type:** ${analysisType}\n`;
    report += `**Generated:** ${timestamp}\n`;
    report += `**Network:** ${network}\n\n`;

    report += `## Block Summary\n`;
    report += `- Block Number: ${data.blockNumber}\n`;
    report += `- Block Hash: ${data.blockHash}\n`;
    report += `- Total Transactions: ${data.summary.totalTransactions.toLocaleString()}\n`;
    report += `- Total Gas Used: ${data.summary.totalGasUsed}\n`;
    report += `- Success Rate: ${data.summary.successRate.toFixed(2)}%\n`;
    report += `- PYUSD Transactions: ${data.summary.pyusdTransactions} (${data.summary.pyusdPercentage.toFixed(2)}%)\n`;
    report += `- Failed Transactions: ${data.summary.failedTransactions}\n\n`;

    if (data.gasAnalysis) {
      report += `## Gas Analysis\n`;
      report += `- Total Gas Used: ${data.gasAnalysis.totalGasUsed.toString()}\n`;
      report += `- Average Gas per Trace: ${data.gasAnalysis.averageGasPerTrace.toLocaleString()}\n`;
      report += `- Efficiency Score: ${data.gasAnalysis.gasEfficiency.efficiencyScore.toFixed(2)}/100\n`;
      report += `- Wasted Gas: ${data.gasAnalysis.gasEfficiency.wastedGas.toString()}\n\n`;
    }

    if (
      data.tokenFlowAnalysis &&
      data.tokenFlowAnalysis.pyusdTransactions.length > 0
    ) {
      report += `## PYUSD Token Flow\n`;
      report += `- Total Transfers: ${data.tokenFlowAnalysis.flowMetrics.totalTransfers}\n`;
      report += `- Total Volume: ${data.tokenFlowAnalysis.flowMetrics.totalVolumeFormatted}\n`;
      report += `- Unique Senders: ${data.tokenFlowAnalysis.flowMetrics.uniqueSenders}\n`;
      report += `- Unique Receivers: ${data.tokenFlowAnalysis.flowMetrics.uniqueReceivers}\n`;
      report += `- Average Transfer: ${data.tokenFlowAnalysis.flowMetrics.averageTransferAmountFormatted}\n\n`;
    }

    return report;
  };

  const generateShareableURL = (
    blockIdentifier: string,
    data: BlockAnalysis
  ) => {
    const baseUrl = window.location.origin;
    const params = new URLSearchParams({
      block: blockIdentifier,
      network,
      type: analysisType,
      txs: data.summary.totalTransactions.toString(),
      gas: data.summary.totalGasUsed,
      pyusd: data.summary.pyusdTransactions.toString(),
    });
    return `${baseUrl}/block-trace?${params.toString()}`;
  };

  const saveBookmark = async (blockIdentifier: string, data: BlockAnalysis) => {
    try {
      const title = `Block ${blockIdentifier} Analysis (${network})`;
      const analysisResults = {
        totalTransactions: data.summary.totalTransactions,
        totalGasUsed: parseInt(data.summary.totalGasUsed.replace(/,/g, "")),
        pyusdTransactions: data.summary.pyusdTransactions,
        successRate: data.summary.successRate,
        blockNumber: data.blockNumber,
      };

      const bookmarkData = {
        title,
        description: `Block trace analysis for ${blockIdentifier} on ${network}`,
        bookmark_type: "block_trace" as const,
        query_config: {
          blockIdentifier,
          network,
          analysisType,
          includeTokenFlow: true,
          includeGasAnalysis: true,
          lastAnalysisResults: analysisResults,
        },
      };

      await createBookmark.mutateAsync(bookmarkData);
      toast.success("Analysis bookmarked successfully!");
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
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-[rgba(0,191,255,0.1)] hover:text-[#00bfff] transition-colors"
                >
                  <Image className="h-4 w-4 text-[#00bfff]" />
                  Export as PNG
                </button>
                <button
                  onClick={() => handleExport("svg")}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-[rgba(0,191,255,0.1)] hover:text-[#00bfff] transition-colors"
                >
                  <Image className="h-4 w-4 text-[#00bfff]" />
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
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-[rgba(0,191,255,0.1)] hover:text-[#00bfff] transition-colors"
                >
                  <FaFileCsv className="h-4 w-4 text-[#00bfff]" />
                  Export as CSV
                </button>
                <button
                  onClick={() => handleExport("json")}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-[rgba(0,191,255,0.1)] hover:text-[#00bfff] transition-colors"
                >
                  <LuFileJson className="h-4 w-4 text-[#00bfff]" />
                  Export as JSON
                </button>
              </div>
            )}

            {blockIdentifier && data && (
              <div className="p-2">
                <div className="px-3 py-1 text-xs font-medium text-gray-400">
                  Reports & Sharing
                </div>
                <div className="my-2 h-[1px] w-full bg-gradient-to-r from-transparent via-[rgba(0,191,255,0.5)] to-transparent" />
                <button
                  onClick={() => handleExport("report")}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-[rgba(0,191,255,0.1)] hover:text-[#00bfff] transition-colors"
                >
                  <FileText className="h-4 w-4 text-[#00bfff]" />
                  Generate Report
                </button>
                <button
                  onClick={() => handleExport("share")}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-[rgba(0,191,255,0.1)] hover:text-[#00bfff] transition-colors"
                >
                  <Share2 className="h-4 w-4 text-[#00bfff]" />
                  Copy Share URL
                </button>
                <button
                  onClick={() => handleExport("bookmark")}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-[rgba(0,191,255,0.1)] hover:text-[#00bfff] transition-colors"
                >
                  <Bookmark className="h-4 w-4 text-[#00bfff]" />
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
