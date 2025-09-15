import React, { useCallback, useState } from "react";
import { Badge, Button, Card, Input } from "@/components/global";
import {
  Bookmark,
  CheckCircle,
  Clock,
  Copy,
  Download,
  Edit3,
  Eye,
  Link,
  Lock,
  Mail,
  MessageSquare,
  Share2,
  Twitter,
  Unlock,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AnalysisState {
  transactionHash?: string;
  blockNumber?: number;
  network: string;
  analysisType: "transaction" | "block" | "security" | "gas";
  filters: {
    dateRange?: { start: number; end: number };
    minAmount?: number;
    securityLevel?: string;
    gasThreshold?: number;
  };
  viewSettings: {
    activeTab: string;
    chartType: string;
    showDetails: boolean;
    groupBy: string;
  };
  selectedItems: string[];
  timestamp: number;
}

interface SharedAnalysis {
  id: string;
  title: string;
  description: string;
  state: AnalysisState;
  shareUrl: string;
  qrCode?: string;
  privacy: "public" | "private" | "team";
  expiresAt?: number;
  createdAt: number;
  updatedAt: number;
  viewCount: number;
  sharedBy: {
    name: string;
    email?: string;
  };
  collaborators?: {
    email: string;
    permission: "view" | "edit";
    addedAt: number;
  }[];
  tags: string[];
  bookmarked: boolean;
}

interface ShareableAnalysisProps {
  currentState: AnalysisState;
  onStateRestore?: (state: AnalysisState) => void;
  onShare?: (shareData: any) => void;
  className?: string;
  showCollaboration?: boolean;
  showBookmarks?: boolean;
}

class AnalysisStateManager {
  private static readonly BASE_URL = window.location.origin;
  private static readonly SHARE_PATH = "/replay-analysis";

  static encodeState(state: AnalysisState): string {
    try {
      const compressed = this.compressState(state);
      return btoa(JSON.stringify(compressed));
    } catch (error) {
      console.error("Failed to encode state:", error);
      return "";
    }
  }

  static decodeState(encodedState: string): AnalysisState | null {
    try {
      const compressed = JSON.parse(atob(encodedState));
      return this.decompressState(compressed);
    } catch (error) {
      console.error("Failed to decode state:", error);
      return null;
    }
  }

  static generateShareUrl(
    state: AnalysisState,
    options: {
      privacy?: "public" | "private";
      expiresIn?: number;
      title?: string;
    } = {},
  ): string {
    const encodedState = this.encodeState(state);
    const params = new URLSearchParams({
      state: encodedState,
      t: Date.now().toString(),
    });

    if (options.title) {
      params.set("title", options.title);
    }

    if (options.expiresIn) {
      params.set("expires", (Date.now() + options.expiresIn).toString());
    }

    return `${this.BASE_URL}${this.SHARE_PATH}?${params.toString()}`;
  }

  static generateQRCode(url: string): string {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="200" height="200" xmlns="http:
        <rect width="200" height="200" fill="white"/>
        <rect x="20" y="20" width="160" height="160" fill="black"/>
        <rect x="40" y="40" width="120" height="120" fill="white"/>
        <text x="100" y="105" text-anchor="middle" font-size="12" fill="black">QR Code</text>
      </svg>
    `)}`;
  }

  private static compressState(state: AnalysisState): any {
    return {
      tx: state.transactionHash,
      bn: state.blockNumber,
      net: state.network,
      type: state.analysisType,
      f: {
        dr: state.filters.dateRange,
        ma: state.filters.minAmount,
        sl: state.filters.securityLevel,
        gt: state.filters.gasThreshold,
      },
      vs: {
        at: state.viewSettings.activeTab,
        ct: state.viewSettings.chartType,
        sd: state.viewSettings.showDetails,
        gb: state.viewSettings.groupBy,
      },
      si: state.selectedItems,
      ts: state.timestamp,
    };
  }

  private static decompressState(compressed: any): AnalysisState {
    return {
      transactionHash: compressed.tx,
      blockNumber: compressed.bn,
      network: compressed.net || "mainnet",
      analysisType: compressed.type || "transaction",
      filters: {
        dateRange: compressed.f?.dr,
        minAmount: compressed.f?.ma,
        securityLevel: compressed.f?.sl,
        gasThreshold: compressed.f?.gt,
      },
      viewSettings: {
        activeTab: compressed.vs?.at || "overview",
        chartType: compressed.vs?.ct || "bar",
        showDetails: compressed.vs?.sd || false,
        groupBy: compressed.vs?.gb || "none",
      },
      selectedItems: compressed.si || [],
      timestamp: compressed.ts || Date.now(),
    };
  }
}

const mockSharedAnalyses: SharedAnalysis[] = [
  {
    id: "share-1",
    title: "PYUSD Large Transfer Analysis",
    description: "Analysis of large PYUSD transfers in block 18500000",
    state: {
      blockNumber: 18500000,
      network: "mainnet",
      analysisType: "block",
      filters: { minAmount: 10000 },
      viewSettings: {
        activeTab: "transfers",
        chartType: "sankey",
        showDetails: true,
        groupBy: "amount",
      },
      selectedItems: [],
      timestamp: Date.now() - 86400000,
    },
    shareUrl: "https://arguschain.com/replay-analysis?state=...",
    privacy: "public",
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
    viewCount: 23,
    sharedBy: { name: "Alice Johnson", email: "alice@example.com" },
    tags: ["pyusd", "large-transfers", "block-analysis"],
    bookmarked: true,
  },
  {
    id: "share-2",
    title: "Security Audit - Transaction 0x123...",
    description: "Comprehensive security analysis of suspicious transaction",
    state: {
      transactionHash: "0x123456789abcdef",
      network: "mainnet",
      analysisType: "security",
      filters: { securityLevel: "high" },
      viewSettings: {
        activeTab: "security",
        chartType: "timeline",
        showDetails: true,
        groupBy: "severity",
      },
      selectedItems: ["flag-1", "flag-2"],
      timestamp: Date.now() - 172800000,
    },
    shareUrl: "https://arguschain.com/replay-analysis?state=...",
    privacy: "team",
    expiresAt: Date.now() + 604800000, // 7 days
    createdAt: Date.now() - 172800000,
    updatedAt: Date.now() - 172800000,
    viewCount: 8,
    sharedBy: { name: "Bob Smith", email: "bob@example.com" },
    collaborators: [
      {
        email: "alice@example.com",
        permission: "edit",
        addedAt: Date.now() - 86400000,
      },
    ],
    tags: ["security", "audit", "suspicious"],
    bookmarked: false,
  },
];

export const ShareableAnalysis: React.FC<ShareableAnalysisProps> = ({
  currentState,
  onStateRestore,
  onShare,
  className,
  showCollaboration = true,
  showBookmarks = true,
}) => {
  const [activeTab, setActiveTab] = useState<"share" | "saved" | "bookmarks">(
    "share",
  );
  const [shareTitle, setShareTitle] = useState("");
  const [shareDescription, setShareDescription] = useState("");
  const [sharePrivacy, setSharePrivacy] = useState<
    "public" | "private" | "team"
  >("public");
  const [shareExpiry, setShareExpiry] = useState<
    "never" | "1day" | "1week" | "1month"
  >("never");
  const [collaboratorEmail, setCollaboratorEmail] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);
  const [savedAnalyses] = useState<SharedAnalysis[]>(mockSharedAnalyses);

  const generateShareData = useCallback(() => {
    const expiryMap = {
      never: undefined,
      "1day": 24 * 60 * 60 * 1000,
      "1week": 7 * 24 * 60 * 60 * 1000,
      "1month": 30 * 24 * 60 * 60 * 1000,
    };

    const url = AnalysisStateManager.generateShareUrl(currentState, {
      privacy: sharePrivacy,
      expiresIn: expiryMap[shareExpiry],
      title: shareTitle,
    });

    const qr = AnalysisStateManager.generateQRCode(url);

    setShareUrl(url);
    setQrCode(qr);
  }, [currentState, shareTitle, sharePrivacy, shareExpiry]);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  }, []);

  const shareVia = useCallback(
    (platform: "email" | "twitter" | "slack") => {
      const url =
        shareUrl || AnalysisStateManager.generateShareUrl(currentState);
      const title = shareTitle || "Blockchain Analysis";
      const description =
        shareDescription || "Check out this blockchain analysis";

      switch (platform) {
        case "email":
          window.open(
            `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${description}\n\n${url}`)}`,
          );
          break;
        case "twitter":
          window.open(
            `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${title} - ${description}`)}&url=${encodeURIComponent(url)}`,
          );
          break;
        case "slack":
          copyToClipboard(`${title}\n${description}\n${url}`);
          break;
      }
    },
    [shareUrl, currentState, shareTitle, shareDescription, copyToClipboard],
  );

  const handleShare = useCallback(() => {
    if (!shareUrl) {
      generateShareData();
    }

    const shareData = {
      title: shareTitle,
      description: shareDescription,
      privacy: sharePrivacy,
      expiry: shareExpiry,
      url: shareUrl,
      state: currentState,
    };

    onShare?.(shareData);
  }, [
    shareUrl,
    shareTitle,
    shareDescription,
    sharePrivacy,
    shareExpiry,
    currentState,
    onShare,
    generateShareData,
  ]);

  const handleRestore = useCallback(
    (analysis: SharedAnalysis) => {
      onStateRestore?.(analysis.state);
    },
    [onStateRestore],
  );

  const getPrivacyIcon = (privacy: string) => {
    switch (privacy) {
      case "public":
        return <Unlock className="h-3 w-3" />;
      case "private":
        return <Lock className="h-3 w-3" />;
      case "team":
        return <Users className="h-3 w-3" />;
      default:
        return <Eye className="h-3 w-3" />;
    }
  };

  const getPrivacyColor = (privacy: string) => {
    switch (privacy) {
      case "public":
        return "text-green-600";
      case "private":
        return "text-red-600";
      case "team":
        return "text-blue-600";
      default:
        return "text-gray-600";
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    const hours = Math.floor(diff / (60 * 60 * 1000));
    const minutes = Math.floor(diff / (60 * 1000));

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  };

  return (
    <Card className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center space-x-2">
            <Share2 className="h-5 w-5" />
            <span>Shareable Analysis</span>
          </h3>
          <p className="text-sm text-muted-foreground">
            Share analysis results and collaborate with your team
          </p>
        </div>
      </div>

      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        {[
          { id: "share", label: "Share", icon: Share2 },
          { id: "saved", label: "Saved", icon: Download },
          ...(showBookmarks
            ? [{ id: "bookmarks", label: "Bookmarks", icon: Bookmark }]
            : []),
        ].map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex-1 flex items-center justify-center space-x-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <TabIcon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-4">
        {activeTab === "share" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Title
                  </label>
                  <Input
                    placeholder="Analysis title"
                    value={shareTitle}
                    onChange={(e) => setShareTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Description
                  </label>
                  <textarea
                    placeholder="Brief description of the analysis"
                    value={shareDescription}
                    onChange={(e) => setShareDescription(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-md bg-background resize-none"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Privacy
                    </label>
                    <select
                      value={sharePrivacy}
                      onChange={(e) => setSharePrivacy(e.target.value as any)}
                      className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                    >
                      <option value="public">Public</option>
                      <option value="team">Team Only</option>
                      <option value="private">Private</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Expires
                    </label>
                    <select
                      value={shareExpiry}
                      onChange={(e) => setShareExpiry(e.target.value as any)}
                      className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                    >
                      <option value="never">Never</option>
                      <option value="1day">1 Day</option>
                      <option value="1week">1 Week</option>
                      <option value="1month">1 Month</option>
                    </select>
                  </div>
                </div>

                {showCollaboration && sharePrivacy === "team" && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Add Collaborator
                    </label>
                    <div className="flex space-x-2">
                      <Input
                        placeholder="email@example.com"
                        value={collaboratorEmail}
                        onChange={(e) => setCollaboratorEmail(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // Add collaborator logic
                          setCollaboratorEmail("");
                        }}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                )}

                <Button onClick={generateShareData} className="w-full">
                  <Link className="h-4 w-4 mr-2" />
                  Generate Share Link
                </Button>
              </div>

              <div className="space-y-4">
                {shareUrl && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Share URL
                    </label>
                    <div className="flex space-x-2">
                      <Input
                        value={shareUrl}
                        readOnly
                        className="flex-1 font-mono text-xs"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(shareUrl)}
                      >
                        {copySuccess ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {qrCode && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      QR Code
                    </label>
                    <div className="flex justify-center p-4 border rounded-lg bg-white">
                      <img src={qrCode} alt="QR Code" className="w-32 h-32" />
                    </div>
                  </div>
                )}

                {shareUrl && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Share Via
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => shareVia("email")}
                        className="flex items-center justify-center"
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => shareVia("twitter")}
                        className="flex items-center justify-center"
                      >
                        <Twitter className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => shareVia("slack")}
                        className="flex items-center justify-center"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {shareUrl && (
              <div className="flex justify-center">
                <Button onClick={handleShare}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Analysis
                </Button>
              </div>
            )}
          </div>
        )}

        {activeTab === "saved" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Saved Analyses</h4>
              <Badge variant="outline">{savedAnalyses.length} saved</Badge>
            </div>

            <div className="space-y-3">
              {savedAnalyses.map((analysis) => (
                <div
                  key={analysis.id}
                  className="p-4 border rounded-lg hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <h5 className="text-sm font-medium truncate">
                          {analysis.title}
                        </h5>
                        <div
                          className={cn(
                            "flex items-center space-x-1",
                            getPrivacyColor(analysis.privacy),
                          )}
                        >
                          {getPrivacyIcon(analysis.privacy)}
                          <span className="text-xs">{analysis.privacy}</span>
                        </div>
                        {analysis.bookmarked && (
                          <Bookmark className="h-3 w-3 text-yellow-600 fill-current" />
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                        {analysis.description}
                      </p>

                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <span>{formatTimeAgo(analysis.createdAt)}</span>
                        <span>{analysis.viewCount} views</span>
                        <span>by {analysis.sharedBy.name}</span>
                        {analysis.expiresAt && (
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>
                              expires {formatTimeAgo(analysis.expiresAt)}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1 mt-2">
                        {analysis.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(analysis.shareUrl)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestore(analysis)}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Edit3 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {analysis.collaborators &&
                    analysis.collaborators.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-xs text-muted-foreground mb-1">
                          Collaborators:
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {analysis.collaborators.map((collab) => (
                            <Badge
                              key={collab.email}
                              variant="outline"
                              className="text-xs"
                            >
                              {collab.email} ({collab.permission})
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "bookmarks" && showBookmarks && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Bookmarked Analyses</h4>
              <Badge variant="outline">
                {savedAnalyses.filter((a) => a.bookmarked).length} bookmarked
              </Badge>
            </div>

            <div className="space-y-3">
              {savedAnalyses
                .filter((analysis) => analysis.bookmarked)
                .map((analysis) => (
                  <div
                    key={analysis.id}
                    className="p-4 border rounded-lg hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <Bookmark className="h-4 w-4 text-yellow-600 fill-current mt-0.5" />

                        <div className="flex-1 min-w-0">
                          <h5 className="text-sm font-medium mb-1">
                            {analysis.title}
                          </h5>
                          <p className="text-xs text-muted-foreground mb-2">
                            {analysis.description}
                          </p>
                          <div className="text-xs text-muted-foreground">
                            Bookmarked {formatTimeAgo(analysis.createdAt)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRestore(analysis)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Open
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

              {savedAnalyses.filter((a) => a.bookmarked).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Bookmark className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No bookmarked analyses</p>
                  <p className="text-xs">
                    Bookmark analyses to access them quickly
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
