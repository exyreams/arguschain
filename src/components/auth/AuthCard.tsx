import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/global";
import { EmailPasswordForm } from "./EmailPasswordForm";
import { EmailPasswordSignupForm } from "./EmailPasswordSignupForm";
import OAuthButtons from "./OAuthButtons";
import { ForgotPasswordForm } from "./ForgotPasswordForm";
import AnonymousSignIn from "./AnonymousSignIn";

type ViewMode = "signin" | "signup" | "forgot-password";

interface AuthCardProps {
  mode: "signin" | "signup";
  onModeChange: (mode: "signin" | "signup") => void;
}

export function AuthCard({ mode, onModeChange }: AuthCardProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(mode);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setViewMode(mode);
  }, [mode]);

  const handleViewModeChange = useCallback(
    (newMode: ViewMode) => {
      setViewMode(newMode);

      if (newMode === "signin" || newMode === "signup") {
        onModeChange(newMode);
      }

      setTimeout(() => {
        if (cardRef.current) {
          const firstFocusableElement = cardRef.current.querySelector(
            'input, button, [tabindex]:not([tabindex="-1"])'
          ) as HTMLElement;
          if (firstFocusableElement) {
            firstFocusableElement.focus();
          }
        }
      }, 100);
    },
    [onModeChange]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && viewMode === "forgot-password") {
        handleViewModeChange("signin");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [viewMode, handleViewModeChange]);

  const getTitle = () => {
    switch (viewMode) {
      case "signin":
        return "Sign in to your account to continue";
      case "signup":
        return "Create your account to get started";
      case "forgot-password":
        return "Reset your password";
      default:
        return "";
    }
  };

  return (
    <div ref={cardRef} role="main" aria-labelledby="auth-title">
      <Card className="p-6 bg-bg-dark-secondary border-border-color shadow-lg transition-all duration-300 hover:shadow-xl backdrop-blur-sm">
        <div className="text-center mb-6">
          <p id="auth-title" className="text-text-secondary text-xs">
            {getTitle()}
          </p>
        </div>

        <div className="space-y-5 min-h-[350px] relative">
          <div className="transition-all duration-500 ease-in-out">
            {viewMode === "signin" && (
              <div className="space-y-5 opacity-100 transform translate-x-0 transition-all duration-500 animate-in slide-in-from-right-2">
                <OAuthButtons />

                <div
                  className="relative"
                  role="separator"
                  aria-label="Alternative sign-in methods"
                >
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border-color" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-bg-dark-secondary px-2 text-text-secondary">
                      Or
                    </span>
                  </div>
                </div>

                <EmailPasswordForm
                  onForgotPassword={() =>
                    handleViewModeChange("forgot-password")
                  }
                />

                <AnonymousSignIn />
                <div className="text-center">
                  <p className="text-sm text-text-secondary">
                    Don't have an account?{" "}
                    <button
                      onClick={() => handleViewModeChange("signup")}
                      className="text-accent-primary hover:text-text-secondary transition-colors cursor-pointer bg-transparent border-none underline"
                    >
                      Sign up
                    </button>
                  </p>
                </div>
              </div>
            )}

            {viewMode === "signup" && (
              <div className="space-y-5 opacity-100 transform translate-x-0 transition-all duration-500 animate-in slide-in-from-right-2">
                <OAuthButtons />

                <div
                  className="relative"
                  role="separator"
                  aria-label="Alternative sign-up methods"
                >
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border-color" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-bg-dark-secondary px-2 text-text-secondary">
                      Or
                    </span>
                  </div>
                </div>

                <EmailPasswordSignupForm />

                <div className="space-y-4">
                  <div
                    className="relative"
                    role="separator"
                    aria-label="Anonymous access option"
                  >
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border-color" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-bg-dark-secondary px-2 text-text-secondary">
                        Or
                      </span>
                    </div>
                  </div>

                  <AnonymousSignIn />

                  <div className="text-center">
                    <p className="text-sm text-text-secondary">
                      Already have an account?{" "}
                      <button
                        onClick={() => handleViewModeChange("signin")}
                        className="text-accent-primary hover:text-text-secondary transition-colors cursor-pointer bg-transparent border-none underline"
                      >
                        Sign in
                      </button>
                    </p>
                  </div>
                </div>
              </div>
            )}
            {viewMode === "forgot-password" && (
              <div className="opacity-100 transform translate-x-0 transition-all duration-500 animate-in slide-in-from-left-2">
                <ForgotPasswordForm
                  onBackToSignIn={() => handleViewModeChange("signin")}
                />
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

export default AuthCard;
