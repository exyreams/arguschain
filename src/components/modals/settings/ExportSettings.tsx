import { motion } from "framer-motion";
import { Button } from "@/components/global";

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

export const ExportSettings = () => (
  <motion.div
    className="space-y-4"
    variants={contentVariants}
    initial="hidden"
    animate="visible"
    exit="exit"
    key="export"
  >
    <motion.div variants={itemVariants}>
      <h3 className="text-[#00bfff] text-lg font-semibold mb-2">
        Export & Backup
      </h3>
      <p className="text-[#8b9dc3] text-sm mb-4">
        Export your analysis data and application settings.
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
          Transaction Analysis
        </h4>
        <p className="text-[#8b9dc3] text-xs mb-3">
          Export transaction trace data
        </p>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            variant="outline"
            size="sm"
            className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
            disabled
          >
            Export JSON (Coming Soon)
          </Button>
        </motion.div>
      </motion.div>

      <motion.div
        className="p-4 border border-[rgba(0,191,255,0.2)] rounded-lg transition-colors duration-200 ease-out hover:border-[rgba(0,191,255,0.4)] hover:bg-[rgba(0,191,255,0.02)]"
        variants={itemVariants}
      >
        <h4 className="text-[#00bfff] text-sm font-medium mb-2">Bookmarks</h4>
        <p className="text-[#8b9dc3] text-xs mb-3">
          Export saved analyses and bookmarks
        </p>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            variant="outline"
            size="sm"
            className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
            disabled
          >
            Export Bookmarks (Coming Soon)
          </Button>
        </motion.div>
      </motion.div>

      <motion.div
        className="p-4 border border-[rgba(0,191,255,0.2)] rounded-lg transition-colors duration-200 ease-out hover:border-[rgba(0,191,255,0.4)] hover:bg-[rgba(0,191,255,0.02)]"
        variants={itemVariants}
      >
        <h4 className="text-[#00bfff] text-sm font-medium mb-2">
          Settings Backup
        </h4>
        <p className="text-[#8b9dc3] text-xs mb-3">
          Backup your application settings
        </p>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            variant="outline"
            size="sm"
            className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
            disabled
          >
            Export Settings (Coming Soon)
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  </motion.div>
);
