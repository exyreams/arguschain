import React from "react";
import { Card } from "@/components/global/Card";
import { Badge } from "@/components/global/Badge";
import { Button } from "@/components/global/Button";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Info,
  Settings,
  Shield,
} from "lucide-react";
import type { ProcessedStorageData } from "@/lib/storagerange/processors/storageProcessor";

interface ProxyPatternAnalyzerProps {
  storageData: ProcessedStorageData;
  className?: string;
}

export const ProxyPatternAnalyzer: React.FC<ProxyPatternAnalyzerProps> = ({
  storageData,
  className = "",
}) => {
  const { patterns, summary, securityFlags, slots } = storageData;

  const isProxy = patterns.proxyPattern;
  const implementationAddress = summary.implementationAddress;
  const adminAddress = summary.adminAddress;

  const proxySlots = slots.filter((slot) => slot.category === "proxy");
  const implSlot = slots.find(
    (s) =>
      s.slot ===
      "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc",
  );
  const adminSlot = slots.find(
    (s) =>
      s.slot ===
      "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103",
  );
  const beaconSlot = slots.find(
    (s) =>
      s.slot ===
      "0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50",
  );

  const proxySecurityFlags = securityFlags.filter(
    (flag) =>
      flag.type.includes("proxy") ||
      flag.type.includes("implementation") ||
      flag.type.includes("admin"),
  );

  if (!isProxy) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
              <Shield className="h-8 w-8 text-[#8b9dc3]" />
            </div>
            <h3 className="text-lg font-semibold text-[#8b9dc3] mb-2">
              No Proxy Pattern Detected
            </h3>
            <p className="text-[#6b7280] text-sm">
              This contract does not appear to use the EIP-1967 proxy pattern.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-[#00bfff]" />
          <h3 className="text-lg font-semibold text-[#00bfff]">
            EIP-1967 Proxy Pattern
          </h3>
          <Badge
            variant="outline"
            className="border-green-500/50 text-green-400 bg-green-500/10"
          >
            DETECTED
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-[#8b9dc3]">Architecture</h4>
            <div className="bg-[rgba(15,20,25,0.6)] rounded-lg p-4 border border-[rgba(0,191,255,0.1)]">
              <div className="flex flex-col space-y-4">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-[rgba(0,191,255,0.2)] rounded-full">
                    <span className="text-[#00bfff] text-sm font-medium">
                      User
                    </span>
                  </div>
                </div>

                <ArrowRight className="h-4 w-4 text-[#8b9dc3] mx-auto" />

                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-12 bg-[rgba(0,191,255,0.3)] rounded-lg">
                    <span className="text-[#00bfff] text-xs font-medium">
                      Proxy
                    </span>
                  </div>
                  <p className="text-xs text-[#8b9dc3] mt-1">Delegates calls</p>
                </div>

                <ArrowRight className="h-4 w-4 text-[#8b9dc3] mx-auto" />

                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-12 bg-[rgba(34,197,94,0.3)] rounded-lg">
                    <span className="text-green-400 text-xs font-medium">
                      Logic
                    </span>
                  </div>
                  <p className="text-xs text-[#8b9dc3] mt-1">Implementation</p>
                </div>

                {adminAddress && (
                  <>
                    <div className="border-t border-[rgba(0,191,255,0.1)] pt-4">
                      <div className="text-center">
                        <div className="inline-flex items-center justify-center w-12 h-12 bg-[rgba(239,68,68,0.3)] rounded-full">
                          <Settings className="h-4 w-4 text-red-400" />
                        </div>
                        <p className="text-xs text-[#8b9dc3] mt-1">Admin</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-medium text-[#8b9dc3]">
              Configuration
            </h4>
            <div className="space-y-3">
              {implementationAddress && (
                <div className="p-3 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-[#00bfff]">
                      Implementation
                    </span>
                    <Badge
                      variant="outline"
                      className="border-green-500/50 text-green-400 bg-green-500/10"
                    >
                      Active
                    </Badge>
                  </div>
                  <p className="text-xs font-mono text-[#8b9dc3] break-all">
                    {implementationAddress}
                  </p>
                </div>
              )}

              {adminAddress && (
                <div className="p-3 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-[#00bfff]">
                      Admin
                    </span>
                    <Badge
                      variant="outline"
                      className="border-red-500/50 text-red-400 bg-red-500/10"
                    >
                      Control
                    </Badge>
                  </div>
                  <p className="text-xs font-mono text-[#8b9dc3] break-all">
                    {adminAddress}
                  </p>
                </div>
              )}

              {beaconSlot && (
                <div className="p-3 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-[#00bfff]">
                      Beacon
                    </span>
                    <Badge
                      variant="outline"
                      className="border-yellow-500/50 text-yellow-400 bg-yellow-500/10"
                    >
                      Beacon
                    </Badge>
                  </div>
                  <p className="text-xs font-mono text-[#8b9dc3] break-all">
                    {beaconSlot.decodedValue}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
        <h4 className="text-lg font-semibold text-[#00bfff] mb-4">
          Proxy Storage Slots
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(0,191,255,0.1)]">
                <th className="text-left py-2 text-[#8b9dc3]">Slot</th>
                <th className="text-left py-2 text-[#8b9dc3]">Purpose</th>
                <th className="text-left py-2 text-[#8b9dc3]">Value</th>
                <th className="text-left py-2 text-[#8b9dc3]">Status</th>
              </tr>
            </thead>
            <tbody>
              {proxySlots.map((slot, index) => (
                <tr
                  key={index}
                  className="border-b border-[rgba(0,191,255,0.05)]"
                >
                  <td className="py-2 font-mono text-[#00bfff] text-xs">
                    {slot.slot.slice(0, 10)}...{slot.slot.slice(-8)}
                  </td>
                  <td className="py-2 text-[#8b9dc3]">
                    {slot.interpretation || "Unknown"}
                  </td>
                  <td className="py-2 text-[#8b9dc3] max-w-xs truncate">
                    {slot.decodedValue}
                  </td>
                  <td className="py-2">
                    <Badge
                      variant="outline"
                      className="border-green-500/50 text-green-400 bg-green-500/10"
                    >
                      Active
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {proxySecurityFlags.length > 0 && (
        <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-[#00bfff]" />
            <h4 className="text-lg font-semibold text-[#00bfff]">
              Security Analysis
            </h4>
          </div>
          <div className="space-y-3">
            {proxySecurityFlags.map((flag, index) => (
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
                    <span className="font-medium text-[#00bfff]">
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
                  <p className="text-[#8b9dc3] text-sm">{flag.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="h-5 w-5 text-[#00bfff]" />
          <h4 className="text-lg font-semibold text-[#00bfff]">
            Recommendations
          </h4>
        </div>
        <div className="space-y-3">
          <div className="p-3 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
            <h5 className="font-medium text-[#00bfff] mb-2">
              ✅ Proxy Pattern Compliance
            </h5>
            <p className="text-[#8b9dc3] text-sm">
              Contract follows EIP-1967 proxy standard with proper storage slot
              allocation.
            </p>
          </div>

          {adminAddress && (
            <div className="p-3 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
              <h5 className="font-medium text-[#00bfff] mb-2">
                🔒 Admin Control
              </h5>
              <p className="text-[#8b9dc3] text-sm">
                Monitor admin address for any changes. Admin has upgrade
                capabilities.
              </p>
            </div>
          )}

          <div className="p-3 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
            <h5 className="font-medium text-[#00bfff] mb-2">
              📊 Implementation Tracking
            </h5>
            <p className="text-[#8b9dc3] text-sm">
              Track implementation address changes to monitor contract upgrades.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
