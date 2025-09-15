import { ethers } from "ethers";
import { DebugApi, EthApi } from "../api";
import { type ContractConfig, ContractRegistry } from "../contracts";
import { ErrorProcessor, GasProcessor } from "../processors";
import type { SimulationParams, SimulationResult, StateChange } from "../types";

export interface MultiContractSimulationParams
  extends Omit<SimulationParams, "functionName"> {
  contractAddress: string;
  functionName: string;
  network: string;
}

export class MultiContractSimulationService {
  private ethApi: EthApi;
  private debugApi: DebugApi;
  private provider: ethers.JsonRpcProvider;

  constructor(provider: ethers.JsonRpcProvider) {
    this.provider = provider;
    this.ethApi = new EthApi(provider);
    this.debugApi = new DebugApi(provider);
  }

  async simulateTransaction(
    params: MultiContractSimulationParams,
  ): Promise<SimulationResult> {
    const {
      contractAddress,
      functionName,
      fromAddress,
      parameters,
      gasLimit,
      gasPrice,
      value = 0,
      blockNumber = "latest",
      network,
    } = params;

    const contract = ContractRegistry.getContract(contractAddress, network);
    if (!contract) {
      throw new Error(
        `Contract ${contractAddress} not found in registry for network ${network}`,
      );
    }

    const functionSig = contract.functions[functionName];
    if (!functionSig) {
      throw new Error(
        `Function ${functionName} not found in contract ${contract.name}`,
      );
    }

    const validation = this.validateParameters(functionSig, parameters);
    if (!validation.isValid) {
      throw new Error(`Invalid parameters: ${validation.errors.join(", ")}`);
    }

    const callData = this.createCallData(functionSig, parameters, contract);

    const txParams = {
      from: ethers.getAddress(fromAddress),
      to: contractAddress,
      data: callData,
      ...(gasLimit && { gas: `0x${gasLimit.toString(16)}` }),
      ...(gasPrice && { gasPrice: `0x${gasPrice.toString(16)}` }),
      ...(value > 0 && { value: `0x${value.toString(16)}` }),
    };

    const result: SimulationResult = {
      success: false,
      hypotheticalSuccess: false,
      gasUsed: 0,
      gasCategory: "",
      operationCategory: this.getOperationCategory(functionSig.category),
      error: null,
      output: null,
      stateChanges: [],
      calls: [],
      timestamp: new Date().toISOString(),
      functionName,
      parameters,
    };

    try {
      console.log(
        `Executing eth_call simulation for ${contract.name}.${functionName}...`,
      );

      try {
        const callResult = await this.ethApi.call(txParams, blockNumber);
        result.success = true;
        result.output = callResult;

        const decodedOutput = this.decodeOutput(
          functionSig,
          callResult,
          contract,
        );
        if (decodedOutput !== null && decodedOutput !== callResult) {
          result.decodedOutput = decodedOutput;
        }
      } catch (callError) {
        const errorMessage =
          callError instanceof Error ? callError.message : String(callError);
        const decodedError = ErrorProcessor.decodeError(errorMessage);

        result.error = ErrorProcessor.formatErrorForDisplay(decodedError);
        result.success = false;

        result.hypotheticalSuccess =
          ErrorProcessor.isHypotheticalSuccess(errorMessage);

        if (result.hypotheticalSuccess) {
          result.note =
            "This transaction would likely succeed with sufficient balance/allowance";
        }
      }

      if (result.success || result.hypotheticalSuccess) {
        try {
          console.log("Estimating gas usage...");
          const gasEstimate = await this.ethApi.estimateGas({
            ...txParams,
            value: undefined,
          });
          result.gasUsed = gasEstimate;
        } catch (gasError) {
          console.warn("Gas estimation failed:", gasError);
          result.gasUsed = this.getDefaultGasLimit(functionSig.category);
        }
      }

      if (result.success || result.hypotheticalSuccess) {
        try {
          console.log("Attempting detailed trace analysis...");
          const traceResult = await this.debugApi.traceCall(
            txParams,
            blockNumber,
          );

          if (traceResult) {
            if (traceResult.gasUsed) {
              const gasUsed =
                typeof traceResult.gasUsed === "string"
                  ? parseInt(traceResult.gasUsed, 16)
                  : traceResult.gasUsed;
              result.gasUsed = gasUsed;
            }

            if (traceResult.calls && Array.isArray(traceResult.calls)) {
              result.calls = traceResult.calls;
            }

            result.stateChanges = this.extractStateChanges(
              traceResult,
              contract,
            );
          }
        } catch (traceError) {
          console.warn("Trace analysis failed:", traceError);
        }
      }

      result.gasCategory = GasProcessor.categorizeGasUsage(
        functionName,
        result.gasUsed,
      );

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      result.error = errorMessage;
      result.success = false;
      return result;
    }
  }

  private createCallData(
    functionSig: any,
    parameters: any[],
    contract: ContractConfig,
  ): string {
    if (parameters.length !== functionSig.paramTypes.length) {
      throw new Error(
        `Expected ${functionSig.paramTypes.length} parameters for ${functionSig.name}, got ${parameters.length}`,
      );
    }

    let callData = functionSig.selector;

    for (let i = 0; i < functionSig.paramTypes.length; i++) {
      const paramType = functionSig.paramTypes[i];
      const paramValue = parameters[i];
      const encodedParam = this.encodeParameter(
        paramType,
        paramValue,
        contract,
      );
      callData += encodedParam;
    }

    return callData;
  }

