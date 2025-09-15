import { ethers } from "ethers";
import type {
  MappingResult,
  StorageComparison,
  StorageRangeResult,
  StorageSlot,
} from "../api/storageApi";

export interface ProcessedStorageData {
  slots: StorageSlot[];
  categories: StorageCategories;
  patterns: DetectedPatterns;
  summary: StorageSummary;
  securityFlags: SecurityFlag[];
}

export interface StorageCategories {
  supply: StorageSlot[];
  balances: StorageSlot[];
  allowances: StorageSlot[];
  proxy: StorageSlot[];
  access_control: StorageSlot[];
  metadata: StorageSlot[];
  control: StorageSlot[];
  unknown: StorageSlot[];
}

export interface DetectedPatterns {
  erc20Standard: boolean;
  proxyPattern: boolean;
  accessControl: boolean;
  pausable: boolean;
  upgradeable: boolean;
  detailedPatterns: PatternDetail[];
}

export interface PatternDetail {
  type: string;
  confidence: "low" | "medium" | "high";
  description: string;
  slots: string[];
}

export interface StorageSummary {
  totalSlots: number;
  interpretedSlots: number;
  contractType: "proxy" | "implementation" | "standard";
  implementationAddress?: string;
  adminAddress?: string;
  totalSupply?: number;
  isPaused?: boolean;
  version?: number;
}

export interface SecurityFlag {
  level: "info" | "warning" | "high" | "critical";
  type: string;
  description: string;
  details?: Record<string, any>;
}

export interface StorageVisualizationData {
  categoryDistribution: CategoryDistributionData[];
  slotLayout: SlotLayoutData[];
  securityOverview: SecurityOverviewData[];
}

export interface CategoryDistributionData {
  category: string;
  count: number;
  percentage: number;
  description: string;
  color: string;
}

export interface SlotLayoutData {
  slot: string;
  slotInt: number;
  category: string;
  interpretation: string;
  value: string;
  color: string;
}

export interface SecurityOverviewData {
  type: string;
  status: "secure" | "warning" | "critical";
  description: string;
  count: number;
}

const KNOWN_SLOTS = {
  0: "totalSupply (or part of it)",
  1: "name (string pointer or part)",
  2: "symbol (string pointer or part)",
  3: "decimals (or part of mapping pointer)",
  4: "balances mapping base",
  5: "allowances mapping base",

  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc":
    "EIP-1967 implementation slot",
  "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103":
    "EIP-1967 admin slot",
  "0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50":
    "EIP-1967 beacon slot",

  "0xb09aa5aeb3702cfd50b6b62bc4532604938f21248a27a1d5ca736082b6819cc1":
    "Admin role hash",
  "0x5ac1dce9f7971a63e05025b10b44b6f3c868ae576a5e4a815201051d3eae29cb":
    "Paused state",

  "0x523a704056dcd17bcbde8daf7c077f098d4c0543350248342941a5f0bd09013b":
    "MINTER_ROLE hash",
  "0xe79898c174bd7837e39256eb383695fecfbd06b222fb859d684c784cbd5997bb":
    "PAUSER_ROLE hash",
  "0x7a8dc26796a1e50e6e190b70259f58f6a4edd5b21680169636c3b97720af2ffc":
    "TOKEN_CONTROLLER_ROLE hash",
};

const CATEGORY_DESCRIPTIONS = {
  supply: "Total token supply data",
  balances: "User token balance mapping",
  allowances: "Token spending approvals",
  access_control: "Role-based permission system",
  proxy: "Upgradeable contract implementation",
  control: "Contract control mechanisms like pause",
  metadata: "Token metadata like name and symbol",
  unknown: "Unidentified storage purpose",
};

const CATEGORY_COLORS = {
  supply: "#10b981",
  balances: "#3b82f6",
  allowances: "#f59e0b",
  access_control: "#ef4444",
  proxy: "#8b5cf6",
  control: "#f97316",
  metadata: "#06b6d4",
  unknown: "#6b7280",
};

