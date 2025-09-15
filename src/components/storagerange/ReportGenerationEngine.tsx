import React, { useCallback, useMemo, useState } from "react";
import { Card } from "@/components/global/Card";
import { Button } from "@/components/global/Button";
import { Input } from "@/components/global/Input";
import { Badge } from "@/components/global/Badge";
import {
  BarChart3,
  Download,
  Eye,
  FileText,
  GitCompare,
  Settings,
  Shield,
} from "lucide-react";

interface ReportGenerationEngineProps {
  data: {
    storageSlots?: any[];
    analysisResults?: any[];
    securityFindings?: any[];
    comparisonData?: any[];
    tokenMetrics?: any;
  };
  metadata: {
    contractAddress: string;
    blockHash: string;
    analysisDate: Date;
    analysisType: string;
  };
  onReportGenerated?: (report: GeneratedReport) => void;
  className?: string;
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: "executive" | "security" | "technical" | "comparative" | "custom";
  sections: ReportSection[];
  styling: ReportStyling;
  isDefault: boolean;
}

interface ReportSection {
  id: string;
  title: string;
  type: "summary" | "chart" | "table" | "text" | "findings" | "recommendations";
  content: any;
  enabled: boolean;
  order: number;
}

interface ReportStyling {
  theme: "professional" | "modern" | "minimal";
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  layout: "single_column" | "two_column" | "dashboard";
}

interface GeneratedReport {
  id: string;
  title: string;
  template: string;
  content: string;
  format: "html" | "pdf" | "markdown";
  generatedAt: Date;
  metadata: any;
}

