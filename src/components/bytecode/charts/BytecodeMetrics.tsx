import React from "react";
import { Card } from "@/components/global/Card";
import { Badge } from "@/components/global/Badge";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Code,
  Layers,
  Shield,
  TrendingUp,
  Zap,
} from "lucide-react";
import type { BytecodeAnalysis } from "@/lib/bytecode";

interface BytecodeMetricsProps {
  analysis: BytecodeAnalysis;
}

export const BytecodeMetrics: React.FC<BytecodeMetricsProps> = ({
  analysis,
}) => {
  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const getComplexityColor = (level: string) => {
    switch (level) {
      case "Low":
        return "text-green-400 bg-green-500/20 border-green-500/50";
      case "Medium":
        return "text-yellow-400 bg-yellow-500/20 border-yellow-500/50";
      case "High":
        return "text-red-400 bg-red-500/20 border-red-500/50";
      default:
        return "text-[#8b9dc3] bg-[rgba(0,191,255,0.1)] border-[rgba(0,191,255,0.3)]";
    }
  };

  const getComplianceColor = (compliance: number) => {
    if (compliance >= 80) return "text-green-400";
    if (compliance >= 60) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[#8b9dc3] text-sm">Contract Size</p>
            <p className="text-2xl font-bold text-[#00bfff]">
              {formatBytes(analysis.size)}
            </p>
          </div>
          <div className="w-12 h-12 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
            <Code className="h-6 w-6 text-[#00bfff]" />
          </div>
        </div>
        <div className="mt-3 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-[#8b9dc3]">Functions:</span>
            <span className="text-[#00bfff] font-mono">
              {analysis.functions.length}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#8b9dc3]">Patterns:</span>
            <span className="text-[#00bfff] font-mono">
              {analysis.patterns.length}
            </span>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[#8b9dc3] text-sm">Complexity</p>
            <p className="text-2xl font-bold text-[#00bfff]">
              {analysis.complexity.score}/100
            </p>
          </div>
          <div className="w-12 h-12 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
            <BarChart3 className="h-6 w-6 text-[#00bfff]" />
          </div>
        </div>
        <div className="mt-3">
          <Badge
            className={`text-xs ${getComplexityColor(analysis.complexity.level)}`}
          >
            {analysis.complexity.level} Complexity
          </Badge>
          <div className="mt-2 text-xs text-[#8b9dc3]">
            Estimate: {analysis.complexity.estimate}
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[#8b9dc3] text-sm">Standards</p>
            <p className="text-2xl font-bold text-[#00bfff]">
              {analysis.standards.length}
            </p>
          </div>
          <div className="w-12 h-12 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
            <Layers className="h-6 w-6 text-[#00bfff]" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex flex-wrap gap-1">
            {analysis.standards.length > 0 ? (
              analysis.standards.map((standard, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="text-xs border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                >
                  {standard}
                </Badge>
              ))
            ) : (
              <span className="text-[#8b9dc3] text-xs">None detected</span>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[#8b9dc3] text-sm">Security</p>
            <p className="text-2xl font-bold text-[#00bfff]">
              {analysis.security.features.length}
            </p>
          </div>
          <div className="w-12 h-12 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
            <Shield className="h-6 w-6 text-[#00bfff]" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-center gap-2">
            {analysis.security.hasControls ? (
              <CheckCircle className="h-4 w-4 text-green-400" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
            )}
            <span className="text-xs text-[#8b9dc3]">
              {analysis.security.hasControls ? "Protected" : "Basic"}
            </span>
          </div>
        </div>
      </Card>

      {analysis.gasOptimizations && analysis.gasOptimizations.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#8b9dc3] text-sm">Gas Optimizations</p>
              <p className="text-2xl font-bold text-[#00bfff]">
                {analysis.gasOptimizations.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
              <Zap className="h-6 w-6 text-[#00bfff]" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex flex-wrap gap-1">
              {analysis.gasOptimizations.map((optimization, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="text-xs border-green-500/50 text-green-400 bg-green-500/10"
                >
                  {optimization}
                </Badge>
              ))}
            </div>
          </div>
        </Card>
      )}

      {analysis.proxy.isProxy && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#8b9dc3] text-sm">Proxy Type</p>
              <p className="text-lg font-bold text-[#00bfff]">Proxy</p>
            </div>
            <div className="w-12 h-12 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-[#00bfff]" />
            </div>
          </div>
          <div className="mt-3">
            <Badge
              variant="outline"
              className="text-xs border-purple-500/50 text-purple-400 bg-purple-500/10"
            >
              {analysis.proxy.type || "Unknown Type"}
            </Badge>
          </div>
        </Card>
      )}

      {analysis.standardsCompliance &&
        analysis.standardsCompliance.length > 0 && (
          <div className="md:col-span-2 lg:col-span-4">
            <Card className="p-4">
              <h3 className="text-lg font-semibold text-[#00bfff] mb-4">
                Standards Compliance Analysis
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {analysis.standardsCompliance.map((compliance, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(25,28,40,0.6)]"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-[#00bfff]">
                        {compliance.standard}
                      </h4>
                      <span
                        className={`text-sm font-mono ${getComplianceColor(compliance.compliance)}`}
                      >
                        {compliance.compliance}%
                      </span>
                    </div>

                    {compliance.missingFunctions.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs text-red-400 mb-1">Missing:</p>
                        <div className="flex flex-wrap gap-1">
                          {compliance.missingFunctions
                            .slice(0, 3)
                            .map((func, idx) => (
                              <Badge
                                key={idx}
                                className="text-xs bg-red-500/20 border-red-500/50 text-red-400"
                              >
                                {func}
                              </Badge>
                            ))}
                          {compliance.missingFunctions.length > 3 && (
                            <span className="text-xs text-[#8b9dc3]">
                              +{compliance.missingFunctions.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {compliance.extraFunctions.length > 0 && (
                      <div>
                        <p className="text-xs text-green-400 mb-1">Extra:</p>
                        <div className="flex flex-wrap gap-1">
                          {compliance.extraFunctions
                            .slice(0, 3)
                            .map((func, idx) => (
                              <Badge
                                key={idx}
                                className="text-xs bg-green-500/20 border-green-500/50 text-green-400"
                              >
                                {func}
                              </Badge>
                            ))}
                          {compliance.extraFunctions.length > 3 && (
                            <span className="text-xs text-[#8b9dc3]">
                              +{compliance.extraFunctions.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
    </div>
  );
};
