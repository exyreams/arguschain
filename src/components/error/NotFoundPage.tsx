import React, { useEffect, memo, useMemo, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Logo, Button } from "@/components/global";
import { cn } from "@/lib/utils";
import ErrorIllustration from "./ErrorIllustration";
import NavigationActions from "./NavigationActions";
import type {
  NotFoundPageProps,
  ErrorPageConfig,
  NavigationAction,
} from "./types";
import { DEFAULT_404_CONFIG } from "./types";
import { Bug } from "lucide-react";

const NotFoundPage: React.FC<NotFoundPageProps> = ({
  className,
  config: userConfig,
}) => {
  const config: ErrorPageConfig = useMemo(
    () => ({
      ...DEFAULT_404_CONFIG,
      title: userConfig?.title ?? "404",
      subtitle: userConfig?.subtitle ?? "Lost in the chain",
      description:
        userConfig?.description ??
        "This block seems missing. Let’s get you back on a valid path.",
      illustration: {
        ...DEFAULT_404_CONFIG.illustration,
        ...userConfig?.illustration,
      },
      actions:
        userConfig?.actions && userConfig.actions.length > 0
          ? userConfig.actions
          : [
              {
                label: "Go Home",
                path: "/",
                variant: "default",
              } as NavigationAction,
              {
                label: "Back",
                path: "back",
                variant: "outline",
              } as NavigationAction,
            ],
    }),
    [userConfig]
  );

  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    const originalTitle = document.title;
    document.title = `${config.title} - ${config.subtitle} | Arguschain`;
    return () => {
      document.title = originalTitle;
    };
  }, [config.title, config.subtitle]);

  // Keyboard shortcuts: H (home), B (back)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (!isTyping) {
        if (e.key.toLowerCase() === "h") {
          navigate("/");
        } else if (e.key.toLowerCase() === "b") {
          if (window.history.length > 1) navigate(-1);
          else navigate("/");
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate]);

  const handleNavigationClick = (action: NavigationAction) => {
    if (action.path === "back") {
      if (window.history.length > 1) navigate(-1);
      else navigate("/");
      return;
    }
  };

  const supportLinkWithContext = useMemo(
    () => `/contact?from=${encodeURIComponent(pathname)}`,
    [pathname]
  );

  const copyUrlRef = useRef<HTMLButtonElement>(null);
  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      copyUrlRef.current?.classList.add("scale-95");
      setTimeout(() => copyUrlRef.current?.classList.remove("scale-95"), 120);
    } catch {}
  };

  return (
    <div
      className={cn(
        "min-h-screen bg-bg-dark-primary text-text-primary flex flex-col relative overflow-hidden",
        className
      )}
    >
      {/* Enhanced background layers with improved visual depth */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        {/* Primary gradient with enhanced glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,191,255,0.15),_rgba(0,191,255,0.08)_40%,_transparent_70%)]" />

        {/* Secondary accent gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(139,92,246,0.08),_transparent_50%)]" />

        {/* Enhanced grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:32px_32px]" />

        {/* Floating particles effect */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-accent-primary rounded-full animate-pulse" />
          <div className="absolute top-3/4 right-1/3 w-0.5 h-0.5 bg-violet-400 rounded-full animate-pulse" />
          <div className="absolute top-1/2 right-1/4 w-1.5 h-1.5 bg-accent-primary/60 rounded-full animate-pulse" />
        </div>
      </div>

      {/* Simplified header */}
      <header className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10">
        <Link
          to="/"
          className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity duration-200 cursor-pointer [touch-action:manipulation]"
          aria-label="Go to Arguschain homepage"
        >
          <Logo className="h-5 w-auto sm:h-6" />
          <span className="text-lg sm:text-xl text-[#00bfff] tracking-wide font-audiowide">
            arguschain
          </span>
        </Link>
      </header>

      {/* Enhanced main content with improved visual hierarchy */}
      <main
        className="flex-1 flex items-center justify-center px-4 py-20 sm:px-6 lg:px-8"
        role="main"
        aria-labelledby="error-title"
        aria-describedby="error-description"
      >
        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 px-4 sm:px-6 lg:px-8 relative">
          {/* Subtle vertical separator for desktop */}
          <div
            className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-border-color/30 to-transparent transform -translate-x-1/2"
            aria-hidden="true"
          />

          {/* Left: Enhanced copy + actions with improved spacing */}
          <section className="space-y-6 lg:pr-8 relative">
            {/* Subtle background treatment */}
            <div
              className="absolute inset-0 bg-gradient-to-r from-accent-primary/3 to-transparent rounded-2xl -m-4 p-4"
              aria-hidden="true"
            />
            <div className="space-y-2 sm:space-y-4">
              <h1
                id="error-title"
                className="text-6xl sm:text-7xl md:text-8xl font-bold text-accent-primary font-mono tracking-wider leading-[0.85]"
                aria-label={`Error ${config.title}`}
              >
                {config.title}
              </h1>

              {/* Enhanced subtitle with better gradient */}
              <h2 className="text-xl sm:text-3xl md:text-4xl font-semibold font-space leading-tight bg-gradient-to-r from-[#00bfff] via-cyan-300 to-violet-400 bg-clip-text text-transparent">
                {config.subtitle}
              </h2>

              <p
                id="error-description"
                className="text-base sm:text-md text-text-secondary leading-relaxed max-w-prose opacity-90"
              >
                {config.description}
              </p>
            </div>

            {/* Consolidated navigation and shortcuts section */}
            <div className="rounded-xl border border-border-color/30 bg-black/20 backdrop-blur-sm p-6 shadow-lg space-y-4">
              <p className="text-xs font-medium text-text-secondary flex items-center gap-2">
                <svg
                  className="size-4 text-accent-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Suggested destinations
              </p>

              <NavigationActions
                actions={config.actions}
                onActionClick={handleNavigationClick}
                className="max-w-xl"
              />

              {/* Quick shortcuts and actions */}
              <div className="pt-4 border-t border-border-color/20 space-y-3">
                <div className="text-xs text-text-secondary leading-relaxed">
                  <span className="font-medium text-text-primary">
                    Quick shortcuts:
                  </span>{" "}
                  Press{" "}
                  <kbd className="px-2 py-1 text-xs font-mono bg-black/30 border border-border-color/40 rounded">
                    H
                  </kbd>{" "}
                  for Home or{" "}
                  <kbd className="px-2 py-1 text-xs font-mono bg-black/30 border border-border-color/40 rounded">
                    B
                  </kbd>{" "}
                  to go Back.
                </div>

                <div className="flex items-center justify-between">
                  <Button
                    ref={copyUrlRef}
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyUrl}
                    className="text-xs hover:bg-[rgba(0,191,255,0.12)] hover:border-[#00bfff]/50 border border-transparent"
                  >
                    <svg
                      className="w-3 h-3 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    Copy URL
                  </Button>
                  <Link
                    to={supportLinkWithContext}
                    className="text-xs text-accent-primary hover:text-text-secondary transition-colors duration-200 flex items-center gap-2 font-medium underline underline-offset-2"
                  >
                    <Bug className="w-3 h-3" />
                    Report Issue
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Right: Enhanced illustration with improved presentation */}
          <section className="flex flex-col items-center justify-center gap-8 lg:pl-8 relative p-6">
            {/* Enhanced background treatment matching AuthCard styling - covers full section */}
            <div
              className="absolute inset-0 bg-bg-dark-secondary border border-border-color rounded-2xl shadow-lg backdrop-blur-sm"
              aria-hidden="true"
            />
            {/* Page not found badge moved to top of illustration */}
            <div className="relative z-10 inline-flex items-center gap-2 rounded-full border border-border-color/40 bg-black/30 backdrop-blur-sm px-4 py-2 text-xs sm:text-sm text-text-secondary shadow-lg">
              <span
                className="inline-block h-2 w-2 rounded-full bg-red-600 animate-pulse shadow-sm shadow-red-500/50"
                aria-hidden="true"
              />
              <span className="font-medium">Page Not Found</span>
            </div>

            <div className="relative z-10 w-full flex justify-center">
              <ErrorIllustration
                src={config.illustration.src}
                alt={
                  config.illustration.alt ||
                  "A stylized orbital node indicating a missing page"
                }
                size={config.illustration.size || "lg"}
                animate={true}
                className="w-full max-w-[280px] sm:max-w-[360px] md:max-w-[400px]"
              />
            </div>

            <div
              role="status"
              aria-live="polite"
              className="relative z-10 text-sm text-text-secondary leading-relaxed text-center max-w-md mx-auto"
            >
              You tried to reach:{" "}
              <span className="font-mono text-accent-primary">{pathname}</span>
              <br />
              We couldn’t resolve this route. Check the URL or use the links
              above.
            </div>
          </section>
        </div>
      </main>

      <div className="h-4 sm:h-6" aria-hidden="true" />
    </div>
  );
};

export default memo(NotFoundPage);
