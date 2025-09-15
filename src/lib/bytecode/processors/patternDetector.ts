export const ENHANCED_ERC20_SIGNATURES = {
  "0x70a08231": "balanceOf(address)",
  "0xa9059cbb": "transfer(address,uint256)",
  "0x23b872dd": "transferFrom(address,address,uint256)",
  "0x095ea7b3": "approve(address,uint256)",
  "0xdd62ed3e": "allowance(address,address)",
  "0x18160ddd": "totalSupply()",
  "0x06fdde03": "name()",
  "0x95d89b41": "symbol()",
  "0x313ce567": "decimals()",

  "0x39509351": "increaseAllowance(address,uint256)",
  "0xa457c2d7": "decreaseAllowance(address,uint256)",
  "0x40c10f19": "mint(address,uint256)",
  "0x42966c68": "burn(uint256)",
  "0x79cc6790": "burnFrom(address,uint256)",
  "0x9dc29fac": "mint(address,uint256)",
};

export const ENHANCED_ERC721_SIGNATURES = {
  "0x70a08231": "balanceOf(address)",
  "0x6352211e": "ownerOf(uint256)",
  "0x42842e0e": "safeTransferFrom(address,address,uint256)",
  "0xb88d4fde": "safeTransferFrom(address,address,uint256,bytes)",
  "0x23b872dd": "transferFrom(address,address,uint256)",
  "0x095ea7b3": "approve(address,uint256)",
  "0xa22cb465": "setApprovalForAll(address,bool)",
  "0x081812fc": "getApproved(uint256)",
  "0xe985e9c5": "isApprovedForAll(address,address)",

  "0xc87b56dd": "tokenURI(uint256)",
  "0x4f6ccce7": "tokenByIndex(uint256)",
  "0x2f745c59": "tokenOfOwnerByIndex(address,uint256)",
  "0x01ffc9a7": "supportsInterface(bytes4)",
  "0x40c10f19": "mint(address,uint256)",
  "0x42966c68": "burn(uint256)",
};

export const ENHANCED_ERC1155_SIGNATURES = {
  "0x00fdd58e": "balanceOf(address,uint256)",
  "0x4e1273f4": "balanceOfBatch(address[],uint256[])",
  "0xf242432a": "safeTransferFrom(address,address,uint256,uint256,bytes)",
  "0x2eb2c2d6":
    "safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)",
  "0xa22cb465": "setApprovalForAll(address,bool)",
  "0xe985e9c5": "isApprovedForAll(address,address)",
  "0x0e89341c": "uri(uint256)",
  "0x01ffc9a7": "supportsInterface(bytes4)",
};

export const ENHANCED_PROXY_SIGNATURES = {
  "0x5c60da1b": "implementation()",
  "0x3659cfe6": "upgradeTo(address)",
  "0x4f1ef286": "upgradeToAndCall(address,bytes)",
  "0xf851a440": "admin()",
  "0x8f283970": "changeAdmin(address)",
  "0x52d1902d": "proxiableUUID()",
  "0xa3f4df7e": "beacon()",
  "0xcdffacc6": "facetAddress(bytes4)",
  "0x52ef6b2c": "facetAddresses()",
  "0xadfca15e": "facetFunctionSelectors(address)",
  "0x7a0ed627": "facets()",
  "0x01ffc9a7": "supportsInterface(bytes4)",
};

export const ENHANCED_SECURITY_SIGNATURES = {
  "0x8da5cb5b": "owner()",
  "0xf2fde38b": "transferOwnership(address)",
  "0x715018a6": "renounceOwnership()",

  "0x8456cb59": "pause()",
  "0x3f4ba83a": "unpause()",
  "0x5c975abb": "paused()",

  "0x248a9ca3": "getRoleAdmin(bytes32)",
  "0x2f2ff15d": "grantRole(bytes32,address)",
  "0xd547741f": "revokeRole(bytes32,address)",
  "0x91d14854": "hasRole(bytes32,address)",
  "0x36568abe": "renounceRole(bytes32,address)",

  "0x6ef8d66d": "nonReentrant()",

  "0xc6427474": "confirmTransaction(uint256)",
  "0xc01a8c84": "executeTransaction(uint256)",
  "0xa0e67e2b": "revokeConfirmation(uint256)",
};

export const DEFI_SIGNATURES = {
  "0x022c0d9f": "swap(uint256,uint256,address,bytes)",
  "0x89afcb44":
    "addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256)",
  "0xbaa2abde":
    "removeLiquidity(address,address,uint256,uint256,uint256,address,uint256)",

  "0x414bf389":
    "exactInputSingle((address,address,uint24,address,uint256,uint256,uint256,uint160))",
  "0xc04b8d59": "exactInput((bytes,address,uint256,uint256,uint256))",

  "0xa0712d68": "mint(uint256)",
  "0xdb006a75": "redeem(uint256)",
  "0x852a12e3": "redeemUnderlying(uint256)",
  "0xf2b3abbd": "repayBorrow(uint256)",
  "0x4e4d9fea": "liquidateBorrow(address,uint256,address)",

  "0x69328dec": "deposit(address,uint256,address,uint16)",
  "0x617ba037": "withdraw(address,uint256,address)",
  "0xa415bcad": "borrow(address,uint256,uint256,uint16,address)",
  "0x563dd613": "repay(address,uint256,uint256,address)",
};

