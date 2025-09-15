import { useState } from "react";
import { Button, Input } from "@/components/global";
import { CheckCircle, Mail } from "lucide-react";

export function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setIsSubmitted(true);
    setIsLoading(false);
    setEmail("");

    // Track newsletter signup
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "newsletter_signup", {
        event_category: "engagement",
        event_label: "landing_page",
      });
    }
  };

  return (
    <section className="py-16 bg-[#0f1419] relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          {/* Newsletter Signup */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[rgba(0,191,255,0.1)] border border-[rgba(0,191,255,0.3)] rounded-full mb-6">
              <Mail className="h-8 w-8 text-[#00bfff]" />
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-accent-primary mb-4">
              Stay Updated with Blockchain Insights
            </h2>
            <p className="text-xl text-[#8b9dc3] mb-8 max-w-2xl mx-auto">
              Get the latest blockchain analysis insights, feature updates, and
              industry trends delivered to your inbox.
            </p>

            {!isSubmitted ? (
              <form
                onSubmit={handleSubmit}
                className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto"
              >
                <Input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="flex-1 bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.3)] text-white placeholder-[#8b9dc3] focus:border-[#00bfff]"
                />
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2 whitespace-nowrap"
                >
                  {isLoading ? "Subscribing..." : "Subscribe"}
                </Button>
              </form>
            ) : (
              <div className="flex items-center justify-center space-x-3 text-green-400">
                <CheckCircle className="h-6 w-6" />
                <span className="text-lg font-medium">
                  Thank you for subscribing!
                </span>
              </div>
            )}

            <p className="text-sm text-[#8b9dc3] mt-4">
              No spam, unsubscribe at any time. Read our{" "}
              <a href="/privacy" className="text-[#00bfff] hover:underline">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
