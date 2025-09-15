import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/global";
import { Shield } from "lucide-react";
import Statusbar from "../components/status/Statusbar";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="bg-bg-dark-primary text-text-primary min-h-screen overflow-x-hidden flex flex-col bg-gradient-to-br from-bg-dark-primary to-bg-dark-secondary">
      <header className="fixed top-0 left-0 w-full z-[10000] border-b border-border-color bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,rgba(0,191,255,0.03)_2px,rgba(0,191,255,0.03)_4px)]">
        <Statusbar />
        <Navbar />
      </header>

      <main className="flex-1 pt-40 pb-16 px-6 flex items-center justify-center">
        <div className="text-center px-4 py-12 max-w-md">
          <div className="mb-6 flex justify-center">
            <div className="p-4 rounded-full bg-[rgba(220,38,38,0.1)] border border-[rgba(220,38,38,0.3)]">
              <Shield className="h-16 w-16 text-red-400" />
            </div>
          </div>
          <h1 className="text-6xl font-bold mb-4 text-[#00bfff] tracking-wide">
            404
          </h1>
          <p className="text-xl text-[#8b9dc3] mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Button
            asChild
            className="bg-[#00bfff] hover:bg-[#0099cc] text-[#0f1419] font-medium px-6 py-3 transition-all duration-200 hover:shadow-[0_0_12px_rgba(0,191,255,0.5)]"
          >
            <a href="/" className="inline-flex items-center">
              Return to Dashboard
            </a>
          </Button>
          <p className="mt-8 text-sm text-[#6b7280] font-mono bg-[rgba(25,28,40,0.6)] px-4 py-2 rounded border border-[rgba(0,191,255,0.1)]">
            Path: {location.pathname}
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default NotFound;
