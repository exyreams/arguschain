import React, { useMemo, useState } from "react";
import { Badge, Button, Card } from "@/components/global";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle,
  Clock,
  ExternalLink,
  Eye,
  Lightbulb,
  Shield,
  Target,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SecurityFlag {
  id: string;
  type: string;
  category: "admin" | "transfer" | "contract" | "gas" | "access" | "compliance";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  recommendation: string;
  metadata?: Record<string, any>;
}

interface SecurityRecommendation {
  id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  category: string;
  actionType: "immediate" | "short-term" | "long-term" | "monitoring";
  steps: string[];
  resources: {
    title: string;
    url: string;
    type: "documentation" | "tool" | "guide" | "best-practice";
  }[];
  relatedFlags: string[];
  estimatedEffort: "low" | "medium" | "high";
  businessImpact: "low" | "medium" | "high";
  technicalComplexity: "low" | "medium" | "high";
  tags: string[];
}

interface SecurityRecommendationsProps {
  flags: SecurityFlag[];
  onRecommendationSelect?: (recommendation: SecurityRecommendation) => void;
  onImplementationStart?: (recommendationId: string) => void;
  className?: string;
  showPrioritization?: boolean;
}

class SecurityRecommendationEngine {
  private static recommendations: Record<string, SecurityRecommendation[]> = {
    admin: [
      {
        id: "admin-multisig",
        title: "Implement Multi-Signature Wallet for Admin Functions",
        description:
          "Replace single-key admin controls with multi-signature requirements to prevent unauthorized administrative actions.",
        priority: "critical",
        category: "admin",
        actionType: "immediate",
        steps: [
          "Deploy a multi-signature wallet contract (e.g., Gnosis Safe)",
          "Transfer ownership of critical contracts to the multi-sig",
          "Configure appropriate threshold (e.g., 3-of-5 signatures)",
          "Establish clear signing procedures and key management",
          "Test the multi-sig with non-critical operations first",
        ],
        resources: [
          {
            title: "Gnosis Safe Documentation",
            url: "https://docs.gnosis-safe.io/",
            type: "documentation",
          },
          {
            title: "Multi-Signature Best Practices",
            url: "https://blog.openzeppelin.com/multisig-best-practices/",
            type: "best-practice",
          },
        ],
        relatedFlags: ["admin_function", "ownership_change"],
        estimatedEffort: "high",
        businessImpact: "high",
        technicalComplexity: "medium",
        tags: ["multisig", "governance", "security"],
      },
      {
        id: "admin-timelock",
        title: "Add Timelock Delays for Administrative Changes",
        description:
          "Implement time delays for critical administrative functions to allow for review and intervention.",
        priority: "high",
        category: "admin",
        actionType: "short-term",
        steps: [
          "Deploy a timelock controller contract",
          "Configure appropriate delay periods (24-48 hours for critical changes)",
          "Update admin functions to use timelock",
          "Establish monitoring for pending timelock operations",
          "Create emergency procedures for timelock cancellation",
        ],
        resources: [
          {
            title: "OpenZeppelin TimelockController",
            url: "https://docs.openzeppelin.com/contracts/4.x/api/governance#TimelockController",
            type: "documentation",
          },
        ],
        relatedFlags: ["admin_function"],
        estimatedEffort: "medium",
        businessImpact: "medium",
        technicalComplexity: "medium",
        tags: ["timelock", "governance", "delay"],
      },
    ],
    transfer: [
      {
        id: "transfer-limits",
        title: "Implement Transfer Amount Limits",
        description:
          "Add daily/transaction limits for large token transfers to prevent massive fund movements.",
        priority: "high",
        category: "transfer",
        actionType: "short-term",
        steps: [
          "Define appropriate transfer limits based on business needs",
          "Implement daily and per-transaction limits in smart contracts",
          "Add override mechanisms for legitimate large transfers",
          "Create monitoring alerts for limit approaches",
          "Establish procedures for limit adjustments",
        ],
        resources: [
          {
            title: "Transfer Limit Implementation Guide",
            url: "https://docs.openzeppelin.com/contracts/4.x/api/security#ReentrancyGuard",
            type: "guide",
          },
        ],
        relatedFlags: ["large_transfer"],
        estimatedEffort: "medium",
        businessImpact: "medium",
        technicalComplexity: "low",
        tags: ["limits", "transfers", "risk-management"],
      },
      {
        id: "transfer-monitoring",
        title: "Enhanced Transfer Monitoring System",
        description:
          "Implement real-time monitoring and alerting for suspicious transfer patterns.",
        priority: "medium",
        category: "transfer",
        actionType: "monitoring",
        steps: [
          "Set up automated monitoring for large transfers",
          "Implement pattern recognition for suspicious activity",
          "Create alert thresholds and notification systems",
          "Establish investigation procedures for flagged transfers",
          "Regular review and tuning of monitoring parameters",
        ],
        resources: [
          {
            title: "Blockchain Monitoring Best Practices",
            url: "https://consensys.net/blog/developers/monitoring-blockchain-applications/",
            type: "best-practice",
          },
        ],
        relatedFlags: ["large_transfer", "suspicious_pattern"],
        estimatedEffort: "high",
        businessImpact: "high",
        technicalComplexity: "high",
        tags: ["monitoring", "alerts", "automation"],
      },
    ],
    contract: [
      {
        id: "contract-upgrades",
        title: "Secure Contract Upgrade Process",
        description:
          "Implement secure upgrade mechanisms with proper governance and testing procedures.",
        priority: "critical",
        category: "contract",
        actionType: "immediate",
        steps: [
          "Implement proxy pattern for upgradeable contracts",
          "Add governance controls for upgrade proposals",
          "Establish comprehensive testing procedures",
          "Create upgrade rollback mechanisms",
          "Document upgrade procedures and responsibilities",
        ],
        resources: [
          {
            title: "OpenZeppelin Upgrades",
            url: "https://docs.openzeppelin.com/upgrades-plugins/1.x/",
            type: "tool",
          },
          {
            title: "Smart Contract Upgrade Patterns",
            url: "https://blog.openzeppelin.com/the-state-of-smart-contract-upgrades/",
            type: "guide",
          },
        ],
        relatedFlags: ["contract_change", "code_modification"],
        estimatedEffort: "high",
        businessImpact: "high",
        technicalComplexity: "high",
        tags: ["upgrades", "proxy", "governance"],
      },
    ],
    gas: [
      {
        id: "gas-optimization",
        title: "Gas Usage Optimization",
        description:
          "Optimize smart contract functions to reduce gas consumption and prevent gas-related attacks.",
        priority: "medium",
        category: "gas",
        actionType: "long-term",
        steps: [
          "Audit contract functions for gas efficiency",
          "Implement gas-optimized data structures",
          "Add gas limit checks for loops and iterations",
          "Consider batch operations for multiple transactions",
          "Regular gas usage monitoring and optimization",
        ],
        resources: [
          {
            title: "Gas Optimization Techniques",
            url: "https://consensys.net/blog/developers/solidity-gas-optimization-tips/",
            type: "guide",
          },
        ],
        relatedFlags: ["high_gas_usage", "gas_anomaly"],
        estimatedEffort: "medium",
        businessImpact: "medium",
        technicalComplexity: "medium",
        tags: ["gas", "optimization", "efficiency"],
      },
    ],
    access: [
      {
        id: "access-control",
        title: "Role-Based Access Control Implementation",
        description:
          "Implement granular role-based access controls to limit function access based on user roles.",
        priority: "high",
        category: "access",
        actionType: "short-term",
        steps: [
          "Define roles and permissions matrix",
          "Implement OpenZeppelin AccessControl",
          "Assign appropriate roles to addresses",
          "Add role management functions",
          "Regular access review and updates",
        ],
        resources: [
          {
            title: "OpenZeppelin Access Control",
            url: "https://docs.openzeppelin.com/contracts/4.x/access-control",
            type: "documentation",
          },
        ],
        relatedFlags: ["unauthorized_access", "permission_violation"],
        estimatedEffort: "medium",
        businessImpact: "high",
        technicalComplexity: "low",
        tags: ["access-control", "roles", "permissions"],
      },
    ],
    compliance: [
      {
        id: "compliance-monitoring",
        title: "Regulatory Compliance Monitoring",
        description:
          "Implement monitoring and reporting systems for regulatory compliance requirements.",
        priority: "high",
        category: "compliance",
        actionType: "monitoring",
        steps: [
          "Identify applicable regulatory requirements",
          "Implement compliance monitoring systems",
          "Create automated reporting mechanisms",
          "Establish audit trails and documentation",
          "Regular compliance reviews and updates",
        ],
        resources: [
          {
            title: "DeFi Compliance Guide",
            url: "https://consensys.net/blog/regulatory/defi-compliance-guide/",
            type: "guide",
          },
        ],
        relatedFlags: ["compliance_violation", "regulatory_risk"],
        estimatedEffort: "high",
        businessImpact: "high",
        technicalComplexity: "medium",
        tags: ["compliance", "regulatory", "monitoring"],
      },
    ],
  };

