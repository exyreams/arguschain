import type { BytecodeAnalysis, ContractComparison } from "./processors";

export interface ExportOptions {
  format: "json" | "csv";
  includeRawBytecode?: boolean;
  includeMetadata?: boolean;
  includePatternAnalysis?: boolean;
  filename?: string;
}

export interface ExportMetadata {
  exportTime: string;
  version: string;
  network: string;
  analysisType: "single" | "multiple" | "transaction";
  totalContracts: number;
}

export class BytecodeExportUtils {
  static exportAnalysis(
    comparison: ContractComparison,
    options: ExportOptions = { format: "json" },
    metadata?: Partial<ExportMetadata>,
  ): void {
    const exportData = this.prepareExportData(comparison, options, metadata);

    if (options.format === "json") {
      this.downloadJSON(exportData, options.filename);
    } else {
      this.downloadCSV(exportData, options.filename);
    }
  }

  static exportSingleContract(
    analysis: BytecodeAnalysis,
    options: ExportOptions = { format: "json" },
    metadata?: Partial<ExportMetadata>,
  ): void {
    const exportData = this.prepareSingleContractData(
      analysis,
      options,
      metadata,
    );

    if (options.format === "json") {
      this.downloadJSON(exportData, options.filename);
    } else {
      this.downloadCSV(exportData, options.filename);
    }
  }

  static generateShareableURL(
    contractAddresses: string[],
    network: string,
    analysisType: "contracts" | "transaction" = "contracts",
    txHash?: string,
  ): string {
    const baseUrl = window.location.origin + "/bytecode-analysis";
    const params = new URLSearchParams();

    if (analysisType === "transaction" && txHash) {
      params.set("txHash", txHash);
    } else {
      params.set("addresses", contractAddresses.join(","));
    }

    params.set("network", network);

    return `${baseUrl}?${params.toString()}`;
  }

  private static prepareExportData(
    comparison: ContractComparison,
    options: ExportOptions,
    metadata?: Partial<ExportMetadata>,
  ) {
    const exportMetadata: ExportMetadata = {
      exportTime: new Date().toISOString(),
      version: "1.0.0",
      network: "mainnet",
      analysisType: "multiple",
      totalContracts: comparison.contracts.length,
      ...metadata,
    };

    const exportData: any = {
      metadata: exportMetadata,
      summary: {
        totalContracts: comparison.contracts.length,
        totalSimilarities: comparison.similarities.length,
        totalRelationships: comparison.relationships.length,
        averageSize:
          comparison.contracts.reduce((sum, c) => sum + c.size, 0) /
          comparison.contracts.length,
        standardsFound: [
          ...new Set(comparison.contracts.flatMap((c) => c.standards)),
        ],
        securityFeaturesFound: [
          ...new Set(comparison.contracts.flatMap((c) => c.security.features)),
        ],
        proxyContractsCount: comparison.contracts.filter((c) => c.proxy.isProxy)
          .length,
      },
      contracts: comparison.contracts.map((contract) =>
        this.formatContractForExport(contract, options),
      ),
      similarities: comparison.similarities,
      relationships: comparison.relationships,
    };

    if (options.includePatternAnalysis) {
      exportData.patternAnalysis = comparison.contracts.map((contract) => ({
        address: contract.address,
        patternAnalysis: contract.patternAnalysis,
      }));
    }

    return exportData;
  }

  private static prepareSingleContractData(
    analysis: BytecodeAnalysis,
    options: ExportOptions,
    metadata?: Partial<ExportMetadata>,
  ) {
    const exportMetadata: ExportMetadata = {
      exportTime: new Date().toISOString(),
      version: "1.0.0",
      network: "mainnet",
      analysisType: "single",
      totalContracts: 1,
      ...metadata,
    };

    return {
      metadata: exportMetadata,
      contract: this.formatContractForExport(analysis, options),
    };
  }

  private static formatContractForExport(
    contract: BytecodeAnalysis,
    options: ExportOptions,
  ) {
    const formatted: any = {
      address: contract.address,
      contractName: contract.contractName,
      size: contract.size,
      sizeFormatted: this.formatBytes(contract.size),
      standards: contract.standards,
      functions: contract.functions,
      patterns: contract.patterns,
      complexity: contract.complexity,
      security: contract.security,
      proxy: contract.proxy,
      metadata: contract.metadata,
    };

    if (options.includePatternAnalysis && contract.patternAnalysis) {
      formatted.patternAnalysis = contract.patternAnalysis;
    }

    if (contract.gasOptimizations) {
      formatted.gasOptimizations = contract.gasOptimizations;
    }

    if (contract.standardsCompliance) {
      formatted.standardsCompliance = contract.standardsCompliance;
    }

    return formatted;
  }

