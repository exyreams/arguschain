// Core Block Trace Analysis Types
export interface BlockIdentifier {
  value: string | number;
  type: "number" | "hash" | "tag";
}

export interface RawBlockTrace {
  action: {
    from: string;
    to?: string;
    value: string;
    gas: string;
    input: string;
    callType?: string;
  };
  result?: {
    gasUsed: string;
    output?: string;
  };
  error?: string;
  transactionHash: string;
  transactionPosition: number;
  blockHash: string;
  blockNumber: number;
  type: string;
  subtraces: number;
  traceAddress: number[];
}

export interface ProcessedBlockTrace {
  id: string;
  transactionHash: string;
  transactionIndex: number;
  traceAddress: number[];
  type: "call" | "create" | "suicide" | "reward";
  from: string;
  to?: string;
  value: bigint;
  valueEth: number;
  gas: bigint;
  gasUsed: bigint;
  input: string;
  output?: string;
  error?: string;
  success: boolean;
  callType?: string;
  depth: number;
  category: TransactionCategory;
  pyusdDetails?: PYUSDTransactionDetails;
}

export interface TransactionCategory {
  type:
    | "eth_transfer"
    | "contract_call"
    | "contract_creation"
    | "pyusd_transaction"
    | "token_transfer"
    | "defi_interaction"
    | "other";
  subtype: string;
  description: string;
  confidence: number;
}

export interface PYUSDTransactionDetails {
  type: "transfer" | "approve" | "transferFrom" | "mint" | "burn" | "other";
  from?: string;
  to?: string;
  spender?: string;
  amount: bigint;
  amountFormatted: string;
  functionSignature: string;
  parameters: Record<string, any>;
  events: PYUSDEvent[];
  success: boolean;
  gasUsed: bigint;
}

export interface PYUSDEvent {
  eventName: string;
  from?: string;
  to?: string;
  spender?: string;
  amount?: bigint;
  amountFormatted?: string;
  parameters: Record<string, any>;
}

// Analysis Results
export interface BlockAnalysis {
  blockNumber: number;
  blockHash: string;
  timestamp: number;
  totalTransactions: number;
  totalTraces: number;
  totalGasUsed: bigint;
  failedTraces: number;
  summary: BlockSummary;
  traces: ProcessedBlockTrace[];
  gasAnalysis: GasAnalysis;
  tokenFlowAnalysis: TokenFlowAnalysis;
  performanceMetrics: PerformanceMetrics;
}

export interface BlockSummary {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  successRate: number;
  pyusdTransactions: number;
  pyusdPercentage: number;
  totalValue: string;
  totalGasUsed: string;
  averageGasPerTx: string;
}

export interface GasAnalysis {
  totalGasUsed: bigint;
  averageGasPerTrace: number;
  gasDistribution: GasDistributionItem[];
  gasEfficiency: GasEfficiencyMetrics;
  optimizationOpportunities: OptimizationOpportunity[];
}

export interface GasDistributionItem {
  category: string;
  gasUsed: bigint;
  percentage: number;
  transactionCount: number;
  averageGasPerTransaction: number;
  color: string;
}

export interface GasEfficiencyMetrics {
  successRate: number;
  averageGasPerSuccess: number;
  averageGasPerFailure: number;
  wastedGas: bigint;
  efficiencyScore: number;
}

export interface OptimizationOpportunity {
  type: "gas_optimization" | "pattern_improvement" | "error_reduction";
  severity: "low" | "medium" | "high";
  description: string;
  recommendation: string;
  potentialSavings: {
    gasAmount: bigint;
    percentage: number;
    estimatedCostUSD?: number;
  };
}

export interface TokenFlowAnalysis {
  pyusdTransactions: PYUSDTransactionDetails[];
  flowMetrics: TokenFlowMetrics;
  networkAnalysis: TokenNetworkAnalysis;
  flowDiagram: FlowDiagramData;
}

export interface TokenFlowMetrics {
  totalTransfers: number;
  totalVolume: bigint;
  totalVolumeFormatted: string;
  uniqueSenders: number;
  uniqueReceivers: number;
  averageTransferAmount: bigint;
  averageTransferAmountFormatted: string;
  largestTransfer: bigint;
  largestTransferFormatted: string;
}

export interface TokenNetworkAnalysis {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  centralityMetrics: CentralityMetrics;
  clusteringCoefficient: number;
  networkDensity: number;
}

export interface NetworkNode {
  address: string;
  label: string;
  type: "sender" | "receiver" | "both";
  transactionCount: number;
  totalVolume: bigint;
  centrality: number;
}

