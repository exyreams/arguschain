export interface SigninPreferences {
  rememberEmail: boolean;
  lastEmail?: string;
  lastSigninMethod?: "email" | "google" | "github" | "discord";
}

const PREFERENCES_KEY = "arguschain_signin_preferences";
const ALLOWED_ORIGINS = [
  window.location.origin,
  "http://localhost:5173",
  "https://arguschain.app",
];

export function validateRedirectUrl(url: string): boolean {
  try {
    const redirectUrl = new URL(url, window.location.origin);

    if (redirectUrl.origin === window.location.origin) {
      return true;
    }

    return ALLOWED_ORIGINS.includes(redirectUrl.origin);
  } catch {
    return false;
  }
}

export function getSafeRedirectUrl(url?: string | null): string {
  if (!url) return "/";

  if (validateRedirectUrl(url)) {
    return url;
  }

  return "/";
}

export function loadSigninPreferences(): SigninPreferences {
  try {
    const stored = localStorage.getItem(PREFERENCES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        rememberEmail: Boolean(parsed.rememberEmail),
        lastEmail: parsed.rememberEmail ? parsed.lastEmail : undefined,
        lastSigninMethod: parsed.lastSigninMethod || undefined,
      };
    }
  } catch (error) {
    console.warn("Failed to load signin preferences:", error);
  }

  return {
    rememberEmail: false,
  };
}

export function saveSigninPreferences(preferences: SigninPreferences): void {
  try {
    const toStore = {
      rememberEmail: preferences.rememberEmail,
      lastEmail: preferences.rememberEmail ? preferences.lastEmail : undefined,
      lastSigninMethod: preferences.lastSigninMethod,
    };

    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(toStore));
  } catch (error) {
    console.warn("Failed to save signin preferences:", error);
  }
}

export function updateLastSigninMethod(
  method: SigninPreferences["lastSigninMethod"],
): void {
  const preferences = loadSigninPreferences();
  preferences.lastSigninMethod = method;
  saveSigninPreferences(preferences);
}

export function updateEmailPreference(email: string, remember: boolean): void {
  const preferences = loadSigninPreferences();
  preferences.rememberEmail = remember;
  preferences.lastEmail = remember ? email : undefined;
  saveSigninPreferences(preferences);
}

export function clearSigninPreferences(): void {
  try {
    localStorage.removeItem(PREFERENCES_KEY);
  } catch (error) {
    console.warn("Failed to clear signin preferences:", error);
  }
}
