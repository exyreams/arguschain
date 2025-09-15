import { useMutation, useQueryClient } from "@tanstack/react-query";
import { storageService } from "@/lib/storagerange/storageService";

export interface StorageAnalysisMutationParams {
  contractAddress: string;
  blockIdentifier: string;
  options: {
    maxSlots?: number;
    includeMappingAnalysis?: boolean;
    includePatternDetection?: boolean;
    includeSecurityAnalysis?: boolean;
  };
}

export interface MappingAnalysisMutationParams {
  contractAddress: string;
  mappingSlot: string;
  keys: string[];
  blockIdentifier: string;
}

export const useStorageAnalysisMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: StorageAnalysisMutationParams) => {
      return await storageService.analyzeContractStorage(
        params.contractAddress,
        params.blockIdentifier,
        {
          maxSlots: params.options.maxSlots || 50,
          includeMappingAnalysis: params.options.includeMappingAnalysis ?? true,
          includePatternDetection:
            params.options.includePatternDetection ?? true,
          includeSecurityAnalysis:
            params.options.includeSecurityAnalysis ?? true,
        }
      );
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        [
          "storage-analysis",
          variables.contractAddress,
          variables.blockIdentifier,
          variables.options.maxSlots,
        ],
        data
      );
    },
  });
};

export const useMappingAnalysisMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: MappingAnalysisMutationParams) => {
      return await storageService.analyzeMappingStorage(
        params.contractAddress,
        params.mappingSlot,
        params.keys,
        params.blockIdentifier
      );
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        [
          "mapping-analysis",
          variables.contractAddress,
          variables.blockIdentifier,
          variables.mappingSlot,
          variables.keys.join(","),
        ],
        data
      );
    },
  });
};
