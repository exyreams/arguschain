export interface DebugBlockTraceItem {
  txHash: string;
  result: {
    from: string;
    to: string;
    value: string;
    gasUsed: string;
    input: string;
    error?: string;
    calls?: DebugBlockCall[];
  };
  error?: string;
}

export interface DebugBlockCall {
  from: string;
  to: string;
  type: string;
  input: string;
  gasUsed: string;
  value?: string;
  calls?: DebugBlockCall[];
}

export interface PyusdContractInfo {
  address: string;
  name: string;
}

export interface PyusdFunctionSignature {
  name: string;
  category:
    | "token_movement"
    | "supply_change"
    | "allowance"
    | "control"
    | "admin"
    | "view"
    | "other";
}

export interface PyusdTransfer {
  from: string;
  to: string;
  value: number;
  tx_hash: string;
}

export interface PyusdInternalTransaction {
  tx_hash: string;
  from: string;
  to: string;
  to_contract: string;
  function: string;
  call_type: string;
  gas_used: number;
  depth: number;
}

export interface PyusdFunctionCategories {
  token_movement: number;
  supply_change: number;
  allowance: number;
  control: number;
  admin: number;
  view: number;
  other: number;
}

export interface BlockTransactionSummary {
  tx_index: number;
  tx_hash: string;
  from: string;
  to: string;
  value_eth: string;
  gas_used: number;
  failed: boolean;
  pyusd_interaction: boolean;
  pyusd_function?: string;
  pyusd_function_category: string;
  is_pyusd_transfer: boolean;
  is_pyusd_mint: boolean;
  is_pyusd_burn: boolean;
  transfer_value: number;
}

export interface BlockAnalysisSummary {
  block_identifier: string;
  total_transactions: number;
  total_gas_used: number;
  failed_traces_count: number;
  pyusd_interactions_count: number;
  pyusd_transfer_count: number;
  pyusd_mint_count: number;
  pyusd_burn_count: number;
  pyusd_volume: number;
  pyusd_volume_formatted: string;
  pyusd_percentage: number;
}

export interface FunctionCategoryData {
  category: string;
  count: number;
  percentage: number;
}

export interface GasDistributionData {
  gas_used: number;
  interaction_type: "PYUSD Transaction" | "Other Transaction";
}

export interface TransferNetworkNode {
  id: string;
  label: string;
  address: string;
}

export interface TransferNetworkEdge {
  from: string;
  to: string;
  value: number;
  value_formatted: string;
}

export interface ExportData {
  summary: BlockAnalysisSummary;
  transactions: BlockTransactionSummary[];
  pyusd_transfers: PyusdTransfer[];
  internal_transactions: PyusdInternalTransaction[];
  function_categories: PyusdFunctionCategories;
}

export interface ExportOptions {
  format: "csv" | "json";
  filename?: string;
  filter_pyusd_only?: boolean;
}

export interface DebugBlockAnalyticsProps {
  blockIdentifier: string;
  traceData: DebugBlockTraceItem[];
  loading: boolean;
  error?: string;
  className?: string;
}

export interface BlockTransactionTableProps {
  transactions: BlockTransactionSummary[];
  loading: boolean;
  onExport?: (options: ExportOptions) => void;
  className?: string;
}

export interface BlockPyusdAnalyticsProps {
  summary: BlockAnalysisSummary;
  functionCategories: PyusdFunctionCategories;
  transfers: PyusdTransfer[];
  internalTransactions: PyusdInternalTransaction[];
  loading: boolean;
  className?: string;
}

export interface BlockNetworkGraphProps {
  transfers: PyusdTransfer[];
  blockIdentifier: string;
  loading: boolean;
  className?: string;
}

export interface DebugTraceBlockRequest {
  method: "debug_traceBlockByNumber" | "debug_traceBlockByHash";
  params: [string, DebugTraceConfig];
}

export interface DebugTraceConfig {
  tracer: "callTracer";
  tracerConfig?: {
    onlyTopCall?: boolean;
    withLog?: boolean;
  };
}

export interface BlockInfoRequest {
  blockIdentifier: string | number;
  includeTransactions?: boolean;
}

export interface BlockInfo {
  number: number;
  hash: string;
  parentHash: string;
  timestamp: number;
  gasUsed: string;
  gasLimit: string;
  transactions: string[];
  transactionCount: number;
}

export interface DebugBlockError {
  type: "network_error" | "rpc_error" | "parsing_error" | "validation_error";
  message: string;
  blockIdentifier?: string;
  originalError?: Error;
  suggestions?: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  blockInfo?: BlockInfo;
}

export interface DebugBlockCacheEntry {
  blockIdentifier: string;
  traceData: DebugBlockTraceItem[];
  analysis: ProcessedDebugBlockData;
  timestamp: number;
  expiresAt: number;
}

export interface ProcessedDebugBlockData {
  summary: BlockAnalysisSummary;
  transactions: BlockTransactionSummary[];
  pyusdTransfers: PyusdTransfer[];
  internalTransactions: PyusdInternalTransaction[];
  functionCategories: PyusdFunctionCategories;
  gasDistribution: GasDistributionData[];
  functionCategoryData: FunctionCategoryData[];
}

export interface UseDebugBlockTraceResult {
  data: ProcessedDebugBlockData | null;
  loading: boolean;
  error: DebugBlockError | null;
  refetch: () => Promise<void>;
  blockInfo: BlockInfo | null;
}

export interface UseDebugBlockStatusResult {
  isConnected: boolean;
  networkName: string;
  currentBlock: number;
  gasPrice: number;
  loading: boolean;
  error: string | null;
}
