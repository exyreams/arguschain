import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, auth } from "./auth";
import { handleAuthError } from "./error-handler";
import type {
  User,
  Session,
  OAuthProvider,
  SignUpRequest,
  SignInRequest,
  PasswordResetRequest,
  UserUpdateRequest,
  AuthResponse,
} from "./types";

export const authQueryKeys = {
  all: ["auth"] as const,
  session: () => [...authQueryKeys.all, "session"] as const,
  user: () => [...authQueryKeys.all, "user"] as const,
  profile: (userId: string) =>
    [...authQueryKeys.all, "profile", userId] as const,
} as const;

export function useAuthSession() {
  return useQuery({
    queryKey: authQueryKeys.session(),
    queryFn: async (): Promise<Session | null> => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        throw handleAuthError(error);
      }

      return session;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: (failureCount, error: any) => {
      if (
        error?.code === "invalid_credentials" ||
        error?.code === "token_expired"
      ) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

export function useAuthUser() {
  return useQuery({
    queryKey: authQueryKeys.user(),
    queryFn: async (): Promise<User | null> => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        throw handleAuthError(error);
      }

      return user;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: true,
    retry: (failureCount, error: any) => {
      if (
        error?.code === "invalid_credentials" ||
        error?.code === "token_expired"
      ) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

export function useSignIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, password }: SignInRequest) => {
      const { data, error } = await auth.signIn(email, password);

      if (error) {
        return { data: null, error: handleAuthError(error) };
      }

      return { data, error: null };
    },
    onSuccess: (result) => {
      if (result.data) {
        queryClient.invalidateQueries({ queryKey: authQueryKeys.all });
        queryClient.setQueryData(authQueryKeys.session(), result.data.session);
        queryClient.setQueryData(authQueryKeys.user(), result.data.user);
      }
    },
    onError: (error) => {
      console.error("Sign in failed:", error);
    },
  });
}

export function useSignUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, password, data }: SignUpRequest) => {
      const { data: authData, error } = await auth.signUp(email, password, {
        data,
      });

      if (error) {
        return { data: null, error: handleAuthError(error) };
      }

      return { data: authData, error: null };
    },
    onSuccess: (result) => {
      if (result.data) {
        queryClient.invalidateQueries({ queryKey: authQueryKeys.all });
        if (result.data.session) {
          queryClient.setQueryData(
            authQueryKeys.session(),
            result.data.session
          );
        }
        if (result.data.user) {
          queryClient.setQueryData(authQueryKeys.user(), result.data.user);
        }
      }
    },
    onError: (error) => {
      console.error("Sign up failed:", error);
    },
  });
}

export function useOAuthSignIn() {
  return useMutation({
    mutationFn: async (provider: OAuthProvider) => {
      const { data, error } = await auth.signInWithOAuth(provider);

      if (error) {
        throw handleAuthError(error);
      }

      return data;
    },
    onError: (error) => {
      console.error("OAuth sign in failed:", error);
    },
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<AuthResponse<void>> => {
      const { error } = await auth.signOut();

      if (error) {
        return { data: null, error: handleAuthError(error) };
      }

      return { data: null, error: null };
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: authQueryKeys.all });
      queryClient.clear();

      window.location.href = "/signin";
    },
    onError: (error) => {
      console.error("Sign out failed:", error);
    },
  });
}

export function usePasswordReset() {
  return useMutation({
    mutationFn: async ({
      email,
    }: PasswordResetRequest): Promise<AuthResponse<void>> => {
      const { error } = await auth.resetPassword(email);

      if (error) {
        return { data: null, error: handleAuthError(error) };
      }

      return { data: null, error: null };
    },
    onError: (error) => {
      console.error("Password reset failed:", error);
    },
  });
}

