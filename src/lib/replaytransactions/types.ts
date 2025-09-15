export interface ReplayTransactionRequest {
  txHash: string;
  tracers: ReplayTracer[];
  network?: string;
}

export interface ReplayBlockRequest {
  blockIdentifier: string | number;
  tracers: ReplayTracer[];
  network?: string;
}

export type ReplayTracer = "trace" | "stateDiff" | "vmTrace";

export interface ReplayTransactionResult {
  trace?: TraceResult[];
  stateDiff?: StateDiffResult;
  vmTrace?: VmTraceResult;
}

export interface ReplayBlockResult {
  [txIndex: number]: ReplayTransactionResult;
}

export interface TraceResult {
  action: {
    from: string;
    to: string;
    value: string;
    gas: string;
    input: string;
    callType?: string;
  };
  result?: {
    gasUsed: string;
    output: string;
  };
  error?: string;
  type: string;
  traceAddress: number[];
  subtraces: number;
}

export interface StateDiffResult {
  [address: string]: {
    balance?: {
      "*": {
        from: string;
        to: string;
      };
    };
    nonce?: {
      "*": {
        from: string;
        to: string;
      };
    };
    code?: {
      "*": {
        from: string;
        to: string;
      };
    };
    storage?: {
      [slot: string]: {
        "*": {
          from: string;
          to: string;
        };
      };
    };
  };
}

export interface VmTraceResult {
  code: string;
  ops: VmOperation[];
  gasUsed: string;
}

export interface VmOperation {
  cost: number;
  ex?: {
    mem?: {
      data: string;
      off: number;
    };
    push?: string[];
    store?: {
      key: string;
      val: string;
    };
    used: number;
  };
  op: string;
  pc: number;
  sub?: VmTraceResult;
}

export interface ProcessedReplayData {
  transactionHash: string;
  network: string;
  timestamp: number;
  tracersUsed: ReplayTracer[];

  traceAnalysis?: TraceAnalysis;

  stateDiffAnalysis?: StateDiffAnalysis;

  vmTraceAnalysis?: VmTraceAnalysis;

  securityFlags: SecurityFlag[];

  tokenAnalysis?: TokenAnalysis;

  performanceMetrics: PerformanceMetrics;
}

export interface TraceAnalysis {
  totalCalls: number;
  maxDepth: number;
  totalGasUsed: number;
  errorCount: number;
  contractInteractions: ContractInteraction[];
  functionCalls: FunctionCall[];
  valueTransfers: ValueTransfer[];
  callHierarchy: CallHierarchyNode[];
}

export interface StateDiffAnalysis {
  totalChanges: number;
  balanceChanges: BalanceChange[];
  storageChanges: StorageChange[];
  codeChanges: CodeChange[];
  nonceChanges: NonceChange[];
  contractsAffected: string[];
  tokenStateChanges: TokenStateChange[];
}

export interface VmTraceAnalysis {
  totalSteps: number;
  gasUsed: number;
  opcodeDistribution: OpcodeDistribution[];
  memoryOperations: number;
  storageOperations: number;
  stackOperations: number;
  topGasOpcodes: TopGasOpcode[];
}

export interface SecurityFlag {
  level: "critical" | "high" | "warning" | "info";
  type:
    | "admin_function"
    | "ownership_change"
    | "code_change"
    | "supply_change"
    | "pause_state_change"
    | "suspicious_pattern";
  description: string;
  details: Record<string, any>;
  txHash?: string;
  txIndex?: number;
}

export interface TokenAnalysis {
  hasTokenInteraction: boolean;
  tokenTransfers: TokenTransfer[];
  balanceChanges: TokenBalanceChange[];
  supplyChanges: TokenSupplyChange[];
  allowanceChanges: TokenAllowanceChange[];
  totalVolume: number;
  uniqueAddresses: string[];
}

export interface PerformanceMetrics {
  gasEfficiency: number;
  executionTime?: number;
  optimizationSuggestions: OptimizationSuggestion[];
  gasBreakdown: GasBreakdown[];
  costAnalysis: CostAnalysis;
}

