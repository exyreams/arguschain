import { useMemo, useState, useCallback } from "react";
import { Button, Badge, Input, Dropdown } from "@/components/global";
import type { ParsedTransferLog, TopParticipant } from "@/lib/eventlogs";
import { formatPyusdValue } from "@/lib/eventlogs";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Brain,
  Copy,
  ExternalLink,
  Filter,
  Network,
  Search,
  Shield,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

interface ParticipantTablesProps {
  topSenders: TopParticipant[];
  topReceivers: TopParticipant[];
  transfers?: ParsedTransferLog[];
  className?: string;
  pageSize?: number;
}

interface EnhancedParticipant extends TopParticipant {
  category: "whale" | "frequent_trader" | "one_time_user" | "hub" | "regular";
  riskScore: number;
  activityPattern: {
    consistency: "high" | "medium" | "low";
    volumePattern: "steady" | "volatile" | "burst";
  };
  relationships: {
    uniqueCounterparties: number;
    hubConnections: number;
  };
  insights: string[];
}

type SortField =
  | "address"
  | "total_value"
  | "transactions"
  | "percentage_of_volume"
  | "riskScore";
type SortDirection = "asc" | "desc";

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export function ParticipantTables({
  topSenders,
  topReceivers,
  transfers = [],
  className = "",
  pageSize = 10,
}: ParticipantTablesProps) {
  const [activeTab, setActiveTab] = useState<"top" | "behavioral" | "hubs">(
    "top"
  );
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: "total_value",
    direction: "desc",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const enhancedParticipants = useMemo(() => {
    const analyzeParticipant = (
      participant: TopParticipant,
      type: "sender" | "receiver"
    ): EnhancedParticipant => {
      const participantTransfers = transfers.filter((t) =>
        type === "sender"
          ? t.from === participant.address
          : t.to === participant.address
      );

      const totalVolume = participant.total_value;
      const avgTransferSize = totalVolume / participant.transactions;

      // Determine category
      let category: EnhancedParticipant["category"] = "regular";
      if (totalVolume > 1000000) {
        category = "whale";
      } else if (participant.transactions > 100) {
        category = "frequent_trader";
      } else if (participant.transactions === 1) {
        category = "one_time_user";
      } else if (participant.percentage_of_volume > 5) {
        category = "hub";
      }

      // Calculate risk score
      let riskScore = 0;
      if (totalVolume > 500000) riskScore += 30;
      if (participant.transactions === 1 && totalVolume > 10000)
        riskScore += 25;
      if (avgTransferSize > 100000) riskScore += 20;
      if (participant.percentage_of_volume > 10) riskScore += 25;
      riskScore = Math.min(100, riskScore);

      // Activity patterns
      const volumeVariance =
        participantTransfers.length > 1
          ? Math.sqrt(
              participantTransfers.reduce(
                (sum, t) => sum + Math.pow(t.value_pyusd - avgTransferSize, 2),
                0
              ) / participantTransfers.length
            )
          : 0;

      const volumePattern =
        volumeVariance > avgTransferSize * 0.5
          ? "volatile"
          : participantTransfers.length < 5
            ? "burst"
            : "steady";

      const consistency =
        participant.transactions > 50
          ? "high"
          : participant.transactions > 10
            ? "medium"
            : "low";

      // Relationships
      const counterparties = new Set(
        participantTransfers.map((t) => (type === "sender" ? t.to : t.from))
      );
      const uniqueCounterparties = counterparties.size;
      const hubConnections =
        category === "hub" ? Math.floor(uniqueCounterparties * 0.1) : 0;

      // Generate insights
      const insights: string[] = [];
      if (category === "whale") {
        insights.push("High-value participant with significant market impact");
      }
      if (riskScore > 70) {
        insights.push("High-risk profile requires monitoring");
      }
      if (volumePattern === "volatile") {
        insights.push("Irregular transfer patterns detected");
      }
      if (uniqueCounterparties > 20) {
        insights.push("Highly connected network participant");
      }

      return {
        ...participant,
        category,
        riskScore,
        activityPattern: { consistency, volumePattern },
        relationships: { uniqueCounterparties, hubConnections },
        insights,
      };
    };

    return {
      senders: topSenders.map((s) => analyzeParticipant(s, "sender")),
      receivers: topReceivers.map((r) => analyzeParticipant(r, "receiver")),
    };
  }, [topSenders, topReceivers, transfers]);

  const getTabData = useCallback(() => {
    const allParticipants = [
      ...enhancedParticipants.senders,
      ...enhancedParticipants.receivers,
    ];

    switch (activeTab) {
      case "top":
        return allParticipants.sort((a, b) => b.total_value - a.total_value);
      case "behavioral":
        return allParticipants.filter((p) => p.insights.length > 0);
      case "hubs":
        return allParticipants.filter(
          (p) =>
            p.category === "hub" || p.relationships.uniqueCounterparties > 10
        );
      default:
        return allParticipants;
    }
  }, [activeTab, enhancedParticipants]);

  const processedData = useMemo(() => {
    let data = getTabData();

    // Category filtering
    if (categoryFilter !== "all") {
      data = data.filter((p) => p.category === categoryFilter);
    }

    // Search filtering
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      data = data.filter(
        (p) =>
          p.address.toLowerCase().includes(searchLower) ||
          p.address_short.toLowerCase().includes(searchLower) ||
          p.category.toLowerCase().includes(searchLower)
      );
    }

    // Sorting
    data.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortConfig.field) {
        case "address":
          aValue = a.address.toLowerCase();
          bValue = b.address.toLowerCase();
          break;
        case "riskScore":
          aValue = a.riskScore;
          bValue = b.riskScore;
          break;
        default:
          aValue = a[sortConfig.field];
          bValue = b[sortConfig.field];
      }

      let comparison = 0;
      if (aValue < bValue) comparison = -1;
      else if (aValue > bValue) comparison = 1;

      return sortConfig.direction === "asc" ? comparison : -comparison;
    });

    // Pagination
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginated = data.slice(startIndex, endIndex);

    return {
      data: paginated,
      totalItems: data.length,
      totalPages: Math.ceil(data.length / pageSize),
    };
  }, [
    getTabData,
    categoryFilter,
    searchTerm,
    sortConfig,
    currentPage,
    pageSize,
  ]);

  const handleSort = useCallback((field: SortField) => {
    setSortConfig((prev) => ({
      field,
      direction:
        prev.field === field && prev.direction === "desc" ? "asc" : "desc",
    }));
    setCurrentPage(1);
  }, []);

  const copyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (error) {
      console.error("Failed to copy address:", error);
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) {
      return <ArrowUpDown className="h-4 w-4 text-[#6b7280]" />;
    }
    return sortConfig.direction === "desc" ? (
      <ArrowDown className="h-4 w-4 text-[#00bfff]" />
    ) : (
      <ArrowUp className="h-4 w-4 text-[#00bfff]" />
    );
  };

  const getCategoryBadge = (category: EnhancedParticipant["category"]) => {
    const configs = {
      whale: {
        color: "text-purple-400",
        bg: "bg-purple-400/10",
        icon: <TrendingUp className="h-3 w-3" />,
      },
      frequent_trader: {
        color: "text-blue-400",
        bg: "bg-blue-400/10",
        icon: <Activity className="h-3 w-3" />,
      },
      one_time_user: {
        color: "text-gray-400",
        bg: "bg-gray-400/10",
        icon: <Users className="h-3 w-3" />,
      },
      hub: {
        color: "text-orange-400",
        bg: "bg-orange-400/10",
        icon: <Network className="h-3 w-3" />,
      },
      regular: {
        color: "text-green-400",
        bg: "bg-green-400/10",
        icon: <Users className="h-3 w-3" />,
      },
    };

    const config = configs[category];
    return (
      <Badge
        className={`${config.color} ${config.bg} border-0 text-xs flex items-center gap-1`}
      >
        {config.icon}
        {category.replace("_", " ")}
      </Badge>
    );
  };

  const getRiskBadge = (riskScore: number) => {
    if (riskScore >= 70) {
      return (
        <Badge className="text-red-400 bg-red-400/10 border-0 text-xs flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          High Risk
        </Badge>
      );
    } else if (riskScore >= 40) {
      return (
        <Badge className="text-yellow-400 bg-yellow-400/10 border-0 text-xs flex items-center gap-1">
          <Shield className="h-3 w-3" />
          Medium Risk
        </Badge>
      );
    } else {
      return (
        <Badge className="text-green-400 bg-green-400/10 border-0 text-xs flex items-center gap-1">
          <Shield className="h-3 w-3" />
          Low Risk
        </Badge>
      );
    }
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case "top":
        return "Top Participants";
      case "behavioral":
        return "Behavioral Analysis";
      case "hubs":
        return "Hub Addresses";
      default:
        return "Participants";
    }
  };

  const getTabDescription = () => {
    switch (activeTab) {
      case "top":
        return "Highest volume participants by total transfer value";
      case "behavioral":
        return "Participants with notable behavioral patterns and insights";
      case "hubs":
        return "Highly connected addresses with significant network influence";
      default:
        return "";
    }
  };

  const categoryStats = useMemo(() => {
    const allParticipants = [
      ...enhancedParticipants.senders,
      ...enhancedParticipants.receivers,
    ];
    return {
      all: allParticipants.length,
      whale: allParticipants.filter((p) => p.category === "whale").length,
      frequent_trader: allParticipants.filter(
        (p) => p.category === "frequent_trader"
      ).length,
      one_time_user: allParticipants.filter(
        (p) => p.category === "one_time_user"
      ).length,
      hub: allParticipants.filter((p) => p.category === "hub").length,
      regular: allParticipants.filter((p) => p.category === "regular").length,
    };
  }, [enhancedParticipants]);

  return (
    <div className={className}>
      {/* Tab Navigation */}
      <div className="flex items-center gap-1 mb-6 bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-1">
        <button
          onClick={() => setActiveTab("top")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "top"
              ? "bg-[#00bfff] text-[#0f1419]"
              : "text-[#8b9dc3] hover:text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
          }`}
        >
          Top Participants
        </button>
        <button
          onClick={() => setActiveTab("behavioral")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "behavioral"
              ? "bg-[#00bfff] text-[#0f1419]"
              : "text-[#8b9dc3] hover:text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
          }`}
        >
          Behavioral Analysis
        </button>
        <button
          onClick={() => setActiveTab("hubs")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "hubs"
              ? "bg-[#00bfff] text-[#0f1419]"
              : "text-[#8b9dc3] hover:text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
          }`}
        >
          Hub Addresses
        </button>
      </div>

      {/* Table Container */}
      <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-[#00bfff] mb-1">
              {getTabTitle()}
            </h3>
            <p className="text-sm text-[#8b9dc3]">{getTabDescription()}</p>
          </div>
          <Badge
            variant="outline"
            className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
          >
            {processedData.totalItems} participants
          </Badge>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#6b7280]" />
            <Input
              placeholder="Search addresses or categories..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2 min-w-[200px]">
            <Filter className="h-4 w-4 text-[#8b9dc3]" />
            <Dropdown
              value={categoryFilter}
              onValueChange={(value) => {
                setCategoryFilter(value);
                setCurrentPage(1);
              }}
              placeholder="Filter by category"
              className="flex-1"
              options={[
                {
                  value: "all",
                  label: `All Categories (${categoryStats.all})`,
                },
                { value: "whale", label: `Whales (${categoryStats.whale})` },
                {
                  value: "frequent_trader",
                  label: `Frequent Traders (${categoryStats.frequent_trader})`,
                },
                { value: "hub", label: `Hubs (${categoryStats.hub})` },
                {
                  value: "regular",
                  label: `Regular (${categoryStats.regular})`,
                },
                {
                  value: "one_time_user",
                  label: `One-time Users (${categoryStats.one_time_user})`,
                },
              ]}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[rgba(0,191,255,0.2)]">
                <th className="text-left py-3 px-4">
                  <button
                    onClick={() => handleSort("address")}
                    className="flex items-center gap-2 text-sm font-medium text-[#8b9dc3] hover:text-[#00bfff] transition-colors"
                  >
                    Address & Category
                    {getSortIcon("address")}
                  </button>
                </th>
                <th className="text-right py-3 px-4">
                  <button
                    onClick={() => handleSort("total_value")}
                    className="flex items-center gap-2 text-sm font-medium text-[#8b9dc3] hover:text-[#00bfff] transition-colors ml-auto"
                  >
                    Total Value
                    {getSortIcon("total_value")}
                  </button>
                </th>
                <th className="text-right py-3 px-4">
                  <button
                    onClick={() => handleSort("transactions")}
                    className="flex items-center gap-2 text-sm font-medium text-[#8b9dc3] hover:text-[#00bfff] transition-colors ml-auto"
                  >
                    Activity
                    {getSortIcon("transactions")}
                  </button>
                </th>
                {activeTab === "behavioral" && (
                  <th className="text-center py-3 px-4">
                    <button
                      onClick={() => handleSort("riskScore")}
                      className="flex items-center gap-2 text-sm font-medium text-[#8b9dc3] hover:text-[#00bfff] transition-colors mx-auto"
                    >
                      Risk & Insights
                      {getSortIcon("riskScore")}
                    </button>
                  </th>
                )}
                {activeTab === "hubs" && (
                  <th className="text-center py-3 px-4">
                    <span className="text-sm font-medium text-[#8b9dc3]">
                      Network
                    </span>
                  </th>
                )}
                <th className="text-right py-3 px-4">
                  <button
                    onClick={() => handleSort("percentage_of_volume")}
                    className="flex items-center gap-2 text-sm font-medium text-[#8b9dc3] hover:text-[#00bfff] transition-colors ml-auto"
                  >
                    % of Volume
                    {getSortIcon("percentage_of_volume")}
                  </button>
                </th>
                <th className="text-center py-3 px-4">
                  <span className="text-sm font-medium text-[#8b9dc3]">
                    Actions
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {processedData.data.map((participant, index) => (
                <tr
                  key={participant.address}
                  className="border-b border-[rgba(0,191,255,0.1)] hover:bg-[rgba(0,191,255,0.05)] transition-colors"
                >
                  <td className="py-4 px-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <Badge
                          variant="outline"
                          className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)] text-xs"
                        >
                          #{(currentPage - 1) * pageSize + index + 1}
                        </Badge>
                        <div>
                          <div className="font-mono text-sm text-[#8b9dc3]">
                            {participant.address_short}
                          </div>
                          <div className="font-mono text-xs text-[#6b7280]">
                            {participant.address}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getCategoryBadge(participant.category)}
                        {participant.insights.length > 0 && (
                          <Badge className="text-yellow-400 bg-yellow-400/10 border-0 text-xs flex items-center gap-1">
                            <Brain className="h-3 w-3" />
                            {participant.insights.length} insights
                          </Badge>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="font-mono text-sm text-[#00bfff]">
                      {formatPyusdValue(participant.total_value)} PYUSD
                    </div>
                    <div className="text-xs text-[#6b7280]">
                      {formatPyusdValue(
                        participant.total_value / participant.transactions
                      )}{" "}
                      avg
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="text-sm text-[#8b9dc3]">
                      {participant.transactions.toLocaleString()} txns
                    </div>
                    <div className="text-xs text-[#6b7280]">
                      {participant.activityPattern.consistency} consistency
                    </div>
                  </td>
                  {activeTab === "behavioral" && (
                    <td className="py-4 px-4 text-center">
                      <div className="space-y-2">
                        {getRiskBadge(participant.riskScore)}
                        <div className="text-xs text-[#6b7280]">
                          {participant.activityPattern.volumePattern} pattern
                        </div>
                      </div>
                    </td>
                  )}
                  {activeTab === "hubs" && (
                    <td className="py-4 px-4 text-center">
                      <div className="space-y-1">
                        <div className="text-sm text-[#00bfff]">
                          {participant.relationships.uniqueCounterparties}{" "}
                          connections
                        </div>
                        <div className="text-xs text-[#6b7280]">
                          {participant.relationships.hubConnections} hub links
                        </div>
                      </div>
                    </td>
                  )}
                  <td className="py-4 px-4 text-right">
                    <div className="text-sm text-[#8b9dc3]">
                      {participant.percentage_of_volume.toFixed(2)}%
                    </div>
                    <div className="w-full bg-[rgba(0,191,255,0.1)] rounded-full h-1 mt-1">
                      <div
                        className="bg-[#00bfff] h-1 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(participant.percentage_of_volume * 2, 100)}%`,
                        }}
                      />
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyAddress(participant.address)}
                        className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                      >
                        {copiedAddress === participant.address ? (
                          "Copied!"
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          window.open(
                            `https://etherscan.io/address/${participant.address}`,
                            "_blank"
                          )
                        }
                        className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {processedData.totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-[rgba(0,191,255,0.1)]">
            <div className="text-sm text-[#8b9dc3]">
              Showing {(currentPage - 1) * pageSize + 1} to{" "}
              {Math.min(currentPage * pageSize, processedData.totalItems)} of{" "}
              {processedData.totalItems} participants
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)] disabled:opacity-50"
              >
                Previous
              </Button>
              <span className="text-sm text-[#8b9dc3]">
                Page {currentPage} of {processedData.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((prev) =>
                    Math.min(processedData.totalPages, prev + 1)
                  )
                }
                disabled={currentPage === processedData.totalPages}
                className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)] disabled:opacity-50"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
