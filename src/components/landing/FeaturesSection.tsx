import React, { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  ChevronRight,
  Clock,
  Code,
  Database,
  FileText,
  Network,
  Search,
  Sparkles,
  Zap,
} from "lucide-react";
import { Badge, Button } from "@/components/global";

interface AnalysisTool {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  stats?: { label: string; value: string };
  isPopular?: boolean;
  category: "debugging" | "analysis" | "monitoring";
  features?: string[];
  performance?: string;
}

const analysisTools: AnalysisTool[] = [
  {
    id: "debug-transaction",
    title: "Debug Transaction",
    description:
      "Comprehensive debugging with call traces, gas analysis, and execution flow visualization.",
    href: "/debug-trace",
    icon: Search,
    stats: { label: "Analysis Time", value: "<2s" },
    isPopular: true,
    category: "debugging",
    features: ["Call Traces", "Gas Analysis", "Flow Visualization"],
    performance: "99.9%",
  },
  {
    id: "trace-transaction",
    title: "Trace Transaction",
    description:
      "Advanced trace analysis with MEV detection and performance insights.",
    href: "/trace-transaction",
    icon: Activity,
    stats: { label: "Success Rate", value: "99.9%" },
    category: "analysis",
    features: ["MEV Detection", "Performance Insights", "Protocol Analysis"],
    performance: "99.9%",
  },
  {
    id: "transaction-simulator",
    title: "Transaction Simulator",
    description:
      "Simulate any transaction before broadcasting. Evaluate gas impact and state changes.",
    href: "/transaction-simulation",
    icon: Database,
    stats: { label: "Daily Simulations", value: "100K+" },
    category: "debugging",
    features: ["Pre-broadcast Testing", "State Preview", "Gas Estimation"],
    performance: "100K+",
  },
  {
    id: "transaction-replay",
    title: "Transaction Replay",
    description:
      "Replay transactions across forks and local networks for debugging.",
    href: "/replay-transactions",
    icon: Database,
    stats: { label: "Total Replays", value: "250K+" },
    category: "debugging",
    features: ["Fork Testing", "Network Replay", "Consensus Analysis"],
    performance: "250K+",
  },
  {
    id: "block-trace",
    title: "Block Trace Analyzer",
    description:
      "Deep block analysis with transaction flows and gas distribution.",
    href: "/trace-block",
    icon: Database,
    stats: { label: "Blocks Analyzed", value: "50K+" },
    category: "analysis",
    features: ["Transaction Flows", "Gas Distribution", "Custom Indexing"],
    performance: "50K+",
  },
  {
    id: "bytecode-analysis",
    title: "Bytecode Analysis",
    description:
      "Decompile smart contract bytecode and identify security risks.",
    href: "/bytecode-analysis",
    icon: Code,
    stats: { label: "Contracts Analyzed", value: "10K+" },
    isPopular: true,
    category: "analysis",
    features: ["Decompilation", "Security Scan", "Gas Optimization"],
    performance: "10K+",
  },
  {
    id: "event-logs",
    title: "Event Logs",
    description: "Inspect, filter, and index contract event emissions.",
    href: "/event-logs",
    icon: FileText,
    stats: { label: "Events Tracked", value: "500K+" },
    category: "monitoring",
    features: ["Event Filtering", "Analytics Pipeline", "Real-time Updates"],
    performance: "500K+",
  },
  {
    id: "storage-analysis",
    title: "Storage Analysis",
    description:
      "Inspect storage patterns, state changes, and optimization recommendations.",
    href: "/storage-analysis",
    icon: FileText,
    stats: { label: "Storage Slots", value: "1M+" },
    category: "analysis",
    features: ["Pattern Detection", "State Tracking", "Optimization Tips"],
    performance: "1M+",
  },
  {
    id: "network-monitor",
    title: "Network Monitor",
    description: "Realtime mempool congestion heatmaps and fee predictions.",
    href: "/network-monitor",
    icon: Network,
    stats: { label: "Networks", value: "5+" },
    isPopular: true,
    category: "monitoring",
    features: ["Mempool Analysis", "Fee Prediction", "Anomaly Detection"],
    performance: "5+",
  },
];

const categories = [
  { id: "all", label: "All Tools", icon: Sparkles },
  { id: "debugging", label: "Debugging", icon: Search },
  { id: "analysis", label: "Analysis", icon: BarChart3 },
  { id: "monitoring", label: "Monitoring", icon: Activity },
];

