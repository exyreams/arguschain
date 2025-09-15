import React, { useCallback, useEffect, useRef, useState } from "react";
import { Badge, Button, Card } from "@/components/global";
import {
  BarChart3,
  Circle,
  Crosshair,
  Download,
  Eye,
  EyeOff,
  Grid,
  Hand,
  Layers,
  LineChart,
  Maximize2,
  Minus,
  MousePointer,
  PieChart,
  RotateCcw,
  Settings,
  Share2,
  Square,
  Target,
  Type,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ViewportState {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

interface AnnotationItem {
  id: string;
  type: "text" | "arrow" | "rectangle" | "circle" | "line";
  position: { x: number; y: number };
  size?: { width: number; height: number };
  text?: string;
  color: string;
  strokeWidth: number;
  visible: boolean;
}

interface ChartOverlay {
  id: string;
  name: string;
  type: "grid" | "crosshair" | "trend" | "average" | "threshold";
  visible: boolean;
  color: string;
  opacity: number;
  data?: any;
}

interface InteractiveVisualizationControlsProps {
  chartRef?: React.RefObject<any>;
  onViewportChange?: (viewport: ViewportState) => void;
  onAnnotationAdd?: (annotation: AnnotationItem) => void;
  onAnnotationUpdate?: (id: string, updates: Partial<AnnotationItem>) => void;
  onAnnotationDelete?: (id: string) => void;
  onOverlayToggle?: (overlayId: string, visible: boolean) => void;
  onExport?: (format: "png" | "svg" | "pdf") => void;
  onShare?: () => void;
  className?: string;
  showAnnotations?: boolean;
  showOverlays?: boolean;
  showComparison?: boolean;
}

type Tool =
  | "pan"
  | "zoom"
  | "select"
  | "text"
  | "arrow"
  | "rectangle"
  | "circle"
  | "line";

const tools = [
  { id: "pan", label: "Pan", icon: Hand, shortcut: "P" },
  { id: "zoom", label: "Zoom", icon: ZoomIn, shortcut: "Z" },
  { id: "select", label: "Select", icon: MousePointer, shortcut: "S" },
  { id: "text", label: "Text", icon: Type, shortcut: "T" },
  { id: "arrow", label: "Arrow", icon: Target, shortcut: "A" },
  { id: "rectangle", label: "Rectangle", icon: Square, shortcut: "R" },
  { id: "circle", label: "Circle", icon: Circle, shortcut: "C" },
  { id: "line", label: "Line", icon: Minus, shortcut: "L" },
];

const chartTypes = [
  { id: "bar", label: "Bar Chart", icon: BarChart3 },
  { id: "line", label: "Line Chart", icon: LineChart },
  { id: "pie", label: "Pie Chart", icon: PieChart },
  { id: "scatter", label: "Scatter Plot", icon: Target },
  { id: "area", label: "Area Chart", icon: Layers },
];

const overlayTypes = [
  { id: "grid", label: "Grid", icon: Grid, description: "Show grid lines" },
  {
    id: "crosshair",
    label: "Crosshair",
    icon: Crosshair,
    description: "Show crosshair cursor",
  },
  {
    id: "trend",
    label: "Trend Line",
    icon: LineChart,
    description: "Show trend analysis",
  },
  {
    id: "average",
    label: "Average Line",
    icon: Minus,
    description: "Show average value",
  },
  {
    id: "threshold",
    label: "Threshold",
    icon: Target,
    description: "Show threshold markers",
  },
];

export const InteractiveVisualizationControls: React.FC<
  InteractiveVisualizationControlsProps
> = ({
  chartRef,
  onViewportChange,
  onAnnotationAdd,
  onAnnotationUpdate,
  onAnnotationDelete,
  onOverlayToggle,
  onExport,
  onShare,
  className,
  showAnnotations = true,
  showOverlays = true,
  showComparison = true,
}) => {
  const [activeTool, setActiveTool] = useState<Tool>("pan");
  const [viewport, setViewport] = useState<ViewportState>({
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
  });
  const [annotations, setAnnotations] = useState<AnnotationItem[]>([]);
  const [overlays, setOverlays] = useState<ChartOverlay[]>([
    {
      id: "grid",
      name: "Grid",
      type: "grid",
      visible: false,
      color: "#e5e7eb",
      opacity: 0.5,
    },
    {
      id: "crosshair",
      name: "Crosshair",
      type: "crosshair",
      visible: false,
      color: "#6b7280",
      opacity: 0.8,
    },
    {
      id: "trend",
      name: "Trend Line",
      type: "trend",
      visible: false,
      color: "#3b82f6",
      opacity: 0.7,
    },
    {
      id: "average",
      name: "Average",
      type: "average",
      visible: false,
      color: "#ef4444",
      opacity: 0.6,
    },
    {
      id: "threshold",
      name: "Threshold",
      type: "threshold",
      visible: false,
      color: "#f59e0b",
      opacity: 0.7,
    },
  ]);
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(
    null,
  );
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [showControlPanel, setShowControlPanel] = useState(false);
  const [chartType, setChartType] = useState("bar");
  const [comparisonMode, setComparisonMode] = useState(false);

  const controlsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case "=":
          case "+":
            event.preventDefault();
            handleZoom(0.1);
            break;
          case "-":
            event.preventDefault();
            handleZoom(-0.1);
            break;
          case "0":
            event.preventDefault();
            resetViewport();
            break;
          case "s":
            event.preventDefault();
            onShare?.();
            break;
          case "e":
            event.preventDefault();
            onExport?.("png");
            break;
        }
      } else {
        const tool = tools.find(
          (t) => t.shortcut.toLowerCase() === event.key.toLowerCase(),
        );
        if (tool) {
          event.preventDefault();
          setActiveTool(tool.id as Tool);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onShare, onExport]);

  const handleZoom = useCallback(
    (delta: number) => {
      setViewport((prev) => {
        const newScale = Math.max(0.1, Math.min(5, prev.scale + delta));
        const newViewport = { ...prev, scale: newScale };
        onViewportChange?.(newViewport);
        return newViewport;
      });
    },
    [onViewportChange],
  );

  const handlePan = useCallback(
    (deltaX: number, deltaY: number) => {
      setViewport((prev) => {
        const newViewport = {
          ...prev,
          x: prev.x + deltaX,
          y: prev.y + deltaY,
        };
        onViewportChange?.(newViewport);
        return newViewport;
      });
    },
    [onViewportChange],
  );

  const handleRotate = useCallback(
    (angle: number) => {
      setViewport((prev) => {
        const newViewport = {
          ...prev,
          rotation: (prev.rotation + angle) % 360,
        };
        onViewportChange?.(newViewport);
        return newViewport;
      });
    },
    [onViewportChange],
  );

  const resetViewport = useCallback(() => {
    const resetViewport = { x: 0, y: 0, scale: 1, rotation: 0 };
    setViewport(resetViewport);
    onViewportChange?.(resetViewport);
  }, [onViewportChange]);

  const fitToView = useCallback(() => {
    resetViewport();
  }, [resetViewport]);

  const addAnnotation = useCallback(
    (type: AnnotationItem["type"], position: { x: number; y: number }) => {
      const newAnnotation: AnnotationItem = {
        id: `annotation_${Date.now()}`,
        type,
        position,
        color: "#3b82f6",
        strokeWidth: 2,
        visible: true,
        ...(type === "text" && { text: "New annotation" }),
        ...(type === "rectangle" && { size: { width: 100, height: 60 } }),
        ...(type === "circle" && { size: { width: 80, height: 80 } }),
      };

      setAnnotations((prev) => [...prev, newAnnotation]);
      onAnnotationAdd?.(newAnnotation);
      setSelectedAnnotation(newAnnotation.id);
    },
    [onAnnotationAdd],
  );

  const updateAnnotation = useCallback(
    (id: string, updates: Partial<AnnotationItem>) => {
      setAnnotations((prev) =>
        prev.map((ann) => (ann.id === id ? { ...ann, ...updates } : ann)),
      );
      onAnnotationUpdate?.(id, updates);
    },
    [onAnnotationUpdate],
  );

  const deleteAnnotation = useCallback(
    (id: string) => {
      setAnnotations((prev) => prev.filter((ann) => ann.id !== id));
      onAnnotationDelete?.(id);
      if (selectedAnnotation === id) {
        setSelectedAnnotation(null);
      }
    },
    [onAnnotationDelete, selectedAnnotation],
  );

  const toggleOverlay = useCallback(
    (overlayId: string) => {
      setOverlays((prev) =>
        prev.map((overlay) =>
          overlay.id === overlayId
            ? { ...overlay, visible: !overlay.visible }
            : overlay,
        ),
      );

      const overlay = overlays.find((o) => o.id === overlayId);
      if (overlay) {
        onOverlayToggle?.(overlayId, !overlay.visible);
      }
    },
    [overlays, onOverlayToggle],
  );

  const handleChartClick = useCallback(
    (event: React.MouseEvent) => {
      if (!chartRef?.current) return;

      const rect = chartRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      switch (activeTool) {
        case "text":
        case "arrow":
        case "rectangle":
        case "circle":
          addAnnotation(activeTool, { x, y });
          break;
        case "line":
          if (!isDrawing) {
            setIsDrawing(true);
            setDrawStart({ x, y });
          } else {
            if (drawStart) {
              addAnnotation("line", drawStart);
              setIsDrawing(false);
              setDrawStart(null);
            }
          }
          break;
      }
    },
    [activeTool, addAnnotation, isDrawing, drawStart, chartRef],
  );

  const handleChartMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (activeTool === "pan" && event.buttons === 1) {
        handlePan(event.movementX, event.movementY);
      }
    },
    [activeTool, handlePan],
  );

  const handleWheel = useCallback(
    (event: React.WheelEvent) => {
      if (event.ctrlKey) {
        event.preventDefault();
        const delta = event.deltaY > 0 ? -0.1 : 0.1;
        handleZoom(delta);
      }
    },
    [handleZoom],
  );

  return (
    <div className={cn("space-y-4", className)}>
      <Card className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            {tools.slice(0, 3).map((tool) => {
              const ToolIcon = tool.icon;
              return (
                <Button
                  key={tool.id}
                  size="sm"
                  variant={activeTool === tool.id ? "default" : "ghost"}
                  onClick={() => setActiveTool(tool.id as Tool)}
                  title={`${tool.label} (${tool.shortcut})`}
                  className="h-8 w-8 p-0"
                >
                  <ToolIcon className="h-4 w-4" />
                </Button>
              );
            })}

            <div className="w-px h-6 bg-border mx-2" />

            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleZoom(0.1)}
              title="Zoom In (Ctrl/Cmd + +)"
              className="h-8 w-8 p-0"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleZoom(-0.1)}
              title="Zoom Out (Ctrl/Cmd + -)"
              className="h-8 w-8 p-0"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={resetViewport}
              title="Reset View (Ctrl/Cmd + 0)"
              className="h-8 w-8 p-0"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={fitToView}
              title="Fit to View"
              className="h-8 w-8 p-0"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span>Zoom: {(viewport.scale * 100).toFixed(0)}%</span>
            <span>X: {viewport.x.toFixed(0)}</span>
            <span>Y: {viewport.y.toFixed(0)}</span>
            {viewport.rotation !== 0 && (
              <span>Rotation: {viewport.rotation.toFixed(0)}°</span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowControlPanel(!showControlPanel)}
              className="h-8 w-8 p-0"
            >
              <Settings className="h-4 w-4" />
            </Button>

            {onShare && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onShare}
                title="Share (Ctrl/Cmd + S)"
                className="h-8 w-8 p-0"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            )}

            {onExport && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onExport("png")}
                title="Export (Ctrl/Cmd + E)"
                className="h-8 w-8 p-0"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>

      {showControlPanel && (
        <Card className="p-4 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {showAnnotations && (
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center space-x-2">
                  <Type className="h-4 w-4" />
                  <span>Annotation Tools</span>
                </h4>
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-2">
                    {tools.slice(3).map((tool) => {
                      const ToolIcon = tool.icon;
                      return (
                        <Button
                          key={tool.id}
                          size="sm"
                          variant={
                            activeTool === tool.id ? "default" : "outline"
                          }
                          onClick={() => setActiveTool(tool.id as Tool)}
                          title={`${tool.label} (${tool.shortcut})`}
                          className="h-10 flex flex-col items-center justify-center p-1"
                        >
                          <ToolIcon className="h-4 w-4 mb-1" />
                          <span className="text-xs">{tool.label}</span>
                        </Button>
                      );
                    })}
                  </div>

                  {annotations.length > 0 && (
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      <div className="text-xs font-medium text-muted-foreground">
                        Annotations ({annotations.length})
                      </div>
                      {annotations.map((annotation) => (
                        <div
                          key={annotation.id}
                          className={cn(
                            "flex items-center justify-between p-2 border rounded text-xs",
                            selectedAnnotation === annotation.id &&
                              "border-primary bg-primary/5",
                          )}
                        >
                          <div className="flex items-center space-x-2">
                            <div
                              className="w-3 h-3 rounded border"
                              style={{ backgroundColor: annotation.color }}
                            />
                            <span className="capitalize">
                              {annotation.type}
                            </span>
                            {annotation.text && (
                              <span className="text-muted-foreground">
                                "{annotation.text.slice(0, 20)}..."
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                updateAnnotation(annotation.id, {
                                  visible: !annotation.visible,
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
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteAnnotation(annotation.id)}
                              className="h-6 w-6 p-0 text-red-600"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {showOverlays && (
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center space-x-2">
                  <Layers className="h-4 w-4" />
                  <span>Chart Overlays</span>
                </h4>
                <div className="space-y-2">
                  {overlays.map((overlay) => {
                    const overlayType = overlayTypes.find(
                      (t) => t.id === overlay.type,
                    );
                    const OverlayIcon = overlayType?.icon || Grid;

                    return (
                      <div
                        key={overlay.id}
                        className="flex items-center justify-between p-2 border rounded"
                      >
                        <div className="flex items-center space-x-2">
                          <OverlayIcon className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="text-sm font-medium">
                              {overlay.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {overlayType?.description}
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={overlay.visible ? "default" : "outline"}
                          onClick={() => toggleOverlay(overlay.id)}
                          className="h-8 w-8 p-0"
                        >
                          {overlay.visible ? (
                            <Eye className="h-3 w-3" />
                          ) : (
                            <EyeOff className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center space-x-2">
                <BarChart3 className="h-4 w-4" />
                <span>Chart Configuration</span>
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">
                    Chart Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {chartTypes.map((type) => {
                      const TypeIcon = type.icon;
                      return (
                        <Button
                          key={type.id}
                          size="sm"
                          variant={
                            chartType === type.id ? "default" : "outline"
                          }
                          onClick={() => setChartType(type.id)}
                          className="h-10 flex flex-col items-center justify-center p-1"
                        >
                          <TypeIcon className="h-4 w-4 mb-1" />
                          <span className="text-xs">{type.label}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {showComparison && (
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">
                      Comparison Mode
                    </label>
                    <Button
                      size="sm"
                      variant={comparisonMode ? "default" : "outline"}
                      onClick={() => setComparisonMode(!comparisonMode)}
                      className="h-8"
                    >
                      {comparisonMode ? "On" : "Off"}
                    </Button>
                  </div>
                )}

                {onExport && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-2 block">
                      Export Format
                    </label>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onExport("png")}
                        className="flex-1"
                      >
                        PNG
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onExport("svg")}
                        className="flex-1"
                      >
                        SVG
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onExport("pdf")}
                        className="flex-1"
                      >
                        PDF
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      <div
        ref={controlsRef}
        className="absolute inset-0 pointer-events-none"
        style={{
          cursor:
            activeTool === "pan"
              ? "grab"
              : activeTool === "zoom"
                ? "zoom-in"
                : "crosshair",
        }}
        onClick={handleChartClick}
        onMouseMove={handleChartMouseMove}
        onWheel={handleWheel}
      />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center space-x-4">
          <span>Tool: {tools.find((t) => t.id === activeTool)?.label}</span>
          {annotations.length > 0 && (
            <span>{annotations.length} annotations</span>
          )}
          {overlays.filter((o) => o.visible).length > 0 && (
            <span>
              {overlays.filter((o) => o.visible).length} overlays active
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <span>Use keyboard shortcuts for faster navigation</span>
          <Badge variant="outline" className="text-xs">
            Ctrl/Cmd + Scroll to zoom
          </Badge>
        </div>
      </div>
    </div>
  );
};
