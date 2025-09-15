import { useState, useEffect, useCallback } from "react";
import { supabase, type User, type Session, type AuthError } from "./auth";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: AuthError | null;
}
export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    const getInitialSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (mounted) {
          setState({
            user: session?.user ?? null,
            session,
            loading: false,
            error: error ? { message: error.message } : null,
          });
        }
      } catch (err) {
        if (mounted) {
          setState({
            user: null,
            session: null,
            loading: false,
            error: {
              message: err instanceof Error ? err.message : "Unknown error",
            },
          });
        }
      }
    };

    getInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (mounted) {
        setState({
          user: session?.user ?? null,
          session,
          loading: false,
          error: null,
        });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setState((prev) => ({ ...prev, error: { message: error.message } }));
        return { error };
      }
      return { error: null };
    } catch (err) {
      const error = {
        message: err instanceof Error ? err.message : "Sign out failed",
      };
      setState((prev) => ({ ...prev, error }));
      return { error };
    }
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    signOut,
    clearError,
    isAuthenticated: !!state.user,
    isLoading: state.loading,
  };
}

export function useUser() {
  const { user, loading, error } = useAuth();

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
  };
}

export function useSession() {
  const { session, loading, error } = useAuth();

  return {
    session,
    loading,
    error,
    isAuthenticated: !!session,
  };
}

export function useAuthActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError({ message: error.message });
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      const authError = {
        message: err instanceof Error ? err.message : "Sign in failed",
      };
      setError(authError);
      return { data: null, error: authError };
    } finally {
      setLoading(false);
    }
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, options?: { data?: any }) => {
      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options,
        });

        if (error) {
          setError({ message: error.message });
          return { data: null, error };
        }

        return { data, error: null };
      } catch (err) {
        const authError = {
          message: err instanceof Error ? err.message : "Sign up failed",
        };
        setError(authError);
        return { data: null, error: authError };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const signInWithOAuth = useCallback(
    async (provider: "github" | "google" | "discord") => {
      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) {
          setError({ message: error.message });
          return { data: null, error };
        }

        return { data, error: null };
      } catch (err) {
        const authError = {
          message: err instanceof Error ? err.message : "OAuth sign in failed",
        };
        setError(authError);
        return { data: null, error: authError };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const resetPassword = useCallback(async (email: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        setError({ message: error.message });
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      const authError = {
        message: err instanceof Error ? err.message : "Password reset failed",
      };
      setError(authError);
      return { data: null, error: authError };
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.updateUser({ password });

      if (error) {
        setError({ message: error.message });
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err) {
      const authError = {
        message: err instanceof Error ? err.message : "Password update failed",
      };
      setError(authError);
      return { data: null, error: authError };
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    signIn,
    signUp,
    signInWithOAuth,
    resetPassword,
    updatePassword,
    loading,
    error,
    clearError,
  };
}

export function useUserProfile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);

  const updateProfile = useCallback(
    async (updates: { email?: string; data?: Record<string, any> }) => {
      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase.auth.updateUser(updates);

        if (error) {
          setError({ message: error.message });
          return { data: null, error };
        }

        return { data, error: null };
      } catch (err) {
        const authError = {
          message: err instanceof Error ? err.message : "Profile update failed",
        };
        setError(authError);
        return { data: null, error: authError };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    user,
    updateProfile,
    loading,
    error,
    clearError,
  };
}
