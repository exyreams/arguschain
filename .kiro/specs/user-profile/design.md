# Design Document

## Overview

The Profile Settings is a comprehensive modal-based interface that provides users with organized profile management through tabbed sections within the application's settings modal. This approach offers efficient profile management without navigation disruption, integrated seamlessly with the navigation system through a user dropdown menu. The design supports both authenticated users with full profiles and anonymous users with session-based information, providing a centralized location for all profile-related functionality.

Key implementation features include:

- Modular component architecture with dedicated services (ProfileService, AvatarService, OAuthService)
- Enhanced profile fields (fullName, username, bio, website) with comprehensive validation
- Real-time form validation using React Hook Form + Zod with username availability checking
- Supabase storage integration for avatar management with progress indicators
- Smooth expand/collapse animations using Framer Motion for edit modes
- Comprehensive error handling and user feedback systems
- Full Supabase backend integration with real data operations
- Anonymous user experience with session statistics and upgrade prompts

## Architecture

### Component Structure

```
SettingsModal (Main Modal Component)
├── DialogHeader (Settings Title with Icon)
├── TabNavigation (Profile, Network, Preferences, API, Export, About)
└── TabContent (Dynamic Content Based on Active Tab)
    └── ProfileSettings (Profile Tab Content)
        ├── ProfileSectionTabs (Info, Personal, Security, Data)
        ├── UserInfoSettings (Info Sub-section)
        │   ├── AvatarUpload (Dedicated Avatar Component with Upload)
        │   ├── UserDisplayInfo (Name, Email, Bio, Website, Status)
        │   ├── AccountDetails (Creation Date, Last Login, Auth Method)
        │   ├── ConnectedAccounts (OAuth Provider Icons with Status)
        │   ├── SessionStats (For Anonymous Users - Analysis Count, Time)
        │   ├── SessionLimitations (Usage Progress Bars with Visual Indicators)
        │   └── CreateAccountCTA (For Anonymous Users with Benefits)
        ├── PersonalInfoSettings (Personal Sub-section)
        │   ├── FullNameField (Required, 2-100 chars)
        │   ├── UsernameField (Optional, Unique, 3-30 chars with Availability Check)
        │   ├── BioField (Optional, Max 500 chars with Counter)
        │   ├── WebsiteField (Optional, URL Validation)
        │   ├── EmailDisplay (Read-only with Verification Badge)
        │   ├── MemberSinceDisplay (Read-only)
        │   └── EditModeAnimation (Smooth Expand/Collapse with Framer Motion)
        ├── SecuritySettings (Security Sub-section)
        │   ├── AuthenticationMethod (Current Method Display)
        │   ├── PasswordManagement (Change Password Form)
        │   └── OAuthProviders (Connect/Disconnect Google, GitHub, Discord)
        └── DataSettings (Data Sub-section)
            ├── DataExport (JSON, CSV Options with Real Data)
            ├── UsageStatistics (Analysis History from Database)
            └── AccountDeletion (Danger Zone with Multi-step Confirmation)

UserDropdown (Navigation Integration)
├── DropdownTrigger (Avatar/Name in Navbar)
├── DropdownMenu (Settings, Sign Out, Create Account)
└── DropdownActions (Modal Opening & Auth Actions)

Profile Services Layer
├── ProfileService (CRUD operations, validation, data export)
├── AvatarService (Upload, delete, validation, progress tracking)
├── OAuthService (Provider management, linking/unlinking)
└── ErrorHandler (Comprehensive error handling and user feedback)
```

### State Management

The profile settings uses:

- **Global auth state** from existing authentication system
- **Modal state** for open/close and active tab management
- **Profile section state** for sub-section navigation (Info, Personal, Security, Data)
- **Form state** for profile editing with React Hook Form + Zod validation
- **Loading states** for async operations (save, upload, export, etc.)
- **Error state** for operation failures and recovery with user-friendly messages
- **Success state** for operation confirmations with auto-dismiss timers

### Integration Points

