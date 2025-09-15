import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback, useMemo } from "react";
import { bytecodeService } from "@/lib/bytecode/bytecodeService";
import type {
  DetectedPattern,
  PatternDetectionResult,
  SecurityPattern,
  ProxyPattern,
} from "@/lib/bytecode/types";

interface PatternHistory {
  timestamp: number;
  bytecode: string;
  patterns: DetectedPattern[];
  confidence: number;
}

interface UsePatternDetectionOptions {
  network?: string;
  enabled?: boolean;
  debounceMs?: number;
  confidenceThreshold?: number;
  includeHistory?: boolean;
}

/**
 * Hook for detecting patterns in bytecode
 */
export function usePatternDetection(
  bytecode: string,
  options: UsePatternDetectionOptions = {}
) {
  const {
    network = "mainnet",
    enabled = true,
    confidenceThreshold = 0.7,
    includeHistory = false,
  } = options;

  const [history, setHistory] = useState<PatternHistory[]>([]);

  const query = useQuery({
    queryKey: ["pattern-detection", bytecode, network, confidenceThreshold],
    queryFn: async (): Promise<PatternDetectionResult> => {
      if (!bytecode || bytecode.length < 10) {
        throw new Error("Invalid bytecode provided");
      }

      const result = await bytecodeService.detectPatterns(
        bytecode,
        network,
        confidenceThreshold
      );

      // Add to history if enabled
      if (includeHistory) {
        setHistory((prev) => [
          ...prev.slice(-9), // Keep last 9 entries
          {
            timestamp: Date.now(),
            bytecode,
            patterns: result.patterns,
            confidence: result.overallConfidence,
          },
        ]);
      }

      return result;
    },
    enabled: enabled && !!bytecode,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return {
    ...query,
    history,
    clearHistory,
  };
}

/**
 * Hook for detecting security patterns
 */
export function useSecurityPatternDetection(
  bytecode: string,
  options: UsePatternDetectionOptions = {}
) {
  const {
    network = "mainnet",
    enabled = true,
    confidenceThreshold = 0.8,
  } = options;

  return useQuery({
    queryKey: [
      "security-pattern-detection",
      bytecode,
      network,
      confidenceThreshold,
    ],
    queryFn: async (): Promise<SecurityPattern[]> => {
      if (!bytecode) {
        throw new Error("Bytecode is required for security analysis");
      }

      return bytecodeService.detectSecurityPatterns(
        bytecode,
        network,
        confidenceThreshold
      );
    },
    enabled: enabled && !!bytecode,
    staleTime: 15 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Hook for detecting proxy patterns
 */
export function useProxyPatternDetection(
  bytecode: string,
  options: UsePatternDetectionOptions = {}
) {
  const { network = "mainnet", enabled = true } = options;

  return useQuery({
    queryKey: ["proxy-pattern-detection", bytecode, network],
    queryFn: async (): Promise<ProxyPattern | null> => {
      if (!bytecode) {
        return null;
      }

      return bytecodeService.detectProxyPattern(bytecode, network);
    },
    enabled: enabled && !!bytecode,
    staleTime: 20 * 60 * 1000, // 20 minutes (proxy patterns are stable)
    retry: 1,
  });
}

/**
 * Hook for detecting function signatures
 */
export function useFunctionSignatureDetection(
  bytecode: string,
  options: UsePatternDetectionOptions = {}
) {
  const { network = "mainnet", enabled = true } = options;

  return useQuery({
    queryKey: ["function-signature-detection", bytecode, network],
    queryFn: () => bytecodeService.detectFunctionSignatures(bytecode, network),
    enabled: enabled && !!bytecode,
    staleTime: 30 * 60 * 1000, // 30 minutes
    retry: 1,
  });
}

/**
 * Hook for detecting optimization patterns
 */
export function useOptimizationPatternDetection(
  bytecode: string,
  options: UsePatternDetectionOptions = {}
) {
  const { network = "mainnet", enabled = true } = options;

  return useQuery({
    queryKey: ["optimization-pattern-detection", bytecode, network],
    queryFn: () =>
      bytecodeService.detectOptimizationPatterns(bytecode, network),
    enabled: enabled && !!bytecode,
    staleTime: 25 * 60 * 1000,
    retry: 1,
  });
}

/**
 * Hook for batch pattern detection
 */
export function useBatchPatternDetection(
  bytecodes: string[],
  options: UsePatternDetectionOptions = {}
) {
  const {
    network = "mainnet",
    enabled = true,
    confidenceThreshold = 0.7,
  } = options;

  return useQuery({
    queryKey: [
      "batch-pattern-detection",
      bytecodes,
      network,
      confidenceThreshold,
    ],
    queryFn: async () => {
      const results = await Promise.all(
        bytecodes.map((bytecode) =>
          bytecodeService.detectPatterns(bytecode, network, confidenceThreshold)
        )
      );

      return {
        results,
        summary: {
          totalBytecodes: bytecodes.length,
          totalPatterns: results.reduce((sum, r) => sum + r.patterns.length, 0),
          averageConfidence:
            results.reduce((sum, r) => sum + r.overallConfidence, 0) /
            results.length,
          commonPatterns: findCommonPatterns(results),
        },
      };
    },
    enabled: enabled && bytecodes.length > 0,
    staleTime: 15 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Mutation hook for pattern detection
 */
export function usePatternDetectionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bytecode,
      network = "mainnet",
      confidenceThreshold = 0.7,
    }: {
      bytecode: string;
      network?: string;
      confidenceThreshold?: number;
    }) => {
      return bytecodeService.detectPatterns(
        bytecode,
        network,
        confidenceThreshold
      );
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        [
          "pattern-detection",
          variables.bytecode,
          variables.network,
          variables.confidenceThreshold,
        ],
        data
      );
    },
  });
}

/**
 * Hook for pattern analytics
 */
export function usePatternAnalytics(patterns: DetectedPattern[] | undefined) {
  const analytics = useMemo(() => {
    if (!patterns || patterns.length === 0) return null;

    const patternTypes = patterns.reduce(
      (acc, pattern) => {
        acc[pattern.type] = (acc[pattern.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const confidenceDistribution = patterns.reduce(
      (acc, pattern) => {
        const range =
          pattern.confidence >= 0.8
            ? "high"
            : pattern.confidence >= 0.5
              ? "medium"
              : "low";
        acc[range] = (acc[range] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const avgConfidence =
      patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length;

    return {
      totalPatterns: patterns.length,
      patternTypes,
      confidenceDistribution,
      avgConfidence,
      highConfidencePatterns: patterns.filter((p) => p.confidence >= 0.8),
      securityPatterns: patterns.filter((p) => p.type.includes("security")),
      optimizationPatterns: patterns.filter((p) =>
        p.type.includes("optimization")
      ),
    };
  }, [patterns]);

  return analytics;
}

// Helper function to find common patterns across multiple results
function findCommonPatterns(results: PatternDetectionResult[]): Array<{
  type: string;
  count: number;
  avgConfidence: number;
}> {
  const patternCounts = new Map<
    string,
    { count: number; totalConfidence: number }
  >();

  results.forEach((result) => {
    result.patterns.forEach((pattern) => {
      const existing = patternCounts.get(pattern.type);
      if (existing) {
        existing.count += 1;
        existing.totalConfidence += pattern.confidence;
      } else {
        patternCounts.set(pattern.type, {
          count: 1,
          totalConfidence: pattern.confidence,
        });
      }
    });
  });

  return Array.from(patternCounts.entries())
    .map(([type, data]) => ({
      type,
      count: data.count,
      avgConfidence: data.totalConfidence / data.count,
    }))
    .sort((a, b) => b.count - a.count);
}
