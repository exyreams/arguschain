import { ethers } from "ethers";
import type {
  ComparisonResult,
  SimulationResult,
  ValidationResult,
} from "./types";

export class SimulationUtils {
  static shortenAddress(address: string, chars: number = 4): string {
    if (!address) return "";
    if (address.length <= chars * 2 + 2) return address;
    return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
  }

  static formatGas(gas: number): string {
    return gas.toLocaleString();
  }

  static formatTokenAmount(amount: number, decimals: number = 6): string {
    if (amount === 0) return "0";
    if (amount < 0.000001) return "< 0.000001";
    return amount.toFixed(decimals);
  }

  static formatUSD(amount: number): string {
    if (amount < 0.01) return "< $0.01";
    return `$${amount.toFixed(2)}`;
  }

  static formatETH(amount: number): string {
    if (amount < 0.000001) return "< 0.000001 ETH";
    return `${amount.toFixed(6)} ETH`;
  }

  static isValidAddress(address: string): boolean {
    try {
      ethers.getAddress(address);
      return true;
    } catch {
      return false;
    }
  }

  static isValidTxHash(hash: string): boolean {
    return /^0x[a-fA-F0-9]{64}$/.test(hash);
  }

  static isValidAmount(amount: any): boolean {
    const num = Number(amount);
    return !isNaN(num) && num >= 0 && isFinite(num);
  }

  static toRawAmount(amount: number, decimals: number = 6): bigint {
    return BigInt(Math.floor(amount * Math.pow(10, decimals)));
  }

  static fromRawAmount(rawAmount: bigint, decimals: number = 6): number {
    return Number(rawAmount) / Math.pow(10, decimals);
  }

  static calculatePercentage(value: number, total: number): number {
    if (total === 0) return 0;
    return (value / total) * 100;
  }

  static getRelativeTime(timestamp: string): string {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }

  static generateColor(index: number): string {
    const colors = [
      "#00bfff",
      "#ff6b6b",
      "#4ecdc4",
      "#45b7d1",
      "#96ceb4",
      "#feca57",
      "#ff9ff3",
      "#54a0ff",
      "#5f27cd",
      "#00d2d3",
      "#ff9f43",
      "#10ac84",
      "#ee5a24",
      "#0abde3",
      "#c44569",
    ];
    return colors[index % colors.length];
  }

  static validateSimulationParams(
    functionName: string,
    fromAddress: string,
    parameters: any[],
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!functionName || typeof functionName !== "string") {
      errors.push("Function name is required");
    }

    if (!this.isValidAddress(fromAddress)) {
      errors.push("Invalid from address");
    }

    if (!Array.isArray(parameters)) {
      errors.push("Parameters must be an array");
    }

