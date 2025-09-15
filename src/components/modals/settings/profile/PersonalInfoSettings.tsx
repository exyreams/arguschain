import React, { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Save,
  X,
  Mail,
  User,
  Calendar,
  CheckCircle,
  Globe,
  AtSign,
  FileText,
} from "lucide-react";

import { Button, Input, Label, Tooltip } from "@/components/global";
import { useAuth, useUserProfile } from "@/lib/auth";
import { profileService } from "@/lib/profile/profileService";

const VerifiedIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M21.5609 10.7386L20.2009 9.15859C19.9409 8.85859 19.7309 8.29859 19.7309 7.89859V6.19859C19.7309 5.13859 18.8609 4.26859 17.8009 4.26859H16.1009C15.7109 4.26859 15.1409 4.05859 14.8409 3.79859L13.2609 2.43859C12.5709 1.84859 11.4409 1.84859 10.7409 2.43859L9.17086 3.80859C8.87086 4.05859 8.30086 4.26859 7.91086 4.26859H6.18086C5.12086 4.26859 4.25086 5.13859 4.25086 6.19859V7.90859C4.25086 8.29859 4.04086 8.85859 3.79086 9.15859L2.44086 10.7486C1.86086 11.4386 1.86086 12.5586 2.44086 13.2486L3.79086 14.8386C4.04086 15.1386 4.25086 15.6986 4.25086 16.0886V17.7986C4.25086 18.8586 5.12086 19.7286 6.18086 19.7286H7.91086C8.30086 19.7286 8.87086 19.9386 9.17086 20.1986L10.7509 21.5586C11.4409 22.1486 12.5709 22.1486 13.2709 21.5586L14.8509 20.1986C15.1509 19.9386 15.7109 19.7286 16.1109 19.7286H17.8109C18.8709 19.7286 19.7409 18.8586 19.7409 17.7986V16.0986C19.7409 15.7086 19.9509 15.1386 20.2109 14.8386L21.5709 13.2586C22.1509 12.5686 22.1509 11.4286 21.5609 10.7386ZM16.1609 10.1086L11.3309 14.9386C11.1909 15.0786 11.0009 15.1586 10.8009 15.1586C10.6009 15.1586 10.4109 15.0786 10.2709 14.9386L7.85086 12.5186C7.56086 12.2286 7.56086 11.7486 7.85086 11.4586C8.14086 11.1686 8.62086 11.1686 8.91086 11.4586L10.8009 13.3486L15.1009 9.04859C15.3909 8.75859 15.8709 8.75859 16.1609 9.04859C16.4509 9.33859 16.4509 9.81859 16.1609 10.1086Z"
      fill="currentColor"
    />
  </svg>
);

const profileFormSchema = z.object({
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name must be less than 100 characters"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be less than 30 characters")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Username can only contain letters, numbers, underscores, and hyphens"
    )
    .optional()
    .or(z.literal("")),
  bio: z
    .string()
    .max(500, "Bio must be less than 500 characters")
    .optional()
    .or(z.literal("")),
  website: z
    .string()
    .url("Please enter a valid URL")
    .regex(/^https?:\/\//, "Website must start with http:// or https://")
    .optional()
    .or(z.literal("")),
  email: z.string().email("Please enter a valid email address"),
});

interface PersonalInfoSettingsProps {
  onSuccess: (message: string) => void;
}

