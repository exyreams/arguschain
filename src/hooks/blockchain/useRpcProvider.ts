import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { blockchainService } from "@/lib/blockchainService";
import {
  detectRpcProvider,
  getAlternativeProviders,
  getRecommendedPages,
} from "@/lib/mempool/rpcProviders";

export function useRpcProvider() {
  const [currentRpcUrl, setCurrentRpcUrl] = useState<string>("");

  useEffect(() => {
    const provider = blockchainService.getProvider();
    if (provider && provider.connection && provider.connection.url) {
      setCurrentRpcUrl(provider.connection.url);
    }
  }, []);

  const providerInfo = useQuery({
    queryKey: ["rpc-provider", currentRpcUrl],
    queryFn: () => {
      if (!currentRpcUrl) return null;

      const provider = detectRpcProvider(currentRpcUrl);
      if (!provider) return null;

      const recommendations = getRecommendedPages(provider);
      const alternatives = getAlternativeProviders([
        "txpool_content",
        "txpool_inspect",
      ]);

      return {
        provider,
        recommendations,
        alternatives,
        rpcUrl: currentRpcUrl,
      };
    },
    enabled: !!currentRpcUrl,
    staleTime: 10 * 60 * 1000,
  });

  return {
    rpcUrl: currentRpcUrl,
    provider: providerInfo.data?.provider || null,
    recommendations: providerInfo.data?.recommendations || null,
    alternatives: providerInfo.data?.alternatives || [],
    isLoading: providerInfo.isLoading,
    error: providerInfo.error,
  };
}

export function useRpcCapabilities() {
  const { provider } = useRpcProvider();

  return {
    supportsTxPoolStatus: provider?.capabilities.txpool_status ?? false,
    supportsTxPoolContent: provider?.capabilities.txpool_content ?? false,
    supportsTxPoolInspect: provider?.capabilities.txpool_inspect ?? false,
    supportsDebugTrace: provider?.capabilities.debug_traceTransaction ?? false,
    provider,
  };
}