  static generateRecommendations(
    flags: SecurityFlag[],
  ): SecurityRecommendation[] {
    const recommendations: SecurityRecommendation[] = [];
    const flagsByCategory = this.groupFlagsByCategory(flags);
    const flagCounts = this.getFlagCounts(flags);

    Object.entries(flagsByCategory).forEach(([category, categoryFlags]) => {
      const categoryRecommendations = this.recommendations[category] || [];

      categoryRecommendations.forEach((recommendation) => {
        const relatedFlags = categoryFlags.filter((flag) =>
          recommendation.relatedFlags.some(
            (relatedType) => flag.type === relatedType,
          ),
        );

        if (relatedFlags.length > 0) {
          const adjustedRecommendation = {
            ...recommendation,
            priority: this.adjustPriority(
              recommendation.priority,
              relatedFlags,
            ),
            relatedFlags: relatedFlags.map((f) => f.id),
          };

          recommendations.push(adjustedRecommendation);
        }
      });
    });

    if (flagCounts.critical > 0 || flagCounts.high > 2) {
      recommendations.push(this.getSecurityAuditRecommendation());
    }

    if (flagCounts.total > 10) {
      recommendations.push(this.getSecurityFrameworkRecommendation());
    }

    return this.prioritizeRecommendations(recommendations);
  }

