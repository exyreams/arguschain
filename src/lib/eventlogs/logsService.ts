import { ethers } from "ethers";
import type {
  LogsAnalysisResults,
  LogsQueryConfig,
  ParsedTransferLog,
  PerformanceMetrics,
} from "./types";
import { EthLogsApi } from "./api";
import { TransferProcessor } from "./processors";
import { getRpcLimits } from "./constants";

interface ProgressCallback {
  (step: string, progress: number, message?: string): void;
}

interface BlockRangeChunk {
  from_block: string | number;
  to_block: string | number;
  chunk_index: number;
  total_chunks: number;
}

interface EnhancedLogsQueryConfig extends LogsQueryConfig {
  progress_callback?: ProgressCallback;
  max_concurrent_chunks?: number;
}

export class LogsService {
  private api: EthLogsApi;

  constructor(
    provider: ethers.JsonRpcProvider,
    network: "mainnet" | "sepolia" = "mainnet",
  ) {
    this.api = new EthLogsApi(provider, network);
  }

  private calculateBlockRangeChunks(
    fromBlock: string | number,
    toBlock: string | number,
    rpcUrl: string,
  ): BlockRangeChunk[] {
    const limits = getRpcLimits(rpcUrl);
    const maxRange = limits.max_block_range;

    if (
      fromBlock === "latest" ||
      toBlock === "latest" ||
      fromBlock === "pending" ||
      toBlock === "pending"
    ) {
      return [
        {
          from_block: fromBlock,
          to_block: toBlock,
          chunk_index: 0,
          total_chunks: 1,
        },
      ];
    }

    let fromNum: number;
    let toNum: number;

    try {
      fromNum =
        typeof fromBlock === "number"
          ? fromBlock
          : fromBlock.startsWith("0x")
            ? parseInt(fromBlock, 16)
            : parseInt(fromBlock, 10);
      toNum =
        typeof toBlock === "number"
          ? toBlock
          : toBlock.startsWith("0x")
            ? parseInt(toBlock, 16)
            : parseInt(toBlock, 10);
    } catch (error) {
      return [
        {
          from_block: fromBlock,
          to_block: toBlock,
          chunk_index: 0,
          total_chunks: 1,
        },
      ];
    }

    const totalRange = toNum - fromNum + 1;

    if (totalRange <= maxRange) {
      return [
        {
          from_block: fromBlock,
          to_block: toBlock,
          chunk_index: 0,
          total_chunks: 1,
        },
      ];
    }

    const chunks: BlockRangeChunk[] = [];
    const totalChunks = Math.ceil(totalRange / maxRange);

    for (let i = 0; i < totalChunks; i++) {
      const chunkStart = fromNum + i * maxRange;
      const chunkEnd = Math.min(chunkStart + maxRange - 1, toNum);

      chunks.push({
        from_block: chunkStart,
        to_block: chunkEnd,
        chunk_index: i,
        total_chunks: totalChunks,
      });
    }

    return chunks;
  }

