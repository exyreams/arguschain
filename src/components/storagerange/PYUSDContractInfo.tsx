import React from "react";
import { Card } from "@/components/global/Card";
import { Badge } from "@/components/global/Badge";
import {
  AlertTriangle,
  CheckCircle,
  Copy,
  ExternalLink,
  Info,
  Pause,
  Play,
  Shield,
  Users,
} from "lucide-react";
import type { ProcessedStorageData } from "@/lib/storagerange/processors/storageProcessor";

interface PYUSDContractInfoProps {
  processedData: ProcessedStorageData;
  contractAddress: string;
  className?: string;
}

interface RoleInfo {
  name: string;
  description: string;
  holders?: string[];
  isActive: boolean;
}

export const PYUSDContractInfo: React.FC<PYUSDContractInfoProps> = ({
  processedData,
  contractAddress,
  className = "",
}) => {
  const { summary, patterns, securityFlags, categories } = processedData;

  const formatPYUSDAmount = (amount: number): string => {
    const formatted = (amount / 1e6).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });
    return `${formatted} PYUSD`;
  };

  const getRoleInfo = (): RoleInfo[] => {
    const roles: RoleInfo[] = [];

    const knownRoles = {
      MINTER_ROLE: {
        name: "Minter Role",
        description: "Can mint new PYUSD tokens",
        slot: "0x523a704056dcd17bcbde8daf7c077f098d4c0543350248342941a5f0bd09013b",
      },
      PAUSER_ROLE: {
        name: "Pauser Role",
        description: "Can pause/unpause contract operations",
        slot: "0xe79898c174bd7837e39256eb383695fecfbd06b222fb859d684c784cbd5997bb",
      },
      TOKEN_CONTROLLER_ROLE: {
        name: "Token Controller Role",
        description: "Can control token operations and configurations",
        slot: "0x7a8dc26796a1e50e6e190b70259f58f6a4edd5b21680169636c3b97720af2ffc",
      },
    };

    Object.entries(knownRoles).forEach(([roleKey, roleData]) => {
      const roleSlot = processedData.slots.find(
        (slot) => slot.slot === roleData.slot,
      );
      if (roleSlot) {
        roles.push({
          name: roleData.name,
          description: roleData.description,
          isActive: roleSlot.value !== "0x0",
        });
      }
    });

    return roles;
  };

  const roleInfo = getRoleInfo();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const shortenAddress = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
        <div className="flex items-center gap-2 mb-4">
          <Info className="h-5 w-5 text-[#00bfff]" />
          <h3 className="text-lg font-semibold text-[#00bfff]">
            PYUSD Contract Information
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm text-[#8b9dc3] font-medium">
                Contract Address
              </label>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-[#00bfff] text-sm">
                  {shortenAddress(contractAddress)}
                </span>
                <button
                  onClick={() => copyToClipboard(contractAddress)}
                  className="text-[#8b9dc3] hover:text-[#00bfff] transition-colors"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <a
                  href={`https://etherscan.io/address/${contractAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#8b9dc3] hover:text-[#00bfff] transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div>
              <label className="text-sm text-[#8b9dc3] font-medium">
                Contract Type
              </label>
              <div className="mt-1">
                <Badge
                  variant="outline"
                  className={`${
                    summary.contractType === "proxy"
                      ? "border-purple-500/50 text-purple-400 bg-purple-500/10"
                      : "border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                  }`}
                >
                  {summary.contractType.toUpperCase()}
                </Badge>
              </div>
            </div>

            {summary.implementationAddress && (
              <div>
                <label className="text-sm text-[#8b9dc3] font-medium">
                  Implementation
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-[#00bfff] text-sm">
                    {shortenAddress(summary.implementationAddress)}
                  </span>
                  <button
                    onClick={() =>
                      copyToClipboard(summary.implementationAddress!)
                    }
                    className="text-[#8b9dc3] hover:text-[#00bfff] transition-colors"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {summary.adminAddress && (
              <div>
                <label className="text-sm text-[#8b9dc3] font-medium">
                  Proxy Admin
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-[#00bfff] text-sm">
                    {shortenAddress(summary.adminAddress)}
                  </span>
                  <button
                    onClick={() => copyToClipboard(summary.adminAddress!)}
                    className="text-[#8b9dc3] hover:text-[#00bfff] transition-colors"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {summary.totalSupply && (
              <div>
                <label className="text-sm text-[#8b9dc3] font-medium">
                  Total Supply
                </label>
                <div className="mt-1">
                  <span className="text-xl font-bold text-[#00bfff]">
                    {formatPYUSDAmount(summary.totalSupply)}
                  </span>
                </div>
              </div>
            )}

            {summary.isPaused !== undefined && (
              <div>
                <label className="text-sm text-[#8b9dc3] font-medium">
                  Contract Status
                </label>
                <div className="flex items-center gap-2 mt-1">
                  {summary.isPaused ? (
                    <>
                      <Pause className="h-4 w-4 text-red-400" />
                      <Badge
                        variant="destructive"
                        className="bg-red-500/20 border-red-500/50 text-red-400"
                      >
                        PAUSED
                      </Badge>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 text-green-400" />
                      <Badge
                        variant="outline"
                        className="border-green-500/50 text-green-400 bg-green-500/10"
                      >
                        ACTIVE
                      </Badge>
                    </>
                  )}
                </div>
              </div>
            )}

            {summary.version && (
              <div>
                <label className="text-sm text-[#8b9dc3] font-medium">
                  Version
                </label>
                <div className="mt-1">
                  <Badge
                    variant="outline"
                    className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                  >
                    v{summary.version}
                  </Badge>
                </div>
              </div>
            )}

            <div>
              <label className="text-sm text-[#8b9dc3] font-medium">
                Storage Slots Analyzed
              </label>
              <div className="mt-1">
                <span className="text-lg font-semibold text-[#00bfff]">
                  {summary.totalSlots}
                </span>
                <span className="text-sm text-[#8b9dc3] ml-2">
                  ({summary.interpretedSlots} interpreted)
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {roleInfo.length > 0 && (
        <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-[#00bfff]" />
            <h3 className="text-lg font-semibold text-[#00bfff]">
              Access Control Roles
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roleInfo.map((role, index) => (
              <div
                key={index}
                className="p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-[#00bfff] text-sm">
                    {role.name}
                  </h4>
                  {role.isActive ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-400" />
                  )}
                </div>
                <p className="text-xs text-[#8b9dc3] mb-2">
                  {role.description}
                </p>
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    role.isActive
                      ? "border-green-500/50 text-green-400 bg-green-500/10"
                      : "border-yellow-500/50 text-yellow-400 bg-yellow-500/10"
                  }`}
                >
                  {role.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {securityFlags.length > 0 && (
        <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-[#00bfff]" />
            <h3 className="text-lg font-semibold text-[#00bfff]">
              Security Overview
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {securityFlags.map((flag, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]"
              >
                <div className="mt-0.5">
                  {flag.level === "critical" && (
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                  )}
                  {flag.level === "warning" && (
                    <AlertTriangle className="h-4 w-4 text-yellow-400" />
                  )}
                  {flag.level === "info" && (
                    <Info className="h-4 w-4 text-blue-400" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-[#00bfff] text-sm">
                      {flag.type.replace("_", " ").toUpperCase()}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        flag.level === "critical"
                          ? "border-red-500/50 text-red-400 bg-red-500/10"
                          : flag.level === "warning"
                            ? "border-yellow-500/50 text-yellow-400 bg-yellow-500/10"
                            : "border-blue-500/50 text-blue-400 bg-blue-500/10"
                      }`}
                    >
                      {flag.level.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-[#8b9dc3] text-xs">{flag.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {patterns.detailedPatterns.length > 0 && (
        <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-5 w-5 text-[#00bfff]" />
            <h3 className="text-lg font-semibold text-[#00bfff]">
              Detected Patterns
            </h3>
          </div>

          <div className="space-y-3">
            {patterns.detailedPatterns.map((pattern, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]"
              >
                <div className="flex-1">
                  <h4 className="font-medium text-[#00bfff] text-sm mb-1">
                    {pattern.type.replace("_", " ").toUpperCase()}
                  </h4>
                  <p className="text-xs text-[#8b9dc3]">
                    {pattern.description}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={`${
                    pattern.confidence === "high"
                      ? "border-green-500/50 text-green-400 bg-green-500/10"
                      : pattern.confidence === "medium"
                        ? "border-yellow-500/50 text-yellow-400 bg-yellow-500/10"
                        : "border-red-500/50 text-red-400 bg-red-500/10"
                  }`}
                >
                  {pattern.confidence.toUpperCase()}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
