import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type LogsAnalysisResults,
  type LogsQueryConfig,
  LogsService,
  useLogsCache,
} from "@/lib/eventlogs";
import { blockchainService } from "@/lib/blockchainService";

export const logsQueryKeys = {
  all: ["logs"] as const,
  analyses: () => [...logsQueryKeys.all, "analyses"] as const,
  analysis: (config: LogsQueryConfig) =>
    [...logsQueryKeys.analyses(), config] as const,
  connection: (network: string) =>
    [...logsQueryKeys.all, "connection", network] as const,
  validation: (config: Partial<LogsQueryConfig>) =>
    [...logsQueryKeys.all, "validation", config] as const,
};

export function useBlockchainConnection(network: "mainnet" | "sepolia") {
  return useQuery({
    queryKey: logsQueryKeys.connection(network),
    queryFn: async () => {
      await blockchainService.connect(network);
      const provider = blockchainService.getProvider();
      if (!provider) {
        throw new Error("Failed to get provider after connection");
      }
      return provider;
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useLogsAnalysis(
  config: LogsQueryConfig,
  enabled: boolean = true
) {
  const { get: getCachedLogs, set: setCachedLogs } = useLogsCache();
  const { data: provider } = useBlockchainConnection(config.network);

  return useQuery({
    queryKey: logsQueryKeys.analysis(config),
    queryFn: async (): Promise<LogsAnalysisResults> => {
      const cachedResult = getCachedLogs(config);
      if (cachedResult) {
        console.log("Using cached logs data for query:", config);
        return cachedResult;
      }

      if (!provider) {
        throw new Error("Provider not available");
      }

      const logsService = new LogsService(provider, config.network);
      const result = await logsService.analyzeLogs(config);

      setCachedLogs(config, result);
      console.log("Cached logs analysis result for query:", config);

      return result;
    },
    enabled: enabled && !!provider,
    retry: 2,
    retryDelay: 3000,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useLogsAnalysisMutation() {
  const queryClient = useQueryClient();
  const { get: getCachedLogs, set: setCachedLogs } = useLogsCache();

  return useMutation({
    mutationFn: async (
      config: LogsQueryConfig
    ): Promise<LogsAnalysisResults> => {
      const cachedResult = getCachedLogs(config);
      if (cachedResult) {
        console.log("Using cached logs data for mutation:", config);
        return cachedResult;
      }

      await blockchainService.connect(config.network);
      const provider = blockchainService.getProvider();
      if (!provider) {
        throw new Error("Provider not available");
      }

      const logsService = new LogsService(provider, config.network);
      const result = await logsService.analyzeLogs(config);

      setCachedLogs(config, result);
      console.log("Cached logs analysis result for mutation:", config);

      return result;
    },
    onSuccess: (data, config) => {
      queryClient.setQueryData(logsQueryKeys.analysis(config), data);

      queryClient.invalidateQueries({
        queryKey: logsQueryKeys.analyses(),
      });
    },
    onError: (error, config) => {
      console.error("Logs analysis mutation failed:", error, config);

      queryClient.invalidateQueries({
        queryKey: logsQueryKeys.analysis(config),
      });
    },
    retry: 2,
    retryDelay: 3000,
  });
}

export function useQueryValidation(config: Partial<LogsQueryConfig>) {
  const { data: provider } = useBlockchainConnection(
    config.network || "mainnet"
  );

  return useQuery({
    queryKey: logsQueryKeys.validation(config),
    queryFn: async () => {
      if (!provider) {
        throw new Error("Provider not available for validation");
      }

      const fullConfig: LogsQueryConfig = {
        from_block: config.from_block || "latest",
        to_block: config.to_block || "latest",
        network: config.network || "mainnet",
        analysis_depth: config.analysis_depth || "full",
        include_timestamps: config.include_timestamps !== false,
        ...config,
      };

      const logsService = new LogsService(provider, fullConfig.network);
      return await logsService.validateQuery(fullConfig);
    },
    enabled: !!provider && !!(config.from_block && config.to_block),
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
  });
}

export function usePrefetchCommonQueries(network: "mainnet" | "sepolia") {
  const queryClient = useQueryClient();
  const { data: provider } = useBlockchainConnection(network);

  const prefetchQuery = async (config: LogsQueryConfig) => {
    await queryClient.prefetchQuery({
      queryKey: logsQueryKeys.analysis(config),
      queryFn: async () => {
        if (!provider) return null;
        const logsService = new LogsService(provider, network);
        return await logsService.analyzeLogs(config);
      },
      staleTime: 5 * 60 * 1000,
    });
  };

  const prefetchCommonQueries = async () => {
    if (!provider) return;

    const commonQueries: LogsQueryConfig[] = [
      {
        from_block: "latest",
        to_block: "latest",
        network,
        analysis_depth: "full",
        include_timestamps: true,
      },
      {
        from_block: "latest-4",
        to_block: "latest",
        network,
        analysis_depth: "full",
        include_timestamps: true,
      },
    ];

    await Promise.all(commonQueries.map(prefetchQuery));
  };

  return { prefetchCommonQueries };
}

export function useInvalidateLogsQueries() {
  const queryClient = useQueryClient();

  const invalidateAll = () => {
    queryClient.invalidateQueries({
      queryKey: logsQueryKeys.all,
    });
  };

  const invalidateAnalyses = () => {
    queryClient.invalidateQueries({
      queryKey: logsQueryKeys.analyses(),
    });
  };

  const invalidateAnalysis = (config: LogsQueryConfig) => {
    queryClient.invalidateQueries({
      queryKey: logsQueryKeys.analysis(config),
    });
  };

  const invalidateNetwork = (network: string) => {
    queryClient.invalidateQueries({
      queryKey: logsQueryKeys.connection(network),
    });
  };

  return {
    invalidateAll,
    invalidateAnalyses,
    invalidateAnalysis,
    invalidateNetwork,
  };
}

export function useCachedQueriesInfo() {
  const queryClient = useQueryClient();

  const getCachedQueries = () => {
    const queryCache = queryClient.getQueryCache();
    const queries = queryCache.findAll({
      queryKey: logsQueryKeys.all,
    });

    return queries.map((query) => ({
      queryKey: query.queryKey,
      state: query.state,
      dataUpdatedAt: query.state.dataUpdatedAt,
      isStale: query.isStale(),
      isFetching: query.state.isFetching,
    }));
  };

  const getCacheStats = () => {
    const queries = getCachedQueries();
    return {
      totalQueries: queries.length,
      staleQueries: queries.filter((q) => q.isStale).length,
      fetchingQueries: queries.filter((q) => q.isFetching).length,
      successQueries: queries.filter((q) => q.state.status === "success")
        .length,
      errorQueries: queries.filter((q) => q.state.status === "error").length,
    };
  };

  return {
    getCachedQueries,
    getCacheStats,
  };
}
