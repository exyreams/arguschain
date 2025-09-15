import { useCallback, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { blockchainService } from "@/lib/blockchainService";
import {
  simulationCache,
  SimulationService,
  SimulationUtils,
} from "@/lib/transactionsimulation";
import type {
  ComparisonAnalysis,
  ComparisonResult,
  GasComparisonChartData,
  SimulationHookOptions,
} from "@/lib/transactionsimulation/types";

interface ComparisonVariant {
  name: string;
  parameters: any[];
  description?: string;
}

interface ComparisonProgress {
  completed: number;
  total: number;
  currentVariant: ComparisonVariant;
  estimatedTimeRemaining?: number;
}

interface UseSimulationComparisonReturn {
  isLoading: boolean;
  error: Error | null;
  results: ComparisonResult[] | null;
  analysis: ComparisonAnalysis | null;
  progress: ComparisonProgress | null;

  compareVariants: (
    functionName: string,
    fromAddress: string,
    variants: ComparisonVariant[]
  ) => Promise<ComparisonAnalysis>;
  compareParameters: (
    functionName: string,
    fromAddress: string,
    parameterSets: any[][]
  ) => Promise<ComparisonAnalysis>;
  reset: () => void;
  retry: () => void;

  getBestVariant: () => ComparisonResult | null;
  getWorstVariant: () => ComparisonResult | null;
  getChartData: () => GasComparisonChartData | null;
  getRanking: () => ComparisonResult[];

  generateVariants: (
    functionName: string,
    baseParameters: any[],
    variationType: "amount" | "address" | "mixed"
  ) => ComparisonVariant[];
}

export const useSimulationComparison = (
  options: SimulationHookOptions = {}
): UseSimulationComparisonReturn => {
  const {
    enabled = true,
    network = "mainnet",
    cacheTime = 5 * 60 * 1000,
    staleTime = 2 * 60 * 1000,
    onSuccess,
    onError,
  } = options;

  const [lastRequest, setLastRequest] = useState<{
    functionName: string;
    fromAddress: string;
    variants: ComparisonVariant[];
  } | null>(null);
  const [progress, setProgress] = useState<ComparisonProgress | null>(null);

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

  const comparisonMutation = useMutation({
    mutationFn: async ({
      functionName,
      fromAddress,
      variants,
    }: {
      functionName: string;
      fromAddress: string;
      variants: ComparisonVariant[];
    }): Promise<ComparisonAnalysis> => {
      if (!provider) {
        throw new Error("Provider not available");
      }

      const startTime = performance.now();

      const parameterSets = variants.map((v) => v.parameters);
      const cached = simulationCache.getCachedComparison(
        functionName,
        fromAddress,
        parameterSets,
        network
      );

      if (cached) {
        const endTime = performance.now();
        return generateComparisonAnalysis(cached, endTime - startTime);
      }

      const simulationService = new SimulationService(provider);

      setProgress({
        completed: 0,
        total: variants.length,
        currentVariant: variants[0],
      });

      const results: ComparisonResult[] = [];

      for (let i = 0; i < variants.length; i++) {
        const variant = variants[i];
        const variantStartTime = performance.now();

        setProgress((prev) => ({
          ...prev!,
          completed: i,
          currentVariant: variant,
          estimatedTimeRemaining: prev
            ? ((performance.now() - startTime) / (i + 1)) *
              (variants.length - i - 1)
            : undefined,
        }));

        try {
          const simulation = await simulationService.simulateTransaction({
            functionName,
            fromAddress,
            parameters: variant.parameters,
            network,
          });

          results.push({
            variant: variant.name,
            parameters: variant.parameters,
            success: simulation.success,
            hypotheticalSuccess: simulation.hypotheticalSuccess,
            gasUsed: simulation.gasUsed,
            gasCategory: simulation.gasCategory,
            error: simulation.error,
          });
        } catch (error) {
          results.push({
            variant: variant.name,
            parameters: variant.parameters,
            success: false,
            hypotheticalSuccess: false,
            gasUsed: 0,
            gasCategory: "Error",
            error: error instanceof Error ? error.message : String(error),
          });
        }

        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      const successfulResults = results.filter(
        (r) => r.success || r.hypotheticalSuccess
      );
      if (successfulResults.length > 1) {
        const minGas = Math.min(...successfulResults.map((r) => r.gasUsed));
        results.forEach((result) => {
          if (
            (result.success || result.hypotheticalSuccess) &&
            result.gasUsed > 0
          ) {
            result.relativeGasCost = result.gasUsed / minGas;
          }
        });
      }

      simulationCache.cacheComparison(
        functionName,
        fromAddress,
        parameterSets,
        network,
        results
      );

      const analysis = generateComparisonAnalysis(results, executionTime);

      setProgress(null);

      return analysis;
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

  const compareVariants = useCallback(
    async (
      functionName: string,
      fromAddress: string,
      variants: ComparisonVariant[]
    ): Promise<ComparisonAnalysis> => {
      if (!SimulationUtils.isValidAddress(fromAddress)) {
        throw new Error("Invalid from address format");
      }

      if (!variants || variants.length === 0) {
        throw new Error("At least one variant is required");
      }

      if (variants.length > 20) {
        throw new Error("Maximum 20 variants allowed for comparison");
      }

      return await comparisonMutation.mutateAsync({
        functionName,
        fromAddress,
        variants,
      });
    },
    [comparisonMutation]
  );

  const compareParameters = useCallback(
    async (
      functionName: string,
      fromAddress: string,
      parameterSets: any[][]
    ): Promise<ComparisonAnalysis> => {
      const variants: ComparisonVariant[] = parameterSets.map(
        (params, index) => ({
          name: `Variant ${index + 1}`,
          parameters: params,
          description: `Parameter set ${index + 1}`,
        })
      );

      return await compareVariants(functionName, fromAddress, variants);
    },
    [compareVariants]
  );

  const reset = useCallback(() => {
    comparisonMutation.reset();
    setLastRequest(null);
    setProgress(null);
  }, [comparisonMutation]);

  const retry = useCallback(() => {
    if (lastRequest) {
      comparisonMutation.mutate(lastRequest);
    }
  }, [lastRequest, comparisonMutation]);

  const getBestVariant = useCallback((): ComparisonResult | null => {
    const analysis = comparisonMutation.data;
    return analysis?.bestVariant || null;
  }, [comparisonMutation.data]);

  const getWorstVariant = useCallback((): ComparisonResult | null => {
    const analysis = comparisonMutation.data;
    return analysis?.worstVariant || null;
  }, [comparisonMutation.data]);

  const getChartData = useCallback((): GasComparisonChartData | null => {
    const analysis = comparisonMutation.data;
    return analysis?.chartData || null;
  }, [comparisonMutation.data]);

  const getRanking = useCallback((): ComparisonResult[] => {
    const analysis = comparisonMutation.data;
    if (!analysis) return [];

    return [...analysis.variants].sort((a, b) => {
      if (a.success && !b.success) return -1;
      if (!a.success && b.success) return 1;
      if (a.success && b.success) return a.gasUsed - b.gasUsed;
      return 0;
    });
  }, [comparisonMutation.data]);

  const generateVariants = useCallback(
    (
      functionName: string,
      baseParameters: any[],
      variationType: "amount" | "address" | "mixed"
    ): ComparisonVariant[] => {
      const variants: ComparisonVariant[] = [];

      if (variationType === "amount" && functionName === "transfer") {
        const baseAmount = baseParameters[1] || 100;
        const amounts = [
          baseAmount * 0.1,
          baseAmount * 0.5,
          baseAmount,
          baseAmount * 2,
          baseAmount * 5,
        ];

        amounts.forEach((amount, index) => {
          variants.push({
            name: `${amount} PYUSD`,
            parameters: [baseParameters[0], amount],
            description: `Transfer ${amount} PYUSD`,
          });
        });
      }

      if (variationType === "address" && functionName === "transfer") {
        const testAddresses = [
          "0x5754284f345afc66a98fbB0a0Afe71e0F007B949",
          "0xf845a0A05Cbd91Ac15C3E59D126DE5dFbC2aAbb7",
          "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
        ];

        testAddresses.forEach((address, index) => {
          variants.push({
            name: `To ${SimulationUtils.shortenAddress(address)}`,
            parameters: [address, baseParameters[1] || 100],
            description: `Transfer to ${SimulationUtils.shortenAddress(address)}`,
          });
        });
      }

      if (variationType === "mixed") {
        const amountVariants = generateVariants(
          functionName,
          baseParameters,
          "amount"
        );
        const addressVariants = generateVariants(
          functionName,
          baseParameters,
          "address"
        );
        variants.push(
          ...amountVariants.slice(0, 3),
          ...addressVariants.slice(0, 2)
        );
      }

      return variants;
    },
    []
  );

  return {
    isLoading: comparisonMutation.isPending,
    error: comparisonMutation.error,
    results: comparisonMutation.data?.variants || null,
    analysis: comparisonMutation.data || null,
    progress,

    compareVariants,
    compareParameters,
    reset,
    retry,

    getBestVariant,
    getWorstVariant,
    getChartData,
    getRanking,

    generateVariants,
  };
};

function generateComparisonAnalysis(
  results: ComparisonResult[],
  executionTime: number
): ComparisonAnalysis {
  const successfulResults = results.filter(
    (r) => r.success || r.hypotheticalSuccess
  );
  const gasValues = successfulResults.map((r) => r.gasUsed);

  const gasRange = {
    min: gasValues.length > 0 ? Math.min(...gasValues) : 0,
    max: gasValues.length > 0 ? Math.max(...gasValues) : 0,
    average:
      gasValues.length > 0
        ? gasValues.reduce((sum, gas) => sum + gas, 0) / gasValues.length
        : 0,
    variance:
      gasValues.length > 0
        ? gasValues.reduce(
            (sum, gas) =>
              sum +
              Math.pow(
                gas - gasValues.reduce((s, g) => s + g, 0) / gasValues.length,
                2
              ),
            0
          ) / gasValues.length
        : 0,
  };

  const bestVariant =
    successfulResults.length > 0
      ? successfulResults.reduce((best, current) =>
          current.gasUsed < best.gasUsed ? current : best
        )
      : null;

  const worstVariant =
    successfulResults.length > 0
      ? successfulResults.reduce((worst, current) =>
          current.gasUsed > worst.gasUsed ? current : worst
        )
      : null;

  const successRate =
    results.length > 0 ? (successfulResults.length / results.length) * 100 : 0;

  const recommendations = [];
  if (successRate < 100) {
    recommendations.push(
      "Some variants failed - check parameters and balances"
    );
  }
  if (gasRange.variance > 10000) {
    recommendations.push(
      "High gas variance detected - consider optimizing parameters"
    );
  }
  if (
    bestVariant &&
    worstVariant &&
    worstVariant.gasUsed > bestVariant.gasUsed * 1.5
  ) {
    recommendations.push(
      "Significant gas differences found - use the most efficient variant"
    );
  }

  const chartData: GasComparisonChartData = {
    data: results.map((result) => ({
      name: result.variant,
      gasUsed: result.gasUsed,
      relativeCost: result.relativeGasCost || 1,
      efficiency: result.success ? Math.max(0, 100 - result.gasUsed / 1000) : 0,
      success: result.success,
      category: result.gasCategory,
    })),
    chartType: "bar",
    colors: {
      primary: "#00bfff",
      secondary: "#8b9dc3",
      success: "#10b981",
      error: "#ef4444",
      warning: "#f59e0b",
    },
  };

  return {
    variants: results,
    bestVariant,
    worstVariant,
    gasRange,
    successRate,
    recommendations,
    chartData,
  };
}

export default useSimulationComparison;
