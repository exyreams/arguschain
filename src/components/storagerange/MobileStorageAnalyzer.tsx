import React, { useRef, useState } from "react";
import { Card } from "@/components/global/Card";
import { Button } from "@/components/global/Button";
import { Badge } from "@/components/global/Badge";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Eye,
  Filter,
  RefreshCw,
  Search,
  Share,
} from "lucide-react";
import {
  ResponsiveLayout,
  useDeviceType,
  useTouchGestures,
} from "./ResponsiveLayout";
import { AccessibleStorageTable } from "./AccessibleStorageTable";
import { AccessibleChart } from "./accessibility/AccessibleChart";

interface StorageSlot {
  slot: string;
  value: string;
  category: string;
  interpretation?: string;
  type?: string;
}

interface MobileStorageAnalyzerProps {
  data: StorageSlot[];
  contractAddress: string;
  blockHash: string;
  className?: string;
  onRefresh?: () => void;
  onExport?: () => void;
  onShare?: () => void;
}

type ViewMode = "overview" | "table" | "charts" | "details";
type SectionState = {
  [key: string]: boolean;
};

export const MobileStorageAnalyzer: React.FC<MobileStorageAnalyzerProps> = ({
  data,
  contractAddress,
  blockHash,
  className = "",
  onRefresh,
  onExport,
  onShare,
}) => {
  const { isMobile, isTablet, orientation } = useDeviceType();
  const [currentView, setCurrentView] = useState<ViewMode>("overview");
  const [expandedSections, setExpandedSections] = useState<SectionState>({
    summary: true,
    categories: false,
    recent: false,
    patterns: false,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<StorageSlot | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const viewIndex = ["overview", "table", "charts", "details"].indexOf(
    currentView,
  );

  useTouchGestures(containerRef, {
    onSwipeLeft: () => {
      const nextIndex = Math.min(3, viewIndex + 1);
      setCurrentView(
        ["overview", "table", "charts", "details"][nextIndex] as ViewMode,
      );
    },
    onSwipeRight: () => {
      const prevIndex = Math.max(0, viewIndex - 1);
      setCurrentView(
        ["overview", "table", "charts", "details"][prevIndex] as ViewMode,
      );
    },
  });

  const processedData = React.useMemo(() => {
    let filtered = data.filter((item) => {
      const matchesSearch =
        searchTerm === "" ||
        item.slot.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.interpretation &&
          item.interpretation.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory =
        selectedCategory === "all" || item.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });

    return filtered;
  }, [data, searchTerm, selectedCategory]);

  const categoryData = React.useMemo(() => {
    const categories = data.reduce(
      (acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(categories).map(([name, value]) => ({
      name,
      value,
      category: name,
    }));
  }, [data]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const categories = React.useMemo(() => {
    const cats = Array.from(new Set(data.map((item) => item.category)));
    return ["all", ...cats];
  }, [data]);

  const MobileHeader = () => (
    <div className="sticky top-0 bg-[rgba(25,28,40,0.95)] backdrop-blur-sm z-20 -mx-2 px-2 py-3 border-b border-[rgba(0,191,255,0.1)]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-[#00bfff] truncate">
            Storage Analysis
          </h2>
          <p className="text-xs text-[#8b9dc3] truncate">
            {contractAddress.slice(0, 10)}...{contractAddress.slice(-8)}
          </p>
        </div>

        <div className="flex items-center gap-2 ml-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            className="h-10 w-10 border-[rgba(0,191,255,0.3)] text-[#00bfff]"
            aria-label="Refresh data"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="h-10 w-10 border-[rgba(0,191,255,0.3)] text-[#00bfff]"
            aria-label="Toggle filters"
          >
            <Filter className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onShare}
            className="h-10 w-10 border-[rgba(0,191,255,0.3)] text-[#00bfff]"
            aria-label="Share analysis"
          >
            <Share className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1 bg-[rgba(15,20,25,0.6)] rounded-lg p-1">
          {[
            { id: "overview", label: "Overview" },
            { id: "table", label: "Table" },
            { id: "charts", label: "Charts" },
            { id: "details", label: "Details" },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setCurrentView(id as ViewMode)}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                currentView === id
                  ? "bg-[rgba(0,191,255,0.2)] text-[#00bfff] border border-[rgba(0,191,255,0.3)]"
                  : "text-[#8b9dc3] hover:text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const prevIndex = Math.max(0, viewIndex - 1);
              setCurrentView(
                ["overview", "table", "charts", "details"][
                  prevIndex
                ] as ViewMode,
              );
            }}
            disabled={viewIndex === 0}
            className="h-8 w-8 border-[rgba(0,191,255,0.3)] text-[#00bfff] disabled:opacity-50"
            aria-label="Previous view"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const nextIndex = Math.min(3, viewIndex + 1);
              setCurrentView(
                ["overview", "table", "charts", "details"][
                  nextIndex
                ] as ViewMode,
              );
            }}
            disabled={viewIndex === 3}
            className="h-8 w-8 border-[rgba(0,191,255,0.3)] text-[#00bfff] disabled:opacity-50"
            aria-label="Next view"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {showFilters && (
        <div className="mt-3 space-y-3 p-3 bg-[rgba(15,20,25,0.6)] rounded-lg">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#8b9dc3]" />
            <input
              type="text"
              placeholder="Search slots..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.3)] rounded-lg text-[#8b9dc3] placeholder-[#8b9dc3]/50 focus:outline-none focus:ring-2 focus:ring-[#00bfff] text-sm"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.3)] rounded-lg text-[#8b9dc3] focus:outline-none focus:ring-2 focus:ring-[#00bfff] text-sm"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category === "all" ? "All Categories" : category}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );

  const CollapsibleSection: React.FC<{
    title: string;
    sectionKey: string;
    children: React.ReactNode;
    badge?: string | number;
  }> = ({ title, sectionKey, children, badge }) => (
    <Card className="bg-[rgba(15,20,25,0.6)] border-[rgba(0,191,255,0.1)]">
      <button
        onClick={() => toggleSection(sectionKey)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-[rgba(0,191,255,0.05)] transition-colors"
      >
        <div className="flex items-center gap-3">
          <h3 className="font-medium text-[#00bfff]">{title}</h3>
          {badge && (
            <Badge
              variant="outline"
              className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
            >
              {badge}
            </Badge>
          )}
        </div>
        {expandedSections[sectionKey] ? (
          <ChevronUp className="h-5 w-5 text-[#8b9dc3]" />
        ) : (
          <ChevronDown className="h-5 w-5 text-[#8b9dc3]" />
        )}
      </button>

      {expandedSections[sectionKey] && (
        <div className="px-4 pb-4">{children}</div>
      )}
    </Card>
  );

  return (
    <ResponsiveLayout
      className={`${className} min-h-screen`}
      collapsible={false}
    >
      <div ref={containerRef} className="space-y-4">
        <MobileHeader />

        {currentView === "overview" && (
          <div className="space-y-4">
            <CollapsibleSection
              title="Summary"
              sectionKey="summary"
              badge={data.length}
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-[rgba(0,191,255,0.05)] rounded-lg">
                  <div className="text-2xl font-bold text-[#00bfff]">
                    {data.length}
                  </div>
                  <div className="text-sm text-[#8b9dc3]">Total Slots</div>
                </div>
                <div className="text-center p-3 bg-[rgba(0,191,255,0.05)] rounded-lg">
                  <div className="text-2xl font-bold text-[#00bfff]">
                    {categories.length - 1}
                  </div>
                  <div className="text-sm text-[#8b9dc3]">Categories</div>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              title="Categories"
              sectionKey="categories"
              badge={categories.length - 1}
            >
              <div className="space-y-2">
                {categoryData.map((cat, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-[rgba(0,191,255,0.05)] rounded"
                  >
                    <span className="text-sm text-[#8b9dc3]">{cat.name}</span>
                    <Badge
                      variant="outline"
                      className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                    >
                      {cat.value}
                    </Badge>
                  </div>
                ))}
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              title="Recent Slots"
              sectionKey="recent"
              badge={Math.min(5, data.length)}
            >
              <div className="space-y-2">
                {data.slice(0, 5).map((slot, index) => (
                  <div
                    key={index}
                    className="p-3 bg-[rgba(0,191,255,0.05)] rounded-lg cursor-pointer hover:bg-[rgba(0,191,255,0.1)] transition-colors"
                    onClick={() => setSelectedSlot(slot)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-mono text-[#00bfff]">
                        {slot.slot}
                      </span>
                      <Badge
                        variant="outline"
                        className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)] text-xs"
                      >
                        {slot.category}
                      </Badge>
                    </div>
                    <div className="text-xs text-[#8b9dc3] font-mono truncate">
                      {slot.value}
                    </div>
                    {slot.interpretation && (
                      <div className="text-xs text-[#8b9dc3] italic mt-1">
                        {slot.interpretation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          </div>
        )}

        {currentView === "table" && (
          <div className="space-y-4">
            <AccessibleStorageTable
              data={processedData}
              title="Storage Slots"
              onSlotSelect={setSelectedSlot}
            />
          </div>
        )}

        {currentView === "charts" && (
          <div className="space-y-4">
            <AccessibleChart
              data={categoryData}
              type="pie"
              title="Category Distribution"
              description="Distribution of storage slots by category"
              height={isMobile ? 250 : 300}
            />
          </div>
        )}

        {currentView === "details" && selectedSlot && (
          <div className="space-y-4">
            <Card className="bg-[rgba(15,20,25,0.6)] border-[rgba(0,191,255,0.1)]">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-[#00bfff]">
                    Slot Details
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedSlot(null)}
                    className="border-[rgba(0,191,255,0.3)] text-[#00bfff]"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-[#8b9dc3]">
                      Slot Address
                    </label>
                    <div className="mt-1 p-2 bg-[rgba(0,191,255,0.05)] rounded font-mono text-sm text-[#00bfff] break-all">
                      {selectedSlot.slot}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-[#8b9dc3]">
                      Value
                    </label>
                    <div className="mt-1 p-2 bg-[rgba(0,191,255,0.05)] rounded font-mono text-sm text-[#8b9dc3] break-all">
                      {selectedSlot.value}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-[#8b9dc3]">
                      Category
                    </label>
                    <div className="mt-1">
                      <Badge
                        variant="outline"
                        className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                      >
                        {selectedSlot.category}
                      </Badge>
                    </div>
                  </div>

                  {selectedSlot.interpretation && (
                    <div>
                      <label className="text-sm font-medium text-[#8b9dc3]">
                        Interpretation
                      </label>
                      <div className="mt-1 p-2 bg-[rgba(0,191,255,0.05)] rounded text-sm text-[#8b9dc3]">
                        {selectedSlot.interpretation}
                      </div>
                    </div>
                  )}

                  {selectedSlot.type && (
                    <div>
                      <label className="text-sm font-medium text-[#8b9dc3]">
                        Type
                      </label>
                      <div className="mt-1 p-2 bg-[rgba(0,191,255,0.05)] rounded text-sm text-[#8b9dc3]">
                        {selectedSlot.type}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}

        {isMobile && (
          <div className="text-center py-4">
            <div className="text-xs text-[#8b9dc3] opacity-50">
              Swipe left/right to navigate between views
            </div>
          </div>
        )}
      </div>
    </ResponsiveLayout>
  );
};