  private static groupFlagsByCategory(
    flags: SecurityFlag[],
  ): Record<string, SecurityFlag[]> {
    return flags.reduce(
      (groups, flag) => {
        if (!groups[flag.category]) {
          groups[flag.category] = [];
        }
        groups[flag.category].push(flag);
        return groups;
      },
      {} as Record<string, SecurityFlag[]>,
    );
  }

  private static getFlagCounts(flags: SecurityFlag[]) {
    return flags.reduce(
      (counts, flag) => {
        counts.total++;
        counts[flag.severity]++;
        return counts;
      },
      { total: 0, critical: 0, high: 0, medium: 0, low: 0 },
    );
  }

  private static adjustPriority(
    basePriority: string,
    relatedFlags: SecurityFlag[],
  ): "low" | "medium" | "high" | "critical" {
    const maxSeverity = relatedFlags.reduce(
      (max, flag) => {
        const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
        const flagSeverity = severityOrder[flag.severity];
        const maxSeverity = severityOrder[max];
        return flagSeverity > maxSeverity ? flag.severity : max;
      },
      "low" as "low" | "medium" | "high" | "critical",
    );

    if (maxSeverity === "critical") return "critical";
    if (maxSeverity === "high" && basePriority !== "low") return "high";

    return basePriority as "low" | "medium" | "high" | "critical";
  }

