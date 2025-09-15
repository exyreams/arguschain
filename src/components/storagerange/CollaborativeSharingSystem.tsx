import React, { useCallback, useMemo, useState } from "react";
import { Card } from "@/components/global/Card";
import { Button } from "@/components/global/Button";
import { Input } from "@/components/global/Input";
import { Badge } from "@/components/global/Badge";
import {
  Bookmark,
  Clock,
  Eye,
  GitBranch,
  Link,
  Share2,
  Star,
  Trash2,
  Users,
} from "lucide-react";

interface CollaborativeSharingSystemProps {
  analysisData: {
    id: string;
    title: string;
    contractAddress: string;
    blockHash: string;
    analysisType: string;
    results: any;
    createdAt: Date;
    updatedAt: Date;
  };
  onShare?: (shareResult: ShareResult) => void;
  className?: string;
}

interface ShareableAnalysis {
  id: string;
  title: string;
  description: string;
  contractAddress: string;
  blockHash: string;
  analysisType: string;
  state: any;
  metadata: {
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    version: number;
    tags: string[];
    isPublic: boolean;
    permissions: SharePermissions;
  };
  shareUrl: string;
  shortUrl: string;
}

interface SharePermissions {
  canView: string[];
  canEdit: string[];
  canComment: string[];
  isPublic: boolean;
  requiresAuth: boolean;
  expiresAt?: Date;
}

interface ShareResult {
  success: boolean;
  shareUrl: string;
  shortUrl: string;
  shareId: string;
  error?: string;
}

interface Bookmark {
  id: string;
  title: string;
  description: string;
  url: string;
  tags: string[];
  createdAt: Date;
  isFavorite: boolean;
  category: "analysis" | "comparison" | "security" | "historical";
}

interface TeamWorkspace {
  id: string;
  name: string;
  description: string;
  members: TeamMember[];
  analyses: string[];
  permissions: WorkspacePermissions;
  createdAt: Date;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "editor" | "viewer";
  joinedAt: Date;
  lastActive: Date;
}

interface WorkspacePermissions {
  canInvite: string[];
  canManage: string[];
  defaultRole: TeamMember["role"];
}

interface AnalysisVersion {
  id: string;
  version: number;
  title: string;
  changes: string;
  createdBy: string;
  createdAt: Date;
  state: any;
}

export const CollaborativeSharingSystem: React.FC<
  CollaborativeSharingSystemProps
