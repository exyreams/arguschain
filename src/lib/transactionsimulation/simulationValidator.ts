import { ethers } from "ethers";
import { FUNCTION_SIGNATURES } from "./constants";
import type {
  BatchOperation,
  SimulationParams,
  ValidationResult,
} from "./types";

export class SimulationValidator {
  static validateSimulationParams(params: SimulationParams): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!params.functionName) {
      errors.push("Function name is required");
    } else if (!FUNCTION_SIGNATURES[params.functionName]) {
      errors.push(`Unknown function: ${params.functionName}`);
    }

    if (!params.fromAddress) {
      errors.push("From address is required");
    } else {
      try {
        ethers.getAddress(params.fromAddress);
      } catch {
        errors.push("Invalid from address format");
      }
    }

    if (!Array.isArray(params.parameters)) {
      errors.push("Parameters must be an array");
    } else if (
      params.functionName &&
      FUNCTION_SIGNATURES[params.functionName]
    ) {
      const signature = FUNCTION_SIGNATURES[params.functionName];
      if (params.parameters.length !== signature.paramTypes.length) {
        errors.push(
          `Function ${params.functionName} expects ${signature.paramTypes.length} parameters, got ${params.parameters.length}`,
        );
      } else {
        const paramValidation = this.validateFunctionParameters(
          params.functionName,
          params.parameters,
        );
        errors.push(...paramValidation.errors);
        warnings.push(...paramValidation.warnings);
      }
    }

    if (params.gasLimit !== undefined) {
      if (typeof params.gasLimit !== "number" || params.gasLimit <= 0) {
        errors.push("Gas limit must be a positive number");
      } else if (params.gasLimit > 30000000) {
        warnings.push("Gas limit is very high, transaction may fail");
      }
    }

    if (params.gasPrice !== undefined) {
      if (typeof params.gasPrice !== "number" || params.gasPrice <= 0) {
        errors.push("Gas price must be a positive number");
      }
    }

    if (params.value !== undefined) {
      if (typeof params.value !== "number" || params.value < 0) {
        errors.push("Value must be a non-negative number");
      }
    }

    if (params.network && !["mainnet", "sepolia"].includes(params.network)) {
      warnings.push("Unknown network, using mainnet as default");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  static validateFunctionParameters(
    functionName: string,
    parameters: any[],
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const signature = FUNCTION_SIGNATURES[functionName];
    if (!signature) {
      errors.push(`Unknown function: ${functionName}`);
      return { isValid: false, errors, warnings };
    }

    for (let i = 0; i < parameters.length; i++) {
      const paramType = signature.paramTypes[i];
      const paramValue = parameters[i];
      const paramValidation = this.validateParameter(
        paramType,
        paramValue,
        i + 1,
        functionName,
      );

      errors.push(...paramValidation.errors);
      warnings.push(...paramValidation.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private static validateParameter(
    paramType: string,
    paramValue: any,
    paramIndex: number,
    functionName: string,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    switch (paramType) {
      case "address":
        if (typeof paramValue !== "string") {
          errors.push(`Parameter ${paramIndex}: Address must be a string`);
        } else {
          try {
            const address = ethers.getAddress(paramValue);

            if (address === ethers.ZeroAddress) {
              if (
                functionName === "transfer" ||
                functionName === "transferFrom"
              ) {
                errors.push(
                  `Parameter ${paramIndex}: Cannot transfer to zero address`,
                );
              } else if (functionName === "approve") {
                errors.push(
                  `Parameter ${paramIndex}: Cannot approve zero address`,
                );
              } else {
                warnings.push(`Parameter ${paramIndex}: Using zero address`);
              }
            }
          } catch {
            errors.push(`Parameter ${paramIndex}: Invalid address format`);
          }
        }
        break;

      case "uint256":
        if (typeof paramValue !== "number" && typeof paramValue !== "string") {
          errors.push(
            `Parameter ${paramIndex}: Amount must be a number or string`,
          );
        } else {
          const numValue = Number(paramValue);
          if (isNaN(numValue)) {
            errors.push(`Parameter ${paramIndex}: Invalid number format`);
          } else if (numValue < 0) {
            errors.push(`Parameter ${paramIndex}: Amount cannot be negative`);
          } else if (!isFinite(numValue)) {
            errors.push(`Parameter ${paramIndex}: Amount must be finite`);
          } else {
            if (this.isAmountParameter(functionName, paramIndex)) {
              if (numValue === 0) {
                warnings.push(`Parameter ${paramIndex}: Amount is zero`);
              } else if (numValue > 1000000000) {
                warnings.push(
                  `Parameter ${paramIndex}: Very large amount, please verify`,
                );
              }
            }
          }
        }
        break;

      case "bool":
        if (typeof paramValue !== "boolean") {
          errors.push(
            `Parameter ${paramIndex}: Must be a boolean (true/false)`,
          );
        }
        break;

      case "bytes32":
        if (typeof paramValue !== "string") {
          errors.push(`Parameter ${paramIndex}: Must be a string`);
        } else {
          const cleanValue = paramValue.startsWith("0x")
            ? paramValue.slice(2)
            : paramValue;
          if (!/^[a-fA-F0-9]*$/.test(cleanValue)) {
            errors.push(`Parameter ${paramIndex}: Must be a valid hex string`);
          } else if (cleanValue.length > 64) {
            errors.push(
              `Parameter ${paramIndex}: Hex string too long (max 64 characters)`,
            );
          }
        }
        break;

      default:
        warnings.push(
          `Parameter ${paramIndex}: Unknown parameter type ${paramType}`,
        );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private static isAmountParameter(
    functionName: string,
    paramIndex: number,
  ): boolean {
    const amountParams = {
      transfer: [2],
      transferFrom: [3],
      approve: [2],
      mint: [2],
      burn: [1],
      burnFrom: [2],
      increaseAllowance: [2],
      decreaseAllowance: [2],
    };

    const indices = amountParams[functionName as keyof typeof amountParams];
    return indices ? indices.includes(paramIndex) : false;
  }

  static validateBatchOperations(
    operations: BatchOperation[],
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!Array.isArray(operations)) {
      errors.push("Operations must be an array");
      return { isValid: false, errors, warnings };
    }

    if (operations.length === 0) {
      errors.push("At least one operation is required");
      return { isValid: false, errors, warnings };
    }

    if (operations.length > 50) {
      warnings.push("Large batch size may cause performance issues");
    }

    operations.forEach((operation, index) => {
      if (!operation.functionName) {
        errors.push(`Operation ${index + 1}: Function name is required`);
      }

      if (!Array.isArray(operation.parameters)) {
        errors.push(`Operation ${index + 1}: Parameters must be an array`);
      } else {
        const paramValidation = this.validateFunctionParameters(
          operation.functionName,
          operation.parameters,
        );

        paramValidation.errors.forEach((error) => {
          errors.push(`Operation ${index + 1}: ${error}`);
        });

        paramValidation.warnings.forEach((warning) => {
          warnings.push(`Operation ${index + 1}: ${warning}`);
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  static validateComparisonParams(
    functionName: string,
    fromAddress: string,
    parameterSets: any[][],
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!functionName) {
      errors.push("Function name is required");
    }

    if (!fromAddress) {
      errors.push("From address is required");
    } else {
      try {
        ethers.getAddress(fromAddress);
      } catch {
        errors.push("Invalid from address format");
      }
    }

    if (!Array.isArray(parameterSets)) {
      errors.push("Parameter sets must be an array");
      return { isValid: false, errors, warnings };
    }

    if (parameterSets.length < 2) {
      errors.push("At least 2 parameter sets are required for comparison");
      return { isValid: false, errors, warnings };
    }

    if (parameterSets.length > 10) {
      warnings.push("Large number of variants may affect performance");
    }

    parameterSets.forEach((params, index) => {
      if (!Array.isArray(params)) {
        errors.push(`Parameter set ${index + 1}: Must be an array`);
      } else {
        const paramValidation = this.validateFunctionParameters(
          functionName,
          params,
        );

        paramValidation.errors.forEach((error) => {
          errors.push(`Parameter set ${index + 1}: ${error}`);
        });

        paramValidation.warnings.forEach((warning) => {
          warnings.push(`Parameter set ${index + 1}: ${warning}`);
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  static validateNetwork(network: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const supportedNetworks = ["mainnet", "sepolia"];

    if (!network) {
      warnings.push("No network specified, using mainnet as default");
    } else if (!supportedNetworks.includes(network.toLowerCase())) {
      warnings.push(`Unknown network '${network}', using mainnet as default`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  static validateBlockNumber(blockNumber: string | number): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (blockNumber === undefined || blockNumber === null) {
      return { isValid: true, errors, warnings };
    }

    if (typeof blockNumber === "string") {
      if (
        blockNumber !== "latest" &&
        blockNumber !== "pending" &&
        blockNumber !== "earliest"
      ) {
        if (!/^0x[0-9a-fA-F]+$/.test(blockNumber)) {
          errors.push(
            "Block number must be 'latest', 'pending', 'earliest', or a hex number",
          );
        }
      }
    } else if (typeof blockNumber === "number") {
      if (blockNumber < 0) {
        errors.push("Block number cannot be negative");
      } else if (!Number.isInteger(blockNumber)) {
        errors.push("Block number must be an integer");
      }
    } else {
      errors.push("Block number must be a string or number");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  static getAvailableFunctions(): string[] {
    return Object.keys(FUNCTION_SIGNATURES);
  }

  static getFunctionSignature(functionName: string) {
    return FUNCTION_SIGNATURES[functionName] || null;
  }
}
