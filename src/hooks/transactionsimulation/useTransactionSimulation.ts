import { useCallback, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { blockchainService } from "@/lib/blockchainService";
import {
  simulationCache,
  SimulationService,
  SimulationUtils,
} from "@/lib/transactionsimulation";
import type {
  EnhancedSimulationResult,
  PerformanceMetrics,
  SimulationHookOptions,
  SimulationParams,
  SimulationResult,
} from "@/lib/transactionsimulation/types";

interface UseTransactionSimulationReturn {
  isLoading: boolean;
  error: Error | null;
  result: EnhancedSimulationResult | null;

  performanceMetrics: PerformanceMetrics | null;

  simulate: (params: SimulationParams) => Promise<EnhancedSimulationResult>;
  reset: () => void;
  retry: () => void;

  validateParams: (params: SimulationParams) => {
    isValid: boolean;
    errors: string[];
  };

  clearCache: () => void;
  getCacheStats: () => any;
}

export const useTransactionSimulation = (
  options: SimulationHookOptions = {}
): UseTransactionSimulationReturn => {
  const {
    enabled = true,
    network = "mainnet",
    cacheTime = 5 * 60 * 1000,
    staleTime = 2 * 60 * 1000,
    onSuccess,
    onError,
  } = options;

  const [lastParams, setLastParams] = useState<SimulationParams | null>(null);
  const [performanceMetrics, setPerformanceMetrics] =
    useState<PerformanceMetrics | null>(null);

  const { data: provider, isLoading: isConnecting } = useQuery({
    queryKey: ["blockchain-connection", network],
    queryFn: async () => {
      await blockchainService.connect(network as "mainnet" | "sepolia");
      return blockchainService.getProvider();
    },
    enabled,
    staleTime,
    gcTime: cacheTime,
  });

  const simulationMutation = useMutation({
    mutationFn: async (
      params: SimulationParams
    ): Promise<EnhancedSimulationResult> => {
      if (!provider) {
        throw new Error("Provider not available");
      }

      const startTime = performance.now();

      const cached = simulationCache.getCachedSimulation(
        params.functionName,
        params.fromAddress,
        params.parameters,
        params.network || network,
        params.blockNumber || "latest"
      );

      if (cached) {
        const endTime = performance.now();
        setPerformanceMetrics((prev) => ({
          executionTime: endTime - startTime,
          cacheHitRate: prev ? prev.cacheHitRate + 0.1 : 0.9,
          memoryUsage: prev?.memoryUsage || 0,
          operationsPerSecond: prev?.operationsPerSecond || 0,
          errorRate: prev?.errorRate || 0,
          averageGasUsage: cached.gasUsed,
        }));

        return {
          ...cached,
          executionTime: endTime - startTime,
        } as EnhancedSimulationResult;
      }

      const simulationService = new SimulationService(provider);

      const result = await simulationService.simulateTransaction({
        ...params,
        network,
      });

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      const enhancedResult: EnhancedSimulationResult = {
        ...result,
        executionTime,
        optimizationSuggestions: generateOptimizationSuggestions(result),
        efficiencyMetrics: calculateEfficiencyMetrics(result),
      };

      simulationCache.cacheSimulation(
        params.functionName,
        params.fromAddress,
        params.parameters,
        params.network || network,
        params.blockNumber || "latest",
        result
      );

      setPerformanceMetrics((prev) => ({
        executionTime,
        cacheHitRate: prev ? prev.cacheHitRate - 0.1 : 0.1,
        memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
        operationsPerSecond: 1000 / executionTime,
        errorRate: result.success
          ? (prev?.errorRate || 0) * 0.9
          : (prev?.errorRate || 0) + 0.1,
        averageGasUsage: result.gasUsed,
      }));

      return enhancedResult;
    },
    onSuccess: (result, params) => {
      setLastParams(params);
      onSuccess?.(result);
    },
    onError: (error, params) => {
      setLastParams(params);
      setPerformanceMetrics(
        (prev) =>
          ({
            ...prev,
            errorRate: (prev?.errorRate || 0) + 0.1,
          }) as PerformanceMetrics
      );
      onError?.(error);
    },
  });

  const validateParams = useCallback((params: SimulationParams) => {
    const errors: string[] = [];

    if (!params.functionName) {
      errors.push("Function name is required");
    }

    if (!params.fromAddress) {
      errors.push("From address is required");
    } else if (!SimulationUtils.isValidAddress(params.fromAddress)) {
      errors.push("Invalid from address format");
    }

    if (!params.parameters || params.parameters.length === 0) {
      if (
        params.functionName &&
        !["totalSupply", "decimals", "name", "symbol", "paused"].includes(
          params.functionName
        )
      ) {
        errors.push("Parameters are required for this function");
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, []);

  const simulate = useCallback(
    async (params: SimulationParams): Promise<EnhancedSimulationResult> => {
      const validation = validateParams(params);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
      }

      return await simulationMutation.mutateAsync(params);
    },
    [simulationMutation, validateParams]
  );

  const reset = useCallback(() => {
    simulationMutation.reset();
    setLastParams(null);
    setPerformanceMetrics(null);
  }, [simulationMutation]);

  const retry = useCallback(() => {
    if (lastParams) {
      simulationMutation.mutate(lastParams);
    }
  }, [lastParams, simulationMutation]);

  const clearCache = useCallback(() => {
    simulationCache.clearAll();
  }, []);

  const getCacheStats = useCallback(() => {
    return simulationCache.getStats();
  }, []);

  return {
    isLoading: isConnecting || simulationMutation.isPending,
    error: simulationMutation.error,
    result: simulationMutation.data || null,

    performanceMetrics,

    simulate,
    reset,
    retry,

    validateParams,

    clearCache,
    getCacheStats,
  };
};

function generateOptimizationSuggestions(result: SimulationResult): string[] {
  const suggestions: string[] = [];

  if (result.gasUsed > 100000) {
    suggestions.push("Consider optimizing gas usage - current usage is high");
  }

  if (!result.success && result.hypotheticalSuccess) {
    suggestions.push("Check balance and allowances before executing");
  }

  if (result.functionName === "approve" && result.parameters[1] === 0) {
    suggestions.push(
      "Consider using increaseAllowance/decreaseAllowance for better security"
    );
  }

  if (result.gasCategory === "High") {
    suggestions.push(
      "This operation uses significant gas - consider batching multiple operations"
    );
  }

  return suggestions;
}

function calculateEfficiencyMetrics(result: SimulationResult): any {
  const baseScore = result.success ? 80 : 20;
  const gasEfficiency = Math.max(0, 100 - result.gasUsed / 1000);
  const complexityPenalty = result.calls.length * 5;

  const score = Math.max(
    0,
    Math.min(100, baseScore + gasEfficiency - complexityPenalty)
  );

  return {
    score,
    factors: {
      gasUsage: Math.max(0, 100 - result.gasUsed / 1000),
      successRate: result.success ? 100 : result.hypotheticalSuccess ? 50 : 0,
      complexity: result.calls.length * 10,
      optimization: score,
    },
    grade:
      score >= 90
        ? "A"
        : score >= 80
          ? "B"
          : score >= 70
            ? "C"
            : score >= 60
              ? "D"
              : "F",
    recommendations: generateOptimizationSuggestions(result),
  };
}

export default useTransactionSimulation;