export interface ContractInteraction {
  address: string;
  name?: string;
  callCount: number;
  gasUsed: number;
  functions: string[];
  isToken?: boolean;
}

export interface FunctionCall {
  signature: string;
  name: string;
  category: string;
  count: number;
  gasUsed: number;
  success: boolean;
  contractAddress: string;
}

export interface ValueTransfer {
  from: string;
  to: string;
  value: bigint;
  gasUsed: number;
  traceIndex: number;
  success: boolean;
}

export interface CallHierarchyNode {
  id: string;
  parentId?: string;
  contractAddress: string;
  contractName?: string;
  functionName: string;
  gasUsed: number;
  value: bigint;
  success: boolean;
  depth: number;
  children: CallHierarchyNode[];
  traceAddress: number[];
}

export interface BalanceChange {
  address: string;
  contractName?: string;
  fromBalance: bigint;
  toBalance: bigint;
  change: bigint;
  changeEth: number;
}

export interface StorageChange {
  key: string;
  after: string;
  before: any;
  transactionIndex: number;
  gasUsed: number;
  address: string;
  contractName?: string;
  slot: string;
  fromValue: string;
  toValue: string;
  interpretation?: StorageInterpretation;
}

export interface StorageInterpretation {
  type:
    | "balance"
    | "allowance"
    | "total_supply"
    | "owner"
    | "paused"
    | "metadata"
    | "unknown";
  description: string;
  formattedValue: string;
  metadata?: {
    rawValue: string;
    tokenAddress?: string;
    tokenSymbol?: string;
    decimals?: number;
    holderAddress?: string;
    ownerAddress?: string;
    isPaused?: boolean;
    stringValue?: string;
    storageSlot?: string;
    [key: string]: any;
  };
}

export interface CodeChange {
  address: string;
  contractName?: string;
  changeType: "created" | "destroyed" | "modified";
  fromCodeHash?: string;
  toCodeHash?: string;
}

export interface NonceChange {
  address: string;
  fromNonce: number;
  toNonce: number;
  change: number;
}

export interface TokenStateChange {
  tokenAddress: string;
  tokenSymbol?: string;
  changeType: "balance" | "allowance" | "supply" | "metadata";
  affectedAddress?: string;
  fromValue: string;
  toValue: string;
  change: string;
  formattedChange: string;
}

export interface TokenTransfer {
  tokenAddress: string;
  tokenSymbol?: string;
  from: string;
  to: string;
  value: bigint;
  formattedValue: number;
  functionType: "transfer" | "transferFrom" | "mint" | "burn";
  traceIndex: number;
  gasUsed: number;
  success: boolean;
}

export interface TokenBalanceChange {
  tokenAddress: string;
  tokenSymbol?: string;
  holderAddress: string;
  fromBalance: bigint;
  toBalance: bigint;
  change: bigint;
  formattedChange: number;
  storageSlot: string;
}

export interface TokenSupplyChange {
  tokenAddress: string;
  tokenSymbol?: string;
  fromSupply: bigint;
  toSupply: bigint;
  change: bigint;
  formattedChange: number;
  changeType: "mint" | "burn";
}

export interface TokenAllowanceChange {
  tokenAddress: string;
  tokenSymbol?: string;
  owner: string;
  spender: string;
  fromAllowance: bigint;
  toAllowance: bigint;
  change: bigint;
  formattedChange: number;
}

export interface OpcodeDistribution {
  opcode: string;
  count: number;
  gasUsed: number;
  percentage: number;
}

export interface TopGasOpcode {
  opcode: string;
  count: number;
  gasUsed: number;
  percentage: number;
}

export interface OptimizationSuggestion {
  id: string;
  type: "gas" | "performance" | "security";
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
  recommendation: string;
  potentialSavings?: {
    gas: number;
    percentage: number;
    costUSD: number;
  };
  affectedFunctions?: string[];
}

export interface GasBreakdown {
  category: string;
  gasUsed: number;
  percentage: number;
  description: string;
}

