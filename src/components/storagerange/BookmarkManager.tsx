import React, { useState, useRef, useEffect } from "react";
import { Button, Dropdown, Input } from "@/components/global";
import {
  Bookmark,
  BookmarkPlus,
  Edit3,
  Trash2,
  Save,
  X,
  Clock,
  Network,
  Database,
  Search,
  Filter,
  Hash,
  Loader2,
} from "lucide-react";
import { FaDownload } from "react-icons/fa6";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useStorageAnalysisBookmarks,
  useCreateStorageAnalysisBookmark,
  useUpdateStorageAnalysisBookmark,
  useDeleteStorageAnalysisBookmark,
  useStorageAnalysisBookmarkByQuery,
} from "@/hooks/storagerange/useStorageAnalysisBookmarks";
import type { StorageAnalysisBookmark } from "@/lib/storagerange/bookmarks";
import { VirtualizedChart } from "../debugtrace/VirtualizedChart";

interface BookmarkManagerProps {
  contractAddress?: string;
  blockNumber?: string;
  network?: string;
  analysisConfig?: {
    analysisType: "storage" | "mapping" | "comparison";
    includeHistory?: boolean;
    maxSlots?: number;
  };
  analysisResults?: {
    totalSlots?: number;
    nonZeroSlots?: number;
    mappingSlots?: number;
    storageSize?: number;
    analysisTime?: number;
  };
  onLoadBookmark?: (bookmark: StorageAnalysisBookmark) => void;
  onSignUpClick?: () => void;
  className?: string;
}

interface EditingBookmark {
  id: string;
  title: string;
  description: string;
}

