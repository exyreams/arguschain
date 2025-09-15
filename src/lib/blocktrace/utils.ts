import { ethers } from "ethers";
import { PYUSD_CONTRACTS, FUNCTION_SIGNATURES, GAS_LIMITS } from "./constants";
import type {
  BlockIdentifier,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  TransactionCategory,
  NetworkType,
} from "./types";

/**
 * Validates a block identifier (number, hash, or tag)
 */
export function validateBlockIdentifier(
  blockId: string | number
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (blockId === null || blockId === undefined || blockId === "") {
    errors.push({
      field: "blockId",
      message: "Block identifier is required",
      code: "REQUIRED",
      severity: "error",
    });
    return { isValid: false, errors, warnings };
  }

  const blockIdStr = String(blockId).trim();

  // Check for block tags
  if (
    ["latest", "pending", "earliest", "finalized", "safe"].includes(
      blockIdStr.toLowerCase()
    )
  ) {
    return { isValid: true, errors, warnings };
  }

  // Check for hex block hash (64 characters + 0x prefix)
  if (blockIdStr.startsWith("0x") && blockIdStr.length === 66) {
    const hexPattern = /^0x[0-9a-fA-F]{64}$/;
    if (!hexPattern.test(blockIdStr)) {
      errors.push({
        field: "blockId",
        message: "Invalid block hash format",
        code: "INVALID_HASH",
        severity: "error",
      });
    }
    return { isValid: errors.length === 0, errors, warnings };
  }

  // Check for hex block number
  if (blockIdStr.startsWith("0x")) {
    const hexPattern = /^0x[0-9a-fA-F]+$/;
    if (!hexPattern.test(blockIdStr)) {
      errors.push({
        field: "blockId",
        message: "Invalid hex block number format",
        code: "INVALID_HEX",
        severity: "error",
      });
    } else {
      const blockNumber = parseInt(blockIdStr, 16);
      if (blockNumber < 0) {
        errors.push({
          field: "blockId",
          message: "Block number cannot be negative",
          code: "NEGATIVE_BLOCK",
          severity: "error",
        });
      } else if (blockNumber > 50000000) {
        // Reasonable upper bound
        warnings.push({
          field: "blockId",
          message: "Block number seems very high, please verify",
          suggestion: "Check if this is the correct block number",
        });
      }
    }
    return { isValid: errors.length === 0, errors, warnings };
  }

  // Check for decimal block number
  const decimalPattern = /^\d+$/;
  if (decimalPattern.test(blockIdStr)) {
    const blockNumber = parseInt(blockIdStr, 10);
    if (blockNumber < 0) {
      errors.push({
        field: "blockId",
        message: "Block number cannot be negative",
        code: "NEGATIVE_BLOCK",
        severity: "error",
      });
    } else if (blockNumber > 50000000) {
      // Reasonable upper bound
      warnings.push({
        field: "blockId",
        message: "Block number seems very high, please verify",
        suggestion: "Check if this is the correct block number",
      });
    }
    return { isValid: errors.length === 0, errors, warnings };
  }

  errors.push({
    field: "blockId",
    message:
      "Invalid block identifier format. Use block number, hash, or tag (latest, pending, earliest)",
    code: "INVALID_FORMAT",
    severity: "error",
  });

  return { isValid: false, errors, warnings };
}

/**
 * Formats a block identifier for RPC calls
 */
export function formatBlockIdentifier(blockId: string | number): string {
  const blockIdStr = String(blockId).trim();

  // Block tags - return as-is
  if (
    ["latest", "pending", "earliest", "finalized", "safe"].includes(
      blockIdStr.toLowerCase()
    )
  ) {
    return blockIdStr.toLowerCase();
  }

  // Block hash - return as-is
  if (blockIdStr.startsWith("0x") && blockIdStr.length === 66) {
    return blockIdStr;
  }

  // Hex block number - return as-is
  if (blockIdStr.startsWith("0x")) {
    return blockIdStr;
  }

  // Decimal block number - convert to hex
  const blockNumber = parseInt(blockIdStr, 10);
  return `0x${blockNumber.toString(16)}`;
}

/**
 * Parses a block identifier into its components
 */