export function usePasswordUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (password: string) => {
      const { data, error } = await auth.updatePassword(password);

      if (error) {
        return { data: null, error: handleAuthError(error) };
      }

      return { data, error: null };
    },
    onSuccess: (result) => {
      if (result.data) {
        queryClient.setQueryData(authQueryKeys.user(), result.data.user);
        queryClient.invalidateQueries({ queryKey: authQueryKeys.session() });
      }
    },
    onError: (error) => {
      console.error("Password update failed:", error);
    },
  });
}

export function useUserUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: UserUpdateRequest) => {
      const { data, error } = await auth.updateUser(updates);

      if (error) {
        return { data: null, error: handleAuthError(error) };
      }

      return { data, error: null };
    },
    onSuccess: (result) => {
      if (result.data) {
        queryClient.setQueryData(authQueryKeys.user(), result.data.user);
        queryClient.invalidateQueries({ queryKey: authQueryKeys.session() });
      }
    },
    onError: (error) => {
      console.error("User update failed:", error);
    },
  });
}

export function useEmailVerification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      email: string;
      token: string;
      type: "signup" | "recovery" | "email_change";
    }) => {
      const { data, error } = await auth.verifyOtp(params);

      if (error) {
        throw handleAuthError(error);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authQueryKeys.all });
    },
    onError: (error) => {
      console.error("Email verification failed:", error);
    },
  });
}

export function useResendEmail() {
  return useMutation({
    mutationFn: async (params: {
      email: string;
      type: "signup" | "email_change";
    }) => {
      const { data, error } = await auth.resend(params.email, params.type);

      if (error) {
        throw handleAuthError(error);
      }

      return data;
    },
    onError: (error) => {
      console.error("Resend email failed:", error);
    },
  });
}

export function useAuthStatus() {
  const sessionQuery = useAuthSession();
  const userQuery = useAuthUser();

  return {
    session: sessionQuery.data,
    user: userQuery.data,
    isLoading: sessionQuery.isLoading || userQuery.isLoading,
    isError: sessionQuery.isError || userQuery.isError,
    error: sessionQuery.error || userQuery.error,
    isAuthenticated: !!(sessionQuery.data && userQuery.data),
    refetch: () => {
      sessionQuery.refetch();
      userQuery.refetch();
    },
  };
}

export function useAuthMutations() {
  const signIn = useSignIn();
  const signUp = useSignUp();
  const signOut = useSignOut();
  const oauthSignIn = useOAuthSignIn();
  const passwordReset = usePasswordReset();
  const passwordUpdate = usePasswordUpdate();
  const userUpdate = useUserUpdate();
  const emailVerification = useEmailVerification();
  const resendEmail = useResendEmail();

  return {
    signIn,
    signUp,
    signOut,
    oauthSignIn,
    passwordReset,
    passwordUpdate,
    userUpdate,
    emailVerification,
    resendEmail,

    isLoading:
      signIn.isPending ||
      signUp.isPending ||
      signOut.isPending ||
      oauthSignIn.isPending ||
      passwordReset.isPending ||
      passwordUpdate.isPending ||
      userUpdate.isPending ||
      emailVerification.isPending ||
      resendEmail.isPending,

    hasError:
      signIn.isError ||
      signUp.isError ||
      signOut.isError ||
      oauthSignIn.isError ||
      passwordReset.isError ||
      passwordUpdate.isError ||
      userUpdate.isError ||
      emailVerification.isError ||
      resendEmail.isError,
  };
}

export function prefetchAuthData(
  queryClient: ReturnType<typeof useQueryClient>
) {
  return Promise.all([
    queryClient.prefetchQuery({
      queryKey: authQueryKeys.session(),
      queryFn: async () => {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        return session;
      },
      staleTime: 5 * 60 * 1000,
    }),
    queryClient.prefetchQuery({
      queryKey: authQueryKeys.user(),
      queryFn: async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        return user;
      },
      staleTime: 5 * 60 * 1000,
    }),
  ]);
}

export function clearAuthCache(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.removeQueries({ queryKey: authQueryKeys.all });
}
