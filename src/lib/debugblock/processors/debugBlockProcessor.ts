import {
  BlockAnalysisSummary,
  BlockTransactionSummary,
  DebugBlockTraceItem,
  FunctionCategoryData,
  GasDistributionData,
  ProcessedDebugBlockData,
  PyusdFunctionCategories,
  PyusdInternalTransaction,
  PyusdTransfer,
} from "../types";
import {
  DISPLAY_CONFIG,
  getContractName,
  getFunctionInfo,
  isPyusdContract,
} from "../constants";

export class DebugBlockProcessor {
  static processDebugBlockTrace(
    traceData: DebugBlockTraceItem[],
    blockIdentifier: string,
  ): ProcessedDebugBlockData {
    console.log(
      `Processing ${traceData.length} traces from debug block ${blockIdentifier}`,
    );

    let pyusdInteractionsCount = 0;
    let pyusdTransferCount = 0;
    let pyusdMintCount = 0;
    let pyusdBurnCount = 0;
    let totalGasUsed = 0;
    let failedTracesCount = 0;
    let pyusdVolume = 0;

    const pyusdTransfers: PyusdTransfer[] = [];
    const internalTransactions: PyusdInternalTransaction[] = [];

    const functionCategories: PyusdFunctionCategories = {
      token_movement: 0,
      supply_change: 0,
      allowance: 0,
      control: 0,
      admin: 0,
      view: 0,
      other: 0,
    };

    const transactions: BlockTransactionSummary[] = [];

    for (let i = 0; i < traceData.length; i++) {
      const traceItem = traceData[i];
      const transactionSummary = this.processTraceItem(
        traceItem,
        i,
        functionCategories,
        pyusdTransfers,
        internalTransactions,
      );

      transactions.push(transactionSummary);

      if (transactionSummary.failed) {
        failedTracesCount++;
      }
      if (transactionSummary.pyusd_interaction) {
        pyusdInteractionsCount++;
      }
      if (transactionSummary.is_pyusd_transfer) {
        pyusdTransferCount++;
      }
      if (transactionSummary.is_pyusd_mint) {
        pyusdMintCount++;
      }
      if (transactionSummary.is_pyusd_burn) {
        pyusdBurnCount++;
      }

      totalGasUsed += transactionSummary.gas_used;
      pyusdVolume += transactionSummary.transfer_value;
    }

    const summary: BlockAnalysisSummary = {
      block_identifier: blockIdentifier,
      total_transactions: traceData.length,
      total_gas_used: totalGasUsed,
      failed_traces_count: failedTracesCount,
      pyusd_interactions_count: pyusdInteractionsCount,
      pyusd_transfer_count: pyusdTransferCount,
      pyusd_mint_count: pyusdMintCount,
      pyusd_burn_count: pyusdBurnCount,
      pyusd_volume: pyusdVolume,
      pyusd_volume_formatted: this.formatPyusdValue(pyusdVolume),
      pyusd_percentage:
        traceData.length > 0
          ? (pyusdInteractionsCount / traceData.length) * 100
          : 0,
    };

    const gasDistribution = this.createGasDistribution(transactions);
    const functionCategoryData = this.createFunctionCategoryData(
      functionCategories,
      pyusdInteractionsCount,
    );

    return {
      summary,
      transactions,
      pyusdTransfers,
      internalTransactions,
      functionCategories,
      gasDistribution,
      functionCategoryData,
    };
  }

