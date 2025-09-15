import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import {
  CACHE_KEYS,
  type ProcessedBlockReplayData,
  type ProcessedReplayData,
  REPLAY_CONFIG,
  ReplayService,
  type ReplayTracer,
} from "@/lib/replaytransactions";

interface UseReplayTransactionOptions {
  enabled?: boolean;
  tracers?: ReplayTracer[];
  network?: string;
  cacheTime?: number;
  staleTime?: number;
}

interface UseReplayTransactionResult {
  data: ProcessedReplayData | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  isRefetching: boolean;
}

interface UseReplayBlockOptions {
  enabled?: boolean;
  tracers?: ReplayTracer[];
  network?: string;
  cacheTime?: number;
  staleTime?: number;
}

interface UseReplayBlockResult {
  data: ProcessedBlockReplayData | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  isRefetching: boolean;
}

interface ReplayMutationOptions {
  onSuccess?: (data: ProcessedReplayData) => void;
  onError?: (error: Error) => void;
  tracers?: ReplayTracer[];
  network?: string;
}

interface ReplayBlockMutationOptions {
  onSuccess?: (data: ProcessedBlockReplayData) => void;
  onError?: (error: Error) => void;
  tracers?: ReplayTracer[];
  network?: string;
}

export const useReplayTransaction = (
  txHash: string | null,
  options: UseReplayTransactionOptions = {}
): UseReplayTransactionResult => {
  const {
    enabled = true,
    tracers = REPLAY_CONFIG.defaultTracers,
    network = "mainnet",
    cacheTime = 5 * 60 * 1000,
    staleTime = 2 * 60 * 1000,
  } = options;

  const query = useQuery({
    queryKey: [CACHE_KEYS.replayTransaction(txHash || "", network, tracers)],
    queryFn: async () => {
      if (!txHash) throw new Error("Transaction hash is required");
      return await ReplayService.analyzeTransaction(txHash, tracers, network);
    },
    enabled: enabled && !!txHash,
    gcTime: cacheTime,
    staleTime,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  };
};

export const useReplayBlock = (
  blockIdentifier: string | number | null,
  options: UseReplayBlockOptions = {}
): UseReplayBlockResult => {
  const {
    enabled = true,
    tracers = REPLAY_CONFIG.defaultTracers,
    network = "mainnet",
    cacheTime = 10 * 60 * 1000,
    staleTime = 5 * 60 * 1000,
  } = options;

  const query = useQuery({
    queryKey: [
      CACHE_KEYS.replayBlock(
        blockIdentifier?.toString() || "",
        network,
        tracers
      ),
    ],
    queryFn: async () => {
      if (!blockIdentifier) throw new Error("Block identifier is required");
      return await ReplayService.analyzeBlock(
        blockIdentifier,
        tracers,
        network
      );
    },
    enabled: enabled && blockIdentifier !== null,
    gcTime: cacheTime,
    staleTime,
    retry: 1,
    retryDelay: 5000,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  };
};

export const useReplayTransactionMutation = (
  options: ReplayMutationOptions = {}
) => {
  const {
    onSuccess,
    onError,
    tracers = REPLAY_CONFIG.defaultTracers,
    network = "mainnet",
  } = options;

  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (txHash: string) => {
      return await ReplayService.analyzeTransaction(txHash, tracers, network);
    },
    onSuccess: (data, txHash) => {
      queryClient.setQueryData(
        [CACHE_KEYS.replayTransaction(txHash, network, tracers)],
        data
      );
      onSuccess?.(data);
    },
    onError,
    retry: 2,
    retryDelay: 3000,
  });
};

export const useReplayBlockMutation = (
  options: ReplayBlockMutationOptions = {}
) => {
  const {
    onSuccess,
    onError,
    tracers = REPLAY_CONFIG.defaultTracers,
    network = "mainnet",
  } = options;

  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      blockIdentifier,
      onProgress,
      abortSignal,
    }: {
      blockIdentifier: string | number;
      onProgress?: (progress: {
        completed: number;
        total: number;
        message: string;
      }) => void;
      abortSignal?: AbortSignal;
    }) => {
      return await ReplayService.analyzeBlock(
        blockIdentifier,
        tracers,
        network,
        { onProgress, abortSignal }
      );
    },
    onSuccess: (data, { blockIdentifier }) => {
      queryClient.setQueryData(
        [CACHE_KEYS.replayBlock(blockIdentifier.toString(), network, tracers)],
        data
      );
      onSuccess?.(data);
    },
    onError,
    retry: 1,
    retryDelay: 5000,
  });
};

export const useReplayBlockWithProgress = () => {
  const [progress, setProgress] = useState<{
    completed: number;
    total: number;
    message: string;
  } | null>(null);
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);

  const blockMutation = useReplayBlockMutation({
    onSuccess: () => {
      setProgress(null);
      setAbortController(null);
    },
    onError: () => {
      setProgress(null);
      setAbortController(null);
    },
  });

  const analyzeBlock = useCallback(
    (blockIdentifier: string | number) => {
      const controller = new AbortController();
      setAbortController(controller);
      setProgress({ completed: 0, total: 100, message: "Initializing..." });

      blockMutation.mutate({
        blockIdentifier,
        onProgress: setProgress,
        abortSignal: controller.signal,
      });
    },
    [blockMutation]
  );

  const cancelAnalysis = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setProgress(null);
    }
  }, [abortController]);

  return {
    analyzeBlock,
    cancelAnalysis,
    progress,
    isAnalyzing: blockMutation.isPending,
    data: blockMutation.data,
    error: blockMutation.error,
    canCancel: !!abortController,
  };
};

