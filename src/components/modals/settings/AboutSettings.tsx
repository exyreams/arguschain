import { motion } from "framer-motion";

const contentVariants = {
  hidden: {
    opacity: 0,
    x: 10,
    transition: {
      duration: 0.15,
      ease: [0.4, 0, 0.2, 1] as const,
    },
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1] as const,
    },
  },
  exit: {
    opacity: 0,
    x: -10,
    transition: {
      duration: 0.15,
      ease: [0.4, 0, 0.6, 1] as const,
    },
  },
};

const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1] as const,
    },
  },
};

export const AboutSettings = () => (
  <motion.div
    className="space-y-4"
    variants={contentVariants}
    initial="hidden"
    animate="visible"
    exit="exit"
    key="about"
  >
    <motion.div variants={itemVariants}>
      <h3 className="text-[#00bfff] text-lg font-semibold mb-2">
        About <span className="font-audiowide font-normal">arguschain</span>
      </h3>
      <p className="text-[#8b9dc3] text-sm mb-4">
        Advanced Ethereum transaction analysis and blockchain forensics tool.
      </p>
    </motion.div>

    <motion.div
      className="space-y-4"
      variants={listVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div
        className="p-4 border border-[rgba(0,191,255,0.2)] rounded-lg transition-colors duration-200 ease-out hover:border-[rgba(0,191,255,0.4)] hover:bg-[rgba(0,191,255,0.02)]"
        variants={itemVariants}
      >
        <h4 className="text-[#00bfff] text-sm font-medium mb-2">
          Version Information
        </h4>
        <div className="space-y-1">
          <div className="text-[#8b9dc3] text-xs">
            <span className="text-[#00bfff]">Version:</span> 1.0.0-beta
          </div>
          <div className="text-[#8b9dc3] text-xs">
            <span className="text-[#00bfff]">Build:</span>{" "}
            {new Date().toISOString().split("T")[0]}
          </div>
          <div className="text-[#8b9dc3] text-xs">
            <span className="text-[#00bfff]">Framework:</span> React 19.1.0 +
            TypeScript 5.8.3
          </div>
        </div>
      </motion.div>

      <motion.div
        className="p-4 border border-[rgba(0,191,255,0.2)] rounded-lg transition-colors duration-200 ease-out hover:border-[rgba(0,191,255,0.4)] hover:bg-[rgba(0,191,255,0.02)]"
        variants={itemVariants}
      >
        <h4 className="text-[#00bfff] text-sm font-medium mb-2">Features</h4>
        <div className="space-y-1">
          <div className="text-[#8b9dc3] text-xs">
            • Advanced transaction tracing with debug_traceTransaction
          </div>
          <div className="text-[#8b9dc3] text-xs">
            • Real-time blockchain monitoring and network switching
          </div>
          <div className="text-[#8b9dc3] text-xs">
            • Opcode-level analysis and gas optimization insights
          </div>
          <div className="text-[#8b9dc3] text-xs">
            • Multi-network support (Mainnet, Sepolia)
          </div>
        </div>
      </motion.div>

      <motion.div
        className="p-4 border border-[rgba(0,191,255,0.2)] rounded-lg transition-colors duration-200 ease-out hover:border-[rgba(0,191,255,0.4)] hover:bg-[rgba(0,191,255,0.02)]"
        variants={itemVariants}
      >
        <h4 className="text-[#00bfff] text-sm font-medium mb-2">
          Technology Stack
        </h4>
        <div className="space-y-1">
          <div className="text-[#8b9dc3] text-xs">
            • ethers.js 6.15.0 for blockchain integration
          </div>
          <div className="text-[#8b9dc3] text-xs">
            • TanStack React Query 5.83.0 for state management
          </div>
          <div className="text-[#8b9dc3] text-xs">
            • Tailwind CSS 3.4.17 + shadcn/ui components
          </div>
          <div className="text-[#8b9dc3] text-xs">
            • Vite 7.0.5 build system with SWC
          </div>
        </div>
      </motion.div>
    </motion.div>
  </motion.div>
);
