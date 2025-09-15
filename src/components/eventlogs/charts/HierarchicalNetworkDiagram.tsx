import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import { Badge, Button } from "@/components/global";
import type { ParsedTransferLog } from "@/lib/eventlogs";
import { formatPyusdValue, shortenAddress } from "@/lib/eventlogs";
import {
  Network,
  Pause,
  Play,
  RotateCcw,
  Target,
  Activity,
  Users,
  Zap,
} from "lucide-react";
import { remove } from "lodash";

interface HierarchicalNetworkDiagramProps {
  transfers: ParsedTransferLog[];
  height?: number;
  className?: string;
}

interface NetworkNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  value: number;
  level: number;
  totalSent: number;
  totalReceived: number;
  connections: number;
  type: "root" | "hub" | "leaf";
  color: string;
  radius: number;
}

interface NetworkLink extends d3.SimulationLinkDatum<NetworkNode> {
  source: NetworkNode | string;
  target: NetworkNode | string;
  value: number;
  width: number;
}

export function HierarchicalNetworkDiagram({
  transfers,
  height = 500,
  className = "",
}: HierarchicalNetworkDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<NetworkNode, NetworkLink> | null>(
    null
  );

  const [isSimulationRunning, setIsSimulationRunning] = useState(true);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [maxNodes, setMaxNodes] = useState(20);
  const [minFlowValue, setMinFlowValue] = useState(1000);

  // Process transfers into hierarchical data
  const hierarchicalData = useMemo(() => {
    if (!transfers || transfers.length === 0) {
      return { nodes: [], links: [] };
    }

    // Calculate address statistics
    const addressStats = new Map<
      string,
      {
        address: string;
        totalVolume: number;
        sent: number;
        received: number;
        connections: Set<string>;
      }
    >();

    transfers.forEach((transfer) => {
      [transfer.from, transfer.to].forEach((address) => {
        if (!addressStats.has(address)) {
          addressStats.set(address, {
            address,
            totalVolume: 0,
            sent: 0,
            received: 0,
            connections: new Set(),
          });
        }
      });

      const fromStats = addressStats.get(transfer.from)!;
      const toStats = addressStats.get(transfer.to)!;

      fromStats.sent += transfer.value_pyusd;
      fromStats.totalVolume += transfer.value_pyusd;
      fromStats.connections.add(transfer.to);

      toStats.received += transfer.value_pyusd;
      toStats.totalVolume += transfer.value_pyusd;
      toStats.connections.add(transfer.from);
    });

    // Sort and select top addresses
    const sortedAddresses = Array.from(addressStats.values())
      .sort((a, b) => {
        const aScore = a.totalVolume + a.connections.size * 50000;
        const bScore = b.totalVolume + b.connections.size * 50000;
        return bScore - aScore;
      })
      .slice(0, maxNodes);

    if (sortedAddresses.length === 0) {
      return { nodes: [], links: [] };
    }

    // Create hierarchical structure with modern styling
    const root = sortedAddresses[0];
    const hubs = sortedAddresses.slice(1, Math.min(7, sortedAddresses.length));
    const leaves = sortedAddresses.slice(7);

    const maxVolume = Math.max(...sortedAddresses.map((a) => a.totalVolume));

    const createNode = (addressData: any, level: number): NetworkNode => {
      const volumeScore = addressData.totalVolume / maxVolume;

      let type: NetworkNode["type"];
      let color: string;
      let radius: number;

      if (level === 0) {
        type = "root";
        color = "#f59e0b";
        radius = Math.max(25, 25 + volumeScore * 20);
      } else if (level === 1) {
        type = "hub";
        color = "#00d4ff";
        radius = Math.max(18, 18 + volumeScore * 15);
      } else {
        type = "leaf";
        color = "#10b981";
        radius = Math.max(12, 12 + volumeScore * 10);
      }

      return {
        id: addressData.address,
        name: shortenAddress(addressData.address),
        value: addressData.totalVolume,
        level,
        totalSent: addressData.sent,
        totalReceived: addressData.received,
        connections: addressData.connections.size,
        type,
        color,
        radius,
      };
    };

    const nodes: NetworkNode[] = [
      createNode(root, 0),
      ...hubs.map((hub) => createNode(hub, 1)),
      ...leaves.map((leaf) => createNode(leaf, 2)),
    ];

    // Create links
    const flowMap = new Map<string, { value: number; count: number }>();

    transfers.forEach((transfer) => {
      const sourceExists = nodes.some((n) => n.id === transfer.from);
      const targetExists = nodes.some((n) => n.id === transfer.to);

      if (
        sourceExists &&
        targetExists &&
        transfer.value_pyusd >= minFlowValue
      ) {
        const key = `${transfer.from}->${transfer.to}`;
        const existing = flowMap.get(key) || { value: 0, count: 0 };
        existing.value += transfer.value_pyusd;
        existing.count += 1;
        flowMap.set(key, existing);
      }
    });

    const maxFlowValue = Math.max(
      ...Array.from(flowMap.values()).map((f) => f.value)
    );

    const links: NetworkLink[] = Array.from(flowMap.entries()).map(
      ([key, flow]) => {
        const [source, target] = key.split("->");
        return {
          source,
          target,
          value: flow.value,
          width: Math.max(2, (flow.value / maxFlowValue) * 8),
        };
      }
    );

    return { nodes, links };
  }, [transfers, maxNodes, minFlowValue]);

  const drag = useCallback(
    (simulation: d3.Simulation<NetworkNode, NetworkLink>) => {
      return d3
        .drag<SVGCircleElement, NetworkNode>()
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
          d.fx = null;
          d.fy = null;
        });
    },
    []
  );

  useEffect(() => {
    if (!svgRef.current || hierarchicalData.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth || 800;
    const svgHeight = svgRef.current.clientHeight || 600;

    svg.selectAll("*").remove();

    // Create zoom
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
      });

    svg.call(zoom);

    const container = svg.append("g");

    // Create simulation
    const simulation = d3
      .forceSimulation<NetworkNode>(hierarchicalData.nodes)
      .force(
        "link",
        d3
          .forceLink<NetworkNode, NetworkLink>(hierarchicalData.links)
          .id((d) => d.id)
          .distance(100)
          .strength(0.2)
      )
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, svgHeight / 2))
      .force(
        "collision",
        d3.forceCollide<NetworkNode>().radius((d) => d.radius + 10)
      )
      .force(
        "y",
        d3
          .forceY<NetworkNode>()
          .y((d) => {
            switch (d.level) {
              case 0:
                return svgHeight * 0.2;
              case 1:
                return svgHeight * 0.5;
              case 2:
                return svgHeight * 0.8;
              default:
                return svgHeight / 2;
            }
          })
          .strength(0.4)
      );

    simulationRef.current = simulation;

    // Create links
    const link = container
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(hierarchicalData.links)
      .enter()
      .append("line")
      .attr("stroke", "#00d4ff")
      .attr("stroke-width", (d) => d.width)
      .attr("stroke-opacity", 0.6);

    // Create nodes
    const node = container
      .append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(hierarchicalData.nodes)
      .enter()
      .append("g")
      .attr("class", "node")
      .style("cursor", "pointer")
      .call(drag(simulation));

    // Add circles
    node
      .append("circle")
      .attr("r", (d) => d.radius)
      .attr("fill", (d) => d.color)
      .attr("stroke", (d) =>
        selectedNode?.id === d.id ? "#ffffff" : "rgba(255,255,255,0.4)"
      )
      .attr("stroke-width", (d) => (selectedNode?.id === d.id ? 4 : 2))
      .on("click", (event, d) => {
        setSelectedNode(selectedNode?.id === d.id ? null : d);
      })
      .on("mouseover", function (event, d) {
        d3.select(this).attr("stroke", "#ffffff").attr("stroke-width", 3);
      })
      .on("mouseout", function (event, d) {
        d3.select(this)
          .attr(
            "stroke",
            selectedNode?.id === d.id ? "#ffffff" : "rgba(255,255,255,0.4)"
          )
          .attr("stroke-width", selectedNode?.id === d.id ? 4 : 2);
      });

    // Add labels
    node
      .append("text")
      .text((d) => d.name)
      .attr("font-size", "11px")
      .attr("font-weight", "600")
      .attr("fill", "#ffffff")
      .attr("text-anchor", "middle")
      .attr("dy", (d) => d.radius + 20)
      .style("pointer-events", "none");

    // Update positions
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
  }, [hierarchicalData, selectedNode, isSimulationRunning, drag]);

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

  // Calculate stats for the summary cards
  const stats = useMemo(() => {
    const totalVolume = hierarchicalData.nodes.reduce(
      (sum, node) => sum + node.value,
      0
    );
    const totalConnections = hierarchicalData.links.length;
    const avgVolume =
      hierarchicalData.nodes.length > 0
        ? totalVolume / hierarchicalData.nodes.length
        : 0;
    const maxVolume = Math.max(
      ...hierarchicalData.nodes.map((n) => n.value),
      0
    );

    return {
      totalVolume,
      totalConnections,
      avgVolume,
      maxVolume,
    };
  }, [hierarchicalData]);

  if (!transfers || transfers.length === 0) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-[#00d4ff]/20 to-[#0099cc]/20 rounded-2xl flex items-center justify-center">
            <Network className="h-10 w-10 text-[#00d4ff]" />
          </div>
          <p className="text-[#8b9dc3] text-lg font-medium">No Network Data</p>
          <p className="text-[#6b7280] text-sm mt-2">
            Transfer data required for network analysis
          </p>
        </div>
      </div>
    );
  }

  if (hierarchicalData.nodes.length === 0) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-2xl flex items-center justify-center">
            <Target className="h-10 w-10 text-yellow-400" />
          </div>
          <p className="text-[#8b9dc3] text-lg font-medium">No Network Flows</p>
          <p className="text-[#6b7280] text-sm mt-2">
            Adjust filters to see network connections
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header - matching the exact style from other charts */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-[#00d4ff] to-[#0099cc] rounded-2xl flex items-center justify-center">
            <Network className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[#00d4ff]">
              Network Hierarchy
            </h3>
            <p className="text-[#8b9dc3] text-sm">
              Interactive blockchain network visualization
            </p>
          </div>
        </div>
        <Badge className="bg-gradient-to-r from-[#00d4ff]/20 to-[#0099cc]/20 text-[#00d4ff] border-[#00d4ff]/30 px-3 py-1">
          {hierarchicalData.nodes.length} nodes
        </Badge>
      </div>

      {/* Controls - matching the style from other charts */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <span className="text-[#8b9dc3] text-sm font-medium">Nodes:</span>
        <select
          value={maxNodes}
          onChange={(e) => setMaxNodes(Number(e.target.value))}
          className="bg-[#1a1f2e] border border-[#00d4ff]/30 rounded-lg px-3 py-2 text-sm text-[#00d4ff] focus:outline-none focus:border-[#00d4ff]"
        >
          <option value={15}>15</option>
          <option value={20}>20</option>
          <option value={25}>25</option>
          <option value={30}>30</option>
        </select>

        <Button
          variant={displayMode === "count" ? "default" : "outline"}
          size="sm"
          onClick={toggleSimulation}
          className={`${
            isSimulationRunning
              ? "bg-[#00d4ff] text-white"
              : "border-[#00d4ff]/30 text-[#8b9dc3] hover:text-[#00d4ff]"
          }`}
        >
          {isSimulationRunning ? (
            <Pause className="h-4 w-4 mr-2" />
          ) : (
            <Play className="h-4 w-4 mr-2" />
          )}
          {isSimulationRunning ? "Pause" : "Play"}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={restartSimulation}
          className="border-[#00d4ff]/30 text-[#8b9dc3] hover:text-[#00d4ff]"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </Button>
      </div>

      {/* Chart Container - matching the exact style */}
      <div className="bg-gradient-to-br from-[#0f1419] to-[#1a1f2e] border border-[#00d4ff]/20 rounded-2xl p-6 mb-6">
        <svg
          ref={svgRef}
          width="100%"
          height={height}
          className="overflow-visible"
          style={{ background: "transparent" }}
        />
      </div>

      {/* Stats Cards - matching the exact style from other charts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-[#0f1419] to-[#1a1f2e] border border-[#00d4ff]/20 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <Activity className="h-5 w-5 text-[#00d4ff]" />
          </div>
          <div className="text-2xl font-bold text-[#00d4ff] mb-1">
            {formatPyusdValue(stats.totalVolume)}
          </div>
          <div className="text-sm text-[#8b9dc3]">Total Volume</div>
        </div>

        <div className="bg-gradient-to-br from-[#0f1419] to-[#1a1f2e] border border-[#10b981]/20 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <Network className="h-5 w-5 text-[#10b981]" />
          </div>
          <div className="text-2xl font-bold text-[#10b981] mb-1">
            {stats.totalConnections}
          </div>
          <div className="text-sm text-[#8b9dc3]">Total Connections</div>
        </div>

        <div className="bg-gradient-to-br from-[#0f1419] to-[#1a1f2e] border border-[#f59e0b]/20 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <Target className="h-5 w-5 text-[#f59e0b]" />
          </div>
          <div className="text-2xl font-bold text-[#f59e0b] mb-1">
            {formatPyusdValue(stats.avgVolume)}
          </div>
          <div className="text-sm text-[#8b9dc3]">Avg Volume</div>
        </div>

        <div className="bg-gradient-to-br from-[#0f1419] to-[#1a1f2e] border border-[#8b5cf6]/20 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <Zap className="h-5 w-5 text-[#8b5cf6]" />
          </div>
          <div className="text-2xl font-bold text-[#8b5cf6] mb-1">
            {formatPyusdValue(stats.maxVolume)}
          </div>
          <div className="text-sm text-[#8b9dc3]">Peak Volume</div>
        </div>
      </div>

      {/* Selected Node Details */}
      {selectedNode && (
        <div className="mt-6 bg-gradient-to-br from-[#0f1419] to-[#1a1f2e] border border-[#00d4ff]/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-6 h-6 rounded-full"
                style={{ backgroundColor: selectedNode.color }}
              ></div>
              <h4 className="text-lg font-bold text-[#00d4ff]">
                {selectedNode.name} ({selectedNode.type})
              </h4>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedNode(null)}
              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
            >
              Close
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#00d4ff]/10 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-[#00d4ff] mb-1">
                {formatPyusdValue(selectedNode.value)}
              </div>
              <div className="text-sm text-[#8b9dc3]">Total Volume</div>
            </div>
            <div className="bg-[#ef4444]/10 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-[#ef4444] mb-1">
                {formatPyusdValue(selectedNode.totalSent)}
              </div>
              <div className="text-sm text-[#8b9dc3]">Sent</div>
            </div>
            <div className="bg-[#10b981]/10 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-[#10b981] mb-1">
                {formatPyusdValue(selectedNode.totalReceived)}
              </div>
              <div className="text-sm text-[#8b9dc3]">Received</div>
            </div>
            <div className="bg-[#f59e0b]/10 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-[#f59e0b] mb-1">
                {selectedNode.connections}
              </div>
              <div className="text-sm text-[#8b9dc3]">Connections</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
