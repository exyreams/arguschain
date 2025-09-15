import { supabase } from "./auth";

export interface AnonymousSession {
  id: string;
  anonymous_session_id: string;
  query_count: number;
  last_query_at: string | null;
  created_at: string;
  expires_at: string | null;
  session_type: "anonymous" | "authenticated";
  device_info: any;
}

export interface QueryLimitResult {
  isExceeded: boolean;
  currentCount: number;
  limit: number;
  remainingQueries: number;
}

export class AnonymousUserService {
  private static readonly QUERY_LIMIT = 5;
  private static readonly SESSION_DURATION_HOURS = 24;

  // Generate a unique session ID for anonymous users with device fingerprinting
  static generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 15);

    // Add simple device fingerprinting for better session persistence
    const deviceInfo = this.getDeviceFingerprint();
    const deviceHash = this.simpleHash(JSON.stringify(deviceInfo)).toString(36);

    return `anon_${timestamp}_${randomStr}_${deviceHash}`;
  }

  // Get device fingerprint for session persistence
  private static getDeviceFingerprint() {
    if (typeof window === "undefined") return {};

    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      cookieEnabled: navigator.cookieEnabled,
    };
  }

  // Simple hash function for device fingerprinting
  private static simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Get session ID from localStorage or create new one with persistence
  static getOrCreateSessionId(): string {
    if (typeof window === "undefined") return this.generateSessionId();

    let sessionId = localStorage.getItem("arguschain_anonymous_session_id");

    // Check if session exists and is still valid
    if (sessionId) {
      const sessionCreated = localStorage.getItem("arguschain_session_created");
      if (sessionCreated) {
        const createdTime = new Date(sessionCreated);
        const now = new Date();
        const hoursDiff =
          (now.getTime() - createdTime.getTime()) / (1000 * 60 * 60);

        // If session is older than 24 hours, create new one
        if (hoursDiff > this.SESSION_DURATION_HOURS) {
          sessionId = null;
        }
      }
    }

    if (!sessionId) {
      sessionId = this.generateSessionId();
      localStorage.setItem("arguschain_anonymous_session_id", sessionId);
      localStorage.setItem(
        "arguschain_session_created",
        new Date().toISOString()
      );
    }

    return sessionId;
  }

  // Check if anonymous user has exceeded query limit
  static async checkQueryLimit(sessionId?: string): Promise<QueryLimitResult> {
    const currentSessionId = sessionId || this.getOrCreateSessionId();

    try {
      // First try to get current count directly from user_sessions table
      const { data: sessionData, error: sessionError } = await supabase
        .from("user_sessions")
        .select("query_count")
        .eq("anonymous_session_id", currentSessionId)
        .eq("session_type", "anonymous")
        .maybeSingle();

      if (sessionError) {
        console.error("Error fetching session data:", sessionError);
        // Return safe defaults on error
        return {
          isExceeded: false,
          currentCount: 0,
          limit: this.QUERY_LIMIT,
          remainingQueries: this.QUERY_LIMIT,
        };
      }

      const currentCount = sessionData?.query_count || 0;
      const isExceeded = currentCount >= this.QUERY_LIMIT;

      return {
        isExceeded,
        currentCount,
        limit: this.QUERY_LIMIT,
        remainingQueries: Math.max(0, this.QUERY_LIMIT - currentCount),
      };
    } catch (error) {
      console.error("Error in checkQueryLimit:", error);
      return {
        isExceeded: false,
        currentCount: 0,
        limit: this.QUERY_LIMIT,
        remainingQueries: this.QUERY_LIMIT,
      };
    }
  }

  // Increment query count for anonymous user
  static async incrementQueryCount(
    queryType: string,
    queryParams: any,
    executionTimeMs?: number,
    resultCount?: number,
    success: boolean = true,
    errorMessage?: string,
    sessionId?: string
  ): Promise<number> {
    const currentSessionId = sessionId || this.getOrCreateSessionId();
    const deviceInfo = this.getDeviceFingerprint();

    try {
      // First, ensure session exists or create it
      const { data: existingSession } = await supabase
        .from("user_sessions")
        .select("id, query_count")
        .eq("anonymous_session_id", currentSessionId)
        .eq("session_type", "anonymous")
        .maybeSingle();

      let sessionId: string;
      let newCount: number;

      if (existingSession) {
        // Update existing session
        const { data: updatedSession, error: updateError } = await supabase
          .from("user_sessions")
          .update({
            query_count: (existingSession.query_count || 0) + 1,
            last_query_at: new Date().toISOString(),
            last_activity: new Date().toISOString(),
          })
          .eq("id", existingSession.id)
          .select("query_count")
          .single();

        if (updateError) {
          console.error("Error updating session:", updateError);
          return 0;
        }

        sessionId = existingSession.id;
        newCount = updatedSession.query_count;
      } else {
        // Create new session
        const { data: newSession, error: createError } = await supabase
          .from("user_sessions")
          .insert({
            anonymous_session_id: currentSessionId,
            session_type: "anonymous",
            query_count: 1,
            last_query_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            last_activity: new Date().toISOString(),
            expires_at: new Date(
              Date.now() + 24 * 60 * 60 * 1000
            ).toISOString(), // 24 hours
            user_agent:
              typeof window !== "undefined" ? navigator.userAgent : null,
            device_info: deviceInfo,
          })
          .select("id, query_count")
          .single();

        if (createError) {
          console.error("Error creating session:", createError);
          return 0;
        }

        sessionId = newSession.id;
        newCount = newSession.query_count;
      }

      // Insert query history record
      await supabase.from("query_history").insert({
        session_id: sessionId,
        anonymous_session_id: currentSessionId,
        query_type: queryType,
        query_params: queryParams,
        execution_time_ms: executionTimeMs,
        result_count: resultCount,
        success: success,
        error_message: errorMessage,
      });

      return newCount;
    } catch (error) {
      console.error("Error in incrementQueryCount:", error);
      return 0;
    }
  }

  // Get anonymous session info
  static async getSessionInfo(
    sessionId?: string
  ): Promise<AnonymousSession | null> {
    const currentSessionId = sessionId || this.getOrCreateSessionId();

    try {
      const { data, error } = await supabase
        .from("user_sessions")
        .select("*")
        .eq("anonymous_session_id", currentSessionId)
        .eq("session_type", "anonymous")
        .single();

      if (error || !data) {
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error getting session info:", error);
      return null;
    }
  }

  // Upgrade anonymous session to authenticated when user signs in
  static async upgradeToAuthenticated(
    userId: string,
    sessionId?: string
  ): Promise<boolean> {
    const currentSessionId = sessionId || this.getOrCreateSessionId();

    try {
      const { data, error } = await supabase.rpc(
        "upgrade_anonymous_session_to_authenticated",
        {
          p_anonymous_session_id: currentSessionId,
          p_user_id: userId,
        }
      );

      if (error) {
        console.error("Error upgrading session:", error);
        return false;
      }

      // Clear anonymous session from localStorage since it's now authenticated
      if (typeof window !== "undefined") {
        localStorage.removeItem("arguschain_anonymous_session_id");
        localStorage.removeItem("arguschain_session_created");
      }

      return data === true;
    } catch (error) {
      console.error("Error in upgradeToAuthenticated:", error);
      return false;
    }
  }

  // Clear session (for testing or reset)
  static clearSession(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("arguschain_anonymous_session_id");
      localStorage.removeItem("arguschain_session_created");
    }
  }

  // Get user-friendly limit message
  static getLimitMessage(limitResult: QueryLimitResult): string {
    if (limitResult.isExceeded) {
      return `You've reached your limit of ${limitResult.limit} free analyses. Sign in to continue with unlimited access and save your queries permanently.`;
    }

    if (limitResult.remainingQueries <= 1) {
      return `You have ${limitResult.remainingQueries} analysis remaining. Sign in for unlimited access and bookmark features.`;
    }

    return `You have ${limitResult.remainingQueries} analyses remaining out of ${limitResult.limit} free trials.`;
  }

  // Check if user is anonymous
  static async isAnonymousUser(): Promise<boolean> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return !user || user.is_anonymous === true;
    } catch {
      return true;
    }
  }

  // Get professional upgrade benefits message
  static getUpgradeBenefits(): string[] {
    return [
      "Unlimited blockchain analyses",
      "Save and organize query bookmarks",
      "Export results in multiple formats",
      "Access to advanced analytics features",
      "Query history and session management",
      "Priority support and updates",
    ];
  }
}

export default AnonymousUserService;
