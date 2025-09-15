import { ethers } from "ethers";
import { FUNCTION_SIGNATURES, PYUSD_CONFIG } from "../constants";
import type { FunctionSignature } from "../types";

export class CallDataProcessor {
  static createCallData(functionName: string, ...params: any[]): string {
    const signature = FUNCTION_SIGNATURES[functionName];
    if (!signature) {
      throw new Error(`Unsupported function: ${functionName}`);
    }

    if (params.length !== signature.paramTypes.length) {
      throw new Error(
        `Expected ${signature.paramTypes.length} parameters for ${functionName}, got ${params.length}`,
      );
    }

    let callData = signature.selector;

    for (let i = 0; i < signature.paramTypes.length; i++) {
      const paramType = signature.paramTypes[i];
      const paramValue = params[i];
      const encodedParam = this.encodeParameter(
        paramType,
        paramValue,
        functionName,
      );
      callData += encodedParam;
    }

    return callData;
  }

  private static encodeParameter(
    paramType: string,
    paramValue: any,
    functionName: string,
  ): string {
    switch (paramType) {
      case "address":
        const addr = ethers.getAddress(paramValue);

        return addr.slice(2).toLowerCase().padStart(64, "0");

      case "uint256":
        let rawValue: bigint;

        if (typeof paramValue === "number" || typeof paramValue === "string") {
          if (this.isAmountParameter(functionName, paramType)) {
            const decimals = PYUSD_CONFIG.ethereum.decimals;
            rawValue = BigInt(
              Math.floor(Number(paramValue) * Math.pow(10, decimals)),
            );
          } else {
            rawValue = BigInt(paramValue);
          }
        } else {
          rawValue = BigInt(paramValue);
        }

        return rawValue.toString(16).padStart(64, "0");

      case "bool":
        const boolValue = paramValue ? 1 : 0;
        return boolValue.toString(16).padStart(64, "0");

      case "bytes32":
        if (typeof paramValue === "string") {
          const cleanValue = paramValue.startsWith("0x")
            ? paramValue.slice(2)
            : paramValue;
          return cleanValue.padStart(64, "0");
        } else {
          return BigInt(paramValue).toString(16).padStart(64, "0");
        }

      default:
        throw new Error(`Unsupported parameter type: ${paramType}`);
    }
  }

  private static isAmountParameter(
    functionName: string,
    paramType: string,
  ): boolean {
    if (paramType !== "uint256") return false;

    const amountFunctions = [
      "transfer",
      "transferFrom",
      "approve",
      "mint",
      "burn",
      "burnFrom",
      "increaseAllowance",
      "decreaseAllowance",
    ];

    return amountFunctions.includes(functionName);
  }

  static decodeOutput(functionName: string, output: string): any {
    if (!output || output === "0x") {
      return null;
    }

    try {
      const signature = FUNCTION_SIGNATURES[functionName];
      if (!signature) {
        return output;
      }

      switch (functionName) {
        case "balanceOf":
        case "allowance":
        case "totalSupply":
          const rawValue = BigInt(output);
          const decimals = PYUSD_CONFIG.ethereum.decimals;
          return Number(rawValue) / Math.pow(10, decimals);

        case "decimals":
          return parseInt(output, 16);

        case "name":
        case "symbol":
          return this.decodeString(output);

        case "paused":
          return parseInt(output, 16) === 1;

        default:
          return output;
      }
    } catch (error) {
      console.warn(`Failed to decode output for ${functionName}:`, error);
      return output;
    }
  }

  private static decodeString(hexData: string): string {
    try {
      const cleanHex = hexData.startsWith("0x") ? hexData.slice(2) : hexData;

      const bytes = [];
      for (let i = 0; i < cleanHex.length; i += 2) {
        const byte = parseInt(cleanHex.substr(i, 2), 16);
        if (byte !== 0) bytes.push(byte);
      }

      return String.fromCharCode(...bytes);
    } catch (error) {
      return hexData;
    }
  }

  static validateParameters(
    functionName: string,
    params: any[],
  ): { isValid: boolean; errors: string[] } {
    const signature = FUNCTION_SIGNATURES[functionName];
    const errors: string[] = [];

    if (!signature) {
      errors.push(`Unknown function: ${functionName}`);
      return { isValid: false, errors };
    }

    if (params.length !== signature.paramTypes.length) {
      errors.push(
        `Expected ${signature.paramTypes.length} parameters, got ${params.length}`,
      );
      return { isValid: false, errors };
    }

    for (let i = 0; i < params.length; i++) {
      const paramType = signature.paramTypes[i];
      const paramValue = params[i];
      const paramErrors = this.validateParameter(paramType, paramValue, i);
      errors.push(...paramErrors);
    }

    return { isValid: errors.length === 0, errors };
  }

  private static validateParameter(
    paramType: string,
    paramValue: any,
    index: number,
  ): string[] {
    const errors: string[] = [];

    switch (paramType) {
      case "address":
        try {
          ethers.getAddress(paramValue);
        } catch {
          errors.push(`Parameter ${index + 1}: Invalid address format`);
        }
        break;

      case "uint256":
        if (typeof paramValue !== "number" && typeof paramValue !== "string") {
          errors.push(`Parameter ${index + 1}: Must be a number or string`);
        } else {
          const numValue = Number(paramValue);
          if (isNaN(numValue) || numValue < 0) {
            errors.push(
              `Parameter ${index + 1}: Must be a non-negative number`,
            );
          }
        }
        break;

      case "bool":
        if (typeof paramValue !== "boolean") {
          errors.push(`Parameter ${index + 1}: Must be a boolean`);
        }
        break;

      case "bytes32":
        if (typeof paramValue !== "string") {
          errors.push(`Parameter ${index + 1}: Must be a string`);
        }
        break;

      default:
        errors.push(`Parameter ${index + 1}: Unsupported type ${paramType}`);
    }

    return errors;
  }

  static getFunctionInfo(functionName: string): FunctionSignature | null {
    return FUNCTION_SIGNATURES[functionName] || null;
  }

  static getAvailableFunctions(): string[] {
    return Object.keys(FUNCTION_SIGNATURES);
  }
}