- **Authentication System** - Uses existing `useAuth()` and `useUserProfile()` hooks
- **Modal System** - Integration with existing Dialog/Modal components from shadcn/ui
- **Navigation System** - Integration with existing navbar UserDropdown component
- **Settings System** - Integration with other settings tabs (Network, Preferences, API, Export, About)
- **Form System** - Integration with React Hook Form and Zod validation
- **Theme System** - Consistent with existing Arguschain dark theme and color palette
- **Animation System** - Integration with Framer Motion for smooth transitions

## Components and Interfaces

### ProfileSettings Component

```typescript
interface ProfileSettingsProps {
  // No props needed - uses global auth state
}

interface ProfileSettingsState {
  profileSection: "info" | "personal" | "security" | "data";
  successMessage: string | null;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = () => {
  // Profile tab implementation with sub-section management
};
```

**Responsibilities:**

- Render profile tab content within settings modal
- Manage profile sub-section navigation and state
- Handle success/error message display with auto-dismiss
- Coordinate between different profile sub-sections

### SettingsModal Component

```typescript
interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?:
    | "profile"
    | "network"
    | "preferences"
    | "api"
    | "export"
    | "about";
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  onOpenChange,
  initialTab,
}) => {
  // Modal implementation with tab management
};
```

**Responsibilities:**

- Render settings modal with tabbed navigation
- Manage active tab state and transitions
- Handle modal open/close state
- Coordinate between different settings sections

### UserDropdown Component

```typescript
interface UserDropdownProps {
  user: User | null;
  className?: string;
}

const UserDropdown: React.FC<UserDropdownProps> = ({ user, className }) => {
  // Dropdown implementation with settings modal integration
};
```

**Responsibilities:**

- Display user avatar/initials in navigation
- Render dropdown menu with settings and auth options
- Handle opening settings modal with profile tab active
- Manage sign out and create account functionality

### UserInfoSettings Component

```typescript
interface UserInfoSettingsProps {
  onSuccess?: (message: string) => void;
}

const UserInfoSettings: React.FC<UserInfoSettingsProps> = ({ onSuccess }) => {
  // Info sub-section with avatar and account details
};
```

**Responsibilities:**

- Display profile avatar with upload capability and hover effects
- Show comprehensive user information (name, email, status, verification)
- Display account details (creation date, last login, authentication method)
- Show connected OAuth providers with icons
- Handle avatar upload with progress indicators and error handling
- Display session information and limitations for anonymous users
- Provide create account CTA for anonymous users

### PersonalInfoSettings Component

```typescript
interface PersonalInfoSettingsProps {
  onSuccess: (message: string) => void;
}

const PersonalInfoSettings: React.FC<PersonalInfoSettingsProps> = ({
  onSuccess,
}) => {
  // Personal info sub-section with editable fields
};
```

**Responsibilities:**

- Display editable profile fields (display name, first name, last name)
- Show read-only fields (email with verification badge, member since)
- Handle inline editing with toggle between view and edit modes
- Implement form validation using React Hook Form + Zod
- Provide save/cancel functionality with loading states
- Display success/error messages with proper feedback

### SecuritySettings Component

```typescript
interface SecuritySettingsProps {
  onSuccess: (message: string) => void;
}

const SecuritySettings: React.FC<SecuritySettingsProps> = ({ onSuccess }) => {
  // Security sub-section with authentication management
};
```

**Responsibilities:**

- Display current authentication method and connected providers
- Handle OAuth provider connection/disconnection with confirmation dialogs
- Provide password change functionality with current password verification
- Show connected accounts with provider icons and connection status
- Implement security-related form validation and error handling

### DataSettings Component

```typescript
interface DataSettingsProps {
  onSuccess: (message: string) => void;
}

const DataSettings: React.FC<DataSettingsProps> = ({ onSuccess }) => {
  // Data management sub-section
};
```

**Responsibilities:**

- Provide data export functionality with format selection (JSON, CSV)
- Display usage statistics and analysis history
- Handle account deletion with multi-step confirmation process
- Show progress indicators for long-running operations
- Implement data privacy compliance features

## Data Models

### User Profile Data

