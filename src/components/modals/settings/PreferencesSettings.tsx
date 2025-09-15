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

export const PreferencesSettings = () => (
  <motion.div
    className="space-y-4"
    variants={contentVariants}
    initial="hidden"
    animate="visible"
    exit="exit"
    key="preferences"
  >
    <motion.div variants={itemVariants}>
      <h3 className="text-[#00bfff] text-lg font-semibold mb-2">
        Application Preferences
      </h3>
      <p className="text-[#8b9dc3] text-sm mb-4">
        Customize your Arguschain experience with these settings.
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
          Theme Settings
        </h4>
        <p className="text-[#8b9dc3] text-xs mb-3">
          Choose your preferred color scheme
        </p>
        <div className="text-[#6b7280] text-xs">
          Coming soon: Light/Dark theme toggle
        </div>
      </motion.div>

      <motion.div
        className="p-4 border border-[rgba(0,191,255,0.2)] rounded-lg transition-colors duration-200 ease-out hover:border-[rgba(0,191,255,0.4)] hover:bg-[rgba(0,191,255,0.02)]"
        variants={itemVariants}
      >
        <h4 className="text-[#00bfff] text-sm font-medium mb-2">
          Data Refresh
        </h4>
        <p className="text-[#8b9dc3] text-xs mb-3">
          Configure automatic data refresh intervals
        </p>
        <div className="text-[#6b7280] text-xs">
          Coming soon: Customizable refresh rates
        </div>
      </motion.div>

      <motion.div
        className="p-4 border border-[rgba(0,191,255,0.2)] rounded-lg transition-colors duration-200 ease-out hover:border-[rgba(0,191,255,0.4)] hover:bg-[rgba(0,191,255,0.02)]"
        variants={itemVariants}
      >
        <h4 className="text-[#00bfff] text-sm font-medium mb-2">
          Notifications
        </h4>
        <p className="text-[#8b9dc3] text-xs mb-3">
          Manage notification preferences
        </p>
        <div className="text-[#6b7280] text-xs">
          Coming soon: Notification settings
        </div>
      </motion.div>
    </motion.div>
  </motion.div>
);
