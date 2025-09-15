import React, { useMemo } from "react";
import { Badge, Button } from "@/components/global";

import type { ParsedTransferLog, LogsAnalysisResults } from "@/lib/eventlogs";
import {
  BlockchainAnalyticsEngine,
  type AnalyticsReport,
  type AnalyticsInsight,
} from "@/lib/eventlogs/analyticsEngine";
import {
  AlertTriangle,
  Shield,
  TrendingUp,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  Zap,
} from "lucide-react";

interface AdvancedAnalyticsProps {
  transfers: ParsedTransferLog[];
  results: LogsAnalysisResults;
  className?: string;
}

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case "critical":
      return <XCircle className="h-5 w-5 text-red-500" />;
    case "high":
      return <AlertTriangle className="h-5 w-5 text-orange-500" />;
    case "medium":
      return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    case "low":
      return <Info className="h-5 w-5 text-blue-500" />;
    default:
      return <Info className="h-5 w-5 text-gray-500" />;
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "critical":
      return "border-red-500/50 bg-red-500/10";
    case "high":
      return "border-orange-500/50 bg-orange-500/10";
    case "medium":
      return "border-yellow-500/50 bg-yellow-500/10";
    case "low":
      return "border-blue-500/50 bg-blue-500/10";
    default:
      return "border-gray-500/50 bg-gray-500/10";
  }
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case "pattern":
      return <Eye className="h-4 w-4" />;
    case "anomaly":
      return <Zap className="h-4 w-4" />;
    case "risk":
      return <Shield className="h-4 w-4" />;
    case "opportunity":
      return <TrendingUp className="h-4 w-4" />;
    case "warning":
      return <AlertTriangle className="h-4 w-4" />;
    default:
      return <Info className="h-4 w-4" />;
  }
};

