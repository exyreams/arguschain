import { QueryClient } from "@tanstack/react-query";
import { CachedTraceData, traceCacheManager } from "./traceCache";

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 60 * 1000,

        gcTime: 60 * 60 * 1000,

        retry: (failureCount, error) => {
          if (error?.message?.includes("Invalid transaction hash")) {
            return false;
          }

          return failureCount < 3;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

        refetchOnWindowFocus: false,

        refetchOnReconnect: false,

        refetchOnMount: (query) => {
          return Date.now() - (query.state.dataUpdatedAt || 0) > 30 * 60 * 1000;
        },
      },
      mutations: {
        retry: 2,
        retryDelay: 3000,
      },
    },
  });
}

export const queryKeys = {
  connection: (network: string) => ["blockchain-connection", network] as const,

  trace: (txHash: string, network: string, method: string) =>
    ["transaction-trace", txHash, network, method] as const,

  transaction: (txHash: string, network: string) =>
    ["transaction", txHash, network] as const,

  block: (blockNumber: number | string, network: string) =>
    ["block", blockNumber, network] as const,

  logs: (params: any, network: string) => ["logs", params, network] as const,
};

export function createTraceQueryFn(
  executeTrace: (txHash: string) => Promise<{ callTrace: any; structLog: any }>,
  network: string,
  traceMethod: string,
) {
  return async ({
    queryKey,
  }: {
    queryKey: readonly [string, string, string, string];
  }) => {
    const [, txHash] = queryKey;

    if (!txHash) return null;

    const cached = traceCacheManager.loadFromCache(txHash, network);
    if (cached && cached.traceMethod === traceMethod) {
      console.log(`Loading trace from cache: ${txHash}`);
      return cached;
    }

    console.log(`Fetching fresh trace data: ${txHash}`);
    const result = await executeTrace(txHash);

    const cacheData: CachedTraceData = {
      callTrace: result.callTrace,
      structLog: result.structLog,
      timestamp: Date.now(),
      network,
      traceMethod,
      txHash,
    };

    traceCacheManager.saveToCache(cacheData);

    return cacheData;
  };
}

export function prefetchTrace(
  queryClient: QueryClient,
  txHash: string,
  network: string,
  traceMethod: string,
  executeTrace: (txHash: string) => Promise<{ callTrace: any; structLog: any }>,
) {
  return queryClient.prefetchQuery({
    queryKey: queryKeys.trace(txHash, network, traceMethod),
    queryFn: createTraceQueryFn(executeTrace, network, traceMethod),
    staleTime: 30 * 60 * 1000,
  });
}

export function invalidateTrace(
  queryClient: QueryClient,
  txHash?: string,
  network?: string,
) {
  if (txHash && network) {
    queryClient.invalidateQueries({
      queryKey: ["transaction-trace", txHash, network],
    });

    traceCacheManager.removeFromCache(txHash, network);
  } else {
    queryClient.invalidateQueries({
      queryKey: ["transaction-trace"],
    });

    traceCacheManager.clearAllCache();
  }
}

export function getCachedTraceData(
  queryClient: QueryClient,
  txHash: string,
  network: string,
  traceMethod: string,
): CachedTraceData | undefined {
  return queryClient.getQueryData(
    queryKeys.trace(txHash, network, traceMethod),
  );
}
