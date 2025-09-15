import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BlockTraceOrchestrator,
  type AnalysisProgress,
} from "@/lib/blocktrace/services/blockTraceOrchestrator";
import { validateBlockIdentifier } from "@/lib/blocktrace/utils";
import type {
  BlockAnalysis,
  NetworkType,
  ValidationResult,
} from "@/lib/blocktrace/types";

export interface UseBlockTraceOptions {
  network?: NetworkType;
  enableCache?: boolean;
  autoRetry?: boolean;
  onProgress?: (progress: AnalysisProgress) => void;
  onError?: (error: Error) => void;
  onSuccess?: (data: BlockAnalysis) => void;
}

export interface UseBlockTraceReturn {
  // Data
  data: BlockAnalysis | null;
  error: Error | null;
  isLoading: boolean;
  isValidating: boolean;
  progress: AnalysisProgress | null;

  // Actions
  analyzeBlock: (
    blockIdentifier: string | number
  ) => Promise<BlockAnalysis | null>;
  clearData: () => void;
  retry: () => void;
  cancel: () => void;

  // Validation
  validateBlockId: (blockId: string | number) => ValidationResult;

  // Cache management
  clearCache: () => Promise<void>;
  getCacheStats: () => any;
}

export function useBlockTrace(
  options: UseBlockTraceOptions = {}
): UseBlockTraceReturn {
  const {
    network = "mainnet",
    enableCache = true,
    autoRetry = true,
    onProgress,
    onError,
    onSuccess,
  } = options;

  const queryClient = useQueryClient();
  const orchestratorRef = useRef<BlockTraceOrchestrator | null>(null);
  const [currentBlockId, setCurrentBlockId] = useState<string | number | null>(
    null
  );
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Initialize orchestrator
  useEffect(() => {
    if (!orchestratorRef.current) {
      orchestratorRef.current = new BlockTraceOrchestrator(network);
      orchestratorRef.current.initialize();
    }

    return () => {
      if (orchestratorRef.current) {
        orchestratorRef.current.destroy();
        orchestratorRef.current = null;
      }
    };
  }, [network]);

  // Query for block trace data
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ["blockTrace", currentBlockId, network],
    queryFn: async () => {
      if (!currentBlockId || !orchestratorRef.current) {
        return null;
      }

      setProgress(null);

      const result = await orchestratorRef.current.analyzeBlock(
        currentBlockId,
        (progressData) => {
          setProgress(progressData);
          onProgress?.(progressData);
        }
      );

      return result;
    },
    enabled: !!currentBlockId && !!orchestratorRef.current,
    staleTime: enableCache ? 5 * 60 * 1000 : 0, // 5 minutes
    retry: autoRetry ? 3 : false,
    onSuccess: (data) => {
      if (data) {
        onSuccess?.(data);
      }
    },
    onError: (error) => {
      onError?.(error as Error);
      setProgress(null);
    },
  });

  // Mutation for analyzing blocks
  const analyzeBlockMutation = useMutation({
    mutationFn: async (blockIdentifier: string | number) => {
      if (!orchestratorRef.current) {
        throw new Error("Block trace orchestrator not initialized");
      }

      // Validate block identifier
      const validation = validateBlockIdentifier(blockIdentifier);
      if (!validation.isValid) {
        const errorMessages = validation.errors
          .map((e) => e.message)
          .join(", ");
        throw new Error(`Invalid block identifier: ${errorMessages}`);
      }

      setIsValidating(true);
      setProgress(null);

      try {
        const result = await orchestratorRef.current.analyzeBlock(
          blockIdentifier,
          (progressData) => {
            setProgress(progressData);
            onProgress?.(progressData);
          }
        );

        return result;
      } finally {
        setIsValidating(false);
      }
    },
    onSuccess: (data) => {
      if (data) {
        // Update query cache
        queryClient.setQueryData(["blockTrace", currentBlockId, network], data);
        onSuccess?.(data);
      }
    },
    onError: (error) => {
      onError?.(error as Error);
      setProgress(null);
      setIsValidating(false);
    },
  });

  // Actions
  const analyzeBlock = useCallback(
    async (blockIdentifier: string | number): Promise<BlockAnalysis | null> => {
      setCurrentBlockId(blockIdentifier);

      try {
        const result = await analyzeBlockMutation.mutateAsync(blockIdentifier);
        return result;
      } catch (error) {
        console.error("Block analysis failed:", error);
        return null;
      }
    },
    [analyzeBlockMutation]
  );

  const clearData = useCallback(() => {
    setCurrentBlockId(null);
    setProgress(null);
    queryClient.removeQueries({ queryKey: ["blockTrace"] });
  }, [queryClient]);

  const retry = useCallback(() => {
    if (currentBlockId) {
      refetch();
    }
  }, [currentBlockId, refetch]);

  const cancel = useCallback(() => {
    analyzeBlockMutation.reset();
    setProgress(null);
    setIsValidating(false);
  }, [analyzeBlockMutation]);

  const validateBlockId = useCallback(
    (blockId: string | number): ValidationResult => {
      return validateBlockIdentifier(blockId);
    },
    []
  );

  const clearCache = useCallback(async () => {
    if (orchestratorRef.current) {
      await orchestratorRef.current.clearCache();
    }
    queryClient.removeQueries({ queryKey: ["blockTrace"] });
  }, [queryClient]);

  const getCacheStats = useCallback(() => {
    if (orchestratorRef.current) {
      return orchestratorRef.current.getPerformanceStats();
    }
    return null;
  }, []);

  return {
    // Data
    data: data || null,
    error: error as Error | null,
    isLoading: isLoading || analyzeBlockMutation.isPending,
    isValidating,
    progress,

    // Actions
    analyzeBlock,
    clearData,
    retry,
    cancel,

    // Validation
    validateBlockId,

    // Cache management
    clearCache,
    getCacheStats,
  };
}
