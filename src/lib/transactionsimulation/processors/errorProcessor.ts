import { KNOWN_ERROR_CODES } from "../constants";
import type { SimulationError } from "../types";

export class ErrorProcessor {
  static decodeError(errorCode: string): SimulationError {
    const cleanCode = errorCode.startsWith("0x") ? errorCode : `0x${errorCode}`;

    const knownError =
      KNOWN_ERROR_CODES[cleanCode as keyof typeof KNOWN_ERROR_CODES];

    if (knownError) {
      return {
        code: cleanCode,
        message: errorCode,
        decodedMessage: knownError,
        severity: this.getErrorSeverity(knownError),
        suggestion: this.getErrorSuggestion(knownError),
      };
    }

    const revertString = this.tryDecodeRevertString(errorCode);
    if (revertString) {
      return {
        code: cleanCode,
        message: errorCode,
        decodedMessage: revertString,
        severity: "medium",
        suggestion: this.getErrorSuggestion(revertString),
      };
    }

    return {
      code: cleanCode,
      message: errorCode,
      decodedMessage: `Unknown error code: ${cleanCode}`,
      severity: "medium",
    };
  }

  private static tryDecodeRevertString(errorData: string): string | null {
    try {
      const cleanData = errorData.startsWith("0x")
        ? errorData.slice(2)
        : errorData;

      if (cleanData.startsWith("08c379a0")) {
        const stringData = cleanData.slice(8);

        const offset = stringData.slice(0, 64);

        const lengthHex = stringData.slice(64, 128);
        const length = parseInt(lengthHex, 16);

        const stringHex = stringData.slice(128, 128 + length * 2);

        let result = "";
        for (let i = 0; i < stringHex.length; i += 2) {
          const byte = parseInt(stringHex.substr(i, 2), 16);
          if (byte !== 0) {
            result += String.fromCharCode(byte);
          }
        }

        return result || null;
      }

      return null;
    } catch {
      return null;
    }
  }

  private static getErrorSeverity(
    errorMessage: string,
  ): "low" | "medium" | "high" {
    const highSeverityKeywords = [
      "insufficient balance",
      "transfer amount exceeds balance",
      "insufficient allowance",
      "paused",
      "blacklisted",
    ];

    const mediumSeverityKeywords = [
      "zero address",
      "invalid signature",
      "expired",
      "missing role",
    ];

    const lowerMessage = errorMessage.toLowerCase();

    if (
      highSeverityKeywords.some((keyword) => lowerMessage.includes(keyword))
    ) {
      return "high";
    }

    if (
      mediumSeverityKeywords.some((keyword) => lowerMessage.includes(keyword))
    ) {
      return "medium";
    }

    return "low";
  }

  private static getErrorSuggestion(errorMessage: string): string | undefined {
    const lowerMessage = errorMessage.toLowerCase();

    if (
      lowerMessage.includes("insufficient balance") ||
      lowerMessage.includes("transfer amount exceeds balance")
    ) {
      return "Ensure the sender has sufficient token balance for this transfer";
    }

    if (lowerMessage.includes("insufficient allowance")) {
      return "Increase the allowance before attempting this transfer";
    }

    if (lowerMessage.includes("zero address")) {
      return "Provide a valid non-zero address";
    }

    if (lowerMessage.includes("paused")) {
      return "Wait for the contract to be unpaused before attempting this operation";
    }

    if (lowerMessage.includes("blacklisted")) {
      return "This address is blacklisted and cannot perform token operations";
    }

    if (lowerMessage.includes("expired")) {
      return "The permit or authorization has expired, generate a new one";
    }

    if (lowerMessage.includes("invalid signature")) {
      return "Verify the signature parameters and ensure they are correctly formatted";
    }

    if (lowerMessage.includes("missing role")) {
      return "This operation requires special permissions that the sender does not have";
    }

    return undefined;
  }

  static isBalanceError(errorMessage: string): boolean {
    const balanceKeywords = [
      "insufficient balance",
      "transfer amount exceeds balance",
      "0x356680b7",
    ];

    const lowerMessage = errorMessage.toLowerCase();
    return balanceKeywords.some((keyword) => lowerMessage.includes(keyword));
  }

  static isAllowanceError(errorMessage: string): boolean {
    const allowanceKeywords = ["insufficient allowance", "0xdab70cb7"];

    const lowerMessage = errorMessage.toLowerCase();
    return allowanceKeywords.some((keyword) => lowerMessage.includes(keyword));
  }

  static isHypotheticalSuccess(errorMessage: string): boolean {
    return (
      this.isBalanceError(errorMessage) || this.isAllowanceError(errorMessage)
    );
  }

  static formatErrorForDisplay(error: SimulationError): string {
    if (error.decodedMessage && error.decodedMessage !== error.message) {
      return error.decodedMessage;
    }
    return error.message;
  }

  static getErrorCategory(errorMessage: string): string {
    const lowerMessage = errorMessage.toLowerCase();

    if (this.isBalanceError(errorMessage)) {
      return "Balance Error";
    }

    if (this.isAllowanceError(errorMessage)) {
      return "Allowance Error";
    }

    if (lowerMessage.includes("zero address")) {
      return "Address Error";
    }

    if (lowerMessage.includes("paused")) {
      return "Contract State Error";
    }

    if (lowerMessage.includes("signature") || lowerMessage.includes("permit")) {
      return "Authorization Error";
    }

    if (lowerMessage.includes("role") || lowerMessage.includes("access")) {
      return "Permission Error";
    }

    return "Other Error";
  }
}
