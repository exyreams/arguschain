import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { TokenFlowAnalyzer } from "@/lib/blocktrace/processors/tokenFlowAnalyzer";
import type {
  ProcessedBlockTrace,
  PYUSDTransactionDetails,
  TokenFlowAnalysis,
  TokenFlowInsights,
  NetworkType,
} from "@/lib/blocktrace/types";

export interface UseTokenFlowOptions {
  network?: NetworkType;
  enableCache?: boolean;
  autoUpdate?: boolean;
}

export interface UseTokenFlowReturn {
  // Data
  tokenFlowAnalysis:
    | (TokenFlowAnalysis & { insights: TokenFlowInsights })
    | null;
  isLoading: boolean;
  error: Error | null;

  // Computed data
  hasPYUSDActivity: boolean;
  totalVolume: string;
  totalTransfers: number;
  topSenders: Array<{ address: string; volume: bigint; count: number }>;
  topReceivers: Array<{ address: string; volume: bigint; count: number }>;
  largestTransfers: Array<{
    from: string;
    to: string;
    amount: bigint;
    txHash: string;
  }>;
  networkMetrics: {
    density: number;
    clustering: number;
    centralNodes: string[];
    isolatedNodes: string[];
  };

  // Actions
  analyzeTokenFlow: (
    traces: ProcessedBlockTrace[],
    pyusdDetails?: Map<string, PYUSDTransactionDetails>
  ) => Promise<void>;
  refreshAnalysis: () => void;
  clearAnalysis: () => void;

  // Filtering
  filterByAmount: (
    minAmount: bigint,
    maxAmount?: bigint
  ) => PYUSDTransactionDetails[];
  filterByType: (
    type: PYUSDTransactionDetails["type"]
  ) => PYUSDTransactionDetails[];
  filterByAddress: (address: string) => PYUSDTransactionDetails[];

  // Export
  exportFlowDiagram: () => string;
  getFlowDiagramSVG: () => string | undefined;
}

export function useTokenFlow(
  options: UseTokenFlowOptions = {}
): UseTokenFlowReturn {
  const {
    network = "mainnet",
    enableCache = true,
    autoUpdate = true,
  } = options;

  const [traces, setTraces] = useState<ProcessedBlockTrace[]>([]);
  const [pyusdDetails, setPyusdDetails] = useState<
    Map<string, PYUSDTransactionDetails>
  >(new Map());
  const [tokenFlowAnalyzer] = useState(() => new TokenFlowAnalyzer(network));

  // Query for token flow analysis
  const {
    data: tokenFlowAnalysis,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["tokenFlow", traces.length, pyusdDetails.size, network],
    queryFn: async () => {
      if (traces.length === 0) {
        return null;
      }

      console.log(`Analyzing token flow for ${traces.length} traces...`);

      try {
        const result = await tokenFlowAnalyzer.analyzePYUSDFlow(
          traces,
          pyusdDetails
        );
        console.log(
          `Token flow analysis completed. Found ${result.pyusdTransactions.length} PYUSD transactions`
        );
        return result;
      } catch (error) {
        console.error("Token flow analysis failed:", error);
        throw error;
      }
    },
    enabled: traces.length > 0,
    staleTime: enableCache ? 5 * 60 * 1000 : 0, // 5 minutes
    retry: 3,
  });

  // Computed values
  const hasPYUSDActivity = useMemo(() => {
    return tokenFlowAnalysis
      ? tokenFlowAnalysis.pyusdTransactions.length > 0
      : false;
  }, [tokenFlowAnalysis]);

  const totalVolume = useMemo(() => {
    return tokenFlowAnalysis?.flowMetrics.totalVolumeFormatted || "0 PYUSD";
  }, [tokenFlowAnalysis]);

  const totalTransfers = useMemo(() => {
    return tokenFlowAnalysis?.flowMetrics.totalTransfers || 0;
  }, [tokenFlowAnalysis]);

  const topSenders = useMemo(() => {
    return tokenFlowAnalysis?.insights.topSenders || [];
  }, [tokenFlowAnalysis]);

  const topReceivers = useMemo(() => {
    return tokenFlowAnalysis?.insights.topReceivers || [];
  }, [tokenFlowAnalysis]);

  const largestTransfers = useMemo(() => {
    return tokenFlowAnalysis?.insights.largestTransfers || [];
  }, [tokenFlowAnalysis]);

  const networkMetrics = useMemo(() => {
    return (
      tokenFlowAnalysis?.insights.networkMetrics || {
        density: 0,
        clustering: 0,
        centralNodes: [],
        isolatedNodes: [],
      }
    );
  }, [tokenFlowAnalysis]);

  // Actions
  const analyzeTokenFlow = useCallback(
    async (
      newTraces: ProcessedBlockTrace[],
      newPyusdDetails?: Map<string, PYUSDTransactionDetails>
    ) => {
      setTraces(newTraces);
      if (newPyusdDetails) {
        setPyusdDetails(newPyusdDetails);
      }

      if (autoUpdate) {
        // The query will automatically refetch when traces change
        await refetch();
      }
    },
    [autoUpdate, refetch]
  );

  const refreshAnalysis = useCallback(() => {
    refetch();
  }, [refetch]);

  const clearAnalysis = useCallback(() => {
    setTraces([]);
    setPyusdDetails(new Map());
  }, []);

  // Filtering functions
  const filterByAmount = useCallback(
    (minAmount: bigint, maxAmount?: bigint): PYUSDTransactionDetails[] => {
      if (!tokenFlowAnalysis) return [];

      return tokenFlowAnalysis.pyusdTransactions.filter((tx) => {
        if (tx.amount < minAmount) return false;
        if (maxAmount && tx.amount > maxAmount) return false;
        return true;
      });
    },
    [tokenFlowAnalysis]
  );

  const filterByType = useCallback(
    (type: PYUSDTransactionDetails["type"]): PYUSDTransactionDetails[] => {
      if (!tokenFlowAnalysis) return [];

      return tokenFlowAnalysis.pyusdTransactions.filter(
        (tx) => tx.type === type
      );
    },
    [tokenFlowAnalysis]
  );

  const filterByAddress = useCallback(
    (address: string): PYUSDTransactionDetails[] => {
      if (!tokenFlowAnalysis) return [];

      const lowerAddress = address.toLowerCase();
      return tokenFlowAnalysis.pyusdTransactions.filter(
        (tx) =>
          tx.from?.toLowerCase() === lowerAddress ||
          tx.to?.toLowerCase() === lowerAddress ||
          tx.spender?.toLowerCase() === lowerAddress
      );
    },
    [tokenFlowAnalysis]
  );

  // Export functions
  const exportFlowDiagram = useCallback((): string => {
    if (!tokenFlowAnalysis) return "";
    return tokenFlowAnalysis.flowDiagram.graphvizDot;
  }, [tokenFlowAnalysis]);

  const getFlowDiagramSVG = useCallback((): string | undefined => {
    if (!tokenFlowAnalysis) return undefined;
    return tokenFlowAnalysis.flowDiagram.svgContent;
  }, [tokenFlowAnalysis]);

  return {
    // Data
    tokenFlowAnalysis,
    isLoading,
    error: error as Error | null,

    // Computed data
    hasPYUSDActivity,
    totalVolume,
    totalTransfers,
    topSenders,
    topReceivers,
    largestTransfers,
    networkMetrics,

    // Actions
    analyzeTokenFlow,
    refreshAnalysis,
    clearAnalysis,

    // Filtering
    filterByAmount,
    filterByType,
    filterByAddress,

    // Export
    exportFlowDiagram,
    getFlowDiagramSVG,
  };
}
