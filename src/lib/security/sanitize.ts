/**
 * Security utilities to prevent sensitive data from being stored in bookmarks
 */

// List of sensitive field names that should never be stored
const SENSITIVE_FIELDS = [
  "rpc_url",
  "api_key",
  "apikey",
  "key",
  "token",
  "secret",
  "password",
  "auth",
  "authorization",
  "bearer",
  "credentials",
];

/**
 * Sanitizes a query config object by removing any fields that might contain sensitive data
 * @param queryConfig - The query configuration object to sanitize
 * @returns A sanitized copy of the query config with sensitive fields removed
 */
export function sanitizeQueryConfig(
  queryConfig: Record<string, any>
): Record<string, any> {
  const sanitized = { ...queryConfig };

  // Remove any fields that might contain sensitive data
  SENSITIVE_FIELDS.forEach((field) => {
    if (field in sanitized) {
      delete sanitized[field];
      console.warn(
        `Removed sensitive field '${field}' from query config before saving bookmark`
      );
    }
  });

  // Also check for URLs that might contain API keys
  Object.keys(sanitized).forEach((key) => {
    const value = sanitized[key];
    if (typeof value === "string" && value.includes("key=")) {
      console.warn(
        `Potential API key detected in field '${key}', removing from bookmark`
      );
      delete sanitized[key];
    }
  });

  return sanitized;
}

/**
 * Validates that a query config doesn't contain sensitive data
 * @param queryConfig - The query configuration to validate
 * @throws Error if sensitive data is detected
 */
export function validateQueryConfigSecurity(
  queryConfig: Record<string, any>
): void {
  const configString = JSON.stringify(queryConfig).toLowerCase();

  // Check for common patterns that indicate API keys or sensitive data
  const sensitivePatterns = [
    /key\s*=\s*[a-zA-Z0-9]/,
    /api[_-]?key/,
    /token\s*[:=]/,
    /secret\s*[:=]/,
    /password\s*[:=]/,
    /bearer\s+[a-zA-Z0-9]/,
  ];

  for (const pattern of sensitivePatterns) {
    if (pattern.test(configString)) {
      throw new Error(
        "Query configuration contains sensitive data that cannot be stored"
      );
    }
  }
}
