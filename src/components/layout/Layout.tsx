import React from "react";
import { Link } from "react-router-dom";
import { Shield } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-8 w-8 rounded flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
              Transaction Tracer
            </span>
          </Link>

          <div className="ml-auto text-sm text-muted-foreground">
            Deep transaction analysis with debug_traceTransaction
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t bg-card/30 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>
            Transaction Tracer - Powered by debug_traceTransaction with
            callTracer & structLog
          </p>
        </div>
      </footer>
    </div>
  );
}
