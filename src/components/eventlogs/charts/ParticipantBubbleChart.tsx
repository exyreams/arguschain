import React, { useMemo } from "react";
import {
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import type { LogsAnalysisResults } from "@/lib/eventlogs";
import { formatPyusdValue } from "@/lib/eventlogs";
import { Activity } from "lucide-react";

interface ParticipantBubbleChartProps {
  results: LogsAnalysisResults;
  height?: number | string;
  className?: string;
  hideTitle?: boolean;
}

interface BubbleData {
  address: string;
  address_short: string;
  x: number;
  y: number;
  z: number;
  type: "sender" | "receiver" | "both";
  color: string;
  total_value: number;
  transactions: number;
  percentage: number;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as BubbleData;
    return (
      <div className="bg-[rgba(25,28,40,0.95)] border border-[rgba(0,191,255,0.3)] rounded-lg p-3 shadow-lg">
        <p className="text-[#00bfff] font-medium">{data.address_short}</p>
        <div className="space-y-1 mt-2">
          <p className="text-white text-sm">
            Volume: {formatPyusdValue(data.total_value)} PYUSD
          </p>
          <p className="text-white text-sm">
            Transactions: {data.transactions.toLocaleString()}
          </p>
          <p className="text-white text-sm">
            Market Share: {data.percentage.toFixed(2)}%
          </p>
          <p className="text-white text-sm capitalize">Type: {data.type}</p>
        </div>
      </div>
    );
  }
  return null;
};

export function ParticipantBubbleChart({
  results,
  height = 400,
  className = "",
  hideTitle = false,
}: ParticipantBubbleChartProps) {
  const bubbleData = useMemo(() => {
    const { top_senders, top_receivers } = results;

    const participantMap = new Map<
      string,
      {
        address: string;
        address_short: string;
        total_value: number;
        transactions: number;
        percentage: number;
        type: "sender" | "receiver" | "both";
      }
    >();

    top_senders.forEach((sender) => {
      participantMap.set(sender.address, {
        address: sender.address,
        address_short: sender.address_short,
        total_value: sender.total_value,
        transactions: sender.transactions,
        percentage: sender.percentage_of_volume,
        type: "sender",
      });
    });

    top_receivers.forEach((receiver) => {
      const existing = participantMap.get(receiver.address);
      if (existing) {
        participantMap.set(receiver.address, {
          ...existing,
          total_value: existing.total_value + receiver.total_value,
          transactions: existing.transactions + receiver.transactions,
          percentage: existing.percentage + receiver.percentage_of_volume,
          type: "both",
        });
      } else {
        participantMap.set(receiver.address, {
          address: receiver.address,
          address_short: receiver.address_short,
          total_value: receiver.total_value,
          transactions: receiver.transactions,
          percentage: receiver.percentage_of_volume,
          type: "receiver",
        });
      }
    });

    const bubbles: BubbleData[] = Array.from(participantMap.values())
      .slice(0, 50)
      .map((participant) => {
        let color = "#10b981";
        if (participant.type === "sender") color = "#ef4444";
        if (participant.type === "both") color = "#8b5cf6";

        return {
          address: participant.address,
          address_short: participant.address_short,
          x: participant.total_value,
          y: participant.transactions,
          z: Math.max(20, participant.percentage * 50),
          type: participant.type,
          color,
          total_value: participant.total_value,
          transactions: participant.transactions,
          percentage: participant.percentage,
        };
      })
      .sort((a, b) => b.z - a.z);

    return bubbles;
  }, [results]);

  if (bubbleData.length === 0) {
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
            <p className="text-[#8b9dc3] text-sm">
              No participant data available
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`h-full bg-[rgba(15,20,25,0.8)] border border-[rgba(0,191,255,0.2)] rounded-lg p-4 ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2"></div>
        <div className="text-sm text-[#8b9dc3]">
          {bubbleData.length} participants
        </div>
      </div>

      <div
        style={{
          height: typeof height === "string" ? height : `${height}px`,
          minHeight: "400px",
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,191,255,0.1)" />
            <XAxis
              type="number"
              dataKey="x"
              name="Volume"
              tickFormatter={(value) => formatPyusdValue(value)}
              stroke="#8b9dc3"
              fontSize={12}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Transactions"
              tickFormatter={(value) => value.toLocaleString()}
              stroke="#8b9dc3"
              fontSize={12}
              width={60}
            />
            <ZAxis
              type="number"
              dataKey="z"
              range={[20, 400]}
              name="Market Share"
            />
            <Tooltip content={<CustomTooltip />} />

            <Scatter data={bubbleData}>
              {bubbleData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex items-center justify-center gap-6 text-xs">
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

      <div className="mt-2 text-center text-xs text-[#6b7280]">
        X: Volume • Y: Transactions • Size: Market Share
      </div>
    </div>
  );
}
