import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Database, Info, Shield, User } from "lucide-react";
import { Button } from "@/components/global";
import { type ProfileSection, useModalState } from "@/hooks/shared";
import { DataSettings } from "./DataSettings";
import { UserInfoSettings } from "./UserInfoSettings";
import { SecuritySettings } from "./SecuritySettings";
import { PersonalInfoSettings } from "./PersonalInfoSettings";

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

interface ProfileSettingsProps {
  modalState?: {
    tab?: string;
    section?: ProfileSection;
    editing?: boolean;
  };
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({
  modalState,
}) => {
  const { updateModalState } = useModalState();
  const [profileSection, setProfileSection] = useState<ProfileSection>(
    modalState?.section || "info",
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Update active section when modalState changes
  useEffect(() => {
    if (modalState?.section) {
      setProfileSection(modalState.section);
    }
  }, [modalState?.section]);

  const handleSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  return (
    <motion.div
      className="space-y-4"
      variants={contentVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      key="profile"
    >
      {/* Success Message */}
      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-3 bg-gradient-to-r from-green-500/20 to-green-600/20 border border-green-500/30 rounded-lg text-green-400"
        >
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm">{successMessage}</span>
        </motion.div>
      )}

      <motion.div variants={itemVariants}>
        <h3 className="text-[#00bfff] text-lg font-semibold mb-2">
          Profile Management
        </h3>
        <p className="text-[#8b9dc3] text-sm mb-4">
          Manage your account information, security settings, and data.
        </p>
      </motion.div>

      {/* Profile Section Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { id: "info", label: "Info", icon: Info },
          { id: "personal", label: "Personal", icon: User },
          { id: "security", label: "Security", icon: Shield },
          { id: "data", label: "Data", icon: Database },
        ].map((section) => {
          const Icon = section.icon;
          return (
            <Button
              key={section.id}
              variant="outline"
              onClick={() => {
                setProfileSection(section.id as ProfileSection);
                updateModalState({
                  section: section.id as ProfileSection,
                  editing: false,
                });
              }}
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors  ${
                profileSection === section.id
                  ? "bg-[rgba(0,191,255,0.15)] text-[#00bfff] border border-[rgba(0,191,255,0.6)]"
                  : "text-[#8b9dc3] hover:bg-[rgba(0,191,255,0.08)] hover:text-[#00bfff]"
              }`}
            >
              <Icon className="h-4 w-4" />
              {section.label}
            </Button>
          );
        })}
      </div>

      {/* Section Content */}
      {profileSection === "info" && (
        <UserInfoSettings onSuccess={handleSuccess} />
      )}
      {profileSection === "personal" && (
        <PersonalInfoSettings
          onSuccess={handleSuccess}
          isEditing={modalState?.editing || false}
        />
      )}
      {profileSection === "security" && (
        <SecuritySettings onSuccess={handleSuccess} />
      )}
      {profileSection === "data" && <DataSettings onSuccess={handleSuccess} />}
    </motion.div>
  );
};
