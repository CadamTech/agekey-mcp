/**
 * MCP Server Configuration
 *
 * Centralized environment configuration for the AgeKey MCP server.
 * Supports local, dev, staging, and production environments.
 *
 * @values DAD - Zero config for production, simple env var for others
 * @values TEEN - Clear feedback about which environment is active
 */

// =============================================================================
// Environment Presets
// =============================================================================

export type Environment = "local" | "dev" | "staging" | "production";

interface EnvironmentConfig {
  portalUrl: string;
  apiUrl: string;
}

const ENVIRONMENT_PRESETS: Record<Environment, EnvironmentConfig> = {
  local: {
    portalUrl: "http://localhost:3005", // Local dev server (override with AGEKEY_PORTAL_URL)
    apiUrl: "http://localhost:3005/api",
  },
  dev: {
    portalUrl: "https://portal.dev.agekey.org", // Remote dev environment
    apiUrl: "https://portal.dev.agekey.org/api",
  },
  staging: {
    portalUrl: "https://portal.staging.agekey.org",
    apiUrl: "https://portal.staging.agekey.org/api",
  },
  production: {
    portalUrl: "https://portal.agekey.org",
    apiUrl: "https://portal.agekey.org/api",
  },
};

// =============================================================================
// Configuration Detection
// =============================================================================

/**
 * Detect the environment from env vars.
 *
 * Priority:
 * 1. AGEKEY_ENV (explicit: local, dev, staging, production)
 * 2. AGEKEY_PORTAL_URL (custom URL → "custom" mode)
 * 3. Default to production
 */
function detectEnvironment(): Environment | "custom" {
  const explicitEnv = process.env["AGEKEY_ENV"]?.toLowerCase();

  if (explicitEnv === "local" || explicitEnv === "localhost") {
    return "local";
  }

  if (explicitEnv === "dev" || explicitEnv === "development") {
    return "dev";
  }

  if (explicitEnv === "staging" || explicitEnv === "stage") {
    return "staging";
  }

  if (explicitEnv === "production" || explicitEnv === "prod") {
    return "production";
  }

  // If custom URL is provided without AGEKEY_ENV, use custom mode
  if (process.env["AGEKEY_PORTAL_URL"]) {
    return "custom";
  }

  // Default to production (DAD: just works)
  return "production";
}

/**
 * Get the resolved configuration
 *
 * Priority:
 * 1. AGEKEY_PORTAL_URL always wins (allows overriding any preset)
 * 2. Environment preset provides defaults
 * 3. Production is the fallback
 */
function getConfig(): EnvironmentConfig & { environment: Environment | "custom" } {
  const env = detectEnvironment();

  if (env === "custom") {
    // Custom mode: use provided URL
    const portalUrl = process.env["AGEKEY_PORTAL_URL"]!;
    const apiUrl = `${portalUrl}/api`;

    return {
      environment: "custom",
      portalUrl,
      apiUrl,
    };
  }

  // Get preset defaults
  const preset = ENVIRONMENT_PRESETS[env];

  // Allow overriding preset URL with AGEKEY_PORTAL_URL
  const portalUrl = process.env["AGEKEY_PORTAL_URL"] || preset.portalUrl;
  const apiUrl = `${portalUrl}/api`;

  return {
    environment: env,
    portalUrl,
    apiUrl,
  };
}

// =============================================================================
// Exported Configuration
// =============================================================================

const resolvedConfig = getConfig();

/** Current environment (local, dev, staging, production, or custom) */
export const ENVIRONMENT = resolvedConfig.environment;

/** AgeKey Developer Portal URL */
export const PORTAL_URL = resolvedConfig.portalUrl;

/** AgeKey Developer Portal API URL */
export const API_URL = resolvedConfig.apiUrl;

/** MCP Client ID for OAuth */
export const MCP_CLIENT_ID = "agekey-mcp-server";

// =============================================================================
// Startup Logging
// =============================================================================

/**
 * Log the current configuration to stderr (doesn't interfere with MCP)
 */
export function logConfig(): void {
  const isProduction = ENVIRONMENT === "production";

  if (!isProduction) {
    console.error(`\n🔧 AgeKey MCP Server Configuration`);
    console.error(`   Environment: ${ENVIRONMENT.toUpperCase()}`);
    console.error(`   Portal URL:  ${PORTAL_URL}`);

    if (ENVIRONMENT === "local") {
      console.error(`\n   ⚠️  Running against LOCAL instance`);
      console.error(`   Make sure the dev portal is running on ${PORTAL_URL}`);
    } else if (ENVIRONMENT === "dev") {
      console.error(`\n   ⚠️  Running against DEV environment`);
    } else if (ENVIRONMENT === "staging") {
      console.error(`\n   ⚠️  Running against STAGING environment`);
    } else if (ENVIRONMENT === "custom") {
      console.error(`\n   ⚠️  Running against CUSTOM endpoint`);
    }
    console.error("");
  }
}

// =============================================================================
// Endpoint Helpers
// =============================================================================

/** Auth endpoints */
export const AUTH_ENDPOINTS = {
  deviceCode: `${PORTAL_URL}/api/mcp/auth/device-code`,
  token: `${PORTAL_URL}/api/mcp/auth/token`,
  verify: `${PORTAL_URL}/api/mcp/auth/verify`,
} as const;
