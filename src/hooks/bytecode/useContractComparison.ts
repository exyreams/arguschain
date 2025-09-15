import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  bytecodeService,
  type ContractComparison,
  type RelationshipResult,
  type SimilarityResult,
} from "@/lib/bytecode";

export interface ContractInput {
  address: string;
  name?: string;
}

export interface UseContractComparisonOptions {
  network?: string;
  enabled?: boolean;
  minSimilarity?: number;
  includeRelationships?: boolean;
}

export function useContractComparison(
  contracts: ContractInput[],
  options: UseContractComparisonOptions = {},
) {
  const {
    network = "mainnet",
    enabled = true,
    minSimilarity = 0,
    includeRelationships = true,
  } = options;

  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["contract-comparison", contracts, network, minSimilarity],
    queryFn: async (): Promise<ContractComparison> => {
      await bytecodeService.initialize(network);
      return await bytecodeService.analyzeMultipleContracts(contracts);
    },
    enabled:
      enabled &&
      contracts.length >= 2 &&
      contracts.every((c) => c.address.trim()),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    retryDelay: 3000,
  });

  const processedComparison = useMemo(() => {
    if (!query.data) return null;

    const filteredSimilarities = query.data.similarities.filter(
      (sim) => sim.similarity >= minSimilarity,
    );

    const filteredRelationships = includeRelationships
      ? query.data.relationships
      : [];

    return {
      ...query.data,
      similarities: filteredSimilarities.sort(
        (a, b) => b.similarity - a.similarity,
      ),
      relationships: filteredRelationships,
    };
  }, [query.data, minSimilarity, includeRelationships]);

  const similarityMatrix = useMemo(() => {
    if (!processedComparison) return [];

    const contractCount = processedComparison.contracts.length;
    const matrix: number[][] = Array(contractCount)
      .fill(null)
      .map(() => Array(contractCount).fill(0));

    for (let i = 0; i < contractCount; i++) {
      matrix[i][i] = 100;
    }

    processedComparison.similarities.forEach((sim) => {
      const indexA = processedComparison.contracts.findIndex(
        (c) => c.address === sim.contractA,
      );
      const indexB = processedComparison.contracts.findIndex(
        (c) => c.address === sim.contractB,
      );

      if (indexA !== -1 && indexB !== -1) {
        matrix[indexA][indexB] = sim.similarity;
        matrix[indexB][indexA] = sim.similarity;
      }
    });

    return matrix;
  }, [processedComparison]);

  const topSimilarities = useMemo(() => {
    if (!processedComparison) return [];
    return processedComparison.similarities.slice(0, 5);
  }, [processedComparison]);

  const relationships = useMemo(() => {
    if (!processedComparison) return [];
    return processedComparison.relationships;
  }, [processedComparison]);

  const insights = useMemo(() => {
    if (!processedComparison) return null;

    const avgSimilarity =
      processedComparison.similarities.length > 0
        ? processedComparison.similarities.reduce(
            (sum, sim) => sum + sim.similarity,
            0,
          ) / processedComparison.similarities.length
        : 0;

    const maxSimilarity =
      processedComparison.similarities.length > 0
        ? Math.max(
            ...processedComparison.similarities.map((sim) => sim.similarity),
          )
        : 0;

    const minSimilarity =
      processedComparison.similarities.length > 0
        ? Math.min(
            ...processedComparison.similarities.map((sim) => sim.similarity),
          )
        : 0;

    const proxyCount = processedComparison.contracts.filter(
      (c) => c.proxy.isProxy,
    ).length;
    const standardsCount = new Set(
      processedComparison.contracts.flatMap((c) => c.standards),
    ).size;

    return {
      avgSimilarity: Math.round(avgSimilarity * 100) / 100,
      maxSimilarity: Math.round(maxSimilarity * 100) / 100,
      minSimilarity: Math.round(minSimilarity * 100) / 100,
      proxyCount,
      standardsCount,
      totalContracts: processedComparison.contracts.length,
      totalRelationships: processedComparison.relationships.length,
    };
  }, [processedComparison]);

  return {
    comparison: processedComparison,
    similarities: processedComparison?.similarities || [],
    relationships,
    similarityMatrix,
    topSimilarities,
    insights,

    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isSuccess: query.isSuccess,

    refetch: query.refetch,
  };
}

export function usePairwiseComparison(
  contractA: ContractInput,
  contractB: ContractInput,
  options: UseContractComparisonOptions = {},
) {
  const { network = "mainnet", enabled = true } = options;

  return useQuery({
    queryKey: ["pairwise-comparison", contractA, contractB, network],
    queryFn: async () => {
      if (
        !contractA.address ||
        !contractB.address ||
        contractA.address === contractB.address
      ) {
        return null;
      }

      await bytecodeService.initialize(network);
      const comparison = await bytecodeService.analyzeMultipleContracts([
        contractA,
        contractB,
      ]);

      return {
        ...comparison,
        similarity: comparison.similarities[0] || null,
        relationship: comparison.relationships[0] || null,
      };
    },
    enabled:
      enabled &&
      !!contractA.address &&
      !!contractB.address &&
      contractA.address !== contractB.address,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });
}

