import { ethers } from "ethers";
import type { StorageSlot } from "./api/storageApi";
import type { DetectedPatterns } from "./processors/storageProcessor";

export interface PatternDetectionResult {
  patterns: DetectedPatterns;
  securityAnalysis: SecurityAnalysis;
  confidence: number;
}

export interface SecurityAnalysis {
  riskLevel: "low" | "medium" | "high" | "critical";
  findings: SecurityFinding[];
  recommendations: string[];
  vulnerabilities: Vulnerability[];
}

export interface SecurityFinding {
  type: string;
  severity: "info" | "warning" | "high" | "critical";
  description: string;
  affectedSlots: string[];
  recommendation: string;
}

export interface Vulnerability {
  id: string;
  name: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  cwe?: string;
  references: string[];
}

const STORAGE_PATTERNS = {
  ERC20_TOTAL_SUPPLY: {
    slots: [0],
    description: "ERC20 total supply at slot 0",
    confidence: "high" as const,
  },
  ERC20_BALANCES: {
    slots: [4],
    description: "ERC20 balances mapping at slot 4",
    confidence: "high" as const,
  },
  ERC20_ALLOWANCES: {
    slots: [5],
    description: "ERC20 allowances mapping at slot 5",
    confidence: "high" as const,
  },

  EIP1967_IMPLEMENTATION: {
    slots: [
      "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc",
    ],
    description: "EIP-1967 implementation slot",
    confidence: "high" as const,
  },
  EIP1967_ADMIN: {
    slots: [
      "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103",
    ],
    description: "EIP-1967 admin slot",
    confidence: "high" as const,
  },
  EIP1967_BEACON: {
    slots: [
      "0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50",
    ],
    description: "EIP-1967 beacon slot",
    confidence: "high" as const,
  },

  OZ_PAUSABLE: {
    slots: [
      "0x5ac1dce9f7971a63e05025b10b44b6f3c868ae576a5e4a815201051d3eae29cb",
    ],
    description: "OpenZeppelin Pausable pattern",
    confidence: "high" as const,
  },
  OZ_ACCESS_CONTROL: {
    slots: [
      "0xb09aa5aeb3702cfd50b6b62bc4532604938f21248a27a1d5ca736082b6819cc1",
    ],
    description: "OpenZeppelin AccessControl admin role",
    confidence: "high" as const,
  },
  OZ_MINTER_ROLE: {
    slots: [
      "0x523a704056dcd17bcbde8daf7c077f098d4c0543350248342941a5f0bd09013b",
    ],
    description: "OpenZeppelin MINTER_ROLE",
    confidence: "high" as const,
  },
  OZ_PAUSER_ROLE: {
    slots: [
      "0xe79898c174bd7837e39256eb383695fecfbd06b222fb859d684c784cbd5997bb",
    ],
    description: "OpenZeppelin PAUSER_ROLE",
    confidence: "high" as const,
  },
};

const VULNERABILITY_PATTERNS = {
  UNPROTECTED_PROXY_ADMIN: {
    id: "UNPROTECTED_PROXY_ADMIN",
    name: "Unprotected Proxy Admin",
    description: "Proxy admin slot is accessible without proper access control",
    severity: "high" as const,
    cwe: "CWE-284",
    references: ["https://eips.ethereum.org/EIPS/eip-1967"],
  },
  CENTRALIZED_CONTROL: {
    id: "CENTRALIZED_CONTROL",
    name: "Centralized Control",
    description: "Single address has excessive control over the contract",
    severity: "medium" as const,
    cwe: "CWE-269",
    references: ["https://consensys.github.io/smart-contract-best-practices/"],
  },
  STORAGE_COLLISION: {
    id: "STORAGE_COLLISION",
    name: "Storage Collision Risk",
    description: "Potential storage collision between proxy and implementation",
    severity: "high" as const,
    cwe: "CWE-665",
    references: ["https://docs.openzeppelin.com/upgrades-plugins/1.x/proxies"],
  },
};

export class PatternDetector {
  async detectPatterns(
    storageSlots: StorageSlot[],
    contractAddress: string,
  ): Promise<DetectedPatterns> {
    const slotHashes = storageSlots.map((s) => s.slot);
    const slotInts = storageSlots
      .map((s) => s.slotInt)
      .filter((s) => s !== undefined);

    const patterns: DetectedPatterns = {
      erc20Standard: false,
      proxyPattern: false,
      accessControl: false,
      pausable: false,
      upgradeable: false,
      detailedPatterns: [],
    };

    this.detectERC20Patterns(storageSlots, patterns);

    this.detectProxyPatterns(storageSlots, patterns);

    this.detectAccessControlPatterns(storageSlots, patterns);

    this.detectPausablePatterns(storageSlots, patterns);

    this.detectCustomPatterns(storageSlots, patterns);

    return patterns;
  }

