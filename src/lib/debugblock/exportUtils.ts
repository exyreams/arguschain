import { BlockInfo, ExportData, ProcessedDebugBlockData } from "./types";
import { GasAnalysisResult } from "./processors";

export class DebugBlockExportUtils {
  static exportToCSV(
    data: ProcessedDebugBlockData,
    blockInfo: BlockInfo,
    gasAnalysis?: GasAnalysisResult,
    options: {
      includeInternalTransactions?: boolean;
      includePyusdOnly?: boolean;
      includeGasAnalysis?: boolean;
    } = {},
  ): string {
    const {
      includeInternalTransactions = true,
      includePyusdOnly = false,
      includeGasAnalysis = true,
    } = options;

    let csvContent = "";

    csvContent += `# Debug Block Trace Export\n`;
    csvContent += `# Block: ${blockInfo.number} (${blockInfo.hash})\n`;
    csvContent += `# Timestamp: ${new Date(blockInfo.timestamp * 1000).toISOString()}\n`;
    csvContent += `# Export Date: ${new Date().toISOString()}\n`;
    csvContent += `# Total Transactions: ${data.summary.total_transactions}\n`;
    csvContent += `# PYUSD Interactions: ${data.summary.pyusd_interactions_count}\n`;
    csvContent += `# Total Gas Used: ${data.summary.total_gas_used}\n`;
    csvContent += `\n`;

    const transactions = includePyusdOnly
      ? data.transactions.filter((tx) => tx.pyusd_interaction)
      : data.transactions;

    csvContent += `## Transaction Data\n`;
    csvContent +=
      [
        "Index",
        "Hash",
        "From",
        "To",
        "Value (ETH)",
        "Gas Used",
        "Failed",
        "PYUSD Interaction",
        "PYUSD Function",
        "PYUSD Category",
        "Is Transfer",
        "Is Mint",
        "Is Burn",
        "Transfer Value",
      ].join(",") + "\n";

    for (const tx of transactions) {
      csvContent +=
        [
          tx.tx_index,
          `"${tx.tx_hash}"`,
          `"${tx.from}"`,
          `"${tx.to}"`,
          `"${tx.value_eth}"`,
          tx.gas_used,
          tx.failed,
          tx.pyusd_interaction,
          `"${tx.pyusd_function || ""}"`,
          `"${tx.pyusd_function_category}"`,
          tx.is_pyusd_transfer,
          tx.is_pyusd_mint,
          tx.is_pyusd_burn,
          tx.transfer_value,
        ].join(",") + "\n";
    }

    if (data.pyusdTransfers.length > 0) {
      csvContent += `\n## PYUSD Transfers\n`;
      csvContent +=
        ["From", "To", "Value", "Transaction Hash"].join(",") + "\n";

      for (const transfer of data.pyusdTransfers) {
        csvContent +=
          [
            `"${transfer.from}"`,
            `"${transfer.to}"`,
            transfer.value,
            `"${transfer.tx_hash}"`,
          ].join(",") + "\n";
      }
    }

    if (includeInternalTransactions && data.internalTransactions.length > 0) {
      csvContent += `\n## Internal PYUSD Transactions\n`;
      csvContent +=
        [
          "Transaction Hash",
          "From",
          "To",
          "Contract",
          "Function",
          "Call Type",
          "Gas Used",
          "Depth",
        ].join(",") + "\n";

      for (const internal of data.internalTransactions) {
        csvContent +=
          [
            `"${internal.tx_hash}"`,
            `"${internal.from}"`,
            `"${internal.to}"`,
            `"${internal.to_contract}"`,
            `"${internal.function}"`,
            `"${internal.call_type}"`,
            internal.gas_used,
            internal.depth,
          ].join(",") + "\n";
      }
    }

    csvContent += `\n## PYUSD Function Categories\n`;
    csvContent += ["Category", "Count"].join(",") + "\n";
    for (const [category, count] of Object.entries(data.functionCategories)) {
      if (count > 0) {
        csvContent += [`"${category}"`, count].join(",") + "\n";
      }
    }

    if (includeGasAnalysis && gasAnalysis) {
      csvContent += `\n## Gas Analysis Summary\n`;
      csvContent += ["Metric", "Value"].join(",") + "\n";
      csvContent +=
        [`"Total Gas Used"`, gasAnalysis.totalGasUsed].join(",") + "\n";
      csvContent +=
        [
          `"Average Gas Per Transaction"`,
          gasAnalysis.averageGasPerTransaction.toFixed(0),
        ].join(",") + "\n";
      csvContent +=
        [`"Gas Efficiency"`, gasAnalysis.gasEfficiency.toFixed(0)].join(",") +
        "\n";
      csvContent +=
        [
          `"Total Cost (ETH)"`,
          gasAnalysis.costAnalysis.totalCostEth.toFixed(6),
        ].join(",") + "\n";
      csvContent +=
        [
          `"Average Cost Per Transaction (ETH)"`,
          gasAnalysis.costAnalysis.averageCostPerTransaction.toFixed(8),
        ].join(",") + "\n";
      csvContent +=
        [
          `"High Gas Transactions"`,
          gasAnalysis.highGasTransactions.length,
        ].join(",") + "\n";
    }

    return csvContent;
  }

