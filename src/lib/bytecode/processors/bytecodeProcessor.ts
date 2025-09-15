import {
  EnhancedPatternDetector,
  type PatternAnalysisResult,
} from "@/lib/bytecode";

export const ERC20_SIGNATURES = {
  "0x70a08231": "balanceOf(address)",
  "0xa9059cbb": "transfer(address,uint256)",
  "0x23b872dd": "transferFrom(address,address,uint256)",
  "0x095ea7b3": "approve(address,uint256)",
  "0xdd62ed3e": "allowance(address,address)",
  "0x18160ddd": "totalSupply()",
  "0x06fdde03": "name()",
  "0x95d89b41": "symbol()",
  "0x313ce567": "decimals()",
};

export const ERC721_SIGNATURES = {
  "0x70a08231": "balanceOf(address)",
  "0x6352211e": "ownerOf(uint256)",
  "0x42842e0e": "safeTransferFrom(address,address,uint256)",
  "0xb88d4fde": "safeTransferFrom(address,address,uint256,bytes)",
  "0x23b872dd": "transferFrom(address,address,uint256)",
  "0x095ea7b3": "approve(address,uint256)",
  "0xa22cb465": "setApprovalForAll(address,bool)",
  "0x081812fc": "getApproved(uint256)",
  "0xe985e9c5": "isApprovedForAll(address,address)",
};

export const PROXY_SIGNATURES = {
  "0x5c60da1b": "implementation()",
  "0x3659cfe6": "upgradeTo(address)",
  "0x4f1ef286": "upgradeToAndCall(address,bytes)",
  "0xf851a440": "admin()",
  "0x3659cfe6": "upgradeTo(address)",
};

export const SECURITY_SIGNATURES = {
  "0x8456cb59": "pause()",
  "0x3f4ba83a": "unpause()",
  "0x5c975abb": "paused()",
  "0x8da5cb5b": "owner()",
  "0xf2fde38b": "transferOwnership(address)",
  "0x715018a6": "renounceOwnership()",
};

export interface BytecodeAnalysis {
  address: string;
  contractName: string;
  size: number;
  standards: string[];
  functions: DetectedFunction[];
  patterns: string[];
  complexity: {
    estimate: number;
    level: "Low" | "Medium" | "High";
    score: number;
  };
  security: {
    hasControls: boolean;
    features: string[];
  };
  proxy: {
    isProxy: boolean;
    type?: string;
  };
  metadata: {
    hasMetadata: boolean;
    ipfsHash?: string;
  };

  patternAnalysis?: PatternAnalysisResult;
  gasOptimizations: string[];
  standardsCompliance: {
    standard: string;
    compliance: number;
    missingFunctions: string[];
    extraFunctions: string[];
  }[];
}

export interface DetectedFunction {
  signature: string;
  name: string;
  category: string;
}

export interface OptimizationMetadata {
  virtualizedItems: number;
  streamingEnabled: boolean;
  batchSize: number;
  workersEnabled: boolean;
  optimizedAt: string;
}

export interface ContractComparison {
  contracts: BytecodeAnalysis[];
  similarities: SimilarityMetric[];
  relationships: ContractRelationship[];
  optimizationMetadata?: OptimizationMetadata;
}

export interface SimilarityMetric {
  contractA: string;
  contractB: string;
  similarity: number;
  sharedFunctions: number;
  totalFunctions: number;
}

export interface ContractRelationship {
  type: "proxy-implementation" | "similar" | "related";
  contracts: string[];
  description: string;
  confidence?: number;
}

export class BytecodeProcessor {
  private allKnownSignatures: Record<string, string>;
  private patternDetector: EnhancedPatternDetector;

  constructor() {
    this.allKnownSignatures = {
      ...ERC20_SIGNATURES,
      ...ERC721_SIGNATURES,
      ...PROXY_SIGNATURES,
      ...SECURITY_SIGNATURES,
    };
    this.patternDetector = new EnhancedPatternDetector();
  }