export function useContractComparisonMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contracts,
      network = "mainnet",
    }: {
      contracts: ContractInput[];
      network?: string;
    }): Promise<ContractComparison> => {
      await bytecodeService.initialize(network);
      return await bytecodeService.analyzeMultipleContracts(contracts);
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        ["contract-comparison", variables.contracts, variables.network],
        data,
      );
    },
    retry: 2,
    retryDelay: 3000,
  });
}

export function useSimilarityCalculation(
  contractA: string,
  contractB: string,
  options: UseContractComparisonOptions = {},
) {
  const { network = "mainnet", enabled = true } = options;

  return useQuery({
    queryKey: ["similarity-calculation", contractA, contractB, network],
    queryFn: async (): Promise<SimilarityResult | null> => {
      if (!contractA || !contractB || contractA === contractB) {
        return null;
      }

      await bytecodeService.initialize(network);
      const comparison = await bytecodeService.analyzeMultipleContracts([
        { address: contractA, name: "Contract A" },
        { address: contractB, name: "Contract B" },
      ]);

      return comparison.similarities[0] || null;
    },
    enabled: enabled && !!contractA && !!contractB && contractA !== contractB,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });
}

export function useRelationshipDetection(
  addresses: string[],
  options: UseContractComparisonOptions = {},
) {
  const { network = "mainnet", enabled = true } = options;

  return useQuery({
    queryKey: ["relationship-detection", addresses, network],
    queryFn: async (): Promise<RelationshipResult[]> => {
      if (addresses.length < 2) return [];

      await bytecodeService.initialize(network);
      const contracts = addresses.map((address, index) => ({
        address,
        name: `Contract ${String.fromCharCode(65 + index)}`,
      }));

      const comparison =
        await bytecodeService.analyzeMultipleContracts(contracts);
      return comparison.relationships;
    },
    enabled:
      enabled &&
      addresses.length >= 2 &&
      addresses.every((addr) => addr.trim()),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
  });
}

export function useBatchSimilarityAnalysis(
  contractGroups: ContractInput[][],
  options: UseContractComparisonOptions = {},
) {
  const { network = "mainnet", enabled = true } = options;

  return useQuery({
    queryKey: ["batch-similarity-analysis", contractGroups, network],
    queryFn: async () => {
      const results = await Promise.allSettled(
        contractGroups.map(async (group) => {
          if (group.length < 2) return null;

          await bytecodeService.initialize(network);
          return await bytecodeService.analyzeMultipleContracts(group);
        }),
      );

      return results.map((result, index) => ({
        groupIndex: index,
        group: contractGroups[index],
        status: result.status,
        data: result.status === "fulfilled" ? result.value : null,
        error: result.status === "rejected" ? result.reason : null,
      }));
    },
    enabled:
      enabled &&
      contractGroups.length > 0 &&
      contractGroups.some((group) => group.length >= 2),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });
}

export function useContractFamilyDetection(
  contracts: ContractInput[],
  options: UseContractComparisonOptions & { similarityThreshold?: number } = {},
) {
  const {
    network = "mainnet",
    enabled = true,
    similarityThreshold = 70,
  } = options;

  const comparisonQuery = useContractComparison(contracts, {
    network,
    enabled,
  });

  const families = useMemo(() => {
    if (!comparisonQuery.comparison) return [];

    const families: ContractInput[][] = [];
    const processed = new Set<string>();

    comparisonQuery.comparison.contracts.forEach((contract) => {
      if (processed.has(contract.address)) return;

      const family = [
        { address: contract.address, name: contract.contractName },
      ];
      processed.add(contract.address);

      comparisonQuery.similarities
        .filter(
          (sim) =>
            sim.similarity >= similarityThreshold &&
            (sim.contractA === contract.address ||
              sim.contractB === contract.address),
        )
        .forEach((sim) => {
          const otherAddress =
            sim.contractA === contract.address ? sim.contractB : sim.contractA;
          const otherContract = comparisonQuery.comparison!.contracts.find(
            (c) => c.address === otherAddress,
          );

          if (otherContract && !processed.has(otherAddress)) {
            family.push({
              address: otherAddress,
              name: otherContract.contractName,
            });
            processed.add(otherAddress);
          }
        });

      if (family.length > 1) {
        families.push(family);
      }
    });

    return families;
  }, [
    comparisonQuery.comparison,
    comparisonQuery.similarities,
    similarityThreshold,
  ]);

  return {
    families,
    isLoading: comparisonQuery.isLoading,
    isError: comparisonQuery.isError,
    error: comparisonQuery.error,
  };
}
