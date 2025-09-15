import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import { Badge, Button, Dropdown } from "@/components/global";
import type { ParsedTransferLog } from "@/lib/eventlogs";
import { formatPyusdValue, shortenAddress } from "@/lib/eventlogs";
import { Pause, Play, RotateCcw, Filter } from "lucide-react";

interface TransferNetworkDiagramProps {
  transfers: ParsedTransferLog[];
  height?: number | string;
  className?: string;
  hideTitle?: boolean;
}

interface NetworkNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  value: number;
  type: "sender" | "receiver" | "both" | "hub";
  color: string;
  radius: number;
  connections: number;
  totalSent: number;
  totalReceived: number;
  group?: number;
}

interface NetworkLink extends d3.SimulationLinkDatum<NetworkNode> {
  source: NetworkNode | string;
  target: NetworkNode | string;
  value: number;
  transferCount: number;
  width: number;
  opacity: number;
}

export function TransferNetworkDiagram({
  transfers,
  height = 600,
  className = "",
  hideTitle = false,
}: TransferNetworkDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<NetworkNode, NetworkLink> | null>(
    null
  );

  const [maxNodes, setMaxNodes] = useState(20);
  const [minFlowValue, setMinFlowValue] = useState(0);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isSimulationRunning, setIsSimulationRunning] = useState(true);
  const [layoutType, setLayoutType] = useState<
    "force" | "circular" | "hierarchical"
  >("force");

  const { nodes, links, stats } = useMemo(() => {
    if (!transfers || transfers.length === 0) {
      return { nodes: [], links: [], stats: null };
    }

    // Aggregate flows between addresses
    const flowMap = new Map<
      string,
      {
        from: string;
        to: string;
        value: number;
        count: number;
      }
    >();

    transfers.forEach((transfer) => {
      const key = `${transfer.from}->${transfer.to}`;
      const existing = flowMap.get(key) || {
        from: transfer.from,
        to: transfer.to,
        value: 0,
        count: 0,
      };
      existing.value += transfer.value_pyusd;
      existing.count += 1;
      flowMap.set(key, existing);
    });

    // Filter and sort flows
    const allFlows = Array.from(flowMap.values())
      .filter((flow) => flow.value >= minFlowValue)
      .sort((a, b) => b.value - a.value);

    if (allFlows.length === 0) {
      return { nodes: [], links: [], stats: null };
    }

    // Calculate address statistics
    const addressStats = new Map<
      string,
      {
        sent: number;
        received: number;
        connections: Set<string>;
        totalVolume: number;
      }
    >();

    allFlows.forEach((flow) => {
      [flow.from, flow.to].forEach((address) => {
        if (!addressStats.has(address)) {
          addressStats.set(address, {
            sent: 0,
            received: 0,
            connections: new Set(),
            totalVolume: 0,
          });
        }
      });

      const senderStats = addressStats.get(flow.from)!;
      const receiverStats = addressStats.get(flow.to)!;

      senderStats.sent += flow.value;
      senderStats.totalVolume += flow.value;
      senderStats.connections.add(flow.to);

      receiverStats.received += flow.value;
      receiverStats.totalVolume += flow.value;
      receiverStats.connections.add(flow.from);
    });

    // Select top nodes by volume and connections
    const topAddresses = Array.from(addressStats.entries())
      .sort((a, b) => {
        const aScore = a[1].totalVolume + a[1].connections.size * 1000;
        const bScore = b[1].totalVolume + b[1].connections.size * 1000;
        return bScore - aScore;
      })
      .slice(0, maxNodes)
      .map(([address]) => address);

    // Filter flows to only include top addresses
    const filteredFlows = allFlows.filter(
      (flow) =>
        topAddresses.includes(flow.from) && topAddresses.includes(flow.to)
    );

    // Create nodes
    const maxVolume = Math.max(
      ...Array.from(addressStats.values()).map((s) => s.totalVolume)
    );
    const maxConnections = Math.max(
      ...Array.from(addressStats.values()).map((s) => s.connections.size)
    );

    const nodes: NetworkNode[] = topAddresses.map((address) => {
      const stats = addressStats.get(address)!;
      const connections = stats.connections.size;
      const totalVolume = stats.totalVolume;

      // Determine node type
      let type: "sender" | "receiver" | "both" | "hub";
      const isHub = connections >= 3 || totalVolume > maxVolume * 0.1;

      if (isHub) {
        type = "hub";
      } else if (stats.sent > 0 && stats.received > 0) {
        type = "both";
      } else if (stats.sent > 0) {
        type = "sender";
      } else {
        type = "receiver";
      }

      // Color based on type
      let color: string;
      switch (type) {
        case "hub":
          color = "#f59e0b"; // Orange for hubs
          break;
        case "sender":
          color = "#ef4444"; // Red for senders
          break;
        case "receiver":
          color = "#10b981"; // Green for receivers
          break;
        case "both":
          color = "#8b5cf6"; // Purple for both
          break;
        default:
          color = "#00bfff";
      }

      // Size based on volume and connections
      const volumeScore = totalVolume / maxVolume;
      const connectionScore = connections / maxConnections;
      const combinedScore = (volumeScore + connectionScore) / 2;
      const radius = Math.max(12, Math.min(30, 12 + combinedScore * 18));

      return {
        id: address,
        label: shortenAddress(address),
        value: totalVolume,
        type,
        color,
        radius,
        connections,
        totalSent: stats.sent,
        totalReceived: stats.received,
      };
    });

    // Create links
    const maxFlowValue = Math.max(...filteredFlows.map((f) => f.value));
    const links: NetworkLink[] = filteredFlows.map((flow) => ({
      source: flow.from,
      target: flow.to,
      value: flow.value,
      transferCount: flow.count,
      width: Math.max(2, (flow.value / maxFlowValue) * 8),
      opacity: Math.max(0.3, flow.value / maxFlowValue),
    }));

    const networkStats = {
      totalNodes: nodes.length,
      totalLinks: links.length,
      maxFlow: Math.max(...links.map((l) => l.value)),
      avgFlow: links.reduce((sum, l) => sum + l.value, 0) / links.length,
      hubNodes: nodes.filter((n) => n.type === "hub").length,
      density: (links.length / (nodes.length * (nodes.length - 1))) * 100,
    };

    return { nodes, links, stats: networkStats };
  }, [transfers, maxNodes, minFlowValue]);

  const filteredData = useMemo(() => {
    if (!selectedNode) return { nodes, links };

    const filteredLinks = links.filter((link) => {
      const sourceId =
        typeof link.source === "string" ? link.source : link.source.id;
      const targetId =
        typeof link.target === "string" ? link.target : link.target.id;
      return sourceId === selectedNode || targetId === selectedNode;
    });

    const connectedNodeIds = new Set<string>();
    filteredLinks.forEach((link) => {
      const sourceId =
        typeof link.source === "string" ? link.source : link.source.id;
      const targetId =
        typeof link.target === "string" ? link.target : link.target.id;
      connectedNodeIds.add(sourceId);
      connectedNodeIds.add(targetId);
    });

    const filteredNodes = nodes.filter((node) => connectedNodeIds.has(node.id));

    return { nodes: filteredNodes, links: filteredLinks };
  }, [nodes, links, selectedNode]);

  const applyLayout = useCallback(
    (
      simulation: d3.Simulation<NetworkNode, NetworkLink>,
      width: number,
      height: number
    ) => {
      const centerX = width / 2;
      const centerY = height / 2;

      switch (layoutType) {
        case "circular":
          filteredData.nodes.forEach((node, i) => {
            const angle = (i / filteredData.nodes.length) * 2 * Math.PI;
            const radius = Math.min(width, height) * 0.3;
            node.fx = centerX + Math.cos(angle) * radius;
            node.fy = centerY + Math.sin(angle) * radius;
          });
          break;

        case "hierarchical":
          // Simple hierarchical layout based on node importance
          const sortedNodes = [...filteredData.nodes].sort(
            (a, b) => b.value - a.value
          );
          const levels = 3;
          const nodesPerLevel = Math.ceil(sortedNodes.length / levels);

          sortedNodes.forEach((node, i) => {
            const level = Math.floor(i / nodesPerLevel);
            const positionInLevel = i % nodesPerLevel;
            const levelWidth = width * 0.8;
            const levelSpacing = height / (levels + 1);

            node.fx =
              centerX -
              levelWidth / 2 +
              (positionInLevel * levelWidth) / (nodesPerLevel - 1 || 1);
            node.fy = levelSpacing * (level + 1);
          });
          break;

        default: // force
          filteredData.nodes.forEach((node) => {
            node.fx = null;
            node.fy = null;
          });
          break;
      }
    },
    [layoutType, filteredData.nodes]
  );

  useEffect(() => {
    if (!svgRef.current || filteredData.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth || 800;
    const height = svgRef.current.clientHeight || 600;

    svg.selectAll("*").remove();

    // Create zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
      });

    svg.call(zoom);

    const container = svg.append("g");

    // Create arrow marker
    const defs = container.append("defs");
    defs
      .append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -3 6 6")
      .attr("refX", 12)
      .attr("refY", 0)
      .attr("markerWidth", 4)
      .attr("markerHeight", 4)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-3L6,0L0,3")
      .attr("fill", "#8b9dc3");

    // Create simulation
    const simulation = d3
      .forceSimulation<NetworkNode>(filteredData.nodes)
      .force(
        "link",
        d3
          .forceLink<NetworkNode, NetworkLink>(filteredData.links)
          .id((d) => d.id)
          .distance(80)
          .strength(0.1)
      )
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collision",
        d3.forceCollide<NetworkNode>().radius((d) => d.radius + 5)
      );

    simulationRef.current = simulation;

    // Apply layout
    applyLayout(simulation, width, height);

    // Create links
    const link = container
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(filteredData.links)
      .enter()
      .append("line")
      .attr("stroke", "#00bfff")
      .attr("stroke-width", (d) => d.width)
      .attr("stroke-opacity", (d) => d.opacity)
      .attr("marker-end", "url(#arrowhead)")
      .style("cursor", "pointer");

    // Create nodes
    const node = container
      .append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(filteredData.nodes)
      .enter()
      .append("g")
      .attr("class", "node")
      .style("cursor", "pointer")
      .call(
        d3
          .drag<SVGGElement, NetworkNode>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            if (layoutType === "force") {
              d.fx = null;
              d.fy = null;
            }
          })
      );

    // Add circles to nodes
    node
      .append("circle")
      .attr("r", (d) => d.radius)
      .attr("fill", (d) => d.color)
      .attr("stroke", (d) =>
        selectedNode === d.id ? "#ffffff" : "rgba(255,255,255,0.3)"
      )
      .attr("stroke-width", (d) => (selectedNode === d.id ? 3 : 1.5))
      .on("click", (event, d) => {
        setSelectedNode(selectedNode === d.id ? null : d.id);
      })
      .on("mouseover", function (event, d) {
        d3.select(this).attr("stroke", "#ffffff").attr("stroke-width", 2);

        // Show tooltip
        const tooltip = container
          .append("g")
          .attr("class", "tooltip")
          .attr(
            "transform",
            `translate(${d.x! + d.radius + 10}, ${d.y! - 20})`
          );

        const rect = tooltip
          .append("rect")
          .attr("fill", "rgba(15, 20, 25, 0.95)")
          .attr("stroke", "rgba(0, 191, 255, 0.3)")
          .attr("rx", 4)
          .attr("ry", 4);

        const text = tooltip
          .append("text")
          .attr("fill", "#ffffff")
          .attr("font-size", "12px")
          .attr("x", 8)
          .attr("y", 16);

        text.append("tspan").text(`${d.label}`);
        text
          .append("tspan")
          .attr("x", 8)
          .attr("dy", 14)
          .text(`Volume: ${formatPyusdValue(d.value)}`);
        text
          .append("tspan")
          .attr("x", 8)
          .attr("dy", 14)
          .text(`Connections: ${d.connections}`);
        text
          .append("tspan")
          .attr("x", 8)
          .attr("dy", 14)
          .text(`Type: ${d.type}`);

        const bbox = text.node()?.getBBox();
        if (bbox) {
          rect.attr("width", bbox.width + 16).attr("height", bbox.height + 16);
        }
      })
      .on("mouseout", function (event, d) {
        d3.select(this)
          .attr(
            "stroke",
            selectedNode === d.id ? "#ffffff" : "rgba(255,255,255,0.3)"
          )
          .attr("stroke-width", selectedNode === d.id ? 3 : 1.5);

        container.select(".tooltip").remove();
      });

    // Add labels to nodes
    node
      .append("text")
      .text((d) => d.label)
      .attr("font-size", "10px")
      .attr("fill", "#ffffff")
      .attr("text-anchor", "middle")
      .attr("dy", (d) => d.radius + 15)
      .style("pointer-events", "none");

    // Update positions on tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as NetworkNode).x || 0)
        .attr("y1", (d) => (d.source as NetworkNode).y || 0)
        .attr("x2", (d) => (d.target as NetworkNode).x || 0)
        .attr("y2", (d) => (d.target as NetworkNode).y || 0);

      node.attr("transform", (d) => `translate(${d.x || 0}, ${d.y || 0})`);
    });

    if (!isSimulationRunning) {
      simulation.stop();
    }

    return () => {
      simulation.stop();
    };
  }, [
    filteredData,
    selectedNode,
    isSimulationRunning,
    layoutType,
    applyLayout,
  ]);

  const toggleSimulation = () => {
    if (simulationRef.current) {
      if (isSimulationRunning) {
        simulationRef.current.stop();
      } else {
        simulationRef.current.restart();
      }
      setIsSimulationRunning(!isSimulationRunning);
    }
  };

  const restartSimulation = () => {
    if (simulationRef.current) {
      simulationRef.current.alpha(1).restart();
      setIsSimulationRunning(true);
    }
  };

  if (!transfers || transfers.length === 0) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
            <div className="w-8 h-8 bg-[#00bfff] rounded-full opacity-50"></div>
          </div>
          <p className="text-[#8b9dc3] text-sm">No transfer data available</p>
        </div>
      </div>
    );
  }

  if (filteredData.nodes.length === 0) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(255,193,7,0.1)] rounded-full flex items-center justify-center">
            <Filter className="h-8 w-8 text-yellow-400" />
          </div>
          <p className="text-[#8b9dc3] text-sm">
            No flows meet the current criteria
          </p>
          <p className="text-[#6b7280] text-xs mt-1">
            Try reducing the minimum flow value or increasing max nodes
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <Badge
          variant="outline"
          className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
        >
          {filteredData.nodes.length} nodes, {filteredData.links.length} flows
        </Badge>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#8b9dc3]">Max Nodes:</span>
            <Dropdown
              value={maxNodes.toString()}
              onValueChange={(value) => setMaxNodes(Number(value))}
              options={[
                { value: "10", label: "10" },
                { value: "15", label: "15" },
                { value: "20", label: "20" },
                { value: "30", label: "30" },
              ]}
              className="min-w-[80px]"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-[#8b9dc3]">Layout:</span>
            <Dropdown
              value={layoutType}
              onValueChange={(value) => setLayoutType(value as any)}
              options={[
                { value: "force", label: "Force" },
                { value: "circular", label: "Circular" },
                { value: "hierarchical", label: "Hierarchical" },
              ]}
              className="min-w-[100px]"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-[#8b9dc3]">Min Value:</span>
            <Dropdown
              value={minFlowValue.toString()}
              onValueChange={(value) => setMinFlowValue(Number(value))}
              options={[
                { value: "0", label: "0" },
                { value: "100", label: "100" },
                { value: "500", label: "500" },
                { value: "1000", label: "1000" },
                { value: "5000", label: "5000" },
              ]}
              className="min-w-[80px]"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={toggleSimulation}
            className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
          >
            {isSimulationRunning ? (
              <Pause className="h-4 w-4 mr-1" />
            ) : (
              <Play className="h-4 w-4 mr-1" />
            )}
            {isSimulationRunning ? "Pause" : "Play"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={restartSimulation}
            className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>

          {selectedNode && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedNode(null)}
              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
            >
              Clear Filter
            </Button>
          )}
        </div>
      </div>

      {/* Network Visualization */}
      <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-4 mb-6 overflow-hidden">
        <svg
          ref={svgRef}
          width="100%"
          height={typeof height === "string" ? height : `${height}px`}
          className="overflow-hidden"
          style={{
            background: "transparent",
            minHeight: "400px",
          }}
        />
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-[rgba(15,20,25,0.8)] rounded-lg border border-[rgba(0,191,255,0.1)]">
            <div className="text-xl font-bold text-[#00bfff] mb-1">
              {stats.totalNodes}
            </div>
            <div className="text-sm text-[#8b9dc3]">Addresses</div>
          </div>
          <div className="text-center p-4 bg-[rgba(15,20,25,0.8)] rounded-lg border border-[rgba(0,191,255,0.1)]">
            <div className="text-xl font-bold text-[#10b981] mb-1">
              {stats.totalLinks}
            </div>
            <div className="text-sm text-[#8b9dc3]">Flows</div>
          </div>
          <div className="text-center p-4 bg-[rgba(15,20,25,0.8)] rounded-lg border border-[rgba(0,191,255,0.1)]">
            <div className="text-xl font-bold text-[#f59e0b] mb-1">
              {stats.hubNodes}
            </div>
            <div className="text-sm text-[#8b9dc3]">Hub Nodes</div>
          </div>
          <div className="text-center p-4 bg-[rgba(15,20,25,0.8)] rounded-lg border border-[rgba(0,191,255,0.1)]">
            <div className="text-xl font-bold text-[#8b5cf6] mb-1">
              {stats.density.toFixed(1)}%
            </div>
            <div className="text-sm text-[#8b9dc3]">Density</div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-4">
        <h4 className="text-sm font-medium text-[#00bfff] mb-3">Legend</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#ef4444]"></div>
            <span className="text-[#8b9dc3]">Senders</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#10b981]"></div>
            <span className="text-[#8b9dc3]">Receivers</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#8b5cf6]"></div>
            <span className="text-[#8b9dc3]">Both</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#f59e0b]"></div>
            <span className="text-[#8b9dc3]">Hubs</span>
          </div>
        </div>
        <div className="text-xs text-[#6b7280] mt-3 space-y-1">
          <p>
            • <strong>Drag</strong> nodes to reposition • <strong>Click</strong>{" "}
            to filter connections
          </p>
          <p>
            • <strong>Zoom/Pan</strong> to explore • Node size = volume +
            connections
          </p>
        </div>
      </div>
    </div>
  );
}
