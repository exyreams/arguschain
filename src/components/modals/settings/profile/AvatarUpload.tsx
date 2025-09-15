import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, Camera, Loader2, Edit3, User } from "lucide-react";

import { Button } from "@/components/global";
import { useAuth } from "@/lib/auth";
import { avatarService } from "@/lib/profile/avatarService";
import { getUserInitials } from "@/lib/profile/utils";
import { cn } from "@/lib/utils";

interface AvatarUploadProps {
  currentAvatar?: string;
  onUploadSuccess: (url: string) => void;
  onUploadError: (error: string) => void;
  className?: string;
  showEditMode?: boolean;
}

export const AvatarUpload: React.FC<AvatarUploadProps> = ({
  currentAvatar,
  onUploadSuccess,
  onUploadError,
  className,
  showEditMode = false,
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [isEditMode, setIsEditMode] = useState(showEditMode);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const getInitials = (user: any): string => {
    if (!user) return "?";

    const fullName = user.user_metadata?.full_name || user.user_metadata?.name;
    if (fullName && fullName.length > 0) {
      const names = fullName
        .split(" ")
        .filter((name: string) => name.length > 0);
      if (names.length >= 2) {
        return `${names[0][0]}${names[1][0]}`.toUpperCase();
      }
      return names[0][0].toUpperCase();
    }

    if (user.email && user.email.length > 0) {
      return user.email[0].toUpperCase();
    }

    return "?";
  };

  const initials = getInitials(user);

  const handleFileSelect = (file: File) => {
    // Validate file
    const errors = avatarService.validateFile(file);
    if (errors.length > 0) {
      onUploadError(errors[0].message);
      return;
    }

    // Create preview and store file for later upload
    const preview = avatarService.createPreviewUrl(file);
    setPreviewUrl(preview);
    setPendingFile(file);
    setHasChanges(true);
  };

  const uploadFile = async (file: File) => {
    if (!user?.id) {
      onUploadError("User not authenticated");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const { url } = await avatarService.uploadAvatar(user.id, file);
      onUploadSuccess(url);

      // Clean up preview and reset state
      if (previewUrl) {
        avatarService.revokePreviewUrl(previewUrl);
        setPreviewUrl(null);
      }
      setPendingFile(null);
      setHasChanges(false);
      setIsEditMode(false);
    } catch (error) {
      onUploadError(error instanceof Error ? error.message : "Upload failed");

      // Clean up preview on error
      if (previewUrl) {
        avatarService.revokePreviewUrl(previewUrl);
        setPreviewUrl(null);
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSave = async () => {
    if (pendingFile) {
      await uploadFile(pendingFile);
    }
  };

  const handleCancel = () => {
    // Clean up preview
    if (previewUrl) {
      avatarService.revokePreviewUrl(previewUrl);
      setPreviewUrl(null);
    }
    setPendingFile(null);
    setHasChanges(false);
    setIsEditMode(false);
  };

  const handleFileInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);

    const file = event.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveAvatar = async () => {
    if (!user?.id || !currentAvatar) return;

    try {
      await avatarService.deleteAvatar(user.id, currentAvatar);
      onUploadSuccess("");
    } catch (error) {
      onUploadError(
        error instanceof Error ? error.message : "Failed to remove avatar"
      );
    }
  };

  const displayAvatar = previewUrl || currentAvatar;

  return (
    <div className={cn("relative", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
        aria-label="Upload avatar"
      />

      {!isEditMode ? (
        // Display Mode - Just show avatar with edit button
        <div className="relative">
          <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[rgba(0,191,255,0.3)]">
            {displayAvatar ? (
              <img
                src={displayAvatar}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#00bfff] to-[#0080cc] flex items-center justify-center text-white text-xl font-medium">
                {initials}
              </div>
            )}
          </div>

          {/* Edit button */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditMode(true)}
            className="absolute -bottom-2 -right-2 w-8 h-8 p-0 rounded-full border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)] bg-[rgba(25,28,40,0.9)] backdrop-blur-sm"
            aria-label="Edit avatar"
          >
            <Edit3 className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        // Edit Mode - Show upload interface
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="space-y-4"
          >
            <div
              className={cn(
                "relative group cursor-pointer",
                "w-24 h-24 rounded-full overflow-hidden mx-auto",
                "border-2 transition-all duration-300",
                dragOver
                  ? "border-[#00bfff] border-dashed bg-[rgba(0,191,255,0.1)]"
                  : "border-[rgba(0,191,255,0.3)] hover:border-[#00bfff]"
              )}
              onClick={handleClick}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              role="button"
              tabIndex={0}
              aria-label="Upload or change avatar"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleClick();
                }
              }}
            >
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#00bfff] to-[#0080cc] flex items-center justify-center text-white text-xl font-medium">
                  {initials}
                </div>
              )}

              {/* Upload overlay */}
              <motion.div
                className={cn(
                  "absolute inset-0 bg-black/50 flex items-center justify-center",
                  "opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                )}
                initial={false}
                animate={{ opacity: isUploading ? 1 : 0 }}
              >
                {isUploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                    <span className="text-xs text-white">
                      {uploadProgress}%
                    </span>
                  </div>
                ) : (
                  <Camera className="h-6 w-6 text-white" />
                )}
              </motion.div>

              {/* Upload progress ring */}
              {isUploading && (
                <svg
                  className="absolute inset-0 w-full h-full -rotate-90"
                  viewBox="0 0 100 100"
                >
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="2"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="#00bfff"
                    strokeWidth="2"
                    strokeDasharray={`${2 * Math.PI * 45}`}
                    strokeDashoffset={`${2 * Math.PI * 45 * (1 - uploadProgress / 100)}`}
                    className="transition-all duration-300"
                  />
                </svg>
              )}

              {/* Remove button */}
              {currentAvatar && !isUploading && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveAvatar();
                  }}
                  className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full border-red-500 text-red-400 hover:bg-red-900/20 hover:text-red-300"
                  aria-label="Remove avatar"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Upload instructions */}
            {!hasChanges && (
              <div className="text-center">
                <p className="text-xs text-[#8b9dc3]">
                  Click or drag to upload
                </p>
                <p className="text-xs text-[#8b9dc3]/70">
                  Max 5MB • JPG, PNG, GIF, WebP
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 justify-center">
              {hasChanges && !isUploading && (
                <Button
                  size="sm"
                  onClick={handleSave}
                  className="bg-[#00bfff] text-white hover:bg-[#0099cc] border-[#00bfff]"
                  disabled={isUploading}
                >
                  Save Avatar
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                className="border-[rgba(0,191,255,0.3)] text-[#8b9dc3] hover:bg-[rgba(0,191,255,0.1)]"
                disabled={isUploading}
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
};
