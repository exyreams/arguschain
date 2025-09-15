import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { blockchainService } from "@/lib/blockchainService";
import { DebugBlockService } from "@/lib/debugblock";

interface DebugBlockStatus {
  isConnected: boolean;
  networkName: string;
  chainId: number;
  currentBlock: number;
  gasPrice: number;
  loading: boolean;
  error: string | null;
  cacheStats: {
    size: number;
    maxSize: number;
    hitRate: number;
    entries: string[];
  } | null;
}

export const useDebugBlockStatus = (
  options: {
    refetchInterval?: number;
    enabled?: boolean;
  } = {}
) => {
  const { refetchInterval = 30000, enabled = true } = options;

  const [status, setStatus] = useState<DebugBlockStatus>({
    isConnected: false,
    networkName: "Unknown",
    chainId: 0,
    currentBlock: 0,
    gasPrice: 0,
    loading: true,
    error: null,
    cacheStats: null,
  });

  const networkQuery = useQuery({
    queryKey: ["debugBlockNetworkStatus"],
    queryFn: async () => {
      try {
        const isConnected = blockchainService.isConnected();

        if (!isConnected) {
          await blockchainService.connect();
        }

        const [networkInfo, currentBlock, gasPrice] = await Promise.all([
          blockchainService.getNetworkInfo(),
          blockchainService.getCurrentBlock(),
          blockchainService.getGasPrice(),
        ]);

        return {
          isConnected: true,
          networkName: networkInfo.name,
          chainId: networkInfo.chainId,
          currentBlock,
          gasPrice,
          error: null,
        };
      } catch (error) {
        console.error("Failed to get network status:", error);
        return {
          isConnected: false,
          networkName: "Unknown",
          chainId: 0,
          currentBlock: 0,
          gasPrice: 0,
          error:
            error instanceof Error
              ? error.message
              : "Network connection failed",
        };
      }
    },
    enabled,
    refetchInterval,
    staleTime: 15000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  const cacheQuery = useQuery({
    queryKey: ["debugBlockCacheStats"],
    queryFn: () => DebugBlockService.getCacheStats(),
    enabled,
    refetchInterval: refetchInterval / 2,
    staleTime: 5000,
  });

  useEffect(() => {
    setStatus((prev) => ({
      ...prev,
      loading: networkQuery.isLoading,
      isConnected: networkQuery.data?.isConnected ?? false,
      networkName: networkQuery.data?.networkName ?? "Unknown",
      chainId: networkQuery.data?.chainId ?? 0,
      currentBlock: networkQuery.data?.currentBlock ?? 0,
      gasPrice: networkQuery.data?.gasPrice ?? 0,
      error: networkQuery.data?.error ?? null,
      cacheStats: cacheQuery.data ?? null,
    }));
  }, [networkQuery.data, networkQuery.isLoading, cacheQuery.data]);

  const reconnect = async () => {
    try {
      setStatus((prev) => ({ ...prev, loading: true, error: null }));
      await blockchainService.connect();
      await networkQuery.refetch();
    } catch (error) {
      setStatus((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Reconnection failed",
      }));
    }
  };

  const switchNetwork = async (network: "sepolia" | "mainnet") => {
    try {
      setStatus((prev) => ({ ...prev, loading: true, error: null }));
      await blockchainService.switchNetwork(network);
      await networkQuery.refetch();
    } catch (error) {
      setStatus((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Network switch failed",
      }));
    }
  };

  const clearCache = () => {
    DebugBlockService.clearCache();
    cacheQuery.refetch();
  };

  const refreshStatus = () => {
    networkQuery.refetch();
    cacheQuery.refetch();
  };

  return {
    ...status,
    reconnect,
    switchNetwork,
    clearCache,
    refreshStatus,
    isRefetching: networkQuery.isFetching || cacheQuery.isFetching,
  };
};

export const useDebugBlockPerformance = () => {
  const [performanceMetrics, setPerformanceMetrics] = useState<{
    averageProcessingTime: number;
    successRate: number;
    totalBlocksProcessed: number;
    recentProcessingTimes: number[];
  }>({
    averageProcessingTime: 0,
    successRate: 100,
    totalBlocksProcessed: 0,
    recentProcessingTimes: [],
  });

  const recordProcessingTime = (processingTime: number, success: boolean) => {
    setPerformanceMetrics((prev) => {
      const newProcessingTimes = [
        ...prev.recentProcessingTimes,
        processingTime,
      ].slice(-10);
      const newTotal = prev.totalBlocksProcessed + 1;
      const newAverage =
        newProcessingTimes.reduce((sum, time) => sum + time, 0) /
        newProcessingTimes.length;

      const newSuccessRate = success
        ? Math.min(100, prev.successRate + (100 - prev.successRate) * 0.1)
        : Math.max(0, prev.successRate - 10);

      return {
        averageProcessingTime: newAverage,
        successRate: newSuccessRate,
        totalBlocksProcessed: newTotal,
        recentProcessingTimes: newProcessingTimes,
      };
    });
  };

  const resetMetrics = () => {
    setPerformanceMetrics({
      averageProcessingTime: 0,
      successRate: 100,
      totalBlocksProcessed: 0,
      recentProcessingTimes: [],
    });
  };

  return {
    ...performanceMetrics,
    recordProcessingTime,
    resetMetrics,
  };
};

export const useRpcHealth = () => {
  const [health, setHealth] = useState<{
    isHealthy: boolean;
    responseTime: number;
    lastCheck: Date | null;
    errorCount: number;
  }>({
    isHealthy: true,
    responseTime: 0,
    lastCheck: null,
    errorCount: 0,
  });

  const checkHealth = async () => {
    const startTime = Date.now();

    try {
      await blockchainService.getCurrentBlock();
      const responseTime = Date.now() - startTime;

      setHealth((prev) => ({
        isHealthy: true,
        responseTime,
        lastCheck: new Date(),
        errorCount: Math.max(0, prev.errorCount - 1),
      }));
    } catch (error) {
      setHealth((prev) => ({
        isHealthy: false,
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
        errorCount: prev.errorCount + 1,
      }));
    }
  };

  useEffect(() => {
    const interval = setInterval(checkHealth, 2 * 60 * 1000);
    checkHealth();

    return () => clearInterval(interval);
  }, []);

  return {
    ...health,
    checkHealth,
  };
};

export const useDebugBlockRecommendations = (currentBlock?: number) => {
  const recommendations = useQuery({
    queryKey: ["debugBlockRecommendations", currentBlock],
    queryFn: async () => {
      if (!currentBlock) return [];

      const suggestions = [
        {
          type: "recent" as const,
          title: "Recent Block",
          description: "Analyze the most recent block",
          blockIdentifier: "latest",
          reason: "Latest block contains the most recent transactions",
        },
        {
          type: "popular" as const,
          title: "High Activity Block",
          description: "Block with many transactions",
          blockIdentifier: (currentBlock - 100).toString(),
          reason: "Blocks with more transactions provide richer analysis",
        },
        {
          type: "historical" as const,
          title: "Historical Block",
          description: "Analyze a block from 1 hour ago",
          blockIdentifier: (currentBlock - 300).toString(),
          reason: "Historical blocks are fully confirmed and stable",
        },
      ];

      return suggestions;
    },
    enabled: !!currentBlock,
    staleTime: 5 * 60 * 1000,
  });

  return recommendations;
};
