import { supabase } from "@/lib/auth/auth";
import type {
  ProfileFormData,
  UserProfile,
  ProfileError,
  UserPreferences,
} from "./types";

export interface SupabaseUserProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  bio: string | null;
  website: string | null;
  location: string | null;
  avatar_url: string | null;
  preferences: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface SupabaseUserSession {
  id: string;
  user_id: string;
  session_data: Record<string, any>;
  ip_address: string;
  user_agent: string;
  device_info: Record<string, any>;
  location_info: Record<string, any>;
  last_activity: string;
  created_at: string;
  expires_at: string;
}

export class ProfileService {
  /**
   * Convert database preferences to UserPreferences with defaults
   */
  private normalizePreferences(
    dbPreferences: Record<string, any> | null
  ): UserPreferences {
    const defaults: UserPreferences = {
      theme: "system",
      notifications: {
        browser: true,
        email: true,
        analysisComplete: true,
        errorAlerts: true,
      },
      accessibility: {
        fontSize: "medium",
        highContrast: false,
        reduceAnimations: false,
      },
      interface: {
        compactMode: false,
        showTooltips: true,
        autoSave: true,
      },
    };

    if (!dbPreferences) {
      return defaults;
    }

    return {
      theme: dbPreferences.theme || defaults.theme,
      notifications: {
        browser:
          dbPreferences.notifications?.browser ??
          defaults.notifications.browser,
        email:
          dbPreferences.notifications?.email ?? defaults.notifications.email,
        analysisComplete:
          dbPreferences.notifications?.analysisComplete ??
          defaults.notifications.analysisComplete,
        errorAlerts:
          dbPreferences.notifications?.errorAlerts ??
          defaults.notifications.errorAlerts,
      },
      accessibility: {
        fontSize:
          dbPreferences.accessibility?.fontSize ||
          defaults.accessibility.fontSize,
        highContrast:
          dbPreferences.accessibility?.highContrast ??
          defaults.accessibility.highContrast,
        reduceAnimations:
          dbPreferences.accessibility?.reduceAnimations ??
          defaults.accessibility.reduceAnimations,
      },
      interface: {
        compactMode:
          dbPreferences.interface?.compactMode ??
          defaults.interface.compactMode,
        showTooltips:
          dbPreferences.interface?.showTooltips ??
          defaults.interface.showTooltips,
        autoSave:
          dbPreferences.interface?.autoSave ?? defaults.interface.autoSave,
      },
    };
  }

