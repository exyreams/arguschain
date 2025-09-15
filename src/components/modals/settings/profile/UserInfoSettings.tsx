import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Calendar,
  Camera,
  Check,
  Clock,
  Link,
  Loader2,
  Mail,
  Shield,
  Unlink,
  Upload,
  User,
  UserPlus,
  AtSign,
  Globe,
  FileText,
} from "lucide-react";

import { Button, Tooltip } from "@/components/global";
import { useAuth, useUserProfile } from "@/lib/auth";
import {
  formatRelativeTime,
  getUserDisplayData,
  getUserInitials,
} from "@/lib/profile";
import { AvatarUpload } from "./AvatarUpload";
import { profileService } from "@/lib/profile/profileService";

// New Verification Icon SVG
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

// Custom SVG Icons for OAuth providers
const GoogleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

const GitHubIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

const DiscordIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0189 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1568 2.4189Z" />
  </svg>
);

interface UserInfoSettingsProps {
  onSuccess?: (message: string) => void;
}

// Get real session data from Supabase
const getSessionData = (session: any, user: any) => {
  if (!session || !user) {
    return {
      sessionId: "unknown",
      startTime: new Date().toISOString(),
      limitations: {
        maxAnalysisHistory: 10,
        maxSavedQueries: 5,
        canExport: false,
        canSaveSettings: false,
      },
      usage: {
        analysisCount: 0,
        savedQueries: 0,
      },
    };
  }

  return {
    sessionId: session.access_token?.slice(-12) || "unknown",
    startTime: user.created_at || new Date().toISOString(),
    limitations: {
      maxAnalysisHistory: user.is_anonymous ? 10 : Infinity,
      maxSavedQueries: user.is_anonymous ? 5 : Infinity,
      canExport: !user.is_anonymous,
      canSaveSettings: !user.is_anonymous,
    },
    usage: {
      // TODO: Get real usage data from database
      analysisCount: 0,
      savedQueries: 0,
    },
  };
};

