import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DebugBlockService } from "@/lib/debugblock";
import { ProcessedDebugBlockData, BlockInfo } from "@/lib/debugblock/types";
import { blockchainService } from "@/lib/blockchainService";

interface BlockTraceResult {
  data: ProcessedDebugBlockData;
  blockInfo: BlockInfo;
}

interface UseBlockTraceDataOptions {
  blockIdentifier?: string;
  network: "mainnet" | "sepolia";
  analysisType: "full" | "summary" | "custom";
  enabled?: boolean;
}

export function useBlockTraceData({
  blockIdentifier,
  network,
  analysisType,
  enabled = true,
}: UseBlockTraceDataOptions) {
  const queryClient = useQueryClient();

  // Query for blockchain connection
  const {
    data: provider,
    isLoading: isConnecting,
    error: connectionError,
  } = useQuery({
    queryKey: ["blockchain-connection", network],
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
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Query for block trace data
  const {
    data: traceData,
    isLoading: isTracing,
    error: traceError,
    refetch: refetchTrace,
    isFetching,
  } = useQuery({
    queryKey: ["debug-block-trace", blockIdentifier, network, analysisType],
    queryFn: async (): Promise<BlockTraceResult> => {
      if (!blockIdentifier) {
        throw new Error("Block identifier is required");
      }

      // Validate block identifier format
      const validationError = validateBlockIdentifier(blockIdentifier);
      if (validationError) {
        throw new Error(validationError);
      }

      // Ensure we're connected to the blockchain
      if (!blockchainService.isConnected()) {
        await blockchainService.connect(network);
      }

      // Determine if it's a block hash or block number
      const isBlockHash =
        blockIdentifier.startsWith("0x") && blockIdentifier.length === 66;

      let result: BlockTraceResult;
      if (isBlockHash) {
        result = await DebugBlockService.traceBlockByHash(blockIdentifier, {
          useCache: true,
          includeGasAnalysis: analysisType === "full",
        });
      } else {
        result = await DebugBlockService.traceBlockByNumber(blockIdentifier, {
          useCache: true,
          includeGasAnalysis: analysisType === "full",
        });
      }

      return result;
    },
    enabled: enabled && !!blockIdentifier && !!provider && !isConnecting,
    retry: 2,
    retryDelay: 3000,
    staleTime: 2 * 60 * 1000, // 2 minutes for block data
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutation for manual trace execution
  const traceBlockMutation = useMutation({
    mutationFn: async (blockId: string): Promise<BlockTraceResult> => {
      const validationError = validateBlockIdentifier(blockId);
      if (validationError) {
        throw new Error(validationError);
      }

      // Ensure we're connected
      if (!blockchainService.isConnected()) {
        await blockchainService.connect(network);
      }

      const isBlockHash = blockId.startsWith("0x") && blockId.length === 66;

      if (isBlockHash) {
        return await DebugBlockService.traceBlockByHash(blockId, {
          useCache: true,
          includeGasAnalysis: analysisType === "full",
        });
      } else {
        return await DebugBlockService.traceBlockByNumber(blockId, {
          useCache: true,
          includeGasAnalysis: analysisType === "full",
        });
      }
    },
    onSuccess: (data, blockId) => {
      // Update the query cache with the new data
      queryClient.setQueryData(
        ["debug-block-trace", blockId, network, analysisType],
        data
      );
    },
    retry: 2,
    retryDelay: 3000,
  });

  // Prefetch related data
  const prefetchBlockTrace = (blockId: string) => {
    queryClient.prefetchQuery({
      queryKey: ["debug-block-trace", blockId, network, analysisType],
      queryFn: async () => {
        const validationError = validateBlockIdentifier(blockId);
        if (validationError) {
          throw new Error(validationError);
        }

        if (!blockchainService.isConnected()) {
          await blockchainService.connect(network);
        }

        const isBlockHash = blockId.startsWith("0x") && blockId.length === 66;

        if (isBlockHash) {
          return await DebugBlockService.traceBlockByHash(blockId, {
            useCache: true,
            includeGasAnalysis: analysisType === "full",
          });
        } else {
          return await DebugBlockService.traceBlockByNumber(blockId, {
            useCache: true,
            includeGasAnalysis: analysisType === "full",
          });
        }
      },
      staleTime: 2 * 60 * 1000,
    });
  };

  return {
    // Data
    data: traceData?.data || null,
    blockInfo: traceData?.blockInfo || null,
    provider,

    // Loading states
    isLoading: isTracing || isConnecting,
    isTracing,
    isConnecting,
    isFetching,

    // Errors
    error: traceError || connectionError,
    traceError,
    connectionError,

    // Actions
    refetch: refetchTrace,
    traceBlock: traceBlockMutation.mutate,
    traceBlockAsync: traceBlockMutation.mutateAsync,
    prefetchBlockTrace,

    // Mutation state
    isTraceLoading: traceBlockMutation.isPending,
    traceErrorMutation: traceBlockMutation.error,
  };
}

// Validation helper function
function validateBlockIdentifier(identifier: string): string | null {
  if (!identifier || identifier.trim() === "") {
    return "Please enter a block number, block hash, or block tag";
  }

  const trimmed = identifier.trim();

  // Block tags
  if (["latest", "pending", "earliest"].includes(trimmed.toLowerCase())) {
    return null;
  }

  // Contract addresses (not supported)
  if (trimmed.startsWith("0x") && trimmed.length === 42) {
    return "Contract addresses are not supported. Please provide a block number or block hash instead.";
  }

  // Block hashes
  if (trimmed.startsWith("0x") && trimmed.length === 66) {
    if (!/^0x[a-fA-F0-9]{64}$/.test(trimmed)) {
      return "Invalid hash format";
    }
    return null;
  }

  // Hex numbers
  if (trimmed.startsWith("0x")) {
    if (!/^0x[a-fA-F0-9]+$/.test(trimmed)) {
      return "Invalid hex format";
    }
    if (trimmed.length > 20) {
      return "This hex value appears too large to be a block number. Please verify it's a valid block identifier.";
    }
    return null;
  }

  // Decimal numbers
  if (!/^\d+$/.test(trimmed)) {
    return "Please enter a valid block number (digits only), block hash (0x...), or block tag (latest, earliest)";
  }

  const blockNum = parseInt(trimmed, 10);
  if (blockNum < 0) {
    return "Block number cannot be negative";
  }

  if (blockNum > 50000000) {
    return "Block number appears too large. Please verify this block exists.";
  }

  return null;
}

// Hook for getting cached block trace data
export function useCachedBlockTraceData(
  blockIdentifier: string,
  network: "mainnet" | "sepolia",
  analysisType: "full" | "summary" | "custom"
) {
  const queryClient = useQueryClient();

  return queryClient.getQueryData<BlockTraceResult>([
    "debug-block-trace",
    blockIdentifier,
    network,
    analysisType,
  ]);
}

// Hook for invalidating block trace cache
export function useInvalidateBlockTraceCache() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => {
      queryClient.invalidateQueries({
        queryKey: ["debug-block-trace"],
      });
    },
    invalidateBlock: (
      blockIdentifier: string,
      network?: "mainnet" | "sepolia",
      analysisType?: "full" | "summary" | "custom"
    ) => {
      const queryKey = ["debug-block-trace", blockIdentifier];
      if (network) queryKey.push(network);
      if (analysisType) queryKey.push(analysisType);

      queryClient.invalidateQueries({
        queryKey,
      });
    },
    removeBlock: (
      blockIdentifier: string,
      network: "mainnet" | "sepolia",
      analysisType: "full" | "summary" | "custom"
    ) => {
      queryClient.removeQueries({
        queryKey: ["debug-block-trace", blockIdentifier, network, analysisType],
      });
    },
  };
}
