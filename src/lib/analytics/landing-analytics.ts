// Landing page analytics tracking utilities

interface AnalyticsEvent {
  event: string;
  event_category?: string;
  event_label?: string;
  value?: number;
  user_authenticated?: boolean;
  section?: string;
  feature_name?: string;
  demo_link?: string;
  action?: string;
}

declare global {
  interface Window {
    gtag?: (command: string, targetId: string, config?: any) => void;
  }
}

export class LandingAnalytics {
  private static isGtagAvailable(): boolean {
    return typeof window !== "undefined" && typeof window.gtag === "function";
  }

  // Page view tracking
  static trackPageView(
    title: string = "Arguschain - Enterprise Blockchain Analysis Platform"
  ) {
    if (this.isGtagAvailable()) {
      window.gtag!("event", "page_view", {
        page_title: title,
        page_location: window.location.href,
        event_category: "engagement",
      });
    }
  }

  // Section view tracking (for scroll-based analytics)
  static trackSectionView(sectionName: string) {
    if (this.isGtagAvailable()) {
      window.gtag!("event", "section_view", {
        event_category: "engagement",
        event_label: sectionName,
        section: sectionName,
      });
    }
  }

  // CTA click tracking
  static trackCTAClick(
    action: string,
    label: string,
    userAuthenticated: boolean = false
  ) {
    if (this.isGtagAvailable()) {
      window.gtag!("event", "cta_click", {
        event_category: "conversion",
        event_label: label,
        action: action,
        user_authenticated: userAuthenticated,
      });
    }
  }

  // Feature interaction tracking
  static trackFeatureInteraction(
    featureName: string,
    interactionType: "hover" | "click" | "demo_click"
  ) {
    if (this.isGtagAvailable()) {
      window.gtag!("event", "feature_interaction", {
        event_category: "engagement",
        event_label: `${featureName}_${interactionType}`,
        feature_name: featureName,
        interaction_type: interactionType,
      });
    }
  }

  // Demo access tracking
  static trackDemoAccess(demoType: string, source: string) {
    if (this.isGtagAvailable()) {
      window.gtag!("event", "demo_access", {
        event_category: "conversion",
        event_label: `${demoType}_from_${source}`,
        demo_type: demoType,
        source: source,
      });
    }
  }

  // Newsletter signup tracking
  static trackNewsletterSignup(source: string = "landing_page") {
    if (this.isGtagAvailable()) {
      window.gtag!("event", "newsletter_signup", {
        event_category: "conversion",
        event_label: source,
        source: source,
      });
    }
  }

  // Enterprise engagement tracking
  static trackEnterpriseEngagement(
    action: "demo_request" | "sales_contact" | "enterprise_view"
  ) {
    if (this.isGtagAvailable()) {
      window.gtag!("event", "enterprise_engagement", {
        event_category: "enterprise",
        event_label: action,
        action: action,
      });
    }
  }

  // Performance tracking
  static trackPerformanceMetric(
    metricName: string,
    value: number,
    unit: string = "ms"
  ) {
    if (this.isGtagAvailable()) {
      window.gtag!("event", "performance_metric", {
        event_category: "performance",
        event_label: metricName,
        value: Math.round(value),
        metric_name: metricName,
        unit: unit,
      });
    }
  }

  // Conversion funnel tracking
  static trackConversionStep(
    step: string,
    stepNumber: number,
    userAuthenticated: boolean = false
  ) {
    if (this.isGtagAvailable()) {
      window.gtag!("event", "conversion_step", {
        event_category: "conversion_funnel",
        event_label: step,
        value: stepNumber,
        step: step,
        step_number: stepNumber,
        user_authenticated: userAuthenticated,
      });
    }
  }

  // Scroll depth tracking
  static trackScrollDepth(percentage: number) {
    if (this.isGtagAvailable()) {
      window.gtag!("event", "scroll_depth", {
        event_category: "engagement",
        event_label: `${percentage}%`,
        value: percentage,
        scroll_percentage: percentage,
      });
    }
  }

  // Time on page tracking
  static trackTimeOnPage(seconds: number) {
    if (this.isGtagAvailable()) {
      window.gtag!("event", "time_on_page", {
        event_category: "engagement",
        event_label: "landing_page",
        value: seconds,
        time_seconds: seconds,
      });
    }
  }

  // Error tracking
  static trackError(errorType: string, errorMessage: string, section?: string) {
    if (this.isGtagAvailable()) {
      window.gtag!("event", "landing_error", {
        event_category: "error",
        event_label: errorType,
        error_type: errorType,
        error_message: errorMessage,
        section: section,
      });
    }
  }
}

// Hook for scroll depth tracking
export function useScrollDepthTracking() {
  let lastTrackedPercentage = 0;
  const scrollDepthThresholds = [25, 50, 75, 90, 100];

  const handleScroll = () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const documentHeight =
      document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercentage = Math.round((scrollTop / documentHeight) * 100);

    // Track scroll depth milestones
    scrollDepthThresholds.forEach((threshold) => {
      if (scrollPercentage >= threshold && lastTrackedPercentage < threshold) {
        LandingAnalytics.trackScrollDepth(threshold);
        lastTrackedPercentage = threshold;
      }
    });
  };

  return { handleScroll };
}

// Hook for time on page tracking
export function useTimeOnPageTracking() {
  let startTime = Date.now();
  let lastTrackedTime = 0;
  const timeThresholds = [30, 60, 120, 300]; // 30s, 1m, 2m, 5m

  const trackTimeThresholds = () => {
    const currentTime = Math.floor((Date.now() - startTime) / 1000);

    timeThresholds.forEach((threshold) => {
      if (currentTime >= threshold && lastTrackedTime < threshold) {
        LandingAnalytics.trackTimeOnPage(threshold);
        lastTrackedTime = threshold;
      }
    });
  };

  return { trackTimeThresholds };
}