```typescript
interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  createdAt: string;
  lastLoginAt: string;
  authMethod: AuthMethod;
  isEmailVerified: boolean;
  preferences: UserPreferences;
}

interface AuthMethod {
  type: "email" | "oauth";
  provider?: "google" | "github" | "microsoft";
  providerId?: string;
  lastPasswordChange?: string;
}

interface AnonymousSession {
  sessionId: string;
  startTime: string;
  limitations: SessionLimitations;
  usage: SessionUsage;
}

interface SessionLimitations {
  maxAnalysisHistory: number;
  maxSavedQueries: number;
  canExport: boolean;
  canSaveSettings: boolean;
}
```

### Service Layer Architecture

#### ProfileService

```typescript
export class ProfileService {
  // Core CRUD operations
  async getUserProfile(userId: string): Promise<SupabaseUserProfile | null>;
  async upsertUserProfile(
    userId: string,
    profileData: Partial<SupabaseUserProfile>
  ): Promise<SupabaseUserProfile>;
  async updateProfile(
    userId: string,
    formData: ProfileFormData
  ): Promise<SupabaseUserProfile>;
  async getCompleteUserProfile(userId: string): Promise<UserProfile | null>;

  // Username management
  async isUsernameAvailable(
    username: string,
    excludeUserId?: string
  ): Promise<boolean>;

  // Session management
  async getUserSessions(userId: string): Promise<SupabaseUserSession[]>;
  async createUserSession(
    userId: string,
    sessionData: any
  ): Promise<SupabaseUserSession>;
  async updateSessionActivity(sessionId: string): Promise<void>;
  async deleteUserSession(sessionId: string): Promise<void>;
  async cleanupExpiredSessions(): Promise<number>;

  // Data export and deletion
  async exportUserData(userId: string, format: "json" | "csv"): Promise<string>;
  async deleteUserAccount(userId: string): Promise<void>;

  // Validation
  validateProfileData(data: ProfileFormData): ProfileError[];
}
```

#### AvatarService

```typescript
export class AvatarService {
  // Upload and management
  async uploadAvatar(
    userId: string,
    file: File
  ): Promise<{ url: string; path: string }>;
  async deleteAvatar(userId: string, avatarPath: string): Promise<void>;
  getPublicUrl(path: string): string;

  // Validation and utilities
  validateFile(file: File): ProfileError[];
  createProgressHandler(onProgress: (progress: number) => void);
  createPreviewUrl(file: File): string;
  revokePreviewUrl(url: string): void;
  formatFileSize(bytes: number): string;
  isFileTypeSupported(file: File): boolean;
  isFileSizeValid(file: File): boolean;

  // Storage management
  async checkBucketAccess(): Promise<boolean>;
}
```

### Form Validation Schemas

```typescript
const profileFormSchema = z.object({
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name must be less than 100 characters"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be less than 30 characters")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Username can only contain letters, numbers, underscores, and hyphens"
    )
    .optional()
    .or(z.literal("")),
  bio: z
    .string()
    .max(500, "Bio must be less than 500 characters")
    .optional()
    .or(z.literal("")),
  website: z
    .string()
    .url("Please enter a valid URL")
    .regex(/^https?:\/\//, "Website must start with http:// or https://")
    .optional()
    .or(z.literal("")),
  email: z.string().email("Please enter a valid email address"),
});

const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(8),
    newPassword: z
      .string()
      .min(8)
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword);

const avatarUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine(
      (file) => file.size <= 5 * 1024 * 1024,
      "File size must be less than 5MB"
    )
    .refine(
      (file) =>
        ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(
          file.type
        ),
      "File must be a valid image (JPEG, PNG, GIF, or WebP)"
    ),
});
```

## User Experience Flow

### Authenticated User Flow

1. **Navigation Access** - Click user avatar/name in navbar dropdown
2. **Profile Page** - Navigate to `/profile` with full-page layout
3. **View Profile** - See hero section with avatar and basic info
4. **Section Navigation** - Switch between Personal Info, Security, Data sections
5. **Edit Profile** - Inline editing or dedicated forms with validation
6. **Manage Security** - Change password, manage OAuth connections
7. **Data Management** - Export data, view usage, account deletion

### Anonymous User Flow