export interface CostAnalysis {
  totalGasUsed: number;
  gasPrice: bigint;
  totalCostWei: bigint;
  totalCostEth: number;
  totalCostUSD: number;
  breakdown: {
    execution: number;
    storage: number;
    transfer: number;
    other: number;
  };
}

export interface TokenFlowNode {
  id: string;
  label: string;
  type: "address" | "contract" | "zero";
  value: number;
  tokenSymbol?: string;
  isHighlighted?: boolean;
}

export interface TokenFlowEdge {
  id: string;
  source: string;
  target: string;
  value: number;
  formattedValue: string;
  tokenSymbol?: string;
  functionType: string;
  gasUsed: number;
  success: boolean;
}

export interface StateChangeHeatmapData {
  address: string;
  contractName?: string;
  changeType: string;
  intensity: number;
  value: number;
  timestamp: number;
}

export interface ExecutionTimelineData {
  step: number;
  opcode: string;
  gasUsed: number;
  cumulativeGas: number;
  depth: number;
  contractAddress?: string;
  functionName?: string;
  isTokenOperation?: boolean;
}

export interface ProcessedBlockReplayData {
  blockIdentifier: string;
  network: string;
  timestamp: number;
  tracersUsed: ReplayTracer[];
  transactionCount: number;

  totalGasUsed: number;
  totalStateChanges: number;
  totalTokenTransfers: number;
  totalTokenVolume: number;

  transactionSummaries: TransactionSummary[];

  blockSecurityFlags: SecurityFlag[];
  blockTokenAnalysis: BlockTokenAnalysis;
  blockPerformanceMetrics: BlockPerformanceMetrics;

  activityHeatmap: ActivityHeatmapData[];
  volumeDistribution: VolumeDistributionData[];
  stateChangeDistribution: StateChangeDistributionData[];
}

export interface TransactionSummary {
  txIndex: number;
  txHash: string;
  hasTokenInteraction: boolean;
  tokenTransfers: number;
  tokenVolume: number;
  stateChanges: number;
  gasUsed: number;
  securityFlags: SecurityFlag[];
  status: "success" | "failed";
}

export interface BlockTokenAnalysis {
  tokenTransactionCount: number;
  tokenTransactionPercentage: number;
  totalTokenVolume: number;
  uniqueTokens: string[];
  topTokensByVolume: Array<{
    address: string;
    symbol?: string;
    volume: number;
    transferCount: number;
  }>;
  topHoldersByActivity: Array<{
    address: string;
    transferCount: number;
    volume: number;
  }>;
}

export interface BlockPerformanceMetrics {
  averageGasPerTx: number;
  gasEfficiencyScore: number;
  optimizationOpportunities: number;
  performanceFlags: Array<{
    type: string;
    description: string;
    affectedTxCount: number;
  }>;
}

export interface ActivityHeatmapData {
  txIndex: number;
  stateChanges: number;
  tokenVolume: number;
  gasUsed: number;
  intensity: number;
}

export interface VolumeDistributionData {
  txIndex: number;
  tokenVolume: number;
  transferCount: number;
  gasUsed: number;
}

export interface StateChangeDistributionData {
  changeType: string;
  count: number;
  percentage: number;
}

export class ReplayError extends Error {
  public code: string;
  public details?: Record<string, any>;

  constructor(code: string, message: string, details?: Record<string, any>) {
    super(message);
    this.name = "ReplayError";
    this.code = code;
    this.details = details;
  }
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ReplayConfig {
  defaultTracers: ReplayTracer[];
  maxRetries: number;
  timeout: number;
  cacheEnabled: boolean;
  cacheTTL: number;
  tokenConfigs: TokenConfig[];
}

export interface TokenConfig {
  address: string;
  symbol: string;
  decimals: number;
  name: string;
  isStablecoin?: boolean;
  category?: string;
}

export interface ExportOptions {
  format: "csv" | "json" | "xlsx";
  includeRawData: boolean;
  includeVisualizations: boolean;
  filename?: string;
}

export interface ExportData {
  metadata: {
    exportTimestamp: string;
    dataType: string;
    transactionHash?: string;
    blockIdentifier?: string;
  };
  summary: Record<string, any>;
  data: Record<string, any>;
}