export const FeaturesSection: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [hoveredTool, setHoveredTool] = useState<string | null>(null);

  const filteredTools =
    selectedCategory === "all"
      ? analysisTools
      : analysisTools.filter((tool) => tool.category === selectedCategory);

  return (
    <section className="py-24 bg-[#0f1419] relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#00bfff05_1px,transparent_1px),linear-gradient(to_bottom,#00bfff05_1px,transparent_1px)] bg-[size:40px_40px]" />
        <motion.div
          animate={{
            y: [0, -20, 0],
            x: [0, 20, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute top-20 left-1/4 w-[600px] h-[600px] bg-[#00bfff] opacity-[0.02] blur-[150px] rounded-full"
        />
        <motion.div
          animate={{
            y: [0, 20, 0],
            x: [0, -20, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute bottom-20 right-1/4 w-[600px] h-[600px] bg-[#0099cc] opacity-[0.02] blur-[150px] rounded-full"
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#00bfff10] to-[#0099cc10] border border-[#00bfff30] rounded-full mb-8"
          >
            <Zap className="w-4 h-4 text-[#00bfff]" />
            <span className="text-sm font-medium text-[#00bfff]">
              Enterprise-Grade Analysis Suite
            </span>
            <Badge className="bg-[#00bfff20] text-[#00bfff] border-[#00bfff30] text-xs">
              10+ Tools
            </Badge>
          </motion.div>

          <h2 className="text-5xl lg:text-6xl font-bold mb-6">
            <span className="text-white">Professional Blockchain</span>
            <br />
            <span className="relative inline-block mt-2">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00bfff] via-[#0099cc] to-[#00bfff] animate-gradient">
                Analysis Platform
              </span>
              <motion.div
                className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#00bfff] to-transparent"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5, duration: 1 }}
              />
            </span>
          </h2>
          <p className="text-xl text-[#8b9dc3] max-w-3xl mx-auto leading-relaxed">
            Industry-leading tools trusted by 10,000+ developers for debugging,
            analysis, and monitoring blockchain operations
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-wrap justify-center gap-3 mb-12"
        >
          {categories.map((category) => (
            <motion.div
              key={category.id}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <Button
                variant={
                  selectedCategory === category.id ? "default" : "outline"
                }
                size="lg"
                onClick={() => setSelectedCategory(category.id)}
                className="flex items-center gap-2 px-6 py-3 h-auto"
                aria-label={`Select ${category.label} category`}
              >
                <category.icon className="w-4 h-4" />
                {category.label}
              </Button>
            </motion.div>
          ))}
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={selectedCategory}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20"
          >
            {filteredTools.map((tool, index) => (
              <motion.div
                key={tool.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onHoverStart={() => setHoveredTool(tool.id)}
                onHoverEnd={() => setHoveredTool(null)}
              >
                <Link to={tool.href} className="block h-full">
                  <motion.div
                    whileHover={{ y: -5 }}
                    className="h-full p-6 rounded-2xl bg-gradient-to-b from-[#1a1d2e] to-[#0f1118] border border-[#00bfff20] hover:border-[#00bfff40] transition-all duration-300 relative overflow-hidden group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-[#00bfff10] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    {tool.isPopular && (
                      <div className="absolute top-4 right-4">
                        <Badge className="bg-gradient-to-r from-[#00bfff] to-[#0099cc] text-white text-xs px-2 py-1">
                          <Sparkles className="w-3 h-3 mr-1" />
                          Popular
                        </Badge>
                      </div>
                    )}

                    <div className="flex items-start gap-4 mb-4 relative z-10">
                      <motion.div
                        animate={{
                          rotate: hoveredTool === tool.id ? 360 : 0,
                          scale: hoveredTool === tool.id ? 1.1 : 1,
                        }}
                        transition={{ duration: 0.5 }}
                        className="p-3 rounded-xl bg-gradient-to-br from-[#00bfff20] to-[#0099cc20] border border-[#00bfff30]"
                      >
                        <tool.icon className="h-6 w-6 text-[#00bfff]" />
                      </motion.div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-white group-hover:text-[#00bfff] transition-colors">
                          {tool.title}
                        </h3>
                      </div>
                    </div>

                    <p className="text-[#8b9dc3] text-sm leading-relaxed mb-4 relative z-10">
                      {tool.description}
                    </p>

                    {tool.features && (
                      <div className="flex flex-wrap gap-2 mb-4 relative z-10">
                        {tool.features.map((feature, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-1 bg-[#00bfff10] text-[#00bfff] rounded-md border border-[#00bfff20]"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t border-[#00bfff10] relative z-10">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#8b9dc3]" />
                        <span className="text-xs text-[#8b9dc3]">
                          {tool.stats?.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#00bfff]">
                          {tool.stats?.value}
                        </span>
                        <ChevronRight className="w-4 h-4 text-[#00bfff] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>

                    <motion.div
                      className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#00bfff] to-[#0099cc]"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: hoveredTool === tool.id ? 1 : 0 }}
                      transition={{ duration: 0.3 }}
                    />
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
};