  private static getSecurityAuditRecommendation(): SecurityRecommendation {
    return {
      id: "security-audit",
      title: "Comprehensive Security Audit",
      description:
        "Conduct a thorough security audit by professional auditors due to multiple high-severity flags.",
      priority: "critical",
      category: "general",
      actionType: "immediate",
      steps: [
        "Select reputable security audit firm",
        "Prepare comprehensive documentation",
        "Conduct internal security review first",
        "Schedule and execute professional audit",
        "Implement audit recommendations",
      ],
      resources: [
        {
          title: "Smart Contract Audit Checklist",
          url: "https://consensys.net/diligence/audits/",
          type: "guide",
        },
      ],
      relatedFlags: [],
      estimatedEffort: "high",
      businessImpact: "high",
      technicalComplexity: "low",
      tags: ["audit", "security", "professional"],
    };
  }

  private static getSecurityFrameworkRecommendation(): SecurityRecommendation {
    return {
      id: "security-framework",
      title: "Implement Security Framework",
      description:
        "Establish a comprehensive security framework and governance process.",
      priority: "high",
      category: "general",
      actionType: "long-term",
      steps: [
        "Define security policies and procedures",
        "Establish security governance committee",
        "Implement security monitoring systems",
        "Create incident response procedures",
        "Regular security training and updates",
      ],
      resources: [
        {
          title: "DeFi Security Framework",
          url: "https://github.com/nascentxyz/simple-security-toolkit",
          type: "tool",
        },
      ],
      relatedFlags: [],
      estimatedEffort: "high",
      businessImpact: "high",
      technicalComplexity: "medium",
      tags: ["framework", "governance", "process"],
    };
  }

  private static prioritizeRecommendations(
    recommendations: SecurityRecommendation[],
  ): SecurityRecommendation[] {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

    return recommendations.sort((a, b) => {
      const priorityDiff =
        priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      const impactOrder = { high: 0, medium: 1, low: 2 };
      const impactDiff =
        impactOrder[a.businessImpact] - impactOrder[b.businessImpact];
      if (impactDiff !== 0) return impactDiff;

      const effortOrder = { low: 0, medium: 1, high: 2 };
      return effortOrder[a.estimatedEffort] - effortOrder[b.estimatedEffort];
    });
  }
}

const priorityConfig = {
  critical: {
    color: "bg-red-500",
    textColor: "text-red-700",
    bgColor: "bg-red-50 dark:bg-red-950",
    icon: AlertTriangle,
    label: "Critical",
  },
  high: {
    color: "bg-orange-500",
    textColor: "text-orange-700",
    bgColor: "bg-orange-50 dark:bg-orange-950",
    icon: AlertTriangle,
    label: "High",
  },
  medium: {
    color: "bg-yellow-500",
    textColor: "text-yellow-700",
    bgColor: "bg-yellow-50 dark:bg-yellow-950",
    icon: Lightbulb,
    label: "Medium",
  },
  low: {
    color: "bg-blue-500",
    textColor: "text-blue-700",
    bgColor: "bg-blue-50 dark:bg-blue-950",
    icon: Eye,
    label: "Low",
  },
};

const actionTypeConfig = {
  immediate: { icon: AlertTriangle, label: "Immediate", color: "text-red-600" },
  "short-term": { icon: Clock, label: "Short-term", color: "text-orange-600" },
  "long-term": { icon: Target, label: "Long-term", color: "text-blue-600" },
  monitoring: { icon: Eye, label: "Monitoring", color: "text-green-600" },
};

export const SecurityRecommendations: React.FC<
  SecurityRecommendationsProps
