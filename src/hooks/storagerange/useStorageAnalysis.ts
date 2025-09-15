import { useQuery } from "@tanstack/react-query";
import {
  type StorageAnalysisResult,
  storageService,
} from "@/lib/storagerange/storageService";

export interface UseStorageAnalysisOptions {
  maxSlots?: number;
}

export const useStorageAnalysis = (
  contractAddress: string,
  blockIdentifier: string,
  options: UseStorageAnalysisOptions = {},
  enabled: boolean = true
) => {
  const { maxSlots = 50 } = options;

  return useQuery({
    queryKey: ["storage-analysis", contractAddress, blockIdentifier, maxSlots],
    queryFn: async (): Promise<StorageAnalysisResult> => {
      return await storageService.analyzeContractStorage(
        contractAddress,
        blockIdentifier,
        {
          maxSlots,
          includeMappingAnalysis: true,
          includePatternDetection: true,
          includeSecurityAnalysis: true,
        }
      );
    },
    enabled: enabled && !!contractAddress && !!blockIdentifier,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
  });
};