  analyzeBytecode(
    bytecode: string,
    address: string,
    contractName?: string,
  ): BytecodeAnalysis {
    const code = bytecode.startsWith("0x") ? bytecode.slice(2) : bytecode;
    const size = code.length / 2;

    const signatures = this.extractFunctionSignatures(code);
    const detectedFunctions = this.identifyFunctions(signatures);

    const standards = this.identifyStandards(detectedFunctions);

    const patterns = this.detectPatterns(code, detectedFunctions);

    const security = this.analyzeSecurity(detectedFunctions);

    const proxy = this.analyzeProxy(detectedFunctions, code);

    const metadata = this.analyzeMetadata(code);

    const complexity = this.estimateComplexity(size, detectedFunctions.length);

    const patternAnalysis = this.patternDetector.analyzePatterns(bytecode);

    const enhancedFunctions = this.mergeDetectedFunctions(
      detectedFunctions,
      patternAnalysis.detectedPatterns,
    );

    const enhancedStandards = patternAnalysis.standardsCompliance.map(
      (s) => s.standard,
    );
    const finalStandards = [...new Set([...standards, ...enhancedStandards])];

    const enhancedSecurity = {
      hasControls:
        patternAnalysis.securityFeatures.length > 0 || security.hasControls,
      features: [
        ...new Set([...security.features, ...patternAnalysis.securityFeatures]),
      ],
    };

    const enhancedProxy = {
      isProxy: !!patternAnalysis.proxyType || proxy.isProxy,
      type: patternAnalysis.proxyType || proxy.type,
    };

    const enhancedComplexity = {
      estimate: complexity.estimate,
      level: this.getComplexityLevel(patternAnalysis.complexityScore),
      score: patternAnalysis.complexityScore,
    };

    return {
      address,
      contractName:
        contractName || `Contract (${this.shortenAddress(address)})`,
      size,
      standards: finalStandards,
      functions: enhancedFunctions,
      patterns,
      complexity: enhancedComplexity,
      security: enhancedSecurity,
      proxy: enhancedProxy,
      metadata,
      patternAnalysis,
      gasOptimizations: patternAnalysis.gasOptimizationFeatures,
      standardsCompliance: patternAnalysis.standardsCompliance,
    };
  }

  compareContracts(analyses: BytecodeAnalysis[]): ContractComparison {
    const similarities: SimilarityMetric[] = [];
    const relationships: ContractRelationship[] = [];

    for (let i = 0; i < analyses.length; i++) {
      for (let j = i + 1; j < analyses.length; j++) {
        const similarity = this.calculateSimilarity(analyses[i], analyses[j]);
        similarities.push(similarity);

        const relationship = this.detectRelationship(analyses[i], analyses[j]);
        if (relationship) {
          relationships.push(relationship);
        }
      }
    }

    return {
      contracts: analyses,
      similarities: similarities.sort((a, b) => b.similarity - a.similarity),
      relationships,
    };
  }

  private extractFunctionSignatures(code: string): string[] {
    const signaturePattern = /63([0-9a-f]{8})/gi;
    const matches = code.match(signaturePattern) || [];

    return matches
      .map((match) => `0x${match.slice(2)}`)
      .filter((sig, index, arr) => arr.indexOf(sig) === index);
  }

  private identifyFunctions(signatures: string[]): DetectedFunction[] {
    const functions: DetectedFunction[] = [];

    signatures.forEach((signature) => {
      if (this.allKnownSignatures[signature]) {
        const category = this.categorizeFunction(signature);
        functions.push({
          signature,
          name: this.allKnownSignatures[signature],
          category,
        });
      }
    });

    return functions.sort((a, b) => a.category.localeCompare(b.category));
  }

  private categorizeFunction(signature: string): string {
    if (ERC20_SIGNATURES[signature]) return "ERC20";
    if (ERC721_SIGNATURES[signature]) return "ERC721";
    if (PROXY_SIGNATURES[signature]) return "Proxy";
    if (SECURITY_SIGNATURES[signature]) return "Security";
    return "Unknown";
  }

