import { useState } from "react";
import { motion } from "framer-motion";
import {
  Download,
  AlertTriangle,
  Trash2,
  X,
  FileText,
  Database,
  Calendar,
  HardDrive,
  Loader2,
  CheckCircle,
} from "lucide-react";

import { Button, Input, Label, Checkbox } from "@/components/global";
import { useAuth } from "@/lib/auth";
import { profileService } from "@/lib/profile/profileService";

interface DataSettingsProps {
  onSuccess: (message: string) => void;
}

const dataTypes = [
  {
    id: "profile",
    name: "Profile Data",
    description: "Personal information, preferences, and account settings",
    icon: FileText,
  },
  {
    id: "analysis-history",
    name: "Analysis History",
    description: "Transaction analysis results and saved queries",
    icon: Database,
  },
  {
    id: "usage-data",
    name: "Usage Statistics",
    description: "Platform usage metrics and activity logs",
    icon: Calendar,
  },
];

export const DataSettings: React.FC<DataSettingsProps> = ({ onSuccess }) => {
  const { user } = useAuth();
  const [selectedDataTypes, setSelectedDataTypes] = useState(["profile"]);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDataTypeToggle = (dataType: string) => {
    setSelectedDataTypes((prev) =>
      prev.includes(dataType)
        ? prev.filter((t) => t !== dataType)
        : [...prev, dataType]
    );
  };

  const handleExport = async (format: "json" | "csv") => {
    if (!user?.id) {
      console.error("User not authenticated");
      return;
    }

    try {
      setIsExporting(true);

      // Export real user data from Supabase
      const exportData = await profileService.exportUserData(user.id, format);

      const blob = new Blob([exportData], {
        type: format === "json" ? "application/json" : "text/csv",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `arguschain-data-export-${new Date().toISOString().split("T")[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onSuccess(`Data exported successfully as ${format.toUpperCase()}!`);
    } catch (error) {
      console.error("Export failed:", error);
      onSuccess("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== "DELETE" || !user?.id) return;

    try {
      setIsDeleting(true);

      // Delete account and all associated data from Supabase
      await profileService.deleteUserAccount(user.id);

      onSuccess("Account deletion completed. You will be logged out shortly.");
      setIsDeleteDialogOpen(false);

      // Redirect to home page after a short delay
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    } catch (error) {
      console.error("Failed to delete account:", error);
      onSuccess(
        "Account deletion failed. Please try again or contact support."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      {/* Data Export Section */}
      <div className="space-y-4">
        <h4 className="text-[#00bfff] text-sm font-medium flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export Your Data
        </h4>

        <div className="p-4 border border-[rgba(0,191,255,0.2)] rounded-lg space-y-4">
          <p className="text-[#8b9dc3] text-xs">
            Download a copy of your data in JSON or CSV format. Select which
            data types to include.
          </p>

          {/* Data Type Selection */}
          <div className="space-y-3">
            <Label className="text-xs font-medium text-[#8b9dc3]">
              Select Data to Export
            </Label>
            {dataTypes.map((dataType) => {
              const IconComponent = dataType.icon;
              return (
                <div key={dataType.id} className="flex items-start gap-3">
                  <Checkbox
                    id={dataType.id}
                    checked={selectedDataTypes.includes(dataType.id)}
                    onChange={() => handleDataTypeToggle(dataType.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <label
                      htmlFor={dataType.id}
                      className="flex items-center gap-2 text-xs font-medium text-[#8b9dc3] cursor-pointer"
                    >
                      <IconComponent className="h-3 w-3 text-[#8b9dc3]" />
                      {dataType.name}
                    </label>
                    <p className="text-xs text-[#6b7280] mt-1">
                      {dataType.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Export Buttons */}
          <div className="flex items-center gap-3">
            <Button
              onClick={() => handleExport("json")}
              disabled={selectedDataTypes.length === 0 || isExporting}
              size="sm"
              className="bg-gradient-to-r from-[#00bfff] to-blue-400 hover:from-[#00bfff]/90 hover:to-blue-400/90 text-white"
            >
              {isExporting ? (
                <Loader2 className="h-3 w-3 animate-spin mr-2" />
              ) : (
                <Download className="h-3 w-3 mr-2" />
              )}
              Export JSON
            </Button>
            <Button
              onClick={() => handleExport("csv")}
              disabled={selectedDataTypes.length === 0 || isExporting}
              size="sm"
              variant="outline"
              className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
            >
              {isExporting ? (
                <Loader2 className="h-3 w-3 animate-spin mr-2" />
              ) : (
                <Download className="h-3 w-3 mr-2" />
              )}
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Storage Usage */}
      <div className="space-y-4">
        <h4 className="text-[#00bfff] text-sm font-medium flex items-center gap-2">
          <HardDrive className="h-4 w-4" />
          Storage Usage
        </h4>

        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-[rgba(25,28,40,0.5)] border border-[rgba(0,191,255,0.2)] rounded-lg text-center">
            <p className="text-lg font-bold text-[#00bfff]">0</p>
            <p className="text-xs text-[#8b9dc3]">Analyses</p>
          </div>
          <div className="p-3 bg-[rgba(25,28,40,0.5)] border border-[rgba(0,191,255,0.2)] rounded-lg text-center">
            <p className="text-lg font-bold text-green-400">0</p>
            <p className="text-xs text-[#8b9dc3]">Queries</p>
          </div>
          <div className="p-3 bg-[rgba(25,28,40,0.5)] border border-[rgba(0,191,255,0.2)] rounded-lg text-center">
            <p className="text-lg font-bold text-purple-400">0%</p>
            <p className="text-xs text-[#8b9dc3]">Storage</p>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="space-y-4">
        <h4 className="text-red-400 text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Danger Zone
        </h4>

        <div className="p-4 border border-red-500/20 rounded-lg bg-red-500/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trash2 className="h-5 w-5 text-red-400" />
              <div>
                <h4 className="text-red-400 text-sm font-medium">
                  Delete Account
                </h4>
                <p className="text-[#8b9dc3] text-xs">
                  Permanently delete your account and all data
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(true)}
              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="h-3 w-3 mr-2" />
              Delete Account
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {isDeleteDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-[rgba(25,28,40,0.95)] border border-red-500/30 rounded-lg p-6 w-full max-w-md mx-4 backdrop-blur-[15px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-red-400 flex items-center gap-2 text-lg font-semibold">
                <AlertTriangle className="h-5 w-5" />
                Delete Account
              </h3>
              <button
                onClick={() => setIsDeleteDialogOpen(false)}
                className="text-[#8b9dc3] hover:text-[#00bfff]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-300">
                  <strong>Warning:</strong> This action is permanent and cannot
                  be undone. All your data will be permanently deleted.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#8b9dc3]">
                  Type "DELETE" to confirm account deletion
                </Label>
                <Input
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)] text-[#8b9dc3]"
                  placeholder="Type DELETE here"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmation !== "DELETE" || isDeleting}
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin mr-2" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-3 w-3 mr-2" />
                      Delete Account
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsDeleteDialogOpen(false);
                    setDeleteConfirmation("");
                  }}
                  disabled={isDeleting}
                  className="border-[rgba(0,191,255,0.3)] text-[#8b9dc3] hover:bg-[rgba(0,191,255,0.1)]"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
