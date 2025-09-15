export interface RawTraceAction {
  action: {
    from: string;
    to?: string;
    value?: string;
    gas?: string;
    input?: string;
    callType?: string;
    init?: string;
  };
  result?: {
    gasUsed?: string;
    output?: string;
    address?: string;
  };
  type: string;
  traceAddress: number[];
  error?: string;
  gasUsed?: string;
}

export interface ProcessedTraceAction {
  index: number;
  traceAddress: number[];
  type: string;
  depth: number;
  from: string;
  to: string;
  value: number;
  valueEth: number;
  gasUsed: number;
  isPyusd: boolean;
  contract: string;
  function: string;
  category: string;
  parameters: FunctionParameters;
  error?: string;
  gasEfficiency?: GasEfficiency;
  inputPreview: string;
  outputPreview: string;
}

export interface FunctionParameters {
  [key: string]: any;

  to?: string;
  from?: string;
  amount?: number;
  spender?: string;
  owner?: string;
  account?: string;
  newOwner?: string;

  to_address?: string;
  from_address?: string;
  amount_formatted?: string;
  spender_address?: string;
  owner_address?: string;
  account_address?: string;
  newOwner_address?: string;
}

export interface DecodedFunction {
  name: string;
  category: string;
  params: FunctionParameters;
}

export interface GasEfficiency {
  efficiency: "excellent" | "good" | "average" | "poor" | "unknown";
  color: string;
  pctDiff: number;
  comparedToMedian: number;
}

export interface ContractInteractionData {
  from: string;
  to: string;
  callCount: number;
  totalGas: number;
  interactionType: string;
  isPyusdRelated: boolean;
}

export interface ContractInteraction {
  from: string;
  to: string;
  count: number;
  gas: number;
}

export interface TokenFlowData {
  from: string;
  to: string;
  amount: number;
  formattedAmount: string;
  traceAddress: number[];
  transferType: "transfer" | "transferFrom" | "mint" | "burn";
  value: number;
}

export interface TokenTransfer {
  from: string;
  to: string;
  amount: number;
  value: number;
  trace_addr: number[];
}

export interface PatternAnalysisData {
  pattern: string;
  confidence: number;
  description: string;
  indicators: PatternIndicator[];
  complexity: number;
  riskLevel: string;
  matches: PatternMatch[];
}

export interface PatternIndicator {
  type: string;
  confidence: number;
  description: string;
}

export interface PatternMatch {
  pattern: string;
  confidence: number;
  description: string;
}

export interface TransactionPattern {
  pattern: string;
  confidence: number;
  description: string;
  matches: PatternMatch[];
}

export interface MevAnalysisData {
  mevDetected: boolean;
  mevType?: string;
  confidence: number;
  description?: string;
  indicators: MevIndicator[];
  riskAssessment: string;
}

export interface MevIndicator {
  type: string;
  confidence: number;
  description: string;
}

export interface MevAnalysis {
  mev_detected: boolean;
  type: string | null;
  confidence: number;
  description: string | null;
  indicators: MevIndicator[];
}

export interface SecurityAssessmentData {
  overallRisk: string;
  concerns: SecurityConcern[];
  highRiskOperations: HighRiskOperation[];
  recommendations: SecurityRecommendation[];
}

export interface SecurityConcern {
  level: "low" | "medium" | "high" | "critical";
  description: string;
  contract: string;
  from: string;
}

export interface HighRiskOperation {
  functionName: string;
  riskLevel: string;
  description: string;
  contract: string;
}

export interface SecurityRecommendation {
  type: string;
  description: string;
  severity: "low" | "medium" | "high";
}

export interface GasAnalysisData {
  totalGas: number;
  gasDistribution: GasDistribution[];
  efficiencyMetrics: EfficiencyMetric[];
  optimizationSuggestions: OptimizationSuggestion[];
  benchmarkComparison: BenchmarkComparison[];
  gasBreakdown: GasBreakdownData[];
}

export interface GasDistribution {
  category: string;
  gasUsed: number;
  percentage: number;
  color: string;
}

export interface EfficiencyMetric {
  name: string;
  value: number;
  unit: string;
  benchmark?: number;
  score: number;
  trend?: "up" | "down" | "stable";
  description: string;
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
}

export interface BenchmarkComparison {
  functionName: string;
  actualGas: number;
  benchmarkGas: number;
  efficiency: string;
  difference: number;
  percentageDiff: number;
}