1. **Navigation Access** - Click guest indicator in navbar dropdown
2. **Profile Page** - Navigate to `/profile` with session information
3. **View Session** - See session ID, start time, limitations
4. **Upgrade Prompt** - Prominent account creation benefits and CTA
5. **Create Account** - Navigate to sign-up flow with context preservation

## Visual Design

### Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│ Navbar with User Dropdown                               │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │ Settings Modal (max-w-4xl, max-h-80vh)         │    │
│  │ ┌─────────────────────────────────────────────┐ │    │
│  │ │ Settings [Rotating Icon]                    │ │    │
│  │ └─────────────────────────────────────────────┘ │    │
│  │                                                 │    │
│  │ ┌──────────┐ ┌─────────────────────────────────┐ │    │
│  │ │ Profile  │ │ Profile Management              │ │    │
│  │ │ Network  │ │                                 │ │    │
│  │ │ Prefs    │ │ [Info|Personal|Security|Data]   │ │    │
│  │ │ API      │ │                                 │ │    │
│  │ │ Export   │ │ ┌─────────────────────────────┐ │ │    │
│  │ │ About    │ │ │ [Avatar] User Info          │ │ │    │
│  │ └──────────┘ │ │ Connected Accounts          │ │ │    │
│  │              │ │ Session Stats (Anonymous)   │ │ │    │
│  │              │ └─────────────────────────────┘ │ │    │
│  │              └─────────────────────────────────┘ │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### Responsive Breakpoints

- **Mobile (< 768px)**: Modal adapts to smaller screens, single column layout, touch-friendly targets
- **Tablet (768px - 1024px)**: Two-column modal layout with side navigation and content area
- **Desktop (> 1024px)**: Full modal layout with sidebar navigation and spacious content area

### Theme Integration

```typescript
// Profile settings specific styling
const profileTheme = {
  modal: {
    background: "bg-[rgba(25,28,40,0.95)]",
    border: "border-[rgba(0,191,255,0.2)]",
    backdrop: "backdrop-blur-[15px]",
  },
  tabs: {
    inactive:
      "text-[#8b9dc3] hover:bg-[rgba(0,191,255,0.08)] hover:text-[#00bfff]",
    active:
      "bg-[rgba(0,191,255,0.15)] text-[#00bfff] border border-[rgba(0,191,255,0.6)]",
  },
  sections: {
    tab: "bg-[rgba(0,191,255,0.15)] text-[#00bfff] border border-[rgba(0,191,255,0.6)]",
    content:
      "bg-gradient-to-br from-[rgba(0,191,255,0.05)] to-[rgba(0,191,255,0.02)]",
  },
  forms: {
    input:
      "bg-[rgba(25,28,40,0.8)] border-[rgba(0,191,255,0.2)] text-[#8b9dc3]",
    button:
      "bg-gradient-to-r from-[#00bfff] to-blue-400 hover:from-[#00bfff]/90 hover:to-blue-400/90 text-white",
    danger:
      "border-red-600 text-red-400 hover:bg-red-900/20 hover:text-red-300",
  },
  success:
    "bg-gradient-to-r from-green-500/20 to-green-600/20 border border-green-500/30 text-green-400",
  error:
    "bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/30 text-red-400",
};
```

## Error Handling

### Error States

```typescript
interface ProfileError {
  type: "network" | "validation" | "authentication" | "permission";
  message: string;
  field?: string;
  recoverable: boolean;
  retryAction?: () => void;
}

const errorHandling = {
  network: "Show retry button with exponential backoff",
  validation: "Highlight field with inline error message",
  authentication: "Redirect to login with return URL",
  permission: "Show upgrade prompt for anonymous users",
};
```

### Loading States

- **Page Load**: Skeleton screens for hero and sections
- **Section Switch**: Loading spinner in content area
- **Form Submit**: Button loading state with disabled form
- **Avatar Upload**: Progress indicator with preview
- **Data Export**: Progress modal with download link

## Security Considerations

### Data Protection

- **Profile Updates**: Validate all input server-side
- **Avatar Upload**: File type and size validation, virus scanning
- **Password Changes**: Require current password verification
- **OAuth Management**: Secure token handling and revocation
- **Data Export**: Rate limiting and audit logging

