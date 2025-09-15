import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { GasAnalyzer } from "@/lib/blocktrace/processors/gasAnalyzer";
import type {
  ProcessedBlockTrace,
  TransactionCategory,
  GasAnalysisResult,
  OptimizationOpportunity,
  NetworkType,
} from "@/lib/blocktrace/types";

export interface UseGasAnalysisOptions {
  network?: NetworkType;
  enableCache?: boolean;
  autoUpdate?: boolean;
}

export interface UseGasAnalysisReturn {
  // Data
  gasAnalysis: GasAnalysisResult | null;
  isLoading: boolean;
  error: Error | null;

  // Computed data
  topGasConsumers: Array<{
    category: string;
    gasUsed: bigint;
    percentage: number;
  }>;
  optimizationOpportunities: OptimizationOpportunity[];
  efficiencyScore: number;
  insights: string[];
  recommendations: string[];

  // Actions
  analyzeGas: (
    traces: ProcessedBlockTrace[],
    categories?: Map<string, TransactionCategory>
  ) => Promise<void>;
  refreshAnalysis: () => void;
  clearAnalysis: () => void;

  // Filtering
  filterByCategory: (category: string) => GasAnalysisResult | null;
  getOptimizationsByType: (
    type: OptimizationOpportunity["type"]
  ) => OptimizationOpportunity[];
  getOptimizationsBySeverity: (
    severity: OptimizationOpportunity["severity"]
  ) => OptimizationOpportunity[];
}

export function useGasAnalysis(
  options: UseGasAnalysisOptions = {}
): UseGasAnalysisReturn {
  const {
    network = "mainnet",
    enableCache = true,
    autoUpdate = true,
  } = options;

  const [traces, setTraces] = useState<ProcessedBlockTrace[]>([]);
  const [categories, setCategories] = useState<
    Map<string, TransactionCategory>
  >(new Map());
  const [gasAnalyzer] = useState(() => new GasAnalyzer(network));

  // Query for gas analysis
  const {
    data: gasAnalysis,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["gasAnalysis", traces.length, network],
    queryFn: async (): Promise<GasAnalysisResult | null> => {
      if (traces.length === 0) {
        return null;
      }

      console.log(`Analyzing gas usage for ${traces.length} traces...`);

      try {
        const result = await gasAnalyzer.analyzeGasDistribution(
          traces,
          categories
        );
        console.log(
          `Gas analysis completed. Efficiency score: ${result.gasEfficiency.efficiencyScore}`
        );
        return result;
      } catch (error) {
        console.error("Gas analysis failed:", error);
        throw error;
      }
    },
    enabled: traces.length > 0,
    staleTime: enableCache ? 5 * 60 * 1000 : 0, // 5 minutes
    retry: 3,
  });

  // Computed values
  const topGasConsumers = useMemo(() => {
    if (!gasAnalysis) return [];

    return gasAnalysis.gasDistribution
      .sort((a, b) => Number(b.gasUsed) - Number(a.gasUsed))
      .slice(0, 5)
      .map((item) => ({
        category: item.category,
        gasUsed: item.gasUsed,
        percentage: item.percentage,
      }));
  }, [gasAnalysis]);

  const optimizationOpportunities = useMemo(() => {
    return gasAnalysis?.optimizationOpportunities || [];
  }, [gasAnalysis]);

  const efficiencyScore = useMemo(() => {
    return gasAnalysis?.gasEfficiency.efficiencyScore || 0;
  }, [gasAnalysis]);

  const insights = useMemo(() => {
    return gasAnalysis?.insights || [];
  }, [gasAnalysis]);

  const recommendations = useMemo(() => {
    return gasAnalysis?.recommendations || [];
  }, [gasAnalysis]);

  // Actions
  const analyzeGas = useCallback(
    async (
      newTraces: ProcessedBlockTrace[],
      newCategories?: Map<string, TransactionCategory>
    ) => {
      setTraces(newTraces);
      if (newCategories) {
        setCategories(newCategories);
      }

      if (autoUpdate) {
        // The query will automatically refetch when traces change
        await refetch();
      }
    },
    [autoUpdate, refetch]
  );

  const refreshAnalysis = useCallback(() => {
    refetch();
  }, [refetch]);

  const clearAnalysis = useCallback(() => {
    setTraces([]);
    setCategories(new Map());
  }, []);

  // Filtering functions
  const filterByCategory = useCallback(
    (category: string): GasAnalysisResult | null => {
      if (!gasAnalysis) return null;

      const filteredDistribution = gasAnalysis.gasDistribution.filter((item) =>
        item.category.toLowerCase().includes(category.toLowerCase())
      );

      if (filteredDistribution.length === 0) return null;

      // Create a filtered version of the analysis
      const totalFilteredGas = filteredDistribution.reduce(
        (sum, item) => sum + item.gasUsed,
        0n
      );

      return {
        ...gasAnalysis,
        totalGasUsed: totalFilteredGas,
        gasDistribution: filteredDistribution,
        averageGasPerTrace:
          filteredDistribution.length > 0
            ? Number(totalFilteredGas) /
              filteredDistribution.reduce(
                (sum, item) => sum + item.transactionCount,
                0
              )
            : 0,
      };
    },
    [gasAnalysis]
  );

  const getOptimizationsByType = useCallback(
    (type: OptimizationOpportunity["type"]): OptimizationOpportunity[] => {
      return optimizationOpportunities.filter((opp) => opp.type === type);
    },
    [optimizationOpportunities]
  );

  const getOptimizationsBySeverity = useCallback(
    (
      severity: OptimizationOpportunity["severity"]
    ): OptimizationOpportunity[] => {
      return optimizationOpportunities.filter(
        (opp) => opp.severity === severity
      );
    },
    [optimizationOpportunities]
  );

  return {
    // Data
    gasAnalysis,
    isLoading,
    error: error as Error | null,

    // Computed data
    topGasConsumers,
    optimizationOpportunities,
    efficiencyScore,
    insights,
    recommendations,

    // Actions
    analyzeGas,
    refreshAnalysis,
    clearAnalysis,

    // Filtering
    filterByCategory,
    getOptimizationsByType,
    getOptimizationsBySeverity,
  };
}
