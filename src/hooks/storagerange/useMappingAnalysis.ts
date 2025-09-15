import { useQuery } from "@tanstack/react-query";
import {
  type MappingAnalysisResult,
  storageService,
} from "@/lib/storagerange/storageService";

export interface UseMappingAnalysisOptions {
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
}

export const useMappingAnalysis = (
  contractAddress: string,
  blockHash: string,
  slot: string,
  keys: string[],
  options: UseMappingAnalysisOptions = {}
) => {
  const {
    enabled = true,
    staleTime = 5 * 60 * 1000,
    cacheTime = 30 * 60 * 1000,
  } = options;

  return useQuery({
    queryKey: [
      "mapping-analysis",
      contractAddress,
      blockHash,
      slot,
      keys.join(","),
    ],
    queryFn: async (): Promise<MappingAnalysisResult> => {
      return await storageService.analyzeMappingStorage(
        contractAddress,
        slot,
        keys,
        blockHash
      );
    },
    enabled: enabled && !!contractAddress && !!blockHash && !!slot,
    staleTime,
    gcTime: cacheTime,
    retry: 2,
  });
};
