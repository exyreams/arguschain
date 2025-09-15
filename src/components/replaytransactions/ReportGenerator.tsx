import React, { useMemo, useState } from "react";
import { Badge, Button, Card, Input } from "@/components/global";
import {
  BarChart3,
  Calendar,
  CheckCircle,
  Download,
  Eye,
  FileText,
  Settings,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ReportData {
  transactionHash?: string;
  blockNumber?: number;
  analysisType: "transaction" | "block" | "security" | "gas" | "comprehensive";
  timestamp: number;
  summary: {
    totalTransactions: number;
    totalGasUsed: number;
    pyusdVolume: number;
    securityFlags: number;
    successRate: number;
  };
  securityAnalysis?: {
    flags: any[];
    riskScore: number;
    recommendations: any[];
  };
  gasAnalysis?: {
    efficiency: number;
    optimizations: any[];
    breakdown: any[];
  };
  tokenAnalysis?: {
    transfers: any[];
    volume: number;
    uniqueAddresses: number;
  };
  keyFindings: string[];
  recommendations: string[];
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: "executive" | "technical" | "security" | "compliance";
  sections: {
    id: string;
    name: string;
    required: boolean;
    enabled: boolean;
    order: number;
  }[];
  format: "pdf" | "html" | "json" | "csv";
  branding: {
    logo?: string;
    colors: {
      primary: string;
      secondary: string;
      accent: string;
    };
    footer?: string;
  };
}

interface ReportGeneratorProps {
  data: ReportData;
  onGenerate?: (template: ReportTemplate, options: any) => void;
  onPreview?: (template: ReportTemplate) => void;
  onSchedule?: (template: ReportTemplate, schedule: any) => void;
  className?: string;
  showScheduling?: boolean;
  showBranding?: boolean;
}

const defaultTemplates: ReportTemplate[] = [
  {
    id: "executive-summary",
    name: "Executive Summary",
    description: "High-level overview for executives and stakeholders",
    category: "executive",
    format: "pdf",
    sections: [
      {
        id: "cover",
        name: "Cover Page",
        required: true,
        enabled: true,
        order: 1,
      },
      {
        id: "executive-summary",
        name: "Executive Summary",
        required: true,
        enabled: true,
        order: 2,
      },
      {
        id: "key-metrics",
        name: "Key Metrics",
        required: true,
        enabled: true,
        order: 3,
      },
      {
        id: "risk-overview",
        name: "Risk Overview",
        required: false,
        enabled: true,
        order: 4,
      },
      {
        id: "recommendations",
        name: "Recommendations",
        required: true,
        enabled: true,
        order: 5,
      },
      {
        id: "appendix",
        name: "Appendix",
        required: false,
        enabled: false,
        order: 6,
      },
    ],
    branding: {
      colors: {
        primary: "#2563eb",
        secondary: "#64748b",
        accent: "#0ea5e9",
      },
      footer: "Confidential - Arguschain Analysis Report",
    },
  },
  {
    id: "technical-analysis",
    name: "Technical Analysis Report",
    description: "Detailed technical analysis for developers and engineers",
    category: "technical",
    format: "pdf",
    sections: [
      {
        id: "cover",
        name: "Cover Page",
        required: true,
        enabled: true,
        order: 1,
      },
      {
        id: "methodology",
        name: "Analysis Methodology",
        required: true,
        enabled: true,
        order: 2,
      },
      {
        id: "transaction-details",
        name: "Transaction Details",
        required: true,
        enabled: true,
        order: 3,
      },
      {
        id: "gas-analysis",
        name: "Gas Analysis",
        required: false,
        enabled: true,
        order: 4,
      },
      {
        id: "code-analysis",
        name: "Code Analysis",
        required: false,
        enabled: true,
        order: 5,
      },
      {
        id: "optimization-suggestions",
        name: "Optimization Suggestions",
        required: true,
        enabled: true,
        order: 6,
      },
      {
        id: "technical-appendix",
        name: "Technical Appendix",
        required: false,
        enabled: true,
        order: 7,
      },
    ],
    branding: {
      colors: {
        primary: "#059669",
        secondary: "#6b7280",
        accent: "#10b981",
      },
      footer: "Technical Analysis - Arguschain Platform",
    },
  },
  {
    id: "security-audit",
    name: "Security Audit Report",
    description: "Comprehensive security analysis and recommendations",
    category: "security",
    format: "pdf",
    sections: [
      {
        id: "cover",
        name: "Cover Page",
        required: true,
        enabled: true,
        order: 1,
      },
      {
        id: "executive-summary",
        name: "Executive Summary",
        required: true,
        enabled: true,
        order: 2,
      },
      {
        id: "security-findings",
        name: "Security Findings",
        required: true,
        enabled: true,
        order: 3,
      },
      {
        id: "risk-assessment",
        name: "Risk Assessment",
        required: true,
        enabled: true,
        order: 4,
      },
      {
        id: "vulnerability-details",
        name: "Vulnerability Details",
        required: false,
        enabled: true,
        order: 5,
      },
      {
        id: "remediation-plan",
        name: "Remediation Plan",
        required: true,
        enabled: true,
        order: 6,
      },
      {
        id: "compliance-check",
        name: "Compliance Check",
        required: false,
        enabled: false,
        order: 7,
      },
    ],
    branding: {
      colors: {
        primary: "#dc2626",
        secondary: "#6b7280",
        accent: "#ef4444",
      },
      footer: "Security Audit - Confidential Report",
    },
  },
  {
    id: "compliance-report",
    name: "Compliance Report",
    description: "Regulatory compliance analysis and documentation",
    category: "compliance",
    format: "pdf",
    sections: [
      {
        id: "cover",
        name: "Cover Page",
        required: true,
        enabled: true,
        order: 1,
      },
      {
        id: "compliance-summary",
        name: "Compliance Summary",
        required: true,
        enabled: true,
        order: 2,
      },
      {
        id: "regulatory-analysis",
        name: "Regulatory Analysis",
        required: true,
        enabled: true,
        order: 3,
      },
      {
        id: "transaction-monitoring",
        name: "Transaction Monitoring",
        required: true,
        enabled: true,
        order: 4,
      },
      {
        id: "aml-analysis",
        name: "AML Analysis",
        required: false,
        enabled: true,
        order: 5,
      },
      {
        id: "reporting-requirements",
        name: "Reporting Requirements",
        required: true,
        enabled: true,
        order: 6,
      },
      {
        id: "compliance-attestation",
        name: "Compliance Attestation",
        required: false,
        enabled: false,
        order: 7,
      },
    ],
    branding: {
      colors: {
        primary: "#7c3aed",
        secondary: "#6b7280",
        accent: "#8b5cf6",
      },
      footer: "Compliance Report - Regulatory Documentation",
    },
  },
];

class ReportGenerationEngine {
  static generateExecutiveSummary(data: ReportData): string {
    const { summary, keyFindings } = data;

    return `
## Executive Summary

This analysis covers ${summary.totalTransactions} transaction${summary.totalTransactions !== 1 ? "s" : ""} with a total gas consumption of ${summary.totalGasUsed.toLocaleString()} units and PYUSD volume of $${summary.pyusdVolume.toLocaleString()}.

### Key Performance Indicators
- **Success Rate**: ${summary.successRate.toFixed(1)}%
- **Security Flags**: ${summary.securityFlags} identified
- **Gas Efficiency**: ${data.gasAnalysis?.efficiency || "N/A"}%
- **Risk Level**: ${data.securityAnalysis?.riskScore ? (100 - data.securityAnalysis.riskScore).toFixed(0) : "N/A"}/100

### Key Findings
${keyFindings.map((finding) => `- ${finding}`).join("\n")}

### Recommendations
${data.recommendations.map((rec) => `- ${rec}`).join("\n")}
    `.trim();
  }

  static generateTechnicalDetails(data: ReportData): string {
    return `
## Technical Analysis

### Transaction Overview
- **Analysis Type**: ${data.analysisType}
- **Timestamp**: ${new Date(data.timestamp).toISOString()}
- **Block Number**: ${data.blockNumber || "N/A"}
- **Transaction Hash**: ${data.transactionHash || "N/A"}

### Gas Analysis
${
  data.gasAnalysis
    ? `
- **Total Gas Used**: ${data.summary.totalGasUsed.toLocaleString()}
- **Efficiency Score**: ${data.gasAnalysis.efficiency}%
- **Optimization Opportunities**: ${data.gasAnalysis.optimizations.length}

#### Gas Breakdown
${data.gasAnalysis.breakdown.map((item) => `- **${item.category}**: ${item.gasUsed.toLocaleString()} (${item.percentage.toFixed(1)}%)`).join("\n")}
`
    : "Gas analysis not available"
}

### Token Analysis
${
  data.tokenAnalysis
    ? `
- **Total Transfers**: ${data.tokenAnalysis.transfers.length}
- **Total Volume**: $${data.tokenAnalysis.volume.toLocaleString()}
- **Unique Addresses**: ${data.tokenAnalysis.uniqueAddresses}
`
    : "Token analysis not available"
}
    `.trim();
  }

  static generateSecurityFindings(data: ReportData): string {
    if (!data.securityAnalysis) {
      return "## Security Analysis\n\nNo security analysis data available.";
    }

    const { flags, riskScore, recommendations } = data.securityAnalysis;

    return `
## Security Findings

### Risk Assessment
- **Overall Risk Score**: ${riskScore}/100
- **Security Flags**: ${flags.length} identified
- **Risk Level**: ${riskScore > 70 ? "High" : riskScore > 40 ? "Medium" : "Low"}

### Security Flags by Severity
${this.groupFlagsBySeverity(flags)}

### Security Recommendations
${recommendations.map((rec) => `- **${rec.title}**: ${rec.description}`).join("\n")}
    `.trim();
  }

  private static groupFlagsBySeverity(flags: any[]): string {
    const grouped = flags.reduce(
      (acc, flag) => {
        if (!acc[flag.severity]) acc[flag.severity] = [];
        acc[flag.severity].push(flag);
        return acc;
      },
      {} as Record<string, any[]>,
    );

    return Object.entries(grouped)
      .map(
        ([severity, flagList]) =>
          `#### ${severity.toUpperCase()} (${flagList.length})\n${flagList.map((flag) => `- ${flag.title}: ${flag.description}`).join("\n")}`,
      )
      .join("\n\n");
  }

  static generateReportContent(
    template: ReportTemplate,
    data: ReportData,
  ): string {
    const enabledSections = template.sections
      .filter((section) => section.enabled)
      .sort((a, b) => a.order - b.order);

    let content = "";

    enabledSections.forEach((section) => {
      switch (section.id) {
        case "cover":
          content += this.generateCoverPage(template, data);
          break;
        case "executive-summary":
          content += this.generateExecutiveSummary(data);
          break;
        case "technical-details":
        case "transaction-details":
          content += this.generateTechnicalDetails(data);
          break;
        case "security-findings":
        case "risk-assessment":
          content += this.generateSecurityFindings(data);
          break;
        case "gas-analysis":
          content += this.generateGasAnalysis(data);
          break;
        case "recommendations":
        case "remediation-plan":
          content += this.generateRecommendations(data);
          break;
        default:
          content += `\n## ${section.name}\n\n[Section content would be generated here]\n\n`;
      }
      content += "\n\n---\n\n";
    });

    return content;
  }

  private static generateCoverPage(
    template: ReportTemplate,
    data: ReportData,
  ): string {
    return `
# ${template.name}

**Analysis Report**

---

**Generated**: ${new Date().toLocaleDateString()}  
**Analysis Type**: ${data.analysisType.toUpperCase()}  
**Report ID**: ${Date.now().toString(36).toUpperCase()}

${template.branding.footer ? `\n*${template.branding.footer}*` : ""}
    `.trim();
  }

  private static generateGasAnalysis(data: ReportData): string {
    if (!data.gasAnalysis)
      return "## Gas Analysis\n\nNo gas analysis data available.";

    return `
## Gas Analysis

### Efficiency Metrics
- **Overall Efficiency**: ${data.gasAnalysis.efficiency}%
- **Total Gas Used**: ${data.summary.totalGasUsed.toLocaleString()}
- **Optimization Opportunities**: ${data.gasAnalysis.optimizations.length}

### Optimization Recommendations
${data.gasAnalysis.optimizations.map((opt) => `- **${opt.name}**: ${opt.description} (Potential savings: ${opt.potentialSavings?.gasAmount || "N/A"} gas)`).join("\n")}
    `.trim();
  }

  private static generateRecommendations(data: ReportData): string {
    return `
## Recommendations

### Priority Actions
${data.recommendations
  .slice(0, 5)
  .map((rec, index) => `${index + 1}. ${rec}`)
  .join("\n")}

### Additional Considerations
${data.recommendations
  .slice(5)
  .map((rec) => `- ${rec}`)
  .join("\n")}
    `.trim();
  }
}

export const ReportGenerator: React.FC<ReportGeneratorProps> = ({
  data,
  onGenerate,
  onPreview,
  onSchedule,
  className,
  showScheduling = false,
  showBranding = true,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate>(
    defaultTemplates[0],
  );
  const [customTemplate, setCustomTemplate] = useState<ReportTemplate | null>(
    null,
  );
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [reportOptions, setReportOptions] = useState({
    includeCharts: true,
    includeRawData: false,
    includeMetadata: true,
    format: "pdf" as "pdf" | "html" | "json",
    compression: "standard" as "none" | "standard" | "high",
  });
  const [scheduleOptions, setScheduleOptions] = useState({
    frequency: "once" as "once" | "daily" | "weekly" | "monthly",
    recipients: "",
    subject: "",
    enabled: false,
  });

  const activeTemplate = customTemplate || selectedTemplate;

  const previewContent = useMemo(() => {
    return ReportGenerationEngine.generateReportContent(activeTemplate, data);
  }, [activeTemplate, data]);

  const handleSectionToggle = (sectionId: string) => {
    if (!customTemplate) {
      setCustomTemplate({ ...selectedTemplate });
    }

    const template = customTemplate || selectedTemplate;
    const updatedSections = template.sections.map((section) =>
      section.id === sectionId
        ? { ...section, enabled: !section.enabled }
        : section,
    );

    setCustomTemplate({
      ...template,
      sections: updatedSections,
    });
  };

  const handleSectionReorder = (
    sectionId: string,
    direction: "up" | "down",
  ) => {
    if (!customTemplate) {
      setCustomTemplate({ ...selectedTemplate });
    }

    const template = customTemplate || selectedTemplate;
    const sections = [...template.sections];
    const sectionIndex = sections.findIndex((s) => s.id === sectionId);

    if (sectionIndex === -1) return;

    const newIndex = direction === "up" ? sectionIndex - 1 : sectionIndex + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;

    [sections[sectionIndex], sections[newIndex]] = [
      sections[newIndex],
      sections[sectionIndex],
    ];

    sections.forEach((section, index) => {
      section.order = index + 1;
    });

    setCustomTemplate({
      ...template,
      sections,
    });
  };

  const handleGenerate = () => {
    onGenerate?.(activeTemplate, reportOptions);
  };

  const handlePreview = () => {
    onPreview?.(activeTemplate);
  };

  const handleSchedule = () => {
    if (scheduleOptions.enabled) {
      onSchedule?.(activeTemplate, scheduleOptions);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "executive":
        return BarChart3;
      case "technical":
        return Settings;
      case "security":
        return Shield;
      case "compliance":
        return CheckCircle;
      default:
        return FileText;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "executive":
        return "text-blue-600";
      case "technical":
        return "text-green-600";
      case "security":
        return "text-red-600";
      case "compliance":
        return "text-purple-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <Card className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Report Generator</span>
          </h3>
          <p className="text-sm text-muted-foreground">
            Generate customizable analysis reports
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button size="sm" variant="outline" onClick={handlePreview}>
            <Eye className="h-3 w-3 mr-1" />
            Preview
          </Button>
          <Button size="sm" onClick={handleGenerate}>
            <Download className="h-3 w-3 mr-1" />
            Generate
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-3">Report Templates</h4>
            <div className="space-y-2">
              {defaultTemplates.map((template) => {
                const CategoryIcon = getCategoryIcon(template.category);
                const isSelected = selectedTemplate.id === template.id;

                return (
                  <div
                    key={template.id}
                    className={cn(
                      "p-3 border rounded-lg cursor-pointer transition-all duration-200",
                      isSelected && "border-primary bg-primary/5",
                    )}
                    onClick={() => {
                      setSelectedTemplate(template);
                      setCustomTemplate(null);
                      setIsCustomizing(false);
                    }}
                  >
                    <div className="flex items-start space-x-3">
                      <div
                        className={cn(
                          "p-1 rounded",
                          getCategoryColor(template.category),
                        )}
                      >
                        <CategoryIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">
                          {template.name}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {template.description}
                        </div>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {template.category}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {template.format.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-3">Report Options</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs">Include Charts</label>
                <input
                  type="checkbox"
                  checked={reportOptions.includeCharts}
                  onChange={(e) =>
                    setReportOptions((prev) => ({
                      ...prev,
                      includeCharts: e.target.checked,
                    }))
                  }
                  className="rounded"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-xs">Include Raw Data</label>
                <input
                  type="checkbox"
                  checked={reportOptions.includeRawData}
                  onChange={(e) =>
                    setReportOptions((prev) => ({
                      ...prev,
                      includeRawData: e.target.checked,
                    }))
                  }
                  className="rounded"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-xs">Include Metadata</label>
                <input
                  type="checkbox"
                  checked={reportOptions.includeMetadata}
                  onChange={(e) =>
                    setReportOptions((prev) => ({
                      ...prev,
                      includeMetadata: e.target.checked,
                    }))
                  }
                  className="rounded"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Output Format
                </label>
                <select
                  value={reportOptions.format}
                  onChange={(e) =>
                    setReportOptions((prev) => ({
                      ...prev,
                      format: e.target.value as any,
                    }))
                  }
                  className="w-full px-2 py-1 text-xs border rounded bg-background"
                >
                  <option value="pdf">PDF</option>
                  <option value="html">HTML</option>
                  <option value="json">JSON</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Compression
                </label>
                <select
                  value={reportOptions.compression}
                  onChange={(e) =>
                    setReportOptions((prev) => ({
                      ...prev,
                      compression: e.target.value as any,
                    }))
                  }
                  className="w-full px-2 py-1 text-xs border rounded bg-background"
                >
                  <option value="none">None</option>
                  <option value="standard">Standard</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
          </div>

          {showScheduling && (
            <div>
              <h4 className="text-sm font-medium mb-3">Scheduling</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs">Enable Scheduling</label>
                  <input
                    type="checkbox"
                    checked={scheduleOptions.enabled}
                    onChange={(e) =>
                      setScheduleOptions((prev) => ({
                        ...prev,
                        enabled: e.target.checked,
                      }))
                    }
                    className="rounded"
                  />
                </div>

                {scheduleOptions.enabled && (
                  <>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">
                        Frequency
                      </label>
                      <select
                        value={scheduleOptions.frequency}
                        onChange={(e) =>
                          setScheduleOptions((prev) => ({
                            ...prev,
                            frequency: e.target.value as any,
                          }))
                        }
                        className="w-full px-2 py-1 text-xs border rounded bg-background"
                      >
                        <option value="once">Once</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">
                        Recipients
                      </label>
                      <Input
                        placeholder="email@example.com"
                        value={scheduleOptions.recipients}
                        onChange={(e) =>
                          setScheduleOptions((prev) => ({
                            ...prev,
                            recipients: e.target.value,
                          }))
                        }
                        className="text-xs"
                      />
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSchedule}
                      className="w-full"
                    >
                      <Calendar className="h-3 w-3 mr-1" />
                      Schedule Report
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Template Sections</h4>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsCustomizing(!isCustomizing)}
            >
              <Settings className="h-3 w-3 mr-1" />
              Customize
            </Button>
          </div>

          <div className="space-y-2">
            {activeTemplate.sections
              .sort((a, b) => a.order - b.order)
              .map((section) => (
                <div
                  key={section.id}
                  className={cn(
                    "p-3 border rounded-lg",
                    section.enabled
                      ? "bg-background"
                      : "bg-muted/50 opacity-60",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={section.enabled}
                        onChange={() => handleSectionToggle(section.id)}
                        disabled={section.required}
                        className="rounded"
                      />
                      <span className="text-sm font-medium">
                        {section.name}
                      </span>
                      {section.required && (
                        <Badge variant="outline" className="text-xs">
                          Required
                        </Badge>
                      )}
                    </div>

                    {isCustomizing && (
                      <div className="flex items-center space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSectionReorder(section.id, "up")}
                          disabled={section.order === 1}
                          className="h-6 w-6 p-0"
                        >
                          ↑
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            handleSectionReorder(section.id, "down")
                          }
                          disabled={
                            section.order === activeTemplate.sections.length
                          }
                          className="h-6 w-6 p-0"
                        >
                          ↓
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>

          {showBranding && (
            <div>
              <h4 className="text-sm font-medium mb-3">Branding</h4>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Primary Color
                  </label>
                  <input
                    type="color"
                    value={activeTemplate.branding.colors.primary}
                    onChange={(e) => {
                      if (!customTemplate) {
                        setCustomTemplate({ ...selectedTemplate });
                      }
                      const template = customTemplate || selectedTemplate;
                      setCustomTemplate({
                        ...template,
                        branding: {
                          ...template.branding,
                          colors: {
                            ...template.branding.colors,
                            primary: e.target.value,
                          },
                        },
                      });
                    }}
                    className="w-full h-8 border rounded"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Footer Text
                  </label>
                  <Input
                    placeholder="Custom footer text"
                    value={activeTemplate.branding.footer || ""}
                    onChange={(e) => {
                      if (!customTemplate) {
                        setCustomTemplate({ ...selectedTemplate });
                      }
                      const template = customTemplate || selectedTemplate;
                      setCustomTemplate({
                        ...template,
                        branding: {
                          ...template.branding,
                          footer: e.target.value,
                        },
                      });
                    }}
                    className="text-xs"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <h4 className="text-sm font-medium mb-3">Preview</h4>
          <div className="border rounded-lg p-4 bg-muted/20 max-h-96 overflow-y-auto">
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-xs font-mono">
                {previewContent.slice(0, 1000)}
                {previewContent.length > 1000 && "\n\n... (truncated)"}
              </pre>
            </div>
          </div>

          <div className="mt-4 text-xs text-muted-foreground">
            <div>
              Estimated size: {Math.round(previewContent.length / 1024)}KB
            </div>
            <div>
              Sections:{" "}
              {activeTemplate.sections.filter((s) => s.enabled).length}
            </div>
            <div>Format: {reportOptions.format.toUpperCase()}</div>
          </div>
        </div>
      </div>
    </Card>
  );
};