  static exportToJSON(
    data: ProcessedDebugBlockData,
    blockInfo: BlockInfo,
    gasAnalysis?: GasAnalysisResult,
    options: {
      includePyusdOnly?: boolean;
      includeGasAnalysis?: boolean;
      prettyPrint?: boolean;
    } = {},
  ): string {
    const {
      includePyusdOnly = false,
      includeGasAnalysis = true,
      prettyPrint = true,
    } = options;

    const transactions = includePyusdOnly
      ? data.transactions.filter((tx) => tx.pyusd_interaction)
      : data.transactions;

    const exportData: ExportData & {
      blockInfo: BlockInfo;
      gasAnalysis?: GasAnalysisResult;
      exportMetadata: {
        exportDate: string;
        exportOptions: typeof options;
        totalTransactions: number;
        filteredTransactions: number;
      };
    } = {
      summary: data.summary,
      transactions,
      pyusd_transfers: data.pyusdTransfers,
      internal_transactions: data.internalTransactions,
      function_categories: data.functionCategories,
      blockInfo,
      gasAnalysis: includeGasAnalysis ? gasAnalysis : undefined,
      exportMetadata: {
        exportDate: new Date().toISOString(),
        exportOptions: options,
        totalTransactions: data.transactions.length,
        filteredTransactions: transactions.length,
      },
    };

    return prettyPrint
      ? JSON.stringify(exportData, null, 2)
      : JSON.stringify(exportData);
  }

