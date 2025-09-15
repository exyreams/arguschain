import { ethers } from "ethers";
import {
  EVENT_DECODERS,
  formatEther,
  formatGas,
  getContractName,
  getFunctionCategory,
  getFunctionName,
  shortenAddress,
  TRACE_CONFIG,
} from "./config";

export interface CallTraceData {
  id: string;
  parent_id?: string;
  type: string;
  depth: number;
  from: string;
  to: string;
  value_eth: number;
  gasUsed: number;
  is_pyusd: boolean;
  contract: string;
  function_category: string;
  error?: string;
  input_preview: string;
  output_preview: string;
}

export interface PyusdTransfer {
  from: string;
  to: string;
  amount: number;
  gas_used: number;
}

export interface StateChange {
  contract: string;
  function: string;
  type: string;
  from?: string;
  to?: string;
  amount?: number;
  gas_used: number;
}

export interface LogData {
  log_idx_trace: number;
  address: string;
  contract: string;
  is_pyusd: boolean;
  topic0: string;
  topic0_short: string;
  details: string;
  event_name: string;
  is_transfer?: boolean;
  is_approval?: boolean;
  is_pause?: boolean;
  is_unpause?: boolean;
  amount?: number;
  from_addr?: string;
  to_addr?: string;
  owner?: string;
  spender?: string;
}

export interface TransactionAnalysis {
  summary: any;
  call_data: CallTraceData[];
  logs_data: LogData[];
  pyusd_transfers: PyusdTransfer[];
  state_changes: StateChange[];
  contract_interactions: Set<string>;
  gas_by_category: Record<string, number>;
  transaction_stats: {
    total_calls: number;
    pyusd_calls: number;
    max_call_depth: number;
    total_gas: number;
    errors: number;
  };
}

export class TransactionTracer {
  private provider: ethers.Provider;
  private nodeCounter: number = 0;

  constructor(provider: ethers.Provider) {
    this.provider = provider;
  }

  async makeRpcRequest(method: string, params: any[]): Promise<any> {
    try {
      const result = await (this.provider as any).send(method, params);
      return result;
    } catch (error) {
      console.error(`RPC Error (${method}):`, error);
      return null;
    }
  }

  async traceTransaction(txHash: string): Promise<any> {
    return await this.makeRpcRequest("debug_traceTransaction", [
      txHash,
      TRACE_CONFIG.callTracer,
    ]);
  }

  private getFunctionDescription(
    inputData: string,
    isPyusd: boolean,
    contractName: string
  ): string {
    if (!inputData || inputData === "0x") {
      return inputData ? "Contract Creation" : "ETH Transfer";
    }

    const methodSig = inputData.slice(0, 10);

    return getFunctionName(methodSig);
  }

