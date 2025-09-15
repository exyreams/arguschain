import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/auth";
import { Alert, Button, Loader } from "@/components/global";
import { Logo } from "@/components/ui/Logo";

const VerifiedIcon: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`relative ${className}`}>
    {/* Rotating outer ring */}
    <svg
      className="absolute inset-0 w-full h-full text-bg-dark-secondary"
      style={{ animation: "spin 20s linear infinite" }}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M21.5609 10.7386L20.2009 9.15859C19.9409 8.85859 19.7309 8.29859 19.7309 7.89859V6.19859C19.7309 5.13859 18.8609 4.26859 17.8009 4.26859H16.1009C15.7109 4.26859 15.1409 4.05859 14.8409 3.79859L13.2609 2.43859C12.5709 1.84859 11.4409 1.84859 10.7409 2.43859L9.17086 3.80859C8.87086 4.05859 8.30086 4.26859 7.91086 4.26859H6.18086C5.12086 4.26859 4.25086 5.13859 4.25086 6.19859V7.90859C4.25086 8.29859 4.04086 8.85859 3.79086 9.15859L2.44086 10.7486C1.86086 11.4386 1.86086 12.5586 2.44086 13.2486L3.79086 14.8386C4.04086 15.1386 4.25086 15.6986 4.25086 16.0886V17.7986C4.25086 18.8586 5.12086 19.7286 6.18086 19.7286H7.91086C8.30086 19.7286 8.87086 19.9386 9.17086 20.1986L10.7509 21.5586C11.4409 22.1486 12.5709 22.1486 13.2709 21.5586L14.8509 20.1986C15.1509 19.9386 15.7109 19.7286 16.1109 19.7286H17.8109C18.8709 19.7286 19.7409 18.8586 19.7409 17.7986V16.0986C19.7409 15.7086 19.9509 15.1386 20.2109 14.8386L21.5709 13.2586C22.1509 12.5686 22.1509 11.4286 21.5609 10.7386Z"
        fill="currentColor"
        stroke="rgba(0, 191, 255, 1)" // border color
        strokeWidth="0.1" // border thickness
      />
    </svg>

    {/* Stationary checkmark */}
    <svg
      className="absolute inset-0 w-full h-full text-accent-primary/80"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M16.1609 10.1086L11.3309 14.9386C11.1909 15.0786 11.0009 15.1586 10.8009 15.1586C10.6009 15.1586 10.4109 15.0786 10.2709 14.9386L7.85086 12.5186C7.56086 12.2286 7.56086 11.7486 7.85086 11.4586C8.14086 11.1686 8.62086 11.1686 8.91086 11.4586L10.8009 13.3486L15.1009 9.04859C15.3909 8.75859 15.8709 8.75859 16.1609 9.04859C16.4509 9.33859 16.4509 9.81859 16.1609 10.1086Z"
        fill="currentColor"
      />
    </svg>
  </div>
);

export default function Callback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Handle the OAuth callback
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Auth callback error:", error);
          setError(error.message);
          setStatus("error");
          return;
        }

        if (data.session) {
          console.log("Auth callback successful:", data.session.user);
          setStatus("success");

          // Redirect to dashboard or intended page - increased timeout for testing
          const redirectTo = searchParams.get("redirect") || "/";
          setTimeout(() => {
            navigate(redirectTo, { replace: true });
          }, 1000);
        } else {
          setError("No session found after authentication");
          setStatus("error");
        }
      } catch (err) {
        console.error("Unexpected error in auth callback:", err);
        setError("An unexpected error occurred");
        setStatus("error");
      }
    };

    handleAuthCallback();
  }, [navigate, searchParams]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-bg-dark-primary text-text-primary flex flex-col">
        {/* Header */}
        <div className="absolute top-6 left-6">
          <Link
            to="/"
            className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
            aria-label="Go to homepage"
          >
            <Logo className="h-6 w-auto" />
            <span className="text-xl text-accent-primary tracking-wide font-audiowide">
              arguschain
            </span>
          </Link>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center space-y-8 max-w-md">
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-accent-primary/20 rounded-full blur-xl animate-pulse" />
                <div className="relative bg-card-bg backdrop-blur-[10px] border border-border-color rounded-full p-6 shadow-lg">
                  <Loader className="w-12 h-12" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h1 className="text-3xl font-bold text-text-primary font-mono">
                Completing Authentication
              </h1>
              <p className="text-text-secondary text-lg leading-relaxed">
                Please wait while we securely process your authentication and
                set up your session.
              </p>

              {/* Progress indicator */}
              <div className="w-full bg-bg-dark-secondary rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent-primary to-accent-primary/60 rounded-full animate-pulse"
                  style={{ width: "70%" }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen bg-bg-dark-primary text-text-primary flex flex-col">
        {/* Header */}
        <div className="absolute top-6 left-6">
          <Link
            to="/"
            className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
            aria-label="Go to homepage"
          >
            <Logo className="h-6 w-auto" />
            <span className="text-xl text-accent-primary tracking-wide font-audiowide">
              arguschain
            </span>
          </Link>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center space-y-8 max-w-md">
            {/* Success Icon */}
            <div className="flex justify-center">
              <VerifiedIcon className="w-28 h-28" />
            </div>
            <div className="space-y-4">
              <h1 className="text-3xl font-bold text-accent-primary font-mono">
                Authentication Successful!
              </h1>
              <p className="text-text-secondary text-lg leading-relaxed">
                Welcome to{" "}
                <span className="text-accent-primary tracking-wide font-audiowide">
                  arguschain
                </span>
                . You're being redirected to your dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-dark-primary text-text-primary flex flex-col">
      {/* Header */}
      <div className="absolute top-6 left-6">
        <Link
          to="/"
          className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
          aria-label="Go to homepage"
        >
          <Logo className="h-6 w-auto" />
          <span className="text-xl text-accent-primary tracking-wide font-audiowide">
            arguschain
          </span>
        </Link>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center space-y-6">
            {/* Error Icon */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl" />
                <div className="relative w-24 h-24 mx-auto bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-lg border border-red-500/30">
                  <svg
                    className="w-12 h-12 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h1 className="text-3xl font-bold text-text-primary font-mono">
                Authentication Error
              </h1>
              <p className="text-text-secondary text-lg leading-relaxed">
                We encountered an issue while processing your authentication.
                Please try again.
              </p>
            </div>
          </div>

          {/* Error Details */}
          {error && (
            <Alert
              variant="destructive"
              className="text-left bg-red-500/10 border-red-500/30 text-red-400"
            >
              <div className="font-mono text-sm">{error}</div>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="space-y-4">
            <Button
              onClick={() => navigate("/signin")}
              className="w-full py-3 text-base font-medium font-mono"
            >
              Return to Sign In
            </Button>

            <Button
              variant="outline"
              onClick={() => navigate("/")}
              className="w-full py-3 text-base font-mono"
            >
              Go to Dashboard
            </Button>
          </div>

          {/* Help Text */}
          <div className="text-center">
            <p className="text-sm text-text-secondary font-mono">
              Need help? Contact our support team for assistance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