  /**
   * Get user profile from Supabase
   */
  async getUserProfile(userId: string): Promise<SupabaseUserProfile | null> {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No profile found, return null
          return null;
        }
        console.error("Error fetching user profile:", error);
        throw new Error(`Failed to fetch profile: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error("Profile fetch failed:", error);
      throw error instanceof Error ? error : new Error("Profile fetch failed");
    }
  }

  /**
   * Create or update user profile
   */
  async upsertUserProfile(
    userId: string,
    profileData: Partial<SupabaseUserProfile>
  ): Promise<SupabaseUserProfile> {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .upsert({
          id: userId,
          ...profileData,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error("Error upserting user profile:", error);
        throw new Error(`Failed to update profile: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error("Profile upsert failed:", error);
      throw error instanceof Error ? error : new Error("Profile update failed");
    }
  }

  /**
   * Update profile with form data
   */
  async updateProfile(
    userId: string,
    formData: ProfileFormData
  ): Promise<SupabaseUserProfile> {
    const profileData: Partial<SupabaseUserProfile> = {
      full_name: formData.fullName,
      username: formData.username || null,
      bio: formData.bio || null,
      website: formData.website || null,
    };

    return this.upsertUserProfile(userId, profileData);
  }

  /**
   * Check if username is available
   */
  async isUsernameAvailable(
    username: string,
    excludeUserId?: string
  ): Promise<boolean> {
    try {
      let query = supabase
        .from("user_profiles")
        .select("id")
        .eq("username", username);

      if (excludeUserId) {
        query = query.neq("id", excludeUserId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error checking username availability:", error);
        throw new Error(`Failed to check username: ${error.message}`);
      }

      return data.length === 0;
    } catch (error) {
      console.error("Username check failed:", error);
      throw error instanceof Error ? error : new Error("Username check failed");
    }
  }

  /**
   * Get user sessions
   */
  async getUserSessions(userId: string): Promise<SupabaseUserSession[]> {
    try {
      const { data, error } = await supabase
        .from("user_sessions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching user sessions:", error);
        throw new Error(`Failed to fetch sessions: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error("Sessions fetch failed:", error);
      throw error instanceof Error ? error : new Error("Sessions fetch failed");
    }
  }

  /**
   * Create user session
   */
  async createUserSession(
    userId: string,
    sessionData: {
      session_data?: Record<string, any>;
      ip_address?: string;
      user_agent?: string;
      device_info?: Record<string, any>;
      location_info?: Record<string, any>;
      expires_at?: string;
    }
  ): Promise<SupabaseUserSession> {
    try {
      const { data, error } = await supabase
        .from("user_sessions")
        .insert({
          user_id: userId,
          session_data: sessionData.session_data || {},
          ip_address: sessionData.ip_address || "",
          user_agent: sessionData.user_agent || "",
          device_info: sessionData.device_info || {},
          location_info: sessionData.location_info || {},
          last_activity: new Date().toISOString(),
          expires_at:
            sessionData.expires_at ||
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating user session:", error);
        throw new Error(`Failed to create session: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error("Session creation failed:", error);
      throw error instanceof Error
        ? error
        : new Error("Session creation failed");
    }
  }

  /**
   * Update session activity
   */
  async updateSessionActivity(sessionId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from("user_sessions")
        .update({
          last_activity: new Date().toISOString(),
        })
        .eq("id", sessionId);

      if (error) {
        console.error("Error updating session activity:", error);
        throw new Error(`Failed to update session: ${error.message}`);
      }
    } catch (error) {
      console.error("Session update failed:", error);
      throw error instanceof Error ? error : new Error("Session update failed");
    }
  }

  /**
   * Delete user session
   */
  async deleteUserSession(sessionId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from("user_sessions")
        .delete()
        .eq("id", sessionId);

      if (error) {
        console.error("Error deleting user session:", error);
        throw new Error(`Failed to delete session: ${error.message}`);
      }
    } catch (error) {
      console.error("Session deletion failed:", error);
      throw error instanceof Error
        ? error
        : new Error("Session deletion failed");
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from("user_sessions")
        .delete()
        .lt("expires_at", new Date().toISOString())
        .select("id");

      if (error) {
        console.error("Error cleaning up expired sessions:", error);
        throw new Error(`Failed to cleanup sessions: ${error.message}`);
      }

      return data?.length || 0;
    } catch (error) {
      console.error("Session cleanup failed:", error);
      throw error instanceof Error
        ? error
        : new Error("Session cleanup failed");
    }
  }

  /**
   * Export user data
   */
  async exportUserData(
    userId: string,
    format: "json" | "csv" = "json"
  ): Promise<string> {
    try {
      // Get profile data
      const profile = await this.getUserProfile(userId);

      // Get sessions data
      const sessions = await this.getUserSessions(userId);

      // Get auth user data
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) {
        throw new Error(`Failed to get user data: ${userError.message}`);
      }

      const exportData = {
        profile,
        sessions,
        auth_user: {
          id: user?.id,
          email: user?.email,
          created_at: user?.created_at,
          updated_at: user?.updated_at,
          email_confirmed_at: user?.email_confirmed_at,
          last_sign_in_at: user?.last_sign_in_at,
          user_metadata: user?.user_metadata,
          app_metadata: user?.app_metadata,
        },
        exported_at: new Date().toISOString(),
      };

      if (format === "json") {
        return JSON.stringify(exportData, null, 2);
      } else {
        // Convert to CSV format
        const csvRows = [];
        csvRows.push("Type,Field,Value");

        // Profile data
        if (profile) {
          Object.entries(profile).forEach(([key, value]) => {
            csvRows.push(
              `Profile,${key},"${String(value).replace(/"/g, '""')}"`
            );
          });
        }

        // Sessions data
        sessions.forEach((session, index) => {
          Object.entries(session).forEach(([key, value]) => {
            csvRows.push(
              `Session ${index + 1},${key},"${String(value).replace(/"/g, '""')}"`
            );
          });
        });

        // Auth user data
        Object.entries(exportData.auth_user).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            csvRows.push(`Auth,${key},"${String(value).replace(/"/g, '""')}"`);
          }
        });

        return csvRows.join("\n");
      }
    } catch (error) {
      console.error("Data export failed:", error);
      throw error instanceof Error ? error : new Error("Data export failed");
    }
  }

  /**
   * Delete user account and all associated data
   */
  async deleteUserAccount(userId: string): Promise<void> {
    try {
      // Delete user sessions
      await supabase.from("user_sessions").delete().eq("user_id", userId);

      // Delete user profile
      await supabase.from("user_profiles").delete().eq("id", userId);

      // Delete avatar from storage if exists
      const { data: files } = await supabase.storage
        .from("avatars")
        .list(userId);

      if (files && files.length > 0) {
        const filePaths = files.map((file) => `${userId}/${file.name}`);
        await supabase.storage.from("avatars").remove(filePaths);
      }

      // Delete auth user (this should be done last)
      const { error: deleteError } =
        await supabase.auth.admin.deleteUser(userId);
      if (deleteError) {
        console.error("Error deleting auth user:", deleteError);
        throw new Error(`Failed to delete user: ${deleteError.message}`);
      }
    } catch (error) {
      console.error("Account deletion failed:", error);
      throw error instanceof Error
        ? error
        : new Error("Account deletion failed");
    }
  }

  /**
   * Get user profile with auth data combined
   */
  async getCompleteUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const [
        profile,
        {
          data: { user },
        },
      ] = await Promise.all([
        this.getUserProfile(userId),
        supabase.auth.getUser(),
      ]);

      if (!user) {
        return null;
      }

      return {
        id: user.id,
        email: user.email || "",
        fullName: profile?.full_name || user.user_metadata?.full_name || "",
        username: profile?.username || user.user_metadata?.username || "",
        bio: profile?.bio || "",
        website: profile?.website || "",
        avatar: profile?.avatar_url || user.user_metadata?.avatar_url || "",
        createdAt: user.created_at || new Date().toISOString(),
        lastLoginAt: user.last_sign_in_at || new Date().toISOString(),
        authMethod: {
          type: user.app_metadata?.provider ? "oauth" : "email",
          provider: user.app_metadata?.provider as any,
          providerId: user.app_metadata?.provider_id,
        },
        isEmailVerified: !!user.email_confirmed_at,
        preferences: this.normalizePreferences(profile?.preferences),
        connectedProviders:
          user.app_metadata?.providers?.map((provider: string) => ({
            provider: provider as any,
            providerId: user.app_metadata?.provider_id || "",
            email: user.email || "",
            connectedAt: user.created_at || new Date().toISOString(),
          })) || [],
        usage: {
          analysisCount: 0, // TODO: Implement usage tracking
          savedQueries: 0,
          storageUsed: 0,
          storageLimit: 1024 * 1024 * 1024, // 1GB
        },
      };
    } catch (error) {
      console.error("Complete profile fetch failed:", error);
      throw error instanceof Error ? error : new Error("Profile fetch failed");
    }
  }

  /**
   * Validate profile data before saving
   */
  validateProfileData(data: ProfileFormData): ProfileError[] {
    const errors: ProfileError[] = [];

    // Full name validation
    if (!data.fullName || data.fullName.trim().length < 2) {
      errors.push({
        type: "validation",
        message: "Full name must be at least 2 characters long",
        field: "fullName",
        recoverable: true,
      });
    }

    if (data.fullName && data.fullName.length > 100) {
      errors.push({
        type: "validation",
        message: "Full name must be less than 100 characters",
        field: "fullName",
        recoverable: true,
      });
    }

    // Username validation
    if (data.username) {
      if (data.username.length < 3 || data.username.length > 30) {
        errors.push({
          type: "validation",
          message: "Username must be between 3 and 30 characters",
          field: "username",
          recoverable: true,
        });
      }

      if (!/^[a-zA-Z0-9_-]+$/.test(data.username)) {
        errors.push({
          type: "validation",
          message:
            "Username can only contain letters, numbers, underscores, and hyphens",
          field: "username",
          recoverable: true,
        });
      }
    }

    // Bio validation
    if (data.bio && data.bio.length > 500) {
      errors.push({
        type: "validation",
        message: "Bio must be less than 500 characters",
        field: "bio",
        recoverable: true,
      });
    }

    // Website validation
    if (data.website) {
      try {
        new URL(data.website);
        if (!/^https?:\/\//.test(data.website)) {
          errors.push({
            type: "validation",
            message: "Website must start with http:// or https://",
            field: "website",
            recoverable: true,
          });
        }
      } catch {
        errors.push({
          type: "validation",
          message: "Please enter a valid website URL",
          field: "website",
          recoverable: true,
        });
      }
    }

    // Email validation
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push({
        type: "validation",
        message: "Please enter a valid email address",
        field: "email",
        recoverable: true,
      });
    }

    return errors;
  }
}

// Export singleton instance
export const profileService = new ProfileService();
