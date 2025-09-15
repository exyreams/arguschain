import React from "react";
import { TransferNetworkDiagram } from "./TransferNetworkDiagram";
import type { ParsedTransferLog } from "@/lib/eventlogs";

interface NetworkFlowDiagramProps {
  transfers: ParsedTransferLog[];
  interactive?: boolean;
  height?: number;
  className?: string;
}

/**
 * NetworkFlowDiagram - Interactive network visualization component
 *
 * This component provides a force-directed network diagram showing token transfer flows
 * between addresses. It includes features like:
 * - Interactive node positioning with physics simulation
 * - Dynamic filtering and threshold controls
 * - Hub detection and community clustering
 * - Real-time simulation controls
 * - Detailed node and link information
 */
export const NetworkFlowDiagram: React.FC<NetworkFlowDiagramProps> = ({
  transfers,
  interactive = true,
  height = 600,
  className = "",
}) => {
  return (
    <div className={className}>
      <TransferNetworkDiagram
        transfers={transfers}
        height={height}
        className="w-full"
      />
    </div>
  );
};

export default NetworkFlowDiagram;
