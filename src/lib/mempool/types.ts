export interface TxPoolStatus {
  pending: number;
  queued: number;
  total: number;
  timestamp: number;
  network: string;
}

export interface TxPoolContent {
  pending: Record<string, Record<string, TransactionData>>;
  queued: Record<string, Record<string, TransactionData>>;
}

export interface TransactionData {
  hash: string;
  from: string;
  to: string | null;
  value: string;
  gas: string;
  gasPrice: string;
  input: string;
  nonce: string;
  type?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
}

export interface CongestionAnalysis {
  level: "low" | "moderate" | "high" | "extreme";
  factor: number;
  description: string;
  color: string;
  recommendations: string[];
  estimatedConfirmationTime: string;
}

export interface NetworkConditions {
  network: string;
  txPoolStatus: TxPoolStatus;
  congestionAnalysis: CongestionAnalysis;
  baseFee: number;
  gasRecommendations: GasRecommendations;
  lastUpdated: number;
}

export interface GasRecommendations {
  slow: GasTier;
  standard: GasTier;
  fast: GasTier;
  rapid: GasTier;
}

export interface GasTier {
  gasPrice: number;
  expectedConfirmation: string;
  description: string;
  icon: string;
}

export interface PyusdTransaction {
  hash: string;
  from: string;
  to: string;
  nonce: number;
  function: PyusdFunction;
  gasPriceGwei: number;
  valueEth?: number;
  status: "pending" | "queued";
  timestamp: number;
}

export interface PyusdFunction {
  name: string;
  signature: string;
  parameters?: Record<string, any>;
}

export interface PyusdAnalysis {
  totalTransactions: number;
  pyusdTransactions: PyusdTransaction[];
  pyusdCount: number;
  pyusdPercentage: number;
  functionDistribution: Record<string, FunctionStats>;
  summary: PyusdSummary;
}

export interface FunctionStats {
  count: number;
  percentage: number;
  averageGasPrice: number;
  totalValue?: number;
}

export interface PyusdSummary {
  totalAnalyzed: number;
  pyusdFound: number;
  pyusdPercentage: number;
  topFunction: string;
  averageGasPrice: number;
  analysisTime: string;
}

export interface NetworkComparison {
  networks: NetworkConditions[];
  comparison: ComparisonMetrics;
  timestamp: number;
}

export interface ComparisonMetrics {
  mostCongested: string;
  leastCongested: string;
  averagePending: number;
  totalTransactions: number;
  recommendations: string[];
}

export interface CongestionGaugeData {
  value: number;
  level: string;
  color: string;
  description: string;
}

export interface NetworkComparisonChartData {
  network: string;
  pending: number;
  queued: number;
  congestionLevel: string;
  congestionColor: string;
}

export interface GasPriceHistoryData {
  timestamp: number;
  baseFee: number;
  slow: number;
  standard: number;
  fast: number;
  rapid: number;
}

export interface PyusdFunctionDistributionData {
  function: string;
  count: number;
  percentage: number;
  color: string;
}

export interface MempoolExportData {
  analysisType: "mempool_status" | "pyusd_analysis" | "network_comparison";
  analysisTime: string;
  networks: string[];
  summary: ExportSummary;
  data: any;
  metadata: ExportMetadata;
}

export interface ExportSummary {
  totalNetworks: number;
  totalTransactions: number;
  pyusdTransactions?: number;
  mostCongestedNetwork?: string;
  averageConfirmationTime?: string;
}

export interface ExportMetadata {
  version: string;
  generatedBy: string;
  exportFormat: string;
  includeCharts: boolean;
  filters?: Record<string, any>;
}

export interface MempoolUIState {
  selectedNetwork: string;
  selectedAnalysisType: "status" | "detailed" | "comparison";
  autoRefresh: boolean;
  refreshInterval: number;
  showExpensiveWarning: boolean;
  filters: MempoolFilters;
  sortConfig: SortConfig;
}

export interface MempoolFilters {
  minGasPrice?: number;
  maxGasPrice?: number;
  functionTypes?: string[];
  addressFilter?: string;
  showPyusdOnly?: boolean;
}

export interface SortConfig {
  field: string;
  direction: "asc" | "desc";
}

export interface MempoolError {
  type: "rpc_error" | "network_error" | "validation_error" | "rate_limit";
  message: string;
  details?: string;
  recoverable: boolean;
  retryAction?: () => void;
}

export interface LoadingState {
  isLoading: boolean;
  loadingStage?:
    | "connecting"
    | "fetching_status"
    | "fetching_content"
    | "processing";
  progress?: number;
  message?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  network: string;
}

export interface PerformanceMetrics {
  rpcCallDuration: number;
  processingDuration: number;
  renderDuration: number;
  memoryUsage?: number;
  cacheHitRate?: number;
}

export interface RealtimeUpdate {
  type: "status_update" | "new_transaction" | "congestion_change";
  data: any;
  timestamp: number;
  network: string;
}

export interface AccessibilityOptions {
  useHighContrast: boolean;
  reduceMotion: boolean;
  screenReaderOptimized: boolean;
  keyboardNavigationEnabled: boolean;
}
