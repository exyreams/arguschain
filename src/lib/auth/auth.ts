import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase configuration. Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
});

export const auth = {
  signUp: async (email: string, password: string, options?: { data?: any }) => {
    return await supabase.auth.signUp({
      email,
      password,
      options,
    });
  },

  signIn: async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({
      email,
      password,
    });
  },

  signInWithOAuth: async (provider: "github" | "google" | "discord") => {
    const redirectTo = `${window.location.origin}/auth/callback`;

    console.log(`Attempting OAuth with provider: ${provider}`);
    console.log(`Redirect URL: ${redirectTo}`);

    try {
      const result = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
        },
      });

      console.log("OAuth result:", result);
      return result;
    } catch (error) {
      console.error(`OAuth error for ${provider}:`, error);
      throw error;
    }
  },

  signInAnonymously: async () => {
    console.log("Attempting anonymous sign-in...");

    try {
      const result = await supabase.auth.signInAnonymously();

      console.log("Anonymous sign-in result:", result);
      return result;
    } catch (error) {
      console.error("Anonymous sign-in error:", error);
      throw error;
    }
  },

  signOut: async () => {
    return await supabase.auth.signOut();
  },

  getSession: async () => {
    return await supabase.auth.getSession();
  },

  getUser: async () => {
    return await supabase.auth.getUser();
  },

  // Reset password
  resetPassword: async (email: string) => {
    const redirectTo = `${window.location.origin}/auth/reset-password`;

    return await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
  },

  // Update password
  updatePassword: async (password: string) => {
    return await supabase.auth.updateUser({ password });
  },

  // Update user metadata
  updateUser: async (attributes: {
    email?: string;
    password?: string;
    data?: Record<string, any>;
  }) => {
    return await supabase.auth.updateUser(attributes);
  },

  // Update user profile in custom table
  updateProfile: async (updates: {
    username?: string;
    full_name?: string;
    bio?: string;
    website?: string;
    location?: string;
    avatar_url?: string;
    preferences?: Record<string, any>;
  }) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    return await supabase
      .from("user_profiles")
      .upsert({ id: user.id, ...updates })
      .select()
      .single();
  },

  // Get user profile
  getProfile: async (userId?: string) => {
    const targetUserId =
      userId || (await supabase.auth.getUser()).data.user?.id;
    if (!targetUserId) throw new Error("User ID required");

    return await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", targetUserId)
      .single();
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  },

  verifyOtp: async (params: {
    email: string;
    token: string;
    type: "signup" | "recovery" | "email_change";
  }) => {
    return await supabase.auth.verifyOtp(params);
  },

  resend: async (email: string, type: "signup" | "email_change") => {
    return await supabase.auth.resend({
      type,
      email,
    });
  },
};

export type User = {
  id: string;
  email?: string;
  is_anonymous?: boolean;
  user_metadata?: {
    name?: string;
    avatar_url?: string;
    full_name?: string;
    [key: string]: any;
  };
  app_metadata?: {
    provider?: string;
    providers?: string[];
    [key: string]: any;
  };
  created_at?: string;
  updated_at?: string;
  email_confirmed_at?: string;
  last_sign_in_at?: string;
};

export type Session = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  token_type: string;
  user: User;
};

export type AuthError = {
  message: string;
  status?: number;
};

export const AUTH_CONFIG = {
  redirectUrls: {
    signIn: "/",
    signUp: "/welcome",
    resetPassword: "/auth/reset-password",
    callback: "/auth/callback",
  },
  session: {
    persistSession: true,
    autoRefreshToken: true,
  },
  providers: ["github", "google", "discord"] as const,
} as const;
