export interface BytecodeAnalysisProps {
  addresses: string[];
  contractNames?: string[];
  network?: string;
  loading?: boolean;
  className?: string;
}

export interface ContractSizeData {
  contractName: string;
  address: string;
  size: number;
  percentage: number;
  color: string;
}

export interface FunctionDistributionData {
  category: string;
  count: number;
  percentage: number;
  color: string;
}

export interface SimilarityHeatmapData {
  contractA: string;
  contractB: string;
  similarity: number;
  sharedFunctions: number;
}

export interface StandardsComplianceData {
  standard: string;
  compliantContracts: number;
  totalContracts: number;
  percentage: number;
  color: string;
}

export interface SecurityFeaturesData {
  feature: string;
  contractsWithFeature: string[];
  count: number;
  percentage: number;
}

export interface ComplexityDistributionData {
  complexityLevel: "Low" | "Medium" | "High";
  count: number;
  contracts: string[];
  color: string;
}

export interface ProxyRelationshipData {
  proxyAddress: string;
  implementationAddress: string;
  proxyName: string;
  implementationName: string;
  proxySize: number;
  implementationSize: number;
  relationship: string;
}

export interface BytecodeMetricsData {
  totalContracts: number;
  totalSize: number;
  averageSize: number;
  largestContract: {
    name: string;
    address: string;
    size: number;
  };
  smallestContract: {
    name: string;
    address: string;
    size: number;
  };
  standardsDetected: string[];
  securityFeaturesFound: number;
  proxyContractsFound: number;
}

export interface ProcessedBytecodeData {
  contractSizes: ContractSizeData[];
  functionDistribution: FunctionDistributionData[];
  similarityMatrix: SimilarityHeatmapData[];
  standardsCompliance: StandardsComplianceData[];
  securityFeatures: SecurityFeaturesData[];
  complexityDistribution: ComplexityDistributionData[];
  proxyRelationships: ProxyRelationshipData[];
  metrics: BytecodeMetricsData;
}

export interface BytecodeExportOptions {
  format: "json" | "csv";
  includeRawBytecode?: boolean;
  includeMetadata?: boolean;
  filename?: string;
}

export interface BytecodeBookmark {
  id: string;
  name: string;
  addresses: string[];
  contractNames: string[];
  network: string;
  timestamp: number;
  description?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
