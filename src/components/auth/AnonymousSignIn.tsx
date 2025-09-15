import React, { memo, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authActions, handleAuthError } from "@/lib/auth";
import { Alert, Button } from "@/components/global";

interface AnonymousSignInProps {
  className?: string;
  onSuccess?: () => void;
  redirectTo?: string;
}

function AnonymousSignIn({
  className,
  onSuccess,
  redirectTo = "/",
}: AnonymousSignInProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleAnonymousSignIn = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { error: authError } = await authActions.signInAnonymously();

      if (authError) {
        setError(handleAuthError(authError).message);
        return;
      }

      if (onSuccess) {
        onSuccess();
      } else {
        navigate(redirectTo, { replace: true });
      }
    } catch (err) {
      setError(handleAuthError(err).message);
    } finally {
      setIsLoading(false);
    }
  }, [navigate, onSuccess, redirectTo]);

  return (
    <div className={className}>
      {error && (
        <Alert variant="destructive" className="text-sm mb-4" role="alert">
          {error}
        </Alert>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={handleAnonymousSignIn}
        disabled={isLoading}
        className="w-full transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-bg-dark-secondary disabled:hover:scale-100"
        aria-label="Continue without creating an account"
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
            <span>Signing in...</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M21 17.5C21 19.433 19.433 21 17.5 21C15.567 21 14 19.433 14 17.5C14 15.567 15.567 14 17.5 14C19.433 14 21 15.567 21 17.5Z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M2 11H22"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M4 11L4.6138 8.54479C5.15947 6.36211 5.43231 5.27077 6.24609 4.63538C7.05988 4 8.1848 4 10.4347 4H13.5653C15.8152 4 16.9401 4 17.7539 4.63538C18.5677 5.27077 18.8405 6.36211 19.3862 8.54479L20 11"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M10 17.5C10 19.433 8.433 21 6.5 21C4.567 21 3 19.433 3 17.5C3 15.567 4.567 14 6.5 14C8.433 14 10 15.567 10 17.5Z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M10 17.4999L10.6584 17.1707C11.5029 16.7484 12.4971 16.7484 13.3416 17.1707L14 17.4999"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <span>Try Without Account</span>
          </div>
        )}
      </Button>
    </div>
  );
}

export default memo(AnonymousSignIn);