  private static processTraceItem(
    traceItem: DebugBlockTraceItem,
    index: number,
    functionCategories: PyusdFunctionCategories,
    pyusdTransfers: PyusdTransfer[],
    internalTransactions: PyusdInternalTransaction[],
  ): BlockTransactionSummary {
    const txHash = traceItem.txHash || `tx_${index}`;
    let fromAddr = "N/A";
    let toAddr = "N/A";
    let valueEthStr = "0 ETH";
    let gasUsed = 0;
    let error: string | null = null;
    let interactedWithPyusd = false;
    let pyusdFunction: string | undefined;
    let pyusdFunctionCategory = "other";
    let isPyusdTransfer = false;
    let isPyusdMint = false;
    let isPyusdBurn = false;
    let transferValue = 0;

    try {
      const traceResult = traceItem.result;
      error = traceItem.error || traceResult.error || null;

      if (traceResult) {
        fromAddr = traceResult.from || "N/A";
        toAddr = traceResult.to || "N/A";
        const valueWeiHex = traceResult.value || "0x0";
        const gasUsedHex = traceResult.gasUsed || "0x0";
        const inputData = traceResult.input || "0x";

        gasUsed = this.parseHexToInt(gasUsedHex);
        valueEthStr = this.formatEthValue(valueWeiHex);

        interactedWithPyusd = toAddr !== "N/A" && isPyusdContract(toAddr);

        if (
          interactedWithPyusd &&
          inputData &&
          inputData !== "0x" &&
          inputData.length >= 10
        ) {
          const methodSig = inputData.slice(0, 10);
          const functionInfo = getFunctionInfo(methodSig);

          pyusdFunction = functionInfo.name;
          pyusdFunctionCategory = functionInfo.category;

          if (functionInfo.category in functionCategories) {
            functionCategories[
              functionInfo.category as keyof PyusdFunctionCategories
            ]++;
          }

          const analysisResult = this.analyzePyusdFunction(
            methodSig,
            inputData,
            fromAddr,
            txHash,
            pyusdTransfers,
          );

          isPyusdTransfer = analysisResult.isTransfer;
          isPyusdMint = analysisResult.isMint;
          isPyusdBurn = analysisResult.isBurn;
          transferValue = analysisResult.value;
        }

        if (!interactedWithPyusd && traceResult.calls) {
          interactedWithPyusd = this.checkSubCallsForPyusd(traceResult.calls);
        }

        if (traceResult.calls) {
          this.detectInternalPyusdTransactions(
            traceResult.calls,
            txHash,
            internalTransactions,
          );
        }
      }
    } catch (parseError) {
      console.warn(`Failed to parse trace item ${index}:`, parseError);
      error = `Parse Error: ${parseError}`;
    }

    return {
      tx_index: index,
      tx_hash: txHash,
      from: fromAddr,
      to: toAddr,
      value_eth: valueEthStr,
      gas_used: gasUsed,
      failed: error !== null,
      pyusd_interaction: interactedWithPyusd,
      pyusd_function: pyusdFunction,
      pyusd_function_category: pyusdFunctionCategory,
      is_pyusd_transfer: isPyusdTransfer,
      is_pyusd_mint: isPyusdMint,
      is_pyusd_burn: isPyusdBurn,
      transfer_value: transferValue,
    };
  }

  private static analyzePyusdFunction(
    methodSig: string,
    inputData: string,
    fromAddr: string,
    txHash: string,
    pyusdTransfers: PyusdTransfer[],
  ): {
    isTransfer: boolean;
    isMint: boolean;
    isBurn: boolean;
    value: number;
  } {
    let isTransfer = false;
    let isMint = false;
    let isBurn = false;
    let value = 0;

    try {
      switch (methodSig) {
        case "0xa9059cbb":
          isTransfer = true;
          try {
            const toOffset = 10;
            const toParam =
              "0x" + inputData.slice(toOffset + 24, toOffset + 64);
            const amountOffset = 74;
            const amount = parseInt(
              inputData.slice(amountOffset, amountOffset + 64),
              16,
            );
            value = amount;

            pyusdTransfers.push({
              from: fromAddr,
              to: toParam,
              value: amount,
              tx_hash: txHash,
            });
          } catch (error) {
            console.warn(`Failed to decode transfer parameters:`, error);
          }
          break;

        case "0x40c10f19":
          isMint = true;
          try {
            const amountOffset = 74;
            const amount = parseInt(
              inputData.slice(amountOffset, amountOffset + 64),
              16,
            );
            value = amount;
          } catch (error) {
            console.warn(`Failed to decode mint parameters:`, error);
          }
          break;

        case "0x42966c68":
          isBurn = true;
          try {
            const amountOffset = 10;
            const amount = parseInt(
              inputData.slice(amountOffset, amountOffset + 64),
              16,
            );
            value = amount;
          } catch (error) {
            console.warn(`Failed to decode burn parameters:`, error);
          }
          break;
      }
    } catch (error) {
      console.warn(`Failed to analyze PYUSD function ${methodSig}:`, error);
    }

    return { isTransfer, isMint, isBurn, value };
  }

  private static checkSubCallsForPyusd(calls: any[]): boolean {
    if (!Array.isArray(calls)) return false;

    for (const call of calls) {
      if (call.to && isPyusdContract(call.to)) {
        return true;
      }
      if (call.calls && this.checkSubCallsForPyusd(call.calls)) {
        return true;
      }
    }
    return false;
  }