export const useReplayAnalysisState = () => {
  const [selectedTracers, setSelectedTracers] = useState<ReplayTracer[]>(
    REPLAY_CONFIG.defaultTracers
  );
  const [selectedNetwork, setSelectedNetwork] = useState<string>("mainnet");
  const [analysisHistory, setAnalysisHistory] = useState<
    Array<{
      txHash?: string;
      blockId?: string | number;
      timestamp: number;
      type: "transaction" | "block";
    }>
  >([]);

  const addToHistory = useCallback(
    (item: {
      txHash?: string;
      blockId?: string | number;
      type: "transaction" | "block";
    }) => {
      setAnalysisHistory((prev) => [
        { ...item, timestamp: Date.now() },
        ...prev.slice(0, 9),
      ]);
    },
    []
  );

  const clearHistory = useCallback(() => {
    setAnalysisHistory([]);
  }, []);

  const toggleTracer = useCallback((tracer: ReplayTracer) => {
    setSelectedTracers((prev) => {
      if (prev.includes(tracer)) {
        return prev.filter((t) => t !== tracer);
      } else {
        return [...prev, tracer];
      }
    });
  }, []);

  const resetTracers = useCallback(() => {
    setSelectedTracers(REPLAY_CONFIG.defaultTracers);
  }, []);

  return {
    selectedTracers,
    setSelectedTracers,
    selectedNetwork,
    setSelectedNetwork,
    analysisHistory,
    addToHistory,
    clearHistory,
    toggleTracer,
    resetTracers,
  };
};

export const useReplayCostEstimation = () => {
  const [showCostWarning, setShowCostWarning] = useState(false);

  const estimateTransactionCost = useCallback((tracers: ReplayTracer[]) => {
    const baseCost = 1;
    const tracerMultipliers = {
      trace: 50,
      stateDiff: 75,
      vmTrace: 100,
    };

    const totalCost = tracers.reduce((sum, tracer) => {
      return sum + (tracerMultipliers[tracer] || 50);
    }, baseCost);

    return {
      costMultiplier: totalCost,
      estimatedTime: totalCost > 150 ? "60-120 seconds" : "30-60 seconds",
      isExpensive: totalCost > 100,
    };
  }, []);

  const estimateBlockCost = useCallback(
    (blockSize: number, tracers: ReplayTracer[]) => {
      const transactionCost = estimateTransactionCost(tracers);
      const blockMultiplier = Math.min(blockSize, 100);

      return {
        costMultiplier: transactionCost.costMultiplier * blockMultiplier,
        estimatedTime: `${Math.ceil(blockMultiplier / 10)}-${Math.ceil(blockMultiplier / 5)} minutes`,
        isExpensive: transactionCost.costMultiplier * blockMultiplier > 1000,
        transactionCount: blockMultiplier,
      };
    },
    [estimateTransactionCost]
  );

  const checkCostWarning = useCallback(
    (
      type: "transaction" | "block",
      tracers: ReplayTracer[],
      blockSize?: number
    ) => {
      if (type === "transaction") {
        const cost = estimateTransactionCost(tracers);
        setShowCostWarning(cost.isExpensive);
        return cost;
      } else {
        const cost = estimateBlockCost(blockSize || 1, tracers);
        setShowCostWarning(cost.isExpensive);
        return cost;
      }
    },
    [estimateTransactionCost, estimateBlockCost]
  );

  return {
    showCostWarning,
    setShowCostWarning,
    estimateTransactionCost,
    estimateBlockCost,
    checkCostWarning,
  };
};

export const useReplayCache = () => {
  const queryClient = useQueryClient();

  const clearTransactionCache = useCallback(
    (txHash: string, network: string, tracers: ReplayTracer[]) => {
      queryClient.removeQueries({
        queryKey: [CACHE_KEYS.replayTransaction(txHash, network, tracers)],
      });
    },
    [queryClient]
  );

  const clearBlockCache = useCallback(
    (blockId: string, network: string, tracers: ReplayTracer[]) => {
      queryClient.removeQueries({
        queryKey: [CACHE_KEYS.replayBlock(blockId, network, tracers)],
      });
    },
    [queryClient]
  );

  const clearAllReplayCache = useCallback(() => {
    queryClient.removeQueries({
      predicate: (query) => {
        return query.queryKey[0]?.toString().startsWith("replay_");
      },
    });
  }, [queryClient]);

  const getCacheStats = useCallback(() => {
    const cache = queryClient.getQueryCache();
    const replayQueries = cache.findAll({
      predicate: (query) => {
        return query.queryKey[0]?.toString().startsWith("replay_");
      },
    });

    return {
      totalQueries: replayQueries.length,
      activeQueries: replayQueries.filter((q) => q.state.status === "success")
        .length,
      errorQueries: replayQueries.filter((q) => q.state.status === "error")
        .length,
      loadingQueries: replayQueries.filter((q) => q.state.status === "pending")
        .length,
    };
  }, [queryClient]);

  return {
    clearTransactionCache,
    clearBlockCache,
    clearAllReplayCache,
    getCacheStats,
  };
};
