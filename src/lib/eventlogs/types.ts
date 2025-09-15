export interface RawLogData {
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
  address: string;
  topics: string[];
  data: string;
  removed?: boolean;
}

export interface ParsedTransferLog {
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
  from: string;
  from_short: string;
  to: string;
  to_short: string;
  value_pyusd: number;
  value_raw: string;
  timestamp?: number;
  datetime?: Date;
}

export interface TransferStatistics {
  total_transfers: number;
  total_volume: number;
  avg_transfer: number;
  median_transfer: number;
  max_transfer: number;
  min_transfer: number;
  unique_senders: number;
  unique_receivers: number;
  blocks_analyzed: number;
  time_range?: {
    start: Date;
    end: Date;
    duration_hours: number;
  };
}

export interface TopParticipant {
  address: string;
  address_short: string;
  total_value: number;
  transactions: number;
  percentage_of_volume: number;
}

export interface TransferFlow {
  from: string;
  from_short: string;
  to: string;
  to_short: string;
  total_value: number;
  transaction_count: number;
  percentage_of_volume: number;
}

export interface TimeSeriesData {
  timestamp: number;
  datetime: Date;
  hour: Date;
  volume: number;
  transaction_count: number;
  unique_participants: number;
}

export interface DistributionBucket {
  min_value: number;
  max_value: number;
  count: number;
  percentage: number;
  cumulative_percentage: number;
}

export interface LogsAnalysisResults {
  transfers: any[];
  query_info: {
    from_block: string | number;
    to_block: string | number;
    network: string;
    contract_address: string;
    query_timestamp: Date;
    execution_time_ms: number;
  };
  raw_logs: ParsedTransferLog[];
  statistics: TransferStatistics;
  top_senders: TopParticipant[];
  top_receivers: TopParticipant[];
  top_flows: TransferFlow[];
  time_series: TimeSeriesData[];
  distribution_buckets: DistributionBucket[];
  network_analysis: {
    total_unique_addresses: number;
    sender_only_addresses: number;
    receiver_only_addresses: number;
    bidirectional_addresses: number;
    hub_addresses: string[];
  };
}

export interface LogsQueryConfig {
  from_block: string | number;
  to_block: string | number;
  network: "mainnet" | "sepolia";
  contract_address?: string;
  max_results?: number;
  include_timestamps?: boolean;
  analysis_depth?: "basic" | "full" | "advanced";
}

export interface ExportData {
  analysis_type: string;
  analysis_time: string;
  query_config: LogsQueryConfig;
  statistics: TransferStatistics;
  raw_data: ParsedTransferLog[];
  top_senders: TopParticipant[];
  top_receivers: TopParticipant[];
  top_flows: TransferFlow[];
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

export interface NetworkConfig {
  name: string;
  rpcUrl: string;
  chainId: number;
  blockExplorer: string;
  supports_debug: boolean;
  max_block_range?: number;
}

export interface PerformanceMetrics {
  query_start_time: number;
  query_end_time: number;
  execution_time_ms: number;
  logs_fetched: number;
  logs_parsed: number;
  blocks_queried: number;
  rpc_calls_made: number;
  cache_hits?: number;
  cache_misses?: number;
}

export interface LogsError {
  code: string;
  message: string;
  details?: any;
  suggestions?: string[];
}

export interface ChartDataPoint {
  x: number | string | Date;
  y: number;
  label?: string;
  color?: string;
}

export interface NetworkGraphNode {
  id: string;
  label: string;
  value: number;
  group?: string;
  color?: string;
}

export interface NetworkGraphEdge {
  from: string;
  to: string;
  value: number;
  label?: string;
  color?: string;
}

export interface SankeyData {
  nodes: Array<{
    id: string;
    label: string;
    color?: string;
  }>;
  links: Array<{
    source: string;
    target: string;
    value: number;
    color?: string;
  }>;
}