export class StorageProcessor {
  processStorageRange(
    storageResult: StorageRangeResult,
    contractAddress: string,
    blockHash: string,
  ): ProcessedStorageData {
    const slots = this.parseStorageSlots(storageResult.storage);
    const categories = this.categorizeSlots(slots);
    const patterns = this.detectPatterns(slots);
    const summary = this.generateSummary(
      slots,
      categories,
      patterns,
      contractAddress,
    );
    const securityFlags = this.analyzeSecurityFlags(slots, patterns);

    return {
      slots,
      categories,
      patterns,
      summary,
      securityFlags,
    };
  }

  private parseStorageSlots(
    storage: Record<string, { key: string; value: string }>,
  ): StorageSlot[] {
    const slots: StorageSlot[] = [];

    for (const [slotHash, data] of Object.entries(storage)) {
      const slot: StorageSlot = {
        slot: slotHash,
        value: data.value,
        category: "unknown",
      };

      try {
        if (slotHash.startsWith("0x")) {
          slot.slotInt = parseInt(slotHash, 16);
        }
      } catch {}

      if (slotHash in KNOWN_SLOTS) {
        slot.interpretation = KNOWN_SLOTS[slotHash as keyof typeof KNOWN_SLOTS];
      } else if (slot.slotInt !== undefined && slot.slotInt in KNOWN_SLOTS) {
        slot.interpretation =
          KNOWN_SLOTS[slot.slotInt as keyof typeof KNOWN_SLOTS];
      }

      this.decodeStorageValue(slot);

      slots.push(slot);
    }

    return slots.sort((a, b) => {
      if (a.slotInt !== undefined && b.slotInt !== undefined) {
        return a.slotInt - b.slotInt;
      }
      return a.slot.localeCompare(b.slot);
    });
  }

  private decodeStorageValue(slot: StorageSlot): void {
    const value = slot.value;

    try {
      if (value.length === 66 && value.startsWith("0x")) {
        const valueInt = BigInt(value);

        if (
          slot.slot ===
          "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc"
        ) {
          const implAddr = "0x" + value.slice(-40);
          slot.decodedValue = ethers.getAddress(implAddr);
          slot.type = "address";
          slot.category = "proxy";
        } else if (
          slot.slot ===
          "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103"
        ) {
          const adminAddr = "0x" + value.slice(-40);
          slot.decodedValue = ethers.getAddress(adminAddr);
          slot.type = "address";
          slot.category = "proxy";
        } else if (
          slot.slot ===
          "0x5ac1dce9f7971a63e05025b10b44b6f3c868ae576a5e4a815201051d3eae29cb"
        ) {
          slot.decodedValue = valueInt === 1n ? "true" : "false";
          slot.type = "bool";
          slot.category = "control";
        } else if (valueInt < 1000000000000n) {
          slot.decodedValue = valueInt.toString();
          slot.type = "uint256";

          if (valueInt === 0n || valueInt === 1n) {
            slot.type = "bool";
            slot.decodedValue = valueInt === 1n ? "true" : "false";
          }

          if (slot.slotInt === 0 && valueInt > 0n) {
            slot.category = "supply";

            const formatted = Number(valueInt) / 1e6;
            slot.decodedValue = `${formatted.toLocaleString()} tokens`;
          }
        } else if (value.startsWith("0x000000000000000000000000")) {
          const potentialAddr = "0x" + value.slice(-40);
          try {
            slot.decodedValue = ethers.getAddress(potentialAddr);
            slot.type = "address";
          } catch {
            slot.decodedValue = potentialAddr;
          }
        } else {
          const bytes = ethers.getBytes(value);
          const cleanBytes = bytes.filter((b) => b !== 0);

          if (
            cleanBytes.length > 0 &&
            cleanBytes.every((b) => b >= 32 && b <= 126)
          ) {
            try {
              const stringValue = new TextDecoder().decode(
                new Uint8Array(cleanBytes),
              );
              if (stringValue.length > 2) {
                slot.decodedValue = `"${stringValue}"`;
                slot.type = "string";
                slot.category = "metadata";
              }
            } catch {}
          }
        }
      }
    } catch (error) {
      console.warn(`Error decoding slot ${slot.slot}:`, error);
    }

    if (!slot.decodedValue) {
      slot.decodedValue =
        value.length > 18
          ? `${value.slice(0, 10)}...${value.slice(-8)}`
          : value;
    }
  }