    switch (functionName) {
      case "transfer":
        if (parameters.length !== 2) {
          errors.push("Transfer requires exactly 2 parameters: to, amount");
        } else {
          if (!this.isValidAddress(parameters[0])) {
            errors.push("Invalid recipient address");
          }
          if (!this.isValidAmount(parameters[1])) {
            errors.push("Invalid transfer amount");
          }
          if (Number(parameters[1]) === 0) {
            warnings.push("Transfer amount is zero");
          }
        }
        break;

      case "transferFrom":
        if (parameters.length !== 3) {
          errors.push(
            "TransferFrom requires exactly 3 parameters: from, to, amount",
          );
        } else {
          if (!this.isValidAddress(parameters[0])) {
            errors.push("Invalid from address");
          }
          if (!this.isValidAddress(parameters[1])) {
            errors.push("Invalid to address");
          }
          if (!this.isValidAmount(parameters[2])) {
            errors.push("Invalid transfer amount");
          }
        }
        break;

      case "approve":
        if (parameters.length !== 2) {
          errors.push("Approve requires exactly 2 parameters: spender, amount");
        } else {
          if (!this.isValidAddress(parameters[0])) {
            errors.push("Invalid spender address");
          }
          if (!this.isValidAmount(parameters[1])) {
            errors.push("Invalid approval amount");
          }
        }
        break;

      case "balanceOf":
        if (parameters.length !== 1) {
          errors.push("BalanceOf requires exactly 1 parameter: address");
        } else {
          if (!this.isValidAddress(parameters[0])) {
            errors.push("Invalid address for balance check");
          }
        }
        break;

      case "allowance":
        if (parameters.length !== 2) {
          errors.push(
            "Allowance requires exactly 2 parameters: owner, spender",
          );
        } else {
          if (!this.isValidAddress(parameters[0])) {
            errors.push("Invalid owner address");
          }
          if (!this.isValidAddress(parameters[1])) {
            errors.push("Invalid spender address");
          }
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  static calculateSuccessRate(
    results: (SimulationResult | ComparisonResult)[],
  ): number {
    if (results.length === 0) return 0;

    const successful = results.filter(
      (r) => r.success || r.hypotheticalSuccess,
    ).length;
    return (successful / results.length) * 100;
  }

  static getAverageGas(
    results: (SimulationResult | ComparisonResult)[],
  ): number {
    const successfulResults = results.filter(
      (r) => r.success || r.hypotheticalSuccess,
    );
    if (successfulResults.length === 0) return 0;

    const totalGas = successfulResults.reduce((sum, r) => sum + r.gasUsed, 0);
    return totalGas / successfulResults.length;
  }

  static getGasRange(results: (SimulationResult | ComparisonResult)[]): {
    min: number;
    max: number;
  } {
    const successfulResults = results.filter(
      (r) => r.success || r.hypotheticalSuccess,
    );
    if (successfulResults.length === 0) return { min: 0, max: 0 };

    const gasValues = successfulResults.map((r) => r.gasUsed);
    return {
      min: Math.min(...gasValues),
      max: Math.max(...gasValues),
    };
  }

  static sortByGasEfficiency<
    T extends {
      gasUsed: number;
      success: boolean;
      hypotheticalSuccess: boolean;
    },
  >(results: T[]): T[] {
    return [...results].sort((a, b) => {
      const aSuccess = a.success || a.hypotheticalSuccess;
      const bSuccess = b.success || b.hypotheticalSuccess;

      if (aSuccess && !bSuccess) return -1;
      if (!aSuccess && bSuccess) return 1;

      return a.gasUsed - b.gasUsed;
    });
  }

  static groupByCategory<T extends { gasCategory: string }>(
    results: T[],
  ): Map<string, T[]> {
    const groups = new Map<string, T[]>();

    results.forEach((result) => {
      const category = result.gasCategory;
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(result);
    });

    return groups;
  }

  static createExportFilename(prefix: string, extension: string): string {
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, -5);
    return `${prefix}_${timestamp}.${extension}`;
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

  static formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }

  static isSameAddress(addr1: string, addr2: string): boolean {
    try {
      return ethers.getAddress(addr1) === ethers.getAddress(addr2);
    } catch {
      return false;
    }
  }

  static generateSummary(results: SimulationResult[]): {
    totalSimulations: number;
    successfulSimulations: number;
    hypotheticalSuccesses: number;
    failedSimulations: number;
    totalGasUsed: number;
    averageGasUsed: number;
    mostCommonError: string | null;
  } {
    const successful = results.filter((r) => r.success);
    const hypothetical = results.filter(
      (r) => r.hypotheticalSuccess && !r.success,
    );
    const failed = results.filter((r) => !r.success && !r.hypotheticalSuccess);

    const totalGas = results.reduce((sum, r) => sum + r.gasUsed, 0);
    const avgGas = results.length > 0 ? totalGas / results.length : 0;

    const errorCounts = new Map<string, number>();
    failed.forEach((r) => {
      if (r.error) {
        const count = errorCounts.get(r.error) || 0;
        errorCounts.set(r.error, count + 1);
      }
    });

    let mostCommonError: string | null = null;
    let maxCount = 0;
    errorCounts.forEach((count, error) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommonError = error;
      }
    });

    return {
      totalSimulations: results.length,
      successfulSimulations: successful.length,
      hypotheticalSuccesses: hypothetical.length,
      failedSimulations: failed.length,
      totalGasUsed: totalGas,
      averageGasUsed: avgGas,
      mostCommonError,
    };
  }
}