  private static downloadJSON(data: any, filename?: string): void {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });

    const defaultFilename = `bytecode-analysis-${new Date().toISOString().split("T")[0]}.json`;
    this.downloadBlob(blob, filename || defaultFilename);
  }

  private static downloadCSV(data: any, filename?: string): void {
    let csvContent = "";

    if (data.contracts) {
      csvContent += "Contract Analysis Summary\n";
      csvContent +=
        "Address,Name,Size (bytes),Size (formatted),Standards,Functions Count,Complexity Level,Complexity Score,Security Features,Is Proxy,Proxy Type\n";

      data.contracts.forEach((contract: any) => {
        csvContent +=
          [
            contract.address,
            `"${contract.contractName}"`,
            contract.size,
            contract.sizeFormatted,
            `"${contract.standards.join(", ")}"`,
            contract.functions.length,
            contract.complexity.level,
            contract.complexity.score,
            `"${contract.security.features.join(", ")}"`,
            contract.proxy.isProxy,
            `"${contract.proxy.type || ""}"`,
          ].join(",") + "\n";
      });

      csvContent += "\n";
    }

    if (data.contracts) {
      csvContent += "Detected Functions\n";
      csvContent +=
        "Contract Address,Contract Name,Signature,Function Name,Category\n";

      data.contracts.forEach((contract: any) => {
        contract.functions.forEach((func: any) => {
          csvContent +=
            [
              contract.address,
              `"${contract.contractName}"`,
              func.signature,
              `"${func.name}"`,
              func.category,
            ].join(",") + "\n";
        });
      });

      csvContent += "\n";
    }

    if (data.similarities) {
      csvContent += "Contract Similarities\n";
      csvContent +=
        "Contract A,Contract B,Similarity (%),Shared Functions,Total Functions\n";

      data.similarities.forEach((sim: any) => {
        csvContent +=
          [
            sim.contractA,
            sim.contractB,
            sim.similarity,
            sim.sharedFunctions,
            sim.totalFunctions,
          ].join(",") + "\n";
      });
    }

    const blob = new Blob([csvContent], { type: "text/csv" });
    const defaultFilename = `bytecode-analysis-${new Date().toISOString().split("T")[0]}.csv`;
    this.downloadBlob(blob, filename || defaultFilename);
  }

  private static downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private static formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }

  static generateSummaryReport(comparison: ContractComparison): string {
    const report = [];

    report.push("# Bytecode Analysis Summary Report");
    report.push(`Generated: ${new Date().toLocaleString()}`);
    report.push("");

    report.push("## Overview");
    report.push(`- Total Contracts: ${comparison.contracts.length}`);
    report.push(
      `- Average Size: ${this.formatBytes(comparison.contracts.reduce((sum, c) => sum + c.size, 0) / comparison.contracts.length)}`,
    );
    report.push(
      `- Standards Found: ${[...new Set(comparison.contracts.flatMap((c) => c.standards))].join(", ") || "None"}`,
    );
    report.push(
      `- Proxy Contracts: ${comparison.contracts.filter((c) => c.proxy.isProxy).length}`,
    );
    report.push("");

    report.push("## Contract Details");
    comparison.contracts.forEach((contract) => {
      report.push(`### ${contract.contractName}`);
      report.push(`- Address: ${contract.address}`);
      report.push(`- Size: ${this.formatBytes(contract.size)}`);
      report.push(
        `- Complexity: ${contract.complexity.level} (${contract.complexity.score}/100)`,
      );
      report.push(`- Standards: ${contract.standards.join(", ") || "None"}`);
      report.push(`- Functions: ${contract.functions.length}`);
      report.push(
        `- Security Features: ${contract.security.features.join(", ") || "None"}`,
      );
      if (contract.proxy.isProxy) {
        report.push(`- Proxy Type: ${contract.proxy.type}`);
      }
      report.push("");
    });

    if (comparison.similarities.length > 0) {
      report.push("## Contract Similarities");
      comparison.similarities.forEach((sim) => {
        report.push(
          `- ${sim.contractA} ↔ ${sim.contractB}: ${sim.similarity.toFixed(1)}% similar`,
        );
      });
      report.push("");
    }

    if (comparison.relationships.length > 0) {
      report.push("## Detected Relationships");
      comparison.relationships.forEach((rel) => {
        report.push(`- ${rel.type}: ${rel.description}`);
      });
    }

    return report.join("\n");
  }
}