export const GAS_OPTIMIZATION_SIGNATURES = {
  "0x70a08231": "balanceOf(address)",
  "0xa9059cbb": "transfer(address,uint256)",

  "0x1f4e1ef9": "batchTransfer(address[],uint256[])",
  "0x88d695b2": "batchCall(bytes[])",

  "0xac9650d8": "multicall(bytes[])",
  "0x5ae401dc": "multicall(uint256,bytes[])",
};

export interface PatternDetectionResult {
  signature: string;
  name: string;
  category: string;
  confidence: number;
  metadata?: {
    standard?: string;
    version?: string;
    description?: string;
  };
}

export interface PatternAnalysisResult {
  totalSignatures: number;
  detectedPatterns: PatternDetectionResult[];
  standardsCompliance: {
    standard: string;
    compliance: number;
    missingFunctions: string[];
    extraFunctions: string[];
  }[];
  securityFeatures: string[];
  proxyType?: string;
  complexityScore: number;
  gasOptimizationFeatures: string[];
}

export class EnhancedPatternDetector {
  private allSignatures: Record<
    string,
    { name: string; category: string; metadata?: any }
  >;

  constructor() {
    this.allSignatures = {
      ...this.mapSignatures(ENHANCED_ERC20_SIGNATURES, "ERC20", {
        standard: "ERC-20",
      }),
      ...this.mapSignatures(ENHANCED_ERC721_SIGNATURES, "ERC721", {
        standard: "ERC-721",
      }),
      ...this.mapSignatures(ENHANCED_ERC1155_SIGNATURES, "ERC1155", {
        standard: "ERC-1155",
      }),
      ...this.mapSignatures(ENHANCED_PROXY_SIGNATURES, "Proxy"),
      ...this.mapSignatures(ENHANCED_SECURITY_SIGNATURES, "Security"),
      ...this.mapSignatures(DEFI_SIGNATURES, "DeFi"),
      ...this.mapSignatures(GAS_OPTIMIZATION_SIGNATURES, "Gas Optimization"),
    };
  }

  private mapSignatures(
    signatures: Record<string, string>,
    category: string,
    metadata?: any
  ): Record<string, { name: string; category: string; metadata?: any }> {
    const mapped: Record<
      string,
      { name: string; category: string; metadata?: any }
    > = {};
    for (const [sig, name] of Object.entries(signatures)) {
      mapped[sig] = { name, category, metadata };
    }
    return mapped;
  }

  extractSignatures(bytecode: string): string[] {
    const code = bytecode.startsWith("0x") ? bytecode.slice(2) : bytecode;

    const signatures = new Set<string>();

    const push4Pattern = /63([0-9a-f]{8})/gi;
    let match;
    while ((match = push4Pattern.exec(code)) !== null) {
      signatures.add(`0x${match[1]}`);
    }

    const dispatcherPattern = /80600435(?:10|11|14)([0-9a-f]{8})/gi;
    while ((match = dispatcherPattern.exec(code)) !== null) {
      signatures.add(`0x${match[1]}`);
    }

    const jumpTablePattern = /5b80600435(?:80|81|82|83)([0-9a-f]{8})/gi;
    while ((match = jumpTablePattern.exec(code)) !== null) {
      signatures.add(`0x${match[1]}`);
    }

    return Array.from(signatures);
  }

  analyzePatterns(bytecode: string): PatternAnalysisResult {
    const signatures = this.extractSignatures(bytecode);
    const detectedPatterns: PatternDetectionResult[] = [];

    for (const signature of signatures) {
      if (this.allSignatures[signature]) {
        const sigData = this.allSignatures[signature];
        detectedPatterns.push({
          signature,
          name: sigData.name,
          category: sigData.category,
          confidence: this.calculateConfidence(signature, bytecode),
          metadata: sigData.metadata,
        });
      }
    }

    const standardsCompliance =
      this.analyzeStandardsCompliance(detectedPatterns);

    const securityFeatures = this.detectSecurityFeatures(detectedPatterns);

    const proxyType = this.detectProxyType(detectedPatterns, bytecode);

    const complexityScore = this.calculateComplexityScore(
      bytecode,
      detectedPatterns
    );

    const gasOptimizationFeatures = this.detectGasOptimizations(
      detectedPatterns,
      bytecode
    );

    return {
      totalSignatures: signatures.length,
      detectedPatterns: detectedPatterns.sort(
        (a, b) => b.confidence - a.confidence
      ),
      standardsCompliance,
      securityFeatures,
      proxyType,
      complexityScore,
      gasOptimizationFeatures,
    };
  }

