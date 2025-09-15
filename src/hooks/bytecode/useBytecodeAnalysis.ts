import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { bytecodeService, type ContractComparison } from "@/lib/bytecode";

export interface UseBytecodeAnalysisOptions {
  network?: string;
  enabled?: boolean;
}

export interface ContractInput {
  address: string;
  name?: string;
}

export function useBytecodeAnalysis(
  contracts: ContractInput[],
  options: UseBytecodeAnalysisOptions = {},
) {
  const { network = "mainnet", enabled = true } = options;

  return useQuery({
    queryKey: ["bytecode-analysis", contracts, network],
    queryFn: async (): Promise<ContractComparison> => {
      await bytecodeService.initialize(network);
      return await bytecodeService.analyzeMultipleContracts(contracts);
    },
    enabled:
      enabled &&
      contracts.length > 0 &&
      contracts.some((c) => c.address.trim()),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    retryDelay: 3000,
  });
}

export function useSingleContractAnalysis(
  address: string,
  contractName?: string,
  options: UseBytecodeAnalysisOptions = {},
) {
  const { network = "mainnet", enabled = true } = options;

  return useQuery({
    queryKey: ["single-contract-analysis", address, contractName, network],
    queryFn: async () => {
      await bytecodeService.initialize(network);
      return await bytecodeService.analyzeContract(address, contractName);
    },
    enabled: enabled && !!address.trim(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    retryDelay: 3000,
  });
}

export function useBytecodeAnalysisMutation() {
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
        ["bytecode-analysis", variables.contracts, variables.network],
        data,
      );
    },
    retry: 2,
    retryDelay: 3000,
  });
}

export function useIsContract(
  address: string,
  options: UseBytecodeAnalysisOptions = {},
) {
  const { network = "mainnet", enabled = true } = options;

  return useQuery({
    queryKey: ["is-contract", address, network],
    queryFn: async (): Promise<boolean> => {
      await bytecodeService.initialize(network);
      return await bytecodeService.isContract(address);
    },
    enabled: enabled && !!address.trim(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });
}

export function useContractSize(
  address: string,
  options: UseBytecodeAnalysisOptions = {},
) {
  const { network = "mainnet", enabled = true } = options;

  return useQuery({
    queryKey: ["contract-size", address, network],
    queryFn: async (): Promise<number> => {
      await bytecodeService.initialize(network);
      return await bytecodeService.getContractSize(address);
    },
    enabled: enabled && !!address.trim(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });
}

export function useBytecodeServiceStatus(network: string = "mainnet") {
  return useQuery({
    queryKey: ["bytecode-service-status", network],
    queryFn: async () => {
      try {
        await bytecodeService.initialize(network);
        return { ready: true, error: null };
      } catch (error) {
        return {
          ready: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 3,
    retryDelay: 2000,
  });
}

export function useTransactionBytecodeAnalysis(
  txHash: string,
  options: UseBytecodeAnalysisOptions = {},
) {
  const { network = "mainnet", enabled = true } = options;

  return useQuery({
    queryKey: ["transaction-bytecode-analysis", txHash, network],
    queryFn: async (): Promise<ContractComparison> => {
      await bytecodeService.initialize(network);
      return await bytecodeService.analyzeFromTransaction(txHash);
    },
    enabled: enabled && !!txHash.trim() && /^0x[0-9a-fA-F]{64}$/.test(txHash),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    retryDelay: 3000,
  });
}

export function useTransactionBytecodeAnalysisMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      txHash,
      network = "mainnet",
    }: {
      txHash: string;
      network?: string;
    }): Promise<ContractComparison> => {
      await bytecodeService.initialize(network);
      return await bytecodeService.analyzeFromTransaction(txHash);
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        ["transaction-bytecode-analysis", variables.txHash, variables.network],
        data,
      );
    },
    retry: 2,
    retryDelay: 3000,
  });
}

export function useBytecodeCache() {
  const queryClient = useQueryClient();

  const clearCache = () => {
    bytecodeService.clearCache();
    queryClient.invalidateQueries({ queryKey: ["bytecode-analysis"] });
    queryClient.invalidateQueries({ queryKey: ["single-contract-analysis"] });
    queryClient.invalidateQueries({
      queryKey: ["transaction-bytecode-analysis"],
    });
  };

  const getCacheStats = () => {
    return bytecodeService.getCacheStats();
  };

  const warmCache = async (
    addresses: string[],
    network: string = "mainnet",
  ) => {
    const promises = addresses.map((address) =>
      queryClient.prefetchQuery({
        queryKey: ["single-contract-analysis", address, network],
        queryFn: async () => {
          await bytecodeService.initialize(network);
          return await bytecodeService.analyzeContract(address);
        },
        staleTime: 10 * 60 * 1000,
      }),
    );

    await Promise.allSettled(promises);
  };

  return {
    clearCache,
    getCacheStats,
    warmCache,
  };
}

export function useContractComparison(
  contracts: ContractInput[],
  options: UseBytecodeAnalysisOptions = {},
) {
  const { network = "mainnet", enabled = true } = options;

  return useQuery({
    queryKey: ["contract-comparison", contracts, network],
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
    select: (data) => {
      return {
        ...data,
        similarities: data.similarities.sort(
          (a, b) => b.similarity - a.similarity,
        ),
        relationships: data.relationships.filter(
          (rel) => rel.type !== "related",
        ),
      };
    },
  });
}

export function usePatternDetection(
  bytecode: string,
  options: UseBytecodeAnalysisOptions & {
    debounceMs?: number;
    confidenceThreshold?: number;
  } = {},
) {
  const {
    network = "mainnet",
    enabled = true,
    debounceMs = 500,
    confidenceThreshold = 0.7,
  } = options;
  const [debouncedBytecode, setDebouncedBytecode] = useState(bytecode);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedBytecode(bytecode);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [bytecode, debounceMs]);

  return useQuery({
    queryKey: [
      "pattern-detection",
      debouncedBytecode,
      network,
      confidenceThreshold,
    ],
    queryFn: async () => {
      if (!debouncedBytecode || debouncedBytecode.length < 10) {
        return null;
      }

      await bytecodeService.initialize(network);
      const analysis = await bytecodeService.analyzeContract(
        "0x0000000000000000000000000000000000000000",
        "Pattern Analysis",
      );

      if (analysis.patternAnalysis) {
        const filteredPatterns =
          analysis.patternAnalysis.detectedPatterns.filter(
            (pattern) => pattern.confidence >= confidenceThreshold,
          );

        return {
          ...analysis.patternAnalysis,
          detectedPatterns: filteredPatterns,
        };
      }

      return null;
    },
    enabled: enabled && !!debouncedBytecode && debouncedBytecode.length >= 10,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useSimilarityCalculation(
  contractA: string,
  contractB: string,
  options: UseBytecodeAnalysisOptions = {},
) {
  const { network = "mainnet", enabled = true } = options;

  return useQuery({
    queryKey: ["similarity-calculation", contractA, contractB, network],
    queryFn: async () => {
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

export function useContractRelationships(
  addresses: string[],
  options: UseBytecodeAnalysisOptions = {},
) {
  const { network = "mainnet", enabled = true } = options;

  return useQuery({
    queryKey: ["contract-relationships", addresses, network],
    queryFn: async () => {
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