export function AdvancedAnalytics({
  transfers,
  results,
  className = "",
}: AdvancedAnalyticsProps) {
  const analyticsReport = useMemo(() => {
    if (!transfers || transfers.length === 0 || !results) {
      return null;
    }

    const engine = new BlockchainAnalyticsEngine(transfers, results);
    return engine.generateReport();
  }, [transfers, results]);

  if (!analyticsReport) {
    return (
      <div
        className={`bg-[rgba(25,28,40,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6 ${className}`}
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
            <Shield className="h-8 w-8 text-[#00bfff]" />
          </div>
          <h3 className="text-lg font-semibold text-[#00bfff] mb-2">
            Advanced Analytics
          </h3>
          <p className="text-[#8b9dc3] text-sm">
            Run an analysis to see advanced insights and risk assessment
          </p>
        </div>
      </div>
    );
  }

  const { summary, insights, patterns, recommendations } = analyticsReport;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Executive Summary */}
      <div className="bg-[rgba(25,28,40,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="text-xl font-semibold text-[#00bfff]">
                Advanced Analytics Report
              </h3>
              <p className="text-sm text-[#8b9dc3] mt-1">
                AI-powered insights and risk assessment
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-[#8b9dc3]">
              Data Sources: Event Logs + Transfer Analysis
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)] rounded-lg">
            <div className="text-2xl font-bold text-[#00bfff] mb-1">
              {summary.totalInsights}
            </div>
            <div className="text-sm text-[#8b9dc3]">Total Insights</div>
          </div>

          <div className="text-center p-4 bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)] rounded-lg">
            <div className="text-2xl font-bold text-red-400 mb-1">
              {summary.criticalIssues}
            </div>
            <div className="text-sm text-[#8b9dc3]">Critical Issues</div>
          </div>

          <div className="text-center p-4 bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)] rounded-lg">
            <div
              className={`text-2xl font-bold mb-1 ${
                summary.riskScore > 70
                  ? "text-red-400"
                  : summary.riskScore > 40
                    ? "text-yellow-400"
                    : "text-green-400"
              }`}
            >
              {summary.riskScore}/100
            </div>
            <div className="text-sm text-[#8b9dc3]">Risk Score</div>
          </div>

          <div className="text-center p-4 bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)] rounded-lg">
            <div
              className={`text-2xl font-bold mb-1 ${
                summary.healthScore > 70
                  ? "text-green-400"
                  : summary.healthScore > 40
                    ? "text-yellow-400"
                    : "text-red-400"
              }`}
            >
              {summary.healthScore}/100
            </div>
            <div className="text-sm text-[#8b9dc3]">Health Score</div>
          </div>
        </div>

        {/* Pattern Detection Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex items-center gap-2 p-3 bg-[rgba(15,20,25,0.6)] rounded-lg">
            {patterns.washTrading ? (
              <XCircle className="h-4 w-4 text-red-400" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-400" />
            )}
            <span className="text-sm text-[#8b9dc3]">Wash Trading</span>
          </div>

          <div className="flex items-center gap-2 p-3 bg-[rgba(15,20,25,0.6)] rounded-lg">
            {patterns.botActivity ? (
              <AlertCircle className="h-4 w-4 text-yellow-400" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-400" />
            )}
            <span className="text-sm text-[#8b9dc3]">Bot Activity</span>
          </div>

          <div className="flex items-center gap-2 p-3 bg-[rgba(15,20,25,0.6)] rounded-lg">
            {patterns.whaleActivity ? (
              <AlertTriangle className="h-4 w-4 text-orange-400" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-400" />
            )}
            <span className="text-sm text-[#8b9dc3]">Whale Activity</span>
          </div>

          <div className="flex items-center gap-2 p-3 bg-[rgba(15,20,25,0.6)] rounded-lg">
            {patterns.concentrationRisk ? (
              <XCircle className="h-4 w-4 text-red-400" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-400" />
            )}
            <span className="text-sm text-[#8b9dc3]">Concentration Risk</span>
          </div>
        </div>
      </div>

      {/* Detailed Insights */}
      {insights.length > 0 && (
        <div className="bg-[rgba(25,28,40,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
          <h4 className="text-lg font-semibold text-[#00bfff] mb-4">
            Detailed Insights ({insights.length})
          </h4>

          <div className="space-y-4">
            {insights.map((insight, index) => (
              <div
                key={insight.id}
                className={`border rounded-lg p-4 ${getSeverityColor(insight.severity)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getSeverityIcon(insight.severity)}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h5 className="font-semibold text-white">
                        {insight.title}
                      </h5>
                      <Badge
                        variant="outline"
                        className="text-xs border-[rgba(255,255,255,0.2)] text-[#8b9dc3]"
                      >
                        {getTypeIcon(insight.type)}
                        <span className="ml-1 capitalize">{insight.type}</span>
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-xs border-[rgba(255,255,255,0.2)] text-[#8b9dc3]"
                      >
                        {Math.round(insight.confidence * 100)}% confidence
                      </Badge>
                    </div>

                    <p className="text-[#8b9dc3] text-sm mb-3">
                      {insight.description}
                    </p>

                    <p className="text-[#6b7280] text-xs mb-3">
                      {insight.details}
                    </p>

                    {/* Metrics */}
                    {insight.metrics && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                        {Object.entries(insight.metrics).map(([key, value]) => (
                          <div key={key} className="text-xs">
                            <span className="text-[#6b7280] capitalize">
                              {key.replace(/([A-Z])/g, " $1").toLowerCase()}:
                            </span>
                            <span className="text-[#8b9dc3] ml-1 font-mono">
                              {typeof value === "number"
                                ? value % 1 === 0
                                  ? value.toLocaleString()
                                  : value.toFixed(2)
                                : value}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Addresses */}
                    {insight.addresses && insight.addresses.length > 0 && (
                      <div className="text-xs">
                        <span className="text-[#6b7280]">
                          Related addresses:
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {insight.addresses.map((address, i) => (
                            <code
                              key={i}
                              className="bg-[rgba(0,191,255,0.1)] text-[#00bfff] px-2 py-1 rounded text-xs"
                            >
                              {address.slice(0, 8)}...{address.slice(-6)}
                            </code>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-[rgba(25,28,40,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
          <h4 className="text-lg font-semibold text-[#00bfff] mb-4">
            Recommendations
          </h4>

          <div className="space-y-3">
            {recommendations.map((recommendation, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-[rgba(15,20,25,0.6)] rounded-lg"
              >
                <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-[#8b9dc3] text-sm">{recommendation}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Issues Found */}
      {insights.length === 0 && (
        <div className="bg-[rgba(25,28,40,0.8)] border border-green-500/30 rounded-lg p-6 text-center">
          <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-green-400 mb-2">
            No Significant Issues Detected
          </h4>
          <p className="text-[#8b9dc3] text-sm">
            The transaction patterns appear normal and healthy. Continue
            monitoring for any changes.
          </p>
        </div>
      )}
    </div>
  );
}
