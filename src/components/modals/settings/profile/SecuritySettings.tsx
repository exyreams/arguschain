import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { refine, z } from "zod";
import {
  Key,
  Shield,
  Eye,
  EyeOff,
  Save,
  X,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Mail,
  Unlink,
  Calendar,
  Link,
} from "lucide-react";

import { Button, Input, Label } from "@/components/global";
import { useAuth, useAuthActions } from "@/lib/auth";
import { oauthService } from "@/lib/profile/oauthService";

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

type OAuthProvider = "google" | "github" | "discord";

const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

const oauthProviders: {
  id: OAuthProvider;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}[] = [
  { id: "google", name: "Google", icon: GoogleIcon, color: "text-red-400" },
  { id: "github", name: "GitHub", icon: GitHubIcon, color: "text-gray-400" },
  {
    id: "discord",
    name: "Discord",
    icon: DiscordIcon,
    color: "text-indigo-400",
  },
];

interface SecuritySettingsProps {
  onSuccess: (message: string) => void;
}

export const SecuritySettings: React.FC<SecuritySettingsProps> = ({
  onSuccess,
}) => {
  const { user } = useAuth();
  const { signInWithOAuth, updatePassword } = useAuthActions();
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [changeSuccess, setChangeSuccess] = useState(false);
  const [connectedProviders, setConnectedProviders] = useState<any[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);

  const passwordForm = useForm({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Load connected providers
  useEffect(() => {
    const loadConnectedProviders = async () => {
      try {
        const providers = await oauthService.getConnectedProviders();
        setConnectedProviders(providers);
      } catch (error) {
        console.error("Failed to load connected providers:", error);
      } finally {
        setLoadingProviders(false);
      }
    };

    if (user) {
      loadConnectedProviders();
    }
  }, [user]);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (changeSuccess) {
      const timer = setTimeout(() => setChangeSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [changeSuccess]);

  const handlePasswordChange = async (data: any) => {
    try {
      setIsLoading(true);
      const { error } = await updatePassword(data.newPassword);
      if (error) throw error;

      onSuccess("Password changed successfully!");
      setChangeSuccess(true);
      setIsPasswordDialogOpen(false);
      passwordForm.reset();
    } catch (error) {
      console.error("Failed to change password:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthAction = async (
    provider: OAuthProvider,
    action: "link" | "unlink"
  ) => {
    try {
      setIsLoading(true);

      if (action === "link") {
        await oauthService.linkProvider(provider);
        // Note: This will redirect to OAuth provider, so success message won't show immediately
      } else {
        // Check if user can unlink this provider
        const { canUnlink, reason } =
          await oauthService.canUnlinkProvider(provider);
        if (!canUnlink) {
          onSuccess(reason || "Cannot unlink this provider");
          return;
        }

        await oauthService.unlinkProvider(provider);

        // Reload connected providers
        const updatedProviders = await oauthService.getConnectedProviders();
        setConnectedProviders(updatedProviders);

        onSuccess(
          `${oauthService.getProviderDisplayName(provider)} account disconnected successfully!`
        );
      }
    } catch (error) {
      console.error(`Failed to ${action} ${provider}:`, error);
      onSuccess(
        `Failed to ${action} ${oauthService.getProviderDisplayName(provider)} account. Please try again.`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const isProviderConnected = (providerId: OAuthProvider) => {
    return connectedProviders.some((p) => p.provider === providerId);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (!user) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-4"
      >
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-[rgba(0,191,255,0.1)] rounded w-1/4"></div>
          <div className="h-20 bg-[rgba(0,191,255,0.1)] rounded"></div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      {/* Success Message */}
      {changeSuccess && (
        <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-green-500/20 to-green-600/20 border border-green-500/30 rounded-lg text-green-400">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm">
            Security settings updated successfully!
          </span>
        </div>
      )}

      {/* Authentication Method */}
      <div className="space-y-4">
        <h4 className="text-[#00bfff] text-sm font-medium flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Authentication Method
        </h4>

        <div className="p-4 border border-[rgba(0,191,255,0.2)] rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {user.app_metadata?.provider ? (
                user.app_metadata.provider === "google" ? (
                  <GoogleIcon className="h-5 w-5" />
                ) : user.app_metadata.provider === "github" ? (
                  <GitHubIcon className="h-5 w-5" />
                ) : user.app_metadata.provider === "discord" ? (
                  <DiscordIcon className="h-5 w-5" />
                ) : (
                  <Shield className="h-5 w-5 text-[#00bfff]" />
                )
              ) : (
                <Mail className="h-5 w-5 text-[#00bfff]" />
              )}
              <div>
                <p className="text-[#8b9dc3] font-medium text-sm">
                  {user.app_metadata?.provider
                    ? oauthProviders.find(
                        (p) => p.id === user.app_metadata.provider
                      )?.name
                    : "Email & Password"}
                </p>
                <p className="text-xs text-[#6b7280]">
                  Primary authentication method for your account
                </p>
              </div>
            </div>
            {!user.app_metadata?.provider && (
              <Button
                variant="outline"
                size="sm"
                className="border-[rgba(0,191,255,0.3)] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)]"
                onClick={() => setIsPasswordDialogOpen(true)}
              >
                <Key className="h-4 w-4 mr-2" />
                Change Password
              </Button>
            )}
          </div>

          {user.updated_at && (
            <div className="mt-3 pt-3 border-t border-[rgba(0,191,255,0.2)]">
              <p className="text-xs text-[#6b7280] flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                Last updated: {formatDate(user.updated_at)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Connected Accounts */}
      <div className="space-y-4">
        <h4 className="text-[#00bfff] text-sm font-medium flex items-center gap-2">
          <Link className="h-4 w-4" />
          Connected Accounts
        </h4>

        {loadingProviders ? (
          <div className="space-y-3">
            {oauthProviders.map((provider) => (
              <div
                key={provider.id}
                className="p-4 border border-[rgba(0,191,255,0.2)] rounded-lg"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-5 w-5 bg-[rgba(0,191,255,0.1)] rounded animate-pulse" />
                    <div className="min-w-0 flex-1">
                      <div className="h-4 bg-[rgba(0,191,255,0.1)] rounded w-20 mb-1 animate-pulse" />
                      <div className="h-3 bg-[rgba(0,191,255,0.1)] rounded w-32 animate-pulse" />
                    </div>
                  </div>
                  <div className="flex-shrink-0 w-20 h-8 bg-[rgba(0,191,255,0.1)] rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {oauthProviders.map((provider) => {
              const isConnected = isProviderConnected(provider.id);
              const IconComponent = provider.icon;

              return (
                <div
                  key={provider.id}
                  className="p-4 border border-[rgba(0,191,255,0.2)] rounded-lg"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <IconComponent
                        className={`h-5 w-5 ${provider.color} flex-shrink-0`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[#8b9dc3] font-medium text-sm">
                          {provider.name}
                        </p>
                        <p className="text-xs text-[#6b7280] truncate">
                          {isConnected
                            ? `Connected as ${user.email}`
                            : `Connect your ${provider.name} account for easier sign-in`}
                        </p>
                      </div>
                    </div>

                    <Button
                      onClick={() =>
                        handleOAuthAction(
                          provider.id,
                          isConnected ? "unlink" : "link"
                        )
                      }
                      disabled={isLoading}
                      variant={isConnected ? "outline" : "outline"}
                      size="sm"
                      className={`flex-shrink-0 ${
                        isConnected
                          ? "border-red-600 text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-all duration-300"
                          : "border-[#00bfff] text-[#00bfff] hover:bg-[rgba(0,191,255,0.1)] hover:text-[#00bfff] transition-all duration-300"
                      }`}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isConnected ? (
                        <>
                          <Unlink className="h-4 w-4 mr-2" />
                          Disconnect
                        </>
                      ) : (
                        <>
                          <Link className="h-4 w-4 mr-2" />
                          Connect
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Password Change Modal */}
      {isPasswordDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-[rgba(25,28,40,0.95)] border border-[rgba(0,191,255,0.2)] rounded-lg p-6 w-full max-w-md mx-4 backdrop-blur-[15px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#00bfff]">
                Change Password
              </h3>
              <button
                onClick={() => setIsPasswordDialogOpen(false)}
                className="text-[#8b9dc3] hover:text-[#00bfff]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={passwordForm.handleSubmit(handlePasswordChange)}
              className="space-y-4"
            >
              {/* Current Password */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#8b9dc3]">
                  Current Password
                </Label>
                <div className="relative">
                  <Input
                    type={showPasswords.current ? "text" : "password"}
                    {...passwordForm.register("currentPassword")}
                    className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)] text-[#8b9dc3] pr-10"
                    placeholder="Enter your current password"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPasswords((prev) => ({
                        ...prev,
                        current: !prev.current,
                      }))
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b9dc3] hover:text-[#00bfff]"
                  >
                    {showPasswords.current ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {passwordForm.formState.errors.currentPassword && (
                  <p className="text-sm text-red-400">
                    {passwordForm.formState.errors.currentPassword.message}
                  </p>
                )}
              </div>

              {/* New Password */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#8b9dc3]">
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    type={showPasswords.new ? "text" : "password"}
                    {...passwordForm.register("newPassword")}
                    className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)] text-[#8b9dc3] pr-10"
                    placeholder="Enter your new password"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPasswords((prev) => ({ ...prev, new: !prev.new }))
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b9dc3] hover:text-[#00bfff]"
                  >
                    {showPasswords.new ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {passwordForm.formState.errors.newPassword && (
                  <p className="text-sm text-red-400">
                    {passwordForm.formState.errors.newPassword.message}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-[#8b9dc3]">
                  Confirm New Password
                </Label>
                <div className="relative">
                  <Input
                    type={showPasswords.confirm ? "text" : "password"}
                    {...passwordForm.register("confirmPassword")}
                    className="bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)] text-[#8b9dc3] pr-10"
                    placeholder="Confirm your new password"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPasswords((prev) => ({
                        ...prev,
                        confirm: !prev.confirm,
                      }))
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b9dc3] hover:text-[#00bfff]"
                  >
                    {showPasswords.confirm ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-red-400">
                    {passwordForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  size="sm"
                  disabled={isLoading || !passwordForm.formState.isDirty}
                  className="bg-gradient-to-r from-[#00bfff] to-blue-400 hover:from-[#00bfff]/90 hover:to-blue-400/90 text-white"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? "Changing..." : "Change Password"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setIsPasswordDialogOpen(false)}
                  disabled={isLoading}
                  className="border-[rgba(0,191,255,0.3)] text-[#8b9dc3] hover:bg-[rgba(0,191,255,0.1)]"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
};
