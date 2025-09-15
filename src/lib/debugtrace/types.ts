export interface OpcodeDistributionData {
  category: string;
  gasUsed: number;
  percentage: number;
  count: number;
  color: string;
}

export interface ExecutionTimelineData {
  step: number;
  gasUsed: number;
  cumulativeGas: number;
  opcode: string;
  depth: number;
  timestamp?: number;
}

export interface MemoryUsageData {
  step: number;
  stackDepth: number;
  memorySize: number;
  gasUsed: number;
}

export interface PerformanceMetric {
  name: string;
  value: number | string;
  unit?: string;
  trend?: "up" | "down" | "stable";
  benchmark?: number;
  description: string;
}

export interface ProcessedStructLogData {
  opcodeDistribution: OpcodeDistributionData[];
  executionTimeline: ExecutionTimelineData[];
  memoryUsage: MemoryUsageData[];
  performanceMetrics: PerformanceMetric[];
  gasHeatmap: GasHeatmapData[];
}

export interface GasHeatmapData {
  step: number;
  opcode: string;
  gasUsed: number;
  intensity: number;
}

export interface NetworkNode {
  id: string;
  label: string;
  type: "contract" | "eoa";
  gasUsed: number;
  callCount: number;
  value: number;
  position?: { x: number; y: number };
  data?: {
    address: string;
    contractName?: string;
    functions: string[];
  };
}

export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  gasUsed: number;
  value: number;
  callType: string;
  success: boolean;
  label?: string;
}

export interface GasAttributionData {
  contractAddress: string;
  contractName: string;
  gasUsed: number;
  percentage: number;
  callCount: number;
  color: string;
}

export interface CallHierarchyNode {
  id: string;
  parentId?: string;
  contractAddress: string;
  contractName: string;
  functionName: string;
  gasUsed: number;
  value: number;
  success: boolean;
  depth: number;
  children: CallHierarchyNode[];
}

export interface ValueTransferData {
  from: string;
  to: string;
  value: number;
  gasUsed: number;
  success: boolean;
  step: number;
}

export interface SuccessRateData {
  contractAddress: string;
  contractName: string;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  successRate: number;
}

export interface ProcessedCallTraceData {
  contractInteractions: NetworkNode[];
  networkEdges: NetworkEdge[];
  gasAttribution: GasAttributionData[];
  callHierarchy: CallHierarchyNode[];
  valueTransfers: ValueTransferData[];
  callSuccessRates: SuccessRateData[];
}

export interface GasBreakdownData {
  category: string;
  contractAddress?: string;
  contractGas: number;
  opcodeGas: number;
  total: number;
  percentage: number;
}

export interface EfficiencyMetric {
  name: string;
  value: number;
  unit: string;
  benchmark: number;
  score: number;
  trend?: "up" | "down" | "stable";
  recommendation?: string;
}

export interface CostAnalysisData {
  category: string;
  contractAddress?: string;
  gasUsed: number;
  costWei: bigint;
  costUSD: number;
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
}

export interface UnifiedGasData {
  gasBreakdown: GasBreakdownData[];
  efficiencyMetrics: EfficiencyMetric[];
  costAnalysis: CostAnalysisData[];
  optimizationSuggestions: OptimizationSuggestion[];
}

export interface LoadingStep {
  id: string;
  name: string;
  description?: string;
  status: "pending" | "loading" | "completed" | "error";
  progress?: number;
  error?: string;
  duration?: number;
}

export interface ProgressiveLoaderProps {
  steps: LoadingStep[];
  onStepComplete?: (stepId: string) => void;
  onAllComplete?: () => void;
  className?: string;
}

export interface StructLogAnalyticsProps {
  structLog: import("@/lib/structLogTracer").StructLogAnalysis;
  loading: boolean;
  className?: string;
}

export interface TransactionTracerAnalyticsProps {
  callTrace: import("@/lib/transactionTracer").TransactionAnalysis;
  loading: boolean;
  className?: string;
}

export interface UnifiedGasAnalyticsProps {
  structLog?: import("@/lib/structLogTracer").StructLogAnalysis;
  callTrace?: import("@/lib/transactionTracer").TransactionAnalysis;
  loading: boolean;
  className?: string;
}

export interface AnalyticsErrorState {
  type: "data_processing" | "chart_rendering" | "network_error";
  message: string;
  recoverable: boolean;
  retryAction?: () => void;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ChartTheme {
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    background: string;
    text: string;
    grid: string;
  };
  fonts: {
    family: string;
    size: {
      small: number;
      medium: number;
      large: number;
    };
  };
}

export interface ChartConfig {
  theme: ChartTheme;
  responsive: boolean;
  animation: boolean;
  tooltip: {
    enabled: boolean;
    formatter?: (value: any, name: string, props: any) => React.ReactNode;
  };
}
