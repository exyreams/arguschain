import { useCallback, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ReplayService } from "@/lib/replaytransactions";
import type {
  ProcessedBlockReplayData,
  ProcessedReplayData,
  ReplayTracer,
} from "@/lib/replaytransactions/types";

interface UseReplayBlockOptions {
  enabled?: boolean;
  onProgress?: (progress: {
    completed: number;
    total: number;
    message: string;
  }) => void;
  onError?: (error: Error) => void;
  onSuccess?: (data: ProcessedBlockReplayData) => void;
}

interface BlockProgress {
  completed: number;
  total: number;
  message: string;
  currentTransaction?: string;
  estimatedTimeRemaining?: number;
  costAccumulated?: number;
}

interface UseReplayBlockReturn {
  blockData: ProcessedBlockReplayData | undefined;
  transactionData: Map<string, ProcessedReplayData>;

  isLoading: boolean;
  isAnalyzing: boolean;
  isCancelling: boolean;

  progress: BlockProgress | null;

  analyzeBlock: (
    blockIdentifier: string | number,
    tracers?: ReplayTracer[],
    network?: string
  ) => Promise<ProcessedBlockReplayData>;
  cancelAnalysis: () => void;
  retryAnalysis: () => void;

  error: Error | null;
  hasError: boolean;

  estimatedCost: {
    gasPrice: number;
    totalCost: number;
    costPerTransaction: number;
  } | null;
}

export const useReplayBlock = (
  options: UseReplayBlockOptions = {}
): UseReplayBlockReturn => {
  const { enabled = true, onProgress, onError, onSuccess } = options;

  const queryClient = useQueryClient();
  const abortControllerRef = useRef<AbortController | null>(null);

  const [progress, setProgress] = useState<BlockProgress | null>(null);
  const [transactionData, setTransactionData] = useState<
    Map<string, ProcessedReplayData>
  >(new Map());
  const [estimatedCost, setEstimatedCost] =
    useState<UseReplayBlockReturn["estimatedCost"]>(null);
  const [lastAnalysisParams, setLastAnalysisParams] = useState<{
    blockIdentifier: string;
    tracers: ReplayTracer[];
    network: string;
  } | null>(null);

  const blockAnalysisMutation = useMutation({
    mutationFn: async ({
      blockIdentifier,
      tracers = ["trace", "stateDiff"],
      network = "mainnet",
    }: {
      blockIdentifier: string | number;
      tracers?: ReplayTracer[];
      network?: string;
    }) => {
      setLastAnalysisParams({
        blockIdentifier: blockIdentifier.toString(),
        tracers,
        network,
      });

      abortControllerRef.current = new AbortController();

      setProgress(null);
      setTransactionData(new Map());
      setEstimatedCost(null);

      const costMultiplier = tracers.includes("vmTrace")
        ? 50
        : tracers.includes("stateDiff")
          ? 20
          : tracers.includes("trace")
            ? 10
            : 1;

      const estimatedTxCount = 50;
      const gasPrice = 20;
      const totalCost = costMultiplier * estimatedTxCount * 0.001;

      setEstimatedCost({
        gasPrice,
        totalCost,
        costPerTransaction: totalCost / estimatedTxCount,
      });

      const handleProgress = (progressData: {
        completed: number;
        total: number;
        message: string;
      }) => {
        const enhancedProgress: BlockProgress = {
          ...progressData,
          estimatedTimeRemaining: calculateTimeRemaining(
            progressData.completed,
            progressData.total
          ),
          costAccumulated:
            (progressData.completed / progressData.total) * totalCost,
        };

        setProgress(enhancedProgress);
        onProgress?.(progressData);
      };

      try {
        const result = await ReplayService.analyzeBlock(
          blockIdentifier,
          tracers,
          network,
          {
            onProgress: handleProgress,
            abortSignal: abortControllerRef.current.signal,
          }
        );

        if (result.transactions && result.transactions.length > 0) {
          const txDataMap = new Map<string, ProcessedReplayData>();

          for (const tx of result.transactions) {
            if (tx.hash && tx.processedData) {
              txDataMap.set(tx.hash, tx.processedData);
            }
          }

          setTransactionData(txDataMap);
        }

        setProgress({
          completed: 100,
          total: 100,
          message: "Analysis complete",
          costAccumulated: totalCost,
        });

        onSuccess?.(result);
        return result;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          setProgress({
            completed: 0,
            total: 100,
            message: "Analysis cancelled",
          });
          throw new Error("Block analysis was cancelled");
        }

        onError?.(error as Error);
        throw error;
      }
    },
    onError: (error) => {
      console.error("Block analysis failed:", error);
      setProgress(null);
    },
    onSettled: () => {
      abortControllerRef.current = null;
    },
  });

  const cancelAnalysis = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setProgress({
        completed: 0,
        total: 100,
        message: "Cancelling analysis...",
      });
    }
  }, []);

  const retryAnalysis = useCallback(() => {
    if (lastAnalysisParams) {
      blockAnalysisMutation.mutate({
        blockIdentifier: lastAnalysisParams.blockIdentifier,
        tracers: lastAnalysisParams.tracers,
        network: lastAnalysisParams.network,
      });
    }
  }, [lastAnalysisParams, blockAnalysisMutation]);

  const analyzeBlock = useCallback(
    async (
      blockIdentifier: string | number,
      tracers: ReplayTracer[] = ["trace", "stateDiff"],
      network: string = "mainnet"
    ) => {
      return blockAnalysisMutation.mutateAsync({
        blockIdentifier,
        tracers,
        network,
      });
    },
    [blockAnalysisMutation]
  );

  const { data: cachedBlockData } = useQuery({
    queryKey: [
      "replay-block-cache",
      lastAnalysisParams?.blockIdentifier,
      lastAnalysisParams?.network,
    ],
    queryFn: () => null,
    enabled: false,
  });

  return {
    blockData: blockAnalysisMutation.data,
    transactionData,

    isLoading: blockAnalysisMutation.isPending,
    isAnalyzing: blockAnalysisMutation.isPending && progress !== null,
    isCancelling: progress?.message === "Cancelling analysis...",

    progress,

    analyzeBlock,
    cancelAnalysis,
    retryAnalysis,

    error: blockAnalysisMutation.error,
    hasError: blockAnalysisMutation.isError,

    estimatedCost,
  };
};

