import React from "react";
import { PerformanceDashboard } from "@/components/tracetransaction";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Statusbar from "@/components/status/Statusbar";

export const PerformanceDashboardPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Navbar />
      <Statusbar />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#00bfff] mb-2">
            Performance Dashboard
          </h1>
          <p className="text-gray-400">
            Monitor system performance, analyze trends, and optimize trace
            analysis operations.
          </p>
        </div>

        <PerformanceDashboard />
      </div>

      <Footer />
    </div>
  );
};
