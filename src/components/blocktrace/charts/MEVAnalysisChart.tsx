import React, { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Eye,
  Filter,
  Shield,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { formatGas } from "@/lib/config";

interface MEVOpportunity {
  type: "arbitrage" | "sandwich" | "liquidation" | "frontrun" | "backrun";
  txHash: string;
  blockNumber: number;
  timestamp: number;
  profitUSD: number;
  gasUsed: number;
  gasPrice: number;
  miner: string;
  victim?: string;
  tokens: string[];
  protocols: string[];
  riskScore: number;
  confidence: number;
  details: {
    description: string;
    impact: string;
    methodology: string;
  };
}

interface MEVAnalysisChartProps {
  opportunities: MEVOpportunity[];
  className?: string;
  onOpportunityClick?: (opportunity: MEVOpportunity) => void;
}

const MEVTypeIcon = ({ type }: { type: string }) => {
  const iconProps = { className: "h-4 w-4" };

  switch (type) {
    case "arbitrage":
      return <ArrowUpDown {...iconProps} className="h-4 w-4 text-[#10b981]" />;
    case "sandwich":
      return <Target {...iconProps} className="h-4 w-4 text-[#ef4444]" />;
    case "liquidation":
      return <Zap {...iconProps} className="h-4 w-4 text-[#f59e0b]" />;
    case "frontrun":
      return <TrendingUp {...iconProps} className="h-4 w-4 text-[#8b5cf6]" />;
    case "backrun":
      return <Activity {...iconProps} className="h-4 w-4 text-[#00bfff]" />;
    default:
      return <Eye {...iconProps} className="h-4 w-4 text-[#6b7280]" />;
  }
};

const RiskBadge = ({ score }: { score: number }) => {
  const getRiskLevel = (score: number) => {
    if (score >= 80)
      return {
        level: "Critical",
        color: "text-[#ef4444]",
        bg: "bg-[rgba(239,68,68,0.1)]",
      };
    if (score >= 60)
      return {
        level: "High",
        color: "text-[#f59e0b]",
        bg: "bg-[rgba(245,158,11,0.1)]",
      };
    if (score >= 40)
      return {
        level: "Medium",
        color: "text-[#00bfff]",
        bg: "bg-[rgba(0,191,255,0.1)]",
      };
    return {
      level: "Low",
      color: "text-[#10b981]",
      bg: "bg-[rgba(16,185,129,0.1)]",
    };
  };

  const risk = getRiskLevel(score);

  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${risk.color} ${risk.bg}`}
    >
      {risk.level} ({score})
    </span>
  );
};

const ConfidenceMeter = ({ confidence }: { confidence: number }) => {
  const getConfidenceColor = (conf: number) => {
    if (conf >= 90) return "bg-[#10b981]";
    if (conf >= 70) return "bg-[#00bfff]";
    if (conf >= 50) return "bg-[#f59e0b]";
    return "bg-[#ef4444]";
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[#8b9dc3]">Confidence:</span>
      <div className="flex items-center gap-1">
        <div className="w-16 h-2 bg-[rgba(107,114,128,0.2)] rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${getConfidenceColor(confidence)}`}
            style={{ width: `${confidence}%` }}
          />
        </div>
        <span className="text-xs font-medium text-white">{confidence}%</span>
      </div>
    </div>
  );
};