  private async processChunksConcurrently(
    chunks: BlockRangeChunk[],
    config: EnhancedLogsQueryConfig,
  ): Promise<ParsedTransferLog[]> {
    const maxConcurrent = config.max_concurrent_chunks || 3;
    const allTransfers: ParsedTransferLog[] = [];

    for (let i = 0; i < chunks.length; i += maxConcurrent) {
      const batch = chunks.slice(i, i + maxConcurrent);

      const batchPromises = batch.map(async (chunk) => {
        const chunkConfig: LogsQueryConfig = {
          ...config,
          from_block: chunk.from_block,
          to_block: chunk.to_block,
        };

        config.progress_callback?.(
          "fetch-chunks",
          ((chunk.chunk_index + 1) / chunk.total_chunks) * 100,
          `Processing chunk ${chunk.chunk_index + 1}/${chunk.total_chunks} (blocks ${chunk.from_block}-${chunk.to_block})`,
        );

        try {
          const { logs: rawLogs } = await this.api.fetchLogs(chunkConfig);
          const { transfers } = await this.api.parseTransferLogs(
            rawLogs,
            config.include_timestamps !== false,
          );
          return transfers;
        } catch (error) {
          console.warn(
            `Failed to process chunk ${chunk.chunk_index + 1}:`,
            error,
          );
          return [];
        }
      });

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach((transfers) => allTransfers.push(...transfers));

      if (i + maxConcurrent < chunks.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return allTransfers;
  }

  async analyzeLogs(
    config: EnhancedLogsQueryConfig,
  ): Promise<LogsAnalysisResults> {
    const analysisStartTime = Date.now();

    try {
      const rpcUrl = this.api.getNetworkInfo().provider_url;
      const chunks = this.calculateBlockRangeChunks(
        config.from_block,
        config.to_block,
        rpcUrl,
      );

      config.progress_callback?.(
        "validate",
        100,
        `Split into ${chunks.length} chunks`,
      );

      let transfers: ParsedTransferLog[];
      let totalRpcCalls = 0;

      if (chunks.length === 1) {
        config.progress_callback?.("fetch-logs", 25, "Fetching logs...");
        const { logs: rawLogs, performance: fetchPerformance } =
          await this.api.fetchLogs(config);
        totalRpcCalls += fetchPerformance.rpc_calls_made;

        if (rawLogs.length === 0) {
          return this.createEmptyResults(config, analysisStartTime);
        }

        config.progress_callback?.(
          "parse-transfers",
          50,
          "Parsing transfer data...",
        );
        const { transfers: parsedTransfers, performance: parsePerformance } =
          await this.api.parseTransferLogs(
            rawLogs,
            config.include_timestamps !== false,
          );
        totalRpcCalls += parsePerformance.rpc_calls_made || 0;
        transfers = parsedTransfers;
      } else {
        config.progress_callback?.(
          "fetch-logs",
          10,
          `Processing ${chunks.length} chunks...`,
        );
        transfers = await this.processChunksConcurrently(chunks, config);
        totalRpcCalls = chunks.length * 2;
      }

      if (transfers.length === 0) {
        return this.createEmptyResults(config, analysisStartTime);
      }

      config.progress_callback?.(
        "parse-transfers",
        75,
        `Processed ${transfers.length} transfers`,
      );

      const analysisResults = await this.generateAnalytics(
        transfers,
        config.analysis_depth || "full",
      );

      const totalPerformance: PerformanceMetrics = {
        query_start_time: analysisStartTime,
        query_end_time: Date.now(),
        execution_time_ms: Date.now() - analysisStartTime,
        logs_fetched: transfers.length,
        logs_parsed: transfers.length,
        blocks_queried:
          chunks.length > 1
            ? chunks.reduce((sum, chunk) => {
                try {
                  const from =
                    typeof chunk.from_block === "number"
                      ? chunk.from_block
                      : parseInt(chunk.from_block.toString(), 10);
                  const to =
                    typeof chunk.to_block === "number"
                      ? chunk.to_block
                      : parseInt(chunk.to_block.toString(), 10);
                  return sum + (to - from + 1);
                } catch {
                  return sum + 1;
                }
              }, 0)
            : this.calculateBlocksQueried(config.from_block, config.to_block),
        rpc_calls_made: totalRpcCalls,
      };

      const results: LogsAnalysisResults = {
        query_info: {
          from_block: config.from_block,
          to_block: config.to_block,
          network: this.api.getNetworkInfo().network,
          contract_address:
            config.contract_address ||
            this.api.getNetworkInfo().contract.address,
          query_timestamp: new Date(analysisStartTime),
          execution_time_ms: totalPerformance.execution_time_ms,
        },
        raw_logs: transfers,
        ...analysisResults,
      };

      return results;
    } catch (error) {
      throw new Error(`Logs analysis failed: ${error}`);
    }
  }

  private async generateAnalytics(
    transfers: ParsedTransferLog[],
    depth: "basic" | "full" | "advanced",
  ) {
    const statistics = TransferProcessor.calculateStatistics(transfers);

    if (depth === "basic") {
      return {
        statistics,
        top_senders: TransferProcessor.getTopSenders(transfers, 5),
        top_receivers: TransferProcessor.getTopReceivers(transfers, 5),
        top_flows: [],
        time_series: [],
        distribution_buckets: [],
        network_analysis: {
          total_unique_addresses: 0,
          sender_only_addresses: 0,
          receiver_only_addresses: 0,
          bidirectional_addresses: 0,
          hub_addresses: [],
        },
      };
    }

    const topSenders = TransferProcessor.getTopSenders(transfers);
    const topReceivers = TransferProcessor.getTopReceivers(transfers);
    const topFlows = TransferProcessor.getTopFlows(transfers);

    if (depth === "full") {
      return {
        statistics,
        top_senders: topSenders,
        top_receivers: topReceivers,
        top_flows: topFlows,
        time_series: TransferProcessor.generateTimeSeries(transfers),
        distribution_buckets:
          TransferProcessor.createDistributionBuckets(transfers),
        network_analysis: TransferProcessor.analyzeNetwork(transfers),
      };
    }

    return {
      statistics,
      top_senders: topSenders,
      top_receivers: topReceivers,
      top_flows: topFlows,
      time_series: TransferProcessor.generateTimeSeries(transfers),
      distribution_buckets: TransferProcessor.createDistributionBuckets(
        transfers,
        20,
      ),
      network_analysis: TransferProcessor.analyzeNetwork(transfers),
    };
  }

  private createEmptyResults(
    config: LogsQueryConfig,
    startTime: number,
  ): LogsAnalysisResults {
    return {
      query_info: {
        from_block: config.from_block,
        to_block: config.to_block,
        network: this.api.getNetworkInfo().network,
        contract_address:
          config.contract_address || this.api.getNetworkInfo().contract.address,
        query_timestamp: new Date(startTime),
        execution_time_ms: Date.now() - startTime,
      },
      raw_logs: [],
      statistics: {
        total_transfers: 0,
        total_volume: 0,
        avg_transfer: 0,
        median_transfer: 0,
        max_transfer: 0,
        min_transfer: 0,
        unique_senders: 0,
        unique_receivers: 0,
        blocks_analyzed: 0,
      },
      top_senders: [],
      top_receivers: [],
      top_flows: [],
      time_series: [],
      distribution_buckets: [],
      network_analysis: {
        total_unique_addresses: 0,
        sender_only_addresses: 0,
        receiver_only_addresses: 0,
        bidirectional_addresses: 0,
        hub_addresses: [],
      },
    };
  }

  private calculateBlocksQueried(
    fromBlock: string | number,
    toBlock: string | number,
  ): number {
    try {
      if (fromBlock === toBlock) return 1;
      if (fromBlock === "latest" || toBlock === "latest") return 1;

      const fromNum =
        typeof fromBlock === "number"
          ? fromBlock
          : fromBlock.toString().startsWith("0x")
            ? parseInt(fromBlock.toString(), 16)
            : parseInt(fromBlock.toString(), 10);
      const toNum =
        typeof toBlock === "number"
          ? toBlock
          : toBlock.toString().startsWith("0x")
            ? parseInt(toBlock.toString(), 16)
            : parseInt(toBlock.toString(), 10);

      return Math.max(1, toNum - fromNum + 1);
    } catch {
      return 1;
    }
  }

  getNetworkInfo() {
    return this.api.getNetworkInfo();
  }

  async validateQuery(
    config: LogsQueryConfig,
  ): Promise<{ isValid: boolean; error?: string; warnings?: string[] }> {
    try {
      await this.api.fetchLogs({ ...config, max_results: 1 });
      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error:
          error instanceof Error ? error.message : "Unknown validation error",
      };
    }
  }
}
