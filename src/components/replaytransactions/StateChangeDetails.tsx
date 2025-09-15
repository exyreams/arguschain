import React, { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Badge, Button } from "@/components/global";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Coins,
  Copy,
  Database,
  ExternalLink,
  Hash,
  Info,
  Minus,
  Shield,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import type { StorageInterpretation } from "@/lib/replaytransactions/types";

interface StateChangeDetailsProps {
  stateChange: {
    id: string;
    address: string;
    contractName?: string;
    slot: string;
    beforeValue: string;
    afterValue: string;
    interpretation: StorageInterpretation;
    changeType: "increase" | "decrease" | "set" | "clear";
    changeAmount?: string;
    transactionIndex?: number;
    gasUsed?: number;
    timestamp: number;
    isSecurityRelevant: boolean;
    isPYUSDRelated: boolean;
  };
  relatedChanges?: Array<{
    id: string;
    address: string;
    slot: string;
    interpretation: StorageInterpretation;
    changeType: string;
  }>;
  className?: string;
  onClose?: () => void;
}

interface StorageSlotInfo {
  name: string;
  description: string;
  dataType: string;
  purpose: string;
  securityImplications?: string;
  relatedSlots?: string[];
}

export const StateChangeDetails: React.FC<StateChangeDetailsProps> = ({
  stateChange,
  relatedChanges = [],
  className,
  onClose,
}) => {
  const [showRawData, setShowRawData] = useState(false);
  const [showRelatedChanges, setShowRelatedChanges] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const storageSlotInfo = useMemo((): StorageSlotInfo => {
    const { interpretation } = stateChange;

    switch (interpretation.type) {
      case "balance":
        return {
          name: "Balance Mapping",
          description: "Individual account balance in the PYUSD token contract",
          dataType: "mapping(address => uint256)",
          purpose: "Tracks the token balance for each holder address",
          securityImplications:
            "Large balance changes may indicate significant transfers or potential security events",
          relatedSlots: ["1", "2"],
        };
      case "allowance":
        return {
          name: "Allowance Mapping",
          description:
            "Approved spending allowance between owner and spender addresses",
          dataType: "mapping(address => mapping(address => uint256))",
          purpose:
            "Enables delegated spending through approve/transferFrom pattern",
          securityImplications:
            "High allowances may pose security risks if spender is compromised",
          relatedSlots: ["1"],
        };
      case "total_supply":
        return {
          name: "Total Supply",
          description: "Total amount of PYUSD tokens in circulation",
          dataType: "uint256",
          purpose: "Tracks the total token supply for mint/burn operations",
          securityImplications:
            "Unexpected supply changes may indicate unauthorized minting or burning",
          relatedSlots: ["1"],
        };
      case "owner":
        return {
          name: "Contract Owner",
          description:
            "Address with administrative privileges over the contract",
          dataType: "address",
          purpose:
            "Controls critical contract functions like minting, pausing, and upgrades",
          securityImplications:
            "Owner changes are critical security events requiring immediate attention",
          relatedSlots: ["7"],
        };
      case "paused":
        return {
          name: "Pause State",
          description: "Boolean flag indicating whether the contract is paused",
          dataType: "bool",
          purpose: "Emergency mechanism to halt contract operations",
          securityImplications:
            "Pause state changes affect all token operations and should be monitored",
          relatedSlots: ["6"],
        };
      default:
        return {
          name: "Unknown Storage Slot",
          description: "Storage slot with unknown or custom purpose",
          dataType: "bytes32",
          purpose: "Custom contract storage, requires manual analysis",
          securityImplications:
            "Unknown slots should be investigated for potential security relevance",
        };
    }
  }, [stateChange.interpretation]);

  const changeAnalysis = useMemo(() => {
    const beforeNum = BigInt(stateChange.beforeValue);
    const afterNum = BigInt(stateChange.afterValue);
    const changeMagnitude = afterNum - beforeNum;

    let impactLevel: "low" | "medium" | "high" | "critical" = "low";
    let impactDescription = "";

    if (stateChange.interpretation.type === "total_supply") {
      const changeAmount = Number(changeMagnitude) / 1e6;
      if (Math.abs(changeAmount) > 1000000) {
        impactLevel = "critical";
        impactDescription = "Large supply change (>1M PYUSD)";
      } else if (Math.abs(changeAmount) > 100000) {
        impactLevel = "high";
        impactDescription = "Significant supply change (>100K PYUSD)";
      } else if (Math.abs(changeAmount) > 10000) {
        impactLevel = "medium";
        impactDescription = "Moderate supply change (>10K PYUSD)";
      } else {
        impactLevel = "low";
        impactDescription = "Small supply change";
      }
    } else if (stateChange.interpretation.type === "balance") {
      const changeAmount = Number(changeMagnitude) / 1e6;
      if (Math.abs(changeAmount) > 100000) {
        impactLevel = "high";
        impactDescription = "Large balance change (>100K PYUSD)";
      } else if (Math.abs(changeAmount) > 10000) {
        impactLevel = "medium";
        impactDescription = "Significant balance change (>10K PYUSD)";
      } else {
        impactLevel = "low";
        impactDescription = "Normal balance change";
      }
    } else if (stateChange.interpretation.type === "owner") {
      impactLevel = "critical";
      impactDescription = "Contract ownership change";
    } else if (stateChange.interpretation.type === "paused") {
      impactLevel = "high";
      impactDescription = "Contract pause state change";
    }

    return {
      magnitude: changeMagnitude,
      impactLevel,
      impactDescription,
      isIncrease: changeMagnitude > 0n,
      isDecrease: changeMagnitude < 0n,
      percentageChange:
        beforeNum > 0n ? Number((changeMagnitude * 100n) / beforeNum) : 0,
    };
  }, [stateChange]);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getChangeTypeDisplay = (changeType: string) => {
    switch (changeType) {
      case "increase":
        return { icon: TrendingUp, color: "text-green-500", bg: "bg-green-50" };
      case "decrease":
        return { icon: TrendingDown, color: "text-red-500", bg: "bg-red-50" };
      case "set":
        return { icon: Activity, color: "text-blue-500", bg: "bg-blue-50" };
      case "clear":
        return { icon: Minus, color: "text-gray-500", bg: "bg-gray-50" };
      default:
        return { icon: Activity, color: "text-gray-500", bg: "bg-gray-50" };
    }
  };

  const changeDisplay = getChangeTypeDisplay(stateChange.changeType);
  const ChangeIcon = changeDisplay.icon;

  return (
    <div className={cn("bg-card rounded-lg border p-6 space-y-6", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={cn("p-2 rounded-lg", changeDisplay.bg)}>
            <ChangeIcon className={cn("h-5 w-5", changeDisplay.color)} />
          </div>
          <div>
            <h2 className="text-xl font-semibold">State Change Details</h2>
            <p className="text-sm text-muted-foreground">
              {stateChange.contractName ||
                `${stateChange.address.slice(0, 8)}...${stateChange.address.slice(-6)}`}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {stateChange.isPYUSDRelated && (
            <Badge variant="default" className="bg-yellow-100 text-yellow-800">
              <Coins className="h-3 w-3 mr-1" />
              PYUSD
            </Badge>
          )}
          {stateChange.isSecurityRelevant && (
            <Badge variant="destructive">
              <Shield className="h-3 w-3 mr-1" />
              Security
            </Badge>
          )}
          {onClose && (
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>

      <div
        className={cn(
          "p-4 rounded-lg border-l-4",
          changeAnalysis.impactLevel === "critical" &&
            "border-red-500 bg-red-50",
          changeAnalysis.impactLevel === "high" &&
            "border-orange-500 bg-orange-50",
          changeAnalysis.impactLevel === "medium" &&
            "border-yellow-500 bg-yellow-50",
          changeAnalysis.impactLevel === "low" &&
            "border-green-500 bg-green-50",
        )}
      >
        <div className="flex items-center space-x-2 mb-2">
          {changeAnalysis.impactLevel === "critical" && (
            <AlertTriangle className="h-5 w-5 text-red-500" />
          )}
          {changeAnalysis.impactLevel === "high" && (
            <AlertTriangle className="h-5 w-5 text-orange-500" />
          )}
          {changeAnalysis.impactLevel === "medium" && (
            <Info className="h-5 w-5 text-yellow-500" />
          )}
          {changeAnalysis.impactLevel === "low" && (
            <CheckCircle className="h-5 w-5 text-green-500" />
          )}
          <h3 className="font-semibold capitalize">
            {changeAnalysis.impactLevel} Impact
          </h3>
        </div>
        <p className="text-sm">{changeAnalysis.impactDescription}</p>
        {changeAnalysis.percentageChange !== 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            {changeAnalysis.percentageChange > 0 ? "+" : ""}
            {changeAnalysis.percentageChange.toFixed(2)}% change
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center">
            <Database className="h-5 w-5 mr-2" />
            Storage Slot Information
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-background rounded border">
              <div>
                <p className="font-medium">{storageSlotInfo.name}</p>
                <p className="text-sm text-muted-foreground">
                  {storageSlotInfo.description}
                </p>
              </div>
              <Badge variant="outline">{storageSlotInfo.dataType}</Badge>
            </div>

            <div className="p-3 bg-background rounded border">
              <p className="font-medium mb-1">Purpose</p>
              <p className="text-sm text-muted-foreground">
                {storageSlotInfo.purpose}
              </p>
            </div>

            {storageSlotInfo.securityImplications && (
              <div className="p-3 bg-background rounded border border-orange-200">
                <p className="font-medium mb-1 text-orange-700">
                  Security Implications
                </p>
                <p className="text-sm text-orange-600">
                  {storageSlotInfo.securityImplications}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Change Analysis
          </h3>

          <div className="space-y-3">
            <div className="p-3 bg-background rounded border">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium">Value Change</p>
                <Badge
                  variant={
                    stateChange.changeType === "increase"
                      ? "default"
                      : stateChange.changeType === "decrease"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {stateChange.changeType}
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Before:</span>
                  <div className="flex items-center space-x-2">
                    <code className="bg-muted px-2 py-1 rounded text-xs">
                      {stateChange.interpretation.metadata?.rawValue ||
                        stateChange.beforeValue}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(stateChange.beforeValue, "before")
                      }
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-center">
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">After:</span>
                  <div className="flex items-center space-x-2">
                    <code className="bg-muted px-2 py-1 rounded text-xs">
                      {stateChange.interpretation.formattedValue}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(stateChange.afterValue, "after")
                      }
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-background rounded border">
              <p className="font-medium mb-2">Transaction Context</p>
              <div className="space-y-2 text-sm">
                {stateChange.transactionIndex !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Transaction Index:
                    </span>
                    <Badge variant="outline">
                      #{stateChange.transactionIndex}
                    </Badge>
                  </div>
                )}

                {stateChange.gasUsed && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Gas Used:</span>
                    <div className="flex items-center space-x-1">
                      <Zap className="h-3 w-3 text-yellow-500" />
                      <span>{stateChange.gasUsed.toLocaleString()}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Timestamp:</span>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3 text-blue-500" />
                    <span className="text-xs">
                      {formatTimestamp(stateChange.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center">
            <Hash className="h-5 w-5 mr-2" />
            Technical Details
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRawData(!showRawData)}
          >
            {showRawData ? "Hide" : "Show"} Raw Data
            {showRawData ? (
              <ChevronDown className="h-4 w-4 ml-2" />
            ) : (
              <ChevronRight className="h-4 w-4 ml-2" />
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 bg-background rounded border">
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium">Contract Address</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(stateChange.address, "address")}
                className="h-6 w-6 p-0"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <code className="text-xs bg-muted p-2 rounded block break-all">
              {stateChange.address}
            </code>
          </div>

          <div className="p-3 bg-background rounded border">
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium">Storage Slot</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(stateChange.slot, "slot")}
                className="h-6 w-6 p-0"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <code className="text-xs bg-muted p-2 rounded block break-all">
              {stateChange.slot}
            </code>
          </div>
        </div>

        {showRawData && (
          <div className="space-y-3">
            <div className="p-3 bg-background rounded border">
              <p className="font-medium mb-2">Raw Before Value</p>
              <code className="text-xs bg-muted p-2 rounded block break-all">
                {stateChange.beforeValue}
              </code>
            </div>

            <div className="p-3 bg-background rounded border">
              <p className="font-medium mb-2">Raw After Value</p>
              <code className="text-xs bg-muted p-2 rounded block break-all">
                {stateChange.afterValue}
              </code>
            </div>

            {stateChange.interpretation.metadata && (
              <div className="p-3 bg-background rounded border">
                <p className="font-medium mb-2">Interpretation Metadata</p>
                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                  {JSON.stringify(stateChange.interpretation.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      {relatedChanges.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Related Changes ({relatedChanges.length})
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRelatedChanges(!showRelatedChanges)}
            >
              {showRelatedChanges ? "Hide" : "Show"}
              {showRelatedChanges ? (
                <ChevronDown className="h-4 w-4 ml-2" />
              ) : (
                <ChevronRight className="h-4 w-4 ml-2" />
              )}
            </Button>
          </div>

          {showRelatedChanges && (
            <div className="space-y-2">
              {relatedChanges.map((change, index) => (
                <div
                  key={change.id}
                  className="p-3 bg-background rounded border"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline" className="text-xs">
                        {change.changeType}
                      </Badge>
                      <span className="text-sm font-medium">
                        {change.interpretation.description}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {change.slot}
                      </code>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {change.interpretation.formattedValue}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {copiedField && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm">Copied {copiedField} to clipboard</span>
          </div>
        </div>
      )}
    </div>
  );
};