const MEVOpportunityCard = ({
  opportunity,
  onClick,
  isExpanded = false,
  onToggleExpand,
}: {
  opportunity: MEVOpportunity;
  onClick?: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}) => {
  const typeColors = {
    arbitrage: "border-[#10b981] bg-[rgba(16,185,129,0.05)]",
    sandwich: "border-[#ef4444] bg-[rgba(239,68,68,0.05)]",
    liquidation: "border-[#f59e0b] bg-[rgba(245,158,11,0.05)]",
    frontrun: "border-[#8b5cf6] bg-[rgba(139,92,246,0.05)]",
    backrun: "border-[#00bfff] bg-[rgba(0,191,255,0.05)]",
  };

  const cardClass =
    typeColors[opportunity.type] ||
    "border-[#6b7280] bg-[rgba(107,114,128,0.05)]";

  return (
    <div
      className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-lg ${cardClass}`}
    >
      <div className="flex items-center justify-between mb-3" onClick={onClick}>
        <div className="flex items-center gap-3">
          <MEVTypeIcon type={opportunity.type} />
          <div>
            <h4 className="text-sm font-semibold text-white capitalize">
              {opportunity.type} Attack
            </h4>
            <p className="text-xs text-[#8b9dc3] font-mono">
              {opportunity.txHash.slice(0, 16)}...
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <RiskBadge score={opportunity.riskScore} />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand?.();
            }}
            className="p-1 hover:bg-[rgba(0,191,255,0.1)] rounded"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-[#8b9dc3]" />
            ) : (
              <ChevronDown className="h-4 w-4 text-[#8b9dc3]" />
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
        <div>
          <div className="text-xs text-[#8b9dc3] mb-1">Profit</div>
          <div className="text-sm font-bold text-[#10b981]">
            ${opportunity.profitUSD.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-xs text-[#8b9dc3] mb-1">Gas Used</div>
          <div className="text-sm font-bold text-[#00bfff]">
            {formatGas(opportunity.gasUsed)}
          </div>
        </div>
        <div>
          <div className="text-xs text-[#8b9dc3] mb-1">Block</div>
          <div className="text-sm font-bold text-white">
            {opportunity.blockNumber.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-xs text-[#8b9dc3] mb-1">Protocols</div>
          <div className="text-sm font-bold text-[#f59e0b]">
            {opportunity.protocols.length}
          </div>
        </div>
      </div>

      <ConfidenceMeter confidence={opportunity.confidence} />

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-[rgba(0,191,255,0.1)] space-y-3">
          <div>
            <h5 className="text-xs font-semibold text-[#00bfff] mb-1">
              Description
            </h5>
            <p className="text-xs text-[#8b9dc3]">
              {opportunity.details.description}
            </p>
          </div>

          <div>
            <h5 className="text-xs font-semibold text-[#00bfff] mb-1">
              Impact
            </h5>
            <p className="text-xs text-[#8b9dc3]">
              {opportunity.details.impact}
            </p>
          </div>

          <div>
            <h5 className="text-xs font-semibold text-[#00bfff] mb-1">
              Detection Method
            </h5>
            <p className="text-xs text-[#8b9dc3]">
              {opportunity.details.methodology}
            </p>
          </div>

          {opportunity.tokens.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-[#00bfff] mb-1">
                Tokens Involved
              </h5>
              <div className="flex flex-wrap gap-1">
                {opportunity.tokens.map((token, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-[rgba(0,191,255,0.1)] text-[#00bfff] text-xs rounded"
                  >
                    {token}
                  </span>
                ))}
              </div>
            </div>
          )}

          {opportunity.victim && (
            <div>
              <h5 className="text-xs font-semibold text-[#ef4444] mb-1">
                Victim Address
              </h5>
              <p className="text-xs text-[#8b9dc3] font-mono">
                {opportunity.victim}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const MEVStats = ({ opportunities }: { opportunities: MEVOpportunity[] }) => {
  const stats = useMemo(() => {
    const totalProfit = opportunities.reduce(
      (sum, opp) => sum + opp.profitUSD,
      0,
    );
    const totalGas = opportunities.reduce((sum, opp) => sum + opp.gasUsed, 0);
    const avgProfit =
      opportunities.length > 0 ? totalProfit / opportunities.length : 0;

    const typeBreakdown = opportunities.reduce(
      (acc, opp) => {
        acc[opp.type] = (acc[opp.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const riskDistribution = {
      critical: opportunities.filter((opp) => opp.riskScore >= 80).length,
      high: opportunities.filter(
        (opp) => opp.riskScore >= 60 && opp.riskScore < 80,
      ).length,
      medium: opportunities.filter(
        (opp) => opp.riskScore >= 40 && opp.riskScore < 60,
      ).length,
      low: opportunities.filter((opp) => opp.riskScore < 40).length,
    };

    const avgConfidence =
      opportunities.length > 0
        ? opportunities.reduce((sum, opp) => sum + opp.confidence, 0) /
          opportunities.length
        : 0;

    return {
      totalProfit,
      totalGas,
      avgProfit,
      typeBreakdown,
      riskDistribution,
      avgConfidence,
      totalOpportunities: opportunities.length,
    };
  }, [opportunities]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
      <div className="p-4 bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)] rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Eye className="h-4 w-4 text-[#00bfff]" />
          <span className="text-sm text-[#8b9dc3]">Total MEV</span>
        </div>
        <div className="text-xl font-bold text-[#00bfff]">
          {stats.totalOpportunities}
        </div>
      </div>

      <div className="p-4 bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)] rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className="h-4 w-4 text-[#10b981]" />
          <span className="text-sm text-[#8b9dc3]">Total Profit</span>
        </div>
        <div className="text-xl font-bold text-[#10b981]">
          ${stats.totalProfit.toLocaleString()}
        </div>
      </div>

      <div className="p-4 bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)] rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-4 w-4 text-[#f59e0b]" />
          <span className="text-sm text-[#8b9dc3]">Avg Profit</span>
        </div>
        <div className="text-xl font-bold text-[#f59e0b]">
          ${stats.avgProfit.toLocaleString()}
        </div>
      </div>

      <div className="p-4 bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)] rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-4 w-4 text-[#8b5cf6]" />
          <span className="text-sm text-[#8b9dc3]">Total Gas</span>
        </div>
        <div className="text-xl font-bold text-[#8b5cf6]">
          {formatGas(stats.totalGas)}
        </div>
      </div>

      <div className="p-4 bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)] rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="h-4 w-4 text-[#ef4444]" />
          <span className="text-sm text-[#8b9dc3]">High Risk</span>
        </div>
        <div className="text-xl font-bold text-[#ef4444]">
          {stats.riskDistribution.critical + stats.riskDistribution.high}
        </div>
      </div>

      <div className="p-4 bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)] rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-4 w-4 text-[#10b981]" />
          <span className="text-sm text-[#8b9dc3]">Avg Confidence</span>
        </div>
        <div className="text-xl font-bold text-[#10b981]">
          {stats.avgConfidence.toFixed(1)}%
        </div>
      </div>
    </div>
  );
};

export function MEVAnalysisChart({
  opportunities,
  className = "",
  onOpportunityClick,
}: MEVAnalysisChartProps) {
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedRisk, setSelectedRisk] = useState<string>("all");
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((opp) => {
      if (selectedType !== "all" && opp.type !== selectedType) return false;
      if (selectedRisk !== "all") {
        const risk = opp.riskScore;
        if (selectedRisk === "critical" && risk < 80) return false;
        if (selectedRisk === "high" && (risk < 60 || risk >= 80)) return false;
        if (selectedRisk === "medium" && (risk < 40 || risk >= 60))
          return false;
        if (selectedRisk === "low" && risk >= 40) return false;
      }
      return true;
    });
  }, [opportunities, selectedType, selectedRisk]);

  const toggleCardExpansion = (txHash: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(txHash)) {
      newExpanded.delete(txHash);
    } else {
      newExpanded.add(txHash);
    }
    setExpandedCards(newExpanded);
  };

  const mevTypes = [...new Set(opportunities.map((opp) => opp.type))];

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-[#00bfff]" />
          <h3 className="text-lg font-semibold text-[#00bfff]">MEV Analysis</h3>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-[#8b9dc3]" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-1 text-sm bg-[#1a1f2e] border border-[rgba(0,191,255,0.2)] rounded text-white"
            >
              <option value="all">All Types</option>
              {mevTypes.map((type) => (
                <option key={type} value={type} className="capitalize">
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[#ef4444]" />
            <select
              value={selectedRisk}
              onChange={(e) => setSelectedRisk(e.target.value)}
              className="px-3 py-1 text-sm bg-[#1a1f2e] border border-[rgba(0,191,255,0.2)] rounded text-white"
            >
              <option value="all">All Risk Levels</option>
              <option value="critical">Critical (80+)</option>
              <option value="high">High (60-79)</option>
              <option value="medium">Medium (40-59)</option>
              <option value="low">Low ({"<"}40)</option>
            </select>
          </div>
        </div>
      </div>

      <MEVStats opportunities={filteredOpportunities} />

      <div className="space-y-4">
        {filteredOpportunities.length === 0 ? (
          <div className="text-center py-12 text-[#8b9dc3]">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No MEV opportunities found matching the current filters</p>
          </div>
        ) : (
          filteredOpportunities.map((opportunity) => (
            <MEVOpportunityCard
              key={opportunity.txHash}
              opportunity={opportunity}
              onClick={() => onOpportunityClick?.(opportunity)}
              isExpanded={expandedCards.has(opportunity.txHash)}
              onToggleExpand={() => toggleCardExpansion(opportunity.txHash)}
            />
          ))
        )}
      </div>

      <div className="mt-6 p-4 bg-[rgba(15,20,25,0.6)] border border-[rgba(0,191,255,0.1)] rounded-lg">
        <div className="text-sm font-medium text-[#8b9dc3] mb-3">
          MEV Attack Types
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-3 w-3 text-[#10b981]" />
            <span className="text-[#8b9dc3]">
              <strong>Arbitrage:</strong> Price differences across DEXs
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Target className="h-3 w-3 text-[#ef4444]" />
            <span className="text-[#8b9dc3]">
              <strong>Sandwich:</strong> Front/back-run user transactions
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-3 w-3 text-[#f59e0b]" />
            <span className="text-[#8b9dc3]">
              <strong>Liquidation:</strong> Liquidate undercollateralized
              positions
            </span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3 w-3 text-[#8b5cf6]" />
            <span className="text-[#8b9dc3]">
              <strong>Front-run:</strong> Execute before known profitable tx
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="h-3 w-3 text-[#00bfff]" />
            <span className="text-[#8b9dc3]">
              <strong>Back-run:</strong> Execute after state-changing tx
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
