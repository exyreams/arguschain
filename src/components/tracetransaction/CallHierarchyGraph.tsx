import React, { useMemo } from "react";
import { ResponsiveContainer, Tooltip, Treemap } from "recharts";
import { VISUALIZATION_COLORS } from "@/lib/tracetransaction/constants";
import { shortenAddress } from "@/lib/tracetransaction/functionDecoder";
import type { ProcessedTraceAction } from "@/lib/tracetransaction/types";

interface CallHierarchyGraphProps {
  traces: ProcessedTraceAction[];
  className?: string;
}

interface TreemapNode {
  name: string;
  size: number;
  depth: number;
  function: string;
  gasUsed: number;
  isPyusd: boolean;
  hasError: boolean;
  from: string;
  to: string;
  color: string;
  children?: TreemapNode[];
}

export function CallHierarchyGraph({
  traces,
  className = "",
}: CallHierarchyGraphProps) {
  const treeData = useMemo(() => {
    if (!traces || traces.length === 0) {
      return [];
    }

    const rootNodes: TreemapNode[] = [];
    const nodeMap = new Map<string, TreemapNode>();

    const sortedTraces = [...traces].sort((a, b) => {
      if (a.depth !== b.depth) return a.depth - b.depth;
      return a.traceAddress.join(",").localeCompare(b.traceAddress.join(","));
    });

    sortedTraces.forEach((trace, index) => {
      const nodeId = trace.traceAddress.join("_") || `root_${index}`;
      const functionName =
        trace.function !== "N/A" ? trace.function.split("(")[0] : trace.type;

      const gasUsed = Number(trace.gasUsed) || 0;
      const validGasUsed = isNaN(gasUsed) ? 1 : Math.max(1, gasUsed);

      const node: TreemapNode = {
        name: `${functionName} (${shortenAddress(trace.to)})`,
        size: validGasUsed,
        depth: trace.depth || 0,
        function: functionName || "Unknown",
        gasUsed: validGasUsed,
        isPyusd: !!trace.isPyusd,
        hasError: !!trace.error,
        from: trace.from || "",
        to: trace.to || "",
        color: trace.error
          ? VISUALIZATION_COLORS.error
          : trace.isPyusd
            ? VISUALIZATION_COLORS.pyusd_token
            : VISUALIZATION_COLORS.external_contract,
        children: [],
      };

      nodeMap.set(nodeId, node);

      if (trace.traceAddress.length === 0) {
        rootNodes.push(node);
      } else {
        const parentTraceAddr = trace.traceAddress.slice(0, -1);
        const parentId = parentTraceAddr.join("_") || "root";
        const parent = nodeMap.get(parentId);

        if (parent) {
          if (!parent.children) parent.children = [];
          parent.children.push(node);
        } else {
          rootNodes.push(node);
        }
      }
    });

    return rootNodes;
  }, [traces]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length && payload[0]?.payload) {
      const data = payload[0].payload;

      if (!data) return null;

      return (
        <div className="bg-[rgba(25,28,40,0.95)] border border-[rgba(0,191,255,0.3)] rounded-lg p-3 shadow-lg">
          <div className="text-[#00bfff] font-semibold mb-2">
            {data.function || "Unknown Function"}
          </div>
          <div className="text-sm text-[#8b9dc3] space-y-1">
            <div>
              From:{" "}
              <span className="font-mono text-[#00bfff]">
                {shortenAddress(data.from || "")}
              </span>
            </div>
            <div>
              To:{" "}
              <span className="font-mono text-[#00bfff]">
                {shortenAddress(data.to || "")}
              </span>
            </div>
            <div>
              Gas Used:{" "}
              <span className="text-[#00bfff]">
                {(data.gasUsed || 0).toLocaleString()}
              </span>
            </div>
            <div>
              Depth: <span className="text-[#00bfff]">{data.depth || 0}</span>
            </div>
            <div>
              Type:{" "}
              <span className="text-[#00bfff]">
                {data.isPyusd ? "PYUSD" : "External"}
              </span>
            </div>
            {data.hasError && (
              <div className="text-red-400">⚠️ Error occurred</div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomContent = (props: any) => {
    const { x, y, width, height, payload } = props;

    if (
      !payload ||
      width < 20 ||
      height < 20 ||
      isNaN(width) ||
      isNaN(height) ||
      isNaN(x) ||
      isNaN(y)
    ) {
      return null;
    }

    const validX = Number(x) || 0;
    const validY = Number(y) || 0;
    const validWidth = Number(width) || 0;
    const validHeight = Number(height) || 0;
    const strokeWidth = 1;

    return (
      <g>
        <rect
          x={validX}
          y={validY}
          width={validWidth}
          height={validHeight}
          fill={payload.color || VISUALIZATION_COLORS.external_contract}
          stroke="#000"
          strokeWidth={strokeWidth}
          opacity={0.8}
        />
        {validWidth > 60 && validHeight > 30 && payload.function && (
          <text
            x={validX + validWidth / 2}
            y={validY + validHeight / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={Math.min(12, validWidth / 8, validHeight / 4)}
            fill="#fff"
            fontWeight="bold"
          >
            {payload.function}
          </text>
        )}
        {width > 80 && height > 50 && (
          <text
            x={x + width / 2}
            y={y + height / 2 + 15}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={Math.min(10, width / 10, height / 6)}
            fill="#ccc"
          >
            {payload.gasUsed.toLocaleString()} gas
          </text>
        )}
      </g>
    );
  };

  if (treeData.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <div className="text-[#8b9dc3] mb-2">
            No call hierarchy data found
          </div>
          <div className="text-sm text-[#6b7280]">
            Call hierarchy visualization will appear here when trace data is
            available
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full h-96 ${className}`}>
      <div className="mb-4">
        <h4 className="text-sm font-medium text-[#00bfff] mb-2">
          Call Hierarchy (Gas Usage)
        </h4>
        <div className="text-xs text-[#8b9dc3]">
          Rectangle size represents gas usage. Hover for details.
        </div>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={treeData}
          dataKey="size"
          aspectRatio={4 / 3}
          stroke="#000"
          strokeWidth={1}
          content={<CustomContent />}
        >
          <Tooltip content={<CustomTooltip />} />
        </Treemap>
      </ResponsiveContainer>

      <div className="mt-4 flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded"
            style={{ backgroundColor: VISUALIZATION_COLORS.pyusd_token }}
          />
          <span className="text-[#8b9dc3]">PYUSD Contract</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded"
            style={{ backgroundColor: VISUALIZATION_COLORS.external_contract }}
          />
          <span className="text-[#8b9dc3]">External Contract</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded"
            style={{ backgroundColor: VISUALIZATION_COLORS.error }}
          />
          <span className="text-[#8b9dc3]">Error</span>
        </div>
      </div>
    </div>
  );
}
