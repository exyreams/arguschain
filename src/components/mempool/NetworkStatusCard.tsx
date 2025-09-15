import React from "react";
import { Card } from "@/components/global/Card";
import { Badge } from "@/components/global/Badge";
import { Button } from "@/components/global/Button";
import { Loader } from "@/components/global/Loader";
import { Alert } from "@/components/global/Alert";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Fuel,
  Minus,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { TbRefresh } from "react-icons/tb";
import type { MempoolError, NetworkConditions } from "@/lib/mempool/types";

interface NetworkStatusCardProps {
  networkConditions?: NetworkConditions;
  loading?: boolean;
  error?: MempoolError | null;
  onRefresh?: () => void;
  showGasRecommendations?: boolean;
  className?: string;
}

export const NetworkStatusCard: React.FC<NetworkStatusCardProps> = ({
  networkConditions,
  loading = false,
  error = null,
  onRefresh,
  showGasRecommendations = true,
  className,
}) => {
  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <Loader className="h-8 w-8" />
          <span className="ml-3 text-[#8b9dc3]">Loading network status...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`p-6 ${className}`}>
        <Alert variant="destructive" className="mb-4">
          <div>
            <div className="font-medium">Failed to load network status</div>
            <div className="text-sm mt-1">{error.message}</div>
          </div>
        </Alert>
        {error.recoverable && onRefresh && (
          <Button
            onClick={onRefresh}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <TbRefresh className="h-4 w-4 mr-2" />
            Retry
          </Button>
        )}
      </Card>
    );
  }

  if (!networkConditions) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center py-8 text-[#8b9dc3]">
          No network data available
        </div>
      </Card>
    );
  }

  const {
    network,
    txPoolStatus,
    congestionAnalysis,
    baseFee,
    gasRecommendations,
    lastUpdated,
  } = networkConditions;

  const getCongestionIcon = () => {
    switch (congestionAnalysis.level) {
      case "low":
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case "moderate":
        return <Clock className="h-4 w-4 text-yellow-400" />;
      case "high":
        return <TrendingUp className="h-4 w-4 text-orange-400" />;
      case "extreme":
        return <AlertTriangle className="h-4 w-4 text-red-400" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  const getCongestionBadgeVariant = () => {
    switch (congestionAnalysis.level) {
      case "low":
        return "default";
      case "moderate":
        return "secondary";
      case "high":
        return "destructive";
      case "extreme":
        return "destructive";
      default:
        return "outline";
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-[#00bfff] capitalize">
            {network} Network
          </h3>
        </div>
        {onRefresh && (
          <Button
            onClick={onRefresh}
            variant="outline"
            size="sm"
            className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-md border border-accent-primary/20 bg-bg-dark-primary text-center">
          <div className="text-2xl font-bold text-[#00bfff]">
            {txPoolStatus.pending.toLocaleString()}
          </div>
          <div className="text-sm text-[#8b9dc3] mt-1">Pending</div>
        </div>
        <div className="p-4 rounded-md border border-accent-primary/20 bg-bg-dark-primary text-center">
          <div className="text-2xl font-bold text-[#00bfff]">
            {txPoolStatus.queued.toLocaleString()}
          </div>
          <div className="text-sm text-[#8b9dc3] mt-1">Queued</div>
        </div>
        <div className="p-4 rounded-md border border-accent-primary/20 bg-bg-dark-primary text-center">
          <div className="text-2xl font-bold text-[#00bfff]">
            {txPoolStatus.total.toLocaleString()}
          </div>
          <div className="text-sm text-[#8b9dc3] mt-1">Total</div>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-accent-primary">
            Network Congestion
          </span>
          <Badge
            variant={getCongestionBadgeVariant()}
            className="flex items-center gap-1"
          >
            {getCongestionIcon()}
            {congestionAnalysis.level.toUpperCase()}
          </Badge>
        </div>

        <div className="w-full bg-[rgba(25,28,40,0.8)] rounded-full h-2 mb-2">
          <div
            className="h-2 rounded-full transition-all duration-300"
            style={{
              width: `${congestionAnalysis.factor * 100}%`,
              backgroundColor: congestionAnalysis.color,
            }}
          />
        </div>

        <p className="text-sm text-[#8b9dc3]">
          {congestionAnalysis.description}
        </p>

        <div className="mt-2 text-xs text-[#6b7280]">
          Est. confirmation: {congestionAnalysis.estimatedConfirmationTime}
        </div>
      </div>

      {showGasRecommendations && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Fuel className="h-4 w-4 text-accent-primary" />
            <span className="text-sm font-medium text-accent-primary">
              Gas Recommendations
            </span>
          </div>

          <div className="text-xs text-[#6b7280] mb-3">
            Base Fee: {baseFee.toFixed(2)} Gwei
          </div>

          <div className="grid grid-cols-2 gap-2">
            {Object.entries(gasRecommendations).map(
              ([tier, recommendation]) => (
                <div
                  key={tier}
                  className="p-3 rounded-lg border border-[rgba(0,191,255,0.1)] bg-bg-dark-primary"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">{recommendation.icon}</span>
                    <span className="text-sm font-medium text-[#8b9dc3] capitalize">
                      {tier}
                    </span>
                  </div>
                  <div className="text-lg font-bold text-[#00bfff]">
                    {recommendation.gasPrice.toFixed(2)} Gwei
                  </div>
                  <div className="text-xs text-[#6b7280]">
                    {recommendation.expectedConfirmation}
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      )}

      {congestionAnalysis.recommendations.length > 0 && (
        <div className="mb-4">
          <span className="text-sm font-medium text-[#8b9dc3] mb-2 block">
            Recommendations
          </span>
          <ul className="space-y-1">
            {congestionAnalysis.recommendations
              .slice(0, 2)
              .map((recommendation, index) => (
                <li
                  key={index}
                  className="text-xs text-[#6b7280] flex items-start gap-2"
                >
                  <span className="text-[#00bfff] mt-1">•</span>
                  <span>{recommendation}</span>
                </li>
              ))}
          </ul>
        </div>
      )}

      <div className="text-xs text-[#6b7280] text-center pt-4 border-t border-[rgba(0,191,255,0.1)]">
        Last updated: {formatTimestamp(lastUpdated)}
      </div>
    </Card>
  );
};