export const UserInfoSettings: React.FC<UserInfoSettingsProps> = ({
  onSuccess,
}) => {
  const { user, isAuthenticated, session } = useAuth();
  const { updateProfile } = useUserProfile();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [sessionData] = useState(() => getSessionData(session, user));
  const [sessionDuration, setSessionDuration] = useState(0);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userSessions, setUserSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isAnonymous = !isAuthenticated || user?.is_anonymous;
  const userDisplayData = getUserDisplayData(userProfile || user);

  // Load user profile and sessions data
  React.useEffect(() => {
    const loadUserData = async () => {
      if (!user?.id || isAnonymous) {
        setLoading(false);
        return;
      }

      try {
        const [profile, sessions] = await Promise.all([
          profileService.getCompleteUserProfile(user.id),
          profileService.getUserSessions(user.id),
        ]);

        setUserProfile(profile);
        setUserSessions(sessions);
      } catch (error) {
        console.error("Failed to load user data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [user?.id, isAnonymous]);

  // Update session duration for anonymous users
  React.useEffect(() => {
    if (isAnonymous) {
      const updateDuration = () => {
        const duration = Date.now() - new Date(sessionData.startTime).getTime();
        setSessionDuration(duration);
      };

      updateDuration();
      const interval = setInterval(updateDuration, 60000);
      return () => clearInterval(interval);
    }
  }, [isAnonymous, sessionData.startTime]);

  const handleAvatarUploadSuccess = (url: string) => {
    onSuccess?.("Avatar updated successfully!");
  };

  const handleAvatarUploadError = (error: string) => {
    setUploadError(error);
  };

  const handleCreateAccount = () => {
    window.location.href = "/auth/signup";
  };

  const handleLinkAccount = (provider: "google" | "github" | "discord") => {
    // TODO: Implement OAuth linking
    console.log(`Link ${provider} account`);
  };

  const getConnectedProviders = () => {
    // TODO: Get real connected providers from user data
    return user?.app_metadata?.providers || [];
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
      key="info"
    >
      {/* Error Message */}
      {uploadError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-3 bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/30 rounded-lg text-red-400 mb-4"
        >
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{uploadError}</span>
          <button
            onClick={() => setUploadError(null)}
            className="ml-auto text-red-300 hover:text-red-200 transition-colors duration-200"
          >
            ✕
          </button>
        </motion.div>
      )}

      {/* Title */}
      <div>
        <h3 className="text-[#00bfff] text-lg font-semibold mb-2">
          {isAnonymous ? "Anonymous User Information" : "Account Information"}
        </h3>
        <p className="text-[#8b9dc3] text-sm mb-6">
          {isAnonymous
            ? "View your current session details and limitations"
            : "View and manage your account information and connected services"}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-4 border border-[rgba(0,191,255,0.2)] rounded-lg bg-gradient-to-br from-[rgba(0,191,255,0.05)] to-[rgba(0,191,255,0.02)]">
        {/* Avatar Section */}
        {!isAnonymous ? (
          <AvatarUpload
            currentAvatar={user?.user_metadata?.avatar_url}
            onUploadSuccess={handleAvatarUploadSuccess}
            onUploadError={handleAvatarUploadError}
            className="flex-shrink-0"
          />
        ) : (
          <div className="relative flex-shrink-0">
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[rgba(0,191,255,0.3)]">
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#00bfff]/20 to-[#00bfff]/10 border border-[#00bfff]/30 text-[#00bfff]">
                <User className="h-8 w-8" />
              </div>
            </div>
          </div>
        )}

        {/* User Info Section */}
        <div className="flex-1 min-w-0">
          <div className="space-y-2">
            <h2 className="text-lg sm:text-xl font-bold text-[#00bfff] truncate">
              {isAnonymous
                ? "Anonymous User"
                : userDisplayData?.fullName || "User"}
            </h2>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <p className="text-[#8b9dc3] text-sm truncate">
                {isAnonymous
                  ? `Session: ${sessionData.sessionId.slice(0, 8)}...${sessionData.sessionId.slice(-4)}`
                  : user?.email}
              </p>

              {!isAnonymous && user?.email_confirmed_at && (
                <Tooltip content="Email Verified" placement="right" offset={15}>
                  <span className="flex items-center cursor-help">
                    <VerifiedIcon className="h-4 w-4 text-[#00bfff]" />
                  </span>
                </Tooltip>
              )}
            </div>

            {/* Bio section for authenticated users - below email */}
            {!isAnonymous && userProfile?.bio && (
              <p className="text-sm text-[#8b9dc3] mt-2 line-clamp-2">
                {userProfile.bio}
              </p>
            )}

            {/* Website for authenticated users */}
            {!isAnonymous && userProfile?.website && (
              <a
                href={userProfile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#00bfff] hover:text-[#0099cc] underline mt-1 inline-block"
              >
                {userProfile.website}
              </a>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-xs text-[#8b9dc3]">
              {isAnonymous ? (
                <>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-[#00bfff]" />
                    <span>
                      Session started{" "}
                      {formatRelativeTime(sessionData.startTime)}
                    </span>
                  </div>
                  <span className="hidden sm:inline text-[rgba(0,191,255,0.3)]">
                    •
                  </span>
                  <span className="text-yellow-400">
                    Limited features available
                  </span>
                </>
              ) : (
                <>
                  <span>
                    Member since{" "}
                    {formatRelativeTime(
                      user?.created_at || new Date().toISOString()
                    )}
                  </span>
                  <span className="hidden sm:inline text-[rgba(0,191,255,0.3)]">
                    •
                  </span>
                  <span>
                    Last login{" "}
                    {formatRelativeTime(
                      user?.last_sign_in_at || new Date().toISOString()
                    )}
                  </span>
                </>
              )}
            </div>

            {/* Connected Accounts for Authenticated Users */}
            {!isAnonymous && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-[#8b9dc3]">Connected:</span>
                <div className="flex items-center gap-1">
                  {getConnectedProviders().includes("google") && (
                    <GoogleIcon className="h-4 w-4" />
                  )}
                  {getConnectedProviders().includes("github") && (
                    <GitHubIcon className="h-4 w-4" />
                  )}
                  {getConnectedProviders().includes("discord") && (
                    <DiscordIcon className="h-4 w-4" />
                  )}
                  {getConnectedProviders().length === 0 && (
                    <span className="text-xs text-[#6b7280]">None</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons - Only for Anonymous Users */}
        {isAnonymous && (
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              onClick={handleCreateAccount}
              size="sm"
              className="bg-gradient-to-r from-[#00bfff] to-blue-400 hover:from-[#00bfff]/90 hover:to-blue-400/90 text-white w-full sm:w-auto transition-all duration-300 shadow-lg hover:shadow-[#00bfff]/20"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Create Account
            </Button>
          </div>
        )}
      </div>

      {/* Detailed Information Sections */}
      {isAnonymous ? (
        <>
          {/* Session Stats */}
          <div className="space-y-4">
            <h4 className="text-[#00bfff] text-sm font-medium">
              Session Statistics
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="text-center p-3 rounded-lg bg-gradient-to-br from-[#00bfff]/10 to-[#00bfff]/5 border border-[#00bfff]/20">
                <p className="text-lg font-bold text-[#00bfff]">
                  {sessionData.usage.analysisCount}
                </p>
                <p className="text-xs text-[#8b9dc3]">Analyses Used</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20">
                <p className="text-lg font-bold text-green-400">
                  {sessionData.limitations.maxAnalysisHistory -
                    sessionData.usage.analysisCount}
                </p>
                <p className="text-xs text-[#8b9dc3]">Remaining</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20">
                <p className="text-lg font-bold text-purple-400">
                  {sessionData.usage.savedQueries}
                </p>
                <p className="text-xs text-[#8b9dc3]">Saved Queries</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20">
                <p className="text-lg font-bold text-orange-400">
                  {Math.floor(sessionDuration / (1000 * 60))}m
                </p>
                <p className="text-xs text-[#8b9dc3]">Session Time</p>
              </div>
            </div>
          </div>

          {/* Session Limitations */}
          <div className="space-y-4">
            <h4 className="text-[#00bfff] text-sm font-medium">
              Current Limitations
            </h4>
            <div className="space-y-3">
              <div className="p-3 border border-[rgba(0,191,255,0.2)] rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[#8b9dc3]">
                    Analysis History
                  </span>
                  <span className="text-xs text-[#6b7280]">
                    {sessionData.usage.analysisCount}/
                    {sessionData.limitations.maxAnalysisHistory}
                  </span>
                </div>
                <div className="w-full bg-[rgba(25,28,40,0.8)] rounded-full h-2">
                  <div
                    className="bg-[#00bfff] h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min((sessionData.usage.analysisCount / sessionData.limitations.maxAnalysisHistory) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 border border-[rgba(0,191,255,0.2)] rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                    <span className="text-[#8b9dc3]">Data Export</span>
                  </div>
                  <p className="text-xs text-[#6b7280] mt-1">
                    Requires account
                  </p>
                </div>
                <div className="p-3 border border-[rgba(0,191,255,0.2)] rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                    <span className="text-[#8b9dc3]">Save Settings</span>
                  </div>
                  <p className="text-xs text-[#6b7280] mt-1">
                    Requires account
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Account Details - Single Consolidated Card */}
          <div className="space-y-4">
            <h4 className="text-[#00bfff] text-sm font-medium">
              Account Details
            </h4>
            <div className="p-6 border border-[rgba(0,191,255,0.2)] rounded-lg bg-gradient-to-br from-[rgba(0,191,255,0.03)] to-[rgba(0,191,255,0.01)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  {/* Full Name */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-[#8b9dc3] flex-shrink-0" />
                      <span className="text-sm font-medium text-[#8b9dc3]">
                        Full Name
                      </span>
                    </div>
                    <p className="text-[#00bfff] text-sm">
                      {userProfile?.full_name || "Not set"}
                    </p>
                  </div>

                  {/* Username */}
                  {userProfile?.username && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <AtSign className="h-4 w-4 text-[#8b9dc3] flex-shrink-0" />
                        <span className="text-sm font-medium text-[#8b9dc3]">
                          Username
                        </span>
                      </div>
                      <p className="text-[#00bfff] text-sm">
                        @{userProfile.username}
                      </p>
                    </div>
                  )}

                  {/* Email */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Mail className="h-4 w-4 text-[#8b9dc3] flex-shrink-0" />
                      <span className="text-sm font-medium text-[#8b9dc3]">
                        Email
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-[#00bfff] text-sm truncate flex-1">
                        {user?.email}
                      </p>
                      {user?.email_confirmed_at && (
                        <Tooltip
                          content="Email Verified"
                          placement="right"
                          offset={15}
                        >
                          <span className="flex items-center flex-shrink-0 cursor-help">
                            <VerifiedIcon className="size-4 text-[#00bfff]" />
                          </span>
                        </Tooltip>
                      )}
                    </div>
                  </div>

                  {/* Website */}
                  {userProfile?.website && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Globe className="h-4 w-4 text-[#8b9dc3] flex-shrink-0" />
                        <span className="text-sm font-medium text-[#8b9dc3]">
                          Website
                        </span>
                      </div>
                      <a
                        href={userProfile.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#00bfff] hover:text-[#0099cc] text-sm underline"
                      >
                        {userProfile.website}
                      </a>
                    </div>
                  )}
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  {/* Member Since */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-[#8b9dc3] flex-shrink-0" />
                      <span className="text-sm font-medium text-[#8b9dc3]">
                        Member Since
                      </span>
                    </div>
                    <p className="text-[#00bfff] text-sm">
                      {user?.created_at
                        ? new Date(user.created_at).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            }
                          )
                        : "Unknown"}
                    </p>
                  </div>

                  {/* Last Login */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-[#8b9dc3] flex-shrink-0" />
                      <span className="text-sm font-medium text-[#8b9dc3]">
                        Last Login
                      </span>
                    </div>
                    <p className="text-[#00bfff] text-sm">
                      {user?.last_sign_in_at
                        ? formatRelativeTime(user.last_sign_in_at)
                        : "Unknown"}
                    </p>
                  </div>

                  {/* Authentication Method */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-[#8b9dc3] flex-shrink-0" />
                      <span className="text-sm font-medium text-[#8b9dc3]">
                        Authentication
                      </span>
                    </div>
                    <p className="text-[#00bfff] text-sm">
                      {user?.app_metadata?.provider
                        ? `OAuth (${user.app_metadata.provider})`
                        : "Email & Password"}
                    </p>
                  </div>

                  {/* Bio */}
                  {userProfile?.bio && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-[#8b9dc3] flex-shrink-0" />
                        <span className="text-sm font-medium text-[#8b9dc3]">
                          Bio
                        </span>
                      </div>
                      <p className="text-[#8b9dc3] text-sm leading-relaxed">
                        {userProfile.bio}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Connected Accounts */}
          <div className="space-y-4">
            <h4 className="text-[#00bfff] text-sm font-medium">
              Connected Accounts
            </h4>
            <div className="space-y-3">
              {["google", "github", "discord"].map((provider) => {
                const isConnected = getConnectedProviders().includes(provider);
                const IconComponent =
                  provider === "google"
                    ? GoogleIcon
                    : provider === "github"
                      ? GitHubIcon
                      : DiscordIcon;

                return (
                  <div
                    key={provider}
                    className="p-4 border border-[rgba(0,191,255,0.2)] rounded-lg"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <IconComponent className="h-5 w-5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-[#8b9dc3] capitalize">
                            {provider}
                          </p>
                          <p className="text-xs text-[#6b7280] truncate">
                            {isConnected
                              ? `Connected as ${user?.email || "user"}`
                              : `Connect your ${provider} account for easier sign-in`}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className={`text-xs transition-all duration-300 flex-shrink-0 ${
                          isConnected
                            ? "border-red-600 text-red-400 hover:bg-red-900/20 hover:text-red-300"
                            : "border-[#00bfff] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)] hover:text-[#00bfff]"
                        }`}
                        onClick={() => handleLinkAccount(provider as any)}
                      >
                        {isConnected ? (
                          <>
                            <Unlink className="h-3 w-3 mr-1" />
                            Disconnect
                          </>
                        ) : (
                          <>
                            <Link className="h-3 w-3 mr-1" />
                            Connect
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
};
