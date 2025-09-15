import { auth, supabase } from "./auth";
import { useAuth, useAuthActions } from "./auth-hooks";
import { useSignIn, useSignOut, useSignUp } from "./queries";
import { handleAuthError, validation } from "./error-handler";

export {
  supabase,
  auth,
  AUTH_CONFIG,
  type User,
  type Session,
  type AuthError,
} from "./auth";

export {
  useAuth,
  useUser,
  useSession,
  useAuthActions,
  useUserProfile,
} from "./auth-hooks";

export {
  useAuthSession,
  useAuthUser,
  useAuthStatus,
  useSignIn,
  useSignUp,
  useSignOut,
  useOAuthSignIn,
  usePasswordReset,
  usePasswordUpdate,
  useUserUpdate,
  useEmailVerification,
  useResendEmail,
  useAuthMutations,
  authQueryKeys,
  prefetchAuthData,
  clearAuthCache,
} from "./queries";

export type {
  AuthUser,
  AuthSession,
  AuthState,
  OAuthProvider,
  AuthMethod,
  SignUpRequest,
  SignInRequest,
  OAuthSignInRequest,
  PasswordResetRequest,
  PasswordUpdateRequest,
  UserUpdateRequest,
  EmailVerificationRequest,
  ResendEmailRequest,
  AuthResponse,
  SessionResponse,
  UserResponse,
  OAuthResponse,
  FormState,
  SignInFormState,
  SignUpFormState,
  PasswordResetFormState,
  PasswordUpdateFormState,
  ProfileUpdateFormState,
  AuthConfig,
  ValidationRule,
  ValidationRules,
  AuthStorageData,
  ProtectedRouteProps,
  AuthContextType,
  AuthEvent,
  AuthEventData,
  Nullable,
  Optional,
  RequiredFields,
  ApiResponse,
  PaginationParams,
  PaginatedResponse,
} from "./types";

export {
  SupabaseErrorCode,
  mapSupabaseError,
  handleAuthError,
  useAuthError,
  validation,
  RateLimiter,
  authRateLimiter,
  getProgressiveDelay,
  delay,
} from "./error-handler";

export {
  isAnonymousUser,
  getUserDisplayName,
  shouldShowUpgradePrompt,
  getUpgradePromptMessage,
  ANONYMOUS_LIMITATIONS,
} from "./anonymous-utils";

export {
  AnonymousUserService,
  type AnonymousSession,
  type QueryLimitResult,
} from "./anonymous-service";

export const authActions = {
  signIn: (email: string, password: string) => auth.signIn(email, password),
  signUp: (email: string, password: string, options?: { data?: any }) =>
    auth.signUp(email, password, options),
  signOut: () => auth.signOut(),
  signInWithOAuth: (provider: "github" | "google" | "discord") =>
    auth.signInWithOAuth(provider),
  signInAnonymously: () => auth.signInAnonymously(),
  resetPassword: (email: string) => auth.resetPassword(email),
  updatePassword: (password: string) => auth.updatePassword(password),
  updateUser: (updates: any) => auth.updateUser(updates),
};

export const validators = {
  email: validation.email,
  password: validation.password,
  name: validation.name,
  username: validation.username,
  confirmPassword: validation.confirmPassword,
};

const authModule = {
  supabase,
  auth,
  useAuth,
  useAuthActions,
  useSignIn,
  useSignUp,
  useSignOut,
  validators,
  handleAuthError,
};

export default authModule;
