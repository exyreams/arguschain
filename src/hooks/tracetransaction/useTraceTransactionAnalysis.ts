import { useCallback, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { traceTransactionService } from "@/lib/tracetransaction/traceTransactionService";
import type {
  AnalysisOptions,
  TraceAnalysisErrorState,
  TraceAnalysisResults,
} from "@/lib/tracetransaction/types";

interface UseTraceTransactionAnalysisOptions {
  defaultOptions?: AnalysisOptions;
  enableAutoRetry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

interface UseTraceTransactionAnalysisReturn {
  results: TraceAnalysisResults | null;
  isAnalyzing: boolean;
  error: TraceAnalysisErrorState | null;

  analyzeTransaction: (
    txHash: string,
    options?: AnalysisOptions
  ) => Promise<void>;
  clearResults: () => void;
  clearError: () => void;

  validateTxHash: (txHash: string) => { isValid: boolean; error?: string };

  getCachedResults: (
    txHash: string,
    options?: AnalysisOptions
  ) => TraceAnalysisResults | null;
  clearCache: () => void;
  cacheStats: { size: number; keys: string[] };
}

export function useTraceTransactionAnalysis(
  options: UseTraceTransactionAnalysisOptions = {}
): UseTraceTransactionAnalysisReturn {
  const {
    defaultOptions = {
      includePatternDetection: true,
      includeMevAnalysis: true,
      includeSecurityAnalysis: true,
      includeVisualization: true,
      analysisDepth: "full",
    },
    enableAutoRetry = true,
    maxRetries = 3,
    retryDelay = 2000,
  } = options;

  const [results, setResults] = useState<TraceAnalysisResults | null>(null);
  const [error, setError] = useState<TraceAnalysisErrorState | null>(null);

  const analysisMutation = useMutation({
    mutationFn: async ({
      txHash,
      analysisOptions,
    }: {
      txHash: string;
      analysisOptions: AnalysisOptions;
    }) => {
      setError(null);

      const validation =
        traceTransactionService.validateTransactionHash(txHash);
      if (!validation.isValid) {
        throw new Error(validation.error || "Invalid transaction hash");
      }

      return await traceTransactionService.analyzeTransaction(
        txHash,
        analysisOptions
      );
    },
    onSuccess: (data) => {
      setResults(data);
      setError(null);
    },
    onError: (err: Error) => {
      const errorState: TraceAnalysisErrorState = {
        type: "trace_fetch",
        message: err.message,
        recoverable: true,
        retryAction: () => {
          if (analysisMutation.variables) {
            analysisMutation.mutate(analysisMutation.variables);
          }
        },
      };

      if (err.message.includes("trace")) {
        errorState.type = "trace_fetch";
      } else if (err.message.includes("processing")) {
        errorState.type = "processing";
      } else if (err.message.includes("visualization")) {
        errorState.type = "visualization";
      } else if (err.message.includes("pattern")) {
        errorState.type = "pattern_detection";
      }

      setError(errorState);
      setResults(null);
    },
    retry: enableAutoRetry ? maxRetries : false,
    retryDelay: (attemptIndex) =>
      Math.min(retryDelay * Math.pow(2, attemptIndex), 30000),
  });

  const analyzeTransaction = useCallback(
    async (
      txHash: string,
      analysisOptions: AnalysisOptions = defaultOptions
    ) => {
      await analysisMutation.mutateAsync({ txHash, analysisOptions });
    },
    [analysisMutation, defaultOptions]
  );

  const clearResults = useCallback(() => {
    setResults(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const validateTxHash = useCallback((txHash: string) => {
    return traceTransactionService.validateTransactionHash(txHash);
  }, []);

  const getCachedResults = useCallback(
    (txHash: string, analysisOptions?: AnalysisOptions) => {
      return traceTransactionService.getCachedResults(txHash, analysisOptions);
    },
    []
  );

  const clearCache = useCallback(() => {
    traceTransactionService.clearCache();
  }, []);

  const cacheStats = traceTransactionService.getCacheStats();

  return {
    results,
    isAnalyzing: analysisMutation.isPending,
    error,

    analyzeTransaction,
    clearResults,
    clearError,

    validateTxHash,

    getCachedResults,
    clearCache,
    cacheStats,
  };
}

export function useTraceTransactionCache(
  txHash?: string,
  options?: AnalysisOptions
) {
  return useQuery({
    queryKey: ["trace-transaction-cache", txHash, options],
    queryFn: () => {
      if (!txHash) return null;
      return traceTransactionService.getCachedResults(txHash, options);
    },
    enabled: !!txHash,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useTransactionHashValidation() {
  const validateTxHash = useCallback((txHash: string) => {
    return traceTransactionService.validateTransactionHash(txHash);
  }, []);

  return { validateTxHash };
}