export interface GasBreakdownData {
  category: string;
  contractGas: number;
  opcodeGas: number;
  total: number;
  percentage: number;
}

export interface NetworkGraphData {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  layout: GraphLayout;
  interactionMetrics: InteractionMetrics;
}

export interface NetworkNode {
  id: string;
  label: string;
  address: string;
  nodeType: "pyusd" | "external" | "eoa";
  size: number;
  color: string;
  isPyusd: boolean;
  contractName: string;
  name?: string;
  is_pyusd?: boolean;
}

export interface NetworkEdge {
  source: string;
  target: string;
  weight: number;
  callCount: number;
  gasUsed: number;
  edgeType: string;
  color: string;
}

export interface GraphLayout {
  algorithm: "spring" | "hierarchical" | "circular";
  parameters: Record<string, any>;
}

export interface InteractionMetrics {
  totalInteractions: number;
  uniqueContracts: number;
  pyusdInteractions: number;
  externalInteractions: number;
}

export interface CallGraphData {
  nodes: CallNode[];
  edges: CallEdge[];
  hierarchy: CallHierarchy;
  depthMetrics: DepthMetrics;
}

export interface CallNode {
  id: string;
  traceAddress: number[];
  depth: number;
  function: string;
  gasUsed: number;
  isPyusd: boolean;
  hasError: boolean;
  nodeSize: number;
  nodeColor: string;
  type: string;
  from: string;
  to: string;
  value_eth: number;
  is_pyusd: boolean;
  contract: string;
  function_category: string;
  error?: string;
  input_preview: string;
  output_preview: string;
}

export interface CallEdge {
  source: string;
  target: string;
  callType: string;
  gasUsed: number;
  success: boolean;
}

export interface CallHierarchy {
  root: CallNode;
  maxDepth: number;
  totalNodes: number;
}

export interface DepthMetrics {
  maxDepth: number;
  gasPerDepth: Record<number, number>;
  callsPerDepth: Record<number, number>;
}

export interface FlowGraphData {
  transfers: TokenTransfer[];
  aggregatedFlows: AggregatedFlow[];
  flowMetrics: FlowMetrics;
  visualizationData: FlowVisualizationData;
}

export interface AggregatedFlow {
  from: string;
  to: string;
  totalAmount: number;
  transferCount: number;
  formattedAmount: string;
}

export interface FlowMetrics {
  totalTransfers: number;
  totalAmount: number;
  uniqueAddresses: number;
  averageTransferSize: number;
}

