import React from "react";
import { Card } from "@/components/global/Card";
import { Badge } from "@/components/global/Badge";
import { BarChart3, Code, Layers, Shield } from "lucide-react";
import type { BytecodeMetricsData } from "@/lib/bytecode/types";

interface BytecodeMetricsCardsProps {
  metrics: BytecodeMetricsData;
}

export const BytecodeMetricsCards: React.FC<BytecodeMetricsCardsProps> = ({
  metrics,
}) => {
  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[#8b9dc3] text-sm">Total Contracts</p>
            <p className="text-2xl font-bold text-[#00bfff]">
              {metrics.totalContracts}
            </p>
          </div>
          <div className="w-12 h-12 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
            <Code className="h-6 w-6 text-[#00bfff]" />
          </div>
        </div>
        <div className="mt-3 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-[#8b9dc3]">Total Size:</span>
            <span className="text-[#00bfff] font-mono">
              {formatBytes(metrics.totalSize)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#8b9dc3]">Average Size:</span>
            <span className="text-[#00bfff] font-mono">
              {formatBytes(metrics.averageSize)}
            </span>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[#8b9dc3] text-sm">Standards Detected</p>
            <p className="text-2xl font-bold text-[#00bfff]">
              {metrics.standardsDetected.length}
            </p>
          </div>
          <div className="w-12 h-12 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
            <Layers className="h-6 w-6 text-[#00bfff]" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex flex-wrap gap-1">
            {metrics.standardsDetected.length > 0 ? (
              metrics.standardsDetected.map((standard, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="text-xs border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                >
                  {standard}
                </Badge>
              ))
            ) : (
              <span className="text-[#8b9dc3] text-sm">None detected</span>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[#8b9dc3] text-sm">Security Features</p>
            <p className="text-2xl font-bold text-[#00bfff]">
              {metrics.securityFeaturesFound}
            </p>
          </div>
          <div className="w-12 h-12 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
            <Shield className="h-6 w-6 text-[#00bfff]" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex justify-between text-sm">
            <span className="text-[#8b9dc3]">Contracts with Security:</span>
            <span className="text-[#00bfff]">
              {metrics.securityFeaturesFound} / {metrics.totalContracts}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#8b9dc3]">Coverage:</span>
            <span className="text-[#00bfff]">
              {metrics.totalContracts > 0
                ? (
                    (metrics.securityFeaturesFound / metrics.totalContracts) *
                    100
                  ).toFixed(1)
                : 0}
              %
            </span>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[#8b9dc3] text-sm">Proxy Contracts</p>
            <p className="text-2xl font-bold text-[#00bfff]">
              {metrics.proxyContractsFound}
            </p>
          </div>
          <div className="w-12 h-12 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
            <BarChart3 className="h-6 w-6 text-[#00bfff]" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex justify-between text-sm">
            <span className="text-[#8b9dc3]">Proxy Ratio:</span>
            <span className="text-[#00bfff]">
              {metrics.totalContracts > 0
                ? (
                    (metrics.proxyContractsFound / metrics.totalContracts) *
                    100
                  ).toFixed(1)
                : 0}
              %
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#8b9dc3]">Regular Contracts:</span>
            <span className="text-[#00bfff]">
              {metrics.totalContracts - metrics.proxyContractsFound}
            </span>
          </div>
        </div>
      </Card>

      <div className="md:col-span-2 lg:col-span-4">
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-[#00bfff] mb-4">
            Contract Size Analysis
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-[#8b9dc3]">
                Largest Contract
              </h4>
              <div className="p-3 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(25,28,40,0.6)]">
                <p className="text-[#00bfff] font-semibold">
                  {metrics.largestContract.name}
                </p>
                <p className="text-[#8b9dc3] text-sm font-mono">
                  {metrics.largestContract.address}
                </p>
                <p className="text-[#00bfff] font-mono">
                  {formatBytes(metrics.largestContract.size)}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-[#8b9dc3]">
                Smallest Contract
              </h4>
              <div className="p-3 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(25,28,40,0.6)]">
                <p className="text-[#00bfff] font-semibold">
                  {metrics.smallestContract.name}
                </p>
                <p className="text-[#8b9dc3] text-sm font-mono">
                  {metrics.smallestContract.address}
                </p>
                <p className="text-[#00bfff] font-mono">
                  {formatBytes(metrics.smallestContract.size)}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
