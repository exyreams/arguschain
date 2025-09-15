import React, { useMemo, useState } from "react";
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
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/global/Card";
import { Badge } from "@/components/global/Badge";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Coins,
  Shield,
  Users,
} from "lucide-react";
import { useStorageAnalysis } from "@/hooks/storagerange";
import { useMappingAnalysis } from "@/hooks/storagerange";
import { TokenSecurityAnalyzer } from "./TokenSecurityAnalyzer";
import { TokenEconomicsVisualizer } from "./TokenEconomicsVisualizer";

interface ERC20AnalyzerDashboardProps {
  contractAddress: string;
  blockHash: string;
  className?: string;
}

interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: number;
  formattedSupply: string;
  version?: string;
  isPaused?: boolean;
}

interface TokenEconomics {
  totalSupply: number;
  circulatingSupply: number;
  maxSupply?: number;
  supplyUtilization: number;
  inflationRate: number;
  concentrationRatio: number;
  liquidityScore: number;
}

interface HolderAnalysis {
  totalHolders: number;
  contractHolders: number;
  eoaHolders: number;
  topHolders: HolderInfo[];
  holderDistribution: DistributionBucket[];
  concentrationMetrics: ConcentrationMetrics;
}

interface HolderInfo {
  address: string;
  balance: number;
  percentage: number;
  type: "contract" | "eoa" | "known";
  label?: string;
  isExchange?: boolean;
  isMultisig?: boolean;
}

interface DistributionBucket {
  range: string;
  count: number;
  percentage: number;
  totalBalance: number;
}

interface ConcentrationMetrics {
  giniCoefficient: number;
  top10Percentage: number;
  top100Percentage: number;
  herfindahlIndex: number;
}

interface SecurityAssessment {
  overallScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  findings: SecurityFinding[];
  recommendations: string[];
}

interface SecurityFinding {
  type: "minting" | "burning" | "pausing" | "ownership" | "proxy" | "other";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  impact: string;
}

