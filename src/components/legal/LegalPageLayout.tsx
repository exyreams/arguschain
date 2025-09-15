import React from "react";
import { Link } from "react-router-dom";

import { cn } from "@/lib/utils";
import Navbar from "@/components/layout/Navbar";
import Statusbar from "@/components/status/Statusbar";
import Footer from "@/components/layout/Footer";

import type { LegalPageLayoutProps } from "@/lib/legal/types";

const now = new Date().toLocaleString();

export const LegalPageLayout: React.FC<LegalPageLayoutProps> = ({
  title,
  lastUpdated,
  children,
  className,
}) => {
  return (
    <div className="bg-bg-dark-primary text-text-primary min-h-screen">
      <header className="fixed top-0 left-0 w-full z-[10000] border-b border-border-color bg-[rgba(25,28,40,0.9)] backdrop-blur-[10px]">
        <Statusbar />
        <Navbar />
      </header>

      <main className="pt-20">
        <div
          className={cn(
            "max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 mt-20",
            className
          )}
        >
          <header className="mb-8 sm:mb-12">
            <h1
              id="page-title"
              className="text-2xl sm:text-3xl font-bold text-accent-primary mb-3 sm:mb-4"
              tabIndex={-1}
            >
              {title}
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary">
              <time dateTime={new Date().toISOString()}>{now}</time>
            </p>
          </header>

          <nav
            className="mb-6 sm:mb-8 p-3 sm:p-4 bg-[rgba(0,191,255,0.05)] border border-[rgba(0,191,255,0.1)] rounded-lg"
            aria-label="Related legal documents"
          >
            <p className="text-xs sm:text-sm text-text-secondary mb-2">
              Related legal documents:
            </p>
            <div className="flex flex-wrap gap-3 sm:gap-4">
              {title !== "Privacy Policy" && (
                <Link
                  to="/privacy-policy"
                  className="text-accent-primary hover:text-accent-primary/80 transition-colors duration-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-bg-dark-primary rounded px-2 py-1"
                  aria-describedby="privacy-policy-desc"
                >
                  Privacy Policy
                  <span id="privacy-policy-desc" className="sr-only">
                    View our privacy policy and data handling practices
                  </span>
                </Link>
              )}
              {title !== "Terms of Service" && (
                <Link
                  to="/terms-of-service"
                  className="text-accent-primary hover:text-accent-primary/80 transition-colors duration-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-bg-dark-primary rounded px-2 py-1"
                  aria-describedby="terms-desc"
                >
                  Terms of Service
                  <span id="terms-desc" className="sr-only">
                    View our terms of service and usage conditions
                  </span>
                </Link>
              )}
            </div>
          </nav>

          <article
            className="prose prose-invert max-w-none"
            role="main"
            aria-labelledby="page-title"
          >
            <div className="space-y-8">{children}</div>
          </article>

          <div className="mt-8 sm:mt-12 text-center">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm text-accent-primary hover:text-accent-primary/80 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-bg-dark-primary rounded"
              aria-label="Scroll back to top of page"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 10l7-7m0 0l7 7m-7-7v18"
                />
              </svg>
              Back to top
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
