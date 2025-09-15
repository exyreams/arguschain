import { useCallback, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { blockchainService } from "@/lib/blockchainService";
import {
  simulationCache,
  SimulationService,
  SimulationUtils,
} from "@/lib/transactionsimulation";
import type {
  BatchAnalysis,
  BatchGasChartData,
  BatchOperation,
  BatchResult,
  EnhancedBatchResult,
  SimulationHookOptions,
  TransactionFlowData,
} from "@/lib/transactionsimulation/types";

interface BatchProgress {
  completed: number;
  total: number;
  currentOperation: BatchOperation;
  cumulativeGas: number;
  success: boolean;
  estimatedTimeRemaining?: number;
}

interface UseBatchSimulationReturn {
  isLoading: boolean;
  error: Error | null;
  result: EnhancedBatchResult | null;
  progress: BatchProgress | null;

  simulateBatch: (
    fromAddress: string,
    operations: BatchOperation[],
    options?: { stopOnFailure?: boolean }
  ) => Promise<EnhancedBatchResult>;
  cancelBatch: () => void;
  reset: () => void;
  retry: () => void;

  getAnalysis: () => BatchAnalysis | null;
  getChartData: () => BatchGasChartData | null;
  getFlowData: () => TransactionFlowData | null;

  validateOperations: (operations: BatchOperation[]) => {
    isValid: boolean;
    errors: string[];
  };

  optimizeOperationOrder: (operations: BatchOperation[]) => BatchOperation[];
}

export const useBatchSimulation = (
  options: SimulationHookOptions = {}
): UseBatchSimulationReturn => {
  const {
    enabled = true,
    network = "mainnet",
    cacheTime = 5 * 60 * 1000,
    staleTime = 2 * 60 * 1000,
    onSuccess,
    onError,
  } = options;

  const [lastRequest, setLastRequest] = useState<{
    fromAddress: string;
    operations: BatchOperation[];
    options?: { stopOnFailure?: boolean };
  } | null>(null);
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [shouldCancel, setShouldCancel] = useState(false);

  const { data: provider } = useQuery({
    queryKey: ["blockchain-connection", network],
    queryFn: async () => {
      await blockchainService.connect(network as "mainnet" | "sepolia");
      return blockchainService.getProvider();
    },
    enabled,
    staleTime,
    gcTime: cacheTime,
  });

  const batchMutation = useMutation({
    mutationFn: async ({
      fromAddress,
      operations,
      options: batchOptions = {},
    }: {
      fromAddress: string;
      operations: BatchOperation[];
      options?: { stopOnFailure?: boolean };
    }): Promise<EnhancedBatchResult> => {
      if (!provider) {
        throw new Error("Provider not available");
      }

      const startTime = performance.now();
      setShouldCancel(false);

      const cached = simulationCache.getCachedBatch(
        fromAddress,
        operations,
        network
      );

      if (cached) {
        const endTime = performance.now();
        const analysis = generateBatchAnalysis(cached, endTime - startTime);
        return {
          ...cached,
          analysis,
          executionTime: endTime - startTime,
          timestamp: new Date().toISOString(),
        };
      }

      const simulationService = new SimulationService(provider);

      setProgress({
        completed: 0,
        total: operations.length,
        currentOperation: operations[0],
        cumulativeGas: 0,
        success: true,
      });

      const results = [];
      let cumulativeGas = 0;
      let successfulOperations = 0;
      let batchSuccess = true;

      for (let i = 0; i < operations.length; i++) {
        if (shouldCancel) {
          throw new Error("Batch simulation cancelled by user");
        }

        const operation = operations[i];
        const operationStartTime = performance.now();

        setProgress((prev) => ({
          ...prev!,
          completed: i,
          currentOperation: operation,
          estimatedTimeRemaining: prev
            ? ((performance.now() - startTime) / (i + 1)) *
              (operations.length - i - 1)
            : undefined,
        }));

        try {
          const result = await simulationService.simulateTransaction({
            functionName: operation.functionName,
            fromAddress,
            parameters: operation.parameters,
            network,
          });

          results.push(result);

          if (result.success || result.hypotheticalSuccess) {
            cumulativeGas += result.gasUsed;
            successfulOperations++;
          } else {
            batchSuccess = false;
            if (batchOptions.stopOnFailure) {
              break;
            }
          }

          setProgress((prev) => ({
            ...prev!,
            cumulativeGas,
            success: batchSuccess,
          }));

          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          const failedResult = {
            success: false,
            hypotheticalSuccess: false,
            gasUsed: 0,
            gasCategory: "Error",
            operationCategory: "Unknown",
            error: error instanceof Error ? error.message : String(error),
            output: null,
            stateChanges: [],
            calls: [],
            timestamp: new Date().toISOString(),
            functionName: operation.functionName,
            parameters: operation.parameters,
          };

          results.push(failedResult);
          batchSuccess = false;

          if (batchOptions.stopOnFailure) {
            break;
          }
        }
      }

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      const batchResult: BatchResult = {
        operations: results,
        totalGas: cumulativeGas,
        successfulOperations,
        batchSuccess,
        successRate:
          operations.length > 0
            ? (successfulOperations / operations.length) * 100
            : 0,
      };

      const analysis = generateBatchAnalysis(batchResult, executionTime);

      const enhancedResult: EnhancedBatchResult = {
        ...batchResult,
        analysis,
        executionTime,
        timestamp: new Date().toISOString(),
      };

      simulationCache.cacheBatch(fromAddress, operations, network, batchResult);

      setProgress(null);

      return enhancedResult;
    },
    onSuccess: (result, variables) => {
      setLastRequest(variables);
      onSuccess?.(result);
    },
    onError: (error, variables) => {
      setLastRequest(variables);
      setProgress(null);
      onError?.(error);
    },
  });

  const validateOperations = useCallback((operations: BatchOperation[]) => {
    const errors: string[] = [];

    if (!operations || operations.length === 0) {
      errors.push("At least one operation is required");
    }

    operations.forEach((operation, index) => {
      if (!operation.functionName) {
        errors.push(`Operation ${index + 1}: Function name is required`);
      }

      if (!operation.parameters) {
        errors.push(`Operation ${index + 1}: Parameters are required`);
      }
    });

    if (operations.length > 50) {
      errors.push("Maximum 50 operations allowed in a batch");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, []);

  const simulateBatch = useCallback(
    async (
      fromAddress: string,
      operations: BatchOperation[],
      options: { stopOnFailure?: boolean } = {}
    ): Promise<EnhancedBatchResult> => {
      const validation = validateOperations(operations);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
      }

      if (!SimulationUtils.isValidAddress(fromAddress)) {
        throw new Error("Invalid from address format");
      }

      return await batchMutation.mutateAsync({
        fromAddress,
        operations,
        options,
      });
    },
    [batchMutation, validateOperations]
  );

  const cancelBatch = useCallback(() => {
    setShouldCancel(true);
    batchMutation.reset();
    setProgress(null);
  }, [batchMutation]);

  const reset = useCallback(() => {
    batchMutation.reset();
    setLastRequest(null);
    setProgress(null);
    setShouldCancel(false);
  }, [batchMutation]);

  const retry = useCallback(() => {
    if (lastRequest) {
      batchMutation.mutate(lastRequest);
    }
  }, [lastRequest, batchMutation]);

  const getAnalysis = useCallback(() => {
    return batchMutation.data?.analysis || null;
  }, [batchMutation.data]);

  const getChartData = useCallback((): BatchGasChartData | null => {
    const result = batchMutation.data;
    if (!result) return null;

    return result.analysis.chartData;
  }, [batchMutation.data]);

  const getFlowData = useCallback((): TransactionFlowData | null => {
    const result = batchMutation.data;
    if (!result) return null;

    return result.analysis.flowData || null;
  }, [batchMutation.data]);

  const optimizeOperationOrder = useCallback(
    (operations: BatchOperation[]): BatchOperation[] => {
      const viewFunctions = [
        "balanceOf",
        "allowance",
        "totalSupply",
        "decimals",
        "name",
        "symbol",
      ];

      const viewOps = operations.filter((op) =>
        viewFunctions.includes(op.functionName)
      );
      const stateOps = operations.filter(
        (op) => !viewFunctions.includes(op.functionName)
      );

      const operationComplexity = {
        approve: 1,
        transfer: 2,
        transferFrom: 3,
        mint: 4,
        burn: 4,
      };

      stateOps.sort((a, b) => {
        const complexityA =
          operationComplexity[
            a.functionName as keyof typeof operationComplexity
          ] || 5;
        const complexityB =
          operationComplexity[
            b.functionName as keyof typeof operationComplexity
          ] || 5;
        return complexityA - complexityB;
      });

      return [...viewOps, ...stateOps];
    },
    []
  );

  return {
    isLoading: batchMutation.isPending,
    error: batchMutation.error,
    result: batchMutation.data || null,
    progress,

    simulateBatch,
    cancelBatch,
    reset,
    retry,

    getAnalysis,
    getChartData,
    getFlowData,

    validateOperations,

    optimizeOperationOrder,
  };
};

function generateBatchAnalysis(
  batchResult: BatchResult,
  executionTime: number
): BatchAnalysis {
  const { operations, totalGas, successfulOperations, successRate } =
    batchResult;

  const failurePoints = operations
    .map((op, index) => (!op.success ? index : -1))
    .filter((index) => index !== -1);

  const gasDistribution = operations.reduce(
    (acc, op) => {
      acc[op.gasCategory] = (acc[op.gasCategory] || 0) + op.gasUsed;
      return acc;
    },
    {} as Record<string, number>
  );

  const operationTypes = operations.reduce(
    (acc, op) => {
      acc[op.functionName] = (acc[op.functionName] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const recommendations = [];
  if (successRate < 100) {
    recommendations.push(
      "Some operations failed - check parameters and balances"
    );
  }
  if (totalGas > 500000) {
    recommendations.push(
      "High total gas usage - consider splitting into smaller batches"
    );
  }
  if (failurePoints.length > 0) {
    recommendations.push(
      `Operations failed at positions: ${failurePoints.join(", ")}`
    );
  }

  const chartData: BatchGasChartData = {
    data: operations.map((op, index) => ({
      operation: `${op.functionName} ${index + 1}`,
      gasUsed: op.gasUsed,
      cumulativeGas: operations
        .slice(0, index + 1)
        .reduce((sum, o) => sum + o.gasUsed, 0),
      success: op.success,
      operationType: op.operationCategory,
      timestamp: Date.now() + index * 1000,
      efficiency: op.success ? Math.max(0, 100 - op.gasUsed / 1000) : 0,
    })),
    summary: {
      totalGas,
      averageGas: operations.length > 0 ? totalGas / operations.length : 0,
      successRate: successRate / 100,
      totalOperations: operations.length,
      failedOperations: operations.length - successfulOperations,
    },
  };

  return {
    totalOperations: operations.length,
    successfulOperations,
    failedOperations: operations.length - successfulOperations,
    successRate,
    totalGasUsed: totalGas,
    averageGasPerOperation:
      operations.length > 0 ? totalGas / operations.length : 0,
    gasEfficiency: Math.max(0, 100 - totalGas / (operations.length * 100000)),
    executionTime,
    failurePoints,
    gasDistribution,
    operationTypes,
    recommendations,
    chartData,
  };
}

export default useBatchSimulation;
