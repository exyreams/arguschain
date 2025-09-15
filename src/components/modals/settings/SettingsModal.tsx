import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Download, Globe, Info, Network, Settings, User } from "lucide-react";

import { useModalState } from "@/hooks/shared";

// Import smaller components
import { ProfileSettings } from "./profile";
import {
  AboutSettings,
  ApiSettings,
  ExportSettings,
  NetworkSettings,
  PreferencesSettings,
} from "./index";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?:
    | "profile"
    | "network"
    | "preferences"
    | "api"
    | "export"
    | "about";
}

export default function SettingsModal({
  open,
  onOpenChange,
  initialTab,
}: SettingsModalProps) {
  const { modalState, updateModalState } = useModalState();
  const [activeTab, setActiveTab] = useState<
    "profile" | "network" | "preferences" | "api" | "export" | "about"
  >(modalState.tab || initialTab || "profile");

  // Update active tab when modalState changes
  useEffect(() => {
    const newTab = modalState.tab || initialTab || "profile";
    setActiveTab(newTab);
  }, [modalState.tab, initialTab]);

  // Update URL when tab changes
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId as any);
    updateModalState({ tab: tabId as any, section: undefined, editing: false });
  };

  const modalVariants = {
    hidden: {
      opacity: 0,
      scale: 0.95,
      y: 20,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1] as const,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: 20,
      transition: {
        duration: 0.2,
        ease: [0.4, 0, 0.2, 1] as const,
      },
    },
  };

  // Define tabs - same for both authenticated and anonymous users
  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "network", label: "Network", icon: Network },
    { id: "preferences", label: "Preferences", icon: Settings },
    { id: "api", label: "API Settings", icon: Globe },
    { id: "export", label: "Export Data", icon: Download },
    { id: "about", label: "About", icon: Info },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "profile":
        return <ProfileSettings modalState={modalState} />;
      case "network":
        return <NetworkSettings />;
      case "preferences":
        return <PreferencesSettings />;
      case "api":
        return <ApiSettings />;
      case "export":
        return <ExportSettings />;
      case "about":
        return <AboutSettings />;
      default:
        return <ProfileSettings modalState={modalState} />;
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="bg-[rgba(25,28,40,0.95)] border-[rgba(0,191,255,0.2)] backdrop-blur-[15px] max-w-4xl max-h-[80vh] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(15,20,25,0.95)] focus-visible:ring-[#00bfff] overflow-hidden p-0">
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="h-full"
            >
              <motion.div
                className="p-6 pb-0"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.3 }}
              >
                <DialogHeader>
                  <DialogTitle className="text-[#00bfff] text-xl font-semibold flex items-center gap-2">
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    >
                      <Settings className="w-5 h-5" />
                    </motion.div>
                    Settings
                  </DialogTitle>
                </DialogHeader>
              </motion.div>

              <div className="flex gap-6 px-6 pb-6 h-[500px]">
                <motion.div
                  className="w-48 flex-shrink-0"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                >
                  <nav className="space-y-2 mt-4">
                    {tabs.map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <motion.button
                          key={tab.id}
                          onClick={() => handleTabChange(tab.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg focus:outline-none transition-colors duration-200 ease-out ${
                            activeTab === tab.id
                              ? "bg-[rgba(0,191,255,0.15)] text-[#00bfff] border border-[rgba(0,191,255,0.6)]"
                              : "text-[#8b9dc3] bg-transparent border border-transparent hover:bg-[rgba(0,191,255,0.08)] hover:text-[#00bfff]"
                          }`}
                          whileHover={
                            activeTab !== tab.id
                              ? {
                                  scale: 1.01,
                                  transition: {
                                    duration: 0.15,
                                    ease: [0.4, 0, 0.2, 1] as const,
                                  },
                                }
                              : {}
                          }
                          whileTap={{ scale: 0.98 }}
                          animate={
                            activeTab === tab.id
                              ? {
                                  scale: 1.02,
                                  transition: {
                                    duration: 0.2,
                                    ease: [0.4, 0, 0.2, 1] as const,
                                  },
                                }
                              : { scale: 1 }
                          }
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{tab.label}</span>
                        </motion.button>
                      );
                    })}
                  </nav>
                </motion.div>

                <motion.div
                  className="flex-1 overflow-hidden"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4, duration: 0.3 }}
                >
                  <div className="h-full custom-scrollbar overflow-y-auto overflow-x-hidden pr-2">
                    <div className="pr-4 space-y-4 pb-4">
                      <AnimatePresence mode="wait">
                        {renderTabContent()}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
