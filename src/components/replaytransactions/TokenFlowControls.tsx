import React, { useCallback, useState } from "react";
import { Button, Card, Separator } from "@/components/global";
import {
  Download,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  RotateCcw,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LayoutAlgorithm {
  id: string;
  name: string;
  description: string;
}

interface VisualizationSettings {
  nodeSize: number;
  edgeThickness: number;
  animationSpeed: number;
  showLabels: boolean;
  showAmounts: boolean;
  colorScheme: "default" | "high-contrast" | "colorblind-friendly";
  layout: string;
  clustering: boolean;
  minAmount: number;
  maxNodes: number;
}

interface TokenFlowControlsProps {
  settings: VisualizationSettings;
  onSettingsChange: (settings: VisualizationSettings) => void;
  onExport: (format: "png" | "svg" | "json") => void;
  onReset: () => void;
  onFitView: () => void;
  className?: string;
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
}

const layoutAlgorithms: LayoutAlgorithm[] = [
  {
    id: "circular",
    name: "Circular",
    description:
      "Arranges nodes in a circle with high-activity nodes in center",
  },
  {
    id: "force-directed",
    name: "Force Directed",
    description: "Uses physics simulation for natural node positioning",
  },
  {
    id: "hierarchical",
    name: "Hierarchical",
    description: "Arranges nodes in layers based on flow direction",
  },
  {
    id: "grid",
    name: "Grid",
    description: "Organizes nodes in a structured grid layout",
  },
  {
    id: "radial",
    name: "Radial",
    description: "Radiates nodes from central high-activity addresses",
  },
];

const colorSchemes = [
  { id: "default", name: "Default", description: "Standard color palette" },
  {
    id: "high-contrast",
    name: "High Contrast",
    description: "Enhanced visibility",
  },
  {
    id: "colorblind-friendly",
    name: "Colorblind Friendly",
    description: "Accessible colors",
  },
];

export const TokenFlowControls: React.FC<TokenFlowControlsProps> = ({
  settings,
  onSettingsChange,
  onExport,
  onReset,
  onFitView,
  className,
  isExpanded = false,
  onToggleExpanded,
}) => {
  const [activeTab, setActiveTab] = useState<
    "layout" | "appearance" | "filters" | "export"
  >("layout");
  const [isExporting, setIsExporting] = useState(false);

  const handleSettingChange = useCallback(
    (key: keyof VisualizationSettings, value: any) => {
      onSettingsChange({
        ...settings,
        [key]: value,
      });
    },
    [settings, onSettingsChange],
  );

  const handleExport = useCallback(
    async (format: "png" | "svg" | "json") => {
      setIsExporting(true);
      try {
        await onExport(format);
      } finally {
        setIsExporting(false);
      }
    },
    [onExport],
  );

  const resetToDefaults = useCallback(() => {
    const defaultSettings: VisualizationSettings = {
      nodeSize: 50,
      edgeThickness: 2,
      animationSpeed: 1,
      showLabels: true,
      showAmounts: true,
      colorScheme: "default",
      layout: "circular",
      clustering: true,
      minAmount: 0,
      maxNodes: 100,
    };
    onSettingsChange(defaultSettings);
    onReset();
  }, [onSettingsChange, onReset]);

  if (!isExpanded) {
    return (
      <Card className={cn("p-3", className)}>
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Flow Controls</div>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onFitView}
              className="h-8 px-2"
            >
              <Maximize2 className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onReset}
              className="h-8 px-2"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
            {onToggleExpanded && (
              <Button
                size="sm"
                variant="outline"
                onClick={onToggleExpanded}
                className="h-8 px-2"
              >
                <Settings className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("p-4", className)}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Visualization Controls</div>
          {onToggleExpanded && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onToggleExpanded}
              className="h-8 px-2"
            >
              <Minimize2 className="h-3 w-3" />
            </Button>
          )}
        </div>

        <div className="flex space-x-1 bg-muted p-1 rounded-lg">
          {[
            { id: "layout", label: "Layout" },
            { id: "appearance", label: "Style" },
            { id: "filters", label: "Filters" },
            { id: "export", label: "Export" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {activeTab === "layout" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Layout Algorithm
                </label>
                <select
                  value={settings.layout}
                  onChange={(e) =>
                    handleSettingChange("layout", e.target.value)
                  }
                  className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                >
                  {layoutAlgorithms.map((algorithm) => (
                    <option key={algorithm.id} value={algorithm.id}>
                      {algorithm.name}
                    </option>
                  ))}
                </select>
                <div className="text-xs text-muted-foreground mt-1">
                  {
                    layoutAlgorithms.find((a) => a.id === settings.layout)
                      ?.description
                  }
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">
                  Enable Clustering
                </label>
                <button
                  onClick={() =>
                    handleSettingChange("clustering", !settings.clustering)
                  }
                  className={cn(
                    "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                    settings.clustering ? "bg-primary" : "bg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-3 w-3 transform rounded-full bg-white transition-transform",
                      settings.clustering ? "translate-x-5" : "translate-x-1",
                    )}
                  />
                </button>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Max Nodes: {settings.maxNodes}
                </label>
                <input
                  type="range"
                  min="10"
                  max="500"
                  step="10"
                  value={settings.maxNodes}
                  onChange={(e) =>
                    handleSettingChange("maxNodes", Number(e.target.value))
                  }
                  className="w-full"
                />
              </div>

              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onFitView}
                  className="flex-1"
                >
                  <Maximize2 className="h-3 w-3 mr-1" />
                  Fit View
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onReset}
                  className="flex-1"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset
                </Button>
              </div>
            </div>
          )}

          {activeTab === "appearance" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Node Size: {settings.nodeSize}px
                </label>
                <input
                  type="range"
                  min="20"
                  max="100"
                  step="5"
                  value={settings.nodeSize}
                  onChange={(e) =>
                    handleSettingChange("nodeSize", Number(e.target.value))
                  }
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Edge Thickness: {settings.edgeThickness}px
                </label>
                <input
                  type="range"
                  min="1"
                  max="8"
                  step="0.5"
                  value={settings.edgeThickness}
                  onChange={(e) =>
                    handleSettingChange("edgeThickness", Number(e.target.value))
                  }
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Animation Speed: {settings.animationSpeed}x
                </label>
                <input
                  type="range"
                  min="0"
                  max="3"
                  step="0.1"
                  value={settings.animationSpeed}
                  onChange={(e) =>
                    handleSettingChange(
                      "animationSpeed",
                      Number(e.target.value),
                    )
                  }
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Color Scheme
                </label>
                <select
                  value={settings.colorScheme}
                  onChange={(e) =>
                    handleSettingChange("colorScheme", e.target.value)
                  }
                  className="w-full px-3 py-2 text-sm border rounded-md bg-background"
                >
                  {colorSchemes.map((scheme) => (
                    <option key={scheme.id} value={scheme.id}>
                      {scheme.name}
                    </option>
                  ))}
                </select>
                <div className="text-xs text-muted-foreground mt-1">
                  {
                    colorSchemes.find((s) => s.id === settings.colorScheme)
                      ?.description
                  }
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">
                    Show Labels
                  </label>
                  <button
                    onClick={() =>
                      handleSettingChange("showLabels", !settings.showLabels)
                    }
                    className="p-1 rounded hover:bg-muted"
                  >
                    {settings.showLabels ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">
                    Show Amounts
                  </label>
                  <button
                    onClick={() =>
                      handleSettingChange("showAmounts", !settings.showAmounts)
                    }
                    className="p-1 rounded hover:bg-muted"
                  >
                    {settings.showAmounts ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "filters" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Minimum Amount: {settings.minAmount} PYUSD
                </label>
                <input
                  type="range"
                  min="0"
                  max="10000"
                  step="100"
                  value={settings.minAmount}
                  onChange={(e) =>
                    handleSettingChange("minAmount", Number(e.target.value))
                  }
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>0</span>
                  <span>10,000</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Quick Filters
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSettingChange("minAmount", 0)}
                    className="text-xs"
                  >
                    Show All
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSettingChange("minAmount", 100)}
                    className="text-xs"
                  >
                    $100+
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSettingChange("minAmount", 1000)}
                    className="text-xs"
                  >
                    $1,000+
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSettingChange("minAmount", 10000)}
                    className="text-xs"
                  >
                    $10,000+
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Node Visibility
                </label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="show-senders"
                      defaultChecked
                      className="rounded"
                    />
                    <label htmlFor="show-senders" className="text-xs">
                      Show Senders
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="show-receivers"
                      defaultChecked
                      className="rounded"
                    />
                    <label htmlFor="show-receivers" className="text-xs">
                      Show Receivers
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="show-intermediaries"
                      defaultChecked
                      className="rounded"
                    />
                    <label htmlFor="show-intermediaries" className="text-xs">
                      Show Intermediaries
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "export" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-3 block">
                  Export Visualization
                </label>
                <div className="grid grid-cols-1 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExport("png")}
                    disabled={isExporting}
                    className="justify-start"
                  >
                    <Download className="h-3 w-3 mr-2" />
                    Export as PNG
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExport("svg")}
                    disabled={isExporting}
                    className="justify-start"
                  >
                    <Download className="h-3 w-3 mr-2" />
                    Export as SVG
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExport("json")}
                    disabled={isExporting}
                    className="justify-start"
                  >
                    <Download className="h-3 w-3 mr-2" />
                    Export Data (JSON)
                  </Button>
                </div>
              </div>

              <Separator />

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-3 block">
                  Export Settings
                </label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="include-metadata"
                      defaultChecked
                      className="rounded"
                    />
                    <label htmlFor="include-metadata" className="text-xs">
                      Include metadata
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="high-resolution"
                      defaultChecked
                      className="rounded"
                    />
                    <label htmlFor="high-resolution" className="text-xs">
                      High resolution (PNG/SVG)
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="include-legend"
                      defaultChecked
                      className="rounded"
                    />
                    <label htmlFor="include-legend" className="text-xs">
                      Include legend
                    </label>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Legend Preview
                </label>
                <div className="bg-muted rounded-lg p-3 space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-xs">Regular Address</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                    <span className="text-xs">High Activity Address</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-0.5 bg-gray-400"></div>
                    <span className="text-xs">Small Transfer (&lt;$1K)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-1 bg-orange-500"></div>
                    <span className="text-xs">Medium Transfer ($1K-$10K)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-1.5 bg-red-500"></div>
                    <span className="text-xs">Large Transfer (&gt;$10K)</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <Separator />
        <div className="flex justify-between">
          <Button
            size="sm"
            variant="ghost"
            onClick={resetToDefaults}
            className="text-xs"
          >
            Reset to Defaults
          </Button>
          <div className="text-xs text-muted-foreground">
            {isExporting
              ? "Exporting..."
              : `${Object.keys(settings).length} settings configured`}
          </div>
        </div>
      </div>
    </Card>
  );
};
