import { ethers } from "ethers";
import { blockchainService } from "@/lib/blockchainService";
import { PyusdProcessor } from "./pyusdProcessor";
import type { PyusdAnalysis, PyusdTransaction } from "../types";
import { PYUSD_CONTRACTS, PYUSD_SIGNATURES } from "../constants";

export class RecentTransactionProcessor {
  static async analyzeRecentPyusdTransactions(
    network: string = "mainnet",
    blockCount: number = 5,
  ): Promise<PyusdAnalysis> {
    try {
      const provider = blockchainService.getProvider();
      if (!provider) {
        throw new Error("Provider not available");
      }

      const latestBlockNumber = await provider.getBlockNumber();
      const recentTransactions: PyusdTransaction[] = [];
      let totalTransactions = 0;

      for (let i = 0; i < blockCount; i++) {
        const blockNumber = latestBlockNumber - i;
        const block = await provider.getBlock(blockNumber, true);

        if (!block || !block.transactions) continue;

        for (const tx of block.transactions) {
          if (typeof tx === "string") continue;

          totalTransactions++;

          if (this.isPyusdTransaction(tx, network)) {
            try {
              const traceResult = await provider.send(
                "debug_traceTransaction",
                [tx.hash, { tracer: "callTracer" }],
              );

              const pyusdTx = await this.convertToPyusdTransaction(
                tx,
                traceResult,
                "recent",
              );
              if (pyusdTx) {
                recentTransactions.push(pyusdTx);
              }
            } catch (error) {
              console.warn(`Failed to trace transaction ${tx.hash}:`, error);

              const basicPyusdTx = this.convertBasicToPyusdTransaction(
                tx,
                "recent",
              );
              if (basicPyusdTx) {
                recentTransactions.push(basicPyusdTx);
              }
            }
          }
        }
      }

      const functionDistribution =
        PyusdProcessor.calculateFunctionDistribution(recentTransactions);
      const summary = this.generateRecentTransactionSummary(
        recentTransactions,
        totalTransactions,
        blockCount,
      );

      return {
        totalTransactions,
        pyusdTransactions: recentTransactions,
        pyusdCount: recentTransactions.length,
        pyusdPercentage:
          totalTransactions > 0
            ? (recentTransactions.length / totalTransactions) * 100
            : 0,
        functionDistribution,
        summary,
      };
    } catch (error) {
      console.error("Error analyzing recent PYUSD transactions:", error);
      throw new Error(
        `Failed to analyze recent transactions: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private static isPyusdTransaction(tx: any, network: string): boolean {
    const toAddress = tx.to?.toLowerCase();
    if (
      toAddress &&
      toAddress === PYUSD_CONTRACTS[network as keyof typeof PYUSD_CONTRACTS]
    ) {
      return true;
    }

    const inputData = tx.data || tx.input;
    if (inputData && inputData.length >= 10) {
      const methodSignature = inputData.slice(0, 10);
      if (methodSignature in PYUSD_SIGNATURES) {
        return true;
      }
    }

    return false;
  }

  private static async convertToPyusdTransaction(
    tx: any,
    traceResult: any,
    status: "recent" | "pending" | "queued",
  ): Promise<PyusdTransaction | null> {
    try {
      const gasPriceGwei = tx.gasPrice ? parseInt(tx.gasPrice, 16) / 1e9 : 0;
      const nonce = tx.nonce ? parseInt(tx.nonce, 16) : 0;
      const valueEth = tx.value ? parseInt(tx.value, 16) / 1e18 : 0;

      const pyusdFunction = this.decodePyusdFunction(tx.data || tx.input || "");

      let enhancedFunction = pyusdFunction;
      if (traceResult && traceResult.calls) {
        enhancedFunction = this.enhanceFunctionFromTrace(
          pyusdFunction,
          traceResult,
        );
      }

      return {
        hash: tx.hash,
        from: tx.from,
        to: tx.to || "Contract Creation",
        nonce,
        function: enhancedFunction,
        gasPriceGwei,
        valueEth: valueEth > 0 ? valueEth : undefined,
        status: status as "pending" | "queued",
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("Error converting traced transaction:", error);
      return null;
    }
  }

  private static convertBasicToPyusdTransaction(
    tx: any,
    status: "recent" | "pending" | "queued",
  ): PyusdTransaction | null {
    try {
      const gasPriceGwei = tx.gasPrice ? parseInt(tx.gasPrice, 16) / 1e9 : 0;
      const nonce = tx.nonce ? parseInt(tx.nonce, 16) : 0;
      const valueEth = tx.value ? parseInt(tx.value, 16) / 1e18 : 0;

      const pyusdFunction = this.decodePyusdFunction(tx.data || tx.input || "");

      return {
        hash: tx.hash,
        from: tx.from,
        to: tx.to || "Contract Creation",
        nonce,
        function: pyusdFunction,
        gasPriceGwei,
        valueEth: valueEth > 0 ? valueEth : undefined,
        status: status as "pending" | "queued",
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("Error converting basic transaction:", error);
      return null;
    }
  }

  private static decodePyusdFunction(inputData: string): any {
    if (!inputData || inputData.length < 10) {
      return {
        name: "Unknown",
        signature: "0x00000000",
      };
    }

    const methodSignature = inputData.slice(0, 10);
    const functionName =
      PYUSD_SIGNATURES[methodSignature as keyof typeof PYUSD_SIGNATURES];

    if (functionName) {
      return {
        name: functionName,
        signature: methodSignature,
        parameters: this.decodeBasicParameters(functionName, inputData),
      };
    }

    return {
      name: "Unknown",
      signature: methodSignature,
    };
  }

  private static enhanceFunctionFromTrace(
    basicFunction: any,
    traceResult: any,
  ): any {
    return {
      ...basicFunction,
      traced: true,
      traceAvailable: true,
    };
  }

  private static decodeBasicParameters(
    functionName: string,
    inputData: string,
  ): Record<string, any> | undefined {
    if (inputData.length <= 10) {
      return undefined;
    }

    const parameters: Record<string, any> = {};
    const paramData = inputData.slice(10);

    try {
      switch (functionName) {
        case "transfer":
          if (paramData.length >= 128) {
            parameters.to = "0x" + paramData.slice(24, 64);
            parameters.amount = parseInt(paramData.slice(64, 128), 16);
          }
          break;

        case "transferFrom":
          if (paramData.length >= 192) {
            parameters.from = "0x" + paramData.slice(24, 64);
            parameters.to = "0x" + paramData.slice(88, 128);
            parameters.amount = parseInt(paramData.slice(128, 192), 16);
          }
          break;

        case "approve":
          if (paramData.length >= 128) {
            parameters.spender = "0x" + paramData.slice(24, 64);
            parameters.amount = parseInt(paramData.slice(64, 128), 16);
          }
          break;
      }
    } catch (error) {
      console.error("Error decoding parameters:", error);
    }

    return Object.keys(parameters).length > 0 ? parameters : undefined;
  }

  private static generateRecentTransactionSummary(
    transactions: PyusdTransaction[],
    totalAnalyzed: number,
    blockCount: number,
  ): any {
    if (transactions.length === 0) {
      return {
        totalAnalyzed,
        pyusdFound: 0,
        pyusdPercentage: 0,
        topFunction: "None",
        averageGasPrice: 0,
        analysisTime: new Date().toISOString(),
        analysisType: "recent_transactions",
        blocksAnalyzed: blockCount,
      };
    }

    const functionCounts: Record<string, number> = {};
    let totalGasPrice = 0;

    for (const tx of transactions) {
      const functionName = tx.function.name;
      functionCounts[functionName] = (functionCounts[functionName] || 0) + 1;
      totalGasPrice += tx.gasPriceGwei;
    }

    const topFunction =
      Object.entries(functionCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ||
      "Unknown";

    return {
      totalAnalyzed,
      pyusdFound: transactions.length,
      pyusdPercentage: (transactions.length / totalAnalyzed) * 100,
      topFunction,
      averageGasPrice: totalGasPrice / transactions.length,
      analysisTime: new Date().toISOString(),
      analysisType: "recent_transactions",
      blocksAnalyzed: blockCount,
    };
  }
}