  static generateSheetsData(
    data: ProcessedDebugBlockData,
    blockInfo: BlockInfo,
    gasAnalysis?: GasAnalysisResult,
  ): {
    sheets: Array<{
      name: string;
      headers: string[];
      rows: (string | number | boolean)[][];
    }>;
    metadata: {
      title: string;
      description: string;
      blockNumber: number;
      blockHash: string;
      exportDate: string;
    };
  } {
    const sheets = [];

    sheets.push({
      name: "Summary",
      headers: ["Metric", "Value"],
      rows: [
        ["Block Number", blockInfo.number],
        ["Block Hash", blockInfo.hash],
        ["Timestamp", new Date(blockInfo.timestamp * 1000).toISOString()],
        ["Total Transactions", data.summary.total_transactions],
        ["PYUSD Interactions", data.summary.pyusd_interactions_count],
        ["PYUSD Transfers", data.summary.pyusd_transfer_count],
        ["PYUSD Mints", data.summary.pyusd_mint_count],
        ["PYUSD Burns", data.summary.pyusd_burn_count],
        ["Total Gas Used", data.summary.total_gas_used],
        ["Failed Traces", data.summary.failed_traces_count],
        ["PYUSD Volume", data.summary.pyusd_volume_formatted],
        ["PYUSD Percentage", `${data.summary.pyusd_percentage.toFixed(2)}%`],
      ],
    });

    sheets.push({
      name: "Transactions",
      headers: [
        "Index",
        "Hash",
        "From",
        "To",
        "Value (ETH)",
        "Gas Used",
        "Failed",
        "PYUSD Interaction",
        "PYUSD Function",
        "PYUSD Category",
        "Is Transfer",
        "Is Mint",
        "Is Burn",
        "Transfer Value",
      ],
      rows: data.transactions.map((tx) => [
        tx.tx_index,
        tx.tx_hash,
        tx.from,
        tx.to,
        tx.value_eth,
        tx.gas_used,
        tx.failed,
        tx.pyusd_interaction,
        tx.pyusd_function || "",
        tx.pyusd_function_category,
        tx.is_pyusd_transfer,
        tx.is_pyusd_mint,
        tx.is_pyusd_burn,
        tx.transfer_value,
      ]),
    });

    if (data.pyusdTransfers.length > 0) {
      sheets.push({
        name: "PYUSD Transfers",
        headers: [
          "From",
          "To",
          "Value",
          "Value (Formatted)",
          "Transaction Hash",
        ],
        rows: data.pyusdTransfers.map((transfer) => [
          transfer.from,
          transfer.to,
          transfer.value,
          `${(transfer.value / 1e6).toFixed(6)} PYUSD`,
          transfer.tx_hash,
        ]),
      });
    }

    if (data.internalTransactions.length > 0) {
      sheets.push({
        name: "Internal Transactions",
        headers: [
          "Transaction Hash",
          "From",
          "To",
          "Contract",
          "Function",
          "Call Type",
          "Gas Used",
          "Depth",
        ],
        rows: data.internalTransactions.map((internal) => [
          internal.tx_hash,
          internal.from,
          internal.to,
          internal.to_contract,
          internal.function,
          internal.call_type,
          internal.gas_used,
          internal.depth,
        ]),
      });
    }

    const categoryEntries = Object.entries(data.functionCategories).filter(
      ([_, count]) => count > 0,
    );
    if (categoryEntries.length > 0) {
      sheets.push({
        name: "Function Categories",
        headers: ["Category", "Count", "Percentage"],
        rows: categoryEntries.map(([category, count]) => [
          category.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
          count,
          `${((count / data.summary.pyusd_interactions_count) * 100).toFixed(2)}%`,
        ]),
      });
    }

    if (gasAnalysis) {
      const gasRows = [
        ["Total Gas Used", gasAnalysis.totalGasUsed],
        [
          "Average Gas Per Transaction",
          gasAnalysis.averageGasPerTransaction.toFixed(0),
        ],
        ["Gas Efficiency", gasAnalysis.gasEfficiency.toFixed(0)],
        ["Total Cost (ETH)", gasAnalysis.costAnalysis.totalCostEth.toFixed(6)],
        [
          "Average Cost Per Transaction (ETH)",
          gasAnalysis.costAnalysis.averageCostPerTransaction.toFixed(8),
        ],
        [
          "PYUSD Transactions Cost (ETH)",
          gasAnalysis.costAnalysis.pyusdTransactionsCost.toFixed(6),
        ],
        [
          "Regular Transactions Cost (ETH)",
          gasAnalysis.costAnalysis.regularTransactionsCost.toFixed(6),
        ],
        ["High Gas Transactions", gasAnalysis.highGasTransactions.length],
      ];

      gasAnalysis.gasOptimizationSuggestions.forEach((suggestion, index) => {
        gasRows.push([`Optimization Suggestion ${index + 1}`, suggestion]);
      });

      sheets.push({
        name: "Gas Analysis",
        headers: ["Metric", "Value"],
        rows: gasRows,
      });
    }

    return {
      sheets,
      metadata: {
        title: `Debug Block Trace - Block ${blockInfo.number}`,
        description: `Comprehensive analysis of block ${blockInfo.number} (${blockInfo.hash}) with ${data.summary.total_transactions} transactions and ${data.summary.pyusd_interactions_count} PYUSD interactions.`,
        blockNumber: blockInfo.number,
        blockHash: blockInfo.hash,
        exportDate: new Date().toISOString(),
      },
    };
  }

