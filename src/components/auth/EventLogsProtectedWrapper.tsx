import React from "react";
import { useSession } from "@/lib/auth";
import { AuthPrompt } from "./AuthPrompt";
import { Loader } from "@/components/global";

interface EventLogsProtectedWrapperProps {
  children: React.ReactNode;
}

export function EventLogsProtectedWrapper({
  children,
}: EventLogsProtectedWrapperProps) {
  const { session, loading } = useSession();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-bg-dark-primary to-bg-dark-secondary">
        <Loader aria-label="Checking authentication..." />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <AuthPrompt
        title="EventLogs Analysis"
        description="Sign in to access advanced blockchain event log analysis"
        feature="EventLogs analysis"
      />
    );
  }

  return <>{children}</>;
}