export function BookmarkManager({
  contractAddress,
  blockNumber = "latest",
  network = "mainnet",
  analysisConfig,
  analysisResults,
  onLoadBookmark,
  onSignUpClick,
  className = "",
}: BookmarkManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingBookmark, setEditingBookmark] =
    useState<EditingBookmark | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<
    "all" | "storage" | "mapping" | "comparison"
  >("all");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // For now, assume authenticated - implement proper auth check based on your setup
  const isAuthenticated = true;

  const { data: bookmarks, isLoading } = useStorageAnalysisBookmarks();
  const { data: existingBookmark } = useStorageAnalysisBookmarkByQuery(
    contractAddress || "",
    blockNumber,
    network,
    analysisConfig?.analysisDepth || "basic"
  );
  const createBookmark = useCreateStorageAnalysisBookmark();
  const updateBookmark = useUpdateStorageAnalysisBookmark();
  const deleteBookmark = useDeleteStorageAnalysisBookmark();

  // Close dropdown when clicking outside
  useEffect(() => {
    if (isOpen) {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Element;

        // Don't close if clicking on the button itself
        if (buttonRef.current && buttonRef.current.contains(target)) {
          return;
        }

        // Don't close if clicking inside the dropdown panel
        if (panelRef.current && panelRef.current.contains(target as Node)) {
          return;
        }

        // Don't close if clicking on dropdown elements (from global Dropdown component)
        const dropdownSelectors = [
          "[data-radix-popper-content-wrapper]",
          "[data-radix-select-content]",
          "[data-radix-select-viewport]",
          "[data-radix-select-item]",
          "[data-radix-select-trigger]",
          "[data-radix-collection-item]",
          "[role='listbox']",
          "[role='option']",
          "[role='combobox']",
          ".dropdown-content",
          "[data-state='open']",
          "[data-side]",
          "[data-align]",
        ];

        for (const selector of dropdownSelectors) {
          if (target.closest(selector)) {
            return;
          }
        }

        setIsOpen(false);
      };

      // Use capture phase to catch events before they bubble
      document.addEventListener("mousedown", handleClickOutside, true);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside, true);
    }
  }, [isOpen]);

  const handleSaveBookmark = async () => {
    if (!isAuthenticated) {
      onSignUpClick?.();
      return;
    }

    if (!contractAddress || !analysisConfig) {
      return;
    }

    const shortenAddress = (addr: string) =>
      `${addr.slice(0, 6)}...${addr.slice(-4)}`;

    const title = `${shortenAddress(contractAddress)} (${network})`;

    try {
      await createBookmark.mutateAsync({
        title,
        description: `Storage analysis for contract ${contractAddress} on ${network} at block ${blockNumber}`,
        query_config: {
          contractAddress,
          blockNumber,
          network,
          analysisDepth:
            analysisConfig.analysisType === "storage"
              ? "basic"
              : analysisConfig.analysisType === "mapping"
                ? "detailed"
                : "comprehensive",
          includeHistory: analysisConfig.includeHistory,
          maxSlots: analysisConfig.maxSlots,
        },
      });
    } catch (error) {
      console.error("Failed to create bookmark:", error);
    }
  };

  const handleEditBookmark = (bookmark: StorageAnalysisBookmark) => {
    setEditingBookmark({
      id: bookmark.id,
      title: bookmark.title,
      description: bookmark.description || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editingBookmark) return;

    try {
      await updateBookmark.mutateAsync({
        id: editingBookmark.id,
        updates: {
          title: editingBookmark.title,
          description: editingBookmark.description,
        },
      });
      setEditingBookmark(null);
    } catch (error) {
      console.error("Failed to update bookmark:", error);
    }
  };

  const handleDeleteBookmark = async (bookmarkId: string) => {
    try {
      await deleteBookmark.mutateAsync(bookmarkId);
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error("Failed to delete bookmark:", error);
    }
  };

  const handleLoadBookmark = (bookmark: StorageAnalysisBookmark) => {
    onLoadBookmark?.(bookmark);
    setIsOpen(false);
    toast.success(`Loaded bookmark: ${bookmark.title}`);
  };

  const getAnalysisTypeLabel = (
    config: StorageAnalysisBookmark["query_config"]
  ) => {
    switch (config.analysisDepth) {
      case "basic":
        return "Storage Analysis";
      case "detailed":
        return "Mapping Analysis";
      case "comprehensive":
        return "Block Comparison";
      default:
        return "Unknown";
    }
  };

  const getAnalysisTypeColor = (
    config: StorageAnalysisBookmark["query_config"]
  ) => {
    switch (config.analysisDepth) {
      case "basic":
        return "text-[#10b981] bg-[rgba(16,185,129,0.1)]"; // Green for Storage
      case "detailed":
        return "text-[#f59e0b] bg-[rgba(245,158,11,0.1)]"; // Orange for Mapping
      case "comprehensive":
        return "text-[#00bfff] bg-[rgba(0,191,255,0.1)]"; // Blue for Comparison
      default:
        return "text-[#8b9dc3] bg-[rgba(139,157,195,0.1)]";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return (
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };

  const shortenAddress = (address: string, chars: number = 4): string => {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 2 + chars)}...${address.slice(-chars)}`;
  };

  // Filter and search bookmarks
  const filteredBookmarks =
    bookmarks?.filter((bookmark) => {
      const matchesSearch =
        bookmark.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bookmark.query_config.contractAddress
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        bookmark.description
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        bookmark.query_config.network
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        bookmark.query_config.blockNumber
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

      const matchesFilter =
        filterType === "all" ||
        (filterType === "storage" &&
          bookmark.query_config.analysisDepth === "basic") ||
        (filterType === "mapping" &&
          bookmark.query_config.analysisDepth === "detailed") ||
        (filterType === "comparison" &&
          bookmark.query_config.analysisDepth === "comprehensive");

      return matchesSearch && matchesFilter;
    }) || [];

  if (!isAuthenticated) {
    return (
      <div className={`relative ${className}`}>
        <Button
          onClick={onSignUpClick}
          variant="outline"
          size="sm"
          className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
        >
          <Bookmark className="h-4 w-4 mr-2" />
          Sign In to Save
        </Button>
      </div>
    );
  }

  return (
    <div className={`relative z-50 ${className}`}>
      <div className="flex items-center gap-2">
        {/* Save Current Analysis Button */}
        {contractAddress && analysisConfig && !existingBookmark && (
          <Button
            onClick={handleSaveBookmark}
            disabled={createBookmark.isPending}
            size="sm"
            className="bg-[#00bfff] text-[#0f1419] hover:bg-[#00bfff]/90"
          >
            <BookmarkPlus className="h-4 w-4 mr-2" />
            {createBookmark.isPending ? "Saving..." : "Save Analysis"}
          </Button>
        )}

        {/* Bookmarks Dropdown */}
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.3)] rounded-lg text-[#10b981] hover:bg-[rgba(16,185,129,0.2)] focus:bg-[rgba(16,185,129,0.2)] focus:border-[#10b981] focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:ring-opacity-50 transition-colors"
        >
          <Bookmark className="h-4 w-4" />
          <span className="text-sm font-medium">Bookmarks</span>
          {bookmarks && bookmarks.length > 0 && (
            <span className="bg-[rgba(16,185,129,0.2)] text-[#10b981] text-xs px-2 py-0.5 rounded-full">
              {bookmarks.length}
            </span>
          )}
        </button>
      </div>

      {isOpen && (
        <div
          ref={panelRef}
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
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg text-sm text-accent-primary placeholder-[#8b9dc3] focus:border-[#00bfff] focus:outline-none focus:ring-1 focus:ring-[#00bfff]"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-[#8b9dc3]" />
                <div
                  className="flex-1"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <Dropdown
                    value={filterType}
                    onValueChange={(value) =>
                      setFilterType(value as typeof filterType)
                    }
                    placeholder="All Analysis Types"
                    options={[
                      { value: "all", label: "All Analysis Types" },
                      { value: "storage", label: "Storage Analysis" },
                      { value: "mapping", label: "Mapping Analysis" },
                      { value: "comparison", label: "Block Comparison" },
                    ]}
                  />
                </div>
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
                  Try adjusting your search or filter criteria
                </p>
              </div>
            ) : (
              <div className="p-2">
                {filteredBookmarks.map((bookmark) => (
                  <div
                    key={bookmark.id}
                    className="mb-2 p-3 bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.1)] rounded-lg hover:border-[rgba(0,191,255,0.3)] transition-colors"
                  >
                    {editingBookmark?.id === bookmark.id ? (
                      <div className="space-y-3">
                        <div>
                          <Input
                            value={editingBookmark.title}
                            onChange={(e) =>
                              setEditingBookmark({
                                ...editingBookmark,
                                title: e.target.value,
                              })
                            }
                            className="w-full bg-[rgba(15,20,25,0.5)] border border-[rgba(0,191,255,0.2)] rounded px-2 py-1 text-sm text-text-secondary"
                            placeholder="Enter title..."
                          />
                        </div>
                        <div>
                          <Input
                            value={editingBookmark.description}
                            onChange={(e) =>
                              setEditingBookmark({
                                ...editingBookmark,
                                description: e.target.value,
                              })
                            }
                            className="w-full bg-[rgba(15,20,25,0.5)] border border-[rgba(0,191,255,0.2)] rounded px-2 py-1 text-sm text-text-secondary"
                            placeholder="Enter description..."
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveEdit}
                            disabled={updateBookmark.isPending}
                            className="flex items-center gap-1 px-2 py-1 bg-[#00bfff] text-[#0f1419] rounded text-xs hover:bg-[#00bfff]/90"
                          >
                            <Save className="h-3 w-3" />
                            {updateBookmark.isPending ? "Saving..." : "Save"}
                          </button>
                          <button
                            onClick={() => setEditingBookmark(null)}
                            className="flex items-center gap-1 px-2 py-1 border border-[rgba(0,191,255,0.3)] text-[#8b9dc3] rounded text-xs hover:bg-[rgba(0,191,255,0.1)]"
                          >
                            <X className="h-3 w-3" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between mb-2">
                          <div
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => handleLoadBookmark(bookmark)}
                          >
                            <h4 className="text-sm font-medium text-accent-primary truncate">
                              {bookmark.title}
                            </h4>
                            <p className="text-xs text-[#8b9dc3] font-mono">
                              Contract:{" "}
                              {shortenAddress(
                                bookmark.query_config.contractAddress
                              )}{" "}
                              • Block: {bookmark.query_config.blockNumber}
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
                              onClick={() => handleEditBookmark(bookmark)}
                              className="p-1 text-accent-primary hover:text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)] rounded transition-colors"
                              title="Edit Bookmark"
                            >
                              <Edit3 className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(bookmark.id)}
                              className="p-1 text-red-400 hover:bg-[rgba(239,68,68,0.1)] rounded transition-colors"
                              title="Delete Bookmark"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${getAnalysisTypeColor(bookmark.query_config)}`}
                          >
                            {getAnalysisTypeLabel(bookmark.query_config)}
                          </span>
                          <div className="flex items-center gap-1 text-xs text-[#6b7280]">
                            <Network className="h-3 w-3" />
                            {bookmark.query_config.network}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-[#6b7280]">
                            <Clock className="h-3 w-3" />
                            {formatDate(bookmark.created_at)}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-1">
                            <Database className="h-3 w-3 text-[#00bfff]" />
                            <span className="text-[#8b9dc3]">Max Slots:</span>
                            <span className="text-white">
                              {bookmark.query_config.maxSlots || 100}
                            </span>
                          </div>

                          {bookmark.query_config.includeHistory && (
                            <div className="flex items-center gap-1">
                              <Hash className="h-3 w-3 text-[#10b981]" />
                              <span className="text-[#8b9dc3]">History:</span>
                              <span className="text-[#10b981]">Enabled</span>
                            </div>
                          )}
                        </div>

                        {showDeleteConfirm === bookmark.id && (
                          <div className="mt-3 p-2 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] rounded">
                            <p className="text-xs text-red-400 mb-2">
                              Are you sure you want to delete this bookmark?
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() =>
                                  handleDeleteBookmark(bookmark.id)
                                }
                                disabled={deleteBookmark.isPending}
                                className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                              >
                                {deleteBookmark.isPending
                                  ? "Deleting..."
                                  : "Delete"}
                              </button>
                              <button
                                onClick={() => setShowDeleteConfirm(null)}
                                className="px-2 py-1 border border-[rgba(0,191,255,0.3)] text-[#8b9dc3] rounded text-xs hover:bg-[rgba(0,191,255,0.1)]"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
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
                  {searchQuery || filterType !== "all" ? "shown" : "saved"}
                </span>
                {(searchQuery || filterType !== "all") && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setFilterType("all");
                    }}
                    className="text-[#00bfff] hover:text-[#10b981] transition-colors"
                  >
                    Clear filters
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