export const ReportGenerationEngine: React.FC<ReportGenerationEngineProps> = ({
  data,
  metadata,
  onReportGenerated,
  className = "",
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [customSections, setCustomSections] = useState<ReportSection[]>([]);
  const [reportTitle, setReportTitle] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const reportTemplates: ReportTemplate[] = useMemo(
    () => [
      {
        id: "executive-summary",
        name: "Executive Summary",
        description: "High-level overview for executives and stakeholders",
        type: "executive",
        sections: [
          {
            id: "exec-overview",
            title: "Executive Overview",
            type: "summary",
            content: { includeKeyMetrics: true, includeRiskLevel: true },
            enabled: true,
            order: 1,
          },
          {
            id: "key-findings",
            title: "Key Findings",
            type: "findings",
            content: { maxFindings: 5, priorityOnly: true },
            enabled: true,
            order: 2,
          },
          {
            id: "risk-assessment",
            title: "Risk Assessment",
            type: "chart",
            content: { chartType: "risk_radar" },
            enabled: true,
            order: 3,
          },
          {
            id: "recommendations",
            title: "Strategic Recommendations",
            type: "recommendations",
            content: { maxRecommendations: 3, executiveLevel: true },
            enabled: true,
            order: 4,
          },
        ],
        styling: {
          theme: "professional",
          colors: {
            primary: "#1f2937",
            secondary: "#6b7280",
            accent: "#3b82f6",
          },
          fonts: { heading: "Inter", body: "Inter" },
          layout: "single_column",
        },
        isDefault: true,
      },
      {
        id: "security-report",
        name: "Security Analysis Report",
        description: "Detailed security assessment with technical findings",
        type: "security",
        sections: [
          {
            id: "security-overview",
            title: "Security Overview",
            type: "summary",
            content: { focusArea: "security" },
            enabled: true,
            order: 1,
          },
          {
            id: "vulnerability-findings",
            title: "Security Findings",
            type: "findings",
            content: { securityOnly: true, includeSeverity: true },
            enabled: true,
            order: 2,
          },
          {
            id: "risk-matrix",
            title: "Risk Matrix",
            type: "chart",
            content: { chartType: "risk_matrix" },
            enabled: true,
            order: 3,
          },
          {
            id: "mitigation-steps",
            title: "Mitigation Recommendations",
            type: "recommendations",
            content: { securityFocused: true, includePriority: true },
            enabled: true,
            order: 4,
          },
        ],
        styling: {
          theme: "modern",
          colors: {
            primary: "#dc2626",
            secondary: "#991b1b",
            accent: "#f59e0b",
          },
          fonts: { heading: "Inter", body: "Inter" },
          layout: "two_column",
        },
        isDefault: true,
      },
    ],
    [],
  );

  const generateExecutiveSummary = useCallback(() => {
    const totalSlots = data.storageSlots?.length || 0;
    const securityFindings = data.securityFindings?.length || 0;
    const criticalFindings =
      data.securityFindings?.filter((f) => f.severity === "critical").length ||
      0;

    return {
      overview: `Analysis of contract ${metadata.contractAddress.slice(0, 8)}... reveals ${totalSlots} storage slots with ${securityFindings} security findings identified.`,
      keyMetrics: {
        totalSlots,
        securityFindings,
        criticalFindings,
        riskLevel:
          criticalFindings > 0
            ? "High"
            : securityFindings > 5
              ? "Medium"
              : "Low",
      },
      summary:
        criticalFindings > 0
          ? "Immediate attention required due to critical security findings."
          : "Contract shows acceptable security posture with minor recommendations.",
    };
  }, [data, metadata]);

  const generateKeyFindings = useCallback(
    (maxFindings: number = 5) => {
      const findings = [];

      if (data.securityFindings && data.securityFindings.length > 0) {
        findings.push({
          type: "security",
          title: "Security Vulnerabilities Detected",
          description: `${data.securityFindings.length} security findings identified, including ${data.securityFindings.filter((f) => f.severity === "critical").length} critical issues.`,
          severity: "high",
        });
      }

      if (data.storageSlots) {
        const proxySlots = data.storageSlots.filter(
          (s) => s.category === "proxy",
        ).length;
        if (proxySlots > 0) {
          findings.push({
            type: "architecture",
            title: "Proxy Pattern Detected",
            description: `Contract implements proxy pattern with ${proxySlots} proxy-related storage slots.`,
            severity: "medium",
          });
        }

        const supplySlots = data.storageSlots.filter(
          (s) => s.category === "supply",
        ).length;
        if (supplySlots > 0) {
          findings.push({
            type: "tokenomics",
            title: "Token Supply Management",
            description: `${supplySlots} supply-related storage slots indicate active token supply management.`,
            severity: "low",
          });
        }
      }

      return findings.slice(0, maxFindings);
    },
    [data],
  );

  const generateRecommendations = useCallback(
    (executiveLevel: boolean = false) => {
      const recommendations = [];

      if (data.securityFindings && data.securityFindings.length > 0) {
        const criticalCount = data.securityFindings.filter(
          (f) => f.severity === "critical",
        ).length;
        if (criticalCount > 0) {
          recommendations.push({
            priority: "critical",
            title: "Address Critical Security Issues",
            description: executiveLevel
              ? "Immediate security review and remediation required for critical findings."
              : "Conduct thorough security audit and implement fixes for all critical vulnerabilities.",
            impact:
              "Prevents potential security breaches and protects user funds.",
          });
        }
      }

      if (data.storageSlots) {
        const accessControlSlots = data.storageSlots.filter(
          (s) => s.category === "access_control",
        ).length;
        if (accessControlSlots > 5) {
          recommendations.push({
            priority: "medium",
            title: "Review Access Control Complexity",
            description: executiveLevel
              ? "Consider simplifying access control mechanisms."
              : "Audit complex access control patterns and consider consolidation where appropriate.",
            impact:
              "Reduces complexity and potential for access control vulnerabilities.",
          });
        }
      }

      recommendations.push({
        priority: "low",
        title: "Implement Continuous Monitoring",
        description: executiveLevel
          ? "Establish ongoing security monitoring processes."
          : "Set up automated monitoring for storage changes and security events.",
        impact:
          "Enables proactive identification of security issues and operational anomalies.",
      });

      return recommendations;
    },
    [data],
  );

  const generateReportContent = useCallback(
    async (template: ReportTemplate): Promise<string> => {
      const sections = template.sections
        .filter((s) => s.enabled)
        .sort((a, b) => a.order - b.order);

      let content = `# ${reportTitle || `${template.name} - ${metadata.contractAddress.slice(0, 8)}...`}\n\n`;
      content += `**Generated:** ${new Date().toLocaleString()}\n`;
      content += `**Contract:** ${metadata.contractAddress}\n`;
      content += `**Block Hash:** ${metadata.blockHash}\n`;
      content += `**Analysis Date:** ${metadata.analysisDate.toLocaleString()}\n\n`;

      for (const section of sections) {
        content += `## ${section.title}\n\n`;

        switch (section.type) {
          case "summary":
            if (section.content.focusArea === "security") {
              const securitySummary = `Security analysis reveals ${data.securityFindings?.length || 0} findings across the contract storage.`;
              content += `${securitySummary}\n\n`;
            } else {
              const execSummary = generateExecutiveSummary();
              content += `${execSummary.overview}\n\n`;
              content += `**Risk Level:** ${execSummary.keyMetrics.riskLevel}\n\n`;
              content += `${execSummary.summary}\n\n`;
            }
            break;

          case "findings":
            const findings = generateKeyFindings(
              section.content.maxFindings || 5,
            );
            findings.forEach((finding, index) => {
              content += `### ${index + 1}. ${finding.title}\n`;
              content += `**Severity:** ${finding.severity.toUpperCase()}\n`;
              content += `${finding.description}\n\n`;
            });
            break;

          case "recommendations":
            const recommendations = generateRecommendations(
              section.content.executiveLevel,
            );
            recommendations.forEach((rec, index) => {
              content += `### ${index + 1}. ${rec.title}\n`;
              content += `**Priority:** ${rec.priority.toUpperCase()}\n`;
              content += `${rec.description}\n`;
              content += `**Impact:** ${rec.impact}\n\n`;
            });
            break;

          case "chart":
            content += `*[Chart: ${section.content.chartType}]*\n\n`;
            break;

          case "table":
            content += `*[Table: Storage slots data]*\n\n`;
            break;

          default:
            content += `*[${section.type} content]*\n\n`;
        }
      }

      return content;
    },
    [
      reportTitle,
      metadata,
      data,
      generateExecutiveSummary,
      generateKeyFindings,
      generateRecommendations,
    ],
  );

  const generateReport = useCallback(async () => {
    if (!selectedTemplate) return;

    setIsGenerating(true);

    try {
      const template = reportTemplates.find((t) => t.id === selectedTemplate);
      if (!template) throw new Error("Template not found");

      const content = await generateReportContent(template);

      const report: GeneratedReport = {
        id: `report-${Date.now()}`,
        title:
          reportTitle ||
          `${template.name} - ${metadata.contractAddress.slice(0, 8)}...`,
        template: template.id,
        content,
        format: "markdown",
        generatedAt: new Date(),
        metadata: {
          contractAddress: metadata.contractAddress,
          blockHash: metadata.blockHash,
          template: template.name,
        },
      };

      onReportGenerated?.(report);

      const blob = new Blob([content], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${report.title.replace(/[^a-zA-Z0-9]/g, "_")}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Report generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  }, [
    selectedTemplate,
    reportTitle,
    metadata,
    reportTemplates,
    generateReportContent,
    onReportGenerated,
  ]);

  return (
    <Card
      className={`bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)] ${className}`}
    >
      <div className="flex items-center gap-2 mb-4">
        <FileText className="h-5 w-5 text-[#00bfff]" />
        <h3 className="text-lg font-semibold text-[#00bfff]">
          Report Generation Engine
        </h3>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-[#00bfff] mb-3">
              Report Templates
            </h4>
            <div className="space-y-3">
              {reportTemplates.map((template) => (
                <div
                  key={template.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedTemplate === template.id
                      ? "border-[rgba(0,191,255,0.5)] bg-[rgba(0,191,255,0.1)]"
                      : "border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)] hover:bg-[rgba(0,191,255,0.05)]"
                  }`}
                  onClick={() => setSelectedTemplate(template.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {template.type === "executive" && (
                        <BarChart3 className="h-4 w-4 text-[#00bfff]" />
                      )}
                      {template.type === "security" && (
                        <Shield className="h-4 w-4 text-[#00bfff]" />
                      )}
                      {template.type === "comparative" && (
                        <GitCompare className="h-4 w-4 text-[#00bfff]" />
                      )}
                      {template.type === "technical" && (
                        <Settings className="h-4 w-4 text-[#00bfff]" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-[#00bfff]">
                          {template.name}
                        </span>
                        {template.isDefault && (
                          <Badge
                            variant="outline"
                            className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                          >
                            Default
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-[#8b9dc3]">
                        {template.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge
                          variant="outline"
                          className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                        >
                          {template.sections.length} Sections
                        </Badge>
                        <Badge
                          variant="outline"
                          className="border-[rgba(0,191,255,0.3)] text-[#00bfff] bg-[rgba(0,191,255,0.1)]"
                        >
                          {template.styling.theme}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-[#00bfff] mb-3">
              Report Configuration
            </h4>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#8b9dc3] mb-2">
                  Report Title
                </label>
                <Input
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  placeholder="Custom report title..."
                  className="bg-[rgba(15,20,25,0.8)] border-[rgba(0,191,255,0.3)] text-[#8b9dc3]"
                />
              </div>

              {selectedTemplate && (
                <div className="p-3 rounded-lg border border-[rgba(0,191,255,0.1)] bg-[rgba(15,20,25,0.6)]">
                  <h5 className="font-medium text-[#00bfff] mb-2">
                    Template Preview
                  </h5>
                  {(() => {
                    const template = reportTemplates.find(
                      (t) => t.id === selectedTemplate,
                    );
                    return template ? (
                      <div className="space-y-2">
                        <div className="text-sm text-[#8b9dc3]">
                          <strong>Type:</strong> {template.type}
                        </div>
                        <div className="text-sm text-[#8b9dc3]">
                          <strong>Sections:</strong>
                        </div>
                        <div className="space-y-1 ml-4">
                          {template.sections.map((section) => (
                            <div
                              key={section.id}
                              className="text-xs text-[#6b7280]"
                            >
                              • {section.title} ({section.type})
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewMode(!previewMode)}
                  disabled={!selectedTemplate}
                  className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  {previewMode ? "Hide Preview" : "Show Preview"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-[#8b9dc3]">
            {selectedTemplate
              ? "Ready to generate report"
              : "Select a template to continue"}
          </div>

          <Button
            onClick={generateReport}
            disabled={!selectedTemplate || isGenerating}
            className="bg-[rgba(0,191,255,0.1)] border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.2)]"
          >
            {isGenerating ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#00bfff] mr-2" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Generate Report
          </Button>
        </div>
      </div>
    </Card>
  );
};
