import React, { useState } from "react";
import { Button, Input } from "@/components/global";
import { supabase } from "@/lib/auth/auth";
import { toast } from "@/hooks/global/useToast";
import { AnonymousUserService } from "@/lib/auth/anonymous-service";
import EmailVerificationSent from "./EmailVerificationSent";
import {
  X,
  Mail,
  Lock,
  User,
  Zap,
  Shield,
  Bookmark,
  Download,
  BarChart3,
  Loader2,
} from "lucide-react";
import { svg } from "d3";

interface InContextSignUpProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  context?: {
    page: string;
    action: string;
    remainingQueries?: number;
  };
}

const InContextSignUp: React.FC<InContextSignUpProps> = ({
  isOpen,
  onClose,
  onSuccess,
  context,
}) => {
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
  });

  const benefits = [
    {
      icon: <Zap className="h-5 w-5 text-yellow-400" />,
      title: "Unlimited Analyses",
      description: "No more query limits - analyze as much as you need",
    },
    {
      icon: <Bookmark className="h-5 w-5 text-blue-400" />,
      title: "Save Bookmarks",
      description: "Save and organize your favorite queries permanently",
    },
    {
      icon: <Download className="h-5 w-5 text-green-400" />,
      title: "Advanced Exports",
      description: "Export results in JSON, CSV, and PDF formats",
    },
    {
      icon: <BarChart3 className="h-5 w-5 text-purple-400" />,
      title: "Premium Analytics",
      description: "Access advanced analytics and insights features",
    },
    {
      icon: <Shield className="h-5 w-5 text-red-400" />,
      title: "Secure Storage",
      description: "Your data is encrypted and securely stored",
    },
  ];

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signup" && formData.password !== formData.confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    setIsLoading(true);
    try {
      if (mode === "signup") {
        // Show loading toast for sign up
        toast.loading("Creating your account...", {
          description: "Please wait while we set up your Arguschain account.",
        });

        const result = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: { full_name: formData.fullName },
            emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(window.location.pathname)}`,
          },
        });

        toast.dismiss();

        if (result.error) {
          // Handle specific Supabase errors
          let errorMessage = result.error.message;
          if (result.error.message.includes("User already registered")) {
            errorMessage =
              "An account with this email already exists. Try signing in instead.";
          } else if (result.error.message.includes("Invalid email")) {
            errorMessage = "Please enter a valid email address.";
          } else if (result.error.message.includes("Password")) {
            errorMessage = "Password must be at least 6 characters long.";
          }

          toast.error("Sign Up Failed", {
            description: errorMessage,
          });
          return;
        }

        // Check if email confirmation is required
        if (result.data?.user && !result.data.session) {
          // Email verification required
          setVerificationEmail(formData.email);
          setShowEmailVerification(true);
          toast.info("Verification Email Sent", {
            description: `We've sent a verification link to ${formData.email}`,
          });
          return;
        }

        // If user is immediately signed in (email confirmation disabled)
        if (result.data?.user && result.data.session) {
          await handleSuccessfulAuth(result.data.user);
        }
      } else {
        // Sign in flow
        toast.loading("Signing you in...", {
          description: "Verifying your credentials...",
        });

        const result = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        toast.dismiss();

        if (result.error) {
          // Handle specific sign-in errors
          let errorMessage = result.error.message;
          if (result.error.message.includes("Invalid login credentials")) {
            errorMessage =
              "Invalid email or password. Please check your credentials.";
          } else if (result.error.message.includes("Email not confirmed")) {
            errorMessage =
              "Please check your email and click the verification link first.";
          }

          toast.error("Sign In Failed", {
            description: errorMessage,
          });
          return;
        }

        if (result.data?.user) {
          await handleSuccessfulAuth(result.data.user);
        }
      }
    } catch (error) {
      toast.dismiss();
      console.error("Authentication error:", error);
      toast.error("Authentication Error", {
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccessfulAuth = async (user: any) => {
    try {
      // Upgrade anonymous session
      const upgraded = await AnonymousUserService.upgradeToAuthenticated(
        user.id
      );

      if (upgraded) {
        toast.success("Welcome to Arguschain!", {
          description:
            "Your session has been upgraded. You now have unlimited access!",
        });
      } else {
        toast.success(
          mode === "signup" ? "Account Created!" : "Welcome Back!",
          {
            description:
              mode === "signup"
                ? "Your Arguschain account has been created successfully."
                : "You're now signed in with unlimited access.",
          }
        );
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      // Even if session upgrade fails, the user is still authenticated
      toast.success(mode === "signup" ? "Account Created!" : "Welcome Back!", {
        description: "You're now signed in to Arguschain.",
      });
      onSuccess?.();
      onClose();
    }
  };

  const handleVerificationComplete = () => {
    toast.success("Email Verified Successfully!", {
      description: "Your account is now active. Welcome to Arguschain!",
    });
    onSuccess?.();
    onClose();
  };

  const handleOAuthSignIn = async (provider: "github" | "google") => {
    setIsLoading(true);
    try {
      toast.loading(`Connecting to ${provider}...`, {
        description: "Redirecting to authentication provider...",
      });

      const redirectTo = `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(window.location.pathname)}`;
      const result = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
        },
      });

      if (result.error) {
        toast.dismiss();
        toast.error("OAuth Sign In Failed", {
          description: result.error.message,
        });
      }
      // Note: OAuth success will be handled by the auth callback
    } catch (error) {
      toast.dismiss();
      console.error("OAuth error:", error);
      toast.error("OAuth Error", {
        description: "Failed to sign in with OAuth provider.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  // Show email verification screen if needed
  if (showEmailVerification) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="relative w-full max-w-md mx-4 bg-[rgba(15,20,25,0.95)] border border-[rgba(0,191,255,0.3)] rounded-xl shadow-2xl p-8">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-[#8b9dc3] hover:text-[#00bfff] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          <EmailVerificationSent
            email={verificationEmail}
            onBackToSignUp={() => setShowEmailVerification(false)}
            onVerificationComplete={handleVerificationComplete}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl mx-4 bg-[rgba(15,20,25,0.95)] border border-[rgba(0,191,255,0.3)] rounded-xl shadow-2xl overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 text-[#8b9dc3] hover:text-[#00bfff] transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex">
          {/* Left Side - Benefits */}
          <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[rgba(0,191,255,0.1)] to-[rgba(0,191,255,0.05)] p-8 flex-col justify-center">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-[#00bfff] mb-2">
                Unlock Full Access
              </h2>
              <p className="text-[#8b9dc3]">
                {context?.remainingQueries !== undefined
                  ? `You have ${context.remainingQueries} free analyses left. Sign up for unlimited access!`
                  : "Join thousands of developers using Arguschain for blockchain analysis"}
              </p>
            </div>

            <div className="space-y-4">
              {benefits.map((benefit, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-[rgba(0,191,255,0.05)] rounded-lg border border-[rgba(0,191,255,0.1)]"
                >
                  <div className="flex-shrink-0">{benefit.icon}</div>
                  <div>
                    <h3 className="font-medium text-[#e2e8f0] mb-1">
                      {benefit.title}
                    </h3>
                    <p className="text-sm text-[#8b9dc3]">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {context && (
              <div className="mt-6 p-4 bg-[rgba(255,193,7,0.1)] border border-[rgba(255,193,7,0.3)] rounded-lg">
                <div className="text-yellow-400 font-medium mb-1">
                  Continue Your Analysis
                </div>
                <div className="text-sm text-[#8b9dc3]">
                  Your current session will be preserved and upgraded after sign
                  up.
                </div>
              </div>
            )}
          </div>

          {/* Right Side - Form */}
          <div className="w-full lg:w-1/2 p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-[#e2e8f0] mb-2">
                {mode === "signup" ? "Create Account" : "Welcome Back"}
              </h1>
              <p className="text-[#8b9dc3]">
                {mode === "signup"
                  ? "Get unlimited access to all Arguschain features"
                  : "Sign in to your Arguschain account"}
              </p>
            </div>

            {/* OAuth Buttons */}
            <div className="space-y-3 mb-6">
              <Button
                onClick={() => handleOAuthSignIn("github")}
                disabled={isLoading}
                className="w-full bg-[#24292e] hover:bg-[#1a1e22] text-white border-0"
              >
                <svg
                  className="h-4 w-4 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Continue with GitHub
              </Button>
              <Button
                onClick={() => handleOAuthSignIn("google")}
                disabled={isLoading}
                variant="outline"
                className="w-full border-[rgba(0,191,255,0.3)] text-[#e2e8f0] hover:bg-[rgba(0,191,255,0.1)]"
              >
                <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </Button>
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[rgba(0,191,255,0.2)]" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-[rgba(15,20,25,0.95)] text-[#8b9dc3]">
                  Or continue with email
                </span>
              </div>
            </div>

            {/* Email Form */}
            <form onSubmit={handleEmailSignUp} className="space-y-4">
              {mode === "signup" && (
                <div>
                  <label className="block text-sm font-medium text-[#8b9dc3] mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#8b9dc3]" />
                    <Input
                      type="text"
                      placeholder="Enter your full name"
                      value={formData.fullName}
                      onChange={(e) =>
                        setFormData({ ...formData, fullName: e.target.value })
                      }
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[#8b9dc3] mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#8b9dc3]" />
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#8b9dc3] mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#8b9dc3]" />
                  <Input
                    type="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {mode === "signup" && (
                <div>
                  <label className="block text-sm font-medium text-[#8b9dc3] mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#8b9dc3]" />
                    <Input
                      type="password"
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          confirmPassword: e.target.value,
                        })
                      }
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-[#00bfff] to-[#0099cc] text-[#0f1419] hover:from-[#0099cc] hover:to-[#007acc] font-medium"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {mode === "signup" ? "Create Account" : "Sign In"}
              </Button>
            </form>

            {/* Toggle Mode */}
            <div className="mt-6 text-center">
              <button
                onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
                className="text-sm text-[#00bfff] hover:text-[#0099cc] transition-colors"
              >
                {mode === "signup"
                  ? "Already have an account? Sign in"
                  : "Don't have an account? Sign up"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { InContextSignUp };
export default InContextSignUp;
