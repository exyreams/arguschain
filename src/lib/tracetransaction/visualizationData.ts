import { VISUALIZATION_COLORS } from "./constants";
import { shortenAddress } from "./functionDecoder";
import type {
  CallEdge,
  CallGraphData,
  CallNode,
  ContractInteraction,
  FlowEdge,
  FlowGraphData,
  FlowNode,
  NetworkEdge,
  NetworkGraphData,
  NetworkNode,
  ProcessedTraceAction,
  TokenTransfer,
} from "./types";

export function createContractInteractionGraphData(
  interactions: ContractInteraction[],
): NetworkGraphData | null {
  if (!interactions || interactions.length === 0) {
    return null;
  }

  const nodes: NetworkNode[] = [];
  const edges: NetworkEdge[] = [];
  const nodeMap = new Map<string, NetworkNode>();

  for (const interaction of interactions) {
    if (!nodeMap.has(interaction.from)) {
      const node: NetworkNode = {
        id: interaction.from,
        label: shortenAddress(interaction.from),
        address: interaction.from,
        nodeType: "external",
        size: 20,
        color: VISUALIZATION_COLORS.external_contract,
        isPyusd: false,
        contractName: "External Contract",
      };
      nodeMap.set(interaction.from, node);
      nodes.push(node);
    }

    if (!nodeMap.has(interaction.to)) {
      const node: NetworkNode = {
        id: interaction.to,
        label: shortenAddress(interaction.to),
        address: interaction.to,
        nodeType: "external",
        size: 20,
        color: VISUALIZATION_COLORS.external_contract,
        isPyusd: false,
        contractName: "External Contract",
      };
      nodeMap.set(interaction.to, node);
      nodes.push(node);
    }

    edges.push({
      source: interaction.from,
      target: interaction.to,
      weight: interaction.gas,
      callCount: interaction.count,
      gasUsed: interaction.gas,
      edgeType: "call",
      color: VISUALIZATION_COLORS.call_edge,
    });
  }

  const maxGas = Math.max(...edges.map((e) => e.gasUsed), 1);
  for (const node of nodes) {
    const totalGas = edges
      .filter((e) => e.source === node.id || e.target === node.id)
      .reduce((sum, e) => sum + e.gasUsed, 0);
    node.size = Math.max(15, Math.min(40, 15 + (totalGas / maxGas) * 25));
  }

  return {
    nodes,
    edges,
    layout: {
      algorithm: "spring",
      parameters: { k: 1.0, iterations: 50 },
    },
    interactionMetrics: {
      totalInteractions: interactions.length,
      uniqueContracts: nodes.length,
      pyusdInteractions: nodes.filter((n) => n.isPyusd).length,
      externalInteractions: nodes.filter((n) => !n.isPyusd).length,
    },
  };
}

export function createCallGraphData(
  traces: ProcessedTraceAction[],
): CallGraphData | null {
  if (!traces || traces.length === 0) {
    return null;
  }

  const nodes: CallNode[] = [];
  const edges: CallEdge[] = [];
  const nodeMap = new Map<string, CallNode>();

  for (const trace of traces) {
    const nodeId = `node_${trace.traceAddress.join("_") || "root"}`;

    const node: CallNode = {
      id: nodeId,
      traceAddress: trace.traceAddress,
      depth: trace.depth,
      function: trace.function,
      gasUsed: trace.gasUsed,
      isPyusd: trace.isPyusd,
      hasError: !!trace.error,
      nodeSize: Math.max(15, Math.min(40, 15 + trace.gasUsed / 50000)),
      nodeColor: trace.error
        ? VISUALIZATION_COLORS.error
        : trace.isPyusd
          ? VISUALIZATION_COLORS.pyusd_token
          : VISUALIZATION_COLORS.external_contract,
      type: trace.type,
      from: trace.from,
      to: trace.to,
      value_eth: trace.valueEth,
      is_pyusd: trace.isPyusd,
      contract: trace.contract,
      function_category: trace.category,
      error: trace.error,
      input_preview: trace.inputPreview,
      output_preview: trace.outputPreview,
    };

    nodeMap.set(nodeId, node);
    nodes.push(node);
  }

  for (const trace of traces) {
    if (trace.traceAddress.length > 0) {
      const parentTraceAddr = trace.traceAddress.slice(0, -1);
      const parentNodeId = `node_${parentTraceAddr.join("_") || "root"}`;
      const currentNodeId = `node_${trace.traceAddress.join("_")}`;

      if (nodeMap.has(parentNodeId) && nodeMap.has(currentNodeId)) {
        edges.push({
          source: parentNodeId,
          target: currentNodeId,
          callType: trace.type,
          gasUsed: trace.gasUsed,
          success: !trace.error,
        });
      }
    }
  }

  const maxDepth = Math.max(...traces.map((t) => t.depth), 0);
  const gasPerDepth: Record<number, number> = {};
  const callsPerDepth: Record<number, number> = {};

  for (const trace of traces) {
    gasPerDepth[trace.depth] = (gasPerDepth[trace.depth] || 0) + trace.gasUsed;
    callsPerDepth[trace.depth] = (callsPerDepth[trace.depth] || 0) + 1;
  }

  return {
    nodes,
    edges,
    hierarchy: {
      root: nodes[0],
      maxDepth,
      totalNodes: nodes.length,
    },
    depthMetrics: {
      maxDepth,
      gasPerDepth,
      callsPerDepth,
    },
  };
}