  parseCallTrace(traceResult: any, txHash: string): TransactionAnalysis {
    if (!traceResult) {
      throw new Error("No trace result provided for parsing");
    }

    const callDataList: CallTraceData[] = [];
    const stateChanges: StateChange[] = [];
    const pyusdTransfers: PyusdTransfer[] = [];
    const contractInteractions = new Set<string>();
    const gasByCategory: Record<string, number> = {};

    const gasCategories = ["token", "swap", "multicall", "view", "unknown"];
    gasCategories.forEach((category) => {
      gasByCategory[category] = 0;
    });

    this.nodeCounter = 0;

    const addNodesEdges = (
      call: any,
      parentNodeId?: string,
      depth: number = 0,
      parentAddr?: string
    ) => {
      const currentNodeId = `node_${this.nodeCounter}`;
      this.nodeCounter++;

      const callType = call.type?.toUpperCase() || "N/A";
      const fromAddr = call.from || "N/A";
      const toAddr = call.to || "N/A";
      const toAddrLower = toAddr.toLowerCase();

      if (parentAddr && toAddr) {
        contractInteractions.add(`${parentAddr.toLowerCase()}->${toAddrLower}`);
      }

      const contractName = getContractName(toAddr);
      const isKnownContract = contractName !== "Unknown Contract";

      const inputData = call.input || "0x";
      let functionCategory = "other";

      if (inputData !== "0x") {
        const methodSig = inputData.slice(0, 10);
        functionCategory = getFunctionCategory(methodSig);

        if (isKnownContract) {
          this.processSpecificFunction(
            methodSig,
            inputData,
            fromAddr,
            call,
            pyusdTransfers,
            stateChanges,
            contractName
          );
        }
      }

      const callGas = this.parseGasValue(call.gasUsed);
      gasByCategory[functionCategory] =
        (gasByCategory[functionCategory] || 0) + callGas;

      const gasUsedVal = callGas;
      const valueRawWei = this.parseHexValue(call.value);
      const valueEthFloat = Number(ethers.formatEther(valueRawWei.toString()));

      const callInfo: CallTraceData = {
        id: currentNodeId,
        parent_id: parentNodeId,
        type: callType,
        depth,
        from: fromAddr,
        to: toAddr,
        value_eth: valueEthFloat,
        gasUsed: gasUsedVal,
        is_pyusd: contractName.includes("PYUSD"),
        contract: contractName,
        function_category: functionCategory,
        error: call.error,
        input_preview:
          inputData.length > 10 ? inputData.slice(0, 10) + "..." : inputData,
        output_preview:
          call.output?.length > 10
            ? call.output.slice(0, 10) + "..."
            : call.output || "",
      };

      callDataList.push(callInfo);

      if (call.calls && Array.isArray(call.calls)) {
        for (const subCall of call.calls) {
          addNodesEdges(subCall, currentNodeId, depth + 1, toAddr);
        }
      }
    };

    addNodesEdges(traceResult, undefined, 0);

    const logsData = this.extractLogs(traceResult);

    const transactionStats = {
      total_calls: callDataList.length,
      pyusd_calls: callDataList.filter((call) =>
        call.contract.includes("PYUSD")
      ).length,
      max_call_depth:
        callDataList.length > 0
          ? Math.max(...callDataList.map((call) => call.depth))
          : 0,
      total_gas: callDataList.reduce((sum, call) => sum + call.gasUsed, 0),
      errors: callDataList.filter((call) => call.error).length,
    };

    return {
      call_data: callDataList,
      logs_data: logsData,
      pyusd_transfers: pyusdTransfers,
      state_changes: stateChanges,
      contract_interactions: contractInteractions,
      gas_by_category: gasByCategory,
      transaction_stats: transactionStats,
    };
  }

  private processSpecificFunction(
    methodSig: string,
    inputData: string,
    fromAddr: string,
    call: any,
    pyusdTransfers: PyusdTransfer[],
    stateChanges: StateChange[],
    contractName: string
  ) {
    try {
      const gasUsed = this.parseGasValue(call.gasUsed);
      const functionName = getFunctionName(methodSig);

      if (methodSig === "0xa9059cbb" && inputData.length >= 138) {
        const toParam = "0x" + inputData.slice(34, 74);
        const amount = parseInt(inputData.slice(74, 138), 16);

        pyusdTransfers.push({
          from: fromAddr,
          to: toParam,
          amount,
          gas_used: gasUsed,
        });

        stateChanges.push({
          contract: contractName,
          function: functionName,
          type: "transfer",
          from: fromAddr,
          to: toParam,
          amount,
          gas_used: gasUsed,
        });
      } else if (methodSig === "0x23b872dd" && inputData.length >= 202) {
        const fromParam = "0x" + inputData.slice(34, 74);
        const toParam = "0x" + inputData.slice(98, 138);
        const amount = parseInt(inputData.slice(138, 202), 16);

        pyusdTransfers.push({
          from: fromParam,
          to: toParam,
          amount,
          gas_used: gasUsed,
        });

        stateChanges.push({
          contract: contractName,
          function: functionName,
          type: "transfer",
          from: fromParam,
          to: toParam,
          amount,
          gas_used: gasUsed,
        });
      } else {
        stateChanges.push({
          contract: contractName,
          function: functionName,
          type: getFunctionCategory(methodSig),
          gas_used: gasUsed,
        });
      }
    } catch (error) {
      console.error("Error processing specific function:", error);
    }
  }

