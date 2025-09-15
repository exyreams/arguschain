import type {
  FunctionStats,
  PyusdAnalysis,
  PyusdFunction,
  PyusdSummary,
  PyusdTransaction,
  TransactionData,
  TxPoolContent,
} from "../types";
import { PYUSD_CONTRACTS, PYUSD_SIGNATURES } from "../constants";

export class PyusdProcessor {
  static analyzePyusdTransactions(
    txPoolContent: TxPoolContent,
    network: string = "mainnet",
    pendingOnly: boolean = true,
  ): PyusdAnalysis {
    const pyusdTransactions: PyusdTransaction[] = [];
    let totalTransactions = 0;

    const sections = pendingOnly ? ["pending"] : ["pending", "queued"];

    for (const section of sections) {
      const sectionData =
        section === "pending" ? txPoolContent.pending : txPoolContent.queued;

      for (const sender in sectionData) {
        for (const nonce in sectionData[sender]) {
          const txData = sectionData[sender][nonce];
          totalTransactions++;

          if (this.isPyusdTransaction(txData, network)) {
            const pyusdTx = this.convertToPyusdTransaction(
              txData,
              sender,
              section as "pending" | "queued",
            );
            if (pyusdTx) {
              pyusdTransactions.push(pyusdTx);
            }
          }
        }
      }
    }

    const functionDistribution =
      this.calculateFunctionDistribution(pyusdTransactions);
    const summary = this.generateSummary(pyusdTransactions, totalTransactions);

    return {
      totalTransactions,
      pyusdTransactions,
      pyusdCount: pyusdTransactions.length,
      pyusdPercentage:
        totalTransactions > 0
          ? (pyusdTransactions.length / totalTransactions) * 100
          : 0,
      functionDistribution,
      summary,
    };
  }

  private static isPyusdTransaction(
    txData: TransactionData,
    network: string,
  ): boolean {
    const toAddress = txData.to?.toLowerCase();
    if (
      toAddress &&
      toAddress === PYUSD_CONTRACTS[network as keyof typeof PYUSD_CONTRACTS]
    ) {
      return true;
    }

    const inputData = txData.input;
    if (inputData && inputData.length >= 10) {
      const methodSignature = inputData.slice(0, 10);
      if (methodSignature in PYUSD_SIGNATURES) {
        return true;
      }
    }

    return false;
  }

  private static convertToPyusdTransaction(
    txData: TransactionData,
    sender: string,
    status: "pending" | "queued",
  ): PyusdTransaction | null {
    try {
      const gasPriceGwei = parseInt(txData.gasPrice, 16) / 1e9;
      const nonce = parseInt(txData.nonce, 16);
      const valueEth = txData.value ? parseInt(txData.value, 16) / 1e18 : 0;

      const pyusdFunction = this.decodePyusdFunction(txData.input);

      return {
        hash: txData.hash,
        from: sender,
        to: txData.to || "Contract Creation",
        nonce,
        function: pyusdFunction,
        gasPriceGwei,
        valueEth: valueEth > 0 ? valueEth : undefined,
        status,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("Error converting transaction data:", error);
      return null;
    }
  }

  private static decodePyusdFunction(inputData: string): PyusdFunction {
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
        parameters: this.decodeParameters(functionName, inputData),
      };
    }

    return {
      name: "Unknown",
      signature: methodSignature,
    };
  }

  private static decodeParameters(
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

        case "balanceOf":
          if (paramData.length >= 64) {
            parameters.owner = "0x" + paramData.slice(24, 64);
          }
          break;
      }
    } catch (error) {
      console.error("Error decoding parameters:", error);
    }

    return Object.keys(parameters).length > 0 ? parameters : undefined;
  }

  private static calculateFunctionDistribution(
    transactions: PyusdTransaction[],
  ): Record<string, FunctionStats> {
    const distribution: Record<string, FunctionStats> = {};

    for (const tx of transactions) {
      const functionName = tx.function.name;

      if (!distribution[functionName]) {
        distribution[functionName] = {
          count: 0,
          percentage: 0,
          averageGasPrice: 0,
          totalValue: 0,
        };
      }

      distribution[functionName].count++;
      distribution[functionName].averageGasPrice += tx.gasPriceGwei;

      if (tx.valueEth) {
        distribution[functionName].totalValue! += tx.valueEth;
      }
    }

    const totalTransactions = transactions.length;

    for (const functionName in distribution) {
      const stats = distribution[functionName];
      stats.percentage = (stats.count / totalTransactions) * 100;
      stats.averageGasPrice = stats.averageGasPrice / stats.count;
    }

    return distribution;
  }

  private static generateSummary(
    transactions: PyusdTransaction[],
    totalAnalyzed: number,
  ): PyusdSummary {
    if (transactions.length === 0) {
      return {
        totalAnalyzed,
        pyusdFound: 0,
        pyusdPercentage: 0,
        topFunction: "None",
        averageGasPrice: 0,
        analysisTime: new Date().toISOString(),
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
    };
  }

  static filterPyusdTransactions(
    transactions: PyusdTransaction[],
    filters: {
      functionNames?: string[];
      minGasPrice?: number;
      maxGasPrice?: number;
      addressFilter?: string;
      status?: "pending" | "queued";
    },
  ): PyusdTransaction[] {
    return transactions.filter((tx) => {
      if (filters.functionNames && filters.functionNames.length > 0) {
        if (!filters.functionNames.includes(tx.function.name)) {
          return false;
        }
      }

      if (filters.minGasPrice && tx.gasPriceGwei < filters.minGasPrice) {
        return false;
      }
      if (filters.maxGasPrice && tx.gasPriceGwei > filters.maxGasPrice) {
        return false;
      }

      if (filters.addressFilter) {
        const addressLower = filters.addressFilter.toLowerCase();
        if (
          !tx.from.toLowerCase().includes(addressLower) &&
          !tx.to.toLowerCase().includes(addressLower)
        ) {
          return false;
        }
      }

      if (filters.status && tx.status !== filters.status) {
        return false;
      }

      return true;
    });
  }

  static sortPyusdTransactions(
    transactions: PyusdTransaction[],
    sortBy: "gasPrice" | "timestamp" | "function" | "value",
    direction: "asc" | "desc" = "desc",
  ): PyusdTransaction[] {
    return [...transactions].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "gasPrice":
          comparison = a.gasPriceGwei - b.gasPriceGwei;
          break;
        case "timestamp":
          comparison = a.timestamp - b.timestamp;
          break;
        case "function":
          comparison = a.function.name.localeCompare(b.function.name);
          break;
        case "value":
          const aValue = a.valueEth || 0;
          const bValue = b.valueEth || 0;
          comparison = aValue - bValue;
          break;
      }

      return direction === "asc" ? comparison : -comparison;
    });
  }
}
