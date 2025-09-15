import React, { useMemo, useState } from "react";
import { Card } from "@/components/global/Card";
import { Button } from "@/components/global/Button";
import { Input } from "@/components/global/Input";
import { Badge } from "@/components/global/Badge";
import { Alert, AlertDescription } from "@/components/global/Alert";
import {
  Activity,
  AlertTriangle,
  Bookmark,
  Calendar,
  Download,
  Eye,
  Filter,
  Heart,
  History,
  Search,
  Share2,
  Shield,
  Trash2,
  Zap,
} from "lucide-react";
import { useDataPersistence } from "@/hooks/tracetransaction";
import { useNavigate } from "react-router-dom";
import type {
  AnalysisHistoryItem,
  HistorySearchFilters,
} from "@/lib/tracetransaction/dataPersistence";

interface AnalysisHistoryProps {
  className?: string;
}

export const AnalysisHistory: React.FC<AnalysisHistoryProps> = ({
  className = "",
}) => {
  const navigate = useNavigate();
  const {
    history,
    bookmarks,
    storageStats,
    isLoading,
    error,
    deleteFromHistory,
    clearHistory,
    addBookmark,
    removeBookmark,
    toggleFavorite,
    searchHistory,
    exportAnalysis,
    generateShareData,
    isBookmarked,
    isFavorite,
    clearError,
  } = useDataPersistence();

  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<HistorySearchFilters>({});
  const [selectedTab, setSelectedTab] = useState<"history" | "bookmarks">(
    "history"
  );

  const filteredHistory = useMemo(() => {
    if (selectedTab === "bookmarks") {
      return bookmarks.map((bookmark) => {
        const historyItem = history.find(
          (h) => h.transactionHash === bookmark.transactionHash
        );
        return (
          historyItem || {
            id: bookmark.id || "",
            transactionHash: bookmark.transactionHash,
            timestamp: bookmark.timestamp || Date.now(),
            summary: {
              totalActions: 0,
              totalGasUsed: 0,
              errorsCount: 0,
              pyusdInteractions: 0,
              pattern: "unknown",
              riskLevel: "low",
              mevDetected: false,
            },
            tags: bookmark.tags,
            size: 0,
          }
        );
      });
    }

    if (!searchQuery && Object.keys(filters).length === 0) {
      return history;
    }

    return searchHistory(searchQuery, filters);
  }, [history, bookmarks, searchQuery, filters, selectedTab, searchHistory]);

  const handleViewAnalysis = (transactionHash: string) => {
    navigate(`/trace-transaction-analyzer/${transactionHash}`);
  };

  const handleBookmarkToggle = (item: AnalysisHistoryItem) => {
    if (isBookmarked(item.transactionHash)) {
      removeBookmark(item.transactionHash);
    } else {
      addBookmark({
        transactionHash: item.transactionHash,
        title: `Analysis ${item.transactionHash.slice(0, 10)}...`,
        description: `${item.summary.pattern} pattern with ${item.summary.totalActions} actions`,
        tags: item.tags,
      });
    }
  };

  const handleExport = (transactionHash: string, format: "json" | "csv") => {
    const data = exportAnalysis(transactionHash, format);
    if (data) {
      const blob = new Blob([data], {
        type: format === "json" ? "application/json" : "text/csv",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analysis_${transactionHash.slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleShare = (transactionHash: string) => {
    const shareData = generateShareData(transactionHash);
    if (shareData && navigator.share) {
      navigator.share({
        title: "Transaction Analysis",
        text: `Analysis of transaction ${transactionHash}`,
        url: shareData.url,
      });
    } else if (shareData) {
      navigator.clipboard.writeText(shareData.url);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "critical":
        return "text-red-400 bg-red-500/10 border-red-500/30";
      case "high":
        return "text-orange-400 bg-orange-500/10 border-orange-500/30";
      case "medium":
        return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
      case "low":
        return "text-green-400 bg-green-500/10 border-green-500/30";
      default:
        return "text-gray-400 bg-gray-500/10 border-gray-500/30";
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isLoading) {
    return (
      <Card title="Analysis History" className={`p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2 text-[#00bfff]">
            <Activity className="h-5 w-5 animate-spin" />
            <span>Loading history...</span>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <Card title="Analysis History & Bookmarks" className="p-6">
        <div className="flex items-center gap-2 mb-4 text-[#00bfff]">
          <History className="h-5 w-5" />
          <span className="font-semibold">Transaction Analysis History</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-3 bg-[#1a1a1a] rounded-lg border border-[rgba(0,191,255,0.3)]">
            <div className="text-sm text-gray-400">History Items</div>
            <div className="text-lg font-semibold text-white">
              {storageStats.historyCount}
            </div>
          </div>
          <div className="p-3 bg-[#1a1a1a] rounded-lg border border-[rgba(0,191,255,0.3)]">
            <div className="text-sm text-gray-400">Bookmarks</div>
            <div className="text-lg font-semibold text-white">
              {storageStats.bookmarkCount}
            </div>
          </div>
          <div className="p-3 bg-[#1a1a1a] rounded-lg border border-[rgba(0,191,255,0.3)]">
            <div className="text-sm text-gray-400">Storage Used</div>
            <div className="text-lg font-semibold text-white">
              {formatSize(storageStats.totalStorageSize)}
            </div>
          </div>
          <div className="p-3 bg-[#1a1a1a] rounded-lg border border-[rgba(0,191,255,0.3)]">
            <div className="text-sm text-gray-400">Storage %</div>
            <div className="text-lg font-semibold text-white">
              {storageStats.storageUsagePercent.toFixed(1)}%
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <Button
            variant={selectedTab === "history" ? "default" : "outline"}
            onClick={() => setSelectedTab("history")}
            className="flex items-center gap-2"
          >
            <History className="h-4 w-4" />
            History ({storageStats.historyCount})
          </Button>
          <Button
            variant={selectedTab === "bookmarks" ? "default" : "outline"}
            onClick={() => setSelectedTab("bookmarks")}
            className="flex items-center gap-2"
          >
            <Bookmark className="h-4 w-4" />
            Bookmarks ({storageStats.bookmarkCount})
          </Button>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by transaction hash, pattern, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>
            {history.length > 0 && (
              <Button
                variant="outline"
                onClick={clearHistory}
                className="flex items-center gap-2 text-red-400 border-red-500/30 hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4" />
                Clear All
              </Button>
            )}
          </div>

          {showFilters && (
            <div className="p-4 bg-[#1a1a1a] rounded-lg border border-[rgba(0,191,255,0.3)] space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">
                    Pattern
                  </label>
                  <select
                    value={filters.pattern || ""}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        pattern: e.target.value || undefined,
                      }))
                    }
                    className="w-full p-2 bg-[#0a0a0a] border border-gray-600 rounded text-white text-sm"
                  >
                    <option value="">All Patterns</option>
                    <option value="simple_transfer">Simple Transfer</option>
                    <option value="swap_operation">Swap Operation</option>
                    <option value="liquidity_provision">
                      Liquidity Provision
                    </option>
                    <option value="bridge_operation">Bridge Operation</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">
                    Risk Level
                  </label>
                  <select
                    value={filters.riskLevel || ""}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        riskLevel: e.target.value || undefined,
                      }))
                    }
                    className="w-full p-2 bg-[#0a0a0a] border border-gray-600 rounded text-white text-sm"
                  >
                    <option value="">All Risk Levels</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">
                    MEV Detection
                  </label>
                  <select
                    value={
                      filters.mevDetected === undefined
                        ? ""
                        : filters.mevDetected.toString()
                    }
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        mevDetected:
                          e.target.value === ""
                            ? undefined
                            : e.target.value === "true",
                      }))
                    }
                    className="w-full p-2 bg-[#0a0a0a] border border-gray-600 rounded text-white text-sm"
                  >
                    <option value="">All</option>
                    <option value="true">MEV Detected</option>
                    <option value="false">No MEV</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
            <Button
              variant="outline"
              size="sm"
              onClick={clearError}
              className="ml-2"
            >
              Dismiss
            </Button>
          </Alert>
        )}
      </Card>

      <div className="space-y-4">
        {filteredHistory.length === 0 ? (
          <Card className="p-8 text-center">
            <History className="h-12 w-12 mx-auto mb-4 text-gray-500" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">
              {selectedTab === "history"
                ? "No Analysis History"
                : "No Bookmarks"}
            </h3>
            <p className="text-gray-500">
              {selectedTab === "history"
                ? "Start analyzing transactions to build your history"
                : "Bookmark interesting analyses to access them quickly"}
            </p>
          </Card>
        ) : (
          filteredHistory.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-sm text-[#00bfff]">
                      {item.transactionHash.slice(0, 20)}...
                    </span>
                    <Badge className={getRiskColor(item.summary.riskLevel)}>
                      {item.summary.riskLevel}
                    </Badge>
                    {item.summary.mevDetected && (
                      <Badge className="text-orange-400 bg-orange-500/10 border-orange-500/30">
                        MEV
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                    <div className="flex items-center gap-1">
                      <Activity className="h-3 w-3 text-gray-400" />
                      <span className="text-gray-400">Actions:</span>
                      <span className="text-white">
                        {item.summary.totalActions}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Zap className="h-3 w-3 text-gray-400" />
                      <span className="text-gray-400">Gas:</span>
                      <span className="text-white">
                        {item.summary.totalGasUsed.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Shield className="h-3 w-3 text-gray-400" />
                      <span className="text-gray-400">Pattern:</span>
                      <span className="text-white capitalize">
                        {item.summary.pattern.replace("_", " ")}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-gray-400" />
                      <span className="text-gray-400">Date:</span>
                      <span className="text-white">
                        {formatDate(item.timestamp)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {item.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-1 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewAnalysis(item.transactionHash)}
                    className="p-2"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBookmarkToggle(item)}
                    className={`p-2 ${isBookmarked(item.transactionHash) ? "text-[#00bfff] border-[#00bfff]" : ""}`}
                  >
                    <Bookmark className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleFavorite(item.transactionHash)}
                    className={`p-2 ${isFavorite(item.transactionHash) ? "text-red-400 border-red-400" : ""}`}
                  >
                    <Heart className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport(item.transactionHash, "json")}
                    className="p-2"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleShare(item.transactionHash)}
                    className="p-2"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteFromHistory(item.transactionHash)}
                    className="p-2 text-red-400 border-red-500/30 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
