import type { ContractComparison } from "@/lib/bytecode";
import type {
  BytecodeMetricsData,
  ComplexityDistributionData,
  ContractSizeData,
  FunctionDistributionData,
  ProcessedBytecodeData,
  ProxyRelationshipData,
  SecurityFeaturesData,
  SimilarityHeatmapData,
  StandardsComplianceData,
} from "@/lib/bytecode/types";
import {
  CHART_COLORS,
  COMPLEXITY_COLORS,
  STANDARD_COLORS,
} from "@/lib/bytecode/constants";

export function processAllBytecodeData(
  comparison: ContractComparison,
): ProcessedBytecodeData {
  const { contracts, similarities, relationships } = comparison;

  return {
    contractSizes: processContractSizes(contracts),
    functionDistribution: processFunctionDistribution(contracts),
    similarityMatrix: processSimilarityMatrix(similarities),
    standardsCompliance: processStandardsCompliance(contracts),
    securityFeatures: processSecurityFeatures(contracts),
    complexityDistribution: processComplexityDistribution(contracts),
    proxyRelationships: processProxyRelationships(relationships),
    metrics: calculateMetrics(contracts),
  };
}

function processContractSizes(
  contracts: ContractComparison["contracts"],
): ContractSizeData[] {
  const totalSize = contracts.reduce((sum, contract) => sum + contract.size, 0);

  return contracts
    .map((contract, index) => ({
      contractName: contract.contractName,
      address: contract.address,
      size: contract.size,
      percentage: totalSize > 0 ? (contract.size / totalSize) * 100 : 0,
      color:
        Object.values(CHART_COLORS)[index % Object.values(CHART_COLORS).length],
    }))
    .sort((a, b) => b.size - a.size);
}

function processFunctionDistribution(
  contracts: ContractComparison["contracts"],
): FunctionDistributionData[] {
  const categoryCount: Record<string, number> = {};
  let totalFunctions = 0;

  contracts.forEach((contract) => {
    contract.functions.forEach((func) => {
      categoryCount[func.category] = (categoryCount[func.category] || 0) + 1;
      totalFunctions++;
    });
  });

  return Object.entries(categoryCount)
    .map(([category, count]) => ({
      category,
      count,
      percentage: totalFunctions > 0 ? (count / totalFunctions) * 100 : 0,
      color:
        STANDARD_COLORS[category as keyof typeof STANDARD_COLORS] ||
        CHART_COLORS.SECONDARY,
    }))
    .sort((a, b) => b.count - a.count);
}

function processSimilarityMatrix(
  similarities: ContractComparison["similarities"],
): SimilarityHeatmapData[] {
  return similarities.map((sim) => ({
    contractA: sim.contractA,
    contractB: sim.contractB,
    similarity: sim.similarity,
    sharedFunctions: sim.sharedFunctions,
  }));
}

function processStandardsCompliance(
  contracts: ContractComparison["contracts"],
): StandardsComplianceData[] {
  const standardsCount: Record<string, number> = {};
  const totalContracts = contracts.length;

  contracts.forEach((contract) => {
    contract.standards.forEach((standard) => {
      standardsCount[standard] = (standardsCount[standard] || 0) + 1;
    });
  });

  return Object.entries(standardsCount)
    .map(([standard, count]) => ({
      standard,
      compliantContracts: count,
      totalContracts,
      percentage: totalContracts > 0 ? (count / totalContracts) * 100 : 0,
      color:
        STANDARD_COLORS[standard as keyof typeof STANDARD_COLORS] ||
        CHART_COLORS.SECONDARY,
    }))
    .sort((a, b) => b.compliantContracts - a.compliantContracts);
}

function processSecurityFeatures(
  contracts: ContractComparison["contracts"],
): SecurityFeaturesData[] {
  const featureCount: Record<string, string[]> = {};

  contracts.forEach((contract) => {
    contract.security.features.forEach((feature) => {
      if (!featureCount[feature]) {
        featureCount[feature] = [];
      }
      featureCount[feature].push(contract.contractName);
    });
  });

  return Object.entries(featureCount)
    .map(([feature, contractsWithFeature]) => ({
      feature,
      contractsWithFeature,
      count: contractsWithFeature.length,
      percentage:
        contracts.length > 0
          ? (contractsWithFeature.length / contracts.length) * 100
          : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

function processComplexityDistribution(
  contracts: ContractComparison["contracts"],
): ComplexityDistributionData[] {
  const complexityCount: Record<string, string[]> = {
    Low: [],
    Medium: [],
    High: [],
  };

  contracts.forEach((contract) => {
    complexityCount[contract.complexity.level].push(contract.contractName);
  });

  return Object.entries(complexityCount)
    .map(([level, contractNames]) => ({
      complexityLevel: level as "Low" | "Medium" | "High",
      count: contractNames.length,
      contracts: contractNames,
      color: COMPLEXITY_COLORS[level as keyof typeof COMPLEXITY_COLORS],
    }))
    .filter((item) => item.count > 0);
}

function processProxyRelationships(
  relationships: ContractComparison["relationships"],
): ProxyRelationshipData[] {
  return relationships
    .filter((rel) => rel.type === "proxy-implementation")
    .map((rel) => {
      const [proxyAddress, implementationAddress] = rel.contracts;
      return {
        proxyAddress,
        implementationAddress,
        proxyName: `Proxy (${shortenAddress(proxyAddress)})`,
        implementationName: `Implementation (${shortenAddress(implementationAddress)})`,
        proxySize: 0,
        implementationSize: 0,
        relationship: rel.description,
      };
    });
}

function calculateMetrics(
  contracts: ContractComparison["contracts"],
): BytecodeMetricsData {
  if (contracts.length === 0) {
    return {
      totalContracts: 0,
      totalSize: 0,
      averageSize: 0,
      largestContract: { name: "", address: "", size: 0 },
      smallestContract: { name: "", address: "", size: 0 },
      standardsDetected: [],
      securityFeaturesFound: 0,
      proxyContractsFound: 0,
    };
  }

  const totalSize = contracts.reduce((sum, contract) => sum + contract.size, 0);
  const averageSize = totalSize / contracts.length;

  const sortedBySize = [...contracts].sort((a, b) => b.size - a.size);
  const largestContract = sortedBySize[0];
  const smallestContract = sortedBySize[sortedBySize.length - 1];

  const allStandards = new Set<string>();
  let securityFeaturesCount = 0;
  let proxyContractsCount = 0;

  contracts.forEach((contract) => {
    contract.standards.forEach((standard) => allStandards.add(standard));
    if (contract.security.hasControls) securityFeaturesCount++;
    if (contract.proxy.isProxy) proxyContractsCount++;
  });

  return {
    totalContracts: contracts.length,
    totalSize,
    averageSize,
    largestContract: {
      name: largestContract.contractName,
      address: largestContract.address,
      size: largestContract.size,
    },
    smallestContract: {
      name: smallestContract.contractName,
      address: smallestContract.address,
      size: smallestContract.size,
    },
    standardsDetected: Array.from(allStandards),
    securityFeaturesFound: securityFeaturesCount,
    proxyContractsFound: proxyContractsCount,
  };
}

function shortenAddress(address: string, chars: number = 4): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 2 + chars)}...${address.slice(-chars)}`;
}