export function parseBlockIdentifier(
  blockId: string | number
): BlockIdentifier {
  const blockIdStr = String(blockId).trim();

  // Block tags
  if (
    ["latest", "pending", "earliest", "finalized", "safe"].includes(
      blockIdStr.toLowerCase()
    )
  ) {
    return {
      value: blockIdStr.toLowerCase(),
      type: "tag",
    };
  }

  // Block hash
  if (blockIdStr.startsWith("0x") && blockIdStr.length === 66) {
    return {
      value: blockIdStr,
      type: "hash",
    };
  }

  // Block number (hex or decimal)
  return {
    value: blockIdStr.startsWith("0x")
      ? parseInt(blockIdStr, 16)
      : parseInt(blockIdStr, 10),
    type: "number",
  };
}

/**
 * Checks if an address is a PYUSD contract
 */
export function isPYUSDContract(
  address: string,
  network: NetworkType = "mainnet"
): boolean {
  if (!address || !ethers.isAddress(address)) {
    return false;
  }

  const pyusdAddress = PYUSD_CONTRACTS[network];
  return address.toLowerCase() === pyusdAddress.toLowerCase();
}

/**
 * Detects function signature from input data
 */
export function detectFunctionSignature(input: string): string | null {
  if (!input || input.length < 10) {
    return null;
  }

  const signature = input.slice(0, 10).toLowerCase();

  // Find matching function signature
  for (const [functionName, sig] of Object.entries(FUNCTION_SIGNATURES)) {
    if (sig.toLowerCase() === signature) {
      return functionName;
    }
  }

  return signature;
}

/**
 * Categorizes a transaction based on its properties
 */
export function categorizeTransaction(
  to: string | null,
  value: bigint,
  input: string,
  network: NetworkType = "mainnet"
): TransactionCategory {
  // Contract creation
  if (!to) {
    return {
      type: "contract_creation",
      subtype: "deployment",
      description: "Smart contract deployment",
      confidence: 1.0,
    };
  }

  // PYUSD transaction
  if (isPYUSDContract(to, network)) {
    const functionName = detectFunctionSignature(input);
    return {
      type: "pyusd_transaction",
      subtype: functionName || "unknown",
      description: `PYUSD ${functionName || "interaction"}`,
      confidence: 1.0,
    };
  }

  // Simple ETH transfer
  if (value > 0n && (!input || input === "0x" || input.length <= 2)) {
    return {
      type: "eth_transfer",
      subtype: "simple",
      description: "Simple ETH transfer",
      confidence: 1.0,
    };
  }

  // Contract interaction
  if (input && input.length > 2) {
    const functionName = detectFunctionSignature(input);

    // Check for common ERC-20 functions
    if (["transfer", "transferFrom", "approve"].includes(functionName || "")) {
      return {
        type: "token_transfer",
        subtype: functionName || "unknown",
        description: `Token ${functionName || "interaction"}`,
        confidence: 0.8,
      };
    }

    // Check for DeFi patterns
    if (
      functionName &&
      ["swap", "deposit", "withdraw", "stake", "unstake"].some((pattern) =>
        functionName.toLowerCase().includes(pattern)
      )
    ) {
      return {
        type: "defi_interaction",
        subtype: functionName,
        description: `DeFi ${functionName}`,
        confidence: 0.7,
      };
    }

    return {
      type: "contract_call",
      subtype: functionName || "unknown",
      description: `Contract ${functionName || "interaction"}`,
      confidence: 0.6,
    };
  }

  return {
    type: "other",
    subtype: "unknown",
    description: "Unknown transaction type",
    confidence: 0.1,
  };
}

/**
 * Formats Wei values to ETH with proper precision
 */
export function formatEther(value: bigint, decimals: number = 4): string {
  const etherValue = ethers.formatEther(value);
  const num = parseFloat(etherValue);

  if (num === 0) return "0";
  if (num < 0.0001) return "< 0.0001";

  return num.toFixed(decimals);
}

/**
 * Formats PYUSD amounts with proper decimals (6)
 */