  private identifyStandards(functions: DetectedFunction[]): string[] {
    const standards: string[] = [];
    const categories = functions.reduce(
      (acc, func) => {
        acc[func.category] = (acc[func.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    if (categories.ERC20 >= 5) standards.push("ERC20");
    if (categories.ERC721 >= 4) standards.push("ERC721");

    return standards;
  }

  private detectPatterns(
    code: string,
    functions: DetectedFunction[],
  ): string[] {
    const patterns: string[] = [];

    if (code.includes("create2")) patterns.push("CREATE2 Usage");
    if (code.includes("selfdestruct")) patterns.push("Self-Destruct");
    if (functions.some((f) => f.category === "Proxy"))
      patterns.push("Proxy Pattern");
    if (functions.some((f) => f.name.includes("pause")))
      patterns.push("Pausable");
    if (functions.some((f) => f.name.includes("owner")))
      patterns.push("Ownable");

    return patterns;
  }

  private analyzeSecurity(functions: DetectedFunction[]): {
    hasControls: boolean;
    features: string[];
  } {
    const securityFunctions = functions.filter(
      (f) => f.category === "Security",
    );
    const features = securityFunctions.map((f) => f.name);

    return {
      hasControls: securityFunctions.length > 0,
      features,
    };
  }

  private analyzeProxy(
    functions: DetectedFunction[],
    code: string,
  ): {
    isProxy: boolean;
    type?: string;
  } {
    const proxyFunctions = functions.filter((f) => f.category === "Proxy");

    if (proxyFunctions.length === 0) {
      return { isProxy: false };
    }

    let type = "Unknown Proxy";

    if (proxyFunctions.some((f) => f.name.includes("implementation"))) {
      type = "Transparent Proxy";
    }
    if (proxyFunctions.some((f) => f.name.includes("upgradeTo"))) {
      type = "UUPS Proxy";
    }

    return {
      isProxy: true,
      type,
    };
  }

  private analyzeMetadata(code: string): {
    hasMetadata: boolean;
    ipfsHash?: string;
  } {
    const metadataPattern = /a264697066735822([0-9a-f]{64})/i;
    const match = code.match(metadataPattern);

    return {
      hasMetadata: !!match,
      ipfsHash: match ? match[1] : undefined,
    };
  }

  private estimateComplexity(
    size: number,
    functionCount: number,
  ): {
    estimate: number;
    level: "Low" | "Medium" | "High";
  } {
    const estimate = Math.max(1, Math.floor(size / 200) + functionCount);

    let level: "Low" | "Medium" | "High";
    if (estimate < 10) level = "Low";
    else if (estimate < 50) level = "Medium";
    else level = "High";

    return { estimate, level };
  }

  private calculateSimilarity(
    contractA: BytecodeAnalysis,
    contractB: BytecodeAnalysis,
  ): SimilarityMetric {
    const signaturesA = new Set(contractA.functions.map((f) => f.signature));
    const signaturesB = new Set(contractB.functions.map((f) => f.signature));

    const intersection = new Set(
      [...signaturesA].filter((x) => signaturesB.has(x)),
    );
    const union = new Set([...signaturesA, ...signaturesB]);

    const similarity =
      union.size > 0 ? (intersection.size / union.size) * 100 : 0;

    return {
      contractA: contractA.address,
      contractB: contractB.address,
      similarity: Math.round(similarity * 100) / 100,
      sharedFunctions: intersection.size,
      totalFunctions: union.size,
    };
  }

  private detectRelationship(
    contractA: BytecodeAnalysis,
    contractB: BytecodeAnalysis,
  ): ContractRelationship | null {
    if (
      contractA.proxy.isProxy &&
      !contractB.proxy.isProxy &&
      contractA.size < contractB.size
    ) {
      return {
        type: "proxy-implementation",
        contracts: [contractA.address, contractB.address],
        description: `${contractA.contractName} appears to be a proxy for ${contractB.contractName}`,
        confidence: 0.95,
      };
    }

    if (
      contractB.proxy.isProxy &&
      !contractA.proxy.isProxy &&
      contractB.size < contractA.size
    ) {
      return {
        type: "proxy-implementation",
        contracts: [contractB.address, contractA.address],
        description: `${contractB.contractName} appears to be a proxy for ${contractA.contractName}`,
        confidence: 0.95,
      };
    }

    const similarity = this.calculateSimilarity(contractA, contractB);
    if (similarity.similarity > 80) {
      return {
        type: "similar",
        contracts: [contractA.address, contractB.address],
        description: `Contracts share ${similarity.similarity}% function similarity`,
        confidence: similarity.similarity / 100,
      };
    }

    return null;
  }

  private mergeDetectedFunctions(
    legacyFunctions: DetectedFunction[],
    enhancedPatterns: any[],
  ): DetectedFunction[] {
    const functionMap = new Map<string, DetectedFunction>();

    legacyFunctions.forEach((func) => {
      functionMap.set(func.signature, func);
    });

    enhancedPatterns.forEach((pattern) => {
      functionMap.set(pattern.signature, {
        signature: pattern.signature,
        name: pattern.name,
        category: pattern.category,
      });
    });

    return Array.from(functionMap.values()).sort((a, b) =>
      a.category.localeCompare(b.category),
    );
  }

  private getComplexityLevel(score: number): "Low" | "Medium" | "High" {
    if (score < 30) return "Low";
    if (score < 70) return "Medium";
    return "High";
  }

  private shortenAddress(address: string, chars: number = 4): string {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 2 + chars)}...${address.slice(-chars)}`;
  }
}
