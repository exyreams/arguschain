import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DebugBlockService } from "@/lib/debugblock";
import { DebugTraceConfig } from "@/lib/debugblock/types";

const QUERY_KEYS = {
  debugBlockTrace: (identifier: string) => ["debugBlockTrace", identifier],
  blockInfo: (identifier: string) => ["blockInfo", identifier],
  blockValidation: (identifier: string) => ["blockValidation", identifier],
  recentBlocks: (count: number) => ["recentBlocks", count],
  blockSearch: (criteria: any) => ["blockSearch", criteria],
} as const;

export const useDebugBlockTrace = (
  blockIdentifier: string,
  options: {
    enabled?: boolean;
    useCache?: boolean;
    config?: DebugTraceConfig;
    includeGasAnalysis?: boolean;
    gasPrice?: number;
  } = {}
) => {
  const {
    enabled = true,
    useCache = true,
    config,
    includeGasAnalysis = true,
    gasPrice = 20,
  } = options;

  return useQuery({
    queryKey: QUERY_KEYS.debugBlockTrace(blockIdentifier),
    queryFn: async () => {
      if (!blockIdentifier.trim()) {
        throw new Error("Block identifier is required");
      }

      const isBlockHash =
        blockIdentifier.startsWith("0x") && blockIdentifier.length === 66;

      if (isBlockHash) {
        return await DebugBlockService.traceBlockByHash(blockIdentifier, {
          useCache,
          config,
          includeGasAnalysis,
          gasPrice,
        });
      } else {
        return await DebugBlockService.traceBlockByNumber(blockIdentifier, {
          useCache,
          config,
          includeGasAnalysis,
          gasPrice,
        });
      }
    },
    enabled: enabled && !!blockIdentifier.trim(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: (failureCount, error) => {
      if (
        error instanceof Error &&
        error.message.includes("Invalid block identifier")
      ) {
        return false;
      }

      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useBlockInfo = (
  blockIdentifier: string,
  options: { enabled?: boolean } = {}
) => {
  const { enabled = true } = options;

  return useQuery({
    queryKey: QUERY_KEYS.blockInfo(blockIdentifier),
    queryFn: () => DebugBlockService.getBlockInfo(blockIdentifier),
    enabled: enabled && !!blockIdentifier.trim(),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useBlockValidation = (
  blockIdentifier: string,
  options: { enabled?: boolean } = {}
) => {
  const { enabled = true } = options;

  return useQuery({
    queryKey: QUERY_KEYS.blockValidation(blockIdentifier),
    queryFn: () => DebugBlockService.validateBlockIdentifier(blockIdentifier),
    enabled: enabled && !!blockIdentifier.trim(),
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

export const useRecentBlocks = (
  count: number = 10,
  options: { enabled?: boolean } = {}
) => {
  const { enabled = true } = options;

  return useQuery({
    queryKey: QUERY_KEYS.recentBlocks(count),
    queryFn: () => DebugBlockService.getRecentBlocks(count),
    enabled,
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
  });
};

export const useBlockSearch = (
  criteria: {
    minTransactions?: number;
    maxTransactions?: number;
    startBlock?: number;
    endBlock?: number;
    limit?: number;
  },
  options: { enabled?: boolean } = {}
) => {
  const { enabled = true } = options;

  return useQuery({
    queryKey: QUERY_KEYS.blockSearch(criteria),
    queryFn: () => DebugBlockService.searchBlocks(criteria),
    enabled: enabled && Object.keys(criteria).length > 0,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useBatchDebugBlockTrace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      blockIdentifiers: (string | number)[];
      options?: {
        useCache?: boolean;
        config?: DebugTraceConfig;
        maxConcurrent?: number;
      };
    }) => {
      const { blockIdentifiers, options } = params;
      return await DebugBlockService.batchTraceBlocks(
        blockIdentifiers,
        options
      );
    },
    onSuccess: (data) => {
      data.forEach((result) => {
        if (result.data && result.blockInfo) {
          queryClient.setQueryData(
            QUERY_KEYS.debugBlockTrace(result.blockIdentifier.toString()),
            {
              data: result.data,
              blockInfo: result.blockInfo,
              processingTime: 0,
            }
          );
        }
      });
    },
  });
};

export const useProcessingTimeEstimate = (
  blockIdentifier: string,
  options: { enabled?: boolean } = {}
) => {
  const { enabled = true } = options;

  return useQuery({
    queryKey: ["processingTimeEstimate", blockIdentifier],
    queryFn: () => DebugBlockService.estimateProcessingTime(blockIdentifier),
    enabled: enabled && !!blockIdentifier.trim(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useClearDebugBlockCache = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      DebugBlockService.clearCache();
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey[0];
          return (
            typeof queryKey === "string" &&
            (queryKey.includes("debugBlockTrace") ||
              queryKey.includes("blockInfo") ||
              queryKey.includes("blockValidation"))
          );
        },
      });
    },
  });
};

export const useDebugBlockCacheStats = () => {
  return useQuery({
    queryKey: ["debugBlockCacheStats"],
    queryFn: () => DebugBlockService.getCacheStats(),
    refetchInterval: 30 * 1000,
    staleTime: 10 * 1000,
  });
};

export const useDebugBlockTraceState = () => {
  const queryClient = useQueryClient();

  const invalidateBlockQueries = (blockIdentifier: string) => {
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.debugBlockTrace(blockIdentifier),
    });
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.blockInfo(blockIdentifier),
    });
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.blockValidation(blockIdentifier),
    });
  };

  const prefetchBlockInfo = (blockIdentifier: string) => {
    queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.blockInfo(blockIdentifier),
      queryFn: () => DebugBlockService.getBlockInfo(blockIdentifier),
      staleTime: 2 * 60 * 1000,
    });
  };

  const prefetchBlockValidation = (blockIdentifier: string) => {
    queryClient.prefetchQuery({
      queryKey: QUERY_KEYS.blockValidation(blockIdentifier),
      queryFn: () => DebugBlockService.validateBlockIdentifier(blockIdentifier),
      staleTime: 1 * 60 * 1000,
    });
  };

  return {
    invalidateBlockQueries,
    prefetchBlockInfo,
    prefetchBlockValidation,
  };
};
