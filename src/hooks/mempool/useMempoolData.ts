import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MempoolService } from "@/lib/mempool";
import type {
  MempoolError,
  NetworkComparison,
  NetworkConditions,
  PyusdAnalysis,
} from "@/lib/mempool/types";
import { CACHE_KEYS, DEFAULTS } from "@/lib/mempool/constants";

const mempoolService = new MempoolService();

export function useNetworkConditions(
  network: string = "mainnet",
  options: {
    enabled?: boolean;
    refetchInterval?: number;
    staleTime?: number;
  } = {}
) {
  return useQuery<NetworkConditions, MempoolError>({
    queryKey: [CACHE_KEYS.TXPOOL_STATUS, network],
    queryFn: () => mempoolService.getNetworkConditions(network),
    enabled: options.enabled ?? true,
    refetchInterval: options.refetchInterval ?? DEFAULTS.REFRESH_INTERVAL,
    staleTime: options.staleTime ?? 30000,
    gcTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error.type === "rpc_error" && !error.recoverable) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

export function useNetworkComparison(
  networks: string[] = ["mainnet", "sepolia"],
  options: {
    enabled?: boolean;
    refetchInterval?: number;
  } = {}
) {
  return useQuery<NetworkComparison, MempoolError>({
    queryKey: ["mempool:network_comparison", ...networks.sort()],
    queryFn: () => mempoolService.compareNetworks(networks),
    enabled: options.enabled ?? true,
    refetchInterval: options.refetchInterval ?? DEFAULTS.REFRESH_INTERVAL,
    staleTime: 45000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    retryDelay: 3000,
  });
}

export function usePyusdAnalysis(
  network: string = "mainnet",
  options: {
    enabled?: boolean;
    pendingOnly?: boolean;
    staleTime?: number;
  } = {}
) {
  return useQuery<PyusdAnalysis, MempoolError>({
    queryKey: [CACHE_KEYS.TXPOOL_CONTENT, network, options.pendingOnly ?? true],
    queryFn: () =>
      mempoolService.analyzePyusdTransactions(
        network,
        options.pendingOnly ?? true
      ),
    enabled: options.enabled ?? false,
    staleTime: options.staleTime ?? 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    retryDelay: 5000,
  });
}

export function useMempoolMethodAvailability() {
  return useQuery({
    queryKey: ["mempool:method_availability"],
    queryFn: () => mempoolService.checkMethodAvailability(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });
}

export function useNetworkInfo(network: string = "mainnet") {
  return useQuery({
    queryKey: ["mempool:network_info", network],
    queryFn: () => mempoolService.getNetworkInfo(network),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 3,
    retryDelay: 2000,
  });
}

export function useRefreshNetworkConditions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (network: string) => {
      return await mempoolService.getNetworkConditions(network);
    },
    onSuccess: (data, network) => {
      queryClient.setQueryData([CACHE_KEYS.TXPOOL_STATUS, network], data);

      queryClient.invalidateQueries({
        queryKey: ["mempool:network_comparison"],
      });
    },
    onError: (error) => {
      console.error("Failed to refresh network conditions:", error);
    },
  });
}

export function useTriggerPyusdAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      network,
      pendingOnly = true,
    }: {
      network: string;
      pendingOnly?: boolean;
    }) => {
      return await mempoolService.analyzePyusdTransactions(
        network,
        pendingOnly
      );
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        [CACHE_KEYS.TXPOOL_CONTENT, variables.network, variables.pendingOnly],
        data
      );
    },
    onError: (error) => {
      console.error("Failed to analyze PYUSD transactions:", error);
    },
  });
}

export function useAutoRefresh(
  enabled: boolean,
  interval: number = DEFAULTS.REFRESH_INTERVAL,
  networks: string[] = ["mainnet"]
) {
  const queryClient = useQueryClient();

  useQuery({
    queryKey: ["mempool:auto_refresh", enabled, interval, ...networks],
    queryFn: async () => {
      if (!enabled) return null;

      for (const network of networks) {
        queryClient.invalidateQueries({
          queryKey: [CACHE_KEYS.TXPOOL_STATUS, network],
        });
      }

      if (networks.length > 1) {
        queryClient.invalidateQueries({
          queryKey: ["mempool:network_comparison"],
        });
      }

      return Date.now();
    },
    enabled,
    refetchInterval: interval,
    staleTime: 0,
  });
}

export function usePrefetchMempoolData() {
  const queryClient = useQueryClient();

  const prefetchNetworkConditions = async (network: string) => {
    await queryClient.prefetchQuery({
      queryKey: [CACHE_KEYS.TXPOOL_STATUS, network],
      queryFn: () => mempoolService.getNetworkConditions(network),
      staleTime: 30000,
    });
  };

  const prefetchNetworkComparison = async (networks: string[]) => {
    await queryClient.prefetchQuery({
      queryKey: ["mempool:network_comparison", ...networks.sort()],
      queryFn: () => mempoolService.compareNetworks(networks),
      staleTime: 45000,
    });
  };

  return {
    prefetchNetworkConditions,
    prefetchNetworkComparison,
  };
}