  private calculateConfidence(signature: string, bytecode: string): number {
    let confidence = 0.7;

    const code = bytecode.toLowerCase();

    if (code.includes(signature.slice(2))) {
      confidence += 0.2;
    }

    if (signature === "0x70a08231" && code.includes("balanceof")) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  private analyzeStandardsCompliance(patterns: PatternDetectionResult[]) {
    const standards = [
      {
        name: "ERC20",
        required: [
          "0x70a08231",
          "0xa9059cbb",
          "0x23b872dd",
          "0x095ea7b3",
          "0xdd62ed3e",
          "0x18160ddd",
        ],
        optional: ["0x06fdde03", "0x95d89b41", "0x313ce567"],
      },
      {
        name: "ERC721",
        required: [
          "0x70a08231",
          "0x6352211e",
          "0x23b872dd",
          "0x42842e0e",
          "0xa22cb465",
        ],
        optional: ["0xc87b56dd", "0x01ffc9a7"],
      },
      {
        name: "ERC1155",
        required: [
          "0x00fdd58e",
          "0x4e1273f4",
          "0xf242432a",
          "0x2eb2c2d6",
          "0xa22cb465",
        ],
        optional: ["0x0e89341c", "0x01ffc9a7"],
      },
    ];

    const detectedSigs = new Set(patterns.map((p) => p.signature));

    return standards
      .map((standard) => {
        const requiredFound = standard.required.filter((sig) =>
          detectedSigs.has(sig)
        );
        const compliance = requiredFound.length / standard.required.length;

        return {
          standard: standard.name,
          compliance: Math.round(compliance * 100),
          missingFunctions: standard.required
            .filter((sig) => !detectedSigs.has(sig))
            .map((sig) => this.allSignatures[sig]?.name || sig),
          extraFunctions: standard.optional
            .filter((sig) => detectedSigs.has(sig))
            .map((sig) => this.allSignatures[sig]?.name || sig),
        };
      })
      .filter((result) => result.compliance > 0);
  }

  private detectSecurityFeatures(patterns: PatternDetectionResult[]): string[] {
    const features: string[] = [];
    const securityPatterns = patterns.filter((p) => p.category === "Security");

    if (securityPatterns.some((p) => p.name.includes("owner"))) {
      features.push("Ownable");
    }
    if (securityPatterns.some((p) => p.name.includes("pause"))) {
      features.push("Pausable");
    }
    if (securityPatterns.some((p) => p.name.includes("Role"))) {
      features.push("Access Control");
    }
    if (securityPatterns.some((p) => p.name.includes("nonReentrant"))) {
      features.push("Reentrancy Guard");
    }

    return features;
  }

  private detectProxyType(
    patterns: PatternDetectionResult[],
    bytecode: string
  ): string | undefined {
    const proxyPatterns = patterns.filter((p) => p.category === "Proxy");

    if (proxyPatterns.length === 0) return undefined;

    const code = bytecode.toLowerCase();

    if (proxyPatterns.some((p) => p.name.includes("facet"))) {
      return "Diamond Proxy (EIP-2535)";
    }

    if (proxyPatterns.some((p) => p.name.includes("proxiableUUID"))) {
      return "UUPS Proxy (EIP-1822)";
    }

    if (proxyPatterns.some((p) => p.name.includes("beacon"))) {
      return "Beacon Proxy";
    }

    if (proxyPatterns.some((p) => p.name.includes("implementation"))) {
      return "Transparent Proxy (EIP-1967)";
    }

    return "Unknown Proxy Pattern";
  }

  private calculateComplexityScore(
    bytecode: string,
    patterns: PatternDetectionResult[]
  ): number {
    const size = (bytecode.length - 2) / 2;
    const functionCount = patterns.length;

    let complexity = Math.log10(size) * 10 + functionCount * 2;

    if (patterns.some((p) => p.category === "Proxy")) {
      complexity *= 0.7;
    }

    if (patterns.some((p) => p.category === "DeFi")) {
      complexity *= 1.3;
    }

    return Math.round(Math.min(complexity, 100));
  }

  private detectGasOptimizations(
    patterns: PatternDetectionResult[],
    bytecode: string
  ): string[] {
    const optimizations: string[] = [];
    const code = bytecode.toLowerCase();

    if (code.includes("3d3d3d3d") || code.includes("5afa")) {
      optimizations.push("Assembly Optimizations");
    }

    if (
      patterns.some((p) => p.name.includes("batch") || p.name.includes("multi"))
    ) {
      optimizations.push("Batch Operations");
    }

    if (code.includes("60") && code.includes("52")) {
      optimizations.push("Packed Storage");
    }

    if (code.includes("f5")) {
      optimizations.push("CREATE2 Deployment");
    }

    return optimizations;
  }
}
