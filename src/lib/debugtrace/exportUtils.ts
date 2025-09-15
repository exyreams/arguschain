import { StructLogAnalysis } from "@/lib/structLogTracer";
import { TransactionAnalysis } from "@/lib/transactionTracer";
import {
  ProcessedCallTraceData,
  ProcessedStructLogData,
  UnifiedGasData,
} from "./types";

// Dynamically import html2canvas to avoid issues with server-side rendering
const html2canvas = (node: HTMLElement, options: any) =>
  import("html2canvas").then((mod) => mod.default(node, options));

export interface ExportOptions {
  format: "png" | "svg" | "csv" | "json";
  filename?: string;
  quality?: number;
  includeMetadata?: boolean;
}

export interface ShareableState {
  txHash: string;
  timestamp: number;
  rpcUrl?: string;
  analysisType: "structlog" | "calltrace" | "unified";
  summary: {
    totalGas: number;
    totalCalls?: number;
    totalSteps?: number;
    successRate?: number;
    optimizationScore?: number;
  };
  bookmarkId?: string;
}

export class ExportUtils {
  static async exportChartAsImage(
    chartElement: HTMLElement,
    options: ExportOptions
  ): Promise<void> {
    const { format, filename = "chart", quality = 2 } = options;

    try {
      // Close any open dropdowns before export to prevent them from being captured.
      // This is a defensive measure; primary logic is in the React component.
      const openDropdowns = document.querySelectorAll('[data-state="open"]');
      openDropdowns.forEach((dropdown) => {
        if (dropdown instanceof HTMLElement) {
          dropdown.style.display = "none"; // Temporarily hide
        }
      });
      // Allow DOM to update
      await new Promise((resolve) => setTimeout(resolve, 50));

      if (format === "png") {
        await this.exportAsPNG(chartElement, filename, quality);
      } else if (format === "svg") {
        await this.exportAsSVG(chartElement, filename);
      }

      // Restore dropdowns
      openDropdowns.forEach((dropdown) => {
        if (dropdown instanceof HTMLElement) {
          dropdown.style.display = "";
        }
      });
    } catch (error) {
      console.error("Chart export failed:", error);
      throw new Error(`Failed to export chart as ${format.toUpperCase()}`);
    }
  }

  static exportDataAsCSV(
    data: any[],
    filename: string = "trace-data",
    headers?: string[]
  ): void {
    try {
      const csvContent = this.convertToCSV(data, headers);
      this.downloadFile(csvContent, `${filename}.csv`, "text/csv");
    } catch (error) {
      console.error("CSV export failed:", error);
      throw new Error("Failed to export data as CSV");
    }
  }

  static exportDataAsJSON(
    data: any,
    filename: string = "trace-data",
    includeMetadata: boolean = true
  ): void {
    try {
      const exportData = includeMetadata
        ? {
            metadata: {
              exportedAt: new Date().toISOString(),
              version: "1.0.0",
              source: "ArgusChain Transaction Tracer",
            },
            data,
          }
        : data;

      const jsonContent = JSON.stringify(exportData, null, 2);
      this.downloadFile(jsonContent, `${filename}.json`, "application/json");
    } catch (error) {
      console.error("JSON export failed:", error);
      throw new Error("Failed to export data as JSON");
    }
  }

  static exportStructLogData(
    structLog: StructLogAnalysis,
    processedData: ProcessedStructLogData,
    format: "csv" | "json" = "json"
  ): void {
    if (format === "csv") {
      this.exportDataAsCSV(
        processedData.opcodeDistribution,
        "structlog-opcode-distribution",
        ["category", "gasUsed", "percentage", "count"]
      );
    } else {
      const exportData = {
        summary: structLog.summary,
        topOpcodes: structLog.top_opcodes,
        processedData: {
          opcodeDistribution: processedData.opcodeDistribution,
          performanceMetrics: processedData.performanceMetrics,
        },
      };
      this.exportDataAsJSON(exportData, "structlog-trace");
    }
  }

  static exportCallTraceData(
    callTrace: TransactionAnalysis,
    processedData: ProcessedCallTraceData,
    format: "csv" | "json" = "json"
  ): void {
    if (format === "csv") {
      this.exportDataAsCSV(
        processedData.gasAttribution,
        "calltrace-gas-attribution",
        [
          "contractAddress",
          "contractName",
          "gasUsed",
          "percentage",
          "callCount",
        ]
      );
    } else {
      const exportData = {
        transactionStats: callTrace.transaction_stats,
        processedData: {
          gasAttribution: processedData.gasAttribution,
          contractInteractions: processedData.contractInteractions,
        },
      };
      this.exportDataAsJSON(exportData, "calltrace-trace");
    }
  }

  static exportUnifiedData(
    unifiedData: UnifiedGasData,
    format: "csv" | "json" = "json"
  ): void {
    if (format === "csv") {
      this.exportDataAsCSV(unifiedData.gasBreakdown, "unified-gas-breakdown", [
        "category",
        "contractGas",
        "opcodeGas",
        "total",
        "percentage",
      ]);
    } else {
      this.exportDataAsJSON(unifiedData, "unified-trace");
    }
  }

