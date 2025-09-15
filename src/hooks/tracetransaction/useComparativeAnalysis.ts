import { useState, useCallback } from "react";
import { ComparativeAnalysisService } from "@/lib/tracetransaction/comparativeAnalysis";
import type {
  TraceAnalysisResults,
  ComparisonResult,
} from "@/lib/tracetransaction/types";

interface ComparativeAnalysisState {
  comparison: ComparisonResult | null;
  isComparing: boolean;
  error: string | null;
}

export function useComparativeAnalysis() {
  const [state, setState] = useState<ComparativeAnalysisState>({
    comparison: null,
    isComparing: false,
    error: null,
  });

  const compareTransactions = useCallback(
    async (
      analysis1: TraceAnalysisResults,
      analysis2: TraceAnalysisResults
    ) => {
      setState((prev) => ({ ...prev, isComparing: true, error: null }));

      try {
        const comparison = ComparativeAnalysisService.compareTransactions(
          analysis1,
          analysis2
        );
        setState({
          comparison,
          isComparing: false,
          error: null,
        });
        return comparison;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to compare transactions";
        setState({
          comparison: null,
          isComparing: false,
          error: errorMessage,
        });
        throw error;
      }
    },
    []
  );

  const clearComparison = useCallback(() => {
    setState({
      comparison: null,
      isComparing: false,
      error: null,
    });
  }, []);

  return {
    comparison: state.comparison,
    isComparing: state.isComparing,
    error: state.error,
    compareTransactions,
    clearComparison,
  };
}
