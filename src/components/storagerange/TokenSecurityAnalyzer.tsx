import React, { useMemo } from "react";
import {
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card } from "@/components/global/Card";
import { Badge } from "@/components/global/Badge";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Lock,
  Settings,
  Shield,
  Target,
  TrendingUp,
  Unlock,
  Users,
} from "lucide-react";
import type { StorageAnalysisResult } from "@/lib/storagerange/storageService";

interface TokenSecurityAnalyzerProps {
  storageData: StorageAnalysisResult;
  holderAnalysis?: HolderAnalysis;
  className?: string;
}

interface SecurityPattern {
  type:
    | "minting"
    | "burning"
    | "pausing"
    | "ownership"
    | "proxy"
    | "access_control"
    | "timelock";
  detected: boolean;
  severity: "low" | "medium" | "high" | "critical";
  confidence: number;
  description: string;
  evidence: string[];
  recommendations: string[];
}

interface SecurityScore {
  overall: number;
  categories: {
    minting: number;
    burning: number;
    pausing: number;
    ownership: number;
    upgradeability: number;
    concentration: number;
    governance: number;
  };
}

interface RiskAssessment {
  level: "low" | "medium" | "high" | "critical";
  score: number;
  factors: RiskFactor[];
  mitigations: string[];
}

interface RiskFactor {
  type: string;
  impact: "low" | "medium" | "high" | "critical";
  probability: "low" | "medium" | "high";
  description: string;
  mitigation?: string;
}

interface HolderAnalysis {
  concentrationMetrics: {
    giniCoefficient: number;
    top10Percentage: number;
    top100Percentage: number;
    herfindahlIndex: number;
  };
  totalHolders: number;
  contractHolders: number;
}

