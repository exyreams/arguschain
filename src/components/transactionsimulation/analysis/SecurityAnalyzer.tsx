import React, { useMemo } from "react";
import { Badge } from "@/components/global/Badge";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Lock,
  Shield,
  Target,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface SecurityIssue {
  id: string;
  type:
    | "reentrancy"
    | "overflow"
    | "access_control"
    | "gas_limit"
    | "front_running"
    | "flash_loan";
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  description: string;
  recommendation: string;
  confidence: number;
  references?: string[];
}

interface SecurityAnalyzerProps {
  functionName: string;
  parameters: any[];
  gasUsed: number;
  traceData?: any;
  stateChanges: any[];
  fromAddress: string;
  contractAddress: string;
  className?: string;
}

export const SecurityAnalyzer: React.FC<SecurityAnalyzerProps> = ({
  functionName,
  parameters,
  gasUsed,
  traceData,
  stateChanges,
  fromAddress,
  contractAddress,
  className = "",
}) => {
  const securityAnalysis = useMemo(() => {
    const issues: SecurityIssue[] = [];

    if (traceData?.structLogs) {
      const callOps = traceData.structLogs.filter((log: any) =>
        ["CALL", "DELEGATECALL", "CALLCODE", "STATICCALL"].includes(log.op)
      );
      const maxDepth = Math.max(
        ...traceData.structLogs.map((log: any) => log.depth)
      );

      if (maxDepth > 3 && callOps.length > 1) {
        issues.push({
          id: "reentrancy_risk",
          type: "reentrancy",
          severity: "high",
          title: "Potential Reentrancy Vulnerability",
          description: `Deep call stack detected (depth: ${maxDepth}) with ${callOps.length} external calls. This pattern may be vulnerable to reentrancy attacks.`,
          recommendation:
            "Implement reentrancy guards (ReentrancyGuard) and follow checks-effects-interactions pattern.",
          confidence: 75,
          references: [
            "SWC-107",
            "https://consensys.github.io/smart-contract-best-practices/attacks/reentrancy/",
          ],
        });
      }
    }

    if (gasUsed > 8000000) {
      issues.push({
        id: "gas_limit_risk",
        type: "gas_limit",
        severity: "critical",
        title: "Gas Limit Exceeded",
        description: `Transaction uses ${gasUsed.toLocaleString()} gas, which exceeds block gas limit.`,
        recommendation:
          "Optimize contract logic or split into multiple transactions.",
        confidence: 100,
      });
    } else if (gasUsed > 6000000) {
      issues.push({
        id: "high_gas_usage",
        type: "gas_limit",
        severity: "medium",
        title: "High Gas Usage",
        description: `Transaction uses ${gasUsed.toLocaleString()} gas, approaching block gas limit.`,
        recommendation:
          "Consider gas optimization techniques to reduce consumption.",
        confidence: 90,
      });
    }

    const adminFunctions = [
      "mint",
      "burn",
      "pause",
      "unpause",
      "blacklist",
      "unBlacklist",
    ];
    if (adminFunctions.includes(functionName)) {
      issues.push({
        id: "admin_function_access",
        type: "access_control",
        severity: "high",
        title: "Administrative Function Access",
        description: `Function '${functionName}' requires administrative privileges. Ensure proper access control.`,
        recommendation:
          "Verify caller has required permissions and implement role-based access control.",
        confidence: 95,
        references: ["OpenZeppelin AccessControl"],
      });
    }

    const transferAmount =
      functionName === "transfer" || functionName === "transferFrom"
        ? parameters[functionName === "transfer" ? 1 : 2]
        : 0;
    if (transferAmount > 1000000) {
      issues.push({
        id: "large_transfer",
        type: "front_running",
        severity: "medium",
        title: "Large Token Transfer",
        description: `Large transfer of ${transferAmount.toLocaleString()} tokens detected. May be subject to front-running.`,
        recommendation:
          "Consider using commit-reveal schemes or private mempools for large transfers.",
        confidence: 60,
      });
    }

    if (stateChanges.length > 5 && functionName.includes("swap")) {
      issues.push({
        id: "flash_loan_pattern",
        type: "flash_loan",
        severity: "medium",
        title: "Complex Transaction Pattern",
        description:
          "Multiple state changes detected in a single transaction. Monitor for flash loan attacks.",
        recommendation:
          "Implement flash loan protection mechanisms and slippage controls.",
        confidence: 40,
      });
    }

    if (traceData?.structLogs) {
      const arithmeticOps = traceData.structLogs.filter((log: any) =>
        ["ADD", "SUB", "MUL", "DIV", "MOD"].includes(log.op)
      );

      if (arithmeticOps.length > 20) {
        issues.push({
          id: "arithmetic_operations",
          type: "overflow",
          severity: "low",
          title: "Heavy Arithmetic Operations",
          description: `${arithmeticOps.length} arithmetic operations detected. Ensure overflow protection.`,
          recommendation:
            "Use SafeMath library or Solidity 0.8+ built-in overflow protection.",
          confidence: 30,
        });
      }
    }

    const severityWeights = {
      critical: 100,
      high: 75,
      medium: 50,
      low: 25,
      info: 10,
    };
    const totalRisk = issues.reduce(
      (sum, issue) => sum + severityWeights[issue.severity],
      0
    );
    const maxPossibleRisk = 500;
    const securityScore = Math.max(
      0,
      100 - (totalRisk / maxPossibleRisk) * 100
    );

    const securityMetrics = [
      {
        metric: "Access Control",
        value: adminFunctions.includes(functionName) ? 40 : 90,
      },
      {
        metric: "Reentrancy",
        value: issues.some((i) => i.type === "reentrancy") ? 30 : 95,
      },
      {
        metric: "Gas Efficiency",
        value: gasUsed > 1000000 ? 40 : gasUsed > 500000 ? 70 : 95,
      },
      { metric: "Front-running", value: transferAmount > 100000 ? 50 : 85 },
      { metric: "Flash Loans", value: stateChanges.length > 5 ? 60 : 90 },
      { metric: "Overflow", value: 85 },
    ];

    return {
      issues,
      securityScore,
      securityMetrics,
      riskLevel:
        securityScore > 80
          ? "low"
          : securityScore > 60
            ? "medium"
            : securityScore > 40
              ? "high"
              : "critical",
    };
  }, [
    functionName,
    parameters,
    gasUsed,
    traceData,
    stateChanges,
    fromAddress,
    contractAddress,
  ]);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "high":
        return <AlertTriangle className="h-4 w-4 text-red-400" />;
      case "medium":
        return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
      case "low":
        return <Eye className="h-4 w-4 text-blue-400" />;
      case "info":
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      default:
        return <Shield className="h-4 w-4 text-gray-400" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "border-red-500/50 bg-red-500/10 text-red-400";
      case "high":
        return "border-red-400/50 bg-red-400/10 text-red-400";
      case "medium":
        return "border-yellow-400/50 bg-yellow-400/10 text-yellow-400";
      case "low":
        return "border-blue-400/50 bg-blue-400/10 text-blue-400";
      case "info":
        return "border-green-400/50 bg-green-400/10 text-green-400";
      default:
        return "border-gray-400/50 bg-gray-400/10 text-gray-400";
    }
  };

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "critical":
        return "text-red-500";
      case "high":
        return "text-red-400";
      case "medium":
        return "text-yellow-400";
      case "low":
        return "text-green-400";
      default:
        return "text-gray-400";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "reentrancy":
        return <Target className="h-4 w-4" />;
      case "overflow":
        return <Zap className="h-4 w-4" />;
      case "access_control":
        return <Lock className="h-4 w-4" />;
      case "gas_limit":
        return <Zap className="h-4 w-4" />;
      case "front_running":
        return <Clock className="h-4 w-4" />;
      case "flash_loan":
        return <Users className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  return (
    <div
      className={`bg-[rgba(25,28,40,0.8)] backdrop-blur-[10px] border border-[rgba(0,191,255,0.2)] rounded-lg p-6 ${className}`}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-semibold text-[#00bfff]">
            Security Analysis
          </h3>
          <Badge
            variant="outline"
            className={`border-[rgba(0,191,255,0.3)] bg-[rgba(0,191,255,0.1)] ${getRiskLevelColor(securityAnalysis.riskLevel)}`}
          >
            {securityAnalysis.riskLevel.toUpperCase()} RISK
          </Badge>
        </div>
        <div className="text-right">
          <div className="text-sm text-[#8b9dc3]">Security Score</div>
          <div
            className={`text-2xl font-bold ${getRiskLevelColor(securityAnalysis.riskLevel)}`}
          >
            {securityAnalysis.securityScore.toFixed(0)}/100
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-4">
          <h4 className="text-lg font-semibold text-[#00bfff] mb-4">
            Security Metrics
          </h4>
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={securityAnalysis.securityMetrics}>
              <PolarGrid stroke="rgba(0,191,255,0.2)" />
              <PolarAngleAxis
                dataKey="metric"
                tick={{ fill: "#8b9dc3", fontSize: 12 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fill: "#8b9dc3", fontSize: 10 }}
                tickFormatter={(value) => `${value}%`}
              />
              <Radar
                name="Security"
                dataKey="value"
                stroke="#00bfff"
                fill="#00bfff"
                fillOpacity={0.3}
                strokeWidth={2}
                dot={{ fill: "#00bfff", strokeWidth: 2, r: 4 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(25,28,40,0.95)",
                  border: "1px solid rgba(0,191,255,0.3)",
                  borderRadius: "8px",
                  color: "#00bfff",
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg p-4">
          <h4 className="text-lg font-semibold text-[#00bfff] mb-4">
            Risk Summary
          </h4>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-[rgba(0,0,0,0.3)] rounded-lg">
                <div className="text-2xl font-bold text-red-400">
                  {
                    securityAnalysis.issues.filter(
                      (i) => i.severity === "critical" || i.severity === "high"
                    ).length
                  }
                </div>
                <div className="text-sm text-[#8b9dc3]">High Risk Issues</div>
              </div>
              <div className="text-center p-3 bg-[rgba(0,0,0,0.3)] rounded-lg">
                <div className="text-2xl font-bold text-yellow-400">
                  {
                    securityAnalysis.issues.filter(
                      (i) => i.severity === "medium"
                    ).length
                  }
                </div>
                <div className="text-sm text-[#8b9dc3]">Medium Risk Issues</div>
              </div>
            </div>

            <div
              className="p-4 rounded-lg border"
              style={{
                borderColor:
                  securityAnalysis.riskLevel === "critical"
                    ? "rgba(239, 68, 68, 0.5)"
                    : securityAnalysis.riskLevel === "high"
                      ? "rgba(248, 113, 113, 0.5)"
                      : securityAnalysis.riskLevel === "medium"
                        ? "rgba(251, 191, 36, 0.5)"
                        : "rgba(34, 197, 94, 0.5)",
                backgroundColor:
                  securityAnalysis.riskLevel === "critical"
                    ? "rgba(239, 68, 68, 0.1)"
                    : securityAnalysis.riskLevel === "high"
                      ? "rgba(248, 113, 113, 0.1)"
                      : securityAnalysis.riskLevel === "medium"
                        ? "rgba(251, 191, 36, 0.1)"
                        : "rgba(34, 197, 94, 0.1)",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                {securityAnalysis.riskLevel === "critical" ? (
                  <XCircle className="h-5 w-5 text-red-500" />
                ) : securityAnalysis.riskLevel === "high" ? (
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                ) : securityAnalysis.riskLevel === "medium" ? (
                  <AlertTriangle className="h-5 w-5 text-yellow-400" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-400" />
                )}
                <span
                  className={`font-semibold ${getRiskLevelColor(securityAnalysis.riskLevel)}`}
                >
                  {securityAnalysis.riskLevel.toUpperCase()} RISK LEVEL
                </span>
              </div>
              <p className="text-sm text-[#8b9dc3]">
                {securityAnalysis.riskLevel === "critical"
                  ? "Immediate attention required. Critical vulnerabilities detected."
                  : securityAnalysis.riskLevel === "high"
                    ? "High-priority security issues found. Review recommended."
                    : securityAnalysis.riskLevel === "medium"
                      ? "Some security concerns identified. Consider improvements."
                      : "Low security risk. Transaction appears safe."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {securityAnalysis.issues.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-[#00bfff]">
            Security Issues & Recommendations
          </h4>
          {securityAnalysis.issues.map((issue) => (
            <div
              key={issue.id}
              className={`border rounded-lg p-4 ${getSeverityColor(issue.severity)}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {getSeverityIcon(issue.severity)}
                  {getTypeIcon(issue.type)}
                  <div>
                    <h5 className="font-semibold">{issue.title}</h5>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {issue.severity.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {issue.type.replace("_", " ").toUpperCase()}
                      </Badge>
                      <span className="text-xs opacity-75">
                        Confidence: {issue.confidence}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium mb-1">Description:</div>
                  <p className="text-sm opacity-90">{issue.description}</p>
                </div>

                <div>
                  <div className="text-sm font-medium mb-1">
                    Recommendation:
                  </div>
                  <p className="text-sm opacity-90">{issue.recommendation}</p>
                </div>

                {issue.references && issue.references.length > 0 && (
                  <div>
                    <div className="text-sm font-medium mb-1">References:</div>
                    <div className="flex flex-wrap gap-2">
                      {issue.references.map((ref, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-xs"
                        >
                          {ref}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {securityAnalysis.issues.length === 0 && (
        <div className="text-center py-8">
          <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-green-400 mb-2">
            No Security Issues Detected
          </h4>
          <p className="text-[#8b9dc3]">
            The transaction appears to be secure based on our analysis. However,
            always perform thorough testing and audits for production code.
          </p>
        </div>
      )}
    </div>
  );
};

export default SecurityAnalyzer;