export const PersonalInfoSettings: React.FC<PersonalInfoSettingsProps> = ({
  onSuccess,
}) => {
  const { user: authUser } = useAuth();
  const { updateProfile } = useUserProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(
    null
  );
  const [checkingUsername, setCheckingUsername] = useState(false);

  const [userProfile, setUserProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const form = useForm({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: "",
      username: "",
      bio: "",
      website: "",
      email: "",
    },
  });

  // Load user profile data
  React.useEffect(() => {
    const loadUserProfile = async () => {
      if (!authUser?.id) {
        setProfileLoading(false);
        return;
      }

      try {
        const profile = await profileService.getUserProfile(authUser.id);
        setUserProfile(profile);

        // Update form with loaded data
        form.reset({
          fullName:
            profile?.full_name ||
            authUser?.user_metadata?.full_name ||
            authUser?.user_metadata?.name ||
            "",
          username:
            profile?.username || authUser?.user_metadata?.username || "",
          bio: profile?.bio || authUser?.user_metadata?.bio || "",
          website: profile?.website || authUser?.user_metadata?.website || "",
          email: authUser?.email || "",
        });
      } catch (error) {
        console.error("Failed to load user profile:", error);
        // Fallback to auth metadata
        form.reset({
          fullName:
            authUser?.user_metadata?.full_name ||
            authUser?.user_metadata?.name ||
            "",
          username: authUser?.user_metadata?.username || "",
          bio: authUser?.user_metadata?.bio || "",
          website: authUser?.user_metadata?.website || "",
          email: authUser?.email || "",
        });
      } finally {
        setProfileLoading(false);
      }
    };

    loadUserProfile();
  }, [authUser, form]);

  const handleSave = async (data: any) => {
    if (!authUser?.id) {
      console.error("User not authenticated");
      return;
    }

    try {
      setIsLoading(true);

      // Validate data
      const validationErrors = profileService.validateProfileData(data);
      if (validationErrors.length > 0) {
        console.error("Validation errors:", validationErrors);
        return;
      }

      // Update profile using Supabase
      await profileService.updateProfile(authUser.id, data);

      // Also update auth metadata if email changed
      if (data.email !== authUser.email) {
        await updateProfile({
          email: data.email,
        });
      }

      onSuccess("Profile updated successfully!");
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Check username availability with debouncing
  const checkUsernameAvailability = async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    setCheckingUsername(true);
    try {
      const isAvailable = await profileService.isUsernameAvailable(
        username,
        authUser?.id
      );
      setUsernameAvailable(isAvailable);
    } catch (error) {
      console.error("Username check failed:", error);
      setUsernameAvailable(false);
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleCancel = () => {
    form.reset();
    setIsEditing(false);
  };

  // Animation variants for smooth expand/collapse
  const editModeVariants = {
    collapsed: {
      height: 0,
      opacity: 0,
      transition: {
        height: { duration: 0.3 },
        opacity: { duration: 0.2 },
      },
    },
    expanded: {
      height: "auto",
      opacity: 1,
      transition: {
        height: { duration: 0.3 },
        opacity: { duration: 0.3, delay: 0.1 },
      },
    },
  };

  if (profileLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-4"
      >
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-[rgba(0,191,255,0.1)] rounded w-1/4"></div>
          <div className="h-12 bg-[rgba(0,191,255,0.1)] rounded"></div>
          <div className="h-4 bg-[rgba(0,191,255,0.1)] rounded w-1/4"></div>
          <div className="h-12 bg-[rgba(0,191,255,0.1)] rounded"></div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-4"
    >
      <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-accent-primary">
            Full Name
          </Label>
          {isEditing ? (
            <Input
              {...form.register("fullName")}
              className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)] text-[#8b9dc3]"
              placeholder="Enter your full name"
            />
          ) : (
            <div className="flex items-center justify-between p-3 bg-[rgba(25,28,40,0.5)] border border-[rgba(0,191,255,0.2)] rounded-lg">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-[#8b9dc3]" />
                <span className="text-[#8b9dc3]">
                  {userProfile?.full_name ||
                    authUser?.user_metadata?.full_name ||
                    authUser?.user_metadata?.name ||
                    "Not set"}
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
              >
                Edit
              </Button>
            </div>
          )}
          {form.formState.errors.fullName && (
            <p className="text-sm text-red-400">
              {form.formState.errors.fullName.message}
            </p>
          )}
        </div>

        {/* Animated edit form fields */}
        <motion.div
          variants={editModeVariants}
          initial="collapsed"
          animate={isEditing ? "expanded" : "collapsed"}
          className="overflow-hidden"
        >
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-accent-primary">
                Username
              </Label>
              <div className="relative">
                <Input
                  {...form.register("username")}
                  className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)] text-accent-primary pl-10"
                  placeholder="Enter your username"
                  onChange={(e) => {
                    form.setValue("username", e.target.value);
                    checkUsernameAvailability(e.target.value);
                  }}
                />
                <AtSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#8b9dc3]" />
                {checkingUsername && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin h-4 w-4 border-2 border-[#00bfff] border-t-transparent rounded-full"></div>
                  </div>
                )}
                {usernameAvailable === true && (
                  <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-400" />
                )}
                {usernameAvailable === false && (
                  <X className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-red-400" />
                )}
              </div>
              {form.formState.errors.username && (
                <p className="text-sm text-red-400">
                  {form.formState.errors.username.message}
                </p>
              )}
              {usernameAvailable === false && (
                <p className="text-sm text-red-400">
                  Username is not available
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-accent-primary">
                Bio
              </Label>
              <div className="relative">
                <textarea
                  {...form.register("bio")}
                  className="w-full min-h-[80px] p-3 pl-10 bg-[rgba(25,28,40,0.8)] border border-[rgba(0,191,255,0.2)] text-accent-primary rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#00bfff] focus:border-transparent"
                  placeholder="Tell us about yourself..."
                  maxLength={500}
                />
                <FileText className="absolute left-3 top-3 h-4 w-4 text-[#8b9dc3]" />
                <div className="absolute bottom-2 right-2 text-xs text-[#8b9dc3]">
                  {form.watch("bio")?.length || 0}/500
                </div>
              </div>
              {form.formState.errors.bio && (
                <p className="text-sm text-red-400">
                  {form.formState.errors.bio.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-accent-primary">
                Website
              </Label>
              <div className="relative">
                <Input
                  {...form.register("website")}
                  className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)] text-accent-primary pl-10"
                  placeholder="https://your-website.com"
                />
                <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#8b9dc3]" />
              </div>
              {form.formState.errors.website && (
                <p className="text-sm text-red-400">
                  {form.formState.errors.website.message}
                </p>
              )}
            </div>
          </div>
        </motion.div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-accent-primary">
            Email
          </Label>
          <div className="flex items-center gap-2 p-3 bg-[rgba(25,28,40,0.5)] border border-[rgba(0,191,255,0.2)] rounded-lg">
            <Mail className="size-4 text-[#8b9dc3]" />
            <span className="text-[#8b9dc3]">{authUser?.email}</span>
            {authUser?.email_confirmed_at && (
              <Tooltip content="Email Verified" placement="right" offset={15}>
                <span className="flex items-center flex-shrink-0 cursor-help">
                  <VerifiedIcon className="size-4 text-[#00bfff]" />
                </span>
              </Tooltip>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-accent-primary">
            Member Since
          </Label>
          <div className="flex items-center gap-2 p-3 bg-[rgba(25,28,40,0.5)] border border-[rgba(0,191,255,0.2)] rounded-lg">
            <Calendar className="h-4 w-4 text-[#8b9dc3]" />
            <span className="text-[#8b9dc3]">
              {authUser?.created_at
                ? new Date(authUser.created_at).toLocaleDateString()
                : "Unknown"}
            </span>
          </div>
        </div>

        {/* Animated action buttons */}
        <motion.div
          variants={editModeVariants}
          initial="collapsed"
          animate={isEditing ? "expanded" : "collapsed"}
          className="overflow-hidden"
        >
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              size="sm"
              disabled={isLoading || !form.formState.isDirty}
              className="bg-gradient-to-r from-[#00bfff] to-blue-400 hover:from-[#00bfff]/90 hover:to-blue-400/90 text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
              className="border-[rgba(0,191,255,0.3)] text-[#8b9dc3] hover:bg-[rgba(0,191,255,0.1)]"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </motion.div>
      </form>
    </motion.div>
  );
};
