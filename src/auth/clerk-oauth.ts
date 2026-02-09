/**
 * Clerk OAuth Device Flow
 *
 * Implements OAuth 2.0 Device Authorization Grant for CLI/MCP authentication.
 * Opens browser for user to authenticate with Clerk, then polls for token.
 *
 * @values DAD - Seamless auth, no manual token management
 * @values TEEN - Secure OAuth flow with Clerk
 */

import open from "open";
import type { Session, OAuthDeviceCodeResponse, OAuthTokenResponse } from "../types.js";
import { saveSession, loadSession, clearSession } from "./session.js";
import { AUTH_ENDPOINTS, MCP_CLIENT_ID, ENVIRONMENT } from "../config.js";

// =============================================================================
// Device Flow Implementation
// =============================================================================

/**
 * Start the device authorization flow
 *
 * 1. Request device code from server
 * 2. Open browser to verification URL
 * 3. Poll for token until user completes auth
 */
export async function authenticate(): Promise<Session> {
  // Use cached/disk session if present and not expired (no network call per request)
  const existingSession = loadSession();
  if (existingSession) {
    return existingSession;
  }

  // Step 1: Request device code
  console.error("🔐 Authenticating with AgeKey...");
  const deviceCode = await requestDeviceCode();

  // Step 2: Open browser for user to authenticate
  console.error(`\n📱 Opening browser to complete authentication...`);
  console.error(`   If browser doesn't open, visit: ${deviceCode.verificationUriComplete}`);
  console.error(`   User code: ${deviceCode.userCode}`);
  if (ENVIRONMENT !== "production") {
    console.error(`   Environment: ${ENVIRONMENT.toUpperCase()}`);
  }
  console.error("");

  try {
    await open(deviceCode.verificationUriComplete);
  } catch {
    console.error("   ⚠️ Could not open browser automatically.");
  }

  // Step 3: Poll for token
  console.error("⏳ Waiting for authentication...");
  const token = await pollForToken(deviceCode.deviceCode, deviceCode.interval);

  // Step 4: Get user info and create session
  const session = await createSession(token);

  // Step 5: Save session
  saveSession(session);

  console.error(`\n✅ Authenticated as ${session.user.email}\n`);
  return session;
}

/**
 * Request a device code from the authorization server
 */
async function requestDeviceCode(): Promise<OAuthDeviceCodeResponse> {
  const response = await fetch(AUTH_ENDPOINTS.deviceCode, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: MCP_CLIENT_ID,
      scope: "openid profile email organizations",
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to request device code: ${response.statusText}`);
  }

  const data = await response.json() as {
    device_code: string;
    user_code: string;
    verification_uri: string;
    verification_uri_complete: string;
    expires_in: number;
    interval: number;
  };

  return {
    deviceCode: data.device_code,
    userCode: data.user_code,
    verificationUri: data.verification_uri,
    verificationUriComplete: data.verification_uri_complete,
    expiresIn: data.expires_in,
    interval: data.interval,
  };
}

/**
 * Poll for token until user completes authentication
 */
async function pollForToken(
  deviceCode: string,
  interval: number
): Promise<OAuthTokenResponse> {
  const pollInterval = Math.max(interval, 5) * 1000; // Minimum 5 seconds
  const maxAttempts = 60; // 5 minutes max (with 5s interval)

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await sleep(pollInterval);

    try {
      const response = await fetch(AUTH_ENDPOINTS.token, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: MCP_CLIENT_ID,
          device_code: deviceCode,
          grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        }),
      });

      if (response.ok) {
        const data = await response.json() as {
          access_token: string;
          refresh_token?: string;
          expires_in: number;
          token_type: string;
        };

        return {
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresIn: data.expires_in,
          tokenType: data.token_type,
        };
      }

      const error = await response.json() as { error: string };

      if (error.error === "authorization_pending") {
        // User hasn't completed auth yet, continue polling
        continue;
      }

      if (error.error === "slow_down") {
        // Server asking us to slow down, increase interval
        await sleep(5000);
        continue;
      }

      if (error.error === "expired_token") {
        throw new Error("Authentication timed out. Please try again.");
      }

      if (error.error === "access_denied") {
        throw new Error("Authentication was denied. Please try again.");
      }

      throw new Error(`Authentication failed: ${error.error}`);
    } catch (err) {
      if (err instanceof Error && err.message.includes("Authentication")) {
        throw err;
      }
      // Network error, continue polling
      continue;
    }
  }

  throw new Error("Authentication timed out. Please try again.");
}

/**
 * Create a session from the OAuth token
 */
async function createSession(token: OAuthTokenResponse): Promise<Session> {
  // Get user info from the token endpoint or a userinfo endpoint
  const response = await fetch(AUTH_ENDPOINTS.verify, {
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to verify token");
  }

  const user = await response.json() as {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };

  const expiresAt = new Date(Date.now() + token.expiresIn * 1000).toISOString();

  return {
    accessToken: token.accessToken,
    refreshToken: token.refreshToken,
    expiresAt,
    user,
  };
}

/**
 * Verify an existing session is still valid
 */
async function verifySession(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch(AUTH_ENDPOINTS.verify, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Logout and clear session
 */
export function logout(): void {
  clearSession();
  console.error("👋 Logged out successfully");
}
