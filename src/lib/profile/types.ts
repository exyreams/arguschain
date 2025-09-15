// Profile page component types and interfaces

// Remove conflicting import - define our own ExportFormat

export interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  username?: string;
  bio?: string;
  website?: string;
  avatar?: string;
  createdAt: string;
  lastLoginAt: string;
  authMethod: AuthMethod;
  isEmailVerified: boolean;
  preferences?: UserPreferences;
  connectedProviders?: ConnectedProvider[];
  usage?: UsageData;
}

export interface ConnectedProvider {
  provider: OAuthProvider;
  providerId: string;
  email?: string;
  connectedAt: string;
}

export type OAuthProvider = "google" | "github" | "discord";

export interface UsageData {
  analysisCount: number;
  savedQueries: number;
  storageUsed: number;
  storageLimit: number;
}

export interface AuthMethod {
  type: "email" | "oauth";
  provider?: "google" | "github" | "discord";
  providerId?: string;
  lastPasswordChange?: string;
}

export interface UserPreferences {
  theme: "light" | "dark" | "system";
  notifications: {
    browser: boolean;
    email: boolean;
    analysisComplete: boolean;
    errorAlerts: boolean;
  };
  accessibility: {
    fontSize: "small" | "medium" | "large";
    highContrast: boolean;
    reduceAnimations: boolean;
  };
  interface: {
    compactMode: boolean;
    showTooltips: boolean;
    autoSave: boolean;
  };
}

export interface AnonymousSession {
  sessionId: string;
  startTime: string;
  limitations: SessionLimitations;
  usage: SessionUsage;
}

export interface SessionLimitations {
  maxAnalysisHistory: number;
  maxSavedQueries: number;
  canExport: boolean;
  canSaveSettings: boolean;
}

export interface SessionUsage {
  analysisCount: number;
  savedQueries: number;
}

// Component Props Interfaces (ProfilePage removed - functionality moved to settings modal)

export type ProfileSection =
  | "personal-info"
  | "security"
  | "data-management"
  | "session-info";

export interface UserDropdownProps {
  user: UserProfile | null;
  isAnonymous: boolean;
  className?: string;
}

export interface DropdownItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  variant?: "default" | "danger";
  disabled?: boolean;
}

export interface ProfileHeroProps {
  user: UserProfile | null;
  session: AnonymousSession | null;
  onAvatarUpload: (file: File) => Promise<void>;
  className?: string;
}

export interface ProfileSectionsProps {
  user: UserProfile | null;
  session: AnonymousSession | null;
  currentSection: ProfileSection;
  onSectionChange: (section: ProfileSection) => void;
  onProfileSave?: (data: ProfileFormData) => Promise<void>;
  onPasswordChange?: (
    currentPassword: string,
    newPassword: string
  ) => Promise<void>;
  onOAuthLink?: (provider: OAuthProvider) => Promise<void>;
  onOAuthUnlink?: (provider: OAuthProvider) => Promise<void>;
  onDataExport?: (
    format: ExportFormat,
    dataTypes: DataType[]
  ) => Promise<string>;
  onClearData?: (dataType: DataType) => Promise<void>;
  onDeleteAccount?: () => Promise<void>;
  onCreateAccount?: () => void;
  className?: string;
}

export interface PersonalInfoSectionProps {
  user: UserProfile | null;
  isEditing: boolean;
  onEditToggle: () => void;
  onSave: (data: ProfileFormData) => Promise<void>;
  className?: string;
}

export interface SecuritySectionProps {
  user: UserProfile | null;
  onPasswordChange: (
    currentPassword: string,
    newPassword: string
  ) => Promise<void>;
  onOAuthLink: (provider: OAuthProvider) => Promise<void>;
  onOAuthUnlink: (provider: OAuthProvider) => Promise<void>;
  className?: string;
}

export interface DataSectionProps {
  user: UserProfile | null;
  onExportData: (
    format: ExportFormat,
    dataTypes: DataType[]
  ) => Promise<string>;
  onClearData: (dataType: DataType) => Promise<void>;
  onDeleteAccount: () => Promise<void>;
  className?: string;
}

export interface SessionSectionProps {
  session: AnonymousSession | null;
  onCreateAccount: () => void;
  className?: string;
}

// Form Data Interfaces
export interface ProfileFormData {
  fullName: string;
  username?: string;
  bio?: string;
  website?: string;
  email: string;
}

export interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// Error and Loading States
export interface ProfileError {
  type:
    | "network"
    | "validation"
    | "authentication"
    | "permission"
    | "rate_limit"
    | "server"
    | "client";
  message: string;
  field?: string;
  recoverable: boolean;
  retryAction?: () => void;
}

export interface LoadingState {
  isLoading: boolean;
  operation?: string;
  progress?: number;
}

// Export and Data Management
export type ExportFormat = "json" | "csv";

export type DataType = "profile" | "analysis-history" | "usage-data";

export interface ExportProgress {
  progress: number;
  status: "preparing" | "exporting" | "complete" | "error";
}

export type SessionLimitation = keyof SessionLimitations;
