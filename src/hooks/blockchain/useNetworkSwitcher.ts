import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { blockchainService } from "@/lib/blockchainService";

export function useNetworkSwitcher() {
  const queryClient = useQueryClient();

  const { data: currentNetwork } = useQuery({
    queryKey: ["current-network"],
    queryFn: () => blockchainService.getCurrentNetworkType(),
    refetchInterval: 1000,
    staleTime: 0,
  });

  const switchNetworkMutation = useMutation({
    mutationFn: async (network: "sepolia" | "mainnet") => {
      console.log(`Switching to ${network}...`);
      const success = await blockchainService.switchNetwork(network);
      if (!success) {
        throw new Error(`Failed to switch to ${network}`);
      }
      console.log(`Successfully switched to ${network}`);
      return network;
    },
    onSuccess: (network) => {
      console.log(
        `Network switch successful, invalidating queries for ${network}`
      );

      queryClient.invalidateQueries({ queryKey: ["current-block"] });
      queryClient.invalidateQueries({ queryKey: ["gas-price"] });
      queryClient.invalidateQueries({ queryKey: ["network-info"] });
      queryClient.invalidateQueries({ queryKey: ["connection-status"] });
      queryClient.invalidateQueries({ queryKey: ["current-network"] });
    },
    onError: (error) => {
      console.error("Network switch failed:", error);
    },
  });

  return {
    switchNetwork: switchNetworkMutation.mutate,
    isLoading: switchNetworkMutation.isPending,
    error: switchNetworkMutation.error,
    currentNetwork,
  };
}