  private detectERC20Patterns(
    storageSlots: StorageSlot[],
    patterns: DetectedPatterns,
  ): void {
    const slotInts = storageSlots
      .map((s) => s.slotInt)
      .filter((s) => s !== undefined);

    const hasTotalSupply = slotInts.includes(0);

    const hasBalances = slotInts.includes(4);

    const hasAllowances = slotInts.includes(5);

    if (hasTotalSupply || hasBalances || hasAllowances) {
      patterns.erc20Standard = true;

      const confidence =
        hasTotalSupply && hasBalances && hasAllowances
          ? "high"
          : hasTotalSupply && hasBalances
            ? "medium"
            : "low";

      patterns.detailedPatterns.push({
        type: "erc20",
        confidence,
        description: `ERC20 token pattern detected (${[
          hasTotalSupply && "totalSupply",
          hasBalances && "balances",
          hasAllowances && "allowances",
        ]
          .filter(Boolean)
          .join(", ")})`,
        slots: [
          hasTotalSupply && "0",
          hasBalances && "4",
          hasAllowances && "5",
        ].filter(Boolean) as string[],
      });
    }
  }

  private detectProxyPatterns(
    storageSlots: StorageSlot[],
    patterns: DetectedPatterns,
  ): void {
    const slotHashes = storageSlots.map((s) => s.slot);

    const implSlot =
      "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
    const adminSlot =
      "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103";
    const beaconSlot =
      "0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50";

    const hasImpl = slotHashes.includes(implSlot);
    const hasAdmin = slotHashes.includes(adminSlot);
    const hasBeacon = slotHashes.includes(beaconSlot);

    if (hasImpl || hasAdmin || hasBeacon) {
      patterns.proxyPattern = true;
      patterns.upgradeable = true;

      const confidence = hasImpl && hasAdmin ? "high" : "medium";
      const proxyType = hasBeacon
        ? "beacon"
        : hasImpl
          ? "transparent"
          : "minimal";

      patterns.detailedPatterns.push({
        type: "proxy",
        confidence,
        description: `EIP-1967 ${proxyType} proxy pattern detected`,
        slots: [
          hasImpl && implSlot,
          hasAdmin && adminSlot,
          hasBeacon && beaconSlot,
        ].filter(Boolean) as string[],
      });
    }
  }

  private detectAccessControlPatterns(
    storageSlots: StorageSlot[],
    patterns: DetectedPatterns,
  ): void {
    const slotHashes = storageSlots.map((s) => s.slot);

    const roleSlots = [
      "0xb09aa5aeb3702cfd50b6b62bc4532604938f21248a27a1d5ca736082b6819cc1",
      "0x523a704056dcd17bcbde8daf7c077f098d4c0543350248342941a5f0bd09013b",
      "0xe79898c174bd7837e39256eb383695fecfbd06b222fb859d684c784cbd5997bb",
      "0x7a8dc26796a1e50e6e190b70259f58f6a4edd5b21680169636c3b97720af2ffc",
    ];

    const foundRoles = roleSlots.filter((slot) => slotHashes.includes(slot));

    if (foundRoles.length > 0) {
      patterns.accessControl = true;

      patterns.detailedPatterns.push({
        type: "access_control",
        confidence: "high",
        description: `OpenZeppelin AccessControl pattern detected (${foundRoles.length} role slots found)`,
        slots: foundRoles,
      });
    }
  }

  private detectPausablePatterns(
    storageSlots: StorageSlot[],
    patterns: DetectedPatterns,
  ): void {
    const slotHashes = storageSlots.map((s) => s.slot);
    const pausedSlot =
      "0x5ac1dce9f7971a63e05025b10b44b6f3c868ae576a5e4a815201051d3eae29cb";

    if (slotHashes.includes(pausedSlot)) {
      patterns.pausable = true;

      patterns.detailedPatterns.push({
        type: "pausable",
        confidence: "high",
        description: "OpenZeppelin Pausable pattern detected",
        slots: [pausedSlot],
      });
    }
  }

  private detectCustomPatterns(
    storageSlots: StorageSlot[],
    patterns: DetectedPatterns,
  ): void {
    const stringSlots = storageSlots.filter((s) => s.type === "string");
    if (stringSlots.length > 0) {
      patterns.detailedPatterns.push({
        type: "metadata",
        confidence: "medium",
        description: `String metadata detected (${stringSlots.length} slots)`,
        slots: stringSlots.map((s) => s.slot),
      });
    }

    const addressSlots = storageSlots.filter((s) => s.type === "address");
    if (addressSlots.length > 0) {
      patterns.detailedPatterns.push({
        type: "addresses",
        confidence: "medium",
        description: `Address storage detected (${addressSlots.length} slots)`,
        slots: addressSlots.map((s) => s.slot),
      });
    }

    const largeNumberSlots = storageSlots.filter((s) => {
      if (s.value && s.value.startsWith("0x")) {
        try {
          const value = BigInt(s.value);
          return value > BigInt("1000000000000000000");
        } catch {
          return false;
        }
      }
      return false;
    });

    if (largeNumberSlots.length > 0) {
      patterns.detailedPatterns.push({
        type: "large_values",
        confidence: "low",
        description: `Large value storage detected (${largeNumberSlots.length} slots)`,
        slots: largeNumberSlots.map((s) => s.slot),
      });
    }
  }

