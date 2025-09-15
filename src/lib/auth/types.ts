export type { User, Session } from "./auth";

export interface AuthUser {
  id: string;
  email?: string;
  emailConfirmed?: boolean;
  phone?: string;
  phoneConfirmed?: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastSignInAt?: string;
  userMetadata?: {
    name?: string;
    fullName?: string;
    avatarUrl?: string;
    username?: string;
    bio?: string;
    website?: string;
    location?: string;
    [key: string]: any;
  };
  appMetadata?: {
    provider?: string;
    providers?: string[];
    role?: string;
    permissions?: string[];
    [key: string]: any;
  };
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  expiresAt?: number;
  tokenType: string;
  user: AuthUser;
}

export interface AuthError {
  message: string;
  status?: number;
  code?: string;
  details?: string;
}

export interface AuthState {
  user: AuthUser | null;
  session: AuthSession | null;
  loading: boolean;
  error: AuthError | null;
  isAuthenticated: boolean;
}

export type OAuthProvider = "github" | "google" | "discord";
export type AuthMethod = "email" | "oauth" | "phone";

export interface SignUpRequest {
  email: string;
  password: string;
  data?: {
    name?: string;
    fullName?: string;
    username?: string;
    [key: string]: any;
  };
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface OAuthSignInRequest {
  provider: OAuthProvider;
  redirectTo?: string;
  scopes?: string;
}

export interface PasswordResetRequest {
  email: string;
  redirectTo?: string;
}

export interface PasswordUpdateRequest {
  password: string;
}

export interface UserUpdateRequest {
  email?: string;
  password?: string;
  data?: Record<string, any>;
}

export interface EmailVerificationRequest {
  email: string;
  token: string;
  type: "signup" | "recovery" | "email_change";
}

export interface ResendEmailRequest {
  email: string;
  type: "signup" | "recovery";
}

export interface AuthResponse<T = any> {
  data: T | null;
  error: AuthError | null;
}

export interface SessionResponse extends AuthResponse<AuthSession> {}
export interface UserResponse extends AuthResponse<AuthUser> {}

export interface OAuthResponse
  extends AuthResponse<{
    url: string;
    provider: OAuthProvider;
  }> {}

export interface UseAuthReturn extends AuthState {
  signOut: () => Promise<AuthResponse<void>>;
  clearError: () => void;
  isLoading: boolean;
}

export interface UseAuthActionsReturn {
  signIn: (email: string, password: string) => Promise<SessionResponse>;
  signUp: (
    email: string,
    password: string,
    options?: { data?: any }
  ) => Promise<SessionResponse>;
  signInWithOAuth: (provider: OAuthProvider) => Promise<OAuthResponse>;
  resetPassword: (email: string) => Promise<AuthResponse<void>>;
  updatePassword: (password: string) => Promise<UserResponse>;
  loading: boolean;
  error: AuthError | null;
  clearError: () => void;
}

export interface UseUserProfileReturn {
  user: AuthUser | null;
  updateProfile: (updates: UserUpdateRequest) => Promise<UserResponse>;
  loading: boolean;
  error: AuthError | null;
  clearError: () => void;
}

export interface AuthConfig {
  redirectUrls: {
    signIn: string;
    signUp: string;
    resetPassword: string;
    callback: string;
  };
  session: {
    persistSession: boolean;
    autoRefreshToken: boolean;
  };
  providers: readonly OAuthProvider[];
}

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  message: string;
}

export interface ValidationRules {
  email: ValidationRule[];
  password: ValidationRule[];
  name: ValidationRule[];
  username: ValidationRule[];
}

export interface FormState<T = Record<string, any>> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isValid: boolean;
  isSubmitting: boolean;
}

export interface SignInFormState
  extends FormState<{
    email: string;
    password: string;
    rememberMe?: boolean;
  }> {}

export interface SignUpFormState
  extends FormState<{
    email: string;
    password: string;
    confirmPassword: string;
    name?: string;
    agreeToTerms: boolean;
  }> {}

export interface PasswordResetFormState
  extends FormState<{
    email: string;
  }> {}

export interface PasswordUpdateFormState
  extends FormState<{
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }> {}

export interface ProfileUpdateFormState
  extends FormState<{
    name?: string;
    email?: string;
    username?: string;
    bio?: string;
    website?: string;
    location?: string;
  }> {}

export interface AuthStorageData {
  rememberedEmail?: string;
  lastAuthMethod?: AuthMethod;
  preferences?: {
    theme?: "light" | "dark";
    language?: string;
    notifications?: boolean;
  };
}

export interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
  requireAuth?: boolean;
  requiredRole?: string;
  requiredPermissions?: string[];
}

export interface AuthContextType extends UseAuthReturn {
  signIn: (email: string, password: string) => Promise<SessionResponse>;
  signUp: (
    email: string,
    password: string,
    options?: { data?: any }
  ) => Promise<SessionResponse>;
  signInWithOAuth: (provider: OAuthProvider) => Promise<OAuthResponse>;
  resetPassword: (email: string) => Promise<AuthResponse<void>>;
  updatePassword: (password: string) => Promise<UserResponse>;
  updateProfile: (updates: UserUpdateRequest) => Promise<UserResponse>;
}

export type AuthEvent =
  | "SIGNED_IN"
  | "SIGNED_OUT"
  | "TOKEN_REFRESHED"
  | "USER_UPDATED"
  | "PASSWORD_RECOVERY";

export interface AuthEventData {
  event: AuthEvent;
  session: AuthSession | null;
  user: AuthUser | null;
}

export type Nullable<T> = T | null;
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export interface ApiResponse<T = any> {
  data?: T;
  error?: {
    message: string;
    code?: string;
    status?: number;
  };
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
