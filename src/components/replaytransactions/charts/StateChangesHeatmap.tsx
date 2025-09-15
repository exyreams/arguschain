import React, { useMemo } from "react";
import { ResponsiveContainer, Tooltip, Treemap } from "recharts";
import type { StateDiffAnalysis } from "@/lib/replaytransactions";
import { getTokenConfig, VISUALIZATION_COLORS } from "@/lib/replaytransactions";

interface StateChangesHeatmapProps {
  stateDiffAnalysis?: StateDiffAnalysis;
  className?: string;
}

interface HeatmapData {
  name: string;
  size: number;
  changeType: string;
  contractName: string;
  address: string;
  color: string;
  children?: HeatmapData[];
}

export const StateChangesHeatmap: React.FC<StateChangesHeatmapProps> = ({
  stateDiffAnalysis,
  className = "",
}) => {
  if (!stateDiffAnalysis) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-[#8b9dc3]">No state changes data available</div>
      </div>
    );
  }

  const heatmapData = useMemo(() => {
    if (!stateDiffAnalysis) return [];

    const contractGroups = new Map<
      string,
      {
        address: string;
        contractName: string;
        changes: Array<{
          type: string;
          count: number;
        }>;
        totalChanges: number;
      }
    >();

    (stateDiffAnalysis.balanceChanges || []).forEach((change) => {
      const existing = contractGroups.get(change.address);
      if (existing) {
        existing.totalChanges++;
        const balanceChange = existing.changes.find(
          (c) => c.type === "balance"
        );
        if (balanceChange) {
          balanceChange.count++;
        } else {
          existing.changes.push({ type: "balance", count: 1 });
        }
      } else {
        contractGroups.set(change.address, {
          address: change.address,
          contractName:
            change.contractName || `Contract ${change.address.slice(0, 8)}...`,
          changes: [{ type: "balance", count: 1 }],
          totalChanges: 1,
        });
      }
    });

    (stateDiffAnalysis.storageChanges || []).forEach((change) => {
      const existing = contractGroups.get(change.address);
      if (existing) {
        existing.totalChanges++;
        const storageChange = existing.changes.find(
          (c) => c.type === "storage"
        );
        if (storageChange) {
          storageChange.count++;
        } else {
          existing.changes.push({ type: "storage", count: 1 });
        }
      } else {
        contractGroups.set(change.address, {
          address: change.address,
          contractName:
            change.contractName || `Contract ${change.address.slice(0, 8)}...`,
          changes: [{ type: "storage", count: 1 }],
          totalChanges: 1,
        });
      }
    });

    (stateDiffAnalysis.codeChanges || []).forEach((change) => {
      const existing = contractGroups.get(change.address);
      if (existing) {
        existing.totalChanges++;
        const codeChange = existing.changes.find((c) => c.type === "code");
        if (codeChange) {
          codeChange.count++;
        } else {
          existing.changes.push({ type: "code", count: 1 });
        }
      } else {
        contractGroups.set(change.address, {
          address: change.address,
          contractName:
            change.contractName || `Contract ${change.address.slice(0, 8)}...`,
          changes: [{ type: "code", count: 1 }],
          totalChanges: 1,
        });
      }
    });

    (stateDiffAnalysis.nonceChanges || []).forEach((change) => {
      const existing = contractGroups.get(change.address);
      if (existing) {
        existing.totalChanges++;
        const nonceChange = existing.changes.find((c) => c.type === "nonce");
        if (nonceChange) {
          nonceChange.count++;
        } else {
          existing.changes.push({ type: "nonce", count: 1 });
        }
      } else {
        contractGroups.set(change.address, {
          address: change.address,
          contractName: `Contract ${change.address.slice(0, 8)}...`,
          changes: [{ type: "nonce", count: 1 }],
          totalChanges: 1,
        });
      }
    });

    const data: HeatmapData[] = Array.from(contractGroups.values()).map(
      (group) => {
        const tokenConfig = getTokenConfig(group.address);
        const isToken = !!tokenConfig;

        const children: HeatmapData[] = group.changes.map((change) => {
          const getChangeColor = (type: string) => {
            switch (type) {
              case "balance":
                return VISUALIZATION_COLORS.success;
              case "storage":
                return VISUALIZATION_COLORS.primary;
              case "code":
                return VISUALIZATION_COLORS.error;
              case "nonce":
                return VISUALIZATION_COLORS.warning;
              default:
                return VISUALIZATION_COLORS.secondary;
            }
          };

          return {
            name: `${change.type} (${change.count})`,
            size: change.count,
            changeType: change.type,
            contractName: group.contractName,
            address: group.address,
            color: getChangeColor(change.type),
          };
        });

        return {
          name: tokenConfig?.symbol || group.contractName,
          size: group.totalChanges,
          changeType: "contract",
          contractName: group.contractName,
          address: group.address,
          color: isToken
            ? VISUALIZATION_COLORS.info
            : VISUALIZATION_COLORS.background.accent,
          children,
        };
      }
    );

    const sortedData = data.sort((a, b) => b.size - a.size);

    return sortedData;
  }, [stateDiffAnalysis]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[rgba(25,28,40,0.95)] border border-[rgba(0,191,255,0.3)] rounded-lg p-3 text-sm">
          <div className="text-[#00bfff] font-semibold mb-2">
            {data.contractName}
          </div>
          <div className="text-[#8b9dc3] mb-1">
            Address:{" "}
            <span className="font-mono text-xs">
              {data.address.slice(0, 10)}...{data.address.slice(-8)}
            </span>
          </div>
          <div className="text-[#8b9dc3] mb-1">
            Change Type: <span className="capitalize">{data.changeType}</span>
          </div>
          <div className="text-[#8b9dc3]">
            Count: <span className="text-[#00bfff]">{data.size}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomContent = (props: any) => {
    const {
      root,
      depth,
      x,
      y,
      width,
      height,
      index,
      payload,
      colors,
      rank,
      name,
    } = props;

    if (!payload) {
      return null;
    }

    const fillColor = payload.color || VISUALIZATION_COLORS.secondary;

    if (depth === 1) {
      return (
        <g>
          <rect
            x={x}
            y={y}
            width={width}
            height={height}
            style={{
              fill: fillColor,
              stroke: VISUALIZATION_COLORS.primary,
              strokeWidth: 2,
              strokeOpacity: 0.7,
            }}
          />
          {width > 60 && height > 30 && (
            <text
              x={x + width / 2}
              y={y + height / 2}
              textAnchor="middle"
              fill="#ffffff"
              fontSize="12"
              fontWeight="bold"
            >
              {name}
            </text>
          )}
          {width > 80 && height > 50 && (
            <text
              x={x + width / 2}
              y={y + height / 2 + 15}
              textAnchor="middle"
              fill="#ffffff"
              fontSize="10"
              opacity={0.8}
            >
              {payload.size || 0} changes
            </text>
          )}
        </g>
      );
    }

    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill: fillColor,
            stroke: "#ffffff",
            strokeWidth: 1,
            strokeOpacity: 0.5,
          }}
        />
        {width > 40 && height > 20 && (
          <text
            x={x + width / 2}
            y={y + height / 2}
            textAnchor="middle"
            fill="#ffffff"
            fontSize="10"
          >
            {payload.changeType || "unknown"}
          </text>
        )}
      </g>
    );
  };

  if (!stateDiffAnalysis || heatmapData.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-[#8b9dc3]">No state changes data available</div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-[#00bfff]">
            {stateDiffAnalysis.totalChanges || 0}
          </div>
          <div className="text-sm text-[#8b9dc3]">Total Changes</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-[#00bfff]">
            {(stateDiffAnalysis.contractsAffected || []).length}
          </div>
          <div className="text-sm text-[#8b9dc3]">Contracts</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-[#00bfff]">
            {(stateDiffAnalysis.storageChanges || []).length}
          </div>
          <div className="text-sm text-[#8b9dc3]">Storage</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-[#00bfff]">
            {(stateDiffAnalysis.balanceChanges || []).length}
          </div>
          <div className="text-sm text-[#8b9dc3]">Balances</div>
        </div>
      </div>

      <div className="h-96">
        {false && heatmapData.length === 0 ? (
          // Create a simple visualization from the raw metrics when treemap data is empty
          <div className="h-full">
            {(stateDiffAnalysis.totalChanges || 0) > 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 w-full max-w-2xl">
                  {(stateDiffAnalysis.balanceChanges || []).length > 0 && (
                    <div className="text-center">
                      <div
                        className="w-16 h-16 mx-auto mb-3 rounded-lg flex items-center justify-center"
                        style={{
                          backgroundColor: VISUALIZATION_COLORS.success + "40",
                          border: `2px solid ${VISUALIZATION_COLORS.success}`,
                        }}
                      >
                        <span
                          className="text-lg font-bold"
                          style={{ color: VISUALIZATION_COLORS.success }}
                        >
                          {(stateDiffAnalysis.balanceChanges || []).length}
                        </span>
                      </div>
                      <div className="text-sm text-[#8b9dc3]">
                        Balance Changes
                      </div>
                    </div>
                  )}

                  {(stateDiffAnalysis.storageChanges || []).length > 0 && (
                    <div className="text-center">
                      <div
                        className="w-16 h-16 mx-auto mb-3 rounded-lg flex items-center justify-center"
                        style={{
                          backgroundColor: VISUALIZATION_COLORS.primary + "40",
                          border: `2px solid ${VISUALIZATION_COLORS.primary}`,
                        }}
                      >
                        <span
                          className="text-lg font-bold"
                          style={{ color: VISUALIZATION_COLORS.primary }}
                        >
                          {(stateDiffAnalysis.storageChanges || []).length}
                        </span>
                      </div>
                      <div className="text-sm text-[#8b9dc3]">
                        Storage Changes
                      </div>
                    </div>
                  )}

                  {(stateDiffAnalysis.codeChanges || []).length > 0 && (
                    <div className="text-center">
                      <div
                        className="w-16 h-16 mx-auto mb-3 rounded-lg flex items-center justify-center"
                        style={{
                          backgroundColor: VISUALIZATION_COLORS.error + "40",
                          border: `2px solid ${VISUALIZATION_COLORS.error}`,
                        }}
                      >
                        <span
                          className="text-lg font-bold"
                          style={{ color: VISUALIZATION_COLORS.error }}
                        >
                          {(stateDiffAnalysis.codeChanges || []).length}
                        </span>
                      </div>
                      <div className="text-sm text-[#8b9dc3]">Code Changes</div>
                    </div>
                  )}

                  {(stateDiffAnalysis.nonceChanges || []).length > 0 && (
                    <div className="text-center">
                      <div
                        className="w-16 h-16 mx-auto mb-3 rounded-lg flex items-center justify-center"
                        style={{
                          backgroundColor: VISUALIZATION_COLORS.warning + "40",
                          border: `2px solid ${VISUALIZATION_COLORS.warning}`,
                        }}
                      >
                        <span
                          className="text-lg font-bold"
                          style={{ color: VISUALIZATION_COLORS.warning }}
                        >
                          {(stateDiffAnalysis.nonceChanges || []).length}
                        </span>
                      </div>
                      <div className="text-sm text-[#8b9dc3]">
                        Nonce Changes
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-[#8b9dc3] mb-2">
                    No state changes to visualize
                  </div>
                  <div className="text-[#6b7280] text-sm">
                    The transaction may not have modified any contract storage
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={heatmapData}
              dataKey="size"
              aspectRatio={4 / 3}
              stroke="#ffffff"
              strokeWidth={2}
              content={CustomContent}
              style={{ backgroundColor: "rgba(25,28,40,0.5)" }}
            >
              <Tooltip content={CustomTooltip} />
            </Treemap>
          </ResponsiveContainer>
        )}
      </div>

      <div className="flex flex-wrap gap-4 justify-center text-sm">
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded"
            style={{ background: VISUALIZATION_COLORS.success }}
          />
          <span className="text-[#8b9dc3]">Balance Changes</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded"
            style={{ background: VISUALIZATION_COLORS.primary }}
          />
          <span className="text-[#8b9dc3]">Storage Changes</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded"
            style={{ background: VISUALIZATION_COLORS.error }}
          />
          <span className="text-[#8b9dc3]">Code Changes</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded"
            style={{ background: VISUALIZATION_COLORS.warning }}
          />
          <span className="text-[#8b9dc3]">Nonce Changes</span>
        </div>
      </div>
    </div>
  );
};