  private extractLogs(call: any): LogData[] {
    const logsData: LogData[] = [];
    let logCounter = 0;

    const extractLogsRecursive = (callData: any) => {
      if (callData.logs && Array.isArray(callData.logs)) {
        for (const log of callData.logs) {
          if (typeof log !== "object") continue;

          const logDetails = {
            address: log.address || "N/A",
            topics: log.topics || [],
            data: log.data || "0x",
            log_index_trace: logCounter,
          };
          logCounter++;

          const contractName = getContractName(logDetails.address);
          const isKnownContract = contractName !== "Unknown Contract";

          const logEntry: LogData = {
            log_idx_trace: logDetails.log_index_trace,
            address: logDetails.address,
            contract: contractName,
            is_pyusd: contractName.includes("PYUSD"),
            topic0: logDetails.topics[0] || "N/A",
            topic0_short: logDetails.topics[0]
              ? logDetails.topics[0].slice(0, 10) + "..."
              : "N/A",
            details: "Not Decoded",
            event_name: "Unknown",
          };

          if (logDetails.topics.length > 0) {
            const eventTopic = logDetails.topics[0];
            if (eventTopic in EVENT_DECODERS) {
              const eventInfo =
                EVENT_DECODERS[eventTopic as keyof typeof EVENT_DECODERS];
              logEntry.event_name = eventInfo.name;

              try {
                const decodedData = eventInfo.decode(
                  logDetails.topics,
                  logDetails.data
                );

                if (eventInfo.name === "Transfer") {
                  const valueEthStr = formatEther(decodedData.value);
                  logEntry.details = `Transfer: ${valueEthStr} ETH from ${shortenAddress(
                    decodedData.from
                  )} to ${shortenAddress(decodedData.to)}`;
                  logEntry.is_transfer = true;
                  logEntry.amount = Number(decodedData.value);
                  logEntry.from_addr = decodedData.from;
                  logEntry.to_addr = decodedData.to;
                } else if (eventInfo.name === "Approval") {
                  const valueEthStr = formatEther(decodedData.value);
                  logEntry.details = `Approval: ${shortenAddress(
                    decodedData.owner
                  )} approved ${valueEthStr} for ${shortenAddress(
                    decodedData.spender
                  )}`;
                  logEntry.is_approval = true;
                  logEntry.amount = Number(decodedData.value);
                  logEntry.owner = decodedData.owner;
                  logEntry.spender = decodedData.spender;
                }
              } catch (decodeErr) {
                logEntry.details = `Event (Decode Error: ${decodeErr})`;
              }
            }
          }

          logsData.push(logEntry);
        }
      }

      if (callData.calls && Array.isArray(callData.calls)) {
        for (const subCall of callData.calls) {
          extractLogsRecursive(subCall);
        }
      }
    };

    extractLogsRecursive(call);
    return logsData;
  }

  private parseGasValue(gasValue: any): number {
    if (!gasValue) return 0;

    if (typeof gasValue === "string" && gasValue.startsWith("0x")) {
      return parseInt(gasValue, 16);
    }

    return Number(gasValue) || 0;
  }

  private parseHexValue(hexValue: any): number {
    if (!hexValue) return 0;

    if (typeof hexValue === "string" && hexValue.startsWith("0x")) {
      return parseInt(hexValue, 16);
    }

    return Number(hexValue) || 0;
  }

  generateOverview(traceResult: any, txHash: string): string {
    const contractName = getContractName(traceResult.to || "");
    const contractLabel =
      contractName !== "Unknown Contract" ? `(${contractName})` : "";
    const gasUsed = this.parseGasValue(traceResult.gasUsed);

    return `
Trace Summary for ${shortenAddress(txHash)} ${contractLabel}
Type: ${traceResult.type || "N/A"}
From: ${shortenAddress(traceResult.from || "N/A")}
To: ${shortenAddress(traceResult.to || "N/A")}
Value: ${formatEther(traceResult.value || "0x0")} ETH
Gas Used: ${formatGas(gasUsed)} (${gasUsed.toLocaleString()} units)
Status: ${traceResult.error ? `Error: ${traceResult.error}` : "Success"}
    `.trim();
  }
}
