import {
  formatDuration,
  formatGas,
  formatPYUSD,
  formatAddress,
  formatPercentage,
  safeJsonStringify,
} from "../utils";
import { EXPORT_FORMATS } from "../constants";
import type {
  ExportData,
  ExportFormat,
  ExportMetadata,
  BlockAnalysis,
  ProcessedBlockTrace,
  GasDistributionItem,
  OptimizationOpportunity,
} from "../types";

export interface ExportOptions {
  includeRawData?: boolean;
  includeChartData?: boolean;
  includeInsights?: boolean;
  customFilename?: string;
  compression?: boolean;
}

export class ExportManager {
  /**
   * Export analysis data in the specified format
   */
  async exportData(
    data: ExportData,
    format: ExportFormat,
    filename?: string,
    options: ExportOptions = {}
  ): Promise<string> {
    console.log(`Exporting block analysis data in ${format} format...`);

    const actualFilename =
      filename || this.generateFilename(data.metadata, format);

    try {
      switch (format) {
        case "csv":
          return await this.exportToCSV(data, actualFilename, options);
        case "json":
          return await this.exportToJSON(data, actualFilename, options);
        case "google_sheets":
          return await this.exportToGoogleSheets(data, actualFilename, options);
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      console.error(`Export failed:`, error);
      throw new Error(
        `Failed to export data: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Export to CSV format
   */
  private async exportToCSV(
    data: ExportData,
    filename: string,
    options: ExportOptions
  ): Promise<string> {
    const csvSections: string[] = [];

    // Metadata section
    csvSections.push(this.createMetadataCSV(data.metadata));

    // Block summary section
    csvSections.push(this.createBlockSummaryCSV(data.blockAnalysis));

    // Transaction details section
    csvSections.push(this.createTransactionCSV(data.blockAnalysis.traces));

    // Gas analysis section
    if (data.blockAnalysis.gasAnalysis) {
      csvSections.push(
        this.createGasAnalysisCSV(data.blockAnalysis.gasAnalysis)
      );
    }

    // Token flow section
    if (
      data.blockAnalysis.tokenFlowAnalysis &&
      data.blockAnalysis.tokenFlowAnalysis.pyusdTransactions.length > 0
    ) {
      csvSections.push(
        this.createTokenFlowCSV(data.blockAnalysis.tokenFlowAnalysis)
      );
    }

    // Performance metrics section
    csvSections.push(this.createPerformanceCSV(data.performanceMetrics));

    const csvContent = csvSections.join("\n\n");
    return this.downloadFile(csvContent, filename, "text/csv");
  }

  /**
   * Export to JSON format
   */
  private async exportToJSON(
    data: ExportData,
    filename: string,
    options: ExportOptions
  ): Promise<string> {
    // Create a clean export object
    const exportObject = {
      metadata: data.metadata,
      blockAnalysis: {
        blockNumber: data.blockAnalysis.blockNumber,
        blockHash: data.blockAnalysis.blockHash,
        timestamp: data.blockAnalysis.timestamp,
        summary: data.blockAnalysis.summary,
        transactions: data.blockAnalysis.traces.map((trace) => ({
          id: trace.id,
          transactionHash: trace.transactionHash,
          transactionIndex: trace.transactionIndex,
          type: trace.type,
          from: trace.from,
          to: trace.to,
          value: trace.value.toString(),
          valueEth: trace.valueEth,
          gasUsed: trace.gasUsed.toString(),
          success: trace.success,
          category: trace.category,
          pyusdDetails: trace.pyusdDetails
            ? {
                ...trace.pyusdDetails,
                amount: trace.pyusdDetails.amount.toString(),
                gasUsed: trace.pyusdDetails.gasUsed.toString(),
              }
            : undefined,
        })),
        gasAnalysis: data.blockAnalysis.gasAnalysis
          ? {
              totalGasUsed:
                data.blockAnalysis.gasAnalysis.totalGasUsed.toString(),
              averageGasPerTrace:
                data.blockAnalysis.gasAnalysis.averageGasPerTrace,
              gasDistribution:
                data.blockAnalysis.gasAnalysis.gasDistribution.map((item) => ({
                  ...item,
                  gasUsed: item.gasUsed.toString(),
                })),
              gasEfficiency: {
                ...data.blockAnalysis.gasAnalysis.gasEfficiency,
                wastedGas:
                  data.blockAnalysis.gasAnalysis.gasEfficiency.wastedGas.toString(),
              },
              optimizationOpportunities:
                data.blockAnalysis.gasAnalysis.optimizationOpportunities.map(
                  (opp) => ({
                    ...opp,
                    potentialSavings: {
                      ...opp.potentialSavings,
                      gasAmount: opp.potentialSavings.gasAmount.toString(),
                    },
                  })
                ),
            }
          : undefined,
        tokenFlowAnalysis: data.blockAnalysis.tokenFlowAnalysis
          ? {
              pyusdTransactions:
                data.blockAnalysis.tokenFlowAnalysis.pyusdTransactions.map(
                  (tx) => ({
                    ...tx,
                    amount: tx.amount.toString(),
                    gasUsed: tx.gasUsed.toString(),
                  })
                ),
              flowMetrics: {
                ...data.blockAnalysis.tokenFlowAnalysis.flowMetrics,
                totalVolume:
                  data.blockAnalysis.tokenFlowAnalysis.flowMetrics.totalVolume.toString(),
                averageTransferAmount:
                  data.blockAnalysis.tokenFlowAnalysis.flowMetrics.averageTransferAmount.toString(),
                largestTransfer:
                  data.blockAnalysis.tokenFlowAnalysis.flowMetrics.largestTransfer.toString(),
              },
              networkAnalysis:
                data.blockAnalysis.tokenFlowAnalysis.networkAnalysis,
              flowDiagram: data.blockAnalysis.tokenFlowAnalysis.flowDiagram,
            }
          : undefined,
      },
      performanceMetrics: data.performanceMetrics,
    };

    const jsonContent = safeJsonStringify(exportObject, 2);
    return this.downloadFile(jsonContent, filename, "application/json");
  }

  /**
   * Export to Google Sheets (placeholder implementation)
   */
  private async exportToGoogleSheets(
    data: ExportData,
    filename: string,
    options: ExportOptions
  ): Promise<string> {
    // This would require Google Sheets API integration
    // For now, we'll fall back to CSV export
    console.warn("Google Sheets export not implemented, falling back to CSV");
    return this.exportToCSV(data, filename.replace(".sheets", ".csv"), options);
  }

  /**
   * CSV creation helper methods
   */
  private createMetadataCSV(metadata: ExportMetadata): string {
    const rows = [
      ["EXPORT METADATA"],
      ["Exported At", metadata.exportedAt],
      ["Block Number", metadata.blockNumber.toString()],
      ["Block Hash", metadata.blockHash],
      ["Network", metadata.network],
      ["Analysis Version", metadata.analysisVersion],
      ["Export Format", metadata.exportFormat],
    ];

    return this.arrayToCSV(rows);
  }

  private createBlockSummaryCSV(blockAnalysis: BlockAnalysis): string {
    const rows = [
      ["BLOCK SUMMARY"],
      ["Block Number", blockAnalysis.blockNumber.toString()],
      ["Block Hash", blockAnalysis.blockHash],
      ["Timestamp", new Date(blockAnalysis.timestamp * 1000).toISOString()],
      [
        "Total Transactions",
        blockAnalysis.summary.totalTransactions.toString(),
      ],
      [
        "Successful Transactions",
        blockAnalysis.summary.successfulTransactions.toString(),
      ],
      [
        "Failed Transactions",
        blockAnalysis.summary.failedTransactions.toString(),
      ],
      ["Success Rate", formatPercentage(blockAnalysis.summary.successRate)],
      [
        "PYUSD Transactions",
        blockAnalysis.summary.pyusdTransactions.toString(),
      ],
      [
        "PYUSD Percentage",
        formatPercentage(blockAnalysis.summary.pyusdPercentage),
      ],
      ["Total Value (ETH)", blockAnalysis.summary.totalValue],
      ["Total Gas Used", blockAnalysis.summary.totalGasUsed],
      ["Average Gas Per Tx", blockAnalysis.summary.averageGasPerTx],
    ];

    return this.arrayToCSV(rows);
  }

  private createTransactionCSV(traces: ProcessedBlockTrace[]): string {
    const headers = [
      "Transaction Hash",
      "Transaction Index",
      "Type",
      "From",
      "To",
      "Value (ETH)",
      "Gas Used",
      "Success",
      "Category Type",
      "Category Subtype",
      "PYUSD Type",
      "PYUSD Amount",
      "Error",
    ];

    const rows = [
      ["TRANSACTION DETAILS"],
      headers,
      ...traces.map((trace) => [
        trace.transactionHash,
        trace.transactionIndex.toString(),
        trace.type,
        trace.from,
        trace.to || "",
        trace.valueEth.toString(),
        formatGas(trace.gasUsed),
        trace.success ? "Yes" : "No",
        trace.category.type,
        trace.category.subtype,
        trace.pyusdDetails?.type || "",
        trace.pyusdDetails?.amountFormatted || "",
        trace.error || "",
      ]),
    ];

    return this.arrayToCSV(rows);
  }

  private createGasAnalysisCSV(gasAnalysis: any): string {
    const summaryRows = [
      ["GAS ANALYSIS SUMMARY"],
      ["Total Gas Used", formatGas(gasAnalysis.totalGasUsed)],
      [
        "Average Gas Per Trace",
        Math.round(gasAnalysis.averageGasPerTrace).toString(),
      ],
      ["Success Rate", formatPercentage(gasAnalysis.gasEfficiency.successRate)],
      [
        "Efficiency Score",
        gasAnalysis.gasEfficiency.efficiencyScore.toString(),
      ],
      ["Wasted Gas", formatGas(gasAnalysis.gasEfficiency.wastedGas)],
      [""],
    ];

    const distributionHeaders = [
      "Category",
      "Gas Used",
      "Percentage",
      "Transaction Count",
      "Average Gas Per Transaction",
    ];

    const distributionRows = [
      ["GAS DISTRIBUTION BY CATEGORY"],
      distributionHeaders,
      ...gasAnalysis.gasDistribution.map((item: GasDistributionItem) => [
        item.category,
        formatGas(item.gasUsed),
        formatPercentage(item.percentage),
        item.transactionCount.toString(),
        Math.round(item.averageGasPerTransaction).toString(),
      ]),
    ];

    const optimizationRows = [
      [""],
      ["OPTIMIZATION OPPORTUNITIES"],
      [
        "Type",
        "Severity",
        "Description",
        "Potential Savings (Gas)",
        "Potential Savings (%)",
      ],
      ...gasAnalysis.optimizationOpportunities.map(
        (opp: OptimizationOpportunity) => [
          opp.type,
          opp.severity,
          opp.description,
          formatGas(opp.potentialSavings.gasAmount),
          formatPercentage(opp.potentialSavings.percentage),
        ]
      ),
    ];

    return this.arrayToCSV([
      ...summaryRows,
      ...distributionRows,
      ...optimizationRows,
    ]);
  }

  private createTokenFlowCSV(tokenFlowAnalysis: any): string {
    const metricsRows = [
      ["PYUSD TOKEN FLOW ANALYSIS"],
      [
        "Total Transfers",
        tokenFlowAnalysis.flowMetrics.totalTransfers.toString(),
      ],
      ["Total Volume", tokenFlowAnalysis.flowMetrics.totalVolumeFormatted],
      [
        "Unique Senders",
        tokenFlowAnalysis.flowMetrics.uniqueSenders.toString(),
      ],
      [
        "Unique Receivers",
        tokenFlowAnalysis.flowMetrics.uniqueReceivers.toString(),
      ],
      [
        "Average Transfer Amount",
        tokenFlowAnalysis.flowMetrics.averageTransferAmountFormatted,
      ],
      [
        "Largest Transfer",
        tokenFlowAnalysis.flowMetrics.largestTransferFormatted,
      ],
      [""],
    ];

    const transactionHeaders = [
      "Type",
      "From",
      "To",
      "Amount",
      "Success",
      "Gas Used",
    ];

    const transactionRows = [
      ["PYUSD TRANSACTIONS"],
      transactionHeaders,
      ...tokenFlowAnalysis.pyusdTransactions.map((tx: any) => [
        tx.type,
        tx.from || "",
        tx.to || "",
        tx.amountFormatted,
        tx.success ? "Yes" : "No",
        formatGas(tx.gasUsed),
      ]),
    ];

    return this.arrayToCSV([...metricsRows, ...transactionRows]);
  }

  private createPerformanceCSV(performanceMetrics: any): string {
    const rows = [
      ["PERFORMANCE METRICS"],
      ["Execution Time", formatDuration(performanceMetrics.executionTime)],
      ["Memory Usage (bytes)", performanceMetrics.memoryUsage.toString()],
      ["Cache Hit Rate", formatPercentage(performanceMetrics.cacheHitRate)],
      ["RPC Call Count", performanceMetrics.rpcCallCount.toString()],
      [""],
      ["PROCESSING STEPS"],
      ["Step Name", "Duration (ms)", "Status"],
      ...performanceMetrics.processingSteps.map((step: any) => [
        step.name,
        step.duration.toString(),
        step.status,
      ]),
    ];

    return this.arrayToCSV(rows);
  }

  /**
   * Utility methods
   */
  private arrayToCSV(data: (string | number)[][]): string {
    return data
      .map((row) =>
        row
          .map((cell) => {
            const cellStr = String(cell);
            // Escape quotes and wrap in quotes if contains comma, quote, or newline
            if (
              cellStr.includes(",") ||
              cellStr.includes('"') ||
              cellStr.includes("\n")
            ) {
              return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
          })
          .join(",")
      )
      .join("\n");
  }

  private generateFilename(
    metadata: ExportMetadata,
    format: ExportFormat
  ): string {
    const timestamp = new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:.]/g, "-");
    const extension =
      EXPORT_FORMATS[format.toUpperCase() as keyof typeof EXPORT_FORMATS]
        ?.extension || format;
    return `block-${metadata.blockNumber}-analysis-${timestamp}.${extension}`;
  }

  private downloadFile(
    content: string,
    filename: string,
    mimeType: string
  ): string {
    try {
      // Create blob and download link
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);

      // Create temporary download link
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.style.display = "none";

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Cleanup
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      console.log(`File downloaded successfully: ${filename}`);
      return url;
    } catch (error) {
      console.error("Download failed:", error);
      throw new Error(
        `Failed to download file: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Validate export data before processing
   */
  private validateExportData(data: ExportData): void {
    if (!data.metadata) {
      throw new Error("Export metadata is required");
    }

    if (!data.blockAnalysis) {
      throw new Error("Block analysis data is required");
    }

    if (!data.blockAnalysis.blockNumber || !data.blockAnalysis.blockHash) {
      throw new Error("Block number and hash are required");
    }
  }

  /**
   * Get supported export formats
   */
  static getSupportedFormats(): ExportFormat[] {
    return ["csv", "json", "google_sheets"];
  }

  /**
   * Get format information
   */
  static getFormatInfo(format: ExportFormat): {
    extension: string;
    mimeType: string;
    description: string;
  } {
    const formatKey = format.toUpperCase() as keyof typeof EXPORT_FORMATS;
    return (
      EXPORT_FORMATS[formatKey] || {
        extension: format,
        mimeType: "application/octet-stream",
        description: "Unknown format",
      }
    );
  }

  /**
   * Estimate export size
   */
  static estimateExportSize(data: ExportData, format: ExportFormat): number {
    const jsonSize = safeJsonStringify(data).length;

    switch (format) {
      case "json":
        return jsonSize;
      case "csv":
        return jsonSize * 0.8; // CSV is typically smaller
      case "google_sheets":
        return jsonSize * 1.2; // Sheets format has overhead
      default:
        return jsonSize;
    }
  }
}
