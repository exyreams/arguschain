import React, { useMemo } from "react";
import {
  formatValuePyusd,
  shortenAddress,
} from "@/lib/tracetransaction/functionDecoder";
import type { TokenTransfer } from "@/lib/tracetransaction/types";

interface TokenFlowGraphProps {
  transfers: TokenTransfer[];
  className?: string;
}

interface SankeyNode {
  name: string;
  address: string;
}

interface SankeyLink {
  source: number;
  target: number;
  value: number;
  formattedValue: string;
}

interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

export function TokenFlowGraph({
  transfers,
  className = "",
}: TokenFlowGraphProps) {
  const sankeyData = useMemo((): SankeyData => {
    if (!transfers || transfers.length === 0) {
      return { nodes: [], links: [] };
    }

    const transferMap = new Map<string, { amount: number; count: number }>();
    const addressSet = new Set<string>();

    transfers.forEach((transfer) => {
      const key = `${transfer.from}:${transfer.to}`;
      const existing = transferMap.get(key);
      const transferAmount = Number(transfer.amount) || 0;

      if (existing) {
        existing.amount += transferAmount;
        existing.count += 1;
      } else {
        transferMap.set(key, { amount: transferAmount, count: 1 });
      }

      addressSet.add(transfer.from);
      addressSet.add(transfer.to);
    });

    const addresses = Array.from(addressSet);
    const nodes: SankeyNode[] = addresses.map((address) => ({
      name: shortenAddress(address),
      address,
    }));

    const links: SankeyLink[] = [];
    transferMap.forEach(({ amount }, key) => {
      const [from, to] = key.split(":");
      const sourceIndex = addresses.indexOf(from);
      const targetIndex = addresses.indexOf(to);

      if (sourceIndex !== -1 && targetIndex !== -1) {
        const validAmount = Number(amount) || 0;
        links.push({
          source: sourceIndex,
          target: targetIndex,
          value: validAmount,
          formattedValue: formatValuePyusd(validAmount),
        });
      }
    });

    return { nodes, links };
  }, [transfers]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;

      if (data.source !== undefined && data.target !== undefined) {
        const sourceNode = sankeyData.nodes[data.source];
        const targetNode = sankeyData.nodes[data.target];

        return (
          <div className="bg-[rgba(25,28,40,0.95)] border border-[rgba(0,191,255,0.3)] rounded-lg p-3 shadow-lg">
            <div className="text-[#00bfff] font-semibold mb-2">
              PYUSD Transfer
            </div>
            <div className="text-sm text-[#8b9dc3] space-y-1">
              <div>
                From:{" "}
                <span className="font-mono text-[#00bfff]">
                  {sourceNode.address}
                </span>
              </div>
              <div>
                To:{" "}
                <span className="font-mono text-[#00bfff]">
                  {targetNode.address}
                </span>
              </div>
              <div>
                Amount:{" "}
                <span className="text-[#00bfff]">{data.formattedValue}</span>
              </div>
            </div>
          </div>
        );
      } else {
        return (
          <div className="bg-[rgba(25,28,40,0.95)] border border-[rgba(0,191,255,0.3)] rounded-lg p-3 shadow-lg">
            <div className="text-[#00bfff] font-semibold mb-2">Address</div>
            <div className="text-sm text-[#8b9dc3]">
              <div className="font-mono text-[#00bfff]">{data.address}</div>
            </div>
          </div>
        );
      }
    }
    return null;
  };

  if (sankeyData.nodes.length === 0 || sankeyData.links.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <div className="text-[#8b9dc3] mb-2">No token transfers found</div>
          <div className="text-sm text-[#6b7280]">
            PYUSD token flow visualization will appear here when transfers are
            detected
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full h-96 ${className}`}>
      <div className="mb-4">
        <h4 className="text-sm font-medium text-[#00bfff] mb-2">
          PYUSD Token Flow
        </h4>
        <div className="text-xs text-[#8b9dc3]">
          Visualization of token transfers between addresses
        </div>
      </div>

      <div className="h-full bg-[rgba(25,28,40,0.3)] rounded-lg p-4 overflow-auto">
        <div className="space-y-3">
          {sankeyData.links.map((link, index) => {
            const sourceNode = sankeyData.nodes[link.source];
            const targetNode = sankeyData.nodes[link.target];

            return (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-[rgba(0,191,255,0.05)] border border-[rgba(0,191,255,0.1)] rounded-lg hover:bg-[rgba(0,191,255,0.1)] transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#00bfff]" />
                    <span className="font-mono text-sm text-[#00bfff]">
                      {sourceNode.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[#8b9dc3]">
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-[#00bfff]">
                      {targetNode.name}
                    </span>
                    <div className="w-3 h-3 rounded-full bg-[#00bfff]" />
                  </div>
                </div>

                <div className="text-sm font-medium text-[#00bfff] bg-[rgba(0,191,255,0.1)] px-3 py-1 rounded">
                  {link.formattedValue}
                </div>
              </div>
            );
          })}
        </div>

        {sankeyData.links.length > 5 && (
          <div className="mt-4 text-center">
            <div className="text-xs text-[#8b9dc3]">
              Showing {sankeyData.links.length} token transfers
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
        <div className="text-center">
          <div className="text-[#00bfff] font-semibold">
            {sankeyData.nodes.length}
          </div>
          <div className="text-[#8b9dc3]">Unique Addresses</div>
        </div>
        <div className="text-center">
          <div className="text-[#00bfff] font-semibold">
            {sankeyData.links.length}
          </div>
          <div className="text-[#8b9dc3]">Total Transfers</div>
        </div>
      </div>
    </div>
  );
}