  async analyzeSecurityImplications(
    patterns: DetectedPatterns,
  ): Promise<SecurityAnalysis> {
    const findings: SecurityFinding[] = [];
    const vulnerabilities: Vulnerability[] = [];
    let riskLevel: SecurityAnalysis["riskLevel"] = "low";

    if (patterns.proxyPattern) {
      const proxyPattern = patterns.detailedPatterns.find(
        (p) => p.type === "proxy",
      );
      if (proxyPattern) {
        findings.push({
          type: "proxy_detected",
          severity: "info",
          description:
            "Proxy contract detected - ensure proper upgrade governance",
          affectedSlots: proxyPattern.slots,
          recommendation: "Implement multi-sig or timelock for proxy upgrades",
        });

        const hasAdmin = proxyPattern.slots.includes(
          "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103",
        );
        if (hasAdmin && !patterns.accessControl) {
          vulnerabilities.push(VULNERABILITY_PATTERNS.UNPROTECTED_PROXY_ADMIN);
          riskLevel = "high";
        }
      }
    }

    if (patterns.accessControl) {
      const accessPattern = patterns.detailedPatterns.find(
        (p) => p.type === "access_control",
      );
      if (accessPattern) {
        findings.push({
          type: "access_control_detected",
          severity: "info",
          description: "Role-based access control detected",
          affectedSlots: accessPattern.slots,
          recommendation:
            "Ensure proper role management and avoid single points of failure",
        });

        if (accessPattern.slots.length === 1) {
          vulnerabilities.push(VULNERABILITY_PATTERNS.CENTRALIZED_CONTROL);
          if (riskLevel === "low") riskLevel = "medium";
        }
      }
    }

    if (patterns.pausable) {
      findings.push({
        type: "pausable_detected",
        severity: "info",
        description: "Pausable functionality detected",
        affectedSlots: [
          "0x5ac1dce9f7971a63e05025b10b44b6f3c868ae576a5e4a815201051d3eae29cb",
        ],
        recommendation:
          "Ensure pause functionality is properly governed and time-limited",
      });
    }

    const recommendations = this.generateRecommendations(
      patterns,
      findings,
      vulnerabilities,
    );

    return {
      riskLevel,
      findings,
      recommendations,
      vulnerabilities,
    };
  }

  private generateRecommendations(
    patterns: DetectedPatterns,
    findings: SecurityFinding[],
    vulnerabilities: Vulnerability[],
  ): string[] {
    const recommendations: string[] = [];

    if (patterns.proxyPattern) {
      recommendations.push(
        "Implement multi-signature wallet for proxy admin functions",
      );
      recommendations.push(
        "Consider using OpenZeppelin's ProxyAdmin for better security",
      );
      recommendations.push(
        "Ensure storage layout compatibility between proxy and implementation",
      );
    }

    if (patterns.accessControl) {
      recommendations.push("Regularly audit role assignments and permissions");
      recommendations.push(
        "Implement role rotation policies for critical functions",
      );
      recommendations.push("Use multi-signature wallets for admin roles");
    }

    if (patterns.pausable) {
      recommendations.push(
        "Implement automatic unpause mechanisms to prevent permanent locks",
      );
      recommendations.push(
        "Clearly document pause conditions and recovery procedures",
      );
    }

    if (patterns.erc20Standard) {
      recommendations.push(
        "Ensure compliance with ERC20 standard and implement proper decimal handling",
      );
      recommendations.push(
        "Consider implementing permit functionality (EIP-2612) for better UX",
      );
    }

    vulnerabilities.forEach((vuln) => {
      recommendations.push(`Address ${vuln.name}: ${vuln.description}`);
    });

    return [...new Set(recommendations)];
  }

  calculateOverallConfidence(patterns: DetectedPatterns): number {
    if (patterns.detailedPatterns.length === 0) return 0;

    const confidenceScores = patterns.detailedPatterns.map((pattern) => {
      switch (pattern.confidence) {
        case "high":
          return 0.9;
        case "medium":
          return 0.7;
        case "low":
          return 0.4;
        default:
          return 0.2;
      }
    });

    const averageConfidence =
      confidenceScores.reduce((sum, score) => sum + score, 0) /
      confidenceScores.length;

    const highConfidenceCount = patterns.detailedPatterns.filter(
      (p) => p.confidence === "high",
    ).length;
    const confidenceBoost = Math.min(highConfidenceCount * 0.05, 0.1);

    return Math.min(averageConfidence + confidenceBoost, 1.0);
  }
}

export const patternDetector = new PatternDetector();
