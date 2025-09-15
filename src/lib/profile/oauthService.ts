import { supabase } from "@/lib/auth/auth";

export type OAuthProvider = "google" | "github" | "discord";

export interface ConnectedProvider {
  provider: OAuthProvider;
  providerId: string;
  email?: string;
  connectedAt: string;
}

export class OAuthService {
  /**
   * Link an OAuth provider to the current user account
   */
  async linkProvider(provider: OAuthProvider): Promise<void> {
    try {
      const redirectTo = `${window.location.origin}/auth/callback?action=link`;

      const { data, error } = await supabase.auth.linkIdentity({
        provider,
        options: {
          redirectTo,
        },
      });

      if (error) {
        console.error(`Error linking ${provider}:`, error);
        throw new Error(`Failed to link ${provider}: ${error.message}`);
      }

      // The actual linking happens in the callback
      // We redirect the user to the OAuth provider
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error(`OAuth linking failed for ${provider}:`, error);
      throw error instanceof Error
        ? error
        : new Error(`Failed to link ${provider}`);
    }
  }

  /**
   * Unlink an OAuth provider from the current user account
   */
  async unlinkProvider(provider: OAuthProvider): Promise<void> {
    try {
      const { error } = await supabase.auth.unlinkIdentity({
        provider,
        id: "",
        user_id: "",
        identity_id: "",
      });

      if (error) {
        console.error(`Error unlinking ${provider}:`, error);
        throw new Error(`Failed to unlink ${provider}: ${error.message}`);
      }
    } catch (error) {
      console.error(`OAuth unlinking failed for ${provider}:`, error);
      throw error instanceof Error
        ? error
        : new Error(`Failed to unlink ${provider}`);
    }
  }

  /**
   * Get connected OAuth providers for the current user
   */
  async getConnectedProviders(): Promise<ConnectedProvider[]> {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.error("Error getting user:", error);
        throw new Error(`Failed to get user: ${error.message}`);
      }

      if (!user) {
        return [];
      }

      // Get identities from user metadata
      const identities = user.identities || [];

      return identities
        .filter((identity) =>
          ["google", "github", "discord"].includes(identity.provider)
        )
        .map((identity) => ({
          provider: identity.provider as OAuthProvider,
          providerId: identity.id,
          email: identity.identity_data?.email || user.email,
          connectedAt:
            identity.created_at || user.created_at || new Date().toISOString(),
        }));
    } catch (error) {
      console.error("Failed to get connected providers:", error);
      throw error instanceof Error
        ? error
        : new Error("Failed to get connected providers");
    }
  }

  /**
   * Check if a specific provider is connected
   */
  async isProviderConnected(provider: OAuthProvider): Promise<boolean> {
    try {
      const connectedProviders = await this.getConnectedProviders();
      return connectedProviders.some((p) => p.provider === provider);
    } catch (error) {
      console.error(`Failed to check if ${provider} is connected:`, error);
      return false;
    }
  }

  /**
   * Get the primary authentication method
   */
  async getPrimaryAuthMethod(): Promise<{
    type: "email" | "oauth";
    provider?: OAuthProvider;
  }> {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        return { type: "email" };
      }

      // Check if user signed up with OAuth
      const primaryIdentity = user.identities?.find(
        (identity) =>
          identity.provider !== "email" &&
          ["google", "github", "discord"].includes(identity.provider)
      );

      if (primaryIdentity) {
        return {
          type: "oauth",
          provider: primaryIdentity.provider as OAuthProvider,
        };
      }

      return { type: "email" };
    } catch (error) {
      console.error("Failed to get primary auth method:", error);
      return { type: "email" };
    }
  }

  /**
   * Handle OAuth callback after linking
   */
  async handleLinkCallback(): Promise<{
    success: boolean;
    provider?: OAuthProvider;
    error?: string;
  }> {
    try {
      // Get the current session to see if linking was successful
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        return { success: false, error: error.message };
      }

      if (!session) {
        return { success: false, error: "No active session found" };
      }

      // Check if a new identity was added
      const connectedProviders = await this.getConnectedProviders();

      return {
        success: true,
        provider: connectedProviders[connectedProviders.length - 1]?.provider,
      };
    } catch (error) {
      console.error("OAuth callback handling failed:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Callback handling failed",
      };
    }
  }

  /**
   * Validate OAuth provider
   */
  isValidProvider(provider: string): provider is OAuthProvider {
    return ["google", "github", "discord"].includes(provider);
  }

  /**
   * Get provider display name
   */
  getProviderDisplayName(provider: OAuthProvider): string {
    const names: Record<OAuthProvider, string> = {
      google: "Google",
      github: "GitHub",
      discord: "Discord",
    };
    return names[provider];
  }

  /**
   * Get provider icon component name
   */
  getProviderIconName(provider: OAuthProvider): string {
    const icons: Record<OAuthProvider, string> = {
      google: "GoogleIcon",
      github: "GitHubIcon",
      discord: "DiscordIcon",
    };
    return icons[provider];
  }

  /**
   * Check if user can unlink a provider (must have at least one auth method)
   */
  async canUnlinkProvider(
    provider: OAuthProvider
  ): Promise<{ canUnlink: boolean; reason?: string }> {
    try {
      const [connectedProviders, primaryAuth] = await Promise.all([
        this.getConnectedProviders(),
        this.getPrimaryAuthMethod(),
      ]);

      // Check if user has email auth
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const hasEmailAuth = user?.identities?.some(
        (identity) => identity.provider === "email"
      );

      // If this is the only auth method, can't unlink
      if (connectedProviders.length === 1 && !hasEmailAuth) {
        return {
          canUnlink: false,
          reason:
            "Cannot unlink the only authentication method. Please set up email authentication first.",
        };
      }

      // If this is the primary auth method and no email auth, can't unlink
      if (primaryAuth.provider === provider && !hasEmailAuth) {
        return {
          canUnlink: false,
          reason:
            "Cannot unlink primary authentication method. Please set up email authentication first.",
        };
      }

      return { canUnlink: true };
    } catch (error) {
      console.error("Failed to check if provider can be unlinked:", error);
      return {
        canUnlink: false,
        reason: "Unable to verify account security. Please try again.",
      };
    }
  }
}

// Export singleton instance
export const oauthService = new OAuthService();
