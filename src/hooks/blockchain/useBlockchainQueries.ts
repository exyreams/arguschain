import { useQuery } from "@tanstack/react-query";
import { blockchainService } from "@/lib/blockchainService";

export function useCurrentBlock() {
  return useQuery({
    queryKey: ["current-block"],
    queryFn: async () => {
      if (!blockchainService.isConnected()) {
        await blockchainService.connect();
      }
      return blockchainService.getCurrentBlock();
    },
    refetchInterval: 12000,
    refetchIntervalInBackground: true,
    retry: 2,
    staleTime: 5000,
  });
}

export function useGasPrice() {
  return useQuery({
    queryKey: ["gas-price"],
    queryFn: async () => {
      if (!blockchainService.isConnected()) {
        await blockchainService.connect();
      }
      const gasPrice = await blockchainService.getGasPrice();
      return Math.round(gasPrice * 100) / 100;
    },
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
    retry: 2,
    staleTime: 15000,
  });
}

export function useNetworkInfo() {
  return useQuery({
    queryKey: ["network-info"],
    queryFn: async () => {
      if (!blockchainService.isConnected()) {
        await blockchainService.connect();
      }
      return blockchainService.getNetworkInfo();
    },
    refetchInterval: 60000,
    retry: 3,
    staleTime: 300000,
  });
}

export function useConnectionStatus() {
  return useQuery({
    queryKey: ["connection-status"],
    queryFn: async () => {
      const isConnected = blockchainService.isConnected();
      if (!isConnected) {
        const connected = await blockchainService.connect();
        return { isConnected: connected };
      }
      const isListening = await blockchainService.isListening();
      return { isConnected: isListening };
    },
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
    retry: 1,
    staleTime: 5000,
  });
}

export function useBalance(address: string | null) {
  return useQuery({
    queryKey: ["balance", address],
    queryFn: async () => {
      if (!address) throw new Error("No address provided");
      if (!blockchainService.isConnected()) {
        await blockchainService.connect();
      }
      return blockchainService.getBalance(address);
    },
    enabled: !!address,
    refetchInterval: 30000,
    retry: 2,
    staleTime: 15000,
  });
}

export function useTransactionCount(address: string | null) {
  return useQuery({
    queryKey: ["transaction-count", address],
    queryFn: async () => {
      if (!address) throw new Error("No address provided");
      if (!blockchainService.isConnected()) {
        await blockchainService.connect();
      }
      return blockchainService.getTransactionCount(address);
    },
    enabled: !!address,
    refetchInterval: 30000,
    retry: 2,
    staleTime: 15000,
  });
}
