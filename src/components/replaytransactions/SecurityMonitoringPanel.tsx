import React, { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Badge, Button } from "@/components/global";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Bell,
  BellOff,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Database,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Filter,
  Info,
  Shield,
  TrendingUp,
  User,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ProcessedReplayData } from "@/lib/replaytransactions/types";

interface SecurityMonitoringPanelProps {
  processedData: ProcessedReplayData;
  className?: string;
  onSecurityFlagSelect?: (flag: SecurityFlag) => void;
}

interface SecurityFlag {
  id: string;
  type:
    | "admin_function"
    | "code_change"
    | "large_transfer"
    | "ownership_change"
    | "pause_state"
    | "supply_change"
    | "suspicious_pattern";
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  details: string;
  timestamp: number;
  transactionIndex?: number;
  address?: string;
  value?: string;
  recommendation: string;
  acknowledged: boolean;
  metadata?: {
    functionName?: string;
    oldValue?: string;
    newValue?: string;
    amount?: string;
    gasUsed?: number;
    [key: string]: any;
  };
}

interface SecurityMetrics {
  totalFlags: number;
  criticalFlags: number;
  highFlags: number;
  mediumFlags: number;
  lowFlags: number;
  acknowledgedFlags: number;
  riskScore: number;
  lastUpdate: number;
}

interface TimelineEvent {
  timestamp: number;
  severity: SecurityFlag["severity"];
  count: number;
  flags: SecurityFlag[];
}

export const SecurityMonitoringPanel: React.FC<
  SecurityMonitoringPanelProps
