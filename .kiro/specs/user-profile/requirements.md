# Requirements Document

## Introduction

The Profile Settings feature provides users with a comprehensive profile management system integrated within the application's settings modal. This modal-based approach offers organized profile management through tabbed sections, supporting both authenticated users with full profiles and anonymous users with session information. The system integrates seamlessly with the navigation through a user dropdown menu and provides a centralized location for all profile-related functionality.

The feature includes enhanced profile fields (fullName, username, bio, website), avatar management with Supabase storage integration, real-time form validation, smooth animations, and comprehensive error handling. The implementation uses a modular component architecture with dedicated services for profile management, avatar handling, and OAuth integration.

## Requirements

### Requirement 1: Navigation Integration and Settings Modal Access with URL State

**User Story:** As a user, I want to access my profile settings through a dropdown menu in the navigation bar with URL-based state persistence, so that I can easily open the settings modal, manage my profile without disrupting my workflow, and refresh the page while maintaining modal state.

#### Acceptance Criteria

1. WHEN a user is authenticated THEN the navigation bar SHALL display a user dropdown trigger with their avatar or initials
2. WHEN a user is anonymous THEN the navigation bar SHALL display a guest indicator with dropdown access
3. WHEN the user clicks the dropdown trigger THEN the system SHALL open a dropdown menu with profile and account options
4. WHEN the dropdown is open THEN the system SHALL display "Profile" option that opens the settings modal with profile tab active and updates URL to `?tab=profile`
5. WHEN the dropdown is open THEN the system SHALL display "Settings" option that opens the settings modal with preferences tab active and updates URL to `?tab=preferences`
6. WHEN the dropdown is open THEN the system SHALL display "Sign Out" option for authenticated users that properly signs out the user
7. WHEN the dropdown is open THEN the system SHALL display "Create Account" option for anonymous users
8. WHEN clicking outside the dropdown THEN the system SHALL close the dropdown menu
9. WHEN using keyboard navigation THEN the system SHALL support arrow keys and Enter/Space for dropdown interaction
10. WHEN the page loads with query parameters THEN the system SHALL automatically open the appropriate modal and tab based on URL state
11. WHEN the modal is closed THEN the system SHALL remove query parameters from the URL

### Requirement 1.1: Persistent User Info Header in Settings Modal

**User Story:** As a user, I want to see my profile information prominently displayed at the top of the settings modal, so that I can always see my current account status and user details regardless of which settings tab I'm viewing.

#### Acceptance Criteria

1. WHEN opening the settings modal THEN the system SHALL display a persistent user info header at the top above all tabs
2. WHEN the user is authenticated THEN the header SHALL show their avatar, display name, email, and account status
3. WHEN the user is anonymous THEN the header SHALL show a guest avatar, session ID, session duration, and upgrade prompt
4. WHEN viewing any settings tab THEN the user info header SHALL remain visible and accessible
5. WHEN the user info header is displayed THEN it SHALL include quick action buttons (Edit Profile, Create Account, etc.)
6. WHEN the header shows account status THEN it SHALL display verification badges and connected account indicators
7. WHEN switching between tabs THEN the user info header SHALL persist without refreshing or disappearing

### Requirement 2: Settings Modal Layout and Profile Tab Structure

**User Story:** As a user, I want a dedicated profile tab within the settings modal with clear sections and navigation, so that I can easily view and manage all aspects of my profile in an organized manner.

#### Acceptance Criteria

1. WHEN opening the settings modal THEN the system SHALL display a modal layout with tabbed navigation including a Profile tab
2. WHEN the Profile tab is active THEN the system SHALL display a "Profile Management" title with descriptive text
3. WHEN viewing the profile tab THEN the system SHALL organize content into logical sub-sections (Info, Personal, Security, Data)
4. WHEN the modal renders THEN the system SHALL use responsive design that works on mobile, tablet, and desktop
5. WHEN switching to the profile tab THEN the system SHALL maintain modal state and display profile content
6. WHEN the profile tab loads THEN the system SHALL display loading states while fetching user data
7. WHEN errors occur THEN the system SHALL display user-friendly error messages with recovery options

### Requirement 3: Enhanced Profile Information Display and Management

**User Story:** As an authenticated user, I want to view and edit my comprehensive profile information including username, bio, and website within the settings modal, so that I can manage my complete account details with clear organization and easy access.

#### Acceptance Criteria

