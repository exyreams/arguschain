import { useMemo } from "react";
import { ValueTransferData } from "@/lib/debugtrace/types";
import { shortenAddress } from "@/lib/config";
import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";

interface ValueTransferFlowProps {
  data: ValueTransferData[];
  height?: number;
  className?: string;
}

interface FlowNode {
  address: string;
  totalSent: number;
  totalReceived: number;
  netFlow: number;
  transfers: ValueTransferData[];
}

export function ValueTransferFlow({
  data,
  height = 300,
  className = "",
}: ValueTransferFlowProps) {
  const { nodes, maxTransfer, totalValue } = useMemo(() => {
    if (!data || data.length === 0) {
      return { nodes: [], maxTransfer: 0, totalValue: 0 };
    }

    const nodeMap = new Map<string, FlowNode>();
    let maxTransfer = 0;
    let totalValue = 0;

    data.forEach((transfer) => {
      maxTransfer = Math.max(maxTransfer, transfer.value);
      totalValue += transfer.value;

      if (!nodeMap.has(transfer.from)) {
        nodeMap.set(transfer.from, {
          address: transfer.from,
          totalSent: 0,
          totalReceived: 0,
          netFlow: 0,
          transfers: [],
        });
      }

      if (!nodeMap.has(transfer.to)) {
        nodeMap.set(transfer.to, {
          address: transfer.to,
          totalSent: 0,
          totalReceived: 0,
          netFlow: 0,
          transfers: [],
        });
      }

      const sender = nodeMap.get(transfer.from)!;
      sender.totalSent += transfer.value;
      sender.netFlow -= transfer.value;
      sender.transfers.push(transfer);

      const receiver = nodeMap.get(transfer.to)!;
      receiver.totalReceived += transfer.value;
      receiver.netFlow += transfer.value;
      receiver.transfers.push(transfer);
    });

    return {
      nodes: Array.from(nodeMap.values()).sort(
        (a, b) => Math.abs(b.netFlow) - Math.abs(a.netFlow),
      ),
      maxTransfer,
      totalValue,
    };
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-[rgba(0,191,255,0.1)] rounded-full flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-[rgba(0,191,255,0.3)] border-t-[#00bfff] rounded-full animate-spin" />
          </div>
          <p className="text-[#8b9dc3] text-sm">
            No value transfer data available
          </p>
        </div>
      </div>
    );
  }

  const getArrowWidth = (value: number) => {
    const minWidth = 2;
    const maxWidth = 8;
    const ratio = value / maxTransfer;
    return Math.max(minWidth, ratio * maxWidth);
  };

  const getTransferColor = (transfer: ValueTransferData) => {
    if (!transfer.success) return "#ef4444";
    if (transfer.value > maxTransfer * 0.5) return "#00bfff";
    if (transfer.value > maxTransfer * 0.2) return "#10b981";
    return "#8b9dc3";
  };

  return (
    <div className={className}>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-lg font-bold text-[#00bfff]">{data.length}</div>
          <div className="text-sm text-[#8b9dc3]">Transfers</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-[#10b981]">
            {totalValue.toFixed(4)} ETH
          </div>
          <div className="text-sm text-[#8b9dc3]">Total Value</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-[#00bfff]">
            {maxTransfer.toFixed(4)} ETH
          </div>
          <div className="text-sm text-[#8b9dc3]">Largest Transfer</div>
        </div>
      </div>

      <div
        className="bg-[rgba(15,20,25,0.6)] rounded-lg p-4 overflow-auto border border-[rgba(0,191,255,0.2)]"
        style={{ height: height - 100 }}
      >
        <div className="space-y-4">
          {nodes.map((node) => (
            <div key={node.address} className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-[rgba(25,28,40,0.8)] rounded-lg border border-[rgba(0,191,255,0.2)]">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-mono text-[#00bfff]">
                    {shortenAddress(node.address)}
                  </div>
                  <div
                    className={`flex items-center gap-1 text-sm ${
                      node.netFlow > 0
                        ? "text-[#10b981]"
                        : node.netFlow < 0
                          ? "text-[#ef4444]"
                          : "text-[#8b9dc3]"
                    }`}
                  >
                    {node.netFlow > 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : node.netFlow < 0 ? (
                      <TrendingDown className="h-4 w-4" />
                    ) : null}
                    <span>Net: {node.netFlow.toFixed(4)} ETH</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-[#8b9dc3]">
                  <span>
                    Sent:{" "}
                    <span className="text-[#ef4444]">
                      {node.totalSent.toFixed(4)} ETH
                    </span>
                  </span>
                  <span>
                    Received:{" "}
                    <span className="text-[#10b981]">
                      {node.totalReceived.toFixed(4)} ETH
                    </span>
                  </span>
                </div>
              </div>

              {node.transfers
                .filter((t) => t.from === node.address)
                .sort((a, b) => b.value - a.value)
                .map((transfer, transferIndex) => (
                  <div
                    key={`${transfer.from}-${transfer.to}-${transferIndex}`}
                    className="ml-6"
                  >
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-[rgba(25,28,40,0.4)] hover:bg-[rgba(25,28,40,0.6)] transition-colors">
                      <div className="flex items-center gap-2 flex-1">
                        <div className="text-sm font-mono text-[#8b9dc3]">
                          {shortenAddress(transfer.from)}
                        </div>
                        <div className="flex items-center gap-1">
                          <div
                            className="h-0.5 bg-current transition-all duration-300"
                            style={{
                              width: `${Math.max(20, getArrowWidth(transfer.value) * 4)}px`,
                              color: getTransferColor(transfer),
                            }}
                          />
                          <ArrowRight
                            className="h-4 w-4"
                            style={{ color: getTransferColor(transfer) }}
                          />
                        </div>
                        <div className="text-sm font-mono text-[#8b9dc3]">
                          {shortenAddress(transfer.to)}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-[#10b981] font-medium">
                          {transfer.value.toFixed(6)} ETH
                        </span>
                        <span className="text-[#8b9dc3]">
                          Gas: {transfer.gasUsed.toLocaleString()}
                        </span>
                        <div
                          className={`w-2 h-2 rounded-full ${
                            transfer.success ? "bg-[#10b981]" : "bg-[#ef4444]"
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[rgba(15,20,25,0.6)] rounded-lg p-3">
          <h5 className="text-sm font-medium text-[#8b9dc3] mb-2">
            Largest Transfers
          </h5>
          <div className="space-y-2">
            {data
              .sort((a, b) => b.value - a.value)
              .slice(0, 3)
              .map((transfer, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[#00bfff] font-bold">
                      #{index + 1}
                    </span>
                    <span className="text-[#8b9dc3] font-mono">
                      {shortenAddress(transfer.from)} →{" "}
                      {shortenAddress(transfer.to)}
                    </span>
                  </div>
                  <span className="text-[#10b981] font-medium">
                    {transfer.value.toFixed(4)} ETH
                  </span>
                </div>
              ))}
          </div>
        </div>

        <div className="bg-[rgba(15,20,25,0.6)] rounded-lg p-3">
          <h5 className="text-sm font-medium text-[#8b9dc3] mb-2">
            Flow Statistics
          </h5>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#8b9dc3]">Average Transfer:</span>
              <span className="text-[#00bfff]">
                {(totalValue / data.length).toFixed(4)} ETH
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8b9dc3]">Success Rate:</span>
              <span className="text-[#10b981]">
                {(
                  (data.filter((t) => t.success).length / data.length) *
                  100
                ).toFixed(1)}
                %
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8b9dc3]">Unique Addresses:</span>
              <span className="text-[#00bfff]">{nodes.length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-center">
        <div className="bg-[rgba(15,20,25,0.6)] rounded-lg p-3">
          <div className="flex items-center gap-6 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-[#00bfff]"></div>
              <span className="text-[#8b9dc3]">Large Transfer</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-[#10b981]"></div>
              <span className="text-[#8b9dc3]">Medium Transfer</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-[#8b9dc3]"></div>
              <span className="text-[#8b9dc3]">Small Transfer</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#10b981] rounded-full"></div>
              <span className="text-[#8b9dc3]">Success</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#ef4444] rounded-full"></div>
              <span className="text-[#8b9dc3]">Failed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