> = ({ processedData, className, onSecurityFlagSelect }) => {
  const [selectedSeverity, setSelectedSeverity] = useState<
    SecurityFlag["severity"] | "all"
  >("all");
  const [selectedType, setSelectedType] = useState<
    SecurityFlag["type"] | "all"
  >("all");
  const [showAcknowledged, setShowAcknowledged] = useState(false);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [expandedFlag, setExpandedFlag] = useState<string | null>(null);
  const [acknowledgedFlags, setAcknowledgedFlags] = useState<Set<string>>(
    new Set(),
  );

  const securityFlags = useMemo((): SecurityFlag[] => {
    const flags: SecurityFlag[] = [];

    if (processedData.securityFlags) {
      processedData.securityFlags.forEach((flag, index) => {
        flags.push({
          id: `flag-${index}`,
          type: flag.type as SecurityFlag["type"],
          severity: flag.severity as SecurityFlag["severity"],
          title: flag.title,
          description: flag.description,
          details: flag.details || flag.description,
          timestamp: Date.now() - index * 60000,
          transactionIndex: flag.transactionIndex,
          address: flag.address,
          value: flag.value,
          recommendation:
            flag.recommendation ||
            getDefaultRecommendation(flag.type as SecurityFlag["type"]),
          acknowledged: acknowledgedFlags.has(`flag-${index}`),
          metadata: flag.metadata,
        });
      });
    }

    if (processedData.traceAnalysis) {
      const traceAnalysis = processedData.traceAnalysis;

      traceAnalysis.functionCalls?.forEach((call, index) => {
        if (isAdminFunction(call.name || call.signature)) {
          flags.push({
            id: `admin-${index}`,
            type: "admin_function",
            severity: "high",
            title: "Administrative Function Called",
            description: `Admin function ${call.name || call.signature} was executed`,
            details: `The administrative function ${call.name || call.signature} was called, which could affect contract security or operations.`,
            timestamp: Date.now() - index * 30000,
            transactionIndex: index,
            address: call.contractAddress,
            recommendation:
              "Verify that this administrative action was authorized and expected.",
            acknowledged: acknowledgedFlags.has(`admin-${index}`),
            metadata: {
              functionName: call.name || call.signature,
              gasUsed: call.gasUsed,
            },
          });
        }
      });
    }

    if (processedData.stateDiffAnalysis) {
      const stateDiff = processedData.stateDiffAnalysis;

      stateDiff.storageChanges?.forEach((change, index) => {
        if (isOwnershipSlot(change.slot)) {
          flags.push({
            id: `ownership-${index}`,
            type: "ownership_change",
            severity: "critical",
            title: "Contract Ownership Changed",
            description: "Contract ownership has been transferred",
            details: `Contract ownership changed from ${change.before} to ${change.after}`,
            timestamp: Date.now() - index * 45000,
            address: change.address,
            recommendation:
              "Immediately verify the legitimacy of this ownership transfer and ensure the new owner is trusted.",
            acknowledged: acknowledgedFlags.has(`ownership-${index}`),
            metadata: {
              oldValue: change.before,
              newValue: change.after,
              slot: change.slot,
            },
          });
        }
      });
    }

    if (processedData.tokenAnalysis) {
      processedData.tokenAnalysis.tokenTransfers?.forEach((transfer, index) => {
        const amount = Number(transfer.amount) / 1e6;
        if (amount > 100000) {
          flags.push({
            id: `large-transfer-${index}`,
            type: "large_transfer",
            severity: amount > 1000000 ? "critical" : "high",
            title: "Large Token Transfer Detected",
            description: `Large PYUSD transfer of ${transfer.formattedAmount}`,
            details: `A significant token transfer was detected from ${transfer.from} to ${transfer.to} for ${transfer.formattedAmount}.`,
            timestamp: Date.now() - index * 20000,
            transactionIndex: transfer.transactionIndex,
            recommendation:
              "Monitor this large transfer for potential security implications or market impact.",
            acknowledged: acknowledgedFlags.has(`large-transfer-${index}`),
            metadata: {
              amount: transfer.formattedAmount,
              from: transfer.from,
              to: transfer.to,
            },
          });
        }
      });
    }

    return flags.sort((a, b) => b.timestamp - a.timestamp);
  }, [processedData, acknowledgedFlags]);

  const securityMetrics = useMemo((): SecurityMetrics => {
    const totalFlags = securityFlags.length;
    const criticalFlags = securityFlags.filter(
      (f) => f.severity === "critical",
    ).length;
    const highFlags = securityFlags.filter((f) => f.severity === "high").length;
    const mediumFlags = securityFlags.filter(
      (f) => f.severity === "medium",
    ).length;
    const lowFlags = securityFlags.filter((f) => f.severity === "low").length;
    const acknowledgedFlags = securityFlags.filter(
      (f) => f.acknowledged,
    ).length;

    const riskScore = Math.min(
      100,
      criticalFlags * 25 + highFlags * 15 + mediumFlags * 8 + lowFlags * 3,
    );

    return {
      totalFlags,
      criticalFlags,
      highFlags,
      mediumFlags,
      lowFlags,
      acknowledgedFlags,
      riskScore,
      lastUpdate: Date.now(),
    };
  }, [securityFlags]);

  const filteredFlags = useMemo(() => {
    return securityFlags.filter((flag) => {
      if (selectedSeverity !== "all" && flag.severity !== selectedSeverity)
        return false;
      if (selectedType !== "all" && flag.type !== selectedType) return false;
      if (!showAcknowledged && flag.acknowledged) return false;
      return true;
    });
  }, [securityFlags, selectedSeverity, selectedType, showAcknowledged]);

  const timelineData = useMemo((): TimelineEvent[] => {
    const timeSlots = new Map<number, TimelineEvent>();
    const timeSlotSize = 5 * 60 * 1000;

    securityFlags.forEach((flag) => {
      const timeSlot = Math.floor(flag.timestamp / timeSlotSize) * timeSlotSize;

      if (!timeSlots.has(timeSlot)) {
        timeSlots.set(timeSlot, {
          timestamp: timeSlot,
          severity: "low",
          count: 0,
          flags: [],
        });
      }

      const event = timeSlots.get(timeSlot)!;
      event.count++;
      event.flags.push(flag);

      if (
        getSeverityWeight(flag.severity) > getSeverityWeight(event.severity)
      ) {
        event.severity = flag.severity;
      }
    });

    return Array.from(timeSlots.values()).sort(
      (a, b) => a.timestamp - b.timestamp,
    );
  }, [securityFlags]);

  const handleAcknowledgeFlag = (flagId: string) => {
    setAcknowledgedFlags((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(flagId)) {
        newSet.delete(flagId);
      } else {
        newSet.add(flagId);
      }
      return newSet;
    });
  };

  const handleExportReport = () => {
    const report = {
      timestamp: Date.now(),
      metrics: securityMetrics,
      flags: securityFlags,
      summary: {
        riskLevel:
          securityMetrics.riskScore > 75
            ? "High"
            : securityMetrics.riskScore > 50
              ? "Medium"
              : securityMetrics.riskScore > 25
                ? "Low"
                : "Minimal",
        recommendations: getTopRecommendations(securityFlags),
      },
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `security-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getSeverityDisplay = (severity: SecurityFlag["severity"]) => {
    switch (severity) {
      case "critical":
        return {
          color: "text-red-500",
          bg: "bg-red-50 border-red-200",
          icon: AlertTriangle,
          badge: "destructive" as const,
        };
      case "high":
        return {
          color: "text-orange-500",
          bg: "bg-orange-50 border-orange-200",
          icon: AlertCircle,
          badge: "destructive" as const,
        };
      case "medium":
        return {
          color: "text-yellow-500",
          bg: "bg-yellow-50 border-yellow-200",
          icon: Info,
          badge: "secondary" as const,
        };
      case "low":
        return {
          color: "text-blue-500",
          bg: "bg-blue-50 border-blue-200",
          icon: Info,
          badge: "outline" as const,
        };
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div
            className={cn(
              "p-2 rounded-lg",
              securityMetrics.riskScore > 75
                ? "bg-red-100"
                : securityMetrics.riskScore > 50
                  ? "bg-orange-100"
                  : securityMetrics.riskScore > 25
                    ? "bg-yellow-100"
                    : "bg-green-100",
            )}
          >
            <Shield
              className={cn(
                "h-5 w-5",
                securityMetrics.riskScore > 75
                  ? "text-red-500"
                  : securityMetrics.riskScore > 50
                    ? "text-orange-500"
                    : securityMetrics.riskScore > 25
                      ? "text-yellow-500"
                      : "text-green-500",
              )}
            />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Security Monitoring</h2>
            <p className="text-sm text-muted-foreground">
              Risk Score: {securityMetrics.riskScore}/100
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAlertsEnabled(!alertsEnabled)}
          >
            {alertsEnabled ? (
              <Bell className="h-4 w-4 mr-2" />
            ) : (
              <BellOff className="h-4 w-4 mr-2" />
            )}
            Alerts {alertsEnabled ? "On" : "Off"}
          </Button>

          <Button variant="outline" size="sm" onClick={handleExportReport}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Shield className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">Total Flags</span>
          </div>
          <p className="text-2xl font-bold">{securityMetrics.totalFlags}</p>
        </div>

        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium">Critical</span>
          </div>
          <p className="text-2xl font-bold text-red-500">
            {securityMetrics.criticalFlags}
          </p>
        </div>

        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center space-x-2 mb-2">
            <AlertCircle className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-medium">High</span>
          </div>
          <p className="text-2xl font-bold text-orange-500">
            {securityMetrics.highFlags}
          </p>
        </div>

        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Info className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium">Medium</span>
          </div>
          <p className="text-2xl font-bold text-yellow-500">
            {securityMetrics.mediumFlags}
          </p>
        </div>

        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">Acknowledged</span>
          </div>
          <p className="text-2xl font-bold text-green-500">
            {securityMetrics.acknowledgedFlags}
          </p>
        </div>

        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium">Risk Score</span>
          </div>
          <p
            className={cn(
              "text-2xl font-bold",
              securityMetrics.riskScore > 75
                ? "text-red-500"
                : securityMetrics.riskScore > 50
                  ? "text-orange-500"
                  : securityMetrics.riskScore > 25
                    ? "text-yellow-500"
                    : "text-green-500",
            )}
          >
            {securityMetrics.riskScore}
          </p>
        </div>
      </div>

      <div className="bg-card rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Activity className="h-5 w-5 mr-2" />
          Security Events Timeline
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={timelineData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={(value) => new Date(value).toLocaleTimeString()}
            />
            <YAxis />
            <RechartsTooltip
              labelFormatter={(value) => new Date(value).toLocaleString()}
              formatter={(value: number, name: string) => [
                value,
                "Security Events",
              ]}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#8b5cf6"
              fill="#8b5cf6"
              fillOpacity={0.3}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center space-x-4 bg-card rounded-lg border p-4">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters:</span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-sm">Severity:</span>
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value as any)}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="all">All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-sm">Type:</span>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as any)}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="all">All Types</option>
            <option value="admin_function">Admin Functions</option>
            <option value="ownership_change">Ownership Changes</option>
            <option value="large_transfer">Large Transfers</option>
            <option value="code_change">Code Changes</option>
            <option value="pause_state">Pause State</option>
          </select>
        </div>

        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={showAcknowledged}
            onChange={(e) => setShowAcknowledged(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">Show Acknowledged</span>
        </label>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            Security Flags ({filteredFlags.length})
          </h3>
          {filteredFlags.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                filteredFlags.forEach((flag) => {
                  if (!flag.acknowledged) {
                    handleAcknowledgeFlag(flag.id);
                  }
                });
              }}
            >
              Acknowledge All
            </Button>
          )}
        </div>

        {filteredFlags.length === 0 ? (
          <div className="bg-card rounded-lg border p-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-medium">No security flags found</p>
            <p className="text-muted-foreground">
              {securityFlags.length === 0
                ? "No security issues detected in this transaction"
                : "All security flags have been filtered out"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFlags.map((flag) => {
              const display = getSeverityDisplay(flag.severity);
              const Icon = display.icon;
              const isExpanded = expandedFlag === flag.id;

              return (
                <div
                  key={flag.id}
                  className={cn("rounded-lg border p-4", display.bg)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <Icon className={cn("h-5 w-5 mt-0.5", display.color)} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-semibold">{flag.title}</h4>
                          <Badge variant={display.badge}>{flag.severity}</Badge>
                          {flag.acknowledged && (
                            <Badge variant="outline">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Acknowledged
                            </Badge>
                          )}
                        </div>

                        <p className="text-sm text-muted-foreground mb-2">
                          {flag.description}
                        </p>

                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>
                              {new Date(flag.timestamp).toLocaleString()}
                            </span>
                          </div>
                          {flag.transactionIndex !== undefined && (
                            <div className="flex items-center space-x-1">
                              <Database className="h-3 w-3" />
                              <span>TX #{flag.transactionIndex}</span>
                            </div>
                          )}
                          {flag.address && (
                            <div className="flex items-center space-x-1">
                              <User className="h-3 w-3" />
                              <span>
                                {flag.address.slice(0, 8)}...
                                {flag.address.slice(-6)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setExpandedFlag(isExpanded ? null : flag.id)
                        }
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAcknowledgeFlag(flag.id)}
                      >
                        {flag.acknowledged ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSecurityFlagSelect?.(flag)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      <div>
                        <h5 className="font-medium mb-1">Details</h5>
                        <p className="text-sm text-muted-foreground">
                          {flag.details}
                        </p>
                      </div>

                      <div>
                        <h5 className="font-medium mb-1">Recommendation</h5>
                        <p className="text-sm text-muted-foreground">
                          {flag.recommendation}
                        </p>
                      </div>

                      {flag.metadata &&
                        Object.keys(flag.metadata).length > 0 && (
                          <div>
                            <h5 className="font-medium mb-1">
                              Additional Information
                            </h5>
                            <div className="bg-background rounded p-2">
                              <pre className="text-xs overflow-x-auto">
                                {JSON.stringify(flag.metadata, null, 2)}
                              </pre>
                            </div>
                          </div>
                        )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

function isAdminFunction(functionName: string): boolean {
  const adminFunctions = [
    "transferOwnership",
    "renounceOwnership",
    "pause",
    "unpause",
    "mint",
    "burn",
    "setMinter",
    "removeMinter",
    "upgrade",
    "initialize",
  ];

  return adminFunctions.some((fn) =>
    functionName.toLowerCase().includes(fn.toLowerCase()),
  );
}

function isOwnershipSlot(slot: string): boolean {
  const ownershipSlots = [
    "0x6",
    "0x0000000000000000000000000000000000000000000000000000000000000006",
  ];
  return ownershipSlots.includes(slot);
}

function getSeverityWeight(severity: SecurityFlag["severity"]): number {
  switch (severity) {
    case "critical":
      return 4;
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
    default:
      return 0;
  }
}

function getDefaultRecommendation(type: SecurityFlag["type"]): string {
  switch (type) {
    case "admin_function":
      return "Verify that this administrative action was authorized and expected.";
    case "code_change":
      return "Immediately review the code changes and ensure they are legitimate.";
    case "large_transfer":
      return "Monitor this large transfer for potential security implications.";
    case "ownership_change":
      return "Verify the legitimacy of this ownership transfer immediately.";
    case "pause_state":
      return "Confirm that the pause state change was intentional and authorized.";
    case "supply_change":
      return "Review the supply change to ensure it aligns with expected operations.";
    default:
      return "Review this security event and take appropriate action if necessary.";
  }
}

function getTopRecommendations(flags: SecurityFlag[]): string[] {
  const recommendations = new Set<string>();

  flags
    .filter((f) => f.severity === "critical" || f.severity === "high")
    .slice(0, 5)
    .forEach((f) => recommendations.add(f.recommendation));

  return Array.from(recommendations);
}
