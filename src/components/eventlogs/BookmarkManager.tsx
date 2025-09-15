import { useState, useRef, useEffect } from "react";
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
  Activity,
  Search,
  Filter,
} from "lucide-react";
import { FaDownload } from "react-icons/fa6";
import { useSession } from "@/lib/auth";
import {
  useEventLogsBookmarks,
  useCreateEventLogsBookmark,
  useUpdateEventLogsBookmark,
  useDeleteEventLogsBookmark,
  useEventLogsBookmarkByQuery,
} from "@/hooks/eventlogs";
import type { EventLogsBookmark } from "@/lib/eventlogs/bookmarks";
import type { LogsQueryConfig } from "@/lib/eventlogs";

interface BookmarkManagerProps {
  queryParams?: LogsQueryConfig;
  analysisResults?: {
    total_transfers?: number;
    total_volume?: number;
    unique_senders?: number;
    unique_receivers?: number;
  };
  onLoadBookmark?: (bookmark: EventLogsBookmark) => void;
  onSignUpClick?: () => void;
  className?: string;
}

interface EditingBookmark {
  id: string;
  title: string;
  description: string;
}

export function BookmarkManager({
  queryParams,
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
  const [filterNetwork, setFilterNetwork] = useState<string>("all");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const { session } = useSession();
  const isAuthenticated = !!session?.user;

  const { data: bookmarks, isLoading } = useEventLogsBookmarks();
  const { data: existingBookmark } = useEventLogsBookmarkByQuery(
    queryParams?.contract_address || "",
    queryParams?.from_block?.toString() || "",
    queryParams?.to_block?.toString() || "",
    queryParams?.network || ""
  );
  const createBookmark = useCreateEventLogsBookmark();
  const updateBookmark = useUpdateEventLogsBookmark();
  const deleteBookmark = useDeleteEventLogsBookmark();

  // Close dropdown when clicking outside
  useEffect(() => {
    if (isOpen) {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Element;

        if (buttonRef.current && buttonRef.current.contains(target)) {
          return;
        }

        if (panelRef.current && panelRef.current.contains(target as Node)) {
          return;
        }

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

    if (
      !queryParams ||
      !queryParams.contract_address ||
      !queryParams.from_block ||
      !queryParams.to_block
    ) {
      return;
    }

    const title = `${queryParams.contract_address.slice(0, 8)}...${queryParams.contract_address.slice(-6)} (${queryParams.from_block}-${queryParams.to_block})`;

    try {
      const bookmarkData = {
        title,
        description: `Event logs analysis for blocks ${queryParams.from_block} to ${queryParams.to_block} on ${queryParams.network}`,
        query_config: {
          contract_address: queryParams.contract_address,
          from_block: queryParams.from_block.toString(),
          to_block: queryParams.to_block.toString(),
          network: queryParams.network,
          ...(queryParams.analysis_depth && {
            analysis_depth: queryParams.analysis_depth,
          }),
          ...(queryParams.include_timestamps !== undefined && {
            include_timestamps: queryParams.include_timestamps,
          }),
          ...(queryParams.max_results && {
            max_results: queryParams.max_results,
          }),
        },
        // analysis_results removed - not supported by database schema
      };

      await createBookmark.mutateAsync(bookmarkData as any);
    } catch (error) {
      // Error handled by mutation hook
    }
  };

  const handleEditBookmark = (bookmark: EventLogsBookmark) => {
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
      } as any);
      setEditingBookmark(null);
    } catch (error) {
      // Error handled by mutation hook
    }
  };

  const handleDeleteBookmark = async (bookmarkId: string) => {
    try {
      await deleteBookmark.mutateAsync(bookmarkId as any);
      setShowDeleteConfirm(null);
    } catch (error) {
      // Error handled by mutation hook
    }
  };

  const handleLoadBookmark = (bookmark: EventLogsBookmark) => {
    onLoadBookmark?.(bookmark);
    setIsOpen(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return (
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };

  // Get unique networks from bookmarks for filter
  const availableNetworks = Array.from(
    new Set(
      (Array.isArray(bookmarks) ? bookmarks : [])
        ?.map((b) => b.query_config?.network)
        .filter((network): network is string => Boolean(network)) || []
    )
  );

  // Filter and search bookmarks
  const filteredBookmarks =
    (Array.isArray(bookmarks) ? bookmarks : [])?.filter((bookmark) => {
      const matchesSearch =
        bookmark.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bookmark.query_config?.contract_address
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        bookmark.description
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        bookmark.query_config?.network
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase());

      const matchesFilter =
        filterNetwork === "all" ||
        bookmark.query_config?.network === filterNetwork;

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
        {/* Save Current Query Button */}
        {queryParams &&
          queryParams.contract_address &&
          queryParams.from_block &&
          queryParams.to_block &&
          !existingBookmark && (
            <Button
              onClick={handleSaveBookmark}
              disabled={createBookmark.isPending}
              size="sm"
              className="bg-[#00bfff] text-[#0f1419] hover:bg-[#00bfff]/90"
            >
              <BookmarkPlus className="h-4 w-4 mr-2" />
              {createBookmark.isPending ? "Saving..." : "Save Query"}
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
          {bookmarks && Array.isArray(bookmarks) && bookmarks.length > 0 && (
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
                Saved Event Log Queries
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-[#8b9dc3] hover:text-[#10b981] focus:text-[#10b981] focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:ring-opacity-50 rounded p-1 transition-colors"
                aria-label="Close saved queries"
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
                  className="w-full pl-10 pr-4 py-2 bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg text-sm text-[#e2e8f0] placeholder-[#8b9dc3] focus:border-[#00bfff] focus:outline-none focus:ring-1 focus:ring-[#00bfff]"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                />
              </div>

              {availableNetworks.length > 1 && (
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-[#8b9dc3]" />
                  <div
                    className="flex-1"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <Dropdown
                      value={filterNetwork}
                      onValueChange={(value) => setFilterNetwork(value)}
                      placeholder="All Networks"
                      options={[
                        { value: "all", label: "All Networks" },
                        ...availableNetworks.map((network) => ({
                          value: network as string,
                          label:
                            (network as string).charAt(0).toUpperCase() +
                            (network as string).slice(1),
                        })),
                      ]}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-6 text-center">
                <div className="w-8 h-8 border-2 border-[rgba(0,191,255,0.3)] border-t-[#00bfff] rounded-full animate-spin mx-auto mb-3" />
                <p className="text-[#8b9dc3] text-sm">Loading bookmarks...</p>
              </div>
            ) : !bookmarks ||
              !Array.isArray(bookmarks) ||
              bookmarks.length === 0 ? (
              <div className="p-6 text-center">
                <Bookmark className="h-12 w-12 text-[rgba(0,191,255,0.3)] mx-auto mb-3" />
                <p className="text-[#8b9dc3] text-sm">No bookmarks saved yet</p>
                <p className="text-[#6b7280] text-xs mt-1">
                  Save your first query to get started
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
                            className="w-full bg-[rgba(15,20,25,0.5)] border border-[rgba(0,191,255,0.2)] rounded px-2 py-1 text-sm text-[#e2e8f0]"
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
                            className="w-full bg-[rgba(15,20,25,0.5)] border border-[rgba(0,191,255,0.2)] rounded px-2 py-1 text-sm text-[#e2e8f0]"
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
                            <h4 className="text-sm font-medium text-[#e2e8f0] truncate">
                              {bookmark.title}
                            </h4>
                            <p className="text-xs text-[#8b9dc3] font-mono">
                              {bookmark.query_config?.contract_address?.slice(
                                0,
                                20
                              ) || "Unknown"}
                              ...
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
                              className="p-1 text-[#e2e8f0] hover:bg-[rgba(0,191,255,0.1)] rounded transition-colors"
                              title="Load Query"
                            >
                              <FaDownload className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleEditBookmark(bookmark)}
                              className="p-1 text-[#e2e8f0] hover:text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)] rounded transition-colors"
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
                          <div className="flex items-center gap-1 text-xs text-[#6b7280]">
                            <Network className="h-3 w-3" />
                            {bookmark.query_config?.network || "Unknown"}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-[#6b7280]">
                            <Activity className="h-3 w-3" />
                            Blocks {bookmark.query_config?.from_block || ""}-
                            {bookmark.query_config?.to_block || ""}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-[#6b7280]">
                            <Clock className="h-3 w-3" />
                            {formatDate(bookmark.created_at)}
                          </div>
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

          {bookmarks && Array.isArray(bookmarks) && bookmarks.length > 0 && (
            <div className="p-3 border-t border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.8)]">
              <div className="flex items-center justify-between text-xs text-[#8b9dc3]">
                <span>
                  {filteredBookmarks.length} of {bookmarks.length} bookmark
                  {bookmarks.length !== 1 ? "s" : ""}{" "}
                  {searchQuery || filterNetwork !== "all" ? "shown" : "saved"}
                </span>
                {(searchQuery || filterNetwork !== "all") && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setFilterNetwork("all");
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
