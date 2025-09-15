import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Loader } from "@/components/global";

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  fallback,
  redirectTo = "/signin",
}) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      fallback || (
        <div className="min-h-screen bg-bg-dark-primary flex items-center justify-center">
          <div className="text-center">
            <Loader className="h-8 w-8 text-[#00bfff] mx-auto mb-4" />
            <p className="text-[#8b9dc3]">Checking authentication...</p>
          </div>
        </div>
      )
    );
  }

  if (!isAuthenticated) {
    // Save the attempted location for redirect after login
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
