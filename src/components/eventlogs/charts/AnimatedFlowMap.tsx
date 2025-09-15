import React, { useEffect, useMemo, useRef, useState } from "react";
import type { ParsedTransferLog } from "@/lib/eventlogs";
import { formatPyusdValue, shortenAddress } from "@/lib/eventlogs";
import { Pause, Play, RotateCcw } from "lucide-react";
import { Button, Dropdown } from "@/components/global";

interface AnimatedFlowMapProps {
  transfers: ParsedTransferLog[];
  height?: number | string;
  className?: string;
  hideTitle?: boolean;
}

interface FlowNode {
  id: string;
  address: string;
  address_short: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  type: "sender" | "receiver" | "both";
  totalVolume: number;
  connections: number;
}

interface FlowPath {
  id: string;
  from: FlowNode;
  to: FlowNode;
  value: number;
  timestamp: number;
  path: string;
  color: string;
  width: number;
  particles: FlowParticle[];
}

interface FlowParticle {
  id: string;
  progress: number;
  size: number;
  color: string;
  speed: number;
}

export function AnimatedFlowMap({
  transfers,
  height = 500,
  className = "",
  hideTitle = false,
}: AnimatedFlowMapProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  const { nodes, flows } = useMemo(() => {
    if (transfers.length === 0) {
      return { nodes: [], flows: [] };
    }

    const addressStats = new Map<
      string,
      {
        totalSent: number;
        totalReceived: number;
        connections: Set<string>;
        type: "sender" | "receiver" | "both";
      }
    >();

    transfers.forEach((transfer) => {
      if (!addressStats.has(transfer.from)) {
        addressStats.set(transfer.from, {
          totalSent: 0,
          totalReceived: 0,
          connections: new Set(),
          type: "sender",
        });
      }
      const senderStats = addressStats.get(transfer.from)!;
      senderStats.totalSent += transfer.value_pyusd;
      senderStats.connections.add(transfer.to);

      if (!addressStats.has(transfer.to)) {
        addressStats.set(transfer.to, {
          totalSent: 0,
          totalReceived: 0,
          connections: new Set(),
          type: "receiver",
        });
      }
      const receiverStats = addressStats.get(transfer.to)!;
      receiverStats.totalReceived += transfer.value_pyusd;
      receiverStats.connections.add(transfer.from);

      if (senderStats.totalReceived > 0) senderStats.type = "both";
      if (receiverStats.totalSent > 0) receiverStats.type = "both";
    });

    const nodeArray = Array.from(addressStats.entries()).slice(0, 15);
    const centerX = 300;
    const centerY = 250;
    const radius = 180;

    const flowNodes: FlowNode[] = nodeArray.map(([address, stats], index) => {
      const angle = (index / nodeArray.length) * 2 * Math.PI;
      const totalVolume = stats.totalSent + stats.totalReceived;
      const nodeRadius = Math.max(8, Math.min(25, totalVolume / 1000));

      let color = "#10b981";
      if (stats.type === "sender") color = "#ef4444";
      if (stats.type === "both") color = "#8b5cf6";

      return {
        id: address,
        address,
        address_short: shortenAddress(address),
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        radius: nodeRadius,
        color,
        type: stats.type,
        totalVolume,
        connections: stats.connections.size,
      };
    });

    const nodeMap = new Map(flowNodes.map((node) => [node.id, node]));
    const flowPaths: FlowPath[] = [];

    const transferGroups = new Map<string, ParsedTransferLog[]>();
    transfers.forEach((transfer) => {
      const key = `${transfer.from}-${transfer.to}`;
      if (!transferGroups.has(key)) {
        transferGroups.set(key, []);
      }
      transferGroups.get(key)!.push(transfer);
    });

    transferGroups.forEach((groupTransfers, key) => {
      const [fromAddr, toAddr] = key.split("-");
      const fromNode = nodeMap.get(fromAddr);
      const toNode = nodeMap.get(toAddr);

      if (fromNode && toNode) {
        const totalValue = groupTransfers.reduce(
          (sum, t) => sum + t.value_pyusd,
          0
        );
        const avgTimestamp =
          groupTransfers.reduce((sum, t) => sum + (t.timestamp || 0), 0) /
          groupTransfers.length;

        const dx = toNode.x - fromNode.x;
        const dy = toNode.y - fromNode.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const midX = (fromNode.x + toNode.x) / 2;
        const midY = (fromNode.y + toNode.y) / 2;
        const controlX = midX + (dy / distance) * 50;
        const controlY = midY - (dx / distance) * 50;

        const path = `M${fromNode.x},${fromNode.y} Q${controlX},${controlY} ${toNode.x},${toNode.y}`;

        const particleCount = Math.min(
          5,
          Math.max(1, Math.floor(totalValue / 1000))
        );
        const particles: FlowParticle[] = Array.from(
          { length: particleCount },
          (_, i) => ({
            id: `${key}-particle-${i}`,
            progress: (i / particleCount) * 0.8,
            size: Math.max(2, Math.min(8, totalValue / 5000)),
            color: fromNode.color,
            speed: 0.01 + Math.random() * 0.02,
          })
        );

        flowPaths.push({
          id: key,
          from: fromNode,
          to: toNode,
          value: totalValue,
          timestamp: avgTimestamp,
          path,
          color: fromNode.color,
          width: Math.max(1, Math.min(8, totalValue / 2000)),
          particles,
        });
      }
    });

    return { nodes: flowNodes, flows: flowPaths.slice(0, 20) };
  }, [transfers]);

  useEffect(() => {
    if (!isPlaying || flows.length === 0) return;

    const animate = (timestamp: number) => {
      const delta = timestamp - lastTimeRef.current;

      if (delta > 0) {
        // Update particles without causing re-renders
        flows.forEach((flow) => {
          flow.particles.forEach((particle) => {
            particle.progress += particle.speed * speed * (delta / 16.67);
            if (particle.progress > 1) {
              particle.progress = 0;
            }
          });
        });

        lastTimeRef.current = timestamp;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = performance.now();
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = undefined;
      }
    };
  }, [isPlaying, speed, flows.length]); // Only depend on flows.length, not flows array

  const getPointAlongPath = (pathElement: SVGPathElement, progress: number) => {
    const length = pathElement.getTotalLength();
    return pathElement.getPointAtLength(length * progress);
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const resetAnimation = () => {
    setCurrentTime(0);
    flows.forEach((flow) => {
      flow.particles.forEach((particle, i) => {
        particle.progress = (i / flow.particles.length) * 0.8;
      });
    });
  };

  if (transfers.length === 0) {
    return (
      <div
        className={`h-full bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-4 ${className}`}
      >
        <div className="flex items-center gap-2 mb-4"></div>
        <div className="h-64 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
              <div className="w-8 h-8 bg-[#00bfff] rounded-full opacity-50"></div>
            </div>
            <p className="text-[#8b9dc3] text-sm">No transfer data available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      data-chart="true"
      className={`h-full bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-4 ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2"></div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={togglePlayPause}
            className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)] p-2"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={resetAnimation}
            className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)] p-2"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Dropdown
            value={speed.toString()}
            onValueChange={(value) => setSpeed(Number(value))}
            options={[
              { value: "0.5", label: "0.5x" },
              { value: "1", label: "1x" },
              { value: "2", label: "2x" },
              { value: "4", label: "4x" },
            ]}
            className="min-w-[70px]"
          />
        </div>
      </div>

      <div
        className="relative"
        style={{
          height:
            typeof height === "number"
              ? `${height - 80}px`
              : typeof height === "string"
                ? `calc(${height} - 80px)`
                : "calc(100% - 80px)",
          minHeight: "400px",
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 600 500"
          className="overflow-visible"
        >
          <defs>
            <pattern
              id="grid"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 20 0 L 0 0 0 20"
                fill="none"
                stroke="rgba(0,191,255,0.1)"
                strokeWidth="0.5"
              />
            </pattern>

            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect width="100%" height="100%" fill="url(#grid)" />

          {flows.map((flow) => (
            <g key={flow.id}>
              <path
                d={flow.path}
                fill="none"
                stroke={flow.color}
                strokeWidth={flow.width}
                strokeOpacity={0.3}
                strokeDasharray="5,5"
              />

              {flow.particles.map((particle) => {
                const pathElement = document.createElementNS(
                  "http://www.w3.org/2000/svg",
                  "path"
                );
                pathElement.setAttribute("d", flow.path);

                const x =
                  flow.from.x + (flow.to.x - flow.from.x) * particle.progress;
                const y =
                  flow.from.y + (flow.to.y - flow.from.y) * particle.progress;

                return (
                  <circle
                    key={particle.id}
                    cx={x}
                    cy={y}
                    r={particle.size}
                    fill={particle.color}
                    filter="url(#glow)"
                    opacity={0.8}
                  >
                    <animate
                      attributeName="r"
                      values={`${particle.size};${particle.size * 1.5};${particle.size}`}
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                );
              })}
            </g>
          ))}

          {nodes.map((node) => (
            <g key={node.id}>
              <circle
                cx={node.x}
                cy={node.y}
                r={node.radius + 3}
                fill={node.color}
                opacity={0.2}
                filter="url(#glow)"
              />

              <circle
                cx={node.x}
                cy={node.y}
                r={node.radius}
                fill={node.color}
                stroke="rgba(255,255,255,0.3)"
                strokeWidth={2}
                opacity={0.9}
              >
                <animate
                  attributeName="r"
                  values={`${node.radius};${node.radius + 2};${node.radius}`}
                  dur="3s"
                  repeatCount="indefinite"
                />
              </circle>

              <text
                x={node.x}
                y={node.y - node.radius - 8}
                textAnchor="middle"
                fill="#8b9dc3"
                fontSize="10"
                fontWeight="bold"
              >
                {node.address_short}
              </text>

              <text
                x={node.x}
                y={node.y + node.radius + 15}
                textAnchor="middle"
                fill="#6b7280"
                fontSize="8"
              >
                {formatPyusdValue(node.totalVolume)}
              </text>

              <title>
                {`${node.address_short}\nType: ${node.type}\nVolume: ${formatPyusdValue(node.totalVolume)}\nConnections: ${node.connections}`}
              </title>
            </g>
          ))}
        </svg>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#ef4444] rounded-full"></div>
            <span className="text-[#8b9dc3]">Senders</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#10b981] rounded-full"></div>
            <span className="text-[#8b9dc3]">Receivers</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#8b5cf6] rounded-full"></div>
            <span className="text-[#8b9dc3]">Both</span>
          </div>
        </div>
        <div className="text-[#6b7280]">
          {nodes.length} nodes • {flows.length} flows •{" "}
          {isPlaying ? "Playing" : "Paused"}
        </div>
      </div>
    </div>
  );
}
