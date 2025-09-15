import { useLocation } from "react-router-dom";
import { useSession } from "@/lib/auth";

export function useRequireAuth() {
  const { session, loading: isLoading, error } = useSession();
  const location = useLocation();

  const isAuthenticated = !isLoading && !error && !!session?.user;
  const isValidating = isLoading;
  const hasError = !!error;

  const redirectToSignin = () => {
    window.location.href = `/signin?redirect=${encodeURIComponent(location.pathname + location.search)}`;
  };

  return {
    isAuthenticated,
    isValidating,
    hasError,
    session,
    redirectToSignin,
  };
}
