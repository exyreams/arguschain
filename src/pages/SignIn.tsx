import React, { Suspense, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useSession } from "@/lib/auth";
import { AnimatedTransactionHash, Loader, Logo } from "@/components/global";
import animatedLogoSvg from "@/assets/animated_logo.svg";

const AuthCard = React.lazy(() =>
  import("@/components/auth").then((module) => ({ default: module.AuthCard })),
);

function TypewriterText({
  texts,
  speed = 100,
  delay = 2000,
}: {
  texts: string[];
  speed?: number;
  delay?: number;
}) {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(
      () => {
        const fullText = texts[currentTextIndex];

        if (!isDeleting) {
          if (currentText.length < fullText.length) {
            setCurrentText(fullText.substring(0, currentText.length + 1));
          } else {
            setTimeout(() => setIsDeleting(true), delay);
          }
        } else {
          if (currentText.length > 0) {
            setCurrentText(fullText.substring(0, currentText.length - 1));
          } else {
            setIsDeleting(false);
            setCurrentTextIndex((prev) => (prev + 1) % texts.length);
          }
        }
      },
      isDeleting ? speed / 2 : speed,
    );

    return () => clearTimeout(timeout);
  }, [currentText, currentTextIndex, isDeleting, texts, speed, delay]);

  return (
    <span className="font-mono text-accent-primary text-lg">
      {currentText}
      <span className="animate-pulse">|</span>
    </span>
  );
}

export default function SignIn() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session, loading: isLoading } = useSession();

  const initialMode =
    searchParams.get("mode") === "signup" ? "signup" : "signin";
  const [authMode, setAuthMode] = useState<"signin" | "signup">(initialMode);

  const handleAuthModeChange = (mode: "signin" | "signup") => {
    setAuthMode(mode);
    const newSearchParams = new URLSearchParams(searchParams);
    if (mode === "signup") {
      newSearchParams.set("mode", "signup");
    } else {
      newSearchParams.delete("mode");
    }
    const newUrl = newSearchParams.toString()
      ? `?${newSearchParams.toString()}`
      : "";
    navigate(`/signin${newUrl}`, { replace: true });
  };

  // Store redirect parameter in localStorage when component mounts
  useEffect(() => {
    const redirectParam = searchParams.get("redirect");
    if (redirectParam) {
      localStorage.setItem("auth_redirect", redirectParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (session?.user && !isLoading) {
      // Try to get redirect from URL params first, then localStorage, then default
      const urlRedirect = searchParams.get("redirect");
      const storedRedirect = localStorage.getItem("auth_redirect");
      const redirectTo = urlRedirect || storedRedirect || "/";

      // Clear stored redirect after using it
      if (storedRedirect) {
        localStorage.removeItem("auth_redirect");
      }

      console.log("SignIn redirect debug:", {
        urlRedirect,
        storedRedirect,
        redirectTo,
        fullUrl: window.location.href,
      });

      navigate(redirectTo, { replace: true });
    }
  }, [session, isLoading, navigate, searchParams]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-dark-primary flex items-center justify-center">
        <Loader aria-label="Checking authentication status..." />
      </div>
    );
  }

  if (session?.user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-bg-dark-primary text-text-primary flex">
      <div className="absolute top-6 left-6">
        <Link
          to="/"
          className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
          aria-label="Go to homepage"
        >
          <Logo className="h-6 w-auto" />
          <span className="text-xl text-[#00bfff] tracking-wide font-audiowide">
            arguschain
          </span>
        </Link>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 sm:px-8 lg:px-12 xl:px-16 max-w-md lg:max-w-lg xl:max-w-xl mx-auto lg:mx-0 py-8 pt-20">
        <div className="w-full max-w-sm mx-auto lg:mx-0">
          <div className="mb-4 space-y-1">
            <h1 className="font-space text-2xl font-bold text-[#00bfff] tracking-tight">
              {authMode === "signin" ? "Welcome back" : "Get started"}
            </h1>
          </div>

          <Suspense
            fallback={
              <div className="flex items-center justify-center p-8">
                <Loader aria-label="Loading auth form..." />
              </div>
            }
          >
            <div className="animate-fade-in">
              <AuthCard mode={authMode} onModeChange={handleAuthModeChange} />
            </div>
          </Suspense>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 relative bg-gradient-to-br from-bg-dark-secondary to-bg-dark-primary">
        <div className="flex-1 flex flex-col justify-center items-center p-12">
          <div className="w-full max-w-3xl mb-6 flex justify-center">
            <div className="relative">
              <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 z-10">
                <div className="bg-bg-dark-primary/90 backdrop-blur-sm border border-accent-primary/30 rounded-lg px-4 py-2">
                  <AnimatedTransactionHash
                    className="text-xs"
                    animationSpeed={300}
                  />
                </div>
              </div>

              <img
                src={animatedLogoSvg}
                alt="ArgusChain Animated Logo"
                className="w-80 h-80 object-contain"
              />
            </div>
          </div>

          <div className="space-y-6 max-w-3xl text-center">
            <div className="space-y-4">
              <h2 className="font-space text-3xl font-semibold text-text-primary">
                <TypewriterText
                  texts={[
                    "Analyzing Ethereum Transactions...",
                    "Debugging Smart Contracts...",
                    "Optimizing Gas Usage...",
                    "Tracing Transaction Flows...",
                    "Monitoring Blockchain Activity...",
                  ]}
                  speed={80}
                  delay={1500}
                />
              </h2>
              <p className="text-md text-text-secondary font-mono leading-relaxed">
                Enterprise-grade blockchain analysis platform for developers,
                auditors, and DeFi teams
              </p>
            </div>
          </div>
        </div>

        <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-border-color to-transparent" />
      </div>
    </div>
  );
}
