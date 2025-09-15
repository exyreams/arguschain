import { BlockTransactionSummary, ExportData, ExportOptions } from "./types";
import { DISPLAY_CONFIG, EXPORT_CONFIG } from "./constants";

export class DebugBlockUtils {
  static formatEthValue(weiValue: string | number | bigint): string {
    try {
      const wei =
        typeof weiValue === "string" ? BigInt(weiValue) : BigInt(weiValue);
      const eth = Number(wei) / 1e18;
      return `${eth.toFixed(DISPLAY_CONFIG.ETH_DECIMAL_PLACES)} ETH`;
    } catch (error) {
      console.warn(`Failed to format ETH value: ${weiValue}`, error);
      return "0 ETH";
    }
  }

  static formatPyusdValue(value: number): string {
    if (value === 0) return "0 PYUSD";
    try {
      const pyusdValue = value / 1e6;
      return `${pyusdValue.toFixed(DISPLAY_CONFIG.PYUSD_DECIMAL_PLACES)} PYUSD`;
    } catch (error) {
      console.warn(`Failed to format PYUSD value: ${value}`, error);
      return "0 PYUSD";
    }
  }

  static formatGasValue(gas: number): string {
    return gas.toLocaleString();
  }

  static formatPercentage(value: number): string {
    return `${value.toFixed(DISPLAY_CONFIG.PERCENTAGE_DECIMAL_PLACES)}%`;
  }

  static shortenAddress(
    address: string,
    length: number = DISPLAY_CONFIG.ADDRESS_DISPLAY_LENGTH,
  ): string {
    if (address.length <= length) {
      return address;
    }
    const prefixLength = Math.floor(length / 2);
    const suffixLength = length - prefixLength - 3;
    return `${address.slice(0, prefixLength)}...${address.slice(-suffixLength)}`;
  }

  static parseHexToInt(hexStr: string): number {
    if (!hexStr || hexStr === "0x") return 0;
    try {
      return parseInt(hexStr, 16);
    } catch (error) {
      console.warn(`Failed to parse hex value: ${hexStr}`, error);
      return 0;
    }
  }

  static parseHexToBigInt(hexStr: string): bigint {
    if (!hexStr || hexStr === "0x") return BigInt(0);
    try {
      return BigInt(hexStr);
    } catch (error) {
      console.warn(`Failed to parse hex value to BigInt: ${hexStr}`, error);
      return BigInt(0);
    }
  }

  static numberToHex(num: number): string {
    return "0x" + num.toString(16);
  }

  static isValidAddress(address: string): boolean {
    return /^0x[0-9a-fA-F]{40}$/.test(address);
  }

  static isValidTxHash(hash: string): boolean {
    return /^0x[0-9a-fA-F]{64}$/.test(hash);
  }

  static timeAgo(timestamp: number): string {
    const now = Date.now() / 1000;
    const diff = now - timestamp;

    if (diff < 60) {
      return `${Math.floor(diff)} seconds ago`;
    } else if (diff < 3600) {
      return `${Math.floor(diff / 60)} minutes ago`;
    } else if (diff < 86400) {
      return `${Math.floor(diff / 3600)} hours ago`;
    } else {
      return `${Math.floor(diff / 86400)} days ago`;
    }
  }

  static formatTimestamp(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleString();
  }