export const TokenSecurityAnalyzer: React.FC<TokenSecurityAnalyzerProps> = ({
  storageData,
  holderAnalysis,
  className = "",
}) => {
  const securityPatterns = useMemo((): SecurityPattern[] => {
    const patterns: SecurityPattern[] = [];
    const detectedPatterns = storageData.processedData.detectedPatterns;
    const contractInfo = storageData.processedData.contractInfo;

    const hasMintRole = detectedPatterns.some(
      (p) =>
        p.type === "access_control" &&
        (p.description.toLowerCase().includes("mint") ||
          p.description.toLowerCase().includes("minter")),
    );
    patterns.push({
      type: "minting",
      detected: hasMintRole,
      severity: hasMintRole ? "high" : "low",
      confidence: hasMintRole ? 0.9 : 0.1,
      description: hasMintRole
        ? "Token has minting capabilities controlled by specific roles"
        : "No minting capabilities detected",
      evidence: hasMintRole
        ? [
            "MINTER_ROLE or similar access control pattern found",
            "Supply can be increased",
          ]
        : ["No minting role patterns detected"],
      recommendations: hasMintRole
        ? [
            "Monitor minting events",
            "Verify minter role assignments",
            "Implement minting limits",
          ]
        : ["Consider if minting is needed for token economics"],
    });

    const hasBurnCapability = detectedPatterns.some((p) =>
      p.description.toLowerCase().includes("burn"),
    );
    patterns.push({
      type: "burning",
      detected: hasBurnCapability,
      severity: hasBurnCapability ? "medium" : "low",
      confidence: hasBurnCapability ? 0.8 : 0.2,
      description: hasBurnCapability
        ? "Token has burning capabilities"
        : "No burning capabilities detected",
      evidence: hasBurnCapability
        ? ["Burn function patterns detected", "Supply can be decreased"]
        : ["No burn patterns found"],
      recommendations: hasBurnCapability
        ? ["Monitor burn events", "Verify burn access controls"]
        : ["Consider deflationary mechanisms if appropriate"],
    });

    const isPausable = contractInfo?.pausedState !== undefined;
    const isPaused = contractInfo?.pausedState === true;
    patterns.push({
      type: "pausing",
      detected: isPausable,
      severity: isPaused ? "critical" : isPausable ? "medium" : "low",
      confidence: isPausable ? 0.95 : 0.1,
      description: isPausable
        ? `Token is pausable and currently ${isPaused ? "paused" : "active"}`
        : "Token is not pausable",
      evidence: isPausable
        ? [
            `Pause state detected: ${isPaused}`,
            "Transfer functionality can be halted",
          ]
        : ["No pause functionality detected"],
      recommendations: isPausable
        ? [
            "Monitor pause events",
            "Verify pause role assignments",
            "Have unpause procedures",
          ]
        : ["Consider if pause functionality is needed for security"],
    });

    const hasOwnership = detectedPatterns.some(
      (p) =>
        p.type === "access_control" &&
        (p.description.toLowerCase().includes("owner") ||
          p.description.toLowerCase().includes("admin")),
    );
    patterns.push({
      type: "ownership",
      detected: hasOwnership,
      severity: hasOwnership ? "medium" : "low",
      confidence: hasOwnership ? 0.85 : 0.2,
      description: hasOwnership
        ? "Token has ownership or admin controls"
        : "No centralized ownership detected",
      evidence: hasOwnership
        ? [
            "Owner or admin role patterns found",
            "Centralized control mechanisms",
          ]
        : ["No ownership patterns detected"],
      recommendations: hasOwnership
        ? [
            "Monitor ownership changes",
            "Implement multi-sig for admin functions",
            "Consider decentralization",
          ]
        : ["Verify if admin functions are needed"],
    });

    const isProxy = detectedPatterns.some((p) => p.type === "proxy");
    patterns.push({
      type: "proxy",
      detected: isProxy,
      severity: isProxy ? "high" : "low",
      confidence: isProxy ? 0.9 : 0.1,
      description: isProxy
        ? "Token contract is upgradeable via proxy pattern"
        : "Token contract is not upgradeable",
      evidence: isProxy
        ? [
            "Proxy pattern detected",
            "Contract logic can be changed",
            "Implementation slot found",
          ]
        : ["No proxy patterns detected"],
      recommendations: isProxy
        ? [
            "Monitor upgrade events",
            "Verify upgrade governance",
            "Implement timelock for upgrades",
          ]
        : ["Consider if upgradeability is needed"],
    });

    const hasAccessControl = detectedPatterns.some(
      (p) => p.type === "access_control",
    );
    patterns.push({
      type: "access_control",
      detected: hasAccessControl,
      severity: hasAccessControl ? "medium" : "high",
      confidence: hasAccessControl ? 0.8 : 0.7,
      description: hasAccessControl
        ? "Token has role-based access control"
        : "No access control patterns detected",
      evidence: hasAccessControl
        ? ["Role-based access control found", "Granular permission system"]
        : ["No access control patterns found", "Potential security risk"],
      recommendations: hasAccessControl
        ? [
            "Audit role assignments",
            "Monitor role changes",
            "Implement role rotation",
          ]
        : ["Implement proper access controls", "Add role-based permissions"],
    });

    const hasTimelock = detectedPatterns.some(
      (p) =>
        p.description.toLowerCase().includes("timelock") ||
        p.description.toLowerCase().includes("delay"),
    );
    patterns.push({
      type: "timelock",
      detected: hasTimelock,
      severity: hasTimelock ? "low" : "medium",
      confidence: hasTimelock ? 0.7 : 0.3,
      description: hasTimelock
        ? "Timelock mechanisms detected for critical functions"
        : "No timelock mechanisms detected",
      evidence: hasTimelock
        ? [
            "Timelock or delay patterns found",
            "Critical changes have delay periods",
          ]
        : ["No timelock patterns detected"],
      recommendations: hasTimelock
        ? ["Monitor timelock queues", "Verify delay periods are appropriate"]
        : ["Consider implementing timelocks for critical functions"],
    });

    return patterns;
  }, [storageData]);

  const securityScore = useMemo((): SecurityScore => {
    const patterns = securityPatterns;

    let mintingScore = 100;
    let burningScore = 100;
    let pausingScore = 100;
    let ownershipScore = 100;
    let upgradeabilityScore = 100;
    let concentrationScore = 100;
    let governanceScore = 100;

    const mintingPattern = patterns.find((p) => p.type === "minting");
    if (mintingPattern?.detected) {
      mintingScore =
        mintingPattern.severity === "critical"
          ? 20
          : mintingPattern.severity === "high"
            ? 40
            : mintingPattern.severity === "medium"
              ? 60
              : 80;
    }

    const pausingPattern = patterns.find((p) => p.type === "pausing");
    if (pausingPattern?.detected) {
      pausingScore =
        pausingPattern.severity === "critical"
          ? 10
          : pausingPattern.severity === "high"
            ? 30
            : pausingPattern.severity === "medium"
              ? 70
              : 90;
    }

    const proxyPattern = patterns.find((p) => p.type === "proxy");
    if (proxyPattern?.detected) {
      upgradeabilityScore = proxyPattern.severity === "high" ? 30 : 60;
    }

    const ownershipPattern = patterns.find((p) => p.type === "ownership");
    if (ownershipPattern?.detected) {
      ownershipScore = ownershipPattern.severity === "high" ? 40 : 70;
    }

    const accessControlPattern = patterns.find(
      (p) => p.type === "access_control",
    );
    if (!accessControlPattern?.detected) {
      governanceScore = 30;
    }

    if (holderAnalysis) {
      const { concentrationMetrics } = holderAnalysis;
      if (concentrationMetrics.top10Percentage > 80) {
        concentrationScore = 20;
      } else if (concentrationMetrics.top10Percentage > 60) {
        concentrationScore = 40;
      } else if (concentrationMetrics.top10Percentage > 40) {
        concentrationScore = 60;
      } else if (concentrationMetrics.top10Percentage > 20) {
        concentrationScore = 80;
      }
    }

    const overall = Math.round(
      (mintingScore +
        burningScore +
        pausingScore +
        ownershipScore +
        upgradeabilityScore +
        concentrationScore +
        governanceScore) /
        7,
    );

    return {
      overall,
      categories: {
        minting: mintingScore,
        burning: burningScore,
        pausing: pausingScore,
        ownership: ownershipScore,
        upgradeability: upgradeabilityScore,
        concentration: concentrationScore,
        governance: governanceScore,
      },
    };
  }, [securityPatterns, holderAnalysis]);

  const riskAssessment = useMemo((): RiskAssessment => {
    const factors: RiskFactor[] = [];

    securityPatterns.forEach((pattern) => {
      if (pattern.detected && pattern.severity !== "low") {
        factors.push({
          type: pattern.type,
          impact: pattern.severity,
          probability:
            pattern.confidence > 0.8
              ? "high"
              : pattern.confidence > 0.5
                ? "medium"
                : "low",
          description: pattern.description,
          mitigation: pattern.recommendations[0],
        });
      }
    });

    if (
      holderAnalysis &&
      holderAnalysis.concentrationMetrics.top10Percentage > 50
    ) {
      factors.push({
        type: "concentration",
        impact: "high",
        probability: "high",
        description: `High token concentration: top 10 holders control ${holderAnalysis.concentrationMetrics.top10Percentage.toFixed(1)}% of supply`,
        mitigation: "Monitor large holder movements and encourage distribution",
      });
    }

    const criticalFactors = factors.filter(
      (f) => f.impact === "critical",
    ).length;
    const highFactors = factors.filter((f) => f.impact === "high").length;
    const mediumFactors = factors.filter((f) => f.impact === "medium").length;

    let level: RiskAssessment["level"];
    let score: number;

    if (criticalFactors > 0) {
      level = "critical";
      score = Math.max(10, 40 - criticalFactors * 10);
    } else if (highFactors > 2) {
      level = "high";
      score = Math.max(30, 70 - highFactors * 10);
    } else if (highFactors > 0 || mediumFactors > 3) {
      level = "medium";
      score = Math.max(50, 80 - highFactors * 15 - mediumFactors * 5);
    } else {
      level = "low";
      score = Math.max(70, 90 - mediumFactors * 5);
    }

    const mitigations = [
      "Implement comprehensive monitoring for all detected risk factors",
      "Establish incident response procedures for security events",
      "Regular security audits and pattern analysis",
      "Multi-signature controls for critical functions",
      "Transparent governance and communication channels",
    ];

    return {
      level,
      score,
      factors,
      mitigations,
    };
  }, [securityPatterns, holderAnalysis]);

  const securityRadarData = [
    { category: "Minting", score: securityScore.categories.minting },
    { category: "Burning", score: securityScore.categories.burning },
    { category: "Pausing", score: securityScore.categories.pausing },
    { category: "Ownership", score: securityScore.categories.ownership },
    {
      category: "Upgradeability",
      score: securityScore.categories.upgradeability,
    },
    {
      category: "Concentration",
      score: securityScore.categories.concentration,
    },
    { category: "Governance", score: securityScore.categories.governance },
  ];

  const riskDistributionData = riskAssessment.factors.reduce(
    (acc, factor) => {
      const existing = acc.find((item) => item.impact === factor.impact);
      if (existing) {
        existing.count += 1;
      } else {
        acc.push({ impact: factor.impact, count: 1 });
      }
      return acc;
    },
    [] as Array<{ impact: string; count: number }>,
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[rgba(25,28,40,0.95)] border border-[rgba(0,191,255,0.3)] rounded-lg p-3 shadow-lg">
          <p className="text-[#00bfff] font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p
              key={index}
              className="text-[#8b9dc3]"
              style={{ color: entry.color }}
            >
              {`${entry.name}: ${entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "low":
        return "text-green-400 border-green-500/50 bg-green-500/10";
      case "medium":
        return "text-yellow-400 border-yellow-500/50 bg-yellow-500/10";
      case "high":
        return "text-orange-400 border-orange-500/50 bg-orange-500/10";
      case "critical":
        return "text-red-400 border-red-500/50 bg-red-500/10";
      default:
        return "text-blue-400 border-blue-500/50 bg-blue-500/10";
    }
  };

  const getPatternIcon = (type: string, detected: boolean) => {
    const iconClass = detected ? "text-orange-400" : "text-green-400";

    switch (type) {
      case "minting":
        return <TrendingUp className={`h-4 w-4 ${iconClass}`} />;
      case "burning":
        return <Activity className={`h-4 w-4 ${iconClass}`} />;
      case "pausing":
        return detected ? (
          <Lock className="h-4 w-4 text-red-400" />
        ) : (
          <Unlock className="h-4 w-4 text-green-400" />
        );
      case "ownership":
        return <Users className={`h-4 w-4 ${iconClass}`} />;
      case "proxy":
        return <Settings className={`h-4 w-4 ${iconClass}`} />;
      case "access_control":
        return <Shield className={`h-4 w-4 ${iconClass}`} />;
      case "timelock":
        return <Target className={`h-4 w-4 ${iconClass}`} />;
      default:
        return <AlertTriangle className={`h-4 w-4 ${iconClass}`} />;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-[#00bfff]" />
          <h3 className="text-lg font-semibold text-[#00bfff]">
            Token Security Analysis
          </h3>
          <Badge
            variant="outline"
            className={getRiskColor(riskAssessment.level)}
          >
            {riskAssessment.level.toUpperCase()} RISK
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-[#00bfff]">
              {securityScore.overall}
            </div>
            <div className="text-sm text-[#8b9dc3]">Security Score</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-[#00bfff]">
              {riskAssessment.score}
            </div>
            <div className="text-sm text-[#8b9dc3]">Risk Score</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-[#00bfff]">
              {securityPatterns.filter((p) => p.detected).length}
            </div>
            <div className="text-sm text-[#8b9dc3]">Patterns Detected</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-[#00bfff]">
              {riskAssessment.factors.length}
            </div>
            <div className="text-sm text-[#8b9dc3]">Risk Factors</div>
          </div>
        </div>

        <div className="flex justify-center">
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={securityRadarData}>
              <PolarGrid stroke="rgba(0,191,255,0.1)" />
              <PolarAngleAxis
                dataKey="category"
                tick={{ fill: "#8b9dc3", fontSize: 12 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fill: "#8b9dc3", fontSize: 10 }}
              />
              <Radar
                name="Security Score"
                dataKey="score"
                stroke="#00bfff"
                fill="rgba(0,191,255,0.2)"
                fillOpacity={0.6}
              />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
        <h4 className="text-lg font-semibold text-[#00bfff] mb-4">
          Security Pattern Analysis
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {securityPatterns.map((pattern, index) => (
            <div
              key={index}
              className="p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]"
            >
              <div className="flex items-center gap-3 mb-2">
                {getPatternIcon(pattern.type, pattern.detected)}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[#00bfff] capitalize">
                      {pattern.type.replace("_", " ")}
                    </span>
                    <Badge
                      variant="outline"
                      className={
                        pattern.detected
                          ? getRiskColor(pattern.severity)
                          : "border-green-500/50 text-green-400 bg-green-500/10"
                      }
                    >
                      {pattern.detected
                        ? pattern.severity.toUpperCase()
                        : "SAFE"}
                    </Badge>
                  </div>
                  <div className="text-xs text-[#8b9dc3]">
                    Confidence: {(pattern.confidence * 100).toFixed(0)}%
                  </div>
                </div>
              </div>

              <p className="text-[#8b9dc3] text-sm mb-2">
                {pattern.description}
              </p>

              <div className="space-y-1">
                <div className="text-xs text-[#6b7280]">
                  <strong>Evidence:</strong>
                  <ul className="list-disc list-inside ml-2">
                    {pattern.evidence.map((evidence, i) => (
                      <li key={i}>{evidence}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
          <h4 className="text-lg font-semibold text-[#00bfff] mb-4">
            Risk Factors
          </h4>

          <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
            {riskAssessment.factors.map((factor, index) => (
              <div
                key={index}
                className="p-3 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Badge
                    variant="outline"
                    className={getRiskColor(factor.impact)}
                  >
                    {factor.impact.toUpperCase()}
                  </Badge>
                  <span className="font-medium text-[#00bfff] text-sm capitalize">
                    {factor.type.replace("_", " ")}
                  </span>
                </div>
                <p className="text-[#8b9dc3] text-sm mb-1">
                  {factor.description}
                </p>
                {factor.mitigation && (
                  <p className="text-[#6b7280] text-xs">
                    <strong>Mitigation:</strong> {factor.mitigation}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
          <h4 className="text-lg font-semibold text-[#00bfff] mb-4">
            Risk Distribution
          </h4>

          {riskDistributionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={riskDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ impact, count }) => `${impact}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {riskDistributionData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.impact === "critical"
                          ? "#ef4444"
                          : entry.impact === "high"
                            ? "#f97316"
                            : entry.impact === "medium"
                              ? "#eab308"
                              : "#3b82f6"
                      }
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-[#8b9dc3]">
              No significant risk factors detected
            </div>
          )}
        </Card>
      </div>

      <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
        <h4 className="text-lg font-semibold text-[#00bfff] mb-4">
          Security Recommendations
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h5 className="font-medium text-[#00bfff] mb-3">
              Pattern-Specific
            </h5>
            <div className="space-y-2">
              {securityPatterns
                .filter((p) => p.detected && p.recommendations.length > 0)
                .map((pattern, index) => (
                  <div key={index} className="space-y-1">
                    <div className="font-medium text-[#8b9dc3] text-sm capitalize">
                      {pattern.type.replace("_", " ")}:
                    </div>
                    {pattern.recommendations.map((rec, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 text-sm text-[#8b9dc3] ml-2"
                      >
                        <CheckCircle className="h-3 w-3 text-green-400 mt-0.5 flex-shrink-0" />
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          </div>

          <div>
            <h5 className="font-medium text-[#00bfff] mb-3">
              General Security
            </h5>
            <div className="space-y-2">
              {riskAssessment.mitigations.map((mitigation, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 text-sm text-[#8b9dc3]"
                >
                  <CheckCircle className="h-3 w-3 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>{mitigation}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
