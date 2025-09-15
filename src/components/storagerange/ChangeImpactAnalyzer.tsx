import React, { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/global/Card";
import { Badge } from "@/components/global/Badge";
import {
  AlertTriangle,
  Brain,
  Lightbulb,
  Network,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import type { StorageComparison } from "@/lib/storagerange/api/storageApi";

interface ChangeImpactAnalyzerProps {
  changes: StorageComparison[];
  contractAddress: string;
  blockHash1: string;
  blockHash2: string;
  className?: string;
}

interface ImpactScore {
  slot: string;
  magnitude: number;
  significance: number;
  type: "supply" | "balance" | "proxy" | "access_control" | "other";
  impact: "critical" | "high" | "medium" | "low";
  description: string;
}

interface CorrelationAnalysis {
  primarySlot: string;
  relatedSlots: string[];
  correlationType: "direct" | "inverse" | "temporal" | "functional";
  strength: number;
  description: string;
}

interface Recommendation {
  type: "optimization" | "security" | "monitoring" | "investigation";
  priority: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  action: string;
  impact: string;
}

export const ChangeImpactAnalyzer: React.FC<ChangeImpactAnalyzerProps> = ({
  changes,
  contractAddress,
  blockHash1,
  blockHash2,
  className = "",
}) => {
  const impactScores = useMemo((): ImpactScore[] => {
    return changes
      .filter((c) => c.changed)
      .map((change) => {
        const magnitude = Math.abs(change.numericDiff || 0);
        let significance = 0;
        let type: ImpactScore["type"] = "other";
        let impact: ImpactScore["impact"] = "low";
        let description = "";

        if (change.isSupplyChange) {
          type = "supply";
          significance = 100;
          impact = "critical";
          description = `Total supply modification of ${(magnitude / 1e6).toFixed(2)} tokens`;
        } else if (change.isBalanceChange) {
          type = "balance";
          significance = Math.min(80, (magnitude / 1e6) * 10);
          impact = magnitude > 1000000 ? "high" : "medium";
          description = `Balance change of ${(magnitude / 1e6).toFixed(2)} tokens`;
        } else {
          const proxySlots = [
            "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc",
            "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103",
          ];

          if (proxySlots.includes(change.slot)) {
            type = "proxy";
            significance = 90;
            impact = "critical";
            description = "Proxy configuration change detected";
          } else if (
            change.slot.includes("role") ||
            change.slot.includes("admin")
          ) {
            type = "access_control";
            significance = 70;
            impact = "high";
            description = "Access control modification";
          } else {
            significance = Math.min(50, magnitude / 1000);
            impact = significance > 30 ? "medium" : "low";
            description = "General storage modification";
          }
        }

        return {
          slot: change.slot,
          magnitude,
          significance,
          type,
          impact,
          description,
        };
      })
      .sort((a, b) => b.significance - a.significance);
  }, [changes]);

  const correlationAnalysis = useMemo((): CorrelationAnalysis[] => {
    const correlations: CorrelationAnalysis[] = [];

    const supplyChanges = impactScores.filter((s) => s.type === "supply");
    const balanceChanges = impactScores.filter((s) => s.type === "balance");

    if (supplyChanges.length > 0 && balanceChanges.length > 0) {
      correlations.push({
        primarySlot: supplyChanges[0].slot,
        relatedSlots: balanceChanges.map((b) => b.slot),
        correlationType: "functional",
        strength: 0.9,
        description:
          "Supply changes typically correlate with balance modifications",
      });
    }

    const proxyChanges = impactScores.filter((s) => s.type === "proxy");
    const accessControlChanges = impactScores.filter(
      (s) => s.type === "access_control",
    );

    if (proxyChanges.length > 0 && accessControlChanges.length > 0) {
      correlations.push({
        primarySlot: proxyChanges[0].slot,
        relatedSlots: accessControlChanges.map((a) => a.slot),
        correlationType: "direct",
        strength: 0.8,
        description:
          "Proxy changes often accompany access control modifications",
      });
    }

    const sortedChanges = impactScores.sort(
      (a, b) => parseInt(a.slot, 16) - parseInt(b.slot, 16),
    );

    for (let i = 0; i < sortedChanges.length - 1; i++) {
      const current = sortedChanges[i];
      const next = sortedChanges[i + 1];
      const slotDiff = parseInt(next.slot, 16) - parseInt(current.slot, 16);

      if (slotDiff <= 5 && slotDiff > 0) {
        correlations.push({
          primarySlot: current.slot,
          relatedSlots: [next.slot],
          correlationType: "temporal",
          strength: 0.6,
          description: "Adjacent storage slots modified together",
        });
      }
    }

    return correlations;
  }, [impactScores]);

  const recommendations = useMemo((): Recommendation[] => {
    const recs: Recommendation[] = [];

    const criticalSupplyChanges = impactScores.filter(
      (s) => s.type === "supply" && s.impact === "critical",
    );

    if (criticalSupplyChanges.length > 0) {
      recs.push({
        type: "security",
        priority: "critical",
        title: "Monitor Supply Changes",
        description:
          "Critical supply modifications detected that may affect token economics",
        action:
          "Verify the legitimacy of supply changes and monitor for additional modifications",
        impact:
          "Prevents potential token manipulation or unauthorized minting/burning",
      });
    }

    const balanceChanges = impactScores.filter((s) => s.type === "balance");
    if (balanceChanges.length > 5) {
      recs.push({
        type: "monitoring",
        priority: "high",
        title: "Mass Balance Changes Detected",
        description: `${balanceChanges.length} balance modifications detected in a single transaction`,
        action:
          "Investigate the cause of mass balance changes and implement monitoring",
        impact: "Ensures proper tracking of large-scale token movements",
      });
    }

    const proxyChanges = impactScores.filter((s) => s.type === "proxy");
    if (proxyChanges.length > 0) {
      recs.push({
        type: "security",
        priority: "critical",
        title: "Proxy Configuration Changed",
        description: "Contract proxy settings have been modified",
        action: "Verify proxy upgrade legitimacy and update monitoring systems",
        impact:
          "Prevents unauthorized contract upgrades and maintains system integrity",
      });
    }

    if (correlationAnalysis.length > 2) {
      recs.push({
        type: "investigation",
        priority: "medium",
        title: "Complex Change Patterns",
        description:
          "Multiple correlated changes detected across different storage areas",
        action:
          "Conduct detailed analysis of change patterns and their business logic",
        impact: "Ensures understanding of complex contract state modifications",
      });
    }

    const highImpactChanges = impactScores.filter((s) => s.significance > 70);
    if (highImpactChanges.length > 3) {
      recs.push({
        type: "optimization",
        priority: "medium",
        title: "Optimize Storage Operations",
        description:
          "Multiple high-impact storage changes may indicate inefficient operations",
        action:
          "Review contract logic for potential gas optimization opportunities",
        impact: "Reduces transaction costs and improves contract efficiency",
      });
    }

    return recs.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }, [impactScores, correlationAnalysis]);

  const impactChartData = impactScores.slice(0, 10).map((score, index) => ({
    name: `Slot ${index + 1}`,
    slot: score.slot.slice(0, 10) + "...",
    magnitude: score.magnitude / 1e6,
    significance: score.significance,
    type: score.type,
  }));

  const correlationChartData = correlationAnalysis.map((corr, index) => ({
    name: `Correlation ${index + 1}`,
    strength: corr.strength * 100,
    type: corr.correlationType,
    relatedCount: corr.relatedSlots.length,
  }));

  const radarData = [
    {
      category: "Supply Impact",
      value: impactScores.filter((s) => s.type === "supply").length * 25,
    },
    {
      category: "Balance Impact",
      value: Math.min(
        100,
        impactScores.filter((s) => s.type === "balance").length * 5,
      ),
    },
    {
      category: "Proxy Impact",
      value: impactScores.filter((s) => s.type === "proxy").length * 50,
    },
    {
      category: "Access Control",
      value:
        impactScores.filter((s) => s.type === "access_control").length * 20,
    },
    {
      category: "Correlation Strength",
      value: correlationAnalysis.reduce((sum, c) => sum + c.strength * 20, 0),
    },
  ];

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

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "critical":
        return "text-red-400 border-red-500/50 bg-red-500/10";
      case "high":
        return "text-orange-400 border-orange-500/50 bg-orange-500/10";
      case "medium":
        return "text-yellow-400 border-yellow-500/50 bg-yellow-500/10";
      default:
        return "text-blue-400 border-blue-500/50 bg-blue-500/10";
    }
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case "security":
        return <AlertTriangle className="h-4 w-4" />;
      case "monitoring":
        return <Target className="h-4 w-4" />;
      case "optimization":
        return <Zap className="h-4 w-4" />;
      case "investigation":
        return <Brain className="h-4 w-4" />;
      default:
        return <Lightbulb className="h-4 w-4" />;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-5 w-5 text-[#00bfff]" />
          <h3 className="text-lg font-semibold text-[#00bfff]">
            Change Impact Analysis
          </h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400">
              {impactScores.filter((s) => s.impact === "critical").length}
            </div>
            <div className="text-sm text-[#8b9dc3]">Critical Impact</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-400">
              {impactScores.filter((s) => s.impact === "high").length}
            </div>
            <div className="text-sm text-[#8b9dc3]">High Impact</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">
              {impactScores.filter((s) => s.impact === "medium").length}
            </div>
            <div className="text-sm text-[#8b9dc3]">Medium Impact</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#00bfff]">
              {correlationAnalysis.length}
            </div>
            <div className="text-sm text-[#8b9dc3]">Correlations</div>
          </div>
        </div>

        <div className="flex justify-center">
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
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
                name="Impact Score"
                dataKey="value"
                stroke="#00bfff"
                fill="rgba(0,191,255,0.2)"
                fillOpacity={0.6}
              />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
          <h4 className="text-lg font-semibold text-[#00bfff] mb-4">
            Top Impact Changes
          </h4>
          {impactChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={impactChartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(0,191,255,0.1)"
                />
                <XAxis dataKey="name" stroke="#8b9dc3" fontSize={12} />
                <YAxis stroke="#8b9dc3" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="significance" fill="#00bfff" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-[#8b9dc3]">
              No significant impacts to analyze
            </div>
          )}
        </Card>

        <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
          <div className="flex items-center gap-2 mb-4">
            <Network className="h-5 w-5 text-[#00bfff]" />
            <h4 className="text-lg font-semibold text-[#00bfff]">
              Change Correlations
            </h4>
          </div>
          {correlationChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart data={correlationChartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(0,191,255,0.1)"
                />
                <XAxis dataKey="relatedCount" stroke="#8b9dc3" fontSize={12} />
                <YAxis dataKey="strength" stroke="#8b9dc3" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Scatter dataKey="strength" fill="#00bfff" />
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-[#8b9dc3]">
              No correlations detected
            </div>
          )}
        </Card>
      </div>

      <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
        <h4 className="text-lg font-semibold text-[#00bfff] mb-4">
          Detailed Impact Analysis
        </h4>
        {impactScores.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
            {impactScores.slice(0, 15).map((score, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]"
              >
                <div className="mt-0.5">
                  {score.impact === "critical" && (
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                  )}
                  {score.impact === "high" && (
                    <TrendingUp className="h-4 w-4 text-orange-400" />
                  )}
                  {score.impact === "medium" && (
                    <Target className="h-4 w-4 text-yellow-400" />
                  )}
                  {score.impact === "low" && (
                    <Zap className="h-4 w-4 text-blue-400" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-[#00bfff] text-sm">
                      {score.slot.slice(0, 10)}...{score.slot.slice(-8)}
                    </span>
                    <Badge
                      variant="outline"
                      className={getImpactColor(score.impact)}
                    >
                      {score.impact.toUpperCase()}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                    >
                      {score.type.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-[#8b9dc3] text-sm mb-1">
                    {score.description}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-[#6b7280]">
                    <span>Magnitude: {(score.magnitude / 1e6).toFixed(2)}</span>
                    <span>Significance: {score.significance.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-[#8b9dc3]">
            No impact data available
          </div>
        )}
      </Card>

      <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="h-5 w-5 text-[#00bfff]" />
          <h4 className="text-lg font-semibold text-[#00bfff]">
            Recommendations
          </h4>
          <Badge
            variant="outline"
            className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
          >
            {recommendations.length} Suggestion
            {recommendations.length !== 1 ? "s" : ""}
          </Badge>
        </div>

        {recommendations.length > 0 ? (
          <div className="space-y-4">
            {recommendations.map((rec, index) => (
              <div
                key={index}
                className="p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {getRecommendationIcon(rec.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h5 className="font-semibold text-[#00bfff]">
                        {rec.title}
                      </h5>
                      <Badge
                        variant="outline"
                        className={getImpactColor(rec.priority)}
                      >
                        {rec.priority.toUpperCase()}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                      >
                        {rec.type.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-[#8b9dc3] text-sm mb-2">
                      {rec.description}
                    </p>
                    <div className="space-y-1">
                      <div className="text-xs text-[#6b7280]">
                        <strong>Action:</strong> {rec.action}
                      </div>
                      <div className="text-xs text-[#6b7280]">
                        <strong>Impact:</strong> {rec.impact}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-[#8b9dc3]">
            No specific recommendations at this time
          </div>
        )}
      </Card>
    </div>
  );
};