### Access Control

- **Anonymous Users**: Limited to session information and upgrade prompts
- **Authenticated Users**: Full profile access with proper authorization
- **Admin Users**: Additional account management capabilities (if applicable)

## Performance Optimizations

### Loading Strategies

```typescript
// Lazy load sections for better initial page load
const PersonalInfoSection = lazy(
  () => import("./sections/PersonalInfoSection")
);
const SecuritySection = lazy(() => import("./sections/SecuritySection"));
const DataSection = lazy(() => import("./sections/DataSection"));

// Optimistic updates for better UX
const useOptimisticProfile = (profile: UserProfile) => {
  // Implementation for immediate UI updates
};
```

### Caching Strategy

- **Profile Data**: Cache with 5-minute TTL
- **Avatar Images**: Long-term cache with versioning
- **Session Data**: Session storage for anonymous users
- **Form State**: Local storage for draft changes

## Supabase Integration Architecture

### Database Schema Integration

```typescript
// Current user_profiles table structure
interface SupabaseUserProfile {
  id: string; // UUID from auth.users
  username: string | null; // Unique, 3-30 chars, alphanumeric + underscore/hyphen
  full_name: string | null; // Single field for full name
  bio: string | null; // Max 500 characters
  website: string | null; // Must be valid URL with http/https
  location: string | null; // Optional location field
  avatar_url: string | null; // Path in Supabase storage bucket
  preferences: Record<string, any>; // JSONB field for user preferences
  created_at: string;
  updated_at: string;
}

// Current user_sessions table structure
interface SupabaseUserSession {
  id: string;
  user_id: string;
  session_data: Record<string, any>;
  ip_address: string;
  user_agent: string;
  device_info: Record<string, any>; // Device information
  location_info: Record<string, any>; // Location data
  last_activity: string; // Last activity timestamp
  created_at: string;
  expires_at: string;
}

// Combined UserProfile interface for frontend
interface UserProfile {
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
```

### Storage Integration

```typescript
// Avatar upload service
class AvatarService {
  private supabase = createClient();

  async uploadAvatar(userId: string, file: File): Promise<string> {
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}/avatar.${fileExt}`;

    const { data, error } = await this.supabase.storage
      .from("avatars")
      .upload(fileName, file, { upsert: true });

    if (error) throw error;

    // Update user profile with new avatar URL
    await this.updateAvatarUrl(userId, data.path);

    return this.getPublicUrl(data.path);
  }

  getPublicUrl(path: string): string {
    const { data } = this.supabase.storage.from("avatars").getPublicUrl(path);
    return data.publicUrl;
  }
}
```

### Authentication Service Integration

```typescript
// Enhanced auth service with proper sign-out
class AuthService {
  private supabase = createClient();

  async signOut(): Promise<void> {
    // Clear any local storage
    localStorage.clear();
    sessionStorage.clear();

    // Sign out from Supabase
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;

    // Redirect to home page
    window.location.href = "/";
  }

  async updateProfile(data: Partial<SupabaseUserProfile>): Promise<void> {
    const { error } = await this.supabase
      .from("user_profiles")
      .update(data)
      .eq("id", this.getCurrentUserId());

    if (error) throw error;
  }
}
```

## URL State Management

### Query Parameter Structure

```typescript
// URL state management for modal persistence
interface ModalState {
  tab?: "profile" | "network" | "preferences" | "api" | "export" | "about";
  section?: "info" | "personal" | "security" | "data"; // For profile tab
  editing?: boolean; // For edit mode state
}

