import React, { useState, useRef, useEffect } from "react";
import {
  Bookmark,
  BookmarkPlus,
  Loader2,
  Search,
  Trash2,
  X,
  Clock,
  Network,
} from "lucide-react";
import { FaDownload } from "react-icons/fa6";
import { Button, Input } from "@/components/global";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useBlockTraceBookmarks,
  useCreateBlockTraceBookmark,
  useDeleteBlockTraceBookmark,
} from "@/hooks/blocktrace/useBlockTraceBookmarks";
import type { BlockTraceBookmark } from "@/lib/blocktrace/bookmarks";

interface BookmarkManagerProps {
  onLoadBookmark: (blockIdentifier: string, analysisType: string) => void;
  className?: string;
}

export function BookmarkManager({
  onLoadBookmark,
  className = "",
}: BookmarkManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const { data: bookmarks = [], isLoading } = useBlockTraceBookmarks();
  const createBookmark = useCreateBlockTraceBookmark();
  const deleteBookmark = useDeleteBlockTraceBookmark();

  // Filter bookmarks based on search term
  const filteredBookmarks = bookmarks.filter(
    (bookmark) =>
      bookmark.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bookmark.query_config.blockIdentifier
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      bookmark.query_config.network
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
  );

  const handleLoadBookmark = (bookmark: BlockTraceBookmark) => {
    onLoadBookmark(
      bookmark.query_config.blockIdentifier,
      bookmark.query_config.analysisType
    );
    setIsOpen(false);
    toast.success(`Loaded bookmark: ${bookmark.title}`);
  };

  const handleDeleteBookmark = async (
    e: React.MouseEvent,
    bookmarkId: string
  ) => {
    e.stopPropagation();
    try {
      await deleteBookmark.mutateAsync(bookmarkId);
    } catch (error) {
      console.error("Failed to delete bookmark:", error);
    }
  };

  const handleQuickSave = async () => {
    const currentUrl = window.location.pathname;
    const blockMatch = currentUrl.match(/\/block-trace\/([^/?]+)/);

    if (!blockMatch) {
      toast.error("No block identifier found in current URL");
      return;
    }

    const blockIdentifier = blockMatch[1];
    const urlParams = new URLSearchParams(window.location.search);
    const network = urlParams.get("network") || "mainnet";

    try {
      const bookmarkData = {
        title: `Block ${blockIdentifier} Analysis`,
        description: `Block trace analysis for ${blockIdentifier} on ${network}`,
        bookmark_type: "block_trace" as const,
        query_config: {
          blockIdentifier,
          network,
          analysisType: "full" as const,
          includeTokenFlow: true,
          includeGasAnalysis: true,
          includeMEVAnalysis: true,
          includeContractInteractions: true,
          lastAnalysisResults: {
            totalTransactions: 0,
            totalGasUsed: 0,
            pyusdTransactions: 0,
            successRate: 0,
            blockNumber: parseInt(blockIdentifier) || 0,
          },
        },
      };

      await createBookmark.mutateAsync(bookmarkData);
      toast.success("Current analysis bookmarked!");
    } catch (error) {
      console.error("Failed to create bookmark:", error);
      toast.error("Failed to save bookmark");
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className={cn("relative z-50", className)}>
      <div className="flex items-center gap-2">
        {/* Save Current Analysis Button */}
        <Button
          onClick={handleQuickSave}
          disabled={createBookmark.isPending}
          size="sm"
          className="bg-[#00bfff] text-[#0f1419] hover:bg-[#00bfff]/90"
        >
          <BookmarkPlus className="h-4 w-4 mr-2" />
          {createBookmark.isPending ? "Saving..." : "Save Analysis"}
        </Button>

        {/* Bookmarks Dropdown */}
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.3)] rounded-lg text-[#10b981] hover:bg-[rgba(16,185,129,0.2)] focus:bg-[rgba(16,185,129,0.2)] focus:border-[#10b981] focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:ring-opacity-50 transition-colors"
        >
          <Bookmark className="h-4 w-4" />
          <span className="text-sm font-medium">Bookmarks</span>
          {bookmarks.length > 0 && (
            <span className="bg-[rgba(16,185,129,0.2)] text-[#10b981] text-xs px-2 py-0.5 rounded-full">
              {bookmarks.length}
            </span>
          )}
        </button>
      </div>

      {isOpen && (
        <div
          ref={dropdownRef}
          data-bookmark-panel
          className="absolute right-0 top-full mt-2 w-[480px] bg-[rgba(25,28,40,0.98)] backdrop-blur-md border border-[rgba(0,191,255,0.3)] rounded-lg shadow-2xl shadow-[rgba(0,191,255,0.2)] z-[9999] max-h-[600px] overflow-hidden"
        >
          <div className="p-4 border-b border-[rgba(0,191,255,0.1)]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-[#00bfff]">
                Saved Analyses
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-[#8b9dc3] hover:text-[#10b981] focus:text-[#10b981] focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:ring-opacity-50 rounded p-1 transition-colors"
                aria-label="Close saved analyses"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search and Filter Controls */}
            <div className="space-y-3">
              <div
                className="relative"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#8b9dc3]" />
                <Input
                  type="text"
                  placeholder="Search bookmarks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg text-sm text-[#e2e8f0] placeholder-[#8b9dc3] focus:border-[#00bfff] focus:outline-none focus:ring-1 focus:ring-[#00bfff]"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-6 text-center">
                <div className="w-8 h-8 border-2 border-[rgba(0,191,255,0.3)] border-t-[#00bfff] rounded-full animate-spin mx-auto mb-3" />
                <p className="text-[#8b9dc3] text-sm">Loading bookmarks...</p>
              </div>
            ) : !bookmarks || bookmarks.length === 0 ? (
              <div className="p-6 text-center">
                <Bookmark className="h-12 w-12 text-[rgba(0,191,255,0.3)] mx-auto mb-3" />
                <p className="text-[#8b9dc3] text-sm">No bookmarks saved yet</p>
                <p className="text-[#6b7280] text-xs mt-1">
                  Save your first analysis to get started
                </p>
              </div>
            ) : filteredBookmarks.length === 0 ? (
              <div className="p-6 text-center">
                <Search className="h-12 w-12 text-[rgba(0,191,255,0.3)] mx-auto mb-3" />
                <p className="text-[#8b9dc3] text-sm">
                  No bookmarks match your search
                </p>
                <p className="text-[#6b7280] text-xs mt-1">
                  Try adjusting your search criteria
                </p>
              </div>
            ) : (
              <div className="p-2">
                {filteredBookmarks.map((bookmark) => (
                  <div
                    key={bookmark.id}
                    className="mb-2 p-3 bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg hover:border-[rgba(0,191,255,0.3)] transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => handleLoadBookmark(bookmark)}
                      >
                        <h4 className="text-sm font-medium text-[#e2e8f0] truncate mb-1">
                          {bookmark.title}
                        </h4>
                        <p className="text-xs text-[#8b9dc3] font-mono">
                          Block: {bookmark.query_config.blockIdentifier} •{" "}
                          {bookmark.query_config.network}
                        </p>
                        {bookmark.description && (
                          <p className="text-xs text-[#6b7280] mt-1 line-clamp-2">
                            {bookmark.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() => handleLoadBookmark(bookmark)}
                          className="p-1 text-accent-primary hover:bg-[rgba(0,191,255,0.1)] rounded transition-colors"
                          title="Load Analysis"
                        >
                          <FaDownload className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteBookmark(e, bookmark.id)}
                          disabled={deleteBookmark.isPending}
                          className="p-1 text-red-400 hover:bg-[rgba(239,68,68,0.1)] rounded transition-colors"
                          title="Delete Bookmark"
                        >
                          {deleteBookmark.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 rounded text-xs font-medium text-[#00bfff] bg-[rgba(0,191,255,0.1)]">
                        Block Trace Analysis
                      </span>
                      <div className="flex items-center gap-1 text-xs text-[#6b7280]">
                        <Network className="h-3 w-3" />
                        {bookmark.query_config.network}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-[#6b7280]">
                        <Clock className="h-3 w-3" />
                        {new Date(bookmark.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {bookmarks && bookmarks.length > 0 && (
            <div className="p-3 border-t border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.8)]">
              <div className="flex items-center justify-between text-xs text-[#8b9dc3]">
                <span>
                  {filteredBookmarks.length} of {bookmarks.length} bookmark
                  {bookmarks.length !== 1 ? "s" : ""}{" "}
                  {searchTerm ? "shown" : "saved"}
                </span>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="text-[#00bfff] hover:text-[#10b981] transition-colors"
                  >
                    Clear search
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