  private encodeParameter(
    paramType: string,
    paramValue: any,
    contract: ContractConfig,
  ): string {
    switch (paramType) {
      case "address":
        if (!ethers.isAddress(paramValue)) {
          throw new Error(`Invalid address: ${paramValue}`);
        }
        return ethers
          .getAddress(paramValue)
          .slice(2)
          .toLowerCase()
          .padStart(64, "0");

      case "uint256":
        let value: bigint;
        if (typeof paramValue === "number") {
          value = BigInt(
            Math.floor(paramValue * Math.pow(10, contract.decimals)),
          );
        } else if (typeof paramValue === "string") {
          value = BigInt(paramValue);
        } else {
          value = BigInt(paramValue);
        }
        return value.toString(16).padStart(64, "0");

      case "uint8":
        return BigInt(paramValue).toString(16).padStart(64, "0");

      case "bool":
        return paramValue ? "0".repeat(63) + "1" : "0".repeat(64);

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

  private decodeOutput(
    functionSig: any,
    output: string,
    contract: ContractConfig,
  ): any {
    if (!output || output === "0x") {
      return null;
    }

    try {
      if (!functionSig.returnType) {
        return output;
      }

      switch (functionSig.returnType) {
        case "uint256":
          const rawValue = BigInt(output);
          if (
            functionSig.category === "view" &&
            (functionSig.name.includes("balance") ||
              functionSig.name.includes("allowance") ||
              functionSig.name.includes("totalSupply"))
          ) {
            return Number(rawValue) / Math.pow(10, contract.decimals);
          }
          return Number(rawValue);

        case "uint8":
          return parseInt(output, 16);

        case "bool":
          return output !== "0x" + "0".repeat(64);

        case "string":
          return this.decodeString(output);

        case "bytes32":
          return output;

        default:
          return output;
      }
    } catch (error) {
      console.warn("Failed to decode output:", error);
      return output;
    }
  }

  private decodeString(hexData: string): string {
    try {
      const data = hexData.startsWith("0x") ? hexData.slice(2) : hexData;
      const bytes = [];
      for (let i = 0; i < data.length; i += 2) {
        bytes.push(parseInt(data.substr(i, 2), 16));
      }
      return String.fromCharCode(...bytes.filter((b) => b !== 0));
    } catch (error) {
      return hexData;
    }
  }

  private validateParameters(
    functionSig: any,
    parameters: any[],
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (parameters.length !== functionSig.paramTypes.length) {
      errors.push(
        `Expected ${functionSig.paramTypes.length} parameters, got ${parameters.length}`,
      );
    }

    for (let i = 0; i < functionSig.paramTypes.length; i++) {
      const paramType = functionSig.paramTypes[i];
      const paramValue = parameters[i];

      if (
        paramValue === undefined ||
        paramValue === null ||
        paramValue === ""
      ) {
        errors.push(`Parameter ${i + 1} (${paramType}) is required`);
        continue;
      }

      switch (paramType) {
        case "address":
          if (!ethers.isAddress(paramValue)) {
            errors.push(`Parameter ${i + 1}: Invalid address format`);
          }
          break;

        case "uint256":
        case "uint8":
          if (isNaN(Number(paramValue)) || Number(paramValue) < 0) {
            errors.push(`Parameter ${i + 1}: Must be a positive number`);
          }
          break;

        case "bool":
          if (
            typeof paramValue !== "boolean" &&
            paramValue !== "true" &&
            paramValue !== "false"
          ) {
            errors.push(`Parameter ${i + 1}: Must be a boolean value`);
          }
          break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private extractStateChanges(
    traceResult: any,
    contract: ContractConfig,
  ): StateChange[] {
    const stateChanges: StateChange[] = [];

    try {
      const logs = traceResult.logs || [];

      for (const log of logs) {
        if (log.address?.toLowerCase() === contract.address.toLowerCase()) {
          const transferEvent = contract.events.Transfer;
          if (
            transferEvent &&
            log.topics &&
            log.topics[0] === transferEvent.topic
          ) {
            try {
              const fromAddr = ethers.getAddress(
                "0x" + log.topics[1].slice(-40),
              );
              const toAddr = ethers.getAddress("0x" + log.topics[2].slice(-40));
              const valueRaw = BigInt(log.data);
              const amount = Number(valueRaw) / Math.pow(10, contract.decimals);

              stateChanges.push({
                type: "transfer",
                from: fromAddr,
                to: toAddr,
                amount,
              });
            } catch (error) {
              console.warn("Failed to decode Transfer event:", error);
            }
          }

          const approvalEvent = contract.events.Approval;
          if (
            approvalEvent &&
            log.topics &&
            log.topics[0] === approvalEvent.topic
          ) {
            try {
              const owner = ethers.getAddress("0x" + log.topics[1].slice(-40));
              const spender = ethers.getAddress(
                "0x" + log.topics[2].slice(-40),
              );
              const valueRaw = BigInt(log.data);
              const amount = Number(valueRaw) / Math.pow(10, contract.decimals);

              stateChanges.push({
                type: "approval",
                owner,
                spender,
                amount,
              });
            } catch (error) {
              console.warn("Failed to decode Approval event:", error);
            }
          }
        }
      }
    } catch (error) {
      console.warn("Failed to extract state changes:", error);
    }

    return stateChanges;
  }

  private getOperationCategory(category: string): string {
    const categoryMap = {
      transfer: "Token Transfer",
      approval: "Token Approval",
      mint: "Token Minting",
      burn: "Token Burning",
      admin: "Administrative",
      view: "View Function",
      other: "Other Operation",
    };

    return (
      categoryMap[category as keyof typeof categoryMap] || "Other Operation"
    );
  }

  private getDefaultGasLimit(category: string): number {
    const gasLimits = {
      transfer: 65000,
      approval: 50000,
      mint: 80000,
      burn: 60000,
      admin: 45000,
      view: 30000,
      other: 100000,
    };

    return gasLimits[category as keyof typeof gasLimits] || 100000;
  }
}
