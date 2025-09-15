import React, { useEffect, useState } from "react";
import { Button, Badge, Dropdown, Tooltip } from "@/components/global";
import { Slider } from "@/components/ui/Slider";
import { Progress } from "@/components/ui/Progress";
import {
  Activity,
  AlertCircle,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Zap,
  Copy,
  ExternalLink,
  Clock,
  Gauge,
} from "lucide-react";
import { formatGas } from "@/lib/config";
import { cn } from "@/lib/utils";
import type { ProcessedTraceAction } from "@/lib/tracetransaction/types";

interface TransactionReplayProps {
  traces: ProcessedTraceAction[];
  className?: string;
}

interface ReplayState {
  currentStep: number;
  isPlaying: boolean;
  playbackSpeed: number;
}

const SPEED_OPTIONS = [
  { value: "2000", label: "0.5x" },
  { value: "1000", label: "1x" },
  { value: "500", label: "2x" },
  { value: "250", label: "4x" },
  { value: "100", label: "10x" },
];

export function TransactionReplay({
  traces,
  className = "",
}: TransactionReplayProps) {
  const [replayState, setReplayState] = useState<ReplayState>({
    currentStep: 0,
    isPlaying: false,
    playbackSpeed: 1000,
  });

  const currentTrace = traces[replayState.currentStep];
  const progress =
    traces.length > 0
      ? ((replayState.currentStep + 1) / traces.length) * 100
      : 0;

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (replayState.isPlaying && replayState.currentStep < traces.length - 1) {
      interval = setInterval(() => {
        setReplayState((prev) => ({
          ...prev,
          currentStep: prev.currentStep + 1,
        }));
      }, replayState.playbackSpeed);
    } else if (replayState.currentStep >= traces.length - 1) {
      setReplayState((prev) => ({ ...prev, isPlaying: false }));
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [
    replayState.isPlaying,
    replayState.currentStep,
    replayState.playbackSpeed,
    traces.length,
  ]);

  const handlePlay = () => {
    setReplayState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const handleNext = () => {
    if (replayState.currentStep < traces.length - 1) {
      setReplayState((prev) => ({
        ...prev,
        currentStep: prev.currentStep + 1,
        isPlaying: false,
      }));
    }
  };

  const handlePrevious = () => {
    if (replayState.currentStep > 0) {
      setReplayState((prev) => ({
        ...prev,
        currentStep: prev.currentStep - 1,
        isPlaying: false,
      }));
    }
  };

  const handleReset = () => {
    setReplayState((prev) => ({
      ...prev,
      currentStep: 0,
      isPlaying: false,
    }));
  };

  const handleStepChange = (step: number) => {
    setReplayState((prev) => ({
      ...prev,
      currentStep: Math.max(0, Math.min(step, traces.length - 1)),
      isPlaying: false,
    }));
  };

  const handleSpeedChange = (speed: string) => {
    setReplayState((prev) => ({ ...prev, playbackSpeed: Number(speed) }));
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const formatAddress = (address: string) => {
    if (!address || address === "N/A") return "N/A";
    return address;
  };

  if (traces.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-64", className)}>
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-full bg-[rgba(0,191,255,0.1)] flex items-center justify-center">
            <Activity className="w-8 h-8 text-[#00bfff] opacity-50" />
          </div>
          <div className="text-[#8b9dc3] font-medium">
            No trace data available for replay
          </div>
          <div className="text-sm text-[#6b7280]">
            Transaction replay will be available when trace data is loaded
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-[rgba(15,20,25,0.95)] backdrop-blur-[12px] border border-[rgba(0,191,255,0.2)] rounded-xl p-6 shadow-2xl",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[rgba(0,191,255,0.15)] flex items-center justify-center">
            <Play className="w-5 h-5 text-[#00bfff]" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-[#00bfff]">
              Transaction Replay
            </h3>
            <p className="text-sm text-[#8b9dc3]">
              Step-by-step execution analysis
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm text-[#8b9dc3]">Current Step</div>
            <div className="text-lg font-semibold text-[#00bfff]">
              {replayState.currentStep + 1} / {traces.length}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-8 p-4 bg-[rgba(0,191,255,0.05)] rounded-lg border border-[rgba(0,191,255,0.1)]">
        <div className="flex items-center gap-3">
          <Tooltip content="Reset to beginning">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={replayState.currentStep === 0}
              className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)] disabled:opacity-30"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </Tooltip>

          <Tooltip content="Previous step">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevious}
              disabled={replayState.currentStep === 0}
              className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)] disabled:opacity-30"
            >
              <SkipBack className="h-4 w-4" />
            </Button>
          </Tooltip>

          <Tooltip content={replayState.isPlaying ? "Pause" : "Play"}>
            <Button
              variant="default"
              size="sm"
              onClick={handlePlay}
              className="bg-[#00bfff] hover:bg-[#0099cc] text-[#0f1419] px-4"
            >
              {replayState.isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              <span className="ml-2 font-medium">
                {replayState.isPlaying ? "Pause" : "Play"}
              </span>
            </Button>
          </Tooltip>

          <Tooltip content="Next step">
            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              disabled={replayState.currentStep >= traces.length - 1}
              className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)] disabled:opacity-30"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </Tooltip>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#8b9dc3]" />
            <span className="text-sm text-[#8b9dc3] font-medium">Speed:</span>
          </div>
          <Dropdown
            value={replayState.playbackSpeed.toString()}
            onValueChange={handleSpeedChange}
            options={SPEED_OPTIONS}
            className="w-20"
          />
        </div>
      </div>

      {/* Progress Section */}
      <div className="mb-8 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-[#8b9dc3]" />
            <span className="text-sm text-[#8b9dc3] font-medium">Progress</span>
          </div>
          <span className="text-sm text-[#00bfff] font-semibold">
            {progress.toFixed(1)}%
          </span>
        </div>

        <Progress value={progress} className="h-3 bg-[rgba(139,157,195,0.2)]" />

        <div className="space-y-2">
          <Slider
            value={[replayState.currentStep]}
            onValueChange={(value) => handleStepChange(value[0])}
            max={traces.length - 1}
            min={0}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-[#8b9dc3]">
            <span>Start</span>
            <span>Step {replayState.currentStep + 1}</span>
            <span>End</span>
          </div>
        </div>
      </div>

      {/* Current Trace Details */}
      {currentTrace && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  className={cn(
                    "font-medium",
                    currentTrace.type === "CALL" &&
                      "border-blue-400 text-blue-400 bg-blue-400/10",
                    currentTrace.type === "DELEGATECALL" &&
                      "border-purple-400 text-purple-400 bg-purple-400/10",
                    currentTrace.type === "STATICCALL" &&
                      "border-green-400 text-green-400 bg-green-400/10",
                    currentTrace.type === "CREATE" &&
                      "border-orange-400 text-orange-400 bg-orange-400/10",
                    !["CALL", "DELEGATECALL", "STATICCALL", "CREATE"].includes(
                      currentTrace.type
                    ) && "border-gray-400 text-gray-400 bg-gray-400/10"
                  )}
                >
                  {currentTrace.type}
                </Badge>
                {currentTrace.isPyusd && (
                  <Badge
                    variant="outline"
                    className="border-green-400 text-green-400 bg-green-400/10"
                  >
                    PYUSD
                  </Badge>
                )}
                {currentTrace.error && (
                  <Badge
                    variant="destructive"
                    className="border-red-400 text-red-400 bg-red-400/10"
                  >
                    ERROR
                  </Badge>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <span className="text-sm text-[#8b9dc3] font-medium">
                    Function:
                  </span>
                  <div className="text-[#00bfff] font-semibold mt-1">
                    {currentTrace.function !== "N/A"
                      ? currentTrace.function
                      : currentTrace.type}
                  </div>
                </div>

                <div>
                  <span className="text-sm text-[#8b9dc3] font-medium">
                    From:
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="font-mono text-[#00bfff] text-sm bg-[rgba(0,191,255,0.1)] px-2 py-1 rounded">
                      {formatAddress(currentTrace.from)}
                    </code>
                    <Tooltip content="Copy address">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(currentTrace.from)}
                        className="h-6 w-6 p-0 hover:bg-[rgba(0,191,255,0.1)]"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </Tooltip>
                  </div>
                </div>

                <div>
                  <span className="text-sm text-[#8b9dc3] font-medium">
                    To:
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="font-mono text-[#00bfff] text-sm bg-[rgba(0,191,255,0.1)] px-2 py-1 rounded">
                      {formatAddress(currentTrace.to)}
                    </code>
                    <Tooltip content="Copy address">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(currentTrace.to)}
                        className="h-6 w-6 p-0 hover:bg-[rgba(0,191,255,0.1)]"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </Tooltip>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[rgba(0,191,255,0.05)] p-3 rounded-lg border border-[rgba(0,191,255,0.1)]">
                  <div className="text-xs text-[#8b9dc3] font-medium mb-1">
                    Gas Used
                  </div>
                  <div className="text-[#00bfff] font-mono font-semibold">
                    {formatGas(currentTrace.gasUsed)}
                  </div>
                </div>

                <div className="bg-[rgba(0,191,255,0.05)] p-3 rounded-lg border border-[rgba(0,191,255,0.1)]">
                  <div className="text-xs text-[#8b9dc3] font-medium mb-1">
                    Call Depth
                  </div>
                  <div className="text-[#00bfff] font-semibold">
                    {currentTrace.depth}
                  </div>
                </div>

                <div className="bg-[rgba(0,191,255,0.05)] p-3 rounded-lg border border-[rgba(0,191,255,0.1)]">
                  <div className="text-xs text-[#8b9dc3] font-medium mb-1">
                    Value (ETH)
                  </div>
                  <div className="text-[#00bfff] font-mono font-semibold">
                    {currentTrace.valueEth.toFixed(9)}
                  </div>
                </div>

                <div className="bg-[rgba(0,191,255,0.05)] p-3 rounded-lg border border-[rgba(0,191,255,0.1)]">
                  <div className="text-xs text-[#8b9dc3] font-medium mb-1">
                    Contract
                  </div>
                  <div className="text-[#00bfff] text-sm font-medium truncate">
                    {currentTrace.contract}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Parameters Section */}
          {Object.keys(currentTrace.parameters).length > 0 && (
            <div className="mt-6 p-4 bg-[rgba(0,191,255,0.03)] rounded-lg border border-[rgba(0,191,255,0.1)]">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4 text-[#00bfff]" />
                <span className="text-sm text-[#8b9dc3] font-medium">
                  Function Parameters
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(currentTrace.parameters).map(([key, value]) => (
                  <div key={key} className="flex flex-col space-y-1">
                    <span className="text-[#8b9dc3] text-xs font-medium">
                      {key}:
                    </span>
                    <code className="text-[#00bfff] text-sm font-mono bg-[rgba(0,191,255,0.1)] p-2 rounded break-all">
                      {typeof value === "object"
                        ? JSON.stringify(value, null, 2)
                        : String(value)}
                    </code>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Section */}
          {currentTrace.error && (
            <div className="mt-6 p-4 bg-[rgba(255,99,71,0.05)] rounded-lg border border-[rgba(255,99,71,0.2)]">
              <div className="flex items-center gap-2 text-red-400 mb-3">
                <AlertCircle className="h-5 w-5" />
                <span className="font-semibold">Execution Error</span>
              </div>
              <div className="text-red-400 text-sm bg-[rgba(255,99,71,0.1)] p-3 rounded font-mono">
                {currentTrace.error}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
