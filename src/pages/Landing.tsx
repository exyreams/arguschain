import { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "@/lib/auth/auth-hooks";
import Navbar from "@/components/layout/Navbar";
import Statusbar from "@/components/status/Statusbar";
import Footer from "@/components/layout/Footer";
import {
  HeroSection,
  NewsletterSection,
  SocialProofSection,
} from "@/components/landing";
import { Skeleton } from "@/components/global";
import {
  LandingAnalytics,
  useScrollDepthTracking,
  useTimeOnPageTracking,
} from "@/lib/analytics/landing-analytics";

const FeaturesSection = lazy(() =>
  import("@/components/landing/FeaturesSection").then((m) => ({
    default: m.FeaturesSection,
  })),
);

export default function Landing() {
  const { session } = useSession();
  const navigate = useNavigate();
  const [isLoaded, setIsLoaded] = useState(false);
  const { handleScroll } = useScrollDepthTracking();
  const { trackTimeThresholds } = useTimeOnPageTracking();

  useEffect(() => {
    const startTime = performance.now();

    LandingAnalytics.trackPageView();

    setIsLoaded(true);

    const trackWebVitals = () => {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (typeof window !== "undefined" && (window as any).gtag) {
          (window as any).gtag("event", "web_vitals", {
            event_category: "performance",
            event_label: "LCP",
            value: Math.round(lastEntry.startTime),
          });
        }
      }).observe({ entryTypes: ["largest-contentful-paint"] });

      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (typeof window !== "undefined" && (window as any).gtag) {
            (window as any).gtag("event", "web_vitals", {
              event_category: "performance",
              event_label: "FID",
              value: Math.round(entry.processingStart - entry.startTime),
            });
          }
        });
      }).observe({ entryTypes: ["first-input"] });

      const loadTime = performance.now() - startTime;
      if (typeof window !== "undefined" && (window as any).gtag) {
        (window as any).gtag("event", "page_load_time", {
          event_category: "performance",
          event_label: "landing_page",
          value: Math.round(loadTime),
        });
      }
    };

    setTimeout(trackWebVitals, 100);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (event.key) {
        case "g":
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            if (session?.user) {
              navigate("/");
            } else {
              navigate("/signin");
            }
          }
          break;
        case "d":
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            navigate("/debug-trace");
          }
          break;
        case "h":
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
          break;
        case "f":
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            const featuresSection = document.getElementById("features-section");
            featuresSection?.scrollIntoView({ behavior: "smooth" });
          }
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    window.addEventListener("scroll", handleScroll);

    const timeTrackingInterval = setInterval(trackTimeThresholds, 5000);

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            const sectionId = entry.target.id;
            if (sectionId) {
              LandingAnalytics.trackSectionView(
                sectionId.replace("-section", ""),
              );
            }
          }
        });
      },
      { threshold: 0.5 },
    );

    setTimeout(() => {
      const sections = document.querySelectorAll('section[id$="-section"]');
      sections.forEach((section) => sectionObserver.observe(section));
    }, 1000);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll);
      clearInterval(timeTrackingInterval);
      sectionObserver.disconnect();
    };
  }, [session, navigate]);

  return (
    <div className="bg-bg-dark-primary text-text-primary min-h-screen overflow-x-hidden">
      <header className="fixed top-0 left-0 w-full z-[10000] border-b border-border-color bg-[rgba(25,28,40,0.9)] backdrop-blur-[10px]">
        <Statusbar />
        <Navbar />
      </header>

      <main className="pt-20">
        <section id="hero-section">
          <HeroSection user={session?.user} isLoaded={isLoaded} />
        </section>
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
          <section id="features-section">
            <FeaturesSection />
          </section>
        </Suspense>

        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
          <section id="social-proof-section">
            <SocialProofSection />
          </section>
        </Suspense>

        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
          <section id="newsletter-section">
            <NewsletterSection />
          </section>
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