  static downloadFile(
    content: string,
    filename: string,
    mimeType: string = "text/plain",
  ): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  static generateFilename(
    blockInfo: BlockInfo,
    format: "csv" | "json" | "xlsx",
    options: {
      includePyusdOnly?: boolean;
      includeTimestamp?: boolean;
    } = {},
  ): string {
    const { includePyusdOnly = false, includeTimestamp = true } = options;

    let filename = `debug-block-${blockInfo.number}`;

    if (includePyusdOnly) {
      filename += "-pyusd-only";
    }

    if (includeTimestamp) {
      const timestamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/:/g, "-");
      filename += `-${timestamp}`;
    }

    filename += `.${format}`;

    return filename;
  }

  static exportAndDownloadCSV(
    data: ProcessedDebugBlockData,
    blockInfo: BlockInfo,
    gasAnalysis?: GasAnalysisResult,
    options: {
      includeInternalTransactions?: boolean;
      includePyusdOnly?: boolean;
      includeGasAnalysis?: boolean;
      customFilename?: string;
    } = {},
  ): void {
    const csvContent = this.exportToCSV(data, blockInfo, gasAnalysis, options);
    const filename =
      options.customFilename ||
      this.generateFilename(blockInfo, "csv", {
        includePyusdOnly: options.includePyusdOnly,
      });

    this.downloadFile(csvContent, filename, "text/csv");
  }

  static exportAndDownloadJSON(
    data: ProcessedDebugBlockData,
    blockInfo: BlockInfo,
    gasAnalysis?: GasAnalysisResult,
    options: {
      includePyusdOnly?: boolean;
      includeGasAnalysis?: boolean;
      prettyPrint?: boolean;
      customFilename?: string;
    } = {},
  ): void {
    const jsonContent = this.exportToJSON(
      data,
      blockInfo,
      gasAnalysis,
      options,
    );
    const filename =
      options.customFilename ||
      this.generateFilename(blockInfo, "json", {
        includePyusdOnly: options.includePyusdOnly,
      });

    this.downloadFile(jsonContent, filename, "application/json");
  }

  static async copyToClipboard(
    data: ProcessedDebugBlockData,
    blockInfo: BlockInfo,
    format: "csv" | "json" = "json",
    gasAnalysis?: GasAnalysisResult,
  ): Promise<void> {
    let content: string;

    if (format === "csv") {
      content = this.exportToCSV(data, blockInfo, gasAnalysis);
    } else {
      content = this.exportToJSON(data, blockInfo, gasAnalysis);
    }

    try {
      await navigator.clipboard.writeText(content);
    } catch (error) {
      const textArea = document.createElement("textarea");
      textArea.value = content;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
  }

  static generateExportSummary(
    data: ProcessedDebugBlockData,
    blockInfo: BlockInfo,
    options: {
      format: "csv" | "json" | "sheets";
      includePyusdOnly?: boolean;
      includeGasAnalysis?: boolean;
    },
  ): {
    summary: string;
    details: Array<{ label: string; value: string | number }>;
    warnings: string[];
  } {
    const {
      format,
      includePyusdOnly = false,
      includeGasAnalysis = true,
    } = options;

    const transactionCount = includePyusdOnly
      ? data.transactions.filter((tx) => tx.pyusd_interaction).length
      : data.transactions.length;

    const summary = `Exported block ${blockInfo.number} analysis in ${format.toUpperCase()} format with ${transactionCount} transactions.`;

    const details = [
      { label: "Block Number", value: blockInfo.number },
      { label: "Total Transactions", value: data.summary.total_transactions },
      { label: "Exported Transactions", value: transactionCount },
      {
        label: "PYUSD Interactions",
        value: data.summary.pyusd_interactions_count,
      },
      { label: "PYUSD Transfers", value: data.pyusdTransfers.length },
      {
        label: "Internal Transactions",
        value: data.internalTransactions.length,
      },
      { label: "Export Format", value: format.toUpperCase() },
    ];

    const warnings: string[] = [];

    if (includePyusdOnly && data.summary.pyusd_interactions_count === 0) {
      warnings.push("No PYUSD interactions found in this block");
    }

    if (data.summary.failed_traces_count > 0) {
      warnings.push(
        `${data.summary.failed_traces_count} failed transactions included in export`,
      );
    }

    if (transactionCount > 1000) {
      warnings.push(
        "Large dataset exported - file may be slow to open in some applications",
      );
    }

    return { summary, details, warnings };
  }
}