  private categorizeSlots(slots: StorageSlot[]): StorageCategories {
    const categories: StorageCategories = {
      supply: [],
      balances: [],
      allowances: [],
      proxy: [],
      access_control: [],
      metadata: [],
      control: [],
      unknown: [],
    };

    for (const slot of slots) {
      if (slot.category && slot.category !== "unknown") {
        categories[slot.category].push(slot);
        continue;
      }

      if (slot.slotInt === 0) {
        slot.category = "supply";
      } else if (slot.slotInt === 4 || slot.slotInt === 1) {
        slot.category = "balances";
      } else if (slot.slotInt === 5 || slot.slotInt === 2) {
        slot.category = "allowances";
      } else if (slot.interpretation?.toLowerCase().includes("role")) {
        slot.category = "access_control";
      } else if (slot.interpretation?.toLowerCase().includes("paused")) {
        slot.category = "control";
      } else if (slot.type === "string") {
        slot.category = "metadata";
      } else if (slot.type === "address") {
      }

      categories[slot.category].push(slot);
    }

    return categories;
  }

  private detectPatterns(slots: StorageSlot[]): DetectedPatterns {
    const patterns: DetectedPatterns = {
      erc20Standard: false,
      proxyPattern: false,
      accessControl: false,
      pausable: false,
      upgradeable: false,
      detailedPatterns: [],
    };

    const slotHashes = slots.map((s) => s.slot);
    const slotInts = slots.map((s) => s.slotInt).filter((s) => s !== undefined);

    if (slotInts.includes(0)) {
      patterns.erc20Standard = true;
      patterns.detailedPatterns.push({
        type: "erc20",
        confidence: "high",
        description:
          "Standard ERC20 storage layout detected (totalSupply at slot 0)",
        slots: ["0"],
      });
    }

    const implSlot =
      "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
    const adminSlot =
      "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103";
    const hasImpl = slotHashes.includes(implSlot);
    const hasAdmin = slotHashes.includes(adminSlot);

    if (hasImpl || hasAdmin) {
      patterns.proxyPattern = true;
      patterns.upgradeable = true;
      const confidence = hasImpl && hasAdmin ? "high" : "medium";
      patterns.detailedPatterns.push({
        type: "proxy",
        confidence,
        description: `EIP-1967 proxy pattern detected (${hasImpl ? "implementation" : ""}${hasImpl && hasAdmin ? " and " : ""}${hasAdmin ? "admin" : ""} slot found)`,
        slots: [hasImpl ? implSlot : "", hasAdmin ? adminSlot : ""].filter(
          Boolean,
        ),
      });
    }

    const pausedSlot =
      "0x5ac1dce9f7971a63e05025b10b44b6f3c868ae576a5e4a815201051d3eae29cb";
    if (slotHashes.includes(pausedSlot)) {
      patterns.pausable = true;
      patterns.detailedPatterns.push({
        type: "pausable",
        confidence: "high",
        description:
          "OpenZeppelin Pausable pattern detected (paused state slot found)",
        slots: [pausedSlot],
      });
    }

    const roleAdminSlot =
      "0xb09aa5aeb3702cfd50b6b62bc4532604938f21248a27a1d5ca736082b6819cc1";
    const roleSlots = [
      "0x523a704056dcd17bcbde8daf7c077f098d4c0543350248342941a5f0bd09013b",
      "0xe79898c174bd7837e39256eb383695fecfbd06b222fb859d684c784cbd5997bb",
      "0x7a8dc26796a1e50e6e190b70259f58f6a4edd5b21680169636c3b97720af2ffc",
    ];

    const foundRoleSlots = roleSlots.filter((slot) =>
      slotHashes.includes(slot),
    );
    if (slotHashes.includes(roleAdminSlot) || foundRoleSlots.length > 0) {
      patterns.accessControl = true;
      patterns.detailedPatterns.push({
        type: "access_control",
        confidence: "high",
        description: `OpenZeppelin AccessControl pattern detected (${foundRoleSlots.length + (slotHashes.includes(roleAdminSlot) ? 1 : 0)} role slots found)`,
        slots: [roleAdminSlot, ...foundRoleSlots].filter((slot) =>
          slotHashes.includes(slot),
        ),
      });
    }

    return patterns;
  }

