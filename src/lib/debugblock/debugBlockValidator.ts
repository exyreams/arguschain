import {
  BlockInfo,
  DebugBlockTraceItem,
  ProcessedDebugBlockData,
  ValidationResult,
} from "./types";
import {
  BLOCK_IDENTIFIER_PATTERNS,
  isPyusdContract,
  VALID_BLOCK_TAGS,
} from "./constants";

export class DebugBlockValidator {
  static validateBlockIdentifier(
    identifier: string | number,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      if (typeof identifier === "number") {
        if (identifier < 0) {
          errors.push("Block number cannot be negative");
        }
        if (identifier > 1e9) {
          warnings.push("Block number seems unusually high");
        }
      } else if (typeof identifier === "string") {
        const trimmed = identifier.trim();

        if (trimmed === "") {
          errors.push("Block identifier cannot be empty");
        } else if (VALID_BLOCK_TAGS.includes(trimmed.toLowerCase())) {
          // Valid block tag
        } else if (BLOCK_IDENTIFIER_PATTERNS.blockHash.test(trimmed)) {
          // Valid block hash
        } else if (BLOCK_IDENTIFIER_PATTERNS.hexBlockNumber.test(trimmed)) {
          const blockNum = parseInt(trimmed, 16);
          if (blockNum < 0) {
            errors.push("Block number cannot be negative");
          }
        } else if (BLOCK_IDENTIFIER_PATTERNS.blockNumber.test(trimmed)) {
          const blockNum = parseInt(trimmed, 10);
          if (blockNum < 0) {
            errors.push("Block number cannot be negative");
          }
        } else {
          errors.push(`Invalid block identifier format: ${identifier}`);
        }
      } else {
        errors.push(
          `Block identifier must be string or number, got ${typeof identifier}`,
        );
      }
    } catch (error) {
      errors.push(`Validation error: ${error}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  static validateTraceData(traceData: DebugBlockTraceItem[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      if (!Array.isArray(traceData)) {
        errors.push("Trace data must be an array");
        return { isValid: false, errors, warnings };
      }

      if (traceData.length === 0) {
        warnings.push("Trace data is empty - block may have no transactions");
        return { isValid: true, errors, warnings };
      }

      // Validate each trace item
      for (let i = 0; i < traceData.length; i++) {
        const item = traceData[i];
        const itemErrors = this.validateTraceItem(item, i);
        errors.push(...itemErrors.errors);
        warnings.push(...itemErrors.warnings);
      }

      // Check for suspicious patterns
      const suspiciousPatterns = this.detectSuspiciousPatterns(traceData);
      warnings.push(...suspiciousPatterns);
    } catch (error) {
      errors.push(`Trace data validation failed: ${error}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private static validateTraceItem(item: any, index: number): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check basic structure
      if (typeof item !== "object" || item === null) {
        errors.push(`Trace item ${index} is not an object`);
        return { isValid: false, errors, warnings };
      }

      // Validate txHash
      if (!item.txHash || typeof item.txHash !== "string") {
        warnings.push(`Trace item ${index} missing or invalid txHash`);
      } else if (!/^0x[0-9a-fA-F]{64}$/.test(item.txHash)) {
        warnings.push(`Trace item ${index} has invalid txHash format`);
      }

      // Validate result structure
      if (!item.result || typeof item.result !== "object") {
        warnings.push(`Trace item ${index} missing or invalid result`);
      } else {
        const result = item.result;

        // Check required fields
        if (!result.from || typeof result.from !== "string") {
          warnings.push(
            `Trace item ${index} missing or invalid 'from' address`,
          );
        } else if (!/^0x[0-9a-fA-F]{40}$/.test(result.from)) {
          warnings.push(
            `Trace item ${index} has invalid 'from' address format`,
          );
        }

        if (!result.to || typeof result.to !== "string") {
          warnings.push(`Trace item ${index} missing or invalid 'to' address`);
        } else if (!/^0x[0-9a-fA-F]{40}$/.test(result.to)) {
          warnings.push(`Trace item ${index} has invalid 'to' address format`);
        }

        // Validate gas usage
        if (result.gasUsed) {
          if (
            typeof result.gasUsed === "string" &&
            result.gasUsed.startsWith("0x")
          ) {
            try {
              const gasUsed = parseInt(result.gasUsed, 16);
              if (gasUsed > 30000000) {
                // Block gas limit
                warnings.push(
                  `Trace item ${index} has unusually high gas usage: ${gasUsed}`,
                );
              }
            } catch (error) {
              warnings.push(`Trace item ${index} has invalid gasUsed format`);
            }
          }
        }

        // Validate value
        if (
          result.value &&
          typeof result.value === "string" &&
          result.value.startsWith("0x")
        ) {
          try {
            const value = BigInt(result.value);
            if (value > BigInt("1000000000000000000000")) {
              // > 1000 ETH
              warnings.push(
                `Trace item ${index} has unusually high value transfer`,
              );
            }
          } catch (error) {
            warnings.push(`Trace item ${index} has invalid value format`);
          }
        }

        // Validate input data
        if (result.input && typeof result.input === "string") {
          if (!result.input.startsWith("0x")) {
            warnings.push(
              `Trace item ${index} input data should start with 0x`,
            );
          } else if (result.input.length > 2 && result.input.length % 2 !== 0) {
            warnings.push(
              `Trace item ${index} input data has invalid hex length`,
            );
          }
        }

        // Validate calls structure if present
        if (result.calls && !Array.isArray(result.calls)) {
          warnings.push(`Trace item ${index} calls should be an array`);
        }
      }

      // Check for error field
      if (item.error && typeof item.error !== "string") {
        warnings.push(`Trace item ${index} error should be a string`);
      }
    } catch (error) {
      errors.push(`Failed to validate trace item ${index}: ${error}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private static detectSuspiciousPatterns(
    traceData: DebugBlockTraceItem[],
  ): string[] {
    const warnings: string[] = [];

    try {
      // Check for high failure rate
      const failedTraces = traceData.filter(
        (item) => item.error || item.result?.error,
      );
      const failureRate = failedTraces.length / traceData.length;

      if (failureRate > 0.2) {
        // > 20% failure rate
        warnings.push(
          `High failure rate detected: ${failedTraces.length}/${traceData.length} traces failed`,
        );
      }

      // Check for unusual gas patterns
      const gasUsages: number[] = [];
      for (const item of traceData) {
        if (item.result?.gasUsed) {
          try {
            const gasUsed = parseInt(item.result.gasUsed, 16);
            gasUsages.push(gasUsed);
          } catch (error) {
            // Skip invalid gas values
          }
        }
      }

      if (gasUsages.length > 0) {
        const avgGas =
          gasUsages.reduce((sum, gas) => sum + gas, 0) / gasUsages.length;
        const highGasTraces = gasUsages.filter((gas) => gas > avgGas * 5);

        if (highGasTraces.length > 0) {
          warnings.push(
            `${highGasTraces.length} traces with unusually high gas usage detected`,
          );
        }
      }

      // Check for missing transaction hashes
      const missingTxHashes = traceData.filter(
        (item) =>
          !item.txHash || item.txHash === `tx_${traceData.indexOf(item)}`,
      );
      if (missingTxHashes.length > 0) {
        warnings.push(
          `${missingTxHashes.length} traces missing proper transaction hashes`,
        );
      }

      // Check for PYUSD-related patterns
      const pyusdInteractions = traceData.filter(
        (item) => item.result?.to && isPyusdContract(item.result.to),
      );

      if (pyusdInteractions.length > traceData.length * 0.8) {
        warnings.push(
          `Very high PYUSD activity: ${pyusdInteractions.length}/${traceData.length} traces involve PYUSD`,
        );
      }
    } catch (error) {
      warnings.push(`Failed to detect suspicious patterns: ${error}`);
    }

    return warnings;
  }

  static validateProcessedData(
    data: ProcessedDebugBlockData,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check required fields
      if (!data.summary) {
        errors.push("Missing summary data");
      } else {
        if (
          typeof data.summary.total_transactions !== "number" ||
          data.summary.total_transactions < 0
        ) {
          errors.push("Invalid total_transactions in summary");
        }
        if (
          typeof data.summary.total_gas_used !== "number" ||
          data.summary.total_gas_used < 0
        ) {
          errors.push("Invalid total_gas_used in summary");
        }
      }

      if (!Array.isArray(data.transactions)) {
        errors.push("Transactions data must be an array");
      } else {
        // Validate transaction summaries
        for (let i = 0; i < Math.min(data.transactions.length, 10); i++) {
          const tx = data.transactions[i];
          if (typeof tx.tx_index !== "number") {
            warnings.push(`Transaction ${i} missing valid tx_index`);
          }
          if (!tx.tx_hash || typeof tx.tx_hash !== "string") {
            warnings.push(`Transaction ${i} missing valid tx_hash`);
          }
          if (typeof tx.gas_used !== "number" || tx.gas_used < 0) {
            warnings.push(`Transaction ${i} has invalid gas_used`);
          }
        }
      }

      if (!Array.isArray(data.pyusdTransfers)) {
        errors.push("PYUSD transfers data must be an array");
      }

      if (!Array.isArray(data.internalTransactions)) {
        errors.push("Internal transactions data must be an array");
      }

      if (
        !data.functionCategories ||
        typeof data.functionCategories !== "object"
      ) {
        errors.push("Function categories data must be an object");
      }

      // Check data consistency
      if (data.summary && data.transactions) {
        if (data.summary.total_transactions !== data.transactions.length) {
          warnings.push(
            `Summary total_transactions (${data.summary.total_transactions}) doesn't match transactions array length (${data.transactions.length})`,
          );
        }

        const calculatedGas = data.transactions.reduce(
          (sum, tx) => sum + tx.gas_used,
          0,
        );
        if (Math.abs(data.summary.total_gas_used - calculatedGas) > 1000) {
          warnings.push(
            `Summary total_gas_used (${data.summary.total_gas_used}) doesn't match calculated gas (${calculatedGas})`,
          );
        }
      }
    } catch (error) {
      errors.push(`Processed data validation failed: ${error}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  static validateBlockInfo(blockInfo: BlockInfo): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check required fields
      if (typeof blockInfo.number !== "number" || blockInfo.number < 0) {
        errors.push("Invalid block number");
      }

      if (!blockInfo.hash || typeof blockInfo.hash !== "string") {
        errors.push("Missing or invalid block hash");
      } else if (!/^0x[0-9a-fA-F]{64}$/.test(blockInfo.hash)) {
        errors.push("Invalid block hash format");
      }

      if (!blockInfo.parentHash || typeof blockInfo.parentHash !== "string") {
        errors.push("Missing or invalid parent hash");
      } else if (!/^0x[0-9a-fA-F]{64}$/.test(blockInfo.parentHash)) {
        errors.push("Invalid parent hash format");
      }

      if (typeof blockInfo.timestamp !== "number" || blockInfo.timestamp < 0) {
        errors.push("Invalid timestamp");
      } else {
        const now = Date.now() / 1000;
        if (blockInfo.timestamp > now + 3600) {
          // More than 1 hour in future
          warnings.push("Block timestamp is in the future");
        }
        if (blockInfo.timestamp < 1438269973) {
          // Before Ethereum genesis
          warnings.push("Block timestamp is before Ethereum genesis");
        }
      }

      if (!Array.isArray(blockInfo.transactions)) {
        errors.push("Transactions must be an array");
      } else if (blockInfo.transactionCount !== blockInfo.transactions.length) {
        warnings.push(
          `Transaction count (${blockInfo.transactionCount}) doesn't match transactions array length (${blockInfo.transactions.length})`,
        );
      }

      // Validate gas fields
      if (blockInfo.gasUsed) {
        try {
          const gasUsed =
            typeof blockInfo.gasUsed === "string"
              ? parseInt(blockInfo.gasUsed, 16)
              : blockInfo.gasUsed;
          if (gasUsed < 0) {
            errors.push("Gas used cannot be negative");
          }
        } catch (error) {
          errors.push("Invalid gasUsed format");
        }
      }

      if (blockInfo.gasLimit) {
        try {
          const gasLimit =
            typeof blockInfo.gasLimit === "string"
              ? parseInt(blockInfo.gasLimit, 16)
              : blockInfo.gasLimit;
          if (gasLimit < 0) {
            errors.push("Gas limit cannot be negative");
          }
        } catch (error) {
          errors.push("Invalid gasLimit format");
        }
      }
    } catch (error) {
      errors.push(`Block info validation failed: ${error}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  static generateValidationReport(
    blockIdentifier: string | number,
    blockInfo?: BlockInfo,
    traceData?: DebugBlockTraceItem[],
    processedData?: ProcessedDebugBlockData,
  ): {
    overall: "valid" | "warning" | "error";
    summary: string;
    details: Array<{
      category: string;
      status: "valid" | "warning" | "error";
      messages: string[];
    }>;
  } {
    const details: Array<{
      category: string;
      status: "valid" | "warning" | "error";
      messages: string[];
    }> = [];

    let hasErrors = false;
    let hasWarnings = false;

    // Validate block identifier
    const identifierValidation = this.validateBlockIdentifier(blockIdentifier);
    details.push({
      category: "Block Identifier",
      status: identifierValidation.isValid
        ? identifierValidation.warnings.length > 0
          ? "warning"
          : "valid"
        : "error",
      messages: [
        ...identifierValidation.errors,
        ...identifierValidation.warnings,
      ],
    });
    if (!identifierValidation.isValid) hasErrors = true;
    if (identifierValidation.warnings.length > 0) hasWarnings = true;

    // Validate block info
    if (blockInfo) {
      const blockInfoValidation = this.validateBlockInfo(blockInfo);
      details.push({
        category: "Block Information",
        status: blockInfoValidation.isValid
          ? blockInfoValidation.warnings.length > 0
            ? "warning"
            : "valid"
          : "error",
        messages: [
          ...blockInfoValidation.errors,
          ...blockInfoValidation.warnings,
        ],
      });
      if (!blockInfoValidation.isValid) hasErrors = true;
      if (blockInfoValidation.warnings.length > 0) hasWarnings = true;
    }

    // Validate trace data
    if (traceData) {
      const traceValidation = this.validateTraceData(traceData);
      details.push({
        category: "Trace Data",
        status: traceValidation.isValid
          ? traceValidation.warnings.length > 0
            ? "warning"
            : "valid"
          : "error",
        messages: [...traceValidation.errors, ...traceValidation.warnings],
      });
      if (!traceValidation.isValid) hasErrors = true;
      if (traceValidation.warnings.length > 0) hasWarnings = true;
    }

    // Validate processed data
    if (processedData) {
      const processedValidation = this.validateProcessedData(processedData);
      details.push({
        category: "Processed Data",
        status: processedValidation.isValid
          ? processedValidation.warnings.length > 0
            ? "warning"
            : "valid"
          : "error",
        messages: [
          ...processedValidation.errors,
          ...processedValidation.warnings,
        ],
      });
      if (!processedValidation.isValid) hasErrors = true;
      if (processedValidation.warnings.length > 0) hasWarnings = true;
    }

    const overall = hasErrors ? "error" : hasWarnings ? "warning" : "valid";
    const summary = hasErrors
      ? "Validation failed with errors"
      : hasWarnings
        ? "Validation passed with warnings"
        : "All validations passed";

    return {
      overall,
      summary,
      details,
    };
  }
}