export function createFlowGraphData(
  transfers: TokenTransfer[],
): FlowGraphData | null {
  if (!transfers || transfers.length === 0) {
    return null;
  }

  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];
  const nodeMap = new Map<string, FlowNode>();
  const transferTotals = new Map<string, { amount: number; count: number }>();

  for (const transfer of transfers) {
    const key = `${transfer.from.toLowerCase()}:${transfer.to.toLowerCase()}`;
    if (transferTotals.has(key)) {
      const existing = transferTotals.get(key)!;
      existing.amount += transfer.amount;
      existing.count += 1;
    } else {
      transferTotals.set(key, { amount: transfer.amount, count: 1 });
    }
  }

  const uniqueAddresses = new Set<string>();
  for (const transfer of transfers) {
    uniqueAddresses.add(transfer.from);
    uniqueAddresses.add(transfer.to);
  }

  for (const address of uniqueAddresses) {
    if (!nodeMap.has(address)) {
      const node: FlowNode = {
        id: address,
        address,
        label: shortenAddress(address),
        size: 25,
        color: VISUALIZATION_COLORS.pyusd_token,
      };
      nodeMap.set(address, node);
      nodes.push(node);
    }
  }

  for (const [key, data] of transferTotals.entries()) {
    const [from, to] = key.split(":");
    const formattedAmount = `${(data.amount / 10 ** 6).toFixed(6)} PYUSD`;

    edges.push({
      source: from,
      target: to,
      amount: data.amount,
      label: formattedAmount,
      color: VISUALIZATION_COLORS.transfer_edge,
      weight: Math.log10(data.amount + 1),
    });
  }

  const totalAmount = transfers.reduce((sum, t) => sum + t.value, 0);
  const averageTransferSize =
    transfers.length > 0 ? totalAmount / transfers.length : 0;

  return {
    transfers,
    aggregatedFlows: Array.from(transferTotals.entries()).map(([key, data]) => {
      const [from, to] = key.split(":");
      return {
        from,
        to,
        totalAmount: data.amount,
        transferCount: data.count,
        formattedAmount: `${(data.amount / 10 ** 6).toFixed(6)} PYUSD`,
      };
    }),
    flowMetrics: {
      totalTransfers: transfers.length,
      totalAmount,
      uniqueAddresses: uniqueAddresses.size,
      averageTransferSize,
    },
    visualizationData: {
      nodes,
      edges,
    },
  };
}

export function generatePlotlyContractNetwork(graphData: NetworkGraphData) {
  const nodeTrace = {
    x: graphData.nodes.map((_, i) =>
      Math.cos((i * 2 * Math.PI) / graphData.nodes.length),
    ),
    y: graphData.nodes.map((_, i) =>
      Math.sin((i * 2 * Math.PI) / graphData.nodes.length),
    ),
    mode: "markers+text",
    type: "scatter",
    text: graphData.nodes.map((n) => n.label),
    textposition: "bottom center",
    hovertext: graphData.nodes.map(
      (n) =>
        `<b>${n.contractName}</b><br>Address: ${n.address}<br>Type: ${n.nodeType}`,
    ),
    marker: {
      size: graphData.nodes.map((n) => n.size),
      color: graphData.nodes.map((n) => n.color),
      line: { width: 1, color: "#000" },
    },
  };

  const edgeTraces = graphData.edges.map((edge) => ({
    x: [
      graphData.nodes.find((n) => n.id === edge.source)?.size || 0,
      graphData.nodes.find((n) => n.id === edge.target)?.size || 0,
      null,
    ],
    y: [
      graphData.nodes.find((n) => n.id === edge.source)?.size || 0,
      graphData.nodes.find((n) => n.id === edge.target)?.size || 0,
      null,
    ],
    mode: "lines",
    type: "scatter",
    line: { width: 2, color: edge.color },
    hoverinfo: "none",
  }));

  return {
    data: [nodeTrace, ...edgeTraces],
    layout: {
      title: "Contract Interaction Network",
      showlegend: false,
      hovermode: "closest",
      xaxis: { showgrid: false, zeroline: false, showticklabels: false },
      yaxis: { showgrid: false, zeroline: false, showticklabels: false },
      plot_bgcolor: "rgba(0,0,0,0)",
      paper_bgcolor: "rgba(0,0,0,0)",
    },
  };
}