  private generateSummary(
    slots: StorageSlot[],
    categories: StorageCategories,
    patterns: DetectedPatterns,
    contractAddress: string,
  ): StorageSummary {
    const summary: StorageSummary = {
      totalSlots: slots.length,
      interpretedSlots: slots.filter((s) => s.interpretation).length,
      contractType: patterns.proxyPattern ? "proxy" : "standard",
    };

    const implSlot = slots.find(
      (s) =>
        s.slot ===
        "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc",
    );
    if (implSlot?.decodedValue && implSlot.type === "address") {
      summary.implementationAddress = implSlot.decodedValue;
      summary.contractType = "proxy";
    }

    const adminSlot = slots.find(
      (s) =>
        s.slot ===
        "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103",
    );
    if (adminSlot?.decodedValue && adminSlot.type === "address") {
      summary.adminAddress = adminSlot.decodedValue;
    }

    const supplySlot = slots.find((s) => s.slotInt === 0);
    if (supplySlot?.value) {
      try {
        summary.totalSupply = Number(BigInt(supplySlot.value));
      } catch {}
    }

    const pausedSlot = slots.find(
      (s) =>
        s.slot ===
        "0x5ac1dce9f7971a63e05025b10b44b6f3c868ae576a5e4a815201051d3eae29cb",
    );
    if (pausedSlot?.decodedValue) {
      summary.isPaused = pausedSlot.decodedValue === "true";
    }

    return summary;
  }

  private analyzeSecurityFlags(
    slots: StorageSlot[],
    patterns: DetectedPatterns,
  ): SecurityFlag[] {
    const flags: SecurityFlag[] = [];

    const implSlot = slots.find(
      (s) =>
        s.slot ===
        "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc",
    );
    if (implSlot?.decodedValue) {
      flags.push({
        level: "info",
        type: "proxy_implementation",
        description: `Proxy implementation: ${implSlot.decodedValue}`,
        details: { address: implSlot.decodedValue },
      });
    }

    const adminSlot = slots.find(
      (s) =>
        s.slot ===
        "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103",
    );
    if (adminSlot?.decodedValue) {
      flags.push({
        level: "info",
        type: "proxy_admin",
        description: `Proxy admin: ${adminSlot.decodedValue}`,
        details: { address: adminSlot.decodedValue },
      });
    }

    const pausedSlot = slots.find(
      (s) =>
        s.slot ===
        "0x5ac1dce9f7971a63e05025b10b44b6f3c868ae576a5e4a815201051d3eae29cb",
    );
    if (pausedSlot?.decodedValue === "true") {
      flags.push({
        level: "warning",
        type: "contract_paused",
        description: "Contract is currently paused",
        details: { paused: true },
      });
    }

    return flags;
  }

