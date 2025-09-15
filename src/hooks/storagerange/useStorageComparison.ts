import { useQuery } from "@tanstack/react-query";
import {
  type StorageComparisonResult,
  storageService,
} from "@/lib/storagerange/storageService";

export interface UseStorageComparisonOptions {
  slotCount?: number;
  startSlot?: string;
}

export const useStorageComparison = (
  contractAddress: string,
  blockIdentifier1: string,
  blockIdentifier2: string,
  options: UseStorageComparisonOptions = {},
  enabled: boolean = true
) => {
  const { slotCount = 50, startSlot = "0x0" } = options;

  return useQuery({
    queryKey: [
      "storage-comparison",
      contractAddress,
      blockIdentifier1,
      blockIdentifier2,
      slotCount,
      startSlot,
    ],
    queryFn: async (): Promise<StorageComparisonResult> => {
      return await storageService.compareStorageBetweenBlocks(
        contractAddress,
        blockIdentifier1,
        blockIdentifier2,
        { slotCount, startSlot }
      );
    },
    enabled:
      enabled && !!contractAddress && !!blockIdentifier1 && !!blockIdentifier2,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
  });
};