export function formatPYUSD(
  amount: bigint,
  decimals: number = 6,
  symbol: string = "PYUSD"
): string {
  const divisor = 10n ** BigInt(decimals);
  const wholePart = amount / divisor;
  const fractionalPart = amount % divisor;

  if (fractionalPart === 0n) {
    return `${wholePart.toString()} ${symbol}`;
  }

  const fractionalStr = fractionalPart.toString().padStart(decimals, "0");
  const trimmedFractional = fractionalStr.replace(/0+$/, "");

  if (trimmedFractional === "") {
    return `${wholePart.toString()} ${symbol}`;
  }

  return `${wholePart.toString()}.${trimmedFractional} ${symbol}`;
}

/**
 * Formats gas amounts with appropriate units
 */
export function formatGas(gas: bigint | number): string {
  const gasNum = typeof gas === "bigint" ? Number(gas) : gas;

  if (gasNum >= 1000000) {
    return `${(gasNum / 1000000).toFixed(2)}M`;
  } else if (gasNum >= 1000) {
    return `${(gasNum / 1000).toFixed(1)}K`;
  }

  return gasNum.toLocaleString();
}

/**
 * Formats addresses with ellipsis
 */
export function formatAddress(address: string, length: number = 8): string {
  if (!address || !ethers.isAddress(address)) {
    return address || "Invalid Address";
  }

  if (length >= address.length - 2) {
    return address;
  }

  const start = address.slice(0, length / 2 + 2);
  const end = address.slice(-length / 2);
  return `${start}...${end}`;
}

/**
 * Calculates gas efficiency score
 */
export function calculateGasEfficiency(
  successfulGas: bigint,
  failedGas: bigint,
  totalTransactions: number
): number {
  if (totalTransactions === 0) return 0;

  const totalGas = successfulGas + failedGas;
  if (totalGas === 0n) return 100;

  const successRate = Number(successfulGas) / Number(totalGas);
  const efficiencyScore = successRate * 100;

  return Math.round(efficiencyScore * 100) / 100;
}

/**
 * Estimates memory usage of an object
 */
export function estimateMemoryUsage(obj: any): number {
  const seen = new WeakSet();

  function sizeOf(obj: any): number {
    if (obj === null || obj === undefined) return 0;
    if (typeof obj === "boolean") return 4;
    if (typeof obj === "number") return 8;
    if (typeof obj === "string") return obj.length * 2;
    if (typeof obj === "bigint") return 8;

    if (seen.has(obj)) return 0;
    seen.add(obj);

    let size = 0;

    if (Array.isArray(obj)) {
      size += obj.length * 8; // Array overhead
      for (const item of obj) {
        size += sizeOf(item);
      }
    } else if (typeof obj === "object") {
      size += Object.keys(obj).length * 8; // Object overhead
      for (const [key, value] of Object.entries(obj)) {
        size += sizeOf(key) + sizeOf(value);
      }
    }

    return size;
  }

  return sizeOf(obj);
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function for performance optimization
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
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

/**
 * Retry function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxAttempts) {
        throw lastError;
      }

      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Generates a cache key for block trace data
 */
export function generateCacheKey(
  prefix: string,
  ...parts: (string | number)[]
): string {
  return `${prefix}:${parts.join(":")}`;
}

/**
 * Calculates execution time
 */
export function calculateExecutionTime(
  startTime: number,
  endTime?: number
): number {
  return (endTime || Date.now()) - startTime;
}

/**
 * Formats duration in human-readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  } else {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
}

/**
 * Formats percentage values
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Safely parses JSON with error handling
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/**
 * Safely stringifies objects with BigInt support
 */
export function safeJsonStringify(obj: any, space?: number): string {
  return JSON.stringify(
    obj,
    (key, value) => {
      if (typeof value === "bigint") {
        return value.toString();
      }
      return value;
    },
    space
  );
}

/**
 * Chunks an array into smaller arrays
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Gets a random color from the chart color palette
 */
export function getRandomColor(index?: number): string {
  const colors = [
    "#00bfff",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#06b6d4",
    "#84cc16",
    "#f97316",
    "#ec4899",
    "#6366f1",
  ];

  if (index !== undefined) {
    return colors[index % colors.length];
  }

  return colors[Math.floor(Math.random() * colors.length)];
}