  static generateShareableURL(
    txHash: string,
    analysisType: "structlog" | "calltrace" | "unified",
    summary: ShareableState["summary"],
    rpcUrl?: string
  ): string {
    const state: ShareableState = {
      txHash,
      timestamp: Date.now(),
      rpcUrl,
      analysisType,
      summary,
    };
    const encodedState = btoa(JSON.stringify(state));
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?share=${encodedState}`;
  }

  static parseShareableURL(url: string): ShareableState | null {
    try {
      const urlObj = new URL(url);
      const shareParam = urlObj.searchParams.get("share");
      if (!shareParam) return null;
      const decodedState = atob(shareParam);
      return JSON.parse(decodedState) as ShareableState;
    } catch (error) {
      console.error("Failed to parse shareable URL:", error);
      return null;
    }
  }

  static generateSummaryReport(
    txHash: string,
    structLog?: StructLogAnalysis,
    callTrace?: TransactionAnalysis,
    unifiedData?: UnifiedGasData
  ): string {
    const timestamp = new Date().toISOString();
    let report = `# Transaction Analysis Report\n\n`;
    report += `**Transaction Hash:** ${txHash}\n`;
    report += `**Generated:** ${timestamp}\n\n`;

    if (structLog) {
      report += `## Opcode-Level Analysis\n`;
      report += `- Total Steps: ${structLog.summary.total_steps.toLocaleString()}\n`;
      report += `- Total Gas: ${structLog.summary.total_gas_cost.toLocaleString()}\n`;
      report += `- Top 5 Opcodes: ${structLog.top_opcodes
        .slice(0, 5)
        .map((o) => o.opcode)
        .join(", ")}\n\n`;
    }

    if (callTrace) {
      report += `## Contract-Level Analysis\n`;
      report += `- Total Calls: ${callTrace.transaction_stats.total_calls}\n`;
      report += `- Failed Calls: ${callTrace.transaction_stats.errors}\n\n`;
    }

    if (unifiedData && unifiedData.optimizationSuggestions.length > 0) {
      report += `## Optimization Recommendations\n`;
      unifiedData.optimizationSuggestions.forEach((s) => {
        report += `- **[${s.severity.toUpperCase()}] ${s.title}:** ${s.recommendation}\n`;
      });
    }
    return report;
  }

  static saveBookmark(
    txHash: string,
    analysisType: "structlog" | "calltrace" | "unified",
    summary: ShareableState["summary"],
    name?: string
  ): string {
    const bookmarkId = `bookmark_${Date.now()}`;
    const bookmark = {
      id: bookmarkId,
      name: name || `Analysis of ${txHash.slice(0, 10)}...`,
      txHash,
      analysisType,
      summary,
      createdAt: new Date().toISOString(),
    };

    const existingBookmarks = this.getBookmarks();
    existingBookmarks.push(bookmark);
    localStorage.setItem(
      "arguschain_bookmarks",
      JSON.stringify(existingBookmarks)
    );
    return bookmarkId;
  }

  static getBookmarks(): any[] {
    try {
      const bookmarks = localStorage.getItem("arguschain_bookmarks");
      return bookmarks ? JSON.parse(bookmarks) : [];
    } catch (error) {
      console.error("Failed to load bookmarks:", error);
      return [];
    }
  }

  static deleteBookmark(bookmarkId: string): void {
    const bookmarks = this.getBookmarks();
    const filtered = bookmarks.filter((b) => b.id !== bookmarkId);
    localStorage.setItem("arguschain_bookmarks", JSON.stringify(filtered));
  }

  // --- PRIVATE HELPER METHODS ---

  private static async exportAsSVG(
    element: HTMLElement,
    filename: string
  ): Promise<void> {
    const svgElement = element.querySelector("svg");
    if (!svgElement) throw new Error("No SVG element found in the chart.");
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });
    this.downloadBlob(svgBlob, `${filename}.svg`);
  }

  // --- THIS IS THE CORRECTED METHOD ---
  private static async exportAsPNG(
    element: HTMLElement,
    filename: string,
    quality: number
  ): Promise<void> {
    try {
      const canvas = await html2canvas(element, {
        backgroundColor: "#191c28", // **THE FIX**: Explicitly set dark background
        scale: quality,
        useCORS: true,
        allowTaint: true,
        logging: false,
      });
      canvas.toBlob(
        (blob) => {
          if (blob) {
            this.downloadBlob(blob, `${filename}.png`);
          } else {
            throw new Error("Canvas toBlob failed to produce a blob.");
          }
        },
        "image/png",
        1.0
      );
    } catch (error) {
      console.error("Error during PNG conversion:", error);
      throw new Error("Failed to convert chart element to PNG.");
    }
  }

  private static convertToCSV(data: any[], headers?: string[]): string {
    if (data.length === 0) return "";
    const csvHeaders = headers || Object.keys(data[0]);
    const csvRows = [
      csvHeaders.join(","),
      ...data.map((row) =>
        csvHeaders
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
    ];
    return csvRows.join("\n");
  }

  private static downloadFile(
    content: string,
    filename: string,
    mimeType: string
  ): void {
    const blob = new Blob([content], { type: mimeType });
    this.downloadBlob(blob, filename);
  }

  private static downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
