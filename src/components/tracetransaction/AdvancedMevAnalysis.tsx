import React from "react";
import { Badge } from "@/components/global/Badge";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Eye,
  Shield,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import type { TraceAnalysisResults } from "@/lib/tracetransaction/types";
import { useMevAnalysis } from "@/hooks/tracetransaction";

interface AdvancedMevAnalysisProps {
  traceAnalysis: TraceAnalysisResults;
  className?: string;
}

export const AdvancedMevAnalysis: React.FC<AdvancedMevAnalysisProps> = ({
  traceAnalysis,
  className = "",
}) => {
  const { analysis, isAnalyzing, error, analyzeTransaction } = useMevAnalysis();

  React.useEffect(() => {
    if (traceAnalysis) {
      analyzeTransaction(traceAnalysis);
    }
  }, [traceAnalysis, analyzeTransaction]);

  if (isAnalyzing) {
    return (
      <div
        className={`bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6 ${className}`}
      >
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2 text-accent-primary">
            <Activity className="h-5 w-5 animate-spin" />
            <span>Analyzing MEV patterns...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6 ${className}`}
      >
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "critical":
        return "text-red-400 bg-red-500/10 border-red-500/30";
      case "high":
        return "text-orange-400 bg-orange-500/10 border-orange-500/30";
      case "medium":
        return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
      case "low":
        return "text-green-400 bg-green-500/10 border-green-500/30";
      default:
        return "text-gray-400 bg-gray-500/10 border-gray-500/30";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "high":
        return <AlertTriangle className="h-4 w-4 text-red-400" />;
      case "medium":
        return <Eye className="h-4 w-4 text-yellow-400" />;
      case "low":
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      default:
        return <Shield className="h-4 w-4 text-gray-400" />;
    }
  };

  const getPatternIcon = (type: string) => {
    switch (type) {
      case "sandwich_attack":
        return <Target className="text-accent-primary h-5 w-5" />;
      case "arbitrage":
        return <TrendingUp className="text-accent-primary h-5 w-5" />;
      case "front_running":
        return <Zap className="text-accent-primary h-5 w-5" />;
      case "liquidation_mev":
        return <DollarSign className="text-accent-primary h-5 w-5" />;
      default:
        return <Activity className="text-accent-primary h-5 w-5" />;
    }
  };

  return (
    <div
      className={`bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6 ${className}`}
    >
      <div className="flex items-center gap-2 mb-6 text-accent-primary">
        <h3 className="text-lg font-semibold">Advanced MEV Analysis</h3>
      </div>

      {/* MEV Detection Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-[rgba(15,20,25,0.6)] rounded-lg border border-[rgba(0,191,255,0.2)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-secondary">MEV Detected</span>
            {analysis.mevDetected ? (
              <AlertTriangle className="h-4 w-4 text-red-400" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-400" />
            )}
          </div>
          <div className="text-lg font-semibold text-accent-primary">
            {analysis.mevDetected ? "Yes" : "No"}
          </div>
        </div>

        <div className="p-4 bg-[rgba(15,20,25,0.6)] rounded-lg border border-[rgba(0,191,255,0.2)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-secondary">MEV Score</span>
            <Activity className="h-4 w-4 text-accent-primary" />
          </div>
          <div className="text-lg font-semibold text-accent-primary">
            {(analysis.mevScore * 100).toFixed(1)}%
          </div>
        </div>

        <div className="p-4 bg-[rgba(15,20,25,0.6)] rounded-lg border border-[rgba(0,191,255,0.2)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-secondary">Risk Level</span>
            {getSeverityIcon(analysis.riskLevel)}
          </div>
          <div
            className={`p-2 rounded-md text-lg font-semibold ${getRiskColor(analysis.riskLevel)}`}
          >
            {analysis.riskLevel.toUpperCase()}
          </div>
        </div>
      </div>

      {!analysis.mevDetected && (
        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg mb-6">
          <div className="flex items-center gap-2 text-green-400">
            <span className="font-medium">No MEV patterns detected</span>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            This transaction appears to be free from common MEV exploitation
            patterns.
          </p>
        </div>
      )}

      {/* MEV Patterns */}
      {analysis.patterns.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4 text-accent-primary">
            <h4 className="font-semibold">Detected MEV Patterns</h4>
          </div>

          <div className="space-y-3">
            {analysis.patterns.map((pattern: any, index: number) => (
              <div
                key={index}
                className="p-4 bg-[rgba(15,20,25,0.6)] rounded-lg border border-[rgba(0,191,255,0.2)]"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getPatternIcon(pattern.type)}
                    <div>
                      <h5 className="font-medium text-accent-primary capitalize">
                        {pattern.type.replace("_", " ")}
                      </h5>
                      <p className="text-sm text-text-secondary">
                        {pattern.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getRiskColor(pattern.severity)}>
                      {pattern.severity}
                    </Badge>
                    <span className="text-sm text-text-secondary">
                      {(pattern.confidence * 100).toFixed(0)}% confidence
                    </span>
                  </div>
                </div>

                {pattern.extractedValue > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-green-400" />
                    <span className="text-text-secondary">
                      Estimated extracted value:
                    </span>
                    <span className="text-green-400 font-medium">
                      {pattern.extractedValue.toFixed(4)} ETH
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MEV Indicators */}
      {analysis.indicators.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4 text-accent-primary">
            <h4 className="font-semibold">Detection Indicators</h4>
          </div>

          <div className="space-y-3">
            {analysis.indicators.map((indicator: any, index: number) => (
              <div
                key={index}
                className="p-3 bg-[rgba(15,20,25,0.6)] rounded-lg border border-[rgba(0,191,255,0.2)]"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getSeverityIcon(indicator.severity)}
                    <div>
                      <h6 className="font-medium text-accent-primary capitalize">
                        {indicator.type.replace("_", " ")}
                      </h6>
                      <p className="text-sm text-text-secondary">
                        {indicator.description}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm text-text-secondary">
                    {(indicator.confidence * 100).toFixed(0)}%
                  </span>
                </div>

                {indicator.evidence &&
                  Object.keys(indicator.evidence).length > 0 && (
                    <div className="mt-2 p-2 bg-[rgba(15,20,25,0.8)] rounded border border-[rgba(0,191,255,0.1)]">
                      <div className="text-xs text-text-secondary mb-1">
                        Evidence:
                      </div>
                      <div className="text-xs text-text-secondary space-y-1">
                        {Object.entries(indicator.evidence).map(
                          ([key, value]: [string, any]) => (
                            <div key={key} className="flex justify-between">
                              <span className="capitalize">
                                {key.replace("_", " ")}:
                              </span>
                              <span className="text-accent-primary">
                                {typeof value === "boolean"
                                  ? value
                                    ? "Yes"
                                    : "No"
                                  : value}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MEV Protection Recommendations */}
      {analysis.recommendations.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4 text-accent-primary">
            <h4 className="font-semibold">Protection Recommendations</h4>
          </div>

          <div className="space-y-2">
            {analysis.recommendations.map(
              (recommendation: string, index: number) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-3 bg-[rgba(15,20,25,0.6)] rounded-lg border border-[rgba(0,191,255,0.2)]"
                >
                  <span className="text-accent-primary  flex-shrink-0">•</span>
                  <p className="text-text-secondary text-sm">
                    {recommendation}
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};