> = ({ analysisData, onShare, className = "" }) => {
  const [activeTab, setActiveTab] = useState<
    "share" | "bookmarks" | "workspace" | "versions"
  >("share");
  const [shareOptions, setShareOptions] = useState<Partial<SharePermissions>>({
    isPublic: false,
    requiresAuth: true,
  });
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [workspaces, setWorkspaces] = useState<TeamWorkspace[]>([]);
  const [versions, setVersions] = useState<AnalysisVersion[]>([]);
  const [shareTitle, setShareTitle] = useState(analysisData.title);
  const [shareDescription, setShareDescription] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const generateShareUrl = useCallback(async (): Promise<ShareResult> => {
    try {
      const shareId = `share-${Date.now()}`;
      const baseUrl = window.location.origin;
      const shareUrl = `${baseUrl}/shared/${shareId}`;
      const shortUrl = `${baseUrl}/s/${shareId.slice(-8)}`;

      const shareableAnalysis: ShareableAnalysis = {
        id: shareId,
        title: shareTitle,
        description: shareDescription,
        contractAddress: analysisData.contractAddress,
        blockHash: analysisData.blockHash,
        analysisType: analysisData.analysisType,
        state: analysisData.results,
        metadata: {
          createdBy: "current-user",
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
          tags: selectedTags,
          isPublic: shareOptions.isPublic || false,
          permissions: shareOptions as SharePermissions,
        },
        shareUrl,
        shortUrl,
      };

      localStorage.setItem(
        `shared-analysis-${shareId}`,
        JSON.stringify(shareableAnalysis),
      );

      return {
        success: true,
        shareUrl,
        shortUrl,
        shareId,
      };
    } catch (error) {
      return {
        success: false,
        shareUrl: "",
        shortUrl: "",
        shareId: "",
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate share URL",
      };
    }
  }, [shareTitle, shareDescription, selectedTags, shareOptions, analysisData]);

  const createShareableLink = useCallback(async () => {
    const result = await generateShareUrl();

    if (result.success) {
      await navigator.clipboard.writeText(result.shareUrl);
      onShare?.(result);
    }
  }, [generateShareUrl, onShare]);

  const addBookmark = useCallback(
    (url: string, title: string, category: Bookmark["category"]) => {
      const newBookmark: Bookmark = {
        id: `bookmark-${Date.now()}`,
        title,
        description: shareDescription,
        url,
        tags: selectedTags,
        createdAt: new Date(),
        isFavorite: false,
        category,
      };

      setBookmarks((prev) => [newBookmark, ...prev]);
    },
    [shareDescription, selectedTags],
  );

  const toggleBookmarkFavorite = useCallback((bookmarkId: string) => {
    setBookmarks((prev) =>
      prev.map((bookmark) =>
        bookmark.id === bookmarkId
          ? { ...bookmark, isFavorite: !bookmark.isFavorite }
          : bookmark,
      ),
    );
  }, []);

  const removeBookmark = useCallback((bookmarkId: string) => {
    setBookmarks((prev) =>
      prev.filter((bookmark) => bookmark.id !== bookmarkId),
    );
  }, []);

  const createVersion = useCallback(
    (changes: string) => {
      const newVersion: AnalysisVersion = {
        id: `version-${Date.now()}`,
        version: versions.length + 1,
        title: `Version ${versions.length + 1}`,
        changes,
        createdBy: "current-user",
        createdAt: new Date(),
        state: analysisData.results,
      };

      setVersions((prev) => [newVersion, ...prev]);
    },
    [versions.length, analysisData.results],
  );

  const availableTags = useMemo(
    () => [
      "security",
      "analysis",
      "comparison",
      "historical",
      "pyusd",
      "proxy",
      "erc20",
      "defi",
      "audit",
    ],
    [],
  );

  const filteredBookmarks = useMemo(() => {
    return bookmarks.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }, [bookmarks]);

  return (
    <Card
      className={`bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)] ${className}`}
    >
      <div className="flex items-center gap-2 mb-4">
        <Share2 className="h-5 w-5 text-[#00bfff]" />
        <h3 className="text-lg font-semibold text-[#00bfff]">
          Collaborative Sharing
        </h3>
      </div>

      <div className="flex items-center gap-1 p-1 rounded border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)] mb-6">
        {[
          { id: "share", label: "Share", icon: Share2 },
          { id: "bookmarks", label: "Bookmarks", icon: Bookmark },
          { id: "workspace", label: "Workspace", icon: Users },
          { id: "versions", label: "Versions", icon: GitBranch },
        ].map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            variant={activeTab === id ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab(id as any)}
            className="flex items-center gap-2"
          >
            <Icon className="h-4 w-4" />
            {label}
          </Button>
        ))}
      </div>

      {activeTab === "share" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium text-[#00bfff]">
                Share Configuration
              </h4>

              <div>
                <label className="block text-sm font-medium text-[#8b9dc3] mb-2">
                  Share Title
                </label>
                <Input
                  value={shareTitle}
                  onChange={(e) => setShareTitle(e.target.value)}
                  className="bg-[rgba(15,20,25,0.8)] border-[rgba(0,191,255,0.3)] text-[#8b9dc3]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#8b9dc3] mb-2">
                  Description
                </label>
                <textarea
                  value={shareDescription}
                  onChange={(e) => setShareDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.3)] text-[#8b9dc3] rounded-md px-3 py-2 text-sm"
                  placeholder="Describe this analysis..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#8b9dc3] mb-2">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <Button
                      key={tag}
                      variant={
                        selectedTags.includes(tag) ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => {
                        setSelectedTags((prev) =>
                          prev.includes(tag)
                            ? prev.filter((t) => t !== tag)
                            : [...prev, tag],
                        );
                      }}
                      className="text-xs"
                    >
                      {tag}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-[#00bfff]">Permissions</h4>

              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={shareOptions.isPublic || false}
                    onChange={(e) =>
                      setShareOptions((prev) => ({
                        ...prev,
                        isPublic: e.target.checked,
                      }))
                    }
                    className="rounded border-[rgba(0,191,255,0.3)]"
                  />
                  <span className="text-[#8b9dc3] text-sm">Make public</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={shareOptions.requiresAuth || false}
                    onChange={(e) =>
                      setShareOptions((prev) => ({
                        ...prev,
                        requiresAuth: e.target.checked,
                      }))
                    }
                    className="rounded border-[rgba(0,191,255,0.3)]"
                  />
                  <span className="text-[#8b9dc3] text-sm">
                    Require authentication
                  </span>
                </label>
              </div>

              <div className="p-3 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
                <h5 className="font-medium text-[#00bfff] mb-2">
                  Share Preview
                </h5>
                <div className="space-y-1 text-sm text-[#8b9dc3]">
                  <div>Title: {shareTitle}</div>
                  <div>
                    Contract: {analysisData.contractAddress.slice(0, 8)}...
                  </div>
                  <div>Type: {analysisData.analysisType}</div>
                  <div>
                    Visibility: {shareOptions.isPublic ? "Public" : "Private"}
                  </div>
                  <div>Tags: {selectedTags.join(", ") || "None"}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={createShareableLink}
              className="bg-[rgba(0,191,255,0.1)] border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.2)]"
            >
              <Link className="h-4 w-4 mr-2" />
              Create Shareable Link
            </Button>

            <Button
              variant="outline"
              onClick={() =>
                addBookmark(window.location.href, shareTitle, "analysis")
              }
              className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
            >
              <Bookmark className="h-4 w-4 mr-2" />
              Bookmark
            </Button>
          </div>
        </div>
      )}

      {activeTab === "bookmarks" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-[#00bfff]">Saved Analyses</h4>
            <Badge
              variant="outline"
              className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
            >
              {bookmarks.length} Bookmarks
            </Badge>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
            {filteredBookmarks.map((bookmark) => (
              <div
                key={bookmark.id}
                className="p-3 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-[#00bfff]">
                        {bookmark.title}
                      </span>
                      {bookmark.isFavorite && (
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      )}
                      <Badge
                        variant="outline"
                        className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                      >
                        {bookmark.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-[#8b9dc3] mb-2">
                      {bookmark.description}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-[#6b7280]">
                      <Clock className="h-3 w-3" />
                      {bookmark.createdAt.toLocaleDateString()}
                      {bookmark.tags.length > 0 && (
                        <>
                          <span>•</span>
                          <span>{bookmark.tags.join(", ")}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleBookmarkFavorite(bookmark.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Star
                        className={`h-4 w-4 ${bookmark.isFavorite ? "text-yellow-400 fill-current" : "text-[#8b9dc3]"}`}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(bookmark.url, "_blank")}
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeBookmark(bookmark.id)}
                      className="h-8 w-8 p-0 text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {bookmarks.length === 0 && (
              <div className="text-center py-8 text-[#8b9dc3]">
                No bookmarks saved yet. Create shareable links to start building
                your collection.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "workspace" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-[#00bfff]">Team Workspaces</h4>
            <Button
              size="sm"
              className="bg-[rgba(0,191,255,0.1)] border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.2)]"
            >
              <Users className="h-4 w-4 mr-1" />
              Create Workspace
            </Button>
          </div>

          <div className="text-center py-8 text-[#8b9dc3]">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <h5 className="font-medium mb-2">Team Collaboration</h5>
            <p className="text-sm">
              Create workspaces to collaborate with your team on storage
              analysis. Share analyses, leave comments, and track changes
              together.
            </p>
          </div>
        </div>
      )}

      {activeTab === "versions" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-[#00bfff]">Analysis Versions</h4>
            <Button
              size="sm"
              onClick={() => createVersion("Manual save")}
              className="bg-[rgba(0,191,255,0.1)] border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.2)]"
            >
              <GitBranch className="h-4 w-4 mr-1" />
              Save Version
            </Button>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
            {versions.map((version) => (
              <div
                key={version.id}
                className="p-3 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                    >
                      v{version.version}
                    </Badge>
                    <span className="font-medium text-[#00bfff]">
                      {version.title}
                    </span>
                  </div>
                  <div className="text-xs text-[#6b7280]">
                    {version.createdAt.toLocaleString()}
                  </div>
                </div>
                <p className="text-sm text-[#8b9dc3] mb-2">{version.changes}</p>
                <div className="text-xs text-[#6b7280]">
                  Created by {version.createdBy}
                </div>
              </div>
            ))}

            {versions.length === 0 && (
              <div className="text-center py-8 text-[#8b9dc3]">
                No versions saved yet. Click "Save Version" to create your first
                checkpoint.
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};
