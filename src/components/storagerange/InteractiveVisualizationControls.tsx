import React, { useCallback, useState } from "react";
import { Card } from "@/components/global/Card";
import { Button } from "@/components/global/Button";
import { Input } from "@/components/global/Input";
import { Badge } from "@/components/global/Badge";
import {
  Download,
  Eye,
  EyeOff,
  Grid,
  Layers,
  Maximize,
  Minimize,
  RotateCcw,
  Settings,
  Target,
  Type,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

interface InteractiveVisualizationControlsProps {
  chartRef?: React.RefObject<any>;
  chartType: "line" | "bar" | "pie" | "scatter" | "area" | "radar" | "treemap";
  data: any[];
  onConfigChange?: (config: ChartConfiguration) => void;
  onExport?: (format: ExportFormat, options: ExportOptions) => void;
  className?: string;
}

interface ChartConfiguration {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    grid: string;
    text: string;
  };
  layout: {
    showGrid: boolean;
    showLegend: boolean;
    showTooltip: boolean;
    showLabels: boolean;
    showAxes: boolean;
    margin: { top: number; right: number; bottom: number; left: number };
  };
  scale: {
    zoom: number;
    panX: number;
    panY: number;
    autoScale: boolean;
  };
  animation: {
    enabled: boolean;
    duration: number;
    easing: "linear" | "ease" | "ease-in" | "ease-out" | "ease-in-out";
  };
  annotations: ChartAnnotation[];
}

interface ChartAnnotation {
  id: string;
  type: "line" | "area" | "point" | "text";
  position: { x: number; y: number };
  content: string;
  style: {
    color: string;
    strokeWidth: number;
    fontSize?: number;
  };
  visible: boolean;
}

interface ExportOptions {
  width: number;
  height: number;
  quality: number;
  backgroundColor: string;
  includeTitle: boolean;
  includeWatermark: boolean;
}

type ExportFormat = "png" | "svg" | "pdf" | "json";

const DEFAULT_CONFIG: ChartConfiguration = {
  colors: {
    primary: "#00bfff",
    secondary: "#10b981",
    accent: "#f59e0b",
    background: "rgba(25,28,40,0.8)",
    grid: "rgba(0,191,255,0.1)",
    text: "#8b9dc3",
  },
  layout: {
    showGrid: true,
    showLegend: true,
    showTooltip: true,
    showLabels: true,
    showAxes: true,
    margin: { top: 20, right: 30, bottom: 20, left: 20 },
  },
  scale: {
    zoom: 1,
    panX: 0,
    panY: 0,
    autoScale: true,
  },
  animation: {
    enabled: true,
    duration: 750,
    easing: "ease-out",
  },
  annotations: [],
};

export const InteractiveVisualizationControls: React.FC<
  InteractiveVisualizationControlsProps
