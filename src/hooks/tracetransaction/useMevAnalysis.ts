import { useCallback, useState } from "react";
import { AdvancedMevDetector } from "@/lib/tracetransaction/advancedMevDetector";
import type { TraceAnalysisResults } from "@/lib/tracetransaction/types";

interface AdvancedMevAnalysisState {
  analysis: any | null;
  blockAnalysis: any | null;
  isAnalyzing: boolean;
  error: string | null;
}

export function useMevAnalysis() {
  const [state, setState] = useState<AdvancedMevAnalysisState>({
    analysis: null,
    blockAnalysis: null,
    isAnalyzing: false,
    error: null,
  });

  const analyzeTransaction = useCallback(
    async (traceAnalysis: TraceAnalysisResults) => {
      setState((prev) => ({ ...prev, isAnalyzing: true, error: null }));

      try {
        const analysis = AdvancedMevDetector.analyzeTransaction(traceAnalysis);
        setState({
          analysis,
          blockAnalysis: null,
          isAnalyzing: false,
          error: null,
        });
        return analysis;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to analyze MEV patterns";
        setState({
          analysis: null,
          blockAnalysis: null,
          isAnalyzing: false,
          error: errorMessage,
        });
        throw error;
      }
    },
    []
  );

  const analyzeBlock = useCallback(
    async (transactions: TraceAnalysisResults[]) => {
      setState((prev) => ({ ...prev, isAnalyzing: true, error: null }));

      try {
        const blockAnalysis = AdvancedMevDetector.analyzeBlock(transactions);
        setState((prev) => ({
          ...prev,
          blockAnalysis,
          isAnalyzing: false,
          error: null,
        }));
        return blockAnalysis;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to analyze block MEV patterns";
        setState((prev) => ({
          ...prev,
          blockAnalysis: null,
          isAnalyzing: false,
          error: errorMessage,
        }));
        throw error;
      }
    },
    []
  );

  const clearAnalysis = useCallback(() => {
    setState({
      analysis: null,
      blockAnalysis: null,
      isAnalyzing: false,
      error: null,
    });
  }, []);

  return {
    analysis: state.analysis,
    blockAnalysis: state.blockAnalysis,
    isAnalyzing: state.isAnalyzing,
    error: state.error,
    analyzeTransaction,
    analyzeBlock,
    clearAnalysis,
  };
}
