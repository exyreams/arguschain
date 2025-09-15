import React, { useMemo } from "react";
import { Badge, Card } from "@/components/global";
import {
  AlertCircle,
  AlertTriangle,
  ChevronRight,
  Info,
  Shield,
} from "lucide-react";
import type { SecurityFlag } from "@/lib/replaytransactions";
import { VISUALIZATION_COLORS } from "@/lib/replaytransactions";

interface SecurityAnalysisPanelProps {
  securityFlags: SecurityFlag[];
  className?: string;
}

export const SecurityAnalysisPanel: React.FC<SecurityAnalysisPanelProps> = ({
  securityFlags,
  className = "",
}) => {
  const securityAnalysis = useMemo(() => {
    const flagsByLevel = {
      critical: securityFlags.filter((f) => f.level === "critical"),
      high: securityFlags.filter((f) => f.level === "high"),
      warning: securityFlags.filter((f) => f.level === "warning"),
      info: securityFlags.filter((f) => f.level === "info"),
    };

    const flagsByType = securityFlags.reduce(
      (acc, flag) => {
        if (!acc[flag.type]) {
          acc[flag.type] = [];
        }
        acc[flag.type].push(flag);
        return acc;
      },
      {} as Record<string, SecurityFlag[]>,
    );

    const riskScore = Math.min(
      100,
      flagsByLevel.critical.length * 25 +
        flagsByLevel.high.length * 15 +
        flagsByLevel.warning.length * 8 +
        flagsByLevel.info.length * 2,
    );

    return {
      flagsByLevel,
      flagsByType,
      riskScore,
      totalFlags: securityFlags.length,
    };
  }, [securityFlags]);

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "critical":
        return <AlertCircle className="h-4 w-4" />;
      case "high":
        return <AlertTriangle className="h-4 w-4" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4" />;
      case "info":
        return <Info className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "critical":
        return VISUALIZATION_COLORS.security.critical;
      case "high":
        return VISUALIZATION_COLORS.security.high;
      case "warning":
        return VISUALIZATION_COLORS.security.warning;
      case "info":
        return VISUALIZATION_COLORS.security.info;
      default:
        return VISUALIZATION_COLORS.secondary;
    }
  };

  const getRiskLevel = (score: number) => {
    if (score >= 75)
      return {
        level: "High Risk",
        color: VISUALIZATION_COLORS.security.critical,
      };
    if (score >= 50)
      return {
        level: "Medium Risk",
        color: VISUALIZATION_COLORS.security.high,
      };
    if (score >= 25)
      return {
        level: "Low Risk",
        color: VISUALIZATION_COLORS.security.warning,
      };
    return { level: "Minimal Risk", color: VISUALIZATION_COLORS.success };
  };

  const riskLevel = getRiskLevel(securityAnalysis.riskScore);

  if (securityFlags.length === 0) {
    return (
      <Card
        className={`bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)] ${className}`}
      >
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-[#4ade80]" />
            <h3 className="text-lg font-semibold text-[#4ade80]">
              Security Analysis
            </h3>
          </div>
          <div className="text-center py-8">
            <Shield className="h-12 w-12 text-[#4ade80] mx-auto mb-4" />
            <div className="text-[#4ade80] font-semibold mb-2">
              No Security Issues Detected
            </div>
            <div className="text-[#8b9dc3] text-sm">
              Transaction appears to be secure with no suspicious patterns
              identified.
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={`bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)] ${className}`}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#fbbf24]" />
            <h3 className="text-lg font-semibold text-[#fbbf24]">
              Security Analysis
            </h3>
          </div>
          <Badge
            variant="outline"
            className={`border-[${riskLevel.color}] text-[${riskLevel.color}] bg-[${riskLevel.color}20]`}
            style={{
              borderColor: riskLevel.color,
              color: riskLevel.color,
              backgroundColor: `${riskLevel.color}20`,
            }}
          >
            {riskLevel.level}
          </Badge>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#8b9dc3]">Risk Score</span>
            <span className="text-[#00bfff] font-semibold">
              {securityAnalysis.riskScore}/100
            </span>
          </div>
          <div className="w-full bg-[rgba(15,20,25,0.8)] rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all duration-300"
              style={{
                width: `${securityAnalysis.riskScore}%`,
                background: riskLevel.color,
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div
              className="text-2xl font-bold"
              style={{ color: VISUALIZATION_COLORS.security.critical }}
            >
              {securityAnalysis.flagsByLevel.critical.length}
            </div>
            <div className="text-sm text-[#8b9dc3]">Critical</div>
          </div>
          <div className="text-center">
            <div
              className="text-2xl font-bold"
              style={{ color: VISUALIZATION_COLORS.security.high }}
            >
              {securityAnalysis.flagsByLevel.high.length}
            </div>
            <div className="text-sm text-[#8b9dc3]">High</div>
          </div>
          <div className="text-center">
            <div
              className="text-2xl font-bold"
              style={{ color: VISUALIZATION_COLORS.security.warning }}
            >
              {securityAnalysis.flagsByLevel.warning.length}
            </div>
            <div className="text-sm text-[#8b9dc3]">Warning</div>
          </div>
          <div className="text-center">
            <div
              className="text-2xl font-bold"
              style={{ color: VISUALIZATION_COLORS.security.info }}
            >
              {securityAnalysis.flagsByLevel.info.length}
            </div>
            <div className="text-sm text-[#8b9dc3]">Info</div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-md font-semibold text-[#00bfff] mb-3">
            Security Flags
          </h4>

          {securityFlags.map((flag, index) => (
            <div
              key={index}
              className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-4 hover:bg-[rgba(15,20,25,0.9)] transition-colors"
            >
              <div className="flex items-start gap-3">
                <div
                  className="mt-0.5"
                  style={{ color: getLevelColor(flag.level) }}
                >
                  {getLevelIcon(flag.level)}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge
                      variant="outline"
                      className="text-xs"
                      style={{
                        borderColor: getLevelColor(flag.level),
                        color: getLevelColor(flag.level),
                        backgroundColor: `${getLevelColor(flag.level)}20`,
                      }}
                    >
                      {flag.level.toUpperCase()}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)] text-xs"
                    >
                      {flag.type.replace("_", " ").toUpperCase()}
                    </Badge>
                  </div>

                  <div className="text-[#00bfff] font-medium mb-1">
                    {flag.description}
                  </div>

                  {flag.details && Object.keys(flag.details).length > 0 && (
                    <div className="text-sm text-[#8b9dc3] space-y-1">
                      {Object.entries(flag.details).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2">
                          <ChevronRight className="h-3 w-3" />
                          <span className="capitalize">
                            {key.replace("_", " ")}:
                          </span>
                          <span className="text-[#00bfff] font-mono text-xs">
                            {typeof value === "object"
                              ? JSON.stringify(value)
                              : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg">
          <h4 className="text-md font-semibold text-[#00bfff] mb-3">
            Security Recommendations
          </h4>
          <div className="space-y-2 text-sm">
            {securityAnalysis.flagsByLevel.critical.length > 0 && (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-[#dc2626]" />
                <span className="text-[#dc2626]">
                  Immediate attention required for critical security issues
                </span>
              </div>
            )}

            {securityAnalysis.flagsByLevel.high.length > 0 && (
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[#ea580c]" />
                <span className="text-[#ea580c]">
                  Review and address high-priority security concerns
                </span>
              </div>
            )}

            {Object.keys(securityAnalysis.flagsByType).includes(
              "admin_function",
            ) && (
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-[#2563eb]" />
                <span className="text-[#2563eb]">
                  Admin functions detected - verify authorization
                </span>
              </div>
            )}

            {Object.keys(securityAnalysis.flagsByType).includes(
              "code_change",
            ) && (
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[#dc2626]" />
                <span className="text-[#dc2626]">
                  Contract code changes require thorough security review
                </span>
              </div>
            )}

            {securityAnalysis.riskScore < 25 && (
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-[#4ade80]" />
                <span className="text-[#4ade80]">
                  Transaction appears secure with minimal risk factors
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
