import { ethers } from "ethers";
import { DebugApi, EthApi } from "./api";
import { CallDataProcessor, ErrorProcessor, GasProcessor } from "./processors";
import { PYUSD_CONFIG } from "./constants";
import type {
  BatchOperation,
  BatchResult,
  ComparisonResult,
  SimulationParams,
  SimulationResult,
  StateChange,
} from "./types";

export class SimulationService {
  private ethApi: EthApi;
  private debugApi: DebugApi;
  private provider: ethers.JsonRpcProvider;

  constructor(provider: ethers.JsonRpcProvider) {
    this.provider = provider;
    this.ethApi = new EthApi(provider);
    this.debugApi = new DebugApi(provider);
  }

  async simulateTransaction(
    params: SimulationParams,
  ): Promise<SimulationResult> {
    const {
      functionName,
      fromAddress,
      parameters,
      gasLimit,
      gasPrice,
      value = 0,
      blockNumber = "latest",
      network = "mainnet",
    } = params;

    const validation = CallDataProcessor.validateParameters(
      functionName,
      parameters,
    );
    if (!validation.isValid) {
      throw new Error(`Invalid parameters: ${validation.errors.join(", ")}`);
    }

    const callData = CallDataProcessor.createCallData(
      functionName,
      ...parameters,
    );

    const txParams = {
      from: ethers.getAddress(fromAddress),
      to: PYUSD_CONFIG.ethereum.address,
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
      operationCategory: this.getOperationCategory(functionName),
      error: null,
      output: null,
      stateChanges: [],
      calls: [],
      timestamp: new Date().toISOString(),
      functionName,
      parameters,
    };

    try {
      console.log("Executing eth_call simulation...");

      try {
        const callResult = await this.ethApi.call(txParams, blockNumber);
        result.success = true;
        result.output = callResult;

        const decodedOutput = CallDataProcessor.decodeOutput(
          functionName,
          callResult,
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

          result.gasUsed = 65000;
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

            result.stateChanges = this.extractStateChanges(traceResult);
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

  async compareTransactions(
    functionName: string,
    fromAddress: string,
    parameterSets: any[][],
    network: string = "mainnet",
  ): Promise<ComparisonResult[]> {
    const results: ComparisonResult[] = [];

    for (let i = 0; i < parameterSets.length; i++) {
      const parameters = parameterSets[i];
      const variantName = `Variant ${i + 1}`;

      try {
        const simulation = await this.simulateTransaction({
          functionName,
          fromAddress,
          parameters,
          network,
        });

        results.push({
          variant: variantName,
          parameters,
          success: simulation.success,
          hypotheticalSuccess: simulation.hypotheticalSuccess,
          gasUsed: simulation.gasUsed,
          gasCategory: simulation.gasCategory,
          error: simulation.error,
        });
      } catch (error) {
        results.push({
          variant: variantName,
          parameters,
          success: false,
          hypotheticalSuccess: false,
          gasUsed: 0,
          gasCategory: "Error",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const successfulResults = results.filter(
      (r) => r.success || r.hypotheticalSuccess,
    );
    if (successfulResults.length > 1) {
      const minGas = Math.min(...successfulResults.map((r) => r.gasUsed));
      results.forEach((result) => {
        if (
          (result.success || result.hypotheticalSuccess) &&
          result.gasUsed > 0
        ) {
          result.relativeGasCost = result.gasUsed / minGas;
        }
      });
    }

    return results;
  }

  async simulateBatch(
    fromAddress: string,
    operations: BatchOperation[],
    network: string = "mainnet",
  ): Promise<BatchResult> {
    const results: SimulationResult[] = [];
    let totalGas = 0;
    let successfulOperations = 0;
    let batchSuccess = true;

    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i];

      try {
        const simulation = await this.simulateTransaction({
          functionName: operation.functionName,
          fromAddress,
          parameters: operation.parameters,
          network,
        });

        results.push(simulation);

        if (simulation.success || simulation.hypotheticalSuccess) {
          totalGas += simulation.gasUsed;
          successfulOperations++;
        } else {
          batchSuccess = false;

          console.warn(`Batch operation ${i + 1} failed:`, simulation.error);
        }
      } catch (error) {
        const failedResult: SimulationResult = {
          success: false,
          hypotheticalSuccess: false,
          gasUsed: 0,
          gasCategory: "Error",
          operationCategory: this.getOperationCategory(operation.functionName),
          error: error instanceof Error ? error.message : String(error),
          output: null,
          stateChanges: [],
          calls: [],
          timestamp: new Date().toISOString(),
          functionName: operation.functionName,
          parameters: operation.parameters,
        };

        results.push(failedResult);
        batchSuccess = false;
      }
    }

    const successRate =
      operations.length > 0
        ? (successfulOperations / operations.length) * 100
        : 0;

    return {
      operations: results,
      totalGas,
      successfulOperations,
      batchSuccess,
      successRate,
    };
  }

  async checkBalance(
    address: string,
    blockNumber: string | number = "latest",
  ): Promise<number | null> {
    try {
      const callData = CallDataProcessor.createCallData("balanceOf", address);
      const result = await this.ethApi.call(
        {
          to: PYUSD_CONFIG.ethereum.address,
          data: callData,
        },
        blockNumber,
      );

      if (result && result !== "0x") {
        const rawBalance = BigInt(result);
        return (
          Number(rawBalance) / Math.pow(10, PYUSD_CONFIG.ethereum.decimals)
        );
      }
      return 0;
    } catch (error) {
      console.warn("Failed to check balance:", error);
      return null;
    }
  }

  async checkAllowance(
    owner: string,
    spender: string,
    blockNumber: string | number = "latest",
  ): Promise<number | null> {
    try {
      const callData = CallDataProcessor.createCallData(
        "allowance",
        owner,
        spender,
      );
      const result = await this.ethApi.call(
        {
          to: PYUSD_CONFIG.ethereum.address,
          data: callData,
        },
        blockNumber,
      );

      if (result && result !== "0x") {
        const rawAllowance = BigInt(result);
        return (
          Number(rawAllowance) / Math.pow(10, PYUSD_CONFIG.ethereum.decimals)
        );
      }
      return 0;
    } catch (error) {
      console.warn("Failed to check allowance:", error);
      return null;
    }
  }

  private extractStateChanges(traceResult: any): StateChange[] {
    const stateChanges: StateChange[] = [];

    try {
      const logs = traceResult.logs || [];

      for (const log of logs) {
        if (
          log.address?.toLowerCase() ===
          PYUSD_CONFIG.ethereum.address.toLowerCase()
        ) {
          if (
            log.topics &&
            log.topics[0] === PYUSD_CONFIG.ethereum.transferEventTopic
          ) {
            try {
              const fromAddr = ethers.getAddress(
                "0x" + log.topics[1].slice(-40),
              );
              const toAddr = ethers.getAddress("0x" + log.topics[2].slice(-40));
              const valueRaw = BigInt(log.data);
              const amount =
                Number(valueRaw) / Math.pow(10, PYUSD_CONFIG.ethereum.decimals);

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

          if (
            log.topics &&
            log.topics[0] === PYUSD_CONFIG.ethereum.approvalEventTopic
          ) {
            try {
              const owner = ethers.getAddress("0x" + log.topics[1].slice(-40));
              const spender = ethers.getAddress(
                "0x" + log.topics[2].slice(-40),
              );
              const valueRaw = BigInt(log.data);
              const amount =
                Number(valueRaw) / Math.pow(10, PYUSD_CONFIG.ethereum.decimals);

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

  private getOperationCategory(functionName: string): string {
    const categories = {
      "Basic Transfer": ["transfer"],
      Authorization: ["approve", "increaseAllowance", "decreaseAllowance"],
      "Advanced Transfer": ["transferFrom"],
      "Supply Management": ["mint", "burn", "burnFrom"],
      Administrative: ["pause", "unpause"],
      Query: [
        "balanceOf",
        "allowance",
        "totalSupply",
        "decimals",
        "name",
        "symbol",
        "paused",
      ],
    };

    for (const [category, functions] of Object.entries(categories)) {
      if (functions.includes(functionName)) {
        return category;
      }
    }
    return "Other Operation";
  }

  async isConnected(): Promise<boolean> {
    return await this.ethApi.isConnected();
  }

  async getNetwork(): Promise<ethers.Network> {
    return await this.ethApi.getNetwork();
  }
}