export interface FlowVisualizationData {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface FlowNode {
  id: string;
  address: string;
  label: string;
  size: number;
  color: string;
}

export interface FlowEdge {
  source: string;
  target: string;
  amount: number;
  label: string;
  color: string;
  weight: number;
}

export interface ReplayData {
  steps: ReplayStep[];
  currentStep: number;
  totalSteps: number;
  executionPath: ExecutionPath;
  callStack: CallStackFrame[];
}

export interface ReplayStep {
  index: number;
  action: ProcessedTraceAction;
  callStack: CallStackFrame[];
  gasUsed: number;
  cumulativeGas: number;
  stateChanges: StateChange[];
}

export interface ExecutionPath {
  steps: ReplayStep[];
  totalGas: number;
  totalSteps: number;
  maxDepth: number;
}

export interface CallStackFrame {
  depth: number;
  from: string;
  to: string;
  function: string;
  gasUsed: number;
  isPyusd: boolean;
}

export interface StateChange {
  type: "storage" | "balance" | "code";
  address: string;
  key?: string;
  oldValue?: string;
  newValue?: string;
}

export interface TraceAnalysisResults {
  transactionHash: string;
  summary: AnalysisSummary;
  processedActions: ProcessedTraceAction[];
  contractInteractions: ContractInteractionData[];
  tokenFlows: TokenFlowData[];
  patternAnalysis: PatternAnalysisData;
  mevAnalysis: MevAnalysisData;
  securityAssessment: SecurityAssessmentData;
  gasAnalysis: GasAnalysisData;
  visualizationData: {
    contractGraph?: NetworkGraphData;
    callGraph?: CallGraphData;
    flowGraph?: FlowGraphData;
  };
  replayData?: ReplayData;
}

export interface AnalysisSummary {
  totalActions: number;
  totalGasUsed: number;
  errorsCount: number;
  pyusdInteractions: number;
  pyusdTransfers: number;
  complexityScore: number;
  uniqueContracts: number;
  maxDepth: number;
  pyusdGasUsage: number;
  pyusdGasPercentage: number;
}

export interface TraceAnalysisErrorState {
  type: "trace_fetch" | "processing" | "visualization" | "pattern_detection";
  message: string;
  recoverable: boolean;
  retryAction?: () => void;
  fallbackOptions?: FallbackOption[];
}

export interface FallbackOption {
  label: string;
  action: () => void;
  description: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface TraceTransactionAnalyzerProps {
  initialTxHash?: string;
  onAnalysisComplete?: (results: TraceAnalysisResults) => void;
}

export interface TraceAnalysisControlsProps {
  onAnalyze: (txHash: string, options: AnalysisOptions) => void;
  loading: boolean;
  networks: NetworkInfo[];
  currentNetwork: NetworkType;
  onNetworkChange: (network: NetworkType) => void;
}

export interface AnalysisOptions {
  includePatternDetection: boolean;
  includeMevAnalysis: boolean;
  includeSecurityAnalysis: boolean;
  includeVisualization: boolean;
  analysisDepth: "summary" | "full" | "custom";
}

export interface NetworkInfo {
  name: string;
  chainId: number;
  rpcUrl: string;
  blockExplorer: string;
}

export type NetworkType = "mainnet" | "sepolia";

export interface TraceAnalysisResultsProps {
  results: TraceAnalysisResults;
  traces: ProcessedTraceAction[];
  onExport: (format: ExportFormat) => void;
  onReplay?: () => void;
}

export type ExportFormat = "csv" | "json" | "sheets";

export interface ComplexityAnalysis {
  score: number;
  factors: ComplexityFactor[];
  level: "low" | "medium" | "high" | "very_high";
}

export interface ComplexityFactor {
  name: string;
  value: number;
  weight: number;
  contribution: number;
}

export interface ComplexityScore {
  overall: number;
  breakdown: {
    callDepth: number;
    contractCount: number;
    gasUsage: number;
    errorRate: number;
  };
}

export interface RiskAssessment {
  level: "low" | "medium" | "high" | "critical";
  score: number;
  factors: string[];
  recommendations: string[];
}

export interface ApprovalOperation {
  spender: string;
  amount: number;
  formattedAmount: string;
  isInfinite: boolean;
  riskLevel: "low" | "medium" | "high";
}

export interface ApprovalRisk {
  operation: ApprovalOperation;
  riskLevel: "low" | "medium" | "high";
  description: string;
  recommendation: string;
}

export interface ComparisonMetrics {
  actionCount: MetricComparison;
  gasUsage: MetricComparison;
  contractCount: MetricComparison;
  maxDepth: MetricComparison;
  errorCount: MetricComparison;
}

export interface MetricComparison {
  transaction1: number;
  transaction2: number;
  difference: number;
  percentageChange: number;
}

export interface ComparisonDifference {
  category: "pattern" | "gas" | "security" | "contracts" | "performance";
  type: string;
  description: string;
  impact: "low" | "medium" | "high";
  transaction1Value: string;
  transaction2Value: string;
}

export interface PatternComparison {
  typeChanged: boolean;
  confidenceChange: number;
  complexityChange: number;
  indicatorChanges: {
    added: string[];
    removed: string[];
    common: string[];
  };
  summary: string;
}

export interface GasComparison {
  totalGasChange: number;
  totalGasPercentageChange: number;
  efficiencyChange: number;
  categoryChanged: boolean;
  optimizationOpportunities: {
    added: string[];
    removed: string[];
    common: string[];
  };
  summary: string;
}

export interface SecurityComparison {
  riskLevelChange: number;
  concernCountChange: number;
  newConcerns: SecurityConcern[];
  resolvedConcerns: SecurityConcern[];
  summary: string;
}

export interface TransactionSummary {
  pattern: string;
  gasUsed: number;
  gasEfficiency: string;
  actionCount: number;
  contractCount: number;
  securityRisk: number;
  hasErrors: boolean;
}

export interface ComparisonResult {
  transaction1: {
    hash: string;
    summary: TransactionSummary;
  };
  transaction2: {
    hash: string;
    summary: TransactionSummary;
  };
  metrics: ComparisonMetrics;
  differences: ComparisonDifference[];
  patternComparison: PatternComparison;
  gasComparison: GasComparison;
  securityComparison: SecurityComparison;
  recommendations: string[];
}