export const useReplayBlockBatch = () => {
  const [analyses, setAnalyses] = useState<Map<string, UseReplayBlockReturn>>(
    new Map()
  );
  const [globalProgress, setGlobalProgress] = useState<{
    completed: number;
    total: number;
    activeAnalyses: number;
  }>({ completed: 0, total: 0, activeAnalyses: 0 });

  const addBlockAnalysis = useCallback(
    (blockId: string, options?: UseReplayBlockOptions) => {
      const blockHook = useReplayBlock({
        ...options,
        onProgress: (progress) => {
          setGlobalProgress((prev) => ({
            ...prev,
            completed:
              prev.completed +
              (progress.completed -
                (analyses.get(blockId)?.progress?.completed || 0)),
          }));
          options?.onProgress?.(progress);
        },
      });

      setAnalyses((prev) => new Map(prev.set(blockId, blockHook)));
      setGlobalProgress((prev) => ({
        ...prev,
        total: prev.total + 100,
        activeAnalyses: prev.activeAnalyses + 1,
      }));

      return blockHook;
    },
    [analyses]
  );

  const removeBlockAnalysis = useCallback(
    (blockId: string) => {
      const analysis = analyses.get(blockId);
      if (analysis) {
        analysis.cancelAnalysis();
        setAnalyses((prev) => {
          const newMap = new Map(prev);
          newMap.delete(blockId);
          return newMap;
        });
        setGlobalProgress((prev) => ({
          completed: prev.completed - (analysis.progress?.completed || 0),
          total: prev.total - 100,
          activeAnalyses: prev.activeAnalyses - 1,
        }));
      }
    },
    [analyses]
  );

  const cancelAllAnalyses = useCallback(() => {
    analyses.forEach((analysis) => analysis.cancelAnalysis());
    setAnalyses(new Map());
    setGlobalProgress({ completed: 0, total: 0, activeAnalyses: 0 });
  }, [analyses]);

  return {
    analyses: Array.from(analyses.entries()),
    globalProgress,
    addBlockAnalysis,
    removeBlockAnalysis,
    cancelAllAnalyses,
    hasActiveAnalyses: globalProgress.activeAnalyses > 0,
  };
};

export const useReplayBlockComparison = () => {
  const [comparisonBlocks, setComparisonBlocks] = useState<string[]>([]);
  const [comparisonData, setComparisonData] = useState<
    Map<string, ProcessedBlockReplayData>
  >(new Map());

  const addBlockToComparison = useCallback(
    (blockId: string, data: ProcessedBlockReplayData) => {
      setComparisonBlocks((prev) => [...prev, blockId]);
      setComparisonData((prev) => new Map(prev.set(blockId, data)));
    },
    []
  );

  const removeBlockFromComparison = useCallback((blockId: string) => {
    setComparisonBlocks((prev) => prev.filter((id) => id !== blockId));
    setComparisonData((prev) => {
      const newMap = new Map(prev);
      newMap.delete(blockId);
      return newMap;
    });
  }, []);

  const clearComparison = useCallback(() => {
    setComparisonBlocks([]);
    setComparisonData(new Map());
  }, []);

  const comparisonMetrics = useCallback(() => {
    if (comparisonData.size < 2) return null;

    const blocks = Array.from(comparisonData.values());
    const metrics = {
      averageTransactionCount:
        blocks.reduce((sum, block) => sum + (block.transactionCount || 0), 0) /
        blocks.length,
      averageGasUsed:
        blocks.reduce(
          (sum, block) => sum + (block.aggregateMetrics?.totalGasUsed || 0),
          0
        ) / blocks.length,
      averageSuccessRate:
        blocks.reduce(
          (sum, block) => sum + (block.aggregateMetrics?.successRate || 0),
          0
        ) / blocks.length,
      pyusdActivityComparison: blocks.map((block) => ({
        blockId: block.blockIdentifier,
        pyusdTransactions:
          block.aggregateMetrics?.tokenActivity?.transferCount || 0,
        pyusdVolume: block.aggregateMetrics?.tokenActivity?.totalVolume || 0,
      })),
      securityComparison: blocks.map((block) => ({
        blockId: block.blockIdentifier,
        securityFlags: block.aggregateMetrics?.securityFlags?.length || 0,
      })),
    };

    return metrics;
  }, [comparisonData]);

  return {
    comparisonBlocks,
    comparisonData: Array.from(comparisonData.entries()),
    comparisonMetrics: comparisonMetrics(),
    addBlockToComparison,
    removeBlockFromComparison,
    clearComparison,
    canCompare: comparisonData.size >= 2,
  };
};

function calculateTimeRemaining(completed: number, total: number): number {
  if (completed === 0) return 0;

  const progressRate = completed / total;
  const timeElapsed = Date.now() - (Date.now() - completed * 1000);
  const totalEstimatedTime = timeElapsed / progressRate;
  const timeRemaining = totalEstimatedTime - timeElapsed;

  return Math.max(0, timeRemaining / 1000);
}
