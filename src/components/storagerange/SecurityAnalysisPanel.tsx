import React from "react";
import { Card } from "@/components/global/Card";
import { Badge } from "@/components/global/Badge";
import { Alert } from "@/components/global/Alert";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Info,
  Shield,
  XCircle,
} from "lucide-react";
import type { ProcessedStorageData } from "@/lib/storagerange/processors/storageProcessor";

interface SecurityAnalysisPanelProps {
  storageData: ProcessedStorageData;
  contractAddress: string;
  className?: string;
}

export const SecurityAnalysisPanel: React.FC<SecurityAnalysisPanelProps> = ({
  storageData,
  contractAddress,
  className = "",
}) => {
  const { securityFlags, patterns, summary } = storageData;

  const flagsByLevel = securityFlags.reduce(
    (acc, flag) => {
      acc[flag.level].push(flag);
      return acc;
    },
    {
      info: [] as typeof securityFlags,
      warning: [] as typeof securityFlags,
      high: [] as typeof securityFlags,
      critical: [] as typeof securityFlags,
    },
  );

  const securityScore = Math.max(
    0,
    100 -
      flagsByLevel.critical.length * 30 -
      flagsByLevel.high.length * 20 -
      flagsByLevel.warning.length * 10,
  );

  const getSecurityIcon = (level: string) => {
    switch (level) {
      case "critical":
        return <XCircle className="h-4 w-4 text-red-400" />;
      case "high":
        return <AlertTriangle className="h-4 w-4 text-orange-400" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-400" />;
      case "info":
        return <Info className="h-4 w-4 text-blue-400" />;
      default:
        return <CheckCircle className="h-4 w-4 text-green-400" />;
    }
  };

  const getSecurityColor = (level: string) => {
    switch (level) {
      case "critical":
        return "border-red-500/50 text-red-400 bg-red-500/10";
      case "high":
        return "border-orange-500/50 text-orange-400 bg-orange-500/10";
      case "warning":
        return "border-yellow-500/50 text-yellow-400 bg-yellow-500/10";
      case "info":
        return "border-blue-500/50 text-blue-400 bg-blue-500/10";
      default:
        return "border-green-500/50 text-green-400 bg-green-500/10";
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-[#00bfff]" />
          <h4 className="text-lg font-semibold text-[#00bfff]">
            Security Analysis
          </h4>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#8b9dc3]">Security Score</span>
            <span className="text-2xl font-bold text-[#00bfff]">
              {securityScore}/100
            </span>
          </div>
          <div className="w-full bg-[rgba(0,191,255,0.1)] rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                securityScore >= 80
                  ? "bg-green-500"
                  : securityScore >= 60
                    ? "bg-yellow-500"
                    : "bg-red-500"
              }`}
              style={{ width: `${securityScore}%` }}
            ></div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400">
              {flagsByLevel.critical.length}
            </div>
            <div className="text-sm text-[#8b9dc3]">Critical</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-400">
              {flagsByLevel.high.length}
            </div>
            <div className="text-sm text-[#8b9dc3]">High</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">
              {flagsByLevel.warning.length}
            </div>
            <div className="text-sm text-[#8b9dc3]">Warning</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">
              {flagsByLevel.info.length}
            </div>
            <div className="text-sm text-[#8b9dc3]">Info</div>
          </div>
        </div>

        <div className="p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
          <h5 className="text-[#00bfff] font-medium mb-2">Contract Analysis</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-[#8b9dc3]">Type: </span>
              <Badge
                variant="outline"
                className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
              >
                {summary.contractType.toUpperCase()}
              </Badge>
            </div>
            {summary.implementationAddress && (
              <div>
                <span className="text-[#8b9dc3]">Implementation: </span>
                <span className="text-[#00bfff] font-mono text-xs">
                  {summary.implementationAddress.slice(0, 10)}...
                  {summary.implementationAddress.slice(-8)}
                </span>
              </div>
            )}
            {summary.isPaused !== undefined && (
              <div>
                <span className="text-[#8b9dc3]">Status: </span>
                <Badge
                  variant={summary.isPaused ? "destructive" : "outline"}
                  className={
                    summary.isPaused
                      ? "bg-red-500/20 border-red-500/50 text-red-400"
                      : "border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                  }
                >
                  {summary.isPaused ? "Paused" : "Active"}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </Card>

      {securityFlags.length > 0 && (
        <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
          <h4 className="text-lg font-semibold text-[#00bfff] mb-4">
            Security Findings
          </h4>

          <div className="space-y-3">
            {securityFlags.map((flag, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${getSecurityColor(flag.level)}`}
              >
                <div className="flex items-start gap-3">
                  {getSecurityIcon(flag.level)}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h5 className="font-medium">
                        {flag.type.replace("_", " ").toUpperCase()}
                      </h5>
                      <Badge
                        variant="outline"
                        className={getSecurityColor(flag.level)}
                      >
                        {flag.level.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm opacity-90">{flag.description}</p>
                    {flag.details && (
                      <div className="mt-2 text-xs opacity-75">
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(flag.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
        <h4 className="text-lg font-semibold text-[#00bfff] mb-4">
          Pattern Security Assessment
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h5 className="text-[#00bfff] font-medium mb-3">
              Security Features
            </h5>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded bg-[rgba(25,28,40,0.4)]">
                <span className="text-[#8b9dc3]">Proxy Pattern</span>
                <Badge
                  variant="outline"
                  className={
                    patterns.proxyPattern
                      ? "border-green-500/50 text-green-400 bg-green-500/10"
                      : "border-red-500/50 text-red-400 bg-red-500/10"
                  }
                >
                  {patterns.proxyPattern ? "DETECTED" : "NOT FOUND"}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-[rgba(25,28,40,0.4)]">
                <span className="text-[#8b9dc3]">Access Control</span>
                <Badge
                  variant="outline"
                  className={
                    patterns.accessControl
                      ? "border-green-500/50 text-green-400 bg-green-500/10"
                      : "border-red-500/50 text-red-400 bg-red-500/10"
                  }
                >
                  {patterns.accessControl ? "DETECTED" : "NOT FOUND"}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-[rgba(25,28,40,0.4)]">
                <span className="text-[#8b9dc3]">Pausable</span>
                <Badge
                  variant="outline"
                  className={
                    patterns.pausable
                      ? "border-green-500/50 text-green-400 bg-green-500/10"
                      : "border-yellow-500/50 text-yellow-400 bg-yellow-500/10"
                  }
                >
                  {patterns.pausable ? "DETECTED" : "NOT FOUND"}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-[rgba(25,28,40,0.4)]">
                <span className="text-[#8b9dc3]">Upgradeable</span>
                <Badge
                  variant="outline"
                  className={
                    patterns.upgradeable
                      ? "border-yellow-500/50 text-yellow-400 bg-yellow-500/10"
                      : "border-green-500/50 text-green-400 bg-green-500/10"
                  }
                >
                  {patterns.upgradeable ? "DETECTED" : "NOT FOUND"}
                </Badge>
              </div>
            </div>
          </div>

          <div>
            <h5 className="text-[#00bfff] font-medium mb-3">Recommendations</h5>
            <div className="space-y-2 text-sm">
              {!patterns.accessControl && (
                <Alert variant="warning" className="p-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Consider implementing access control patterns</span>
                </Alert>
              )}
              {patterns.upgradeable && (
                <Alert variant="info" className="p-2">
                  <Info className="h-4 w-4" />
                  <span>Monitor proxy admin permissions carefully</span>
                </Alert>
              )}
              {summary.isPaused && (
                <Alert variant="warning" className="p-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Contract is currently paused</span>
                </Alert>
              )}
              {securityFlags.length === 0 && (
                <Alert variant="success" className="p-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>No immediate security concerns detected</span>
                </Alert>
              )}
            </div>
          </div>
        </div>
      </Card>

      {securityFlags.length === 0 && (
        <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-green-400 mb-2">
              No Security Issues Detected
            </h4>
            <p className="text-[#8b9dc3]">
              The storage analysis did not identify any immediate security
              concerns in the contract storage layout.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};