1. WHEN an authenticated user opens the profile tab THEN the system SHALL display their current profile information in the Info sub-section with comprehensive account details
2. WHEN viewing profile info THEN the system SHALL show full name, username, email address, bio, website, and profile avatar with upload capability
3. WHEN profile data is displayed THEN the system SHALL show account creation date, last login information, authentication method, and connected OAuth providers with icons
4. WHEN the user has an avatar THEN the system SHALL display it with hover effects and click-to-upload functionality using AvatarUpload component and Supabase storage
5. WHEN the user wants to edit personal info THEN the system SHALL provide the Personal sub-section with smooth expand/collapse animation using Framer Motion
6. WHEN editing profile fields THEN the system SHALL include fullName (required, 2-100 chars), username (optional, unique, 3-30 chars), bio (optional, max 500 chars), and website (optional, URL format) fields
7. WHEN editing profile fields THEN the system SHALL validate input using React Hook Form + Zod with real-time validation and username availability checking
8. WHEN saving changes THEN the system SHALL display success confirmation, update the display immediately, and use optimistic updates for better UX
9. WHEN validation fails THEN the system SHALL highlight errors with field-specific messages and provide clear correction guidance
10. WHEN uploading avatar THEN the system SHALL use AvatarService with Supabase storage, proper file validation (5MB limit, image types), and progress indicators

### Requirement 4: Anonymous User Experience and Upgrade Path

**User Story:** As an anonymous user, I want to see my session information and upgrade options in the profile settings, so that I understand my current limitations and can easily create a permanent account.

#### Acceptance Criteria

1. WHEN an anonymous user opens the profile tab THEN the system SHALL display their session information with session ID, start time, and duration
2. WHEN showing anonymous profile THEN the system SHALL display session statistics including analysis count, saved queries, and session time with visual cards
3. WHEN viewing the Info section THEN the system SHALL prominently display "Create Account" button with compelling messaging and benefits
4. WHEN upgrade options are shown THEN the system SHALL highlight current limitations with progress bars showing usage against limits (analysis history, saved queries)
5. WHEN the user wants to upgrade THEN the system SHALL provide "Create Account" button that redirects to /auth/signup
6. WHEN displaying limitations THEN the system SHALL show disabled features (data export, save settings) with clear explanations
7. WHEN session data is shown THEN the system SHALL display it with real-time updates, formatted durations, and user-friendly explanations

### Requirement 5: Account Security and Authentication Management

**User Story:** As an authenticated user, I want to manage my account security settings in the profile Security sub-section, so that I can control my authentication methods and account security in one place.

#### Acceptance Criteria

1. WHEN viewing the Security sub-section THEN the system SHALL display current authentication method and security overview
2. WHEN security settings are shown THEN the system SHALL display OAuth provider management with Google, GitHub, and Discord options
3. WHEN managing authentication THEN the system SHALL show connection status for each provider with connect/disconnect buttons
4. WHEN the user has email authentication THEN the system SHALL provide password change functionality with proper validation
5. WHEN security actions are performed THEN the system SHALL display loading states and provide user feedback
6. WHEN changes are made THEN the system SHALL display success messages and update the UI immediately
7. WHEN displaying security info THEN the system SHALL show current authentication method, connected providers with icons, and security recommendations

### Requirement 5.1: Enhanced Account Linking in Settings Modal

**User Story:** As an authenticated user, I want to easily see and manage my connected accounts from a prominent location in the settings modal, so that I can quickly link or unlink OAuth providers without navigating through multiple tabs.

#### Acceptance Criteria

1. WHEN viewing the user info header THEN the system SHALL display connected account indicators with provider icons
2. WHEN connected accounts are shown THEN the system SHALL provide quick access to link/unlink additional providers
3. WHEN clicking on account linking options THEN the system SHALL show available OAuth providers (Google, GitHub, Discord)
4. WHEN linking a new provider THEN the system SHALL initiate OAuth flow and update the header immediately
5. WHEN unlinking a provider THEN the system SHALL require confirmation and update the display
6. WHEN account linking actions are performed THEN the system SHALL show success/error feedback
7. WHEN multiple providers are connected THEN the system SHALL show all connected accounts with connection dates

### Requirement 6: Data Export and Account Management

**User Story:** As a user, I want to export my data and manage my account from the profile Data sub-section, so that I have control over my information and account lifecycle.

#### Acceptance Criteria