export interface NetworkEdge {
  from: string;
  to: string;
  weight: number;
  volume: bigint;
  transactionCount: number;
}

export interface CentralityMetrics {
  betweennessCentrality: Record<string, number>;
  closenessCentrality: Record<string, number>;
  degreeCentrality: Record<string, number>;
}

export interface FlowDiagramData {
  nodes: FlowNode[];
  edges: FlowEdge[];
  graphvizDot: string;
  svgContent?: string;
}

export interface FlowNode {
  id: string;
  label: string;
  type: "address" | "contract";
  style: NodeStyle;
}

export interface FlowEdge {
  from: string;
  to: string;
  label: string;
  weight: number;
  style: EdgeStyle;
}

export interface NodeStyle {
  shape: string;
  color: string;
  fillColor: string;
  fontColor: string;
}

export interface EdgeStyle {
  color: string;
  width: number;
  style: "solid" | "dashed" | "dotted";
}

export interface PerformanceMetrics {
  executionTime: number;
  memoryUsage: number;
  cacheHitRate: number;
  rpcCallCount: number;
  processingSteps: ProcessingStep[];
}

export interface ProcessingStep {
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
  memoryDelta: number;
  status: "completed" | "failed" | "skipped";
  error?: string;
}

// Chart Data Interfaces
export interface TransactionCategoryData {
  category: string;
  count: number;
  percentage: number;
  gasUsed: number;
  color: string;
}

export interface GasDistributionData {
  category: string;
  totalGas: number;
  transactionCount: number;
  averageGas: number;
  percentageOfTotal: number;
  color: string;
}

export interface TokenFlowData {
  from: string;
  to: string;
  amount: number;
  transactionCount: number;
  failed: boolean;
  label: string;
}

export interface PerformanceMetricData {
  name: string;
  value: number | string;
  unit?: string;
  trend?: "up" | "down" | "stable";
  benchmark?: number;
  description: string;
}

export interface TimelineAnalysisData {
  timestamp: number;
  transactionIndex: number;
  gasUsed: number;
  cumulativeGas: number;
  transactionType: string;
  success: boolean;
}

// Export and Validation
export interface ExportData {
  metadata: ExportMetadata;
  blockAnalysis: BlockAnalysis;
  performanceMetrics: PerformanceMetrics;
}

export interface ExportMetadata {
  exportedAt: string;
  blockNumber: number;
  blockHash: string;
  network: string;
  analysisVersion: string;
  exportFormat: "csv" | "json" | "google_sheets";
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: "error" | "warning";
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion: string;
}

// Cache and Performance
export interface CacheEntry<T> {
  key: string;
  data: T;
  timestamp: number;
  expiresAt: number;
  size: number;
  accessCount: number;
}

export interface CacheMetrics {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  evictionCount: number;
}

export interface CacheConfig {
  maxSize: number;
  ttlMs: number;
  enablePersistence: boolean;
}

// UI Component Props
export interface BlockTraceAnalyzerProps {
  initialBlockId?: BlockIdentifier;
  onAnalysisComplete?: (results: BlockAnalysis) => void;
}

export interface BlockAnalysisControlsProps {
  onAnalyze: (blockId: BlockIdentifier) => void;
  loading: boolean;
  networks: NetworkInfo[];
  currentNetwork: NetworkType;
  onNetworkChange: (network: NetworkType) => void;
}

export interface BlockAnalysisResultsProps {
  analysis: BlockAnalysis;
  onExport: (format: ExportFormat) => void;
}

export interface NetworkInfo {
  name: string;
  chainId: number;
  rpcUrl: string;
  blockExplorer: string;
}

export type NetworkType = "mainnet" | "sepolia" | "holesky";
export type ExportFormat = "csv" | "json" | "google_sheets";

// Error Handling
export interface AnalyticsErrorState {
  type: "data_processing" | "chart_rendering" | "network_error";
  message: string;
  recoverable: boolean;
  retryAction?: () => void;
}

// Accessibility
export interface AccessibilityOptions {
  altText: string;
  ariaLabel: string;
  keyboardNavigation: boolean;
  screenReaderSupport: boolean;
}

export interface ChartOptions {
  title: string;
  responsive: boolean;
  theme: "light" | "dark";
  colors: string[];
  accessibility: AccessibilityOptions;
}

export interface ChartData {
  type: "pie" | "bar" | "line" | "scatter" | "network";
  data: any[];
  options: ChartOptions;
}