  generateVisualizationData(
    processedData: ProcessedStorageData,
  ): StorageVisualizationData {
    const { categories, slots, securityFlags } = processedData;

    const categoryDistribution: CategoryDistributionData[] = Object.entries(
      categories,
    )
      .filter(([_, slots]) => slots.length > 0)
      .map(([category, categorySlots]) => ({
        category: category.replace("_", " ").toUpperCase(),
        count: categorySlots.length,
        percentage: (categorySlots.length / slots.length) * 100,
        description:
          CATEGORY_DESCRIPTIONS[
            category as keyof typeof CATEGORY_DESCRIPTIONS
          ] || "",
        color:
          CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] ||
          "#6b7280",
      }));

    const numericSlots = slots
      .filter((s) => s.slotInt !== undefined)
      .slice(0, 15);

    const slotLayout: SlotLayoutData[] = numericSlots.map((slot) => ({
      slot: slot.slotInt!.toString(),
      slotInt: slot.slotInt!,
      category: slot.category || "unknown",
      interpretation: slot.interpretation || "Unknown",
      value: slot.decodedValue || slot.value,
      color:
        CATEGORY_COLORS[slot.category as keyof typeof CATEGORY_COLORS] ||
        "#6b7280",
    }));

    const securityCounts = securityFlags.reduce(
      (acc, flag) => {
        acc[flag.type] = (acc[flag.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const securityOverview: SecurityOverviewData[] = Object.entries(
      securityCounts,
    ).map(([type, count]) => {
      const flag = securityFlags.find((f) => f.type === type)!;
      return {
        type: type.replace("_", " ").toUpperCase(),
        status:
          flag.level === "critical"
            ? "critical"
            : flag.level === "warning"
              ? "warning"
              : "secure",
        description: flag.description,
        count,
      };
    });

    return {
      categoryDistribution,
      slotLayout,
      securityOverview,
    };
  }

  processMappingResults(
    results: MappingResult[],
    mappingSlot: number | string,
  ): {
    summary: { totalKeys: number; nonZeroValues: number; totalValue: number };
    topHolders: MappingResult[];
    distribution: { key: string; value: number; percentage: number }[];
  } {
    const nonZeroResults = results.filter((r) => r.valueInt && r.valueInt > 0);
    const totalValue = nonZeroResults.reduce(
      (sum, r) => sum + (r.valueInt || 0),
      0,
    );

    const summary = {
      totalKeys: results.length,
      nonZeroValues: nonZeroResults.length,
      totalValue,
    };

    const topHolders = nonZeroResults
      .sort((a, b) => (b.valueInt || 0) - (a.valueInt || 0))
      .slice(0, 10);

    const distribution = nonZeroResults.map((r) => ({
      key: r.keyDisplay,
      value: r.valueInt || 0,
      percentage: totalValue > 0 ? ((r.valueInt || 0) / totalValue) * 100 : 0,
    }));

    return { summary, topHolders, distribution };
  }

  processStorageComparison(comparisons: StorageComparison[]): {
    summary: {
      totalSlots: number;
      changedSlots: number;
      supplyChanges: number;
      balanceChanges: number;
    };
    changes: StorageComparison[];
    changesByCategory: { category: string; count: number }[];
  } {
    const changedComparisons = comparisons.filter((c) => c.changed);

    const summary = {
      totalSlots: comparisons.length,
      changedSlots: changedComparisons.length,
      supplyChanges: changedComparisons.filter((c) => c.isSupplyChange).length,
      balanceChanges: changedComparisons.filter((c) => c.isBalanceChange)
        .length,
    };

    const changes = changedComparisons.slice(0, 20);

    const changesByCategory = [
      { category: "Supply Changes", count: summary.supplyChanges },
      { category: "Balance Changes", count: summary.balanceChanges },
      {
        category: "Other Changes",
        count:
          summary.changedSlots - summary.supplyChanges - summary.balanceChanges,
      },
    ].filter((c) => c.count > 0);

    return { summary, changes, changesByCategory };
  }
}

export const storageProcessor = new StorageProcessor();