  static formatProcessingTime(milliseconds: number): string {
    if (milliseconds < 1000) {
      return `${milliseconds}ms`;
    } else if (milliseconds < 60000) {
      return `${(milliseconds / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(milliseconds / 60000);
      const seconds = Math.floor((milliseconds % 60000) / 1000);
      return `${minutes}m ${seconds}s`;
    }
  }

  static generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  static deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number,
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number,
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  static sortTransactions(
    transactions: BlockTransactionSummary[],
    sortBy: "gas_used" | "value" | "tx_index" | "pyusd_value",
    order: "asc" | "desc" = "desc",
  ): BlockTransactionSummary[] {
    const sorted = [...transactions].sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (sortBy) {
        case "gas_used":
          aValue = a.gas_used;
          bValue = b.gas_used;
          break;
        case "value":
          aValue = parseFloat(a.value_eth.replace(" ETH", ""));
          bValue = parseFloat(b.value_eth.replace(" ETH", ""));
          break;
        case "tx_index":
          aValue = a.tx_index;
          bValue = b.tx_index;
          break;
        case "pyusd_value":
          aValue = a.transfer_value;
          bValue = b.transfer_value;
          break;
        default:
          aValue = a.tx_index;
          bValue = b.tx_index;
      }

      return order === "asc" ? aValue - bValue : bValue - aValue;
    });

    return sorted;
  }

  static filterTransactions(
    transactions: BlockTransactionSummary[],
    filters: {
      pyusdOnly?: boolean;
      failedOnly?: boolean;
      minGas?: number;
      maxGas?: number;
      addressFilter?: string;
      functionFilter?: string;
    },
  ): BlockTransactionSummary[] {
    let filtered = [...transactions];

    if (filters.pyusdOnly) {
      filtered = filtered.filter((tx) => tx.pyusd_interaction);
    }

    if (filters.failedOnly) {
      filtered = filtered.filter((tx) => tx.failed);
    }

    if (filters.minGas !== undefined) {
      filtered = filtered.filter((tx) => tx.gas_used >= filters.minGas!);
    }

    if (filters.maxGas !== undefined) {
      filtered = filtered.filter((tx) => tx.gas_used <= filters.maxGas!);
    }

    if (filters.addressFilter) {
      const address = filters.addressFilter.toLowerCase();
      filtered = filtered.filter(
        (tx) =>
          tx.from.toLowerCase().includes(address) ||
          tx.to.toLowerCase().includes(address),
      );
    }

    if (filters.functionFilter) {
      const func = filters.functionFilter.toLowerCase();
      filtered = filtered.filter((tx) =>
        tx.pyusd_function?.toLowerCase().includes(func),
      );
    }

    return filtered;
  }

  static groupTransactionsByFunction(
    transactions: BlockTransactionSummary[],
  ): Map<string, BlockTransactionSummary[]> {
    const groups = new Map<string, BlockTransactionSummary[]>();

    for (const tx of transactions) {
      const key = tx.pyusd_function || "Other";
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(tx);
    }

    return groups;
  }

  static calculateTransactionStats(transactions: BlockTransactionSummary[]): {
    totalTransactions: number;
    totalGasUsed: number;
    averageGasUsed: number;
    medianGasUsed: number;
    failureRate: number;
    pyusdRate: number;
    totalPyusdVolume: number;
  } {
    const totalTransactions = transactions.length;
    const totalGasUsed = transactions.reduce((sum, tx) => sum + tx.gas_used, 0);
    const averageGasUsed =
      totalTransactions > 0 ? totalGasUsed / totalTransactions : 0;

    const gasValues = transactions
      .map((tx) => tx.gas_used)
      .sort((a, b) => a - b);
    const medianGasUsed =
      gasValues.length > 0 ? gasValues[Math.floor(gasValues.length / 2)] : 0;

    const failedTransactions = transactions.filter((tx) => tx.failed).length;
    const failureRate =
      totalTransactions > 0
        ? (failedTransactions / totalTransactions) * 100
        : 0;

    const pyusdTransactions = transactions.filter(
      (tx) => tx.pyusd_interaction,
    ).length;
    const pyusdRate =
      totalTransactions > 0 ? (pyusdTransactions / totalTransactions) * 100 : 0;

    const totalPyusdVolume = transactions.reduce(
      (sum, tx) => sum + tx.transfer_value,
      0,
    );

    return {
      totalTransactions,
      totalGasUsed,
      averageGasUsed,
      medianGasUsed,
      failureRate,
      pyusdRate,
      totalPyusdVolume,
    };
  }

  static exportToCSV(data: ExportData, options: ExportOptions): string {
    const { filter_pyusd_only = false } = options;

    let transactions = data.transactions;
    if (filter_pyusd_only) {
      transactions = transactions.filter((tx) => tx.pyusd_interaction);
    }

    const headers = EXPORT_CONFIG.CSV_HEADERS.TRANSACTIONS;
    const csvRows = [headers.join(",")];

    for (const tx of transactions) {
      const row = headers.map((header) => {
        const value = tx[header as keyof BlockTransactionSummary];

        if (
          typeof value === "string" &&
          (value.includes(",") || value.includes('"'))
        ) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      });
      csvRows.push(row.join(","));
    }

    return csvRows.join("\n");
  }

  static exportToJSON(data: ExportData, options: ExportOptions): string {
    const { filter_pyusd_only = false } = options;

    const exportData = {
      summary: data.summary,
      transactions: filter_pyusd_only
        ? data.transactions.filter((tx) => tx.pyusd_interaction)
        : data.transactions,
      pyusd_transfers: data.pyusd_transfers,
      internal_transactions: data.internal_transactions,
      function_categories: data.function_categories,
      exported_at: new Date().toISOString(),
      filter_applied: filter_pyusd_only
        ? "PYUSD transactions only"
        : "All transactions",
    };

    return JSON.stringify(exportData, null, 2);
  }

  static generateFilename(
    baseName: string,
    extension: string,
    blockIdentifier?: string,
  ): string {
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19);
    const blockPart = blockIdentifier ? `_block_${blockIdentifier}` : "";
    return `${baseName}${blockPart}_${timestamp}.${extension}`;
  }

  static validateExportOptions(options: ExportOptions): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!["csv", "json", "sheets"].includes(options.format)) {
      errors.push(`Invalid export format: ${options.format}`);
    }

    if (options.filename && options.filename.length > 255) {
      errors.push("Filename too long (max 255 characters)");
    }

    if (options.sheet_name && options.sheet_name.length > 100) {
      errors.push("Sheet name too long (max 100 characters)");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static createDownloadBlob(content: string, mimeType: string): Blob {
    return new Blob([content], { type: mimeType });
  }

  static triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  static formatLargeNumber(num: number): string {
    if (num >= 1e9) {
      return `${(num / 1e9).toFixed(1)}B`;
    } else if (num >= 1e6) {
      return `${(num / 1e6).toFixed(1)}M`;
    } else if (num >= 1e3) {
      return `${(num / 1e3).toFixed(1)}K`;
    } else {
      return num.toString();
    }
  }

  static getChartColor(
    value: number,
    max: number,
    colorScheme: "gas" | "value" | "success" = "gas",
  ): string {
    const intensity = Math.min(value / max, 1);

    switch (colorScheme) {
      case "gas":
        return `hsl(${120 - intensity * 120}, 70%, 50%)`;
      case "value":
        return `hsl(${240 - intensity * 60}, 70%, 50%)`;
      case "success":
        return intensity > 0.5
          ? DISPLAY_CONFIG.CHART_COLORS.SUCCESS
          : DISPLAY_CONFIG.CHART_COLORS.FAILED;
      default:
        return DISPLAY_CONFIG.CHART_COLORS.PRIMARY;
    }
  }

  static sanitizeString(str: string): string {
    return str
      .replace(/[<>]/g, "")
      .replace(/[^\x20-\x7E]/g, "")
      .trim();
  }

  static isBrowser(): boolean {
    return typeof window !== "undefined" && typeof document !== "undefined";
  }

  static getPreferredTheme(): "light" | "dark" {
    if (!this.isBrowser()) return "light";

    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
}