> = ({
  flags,
  onRecommendationSelect,
  onImplementationStart,
  className,
  showPrioritization = true,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [expandedRecommendations, setExpandedRecommendations] = useState<
    Set<string>
  >(new Set());

  const recommendations = useMemo(() => {
    return SecurityRecommendationEngine.generateRecommendations(flags);
  }, [flags]);

  const filteredRecommendations = useMemo(() => {
    return recommendations.filter((rec) => {
      if (selectedCategory !== "all" && rec.category !== selectedCategory) {
        return false;
      }
      if (selectedPriority !== "all" && rec.priority !== selectedPriority) {
        return false;
      }
      return true;
    });
  }, [recommendations, selectedCategory, selectedPriority]);

  const toggleExpanded = (recommendationId: string) => {
    const newExpanded = new Set(expandedRecommendations);
    if (newExpanded.has(recommendationId)) {
      newExpanded.delete(recommendationId);
    } else {
      newExpanded.add(recommendationId);
    }
    setExpandedRecommendations(newExpanded);
  };

  const categories = [...new Set(recommendations.map((r) => r.category))];
  const priorities = ["critical", "high", "medium", "low"];

  return (
    <Card className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Security Recommendations</span>
          </h3>
          <p className="text-sm text-muted-foreground">
            {filteredRecommendations.length} recommendations based on{" "}
            {flags.length} security flags
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground mr-2">
            Category:
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-sm border rounded px-2 py-1 bg-background"
          >
            <option value="all">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mr-2">
            Priority:
          </label>
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="text-sm border rounded px-2 py-1 bg-background"
          >
            <option value="all">All Priorities</option>
            {priorities.map((priority) => (
              <option key={priority} value={priority}>
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {filteredRecommendations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No security recommendations at this time</p>
            <p className="text-xs">
              Your system appears to be secure based on current analysis
            </p>
          </div>
        ) : (
          filteredRecommendations.map((recommendation) => {
            const priorityInfo = priorityConfig[recommendation.priority];
            const actionInfo = actionTypeConfig[recommendation.actionType];
            const PriorityIcon = priorityInfo.icon;
            const ActionIcon = actionInfo.icon;
            const isExpanded = expandedRecommendations.has(recommendation.id);

            return (
              <div
                key={recommendation.id}
                className={cn(
                  "border rounded-lg p-4 transition-all duration-200",
                  priorityInfo.bgColor,
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className={cn("p-2 rounded-full", priorityInfo.color)}>
                      <PriorityIcon className="h-4 w-4 text-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="text-sm font-medium text-foreground">
                          {recommendation.title}
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          {priorityInfo.label}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <ActionIcon className="h-3 w-3 mr-1" />
                          {actionInfo.label}
                        </Badge>
                      </div>

                      <p className="text-sm text-muted-foreground mb-3">
                        {recommendation.description}
                      </p>

                      {showPrioritization && (
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground mb-3">
                          <div className="flex items-center space-x-1">
                            <TrendingUp className="h-3 w-3" />
                            <span>Impact: {recommendation.businessImpact}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>
                              Effort: {recommendation.estimatedEffort}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Target className="h-3 w-3" />
                            <span>
                              Complexity: {recommendation.technicalComplexity}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1 mb-3">
                        {recommendation.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleExpanded(recommendation.id)}
                      className="text-xs"
                    >
                      {isExpanded ? "Less" : "More"}
                    </Button>
                    {onImplementationStart && (
                      <Button
                        size="sm"
                        onClick={() => onImplementationStart(recommendation.id)}
                        className="text-xs"
                      >
                        Start
                      </Button>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t space-y-4">
                    <div>
                      <h5 className="text-sm font-medium mb-2">
                        Implementation Steps:
                      </h5>
                      <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                        {recommendation.steps.map((step, index) => (
                          <li key={index}>{step}</li>
                        ))}
                      </ol>
                    </div>

                    {recommendation.resources.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium mb-2">Resources:</h5>
                        <div className="space-y-2">
                          {recommendation.resources.map((resource, index) => (
                            <a
                              key={index}
                              href={resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center space-x-2 text-sm text-primary hover:underline"
                            >
                              <BookOpen className="h-3 w-3" />
                              <span>{resource.title}</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {recommendation.relatedFlags.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium mb-2">
                          Related Security Flags (
                          {recommendation.relatedFlags.length}):
                        </h5>
                        <div className="text-xs text-muted-foreground">
                          This recommendation addresses{" "}
                          {recommendation.relatedFlags.length} security flag(s)
                          in your analysis.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
};