  private static detectInternalPyusdTransactions(
    calls: any[],
    txHash: string,
    internalTransactions: PyusdInternalTransaction[],
    depth: number = 0,
    parentFrom?: string,
    parentTo?: string,
  ): void {
    if (!Array.isArray(calls)) return;

    for (const call of calls) {
      const callTo = call.to || "";
      const callFrom = call.from || parentFrom || "";
      const callType = call.type || "CALL";
      const callInput = call.input || "0x";
      const callGasUsed = call.gasUsed || "0x0";

      if (callTo && isPyusdContract(callTo)) {
        let functionName = "Unknown";
        if (callInput && callInput.length >= 10) {
          const methodSig = callInput.slice(0, 10);
          const functionInfo = getFunctionInfo(methodSig);
          functionName = functionInfo.name;
        }

        internalTransactions.push({
          tx_hash: txHash,
          from: callFrom,
          to: callTo,
          to_contract: getContractName(callTo),
          function: functionName,
          call_type: callType,
          gas_used: this.parseHexToInt(callGasUsed),
          depth: depth,
        });
      }

      if (call.calls && Array.isArray(call.calls)) {
        this.detectInternalPyusdTransactions(
          call.calls,
          txHash,
          internalTransactions,
          depth + 1,
          callFrom,
          callTo,
        );
      }
    }
  }

  private static createGasDistribution(
    transactions: BlockTransactionSummary[],
  ): GasDistributionData[] {
    return transactions.map((tx) => ({
      gas_used: tx.gas_used,
      interaction_type: tx.pyusd_interaction
        ? "PYUSD Transaction"
        : "Other Transaction",
    }));
  }

  private static createFunctionCategoryData(
    functionCategories: PyusdFunctionCategories,
    totalPyusdInteractions: number,
  ): FunctionCategoryData[] {
    const categoryData: FunctionCategoryData[] = [];

    for (const [category, count] of Object.entries(functionCategories)) {
      if (count > 0) {
        categoryData.push({
          category: category
            .replace("_", " ")
            .replace(/\b\w/g, (l) => l.toUpperCase()),
          count,
          percentage:
            totalPyusdInteractions > 0
              ? (count / totalPyusdInteractions) * 100
              : 0,
        });
      }
    }

    return categoryData;
  }

  private static parseHexToInt(hexStr: string): number {
    if (!hexStr || hexStr === "0x") return 0;
    try {
      return parseInt(hexStr, 16);
    } catch (error) {
      console.warn(`Failed to parse hex value: ${hexStr}`, error);
      return 0;
    }
  }

  private static formatEthValue(weiHex: string): string {
    try {
      const weiValue = BigInt(weiHex || "0x0");
      const ethValue = Number(weiValue) / 1e18;
      return `${ethValue.toFixed(DISPLAY_CONFIG.ETH_DECIMAL_PLACES)} ETH`;
    } catch (error) {
      console.warn(`Failed to format ETH value: ${weiHex}`, error);
      return "0 ETH";
    }
  }

  private static formatPyusdValue(value: number): string {
    if (value === 0) return "0 PYUSD";
    try {
      const pyusdValue = value / 1e6;
      return `${pyusdValue.toFixed(DISPLAY_CONFIG.PYUSD_DECIMAL_PLACES)} PYUSD`;
    } catch (error) {
      console.warn(`Failed to format PYUSD value: ${value}`, error);
      return "0 PYUSD";
    }
  }

  static getProcessingStats(data: ProcessedDebugBlockData): {
    totalTransactions: number;
    pyusdTransactions: number;
    pyusdPercentage: number;
    totalGasUsed: number;
    averageGasPerTransaction: number;
    failureRate: number;
  } {
    const totalTransactions = data.transactions.length;
    const pyusdTransactions = data.transactions.filter(
      (tx) => tx.pyusd_interaction,
    ).length;
    const totalGasUsed = data.transactions.reduce(
      (sum, tx) => sum + tx.gas_used,
      0,
    );
    const failedTransactions = data.transactions.filter(
      (tx) => tx.failed,
    ).length;

    return {
      totalTransactions,
      pyusdTransactions,
      pyusdPercentage:
        totalTransactions > 0
          ? (pyusdTransactions / totalTransactions) * 100
          : 0,
      totalGasUsed,
      averageGasPerTransaction:
        totalTransactions > 0 ? totalGasUsed / totalTransactions : 0,
      failureRate:
        totalTransactions > 0
          ? (failedTransactions / totalTransactions) * 100
          : 0,
    };
  }
}