> = ({
  chartRef,
  chartType,
  data,
  onConfigChange,
  onExport,
  className = "",
}) => {
  const [config, setConfig] = useState<ChartConfiguration>(DEFAULT_CONFIG);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "layout" | "colors" | "scale" | "export"
  >("layout");
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    width: 1200,
    height: 800,
    quality: 1.0,
    backgroundColor: "rgba(25,28,40,0.8)",
    includeTitle: true,
    includeWatermark: false,
  });

  const updateConfig = useCallback(
    (updates: Partial<ChartConfiguration>) => {
      const newConfig = { ...config, ...updates };
      setConfig(newConfig);
      onConfigChange?.(newConfig);
    },
    [config, onConfigChange],
  );

  const handleZoom = useCallback(
    (direction: "in" | "out" | "reset") => {
      const currentZoom = config.scale.zoom;
      let newZoom: number;

      switch (direction) {
        case "in":
          newZoom = Math.min(currentZoom * 1.2, 5);
          break;
        case "out":
          newZoom = Math.max(currentZoom / 1.2, 0.1);
          break;
        case "reset":
          newZoom = 1;
          break;
      }

      updateConfig({
        scale: {
          ...config.scale,
          zoom: newZoom,
          ...(direction === "reset" && { panX: 0, panY: 0 }),
        },
      });
    },
    [config.scale, updateConfig],
  );

  const handlePan = useCallback(
    (direction: "up" | "down" | "left" | "right") => {
      const panStep = 20;
      let newPanX = config.scale.panX;
      let newPanY = config.scale.panY;

      switch (direction) {
        case "up":
          newPanY -= panStep;
          break;
        case "down":
          newPanY += panStep;
          break;
        case "left":
          newPanX -= panStep;
          break;
        case "right":
          newPanX += panStep;
          break;
      }

      updateConfig({
        scale: {
          ...config.scale,
          panX: newPanX,
          panY: newPanY,
        },
      });
    },
    [config.scale, updateConfig],
  );

  const handleExport = useCallback(
    (format: ExportFormat) => {
      onExport?.(format, exportOptions);
    },
    [onExport, exportOptions],
  );

  const toggleLayoutOption = useCallback(
    (option: keyof ChartConfiguration["layout"]) => {
      updateConfig({
        layout: {
          ...config.layout,
          [option]: !config.layout[option],
        },
      });
    },
    [config.layout, updateConfig],
  );

  const updateColor = useCallback(
    (colorKey: keyof ChartConfiguration["colors"], value: string) => {
      updateConfig({
        colors: {
          ...config.colors,
          [colorKey]: value,
        },
      });
    },
    [config.colors, updateConfig],
  );

  const addAnnotation = useCallback(() => {
    const newAnnotation: ChartAnnotation = {
      id: `annotation-${Date.now()}`,
      type: "text",
      position: { x: 50, y: 50 },
      content: "New annotation",
      style: {
        color: config.colors.accent,
        strokeWidth: 2,
        fontSize: 12,
      },
      visible: true,
    };

    updateConfig({
      annotations: [...config.annotations, newAnnotation],
    });
  }, [config.annotations, config.colors.accent, updateConfig]);

  const removeAnnotation = useCallback(
    (id: string) => {
      updateConfig({
        annotations: config.annotations.filter((a) => a.id !== id),
      });
    },
    [config.annotations, updateConfig],
  );

  return (
    <Card
      className={`bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)] ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-[#00bfff]" />
          <h3 className="text-lg font-semibold text-[#00bfff]">
            Visualization Controls
          </h3>
          <Badge
            variant="outline"
            className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
          >
            {chartType.toUpperCase()}
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
        >
          {isExpanded ? (
            <Minimize className="h-4 w-4" />
          ) : (
            <Maximize className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-1 p-1 rounded border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleZoom("out")}
            className="h-8 w-8 p-0"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs text-[#8b9dc3] px-2">
            {Math.round(config.scale.zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleZoom("in")}
            className="h-8 w-8 p-0"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleZoom("reset")}
            className="h-8 w-8 p-0"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1 p-1 rounded border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlePan("up")}
            className="h-8 w-8 p-0"
          >
            ↑
          </Button>
          <div className="flex flex-col gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePan("left")}
              className="h-6 w-6 p-0 text-xs"
            >
              ←
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePan("right")}
              className="h-6 w-6 p-0 text-xs"
            >
              →
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlePan("down")}
            className="h-8 w-8 p-0"
          >
            ↓
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant={config.layout.showGrid ? "default" : "outline"}
            size="sm"
            onClick={() => toggleLayoutOption("showGrid")}
            className="h-8 w-8 p-0"
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={config.layout.showLegend ? "default" : "outline"}
            size="sm"
            onClick={() => toggleLayoutOption("showLegend")}
            className="h-8 w-8 p-0"
          >
            <Layers className="h-4 w-4" />
          </Button>
          <Button
            variant={config.layout.showLabels ? "default" : "outline"}
            size="sm"
            onClick={() => toggleLayoutOption("showLabels")}
            className="h-8 w-8 p-0"
          >
            <Type className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("png")}
            className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
          >
            <Download className="h-4 w-4 mr-1" />
            PNG
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("svg")}
            className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
          >
            SVG
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-4">
          <div className="flex items-center gap-1 p-1 rounded border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
            {["layout", "colors", "scale", "export"].map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab(tab as any)}
                className="capitalize"
              >
                {tab}
              </Button>
            ))}
          </div>

          <div className="p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
            {activeTab === "layout" && (
              <div className="space-y-4">
                <h4 className="font-medium text-[#00bfff]">Layout Options</h4>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(config.layout).map(([key, value]) => {
                    if (typeof value === "boolean") {
                      return (
                        <label key={key} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={value}
                            onChange={() => toggleLayoutOption(key as any)}
                            className="rounded border-[rgba(0,191,255,0.3)]"
                          />
                          <span className="text-[#8b9dc3] text-sm capitalize">
                            {key.replace(/([A-Z])/g, " $1").toLowerCase()}
                          </span>
                        </label>
                      );
                    }
                    return null;
                  })}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(config.layout.margin).map(([key, value]) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-[#8b9dc3] mb-1 capitalize">
                        {key} Margin
                      </label>
                      <Input
                        type="number"
                        value={value}
                        onChange={(e) =>
                          updateConfig({
                            layout: {
                              ...config.layout,
                              margin: {
                                ...config.layout.margin,
                                [key]: parseInt(e.target.value) || 0,
                              },
                            },
                          })
                        }
                        className="bg-[rgba(15,20,25,0.8)] border-[rgba(0,191,255,0.3)] text-[#8b9dc3]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "colors" && (
              <div className="space-y-4">
                <h4 className="font-medium text-[#00bfff]">Color Scheme</h4>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(config.colors).map(([key, value]) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-[#8b9dc3] mb-1 capitalize">
                        {key}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={value}
                          onChange={(e) =>
                            updateColor(key as any, e.target.value)
                          }
                          className="w-8 h-8 rounded border border-[rgba(0,191,255,0.3)]"
                        />
                        <Input
                          value={value}
                          onChange={(e) =>
                            updateColor(key as any, e.target.value)
                          }
                          className="flex-1 bg-[rgba(15,20,25,0.8)] border-[rgba(0,191,255,0.3)] text-[#8b9dc3]"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateConfig({ colors: DEFAULT_CONFIG.colors })
                    }
                    className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                  >
                    Reset Colors
                  </Button>
                </div>
              </div>
            )}

            {activeTab === "scale" && (
              <div className="space-y-4">
                <h4 className="font-medium text-[#00bfff]">Scale & Position</h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#8b9dc3] mb-1">
                      Zoom Level
                    </label>
                    <Input
                      type="range"
                      min="0.1"
                      max="5"
                      step="0.1"
                      value={config.scale.zoom}
                      onChange={(e) =>
                        updateConfig({
                          scale: {
                            ...config.scale,
                            zoom: parseFloat(e.target.value),
                          },
                        })
                      }
                      className="w-full"
                    />
                    <div className="text-xs text-[#8b9dc3] mt-1">
                      {Math.round(config.scale.zoom * 100)}%
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#8b9dc3] mb-1">
                      Pan X
                    </label>
                    <Input
                      type="number"
                      value={config.scale.panX}
                      onChange={(e) =>
                        updateConfig({
                          scale: {
                            ...config.scale,
                            panX: parseInt(e.target.value) || 0,
                          },
                        })
                      }
                      className="bg-[rgba(15,20,25,0.8)] border-[rgba(0,191,255,0.3)] text-[#8b9dc3]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#8b9dc3] mb-1">
                      Pan Y
                    </label>
                    <Input
                      type="number"
                      value={config.scale.panY}
                      onChange={(e) =>
                        updateConfig({
                          scale: {
                            ...config.scale,
                            panY: parseInt(e.target.value) || 0,
                          },
                        })
                      }
                      className="bg-[rgba(15,20,25,0.8)] border-[rgba(0,191,255,0.3)] text-[#8b9dc3]"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.scale.autoScale}
                    onChange={(e) =>
                      updateConfig({
                        scale: {
                          ...config.scale,
                          autoScale: e.target.checked,
                        },
                      })
                    }
                    className="rounded border-[rgba(0,191,255,0.3)]"
                  />
                  <span className="text-[#8b9dc3] text-sm">Auto Scale</span>
                </label>
              </div>
            )}

            {activeTab === "export" && (
              <div className="space-y-4">
                <h4 className="font-medium text-[#00bfff]">Export Options</h4>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#8b9dc3] mb-1">
                      Width
                    </label>
                    <Input
                      type="number"
                      value={exportOptions.width}
                      onChange={(e) =>
                        setExportOptions((prev) => ({
                          ...prev,
                          width: parseInt(e.target.value) || 1200,
                        }))
                      }
                      className="bg-[rgba(15,20,25,0.8)] border-[rgba(0,191,255,0.3)] text-[#8b9dc3]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#8b9dc3] mb-1">
                      Height
                    </label>
                    <Input
                      type="number"
                      value={exportOptions.height}
                      onChange={(e) =>
                        setExportOptions((prev) => ({
                          ...prev,
                          height: parseInt(e.target.value) || 800,
                        }))
                      }
                      className="bg-[rgba(15,20,25,0.8)] border-[rgba(0,191,255,0.3)] text-[#8b9dc3]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#8b9dc3] mb-1">
                      Quality
                    </label>
                    <Input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.1"
                      value={exportOptions.quality}
                      onChange={(e) =>
                        setExportOptions((prev) => ({
                          ...prev,
                          quality: parseFloat(e.target.value),
                        }))
                      }
                      className="w-full"
                    />
                    <div className="text-xs text-[#8b9dc3] mt-1">
                      {Math.round(exportOptions.quality * 100)}%
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#8b9dc3] mb-1">
                      Background
                    </label>
                    <input
                      type="color"
                      value={exportOptions.backgroundColor}
                      onChange={(e) =>
                        setExportOptions((prev) => ({
                          ...prev,
                          backgroundColor: e.target.value,
                        }))
                      }
                      className="w-full h-8 rounded border border-[rgba(0,191,255,0.3)]"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeTitle}
                      onChange={(e) =>
                        setExportOptions((prev) => ({
                          ...prev,
                          includeTitle: e.target.checked,
                        }))
                      }
                      className="rounded border-[rgba(0,191,255,0.3)]"
                    />
                    <span className="text-[#8b9dc3] text-sm">
                      Include Title
                    </span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeWatermark}
                      onChange={(e) =>
                        setExportOptions((prev) => ({
                          ...prev,
                          includeWatermark: e.target.checked,
                        }))
                      }
                      className="rounded border-[rgba(0,191,255,0.3)]"
                    />
                    <span className="text-[#8b9dc3] text-sm">
                      Include Watermark
                    </span>
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  {(["png", "svg", "pdf", "json"] as ExportFormat[]).map(
                    (format) => (
                      <Button
                        key={format}
                        variant="outline"
                        size="sm"
                        onClick={() => handleExport(format)}
                        className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        {format.toUpperCase()}
                      </Button>
                    ),
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="p-4 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-[#00bfff]">Annotations</h4>
              <Button
                onClick={addAnnotation}
                size="sm"
                className="bg-[rgba(0,191,255,0.1)] border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.2)]"
              >
                <Target className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>

            <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
              {config.annotations.map((annotation) => (
                <div
                  key={annotation.id}
                  className="flex items-center gap-2 p-2 rounded border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.8)]"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      updateConfig({
                        annotations: config.annotations.map((a) =>
                          a.id === annotation.id
                            ? { ...a, visible: !a.visible }
                            : a,
                        ),
                      })
                    }
                    className="h-6 w-6 p-0"
                  >
                    {annotation.visible ? (
                      <Eye className="h-3 w-3" />
                    ) : (
                      <EyeOff className="h-3 w-3" />
                    )}
                  </Button>

                  <Input
                    value={annotation.content}
                    onChange={(e) =>
                      updateConfig({
                        annotations: config.annotations.map((a) =>
                          a.id === annotation.id
                            ? { ...a, content: e.target.value }
                            : a,
                        ),
                      })
                    }
                    className="flex-1 bg-[rgba(15,20,25,0.8)] border-[rgba(0,191,255,0.3)] text-[#8b9dc3]"
                  />

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAnnotation(annotation.id)}
                    className="h-6 w-6 p-0 text-red-400 hover:bg-red-500/10"
                  >
                    ×
                  </Button>
                </div>
              ))}

              {config.annotations.length === 0 && (
                <div className="text-center py-4 text-[#8b9dc3] text-sm">
                  No annotations added
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