// URL examples:
// /dashboard?tab=profile → Opens settings modal with profile tab
// /dashboard?tab=profile&section=personal → Opens profile tab, personal section
// /dashboard?tab=profile&section=personal&editing=true → Opens in edit mode
```

### URL State Hook

```typescript
const useModalState = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const modalState: ModalState = {
    tab: (searchParams.get("tab") as ModalState["tab"]) || undefined,
    section:
      (searchParams.get("section") as ModalState["section"]) || undefined,
    editing: searchParams.get("editing") === "true",
  };

  const updateModalState = (newState: Partial<ModalState>) => {
    const params = new URLSearchParams(searchParams);

    Object.entries(newState).forEach(([key, value]) => {
      if (value) {
        params.set(key, String(value));
      } else {
        params.delete(key);
      }
    });

    setSearchParams(params);
  };

  const clearModalState = () => {
    const params = new URLSearchParams(searchParams);
    ["tab", "section", "editing"].forEach((key) => params.delete(key));
    setSearchParams(params);
  };

  return { modalState, updateModalState, clearModalState };
};
```

## Animation Enhancements

### Smooth Expand/Collapse for Edit Mode

```typescript
// Enhanced animation variants for edit mode transitions
const editModeVariants = {
  collapsed: {
    height: 0,
    opacity: 0,
    transition: {
      height: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
      opacity: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
    },
  },
  expanded: {
    height: 'auto',
    opacity: 1,
    transition: {
      height: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
      opacity: { duration: 0.3, delay: 0.1, ease: [0.4, 0, 0.2, 1] },
    },
  },
};

// Usage in PersonalInfoSettings
<motion.div
  variants={editModeVariants}
  initial="collapsed"
  animate={isEditing ? "expanded" : "collapsed"}
  className="overflow-hidden"
>
  {/* Edit form fields */}
</motion.div>
```

## Accessibility Features

### WCAG 2.1 AA Compliance

1. **Semantic Structure**

   ```html
   <main role="main" aria-labelledby="profile-title">
     <h1 id="profile-title">Profile</h1>
     <nav role="tablist" aria-label="Profile sections">
       <button role="tab" aria-selected="true">Personal Info</button>
     </nav>
   </main>
   ```

2. **Keyboard Navigation**
   - Tab order: Hero → Section tabs → Section content
   - Arrow keys for tab navigation
   - Enter/Space for activation
   - Escape for modal/dropdown closing

3. **Screen Reader Support**
   - Announce section changes
   - Form validation messages
   - Loading state announcements
   - Error state descriptions

4. **Visual Accessibility**
   - High contrast mode support
   - Focus indicators on all interactive elements
   - Scalable text up to 200%
   - Color-blind friendly design

## Current Implementation Status

The profile management system has been fully implemented with the following key features:

### ✅ Completed Features

1. **Modular Component Architecture**
   - ProfileSettings main component with sub-section navigation
   - UserInfoSettings with comprehensive user display and anonymous user support
   - PersonalInfoSettings with inline editing and smooth animations
   - SecuritySettings for authentication management
   - DataSettings for data export and account management
   - AvatarUpload component with progress tracking

2. **Service Layer Implementation**
   - ProfileService with complete CRUD operations and validation
   - AvatarService with Supabase storage integration
   - OAuthService for provider management
   - Comprehensive error handling and user feedback

3. **Advanced UI/UX Features**
   - Smooth expand/collapse animations using Framer Motion
   - Real-time form validation with React Hook Form + Zod
   - Username availability checking with visual feedback
   - Loading states, progress indicators, and optimistic updates
   - Responsive design with mobile-first approach

4. **Supabase Integration**
   - Real data operations with user_profiles and user_sessions tables
   - Avatar upload and management with storage bucket
   - Data export functionality (JSON/CSV formats)
   - Account deletion with cascade operations

5. **Anonymous User Experience**
   - Session statistics and limitations display
   - Progress bars showing usage against limits
   - Create account CTA with benefits highlighting
   - Real-time session duration updates

### 🔧 Technical Implementation Details

- **File Structure**: Components in `src/components/modals/settings/profile/`, services in `src/lib/profile/`
- **State Management**: React hooks with form state management via React Hook Form
- **Validation**: Zod schemas with real-time validation and error feedback
- **Animations**: Framer Motion for smooth transitions and micro-interactions
- **Error Handling**: Comprehensive error boundaries and user-friendly error messages
- **Accessibility**: WCAG 2.1 AA compliance with proper ARIA labels and keyboard navigation

This implementation provides a production-ready profile management system that integrates seamlessly with the existing Arguschain architecture, Supabase database, and React/TypeScript stack.