export function generatePlotlyCallGraph(graphData: CallGraphData) {
  const nodePositions = new Map<string, { x: number; y: number }>();
  const depthCounts = new Map<number, number>();

  for (const node of graphData.nodes) {
    depthCounts.set(node.depth, (depthCounts.get(node.depth) || 0) + 1);
  }

  const depthCounters = new Map<number, number>();
  for (const node of graphData.nodes) {
    const depth = node.depth;
    const countAtDepth = depthCounts.get(depth) || 1;
    const indexAtDepth = depthCounters.get(depth) || 0;

    const x = (indexAtDepth - (countAtDepth - 1) / 2) * 2;
    const y = -depth * 2;

    nodePositions.set(node.id, { x, y });
    depthCounters.set(depth, indexAtDepth + 1);
  }

  const nodeTrace = {
    x: graphData.nodes.map((n) => nodePositions.get(n.id)?.x || 0),
    y: graphData.nodes.map((n) => nodePositions.get(n.id)?.y || 0),
    mode: "markers+text",
    type: "scatter",
    text: graphData.nodes.map((n) => n.function.split("(")[0].slice(0, 10)),
    textposition: "top center",
    hovertext: graphData.nodes.map(
      (n) =>
        `<b>${n.type} Call</b><br>Function: ${n.function}<br>Gas: ${n.gasUsed.toLocaleString()}<br>Depth: ${n.depth}`,
    ),
    marker: {
      size: graphData.nodes.map((n) => n.nodeSize),
      color: graphData.nodes.map((n) => n.nodeColor),
      line: { width: 1, color: "#000" },
    },
  };

  const edgeTraces = graphData.edges.map((edge) => {
    const sourcePos = nodePositions.get(edge.source);
    const targetPos = nodePositions.get(edge.target);

    return {
      x: [sourcePos?.x || 0, targetPos?.x || 0, null],
      y: [sourcePos?.y || 0, targetPos?.y || 0, null],
      mode: "lines",
      type: "scatter",
      line: {
        width: edge.success ? 2 : 1,
        color: edge.success ? "#666" : "#f00",
        dash: edge.success ? "solid" : "dash",
      },
      hoverinfo: "none",
    };
  });

  return {
    data: [nodeTrace, ...edgeTraces],
    layout: {
      title: "Call Hierarchy Graph",
      showlegend: false,
      hovermode: "closest",
      xaxis: { showgrid: false, zeroline: false, showticklabels: false },
      yaxis: { showgrid: false, zeroline: false, showticklabels: false },
      plot_bgcolor: "rgba(0,0,0,0)",
      paper_bgcolor: "rgba(0,0,0,0)",
    },
  };
}

export function generatePlotlyTokenFlow(flowData: FlowGraphData) {
  const nodes = flowData.visualizationData.nodes;
  const edges = flowData.visualizationData.edges;

  const nodePositions = new Map<string, { x: number; y: number }>();
  nodes.forEach((node, i) => {
    const angle = (i * 2 * Math.PI) / nodes.length;
    nodePositions.set(node.id, {
      x: Math.cos(angle) * 2,
      y: Math.sin(angle) * 2,
    });
  });

  const nodeTrace = {
    x: nodes.map((n) => nodePositions.get(n.id)?.x || 0),
    y: nodes.map((n) => nodePositions.get(n.id)?.y || 0),
    mode: "markers+text",
    type: "scatter",
    text: nodes.map((n) => n.label),
    textposition: "bottom center",
    hovertext: nodes.map((n) => `<b>Address:</b> ${n.address}`),
    marker: {
      size: nodes.map((n) => n.size),
      color: nodes.map((n) => n.color),
      line: { width: 1, color: "#000" },
    },
  };

  const edgeTraces = edges.map((edge) => {
    const sourcePos = nodePositions.get(edge.source);
    const targetPos = nodePositions.get(edge.target);

    return {
      x: [sourcePos?.x || 0, targetPos?.x || 0, null],
      y: [sourcePos?.y || 0, targetPos?.y || 0, null],
      mode: "lines",
      type: "scatter",
      line: { width: Math.max(1, edge.weight), color: edge.color },
      hovertext: `Transfer: ${edge.label}`,
      hoverinfo: "text",
    };
  });

  return {
    data: [nodeTrace, ...edgeTraces],
    layout: {
      title: "PYUSD Token Flow",
      showlegend: false,
      hovermode: "closest",
      xaxis: { showgrid: false, zeroline: false, showticklabels: false },
      yaxis: { showgrid: false, zeroline: false, showticklabels: false },
      plot_bgcolor: "rgba(0,0,0,0)",
      paper_bgcolor: "rgba(0,0,0,0)",
    },
  };
}