export const ERC20AnalyzerDashboard: React.FC<ERC20AnalyzerDashboardProps> = ({
  contractAddress,
  blockHash,
  className = "",
}) => {
  const [selectedAddresses, setSelectedAddresses] = useState<string[]>([]);
  const [analysisDepth, setAnalysisDepth] = useState<
    "basic" | "detailed" | "comprehensive"
  >("detailed");

  const {
    data: storageData,
    isLoading: storageLoading,
    isError: storageError,
  } = useStorageAnalysis(contractAddress, blockHash);

  const { data: balanceData, isLoading: balanceLoading } = useMappingAnalysis(
    contractAddress,
    blockHash,
    "0x0000000000000000000000000000000000000000000000000000000000000001",
    selectedAddresses
  );

  const isLoading = storageLoading || balanceLoading;

  const tokenMetadata = useMemo((): TokenMetadata | null => {
    if (!storageData?.processedData) return null;

    const slots = storageData.processedData.storageSlots;

    const supplySlot = slots.find(
      (s) => s.slotInt === 2 || s.category === "supply"
    );
    const totalSupply = supplySlot ? parseInt(supplySlot.rawValue, 16) : 0;

    const contractInfo = storageData.processedData.contractInfo;

    return {
      name: "Unknown Token",
      symbol: "UNK",
      decimals: 18,
      totalSupply,
      formattedSupply: (totalSupply / 1e18).toLocaleString(),
      version: contractInfo?.version?.toString(),
      isPaused: contractInfo?.pausedState,
    };
  }, [storageData]);

  const tokenEconomics = useMemo((): TokenEconomics | null => {
    if (!tokenMetadata || !balanceData) return null;

    const totalSupply = tokenMetadata.totalSupply / 1e18;
    const circulatingSupply = totalSupply;
    const supplyUtilization = 100;

    const balances = balanceData.entries
      .map((e) => e.valueInt / 1e18)
      .sort((a, b) => b - a);
    const totalBalance = balances.reduce((sum, b) => sum + b, 0);

    let gini = 0;
    if (balances.length > 1 && totalBalance > 0) {
      const n = balances.length;
      let numerator = 0;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          numerator += Math.abs(balances[i] - balances[j]);
        }
      }
      gini = numerator / (2 * n * totalBalance);
    }

    return {
      totalSupply,
      circulatingSupply,
      maxSupply: totalSupply,
      supplyUtilization,
      inflationRate: 0,
      concentrationRatio: gini,
      liquidityScore: Math.max(0, 100 - gini * 100),
    };
  }, [tokenMetadata, balanceData]);

  const holderAnalysis = useMemo((): HolderAnalysis | null => {
    if (!balanceData || !tokenEconomics) return null;

    const holders = balanceData.entries.filter((e) => e.valueInt > 0);
    const totalHolders = holders.length;
    const contractHolders = holders.filter((h) => h.isContract).length;
    const eoaHolders = totalHolders - contractHolders;

    const topHolders: HolderInfo[] = holders
      .sort((a, b) => b.valueInt - a.valueInt)
      .slice(0, 20)
      .map((holder) => ({
        address: holder.key,
        balance: holder.valueInt / 1e18,
        percentage:
          (holder.valueInt / (tokenEconomics.totalSupply * 1e18)) * 100,
        type: holder.isContract ? "contract" : "eoa",
        label: holder.contractName || undefined,
        isExchange:
          holder.contractName?.toLowerCase().includes("exchange") || false,
        isMultisig:
          holder.contractName?.toLowerCase().includes("multisig") || false,
      }));

    const buckets = [
      { min: 0, max: 1, label: "< 1" },
      { min: 1, max: 10, label: "1-10" },
      { min: 10, max: 100, label: "10-100" },
      { min: 100, max: 1000, label: "100-1K" },
      { min: 1000, max: 10000, label: "1K-10K" },
      { min: 10000, max: Infinity, label: "10K+" },
    ];

    const holderDistribution: DistributionBucket[] = buckets.map((bucket) => {
      const holdersInBucket = holders.filter((h) => {
        const balance = h.valueInt / 1e18;
        return balance >= bucket.min && balance < bucket.max;
      });

      return {
        range: bucket.label,
        count: holdersInBucket.length,
        percentage: (holdersInBucket.length / totalHolders) * 100,
        totalBalance: holdersInBucket.reduce(
          (sum, h) => sum + h.valueInt / 1e18,
          0
        ),
      };
    });

    const sortedBalances = holders
      .map((h) => h.valueInt / 1e18)
      .sort((a, b) => b - a);
    const totalBalance = sortedBalances.reduce((sum, b) => sum + b, 0);

    const top10Balance = sortedBalances
      .slice(0, 10)
      .reduce((sum, b) => sum + b, 0);
    const top100Balance = sortedBalances
      .slice(0, 100)
      .reduce((sum, b) => sum + b, 0);

    const hhi = sortedBalances.reduce((sum, balance) => {
      const share = balance / totalBalance;
      return sum + share * share;
    }, 0);

    const concentrationMetrics: ConcentrationMetrics = {
      giniCoefficient: tokenEconomics.concentrationRatio,
      top10Percentage: (top10Balance / totalBalance) * 100,
      top100Percentage: (top100Balance / totalBalance) * 100,
      herfindahlIndex: hhi,
    };

    return {
      totalHolders,
      contractHolders,
      eoaHolders,
      topHolders,
      holderDistribution,
      concentrationMetrics,
    };
  }, [balanceData, tokenEconomics]);

  const securityAssessment = useMemo((): SecurityAssessment | null => {
    if (!storageData?.processedData) return null;

    const findings: SecurityFinding[] = [];
    let score = 100;

    const hasMintRole = storageData.processedData.detectedPatterns.some(
      (p) =>
        p.type === "access_control" &&
        p.description.toLowerCase().includes("mint")
    );
    if (hasMintRole) {
      findings.push({
        type: "minting",
        severity: "medium",
        title: "Minting Capability Detected",
        description:
          "Contract has minting capabilities which could affect token supply",
        impact: "Token supply can be increased by authorized parties",
      });
      score -= 15;
    }

    if (tokenMetadata?.isPaused !== undefined) {
      findings.push({
        type: "pausing",
        severity: tokenMetadata.isPaused ? "high" : "low",
        title: "Pausable Token",
        description: `Token is ${tokenMetadata.isPaused ? "currently paused" : "pausable"}`,
        impact: "Token transfers can be halted by authorized parties",
      });
      score -= tokenMetadata.isPaused ? 25 : 10;
    }

    const isProxy = storageData.processedData.detectedPatterns.some(
      (p) => p.type === "proxy"
    );
    if (isProxy) {
      findings.push({
        type: "proxy",
        severity: "medium",
        title: "Upgradeable Contract",
        description: "Contract uses proxy pattern and can be upgraded",
        impact: "Contract logic can be changed by authorized parties",
      });
      score -= 20;
    }

    if (
      holderAnalysis &&
      holderAnalysis.concentrationMetrics.top10Percentage > 50
    ) {
      findings.push({
        type: "other",
        severity: "high",
        title: "High Token Concentration",
        description: `Top 10 holders control ${holderAnalysis.concentrationMetrics.top10Percentage.toFixed(1)}% of supply`,
        impact:
          "High concentration risk - few holders control majority of tokens",
      });
      score -= 30;
    }

    const riskLevel: SecurityAssessment["riskLevel"] =
      score >= 80
        ? "low"
        : score >= 60
          ? "medium"
          : score >= 40
            ? "high"
            : "critical";

    const recommendations = [
      "Monitor minting events and supply changes",
      "Track large holder movements and concentration changes",
      "Verify proxy upgrade mechanisms and governance",
      "Assess pause functionality and admin controls",
    ];

    return {
      overallScore: Math.max(0, score),
      riskLevel,
      findings,
      recommendations,
    };
  }, [storageData, tokenMetadata, holderAnalysis]);

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

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low":
        return "text-green-400 border-green-500/50 bg-green-500/10";
      case "medium":
        return "text-yellow-400 border-yellow-500/50 bg-yellow-500/10";
      case "high":
        return "text-orange-400 border-orange-500/50 bg-orange-500/10";
      case "critical":
        return "text-red-400 border-red-500/50 bg-red-500/10";
      default:
        return "text-blue-400 border-blue-500/50 bg-blue-500/10";
    }
  };

  if (storageError) {
    return (
      <Card
        className={`bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)] ${className}`}
      >
        <div className="text-center py-8">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-red-400 mb-2">
            Analysis Error
          </h3>
          <p className="text-[#8b9dc3] text-sm">
            Failed to analyze ERC-20 token contract
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
        <div className="flex items-center gap-2 mb-4">
          <Coins className="h-5 w-5 text-[#00bfff]" />
          <h3 className="text-lg font-semibold text-[#00bfff]">
            ERC-20 Token Analysis
          </h3>
          {securityAssessment && (
            <Badge
              variant="outline"
              className={getRiskColor(securityAssessment.riskLevel)}
            >
              {securityAssessment.riskLevel.toUpperCase()} RISK
            </Badge>
          )}
        </div>

        {tokenMetadata && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#00bfff]">
                {tokenMetadata.symbol}
              </div>
              <div className="text-sm text-[#8b9dc3]">Symbol</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#00bfff]">
                {tokenMetadata.decimals}
              </div>
              <div className="text-sm text-[#8b9dc3]">Decimals</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#00bfff]">
                {tokenMetadata.formattedSupply}
              </div>
              <div className="text-sm text-[#8b9dc3]">Total Supply</div>
            </div>
            <div className="text-center">
              <div
                className={`text-2xl font-bold ${tokenMetadata.isPaused ? "text-red-400" : "text-green-400"}`}
              >
                {tokenMetadata.isPaused ? "PAUSED" : "ACTIVE"}
              </div>
              <div className="text-sm text-[#8b9dc3]">Status</div>
            </div>
          </div>
        )}
      </Card>

      {tokenEconomics && (
        <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-[#00bfff]" />
            <h4 className="text-lg font-semibold text-[#00bfff]">
              Token Economics
            </h4>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
                <div className="text-sm text-[#8b9dc3] mb-1">
                  Circulating Supply
                </div>
                <div className="text-xl font-bold text-[#00bfff]">
                  {tokenEconomics.circulatingSupply.toLocaleString()}
                </div>
              </div>
              <div className="p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
                <div className="text-sm text-[#8b9dc3] mb-1">Concentration</div>
                <div className="text-xl font-bold text-[#00bfff]">
                  {(tokenEconomics.concentrationRatio * 100).toFixed(1)}%
                </div>
              </div>
              <div className="p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
                <div className="text-sm text-[#8b9dc3] mb-1">
                  Liquidity Score
                </div>
                <div className="text-xl font-bold text-[#00bfff]">
                  {tokenEconomics.liquidityScore.toFixed(0)}
                </div>
              </div>
              <div className="p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
                <div className="text-sm text-[#8b9dc3] mb-1">Utilization</div>
                <div className="text-xl font-bold text-[#00bfff]">
                  {tokenEconomics.supplyUtilization.toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart
                  data={[
                    {
                      metric: "Liquidity",
                      value: tokenEconomics.liquidityScore,
                    },
                    {
                      metric: "Distribution",
                      value: 100 - tokenEconomics.concentrationRatio * 100,
                    },
                    {
                      metric: "Utilization",
                      value: tokenEconomics.supplyUtilization,
                    },
                    {
                      metric: "Stability",
                      value: 100 - tokenEconomics.inflationRate * 10,
                    },
                  ]}
                >
                  <PolarGrid stroke="rgba(0,191,255,0.1)" />
                  <PolarAngleAxis
                    dataKey="metric"
                    tick={{ fill: "#8b9dc3", fontSize: 12 }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={{ fill: "#8b9dc3", fontSize: 10 }}
                  />
                  <Radar
                    name="Score"
                    dataKey="value"
                    stroke="#00bfff"
                    fill="rgba(0,191,255,0.2)"
                    fillOpacity={0.6}
                  />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      )}

      {holderAnalysis && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-[#00bfff]" />
              <h4 className="text-lg font-semibold text-[#00bfff]">
                Holder Distribution
              </h4>
              <Badge
                variant="outline"
                className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
              >
                {holderAnalysis.totalHolders} Holders
              </Badge>
            </div>

            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={holderAnalysis.holderDistribution}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(0,191,255,0.1)"
                />
                <XAxis dataKey="range" stroke="#8b9dc3" fontSize={12} />
                <YAxis stroke="#8b9dc3" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#00bfff" name="Holders" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
            <h4 className="text-lg font-semibold text-[#00bfff] mb-4">
              Top Holders
            </h4>
            <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
              {holderAnalysis.topHolders.slice(0, 10).map((holder, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-mono text-[#00bfff]">
                      #{index + 1}
                    </div>
                    <div>
                      <div className="font-mono text-[#00bfff] text-sm">
                        {holder.address.slice(0, 6)}...
                        {holder.address.slice(-4)}
                      </div>
                      {holder.label && (
                        <div className="text-xs text-[#8b9dc3]">
                          {holder.label}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[#00bfff] font-semibold">
                      {holder.balance.toLocaleString()}
                    </div>
                    <div className="text-xs text-[#8b9dc3]">
                      {holder.percentage.toFixed(2)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {securityAssessment && (
        <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-[#00bfff]" />
            <h4 className="text-lg font-semibold text-[#00bfff]">
              Security Assessment
            </h4>
            <Badge
              variant="outline"
              className={getRiskColor(securityAssessment.riskLevel)}
            >
              Score: {securityAssessment.overallScore}/100
            </Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h5 className="font-semibold text-[#00bfff] mb-3">
                Security Findings
              </h5>
              <div className="space-y-3">
                {securityAssessment.findings.map((finding, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant="outline"
                        className={getRiskColor(finding.severity)}
                      >
                        {finding.severity.toUpperCase()}
                      </Badge>
                      <span className="font-medium text-[#00bfff] text-sm">
                        {finding.title}
                      </span>
                    </div>
                    <p className="text-[#8b9dc3] text-sm mb-1">
                      {finding.description}
                    </p>
                    <p className="text-[#6b7280] text-xs">
                      Impact: {finding.impact}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h5 className="font-semibold text-[#00bfff] mb-3">
                Recommendations
              </h5>
              <div className="space-y-2">
                {securityAssessment.recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 p-2 rounded border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]"
                  >
                    <CheckCircle className="h-4 w-4 text-green-400 mt-0.5" />
                    <span className="text-[#8b9dc3] text-sm">{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {tokenEconomics && holderAnalysis && (
        <TokenEconomicsVisualizer
          tokenData={{
            totalSupply: tokenEconomics.totalSupply,
            circulatingSupply: tokenEconomics.circulatingSupply,
            maxSupply: tokenEconomics.maxSupply,
            holders: holderAnalysis.totalHolders,
          }}
          holderData={holderAnalysis}
        />
      )}

      {storageData && (
        <TokenSecurityAnalyzer
          storageData={storageData}
          holderAnalysis={holderAnalysis}
        />
      )}

      {isLoading && (
        <Card className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)]">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00bfff] mx-auto mb-3"></div>
            <p className="text-[#8b9dc3]">Analyzing ERC-20 token...</p>
          </div>
        </Card>
      )}
    </div>
  );
};
