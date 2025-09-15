export interface SimulationParams {
  functionName: string;
  fromAddress: string;
  parameters: any[];
  gasLimit?: number;
  gasPrice?: number;
  value?: number;
  blockNumber?: string | number;
  network?: string;
}

export interface SimulationResult {
  success: boolean;
  hypotheticalSuccess: boolean;
  gasUsed: number;
  gasCategory: string;
  operationCategory: string;
  error: string | null;
  output: string | null;
  decodedOutput?: any;
  stateChanges: StateChange[];
  calls: any[];
  timestamp: string;
  functionName: string;
  parameters: any[];
  note?: string;
}

export interface StateChange {
  type: "transfer" | "approval" | "mint" | "burn";
  from?: string;
  to?: string;
  amount?: number;
  spender?: string;
  owner?: string;
}

export interface ComparisonResult {
  variant: string;
  parameters: any[];
  success: boolean;
  hypotheticalSuccess: boolean;
  gasUsed: number;
  gasCategory: string;
  error: string | null;
  relativeGasCost?: number;
}

export interface BatchOperation {
  functionName: string;
  parameters: any[];
}

export interface BatchResult {
  operations: SimulationResult[];
  totalGas: number;
  successfulOperations: number;
  batchSuccess: boolean;
  successRate: number;
}

export interface TokenConfig {
  address: string;
  decimals: number;
  symbol: string;
  name: string;
  transferEventTopic: string;
  approvalEventTopic: string;
}

export interface FunctionSignature {
  selector: string;
  name: string;
  paramTypes: string[];
}

export interface GasAnalysis {
  category: string;
  gasUsed: number;
  percentage: number;
  efficiency: "high" | "medium" | "low";
  recommendation?: string;
}

export interface ExportData {
  simulationType: "single" | "comparison" | "batch";
  timestamp: string;
  network: string;
  fromAddress: string;
  results: SimulationResult[] | ComparisonResult[] | BatchResult;
  summary: {
    totalOperations: number;
    successfulOperations: number;
    totalGas: number;
    averageGas?: number;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SimulationError {
  code: string;
  message: string;
  decodedMessage?: string;
  severity: "low" | "medium" | "high";
  suggestion?: string;
}

export interface GasComparisonChartData {
  data: Array<{
    name: string;
    gasUsed: number;
    relativeCost: number;
    efficiency: number;
    success: boolean;
    category: string;
  }>;
  chartType: "bar" | "line" | "area" | "composed";
  colors: {
    primary: string;
    secondary: string;
    success: string;
    error: string;
    warning: string;
  };
}

export interface BatchGasChartData {
  data: Array<{
    operation: string;
    gasUsed: number;
    cumulativeGas: number;
    success: boolean;
    operationType: string;
    timestamp: number;
    efficiency: number;
  }>;
  summary: {
    totalGas: number;
    averageGas: number;
    successRate: number;
    totalOperations: number;
    failedOperations: number;
  };
}

export interface TransactionFlowData {
  nodes: Array<{
    id: string;
    name: string;
    address: string;
    nodeType: "sender" | "receiver" | "contract" | "minter" | "burner";
    value?: number;
    label: string;
  }>;
  links: Array<{
    source: string;
    target: string;
    value: number;
    label: string;
    type: "transfer" | "approval" | "mint" | "burn";
    color?: string;
  }>;
  layout: "horizontal" | "vertical";
  colors: Record<string, string>;
}

export interface GasEfficiencyMetrics {
  score: number;
  factors: {
    gasUsage: number;
    successRate: number;
    complexity: number;
    optimization: number;
  };
  grade: "A" | "B" | "C" | "D" | "F";
  recommendations: string[];
}

export interface EnhancedSimulationResult extends SimulationResult {
  executionTime: number;
  traceData?: any;
  gasBreakdown?: {
    execution: number;
    storage: number;
    memory: number;
    logs: number;
  };
  optimizationSuggestions?: string[];
  efficiencyMetrics?: GasEfficiencyMetrics;
}

export interface ComparisonAnalysis {
  variants: ComparisonResult[];
  bestVariant: ComparisonResult | null;
  worstVariant: ComparisonResult | null;
  gasRange: {
    min: number;
    max: number;
    average: number;
    variance: number;
  };
  successRate: number;
  recommendations: string[];
  chartData: GasComparisonChartData;
}

export interface BatchAnalysis {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  successRate: number;
  totalGasUsed: number;
  averageGasPerOperation: number;
  gasEfficiency: number;
  executionTime: number;
  failurePoints: number[];
  gasDistribution: Record<string, number>;
  operationTypes: Record<string, number>;
  recommendations: string[];
  chartData: BatchGasChartData;
  flowData?: TransactionFlowData;
}

export interface EnhancedBatchResult extends BatchResult {
  analysis: BatchAnalysis;
  executionTime: number;
  timestamp: string;
}

export interface SimulationHookOptions {
  enabled?: boolean;
  network?: string;
  cacheTime?: number;
  staleTime?: number;
  onSuccess?: (result: any) => void;
  onError?: (error: Error) => void;
}

export interface VisualizationConfig {
  theme: "dark" | "light";
  colors: {
    primary: string;
    secondary: string;
    success: string;
    error: string;
    warning: string;
    background: string;
    text: string;
  };
  responsive: boolean;
  animations: boolean;
  tooltips: boolean;
}

export interface ExportOptions {
  format: "json" | "csv" | "pdf";
  includeCharts?: boolean;
  includeMetadata?: boolean;
  filename?: string;
}

export interface PerformanceMetrics {
  executionTime: number;
  cacheHitRate: number;
  memoryUsage: number;
  operationsPerSecond: number;
  errorRate: number;
  averageGasUsage: number;
}