1. WHEN viewing the Data sub-section THEN the system SHALL provide comprehensive data export options with format selection
2. WHEN exporting data THEN the system SHALL support JSON and CSV formats using ProfileService.exportUserData with real user data
3. WHEN account management options are shown THEN the system SHALL provide account deletion functionality in a clearly marked danger zone
4. WHEN requesting account deletion THEN the system SHALL require multi-step confirmation with data retention policy explanations
5. WHEN data operations are performed THEN the system SHALL provide progress indicators, loading states, and completion confirmations
6. WHEN export is complete THEN the system SHALL provide download functionality with success feedback and file generation
7. WHEN managing account data THEN the system SHALL use ProfileService.deleteUserAccount with proper cascade deletion across all related data

### Requirement 7: Responsive Design and Accessibility

**User Story:** As a user on any device or using assistive technology, I want the profile settings modal to be fully accessible and properly formatted, so that I can manage my profile regardless of my device or accessibility needs.

#### Acceptance Criteria

1. WHEN accessing the modal on mobile devices THEN the system SHALL display in a mobile-optimized layout with proper touch targets
2. WHEN viewed on different screen sizes THEN the system SHALL maintain proper content organization and readability within the modal constraints
3. WHEN using screen readers THEN the system SHALL provide appropriate ARIA labels and semantic structure for modal navigation
4. WHEN navigating with keyboard only THEN the system SHALL support full keyboard navigation through all profile sub-sections and forms
5. WHEN interactive elements are present THEN the system SHALL ensure proper focus indicators and tab order within the modal
6. WHEN forms are displayed THEN the system SHALL provide clear labels and error messaging for accessibility with proper announcements
7. WHEN content updates THEN the system SHALL announce changes to assistive technology appropriately without disrupting modal focus

### Requirement 8: Performance and User Experience

**User Story:** As a user, I want the profile settings to load quickly and respond smoothly to my interactions, so that I can efficiently manage my profile without delays or frustrations.

#### Acceptance Criteria

1. WHEN opening the settings modal with profile tab THEN the system SHALL load the initial view within 2 seconds
2. WHEN data is loading THEN the system SHALL display skeleton screens or loading indicators with smooth animations
3. WHEN performing actions THEN the system SHALL provide immediate feedback and progress indicators with success/error messages
4. WHEN saving changes THEN the system SHALL use optimistic updates where appropriate and display loading states on buttons
5. WHEN errors occur THEN the system SHALL provide retry mechanisms and graceful error recovery with user-friendly messages
6. WHEN the modal is used THEN the system SHALL cache appropriate data to improve subsequent visits and tab switches
7. WHEN multiple operations are performed THEN the system SHALL handle concurrent requests properly and prevent duplicate submissions

### Requirement 9: Supabase Integration and Authentication

**User Story:** As a user, I want the profile system to work seamlessly with Supabase backend services, so that my data is properly stored, synchronized, and my authentication actions work correctly.

#### Acceptance Criteria

1. WHEN the user clicks "Sign Out" from the dropdown THEN the system SHALL properly sign out using Supabase auth and redirect appropriately
2. WHEN profile data is loaded THEN the system SHALL fetch real data using ProfileService.getUserProfile and ProfileService.getCompleteUserProfile
3. WHEN profile data is updated THEN the system SHALL save changes using ProfileService.updateProfile with proper validation and error handling
4. WHEN avatar is uploaded THEN the system SHALL use AvatarService with Supabase storage bucket and update avatar_url in user_profiles table
5. WHEN user sessions are tracked THEN the system SHALL utilize ProfileService session management methods for user_sessions table
6. WHEN OAuth accounts are managed THEN the system SHALL display real connected providers from user.app_metadata.providers
7. WHEN data export is requested THEN the system SHALL use ProfileService.exportUserData to export real user data from Supabase tables
8. WHEN account deletion is performed THEN the system SHALL use ProfileService.deleteUserAccount with proper cascade deletion across all related tables and storage

### Requirement 10: URL State Management and Modal Persistence

**User Story:** As a user, I want the modal state to be preserved in the URL, so that I can refresh the page or share links that open specific modal tabs and sections.

#### Acceptance Criteria

1. WHEN opening settings modal with profile tab THEN the URL SHALL update to include `?tab=profile` query parameter
2. WHEN switching to profile sub-sections THEN the URL SHALL update to include section parameter like `?tab=profile&section=personal`
3. WHEN the page is refreshed with modal query parameters THEN the system SHALL automatically open the appropriate modal and tab
4. WHEN the modal is closed THEN the system SHALL remove query parameters from the URL
5. WHEN navigating with browser back/forward buttons THEN the system SHALL properly handle modal state changes
6. WHEN sharing a URL with modal parameters THEN other users SHALL see the same modal state when visiting the link
7. WHEN invalid query parameters are present THEN the system SHALL gracefully handle them and show default state
