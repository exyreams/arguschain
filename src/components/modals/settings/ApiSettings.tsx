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

export const ApiSettings = () => (
  <motion.div
    className="space-y-4"
    variants={contentVariants}
    initial="hidden"
    animate="visible"
    exit="exit"
    key="api"
  >
    <motion.div variants={itemVariants}>
      <h3 className="text-[#00bfff] text-lg font-semibold mb-2">
        API Configuration
      </h3>
      <p className="text-[#8b9dc3] text-sm mb-4">
        Configure API endpoints and authentication settings.
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
          RPC Endpoints
        </h4>
        <p className="text-[#8b9dc3] text-xs mb-3">Current RPC configuration</p>
        <div className="space-y-2">
          <div className="text-[#6b7280] text-xs">
            <span className="text-[#00bfff]">Mainnet:</span> Google Cloud
            Blockchain RPC
          </div>
          <div className="text-[#6b7280] text-xs">
            <span className="text-[#00bfff]">Sepolia:</span> Google Cloud
            Blockchain RPC
          </div>
        </div>
      </motion.div>

      <motion.div
        className="p-4 border border-[rgba(0,191,255,0.2)] rounded-lg transition-colors duration-200 ease-out hover:border-[rgba(0,191,255,0.4)] hover:bg-[rgba(0,191,255,0.02)]"
        variants={itemVariants}
      >
        <h4 className="text-[#00bfff] text-sm font-medium mb-2">
          Rate Limiting
        </h4>
        <p className="text-[#8b9dc3] text-xs mb-3">
          API request rate limiting settings
        </p>
        <div className="text-[#6b7280] text-xs">
          Coming soon: Custom rate limit configuration
        </div>
      </motion.div>

      <motion.div
        className="p-4 border border-[rgba(0,191,255,0.2)] rounded-lg transition-colors duration-200 ease-out hover:border-[rgba(0,191,255,0.4)] hover:bg-[rgba(0,191,255,0.02)]"
        variants={itemVariants}
      >
        <h4 className="text-[#00bfff] text-sm font-medium mb-2">
          Authentication
        </h4>
        <p className="text-[#8b9dc3] text-xs mb-3">
          API key and authentication management
        </p>
        <div className="text-[#6b7280] text-xs">
          Coming soon: API key management
        </div>
      </motion.div>
    </motion.div>
  </motion.div>
);
