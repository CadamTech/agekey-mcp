/**
 * Redirect URI Tools
 *
 * MCP tools for managing AgeKey application redirect URIs.
 *
 * @values TEEN - Live mode operations require Admin+ role and confirmation
 */

import { z } from "zod";
import { apiClient } from "../api/client.js";
import type { ToolResult } from "../types.js";

const envSchema = z.enum(["test", "live"]);

// =============================================================================
// Validation
// =============================================================================

/**
 * Validate a redirect URI based on environment
 */
function validateRedirectUri(
  uri: string,
  environment: "test" | "live"
): { valid: boolean; error?: string } {
  try {
    const url = new URL(uri);

    // Live mode restrictions
    if (environment === "live") {
      // Must be HTTPS (except localhost for development)
      if (url.protocol !== "https:" && url.hostname !== "localhost") {
        return {
          valid: false,
          error: "Live redirect URIs must use HTTPS (localhost is also not allowed in live mode)",
        };
      }

      // No localhost in live mode
      if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
        return {
          valid: false,
          error: "localhost is not allowed for live redirect URIs",
        };
      }
    }

    return { valid: true };
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }
}

// =============================================================================
// Add Redirect URI
// =============================================================================

export interface AddRedirectUriInput {
  appId: string;
  uri: string;
  environment: "test" | "live";
  orgId: string;
  confirmation?: string;
}

export interface AddRedirectUriResult {
  redirectUris: string[];
  added: string;
}

const ADD_LIVE_CONFIRMATION = "ADD LIVE URI";

export async function addRedirectUri(
  input: AddRedirectUriInput
): Promise<ToolResult<AddRedirectUriResult>> {
  const isLive = input.environment === "live";

  // Validate the URI
  const validation = validateRedirectUri(input.uri, input.environment);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
    };
  }

  // Live mode requires confirmation
  if (isLive && input.confirmation !== ADD_LIVE_CONFIRMATION) {
    return {
      success: false,
      requiresConfirmation: true,
      confirmationPhrase: ADD_LIVE_CONFIRMATION,
      warning: `⚠️ Adding a LIVE redirect URI: ${input.uri}

This will allow this URI to receive production callbacks.

**Requires Admin or Owner role.**

To proceed, confirm with: "${ADD_LIVE_CONFIRMATION}"`,
    };
  }

  const response = await apiClient.addRedirectUri(input.appId, input.uri, input.environment, input.orgId);

  if (!response.success || !response.data) {
    return {
      success: false,
      error: response.error?.message || "Failed to add redirect URI",
    };
  }

  return {
    success: true,
    data: {
      redirectUris: response.data,
      added: input.uri,
    },
  };
}

// =============================================================================
// Remove Redirect URI
// =============================================================================

export interface RemoveRedirectUriInput {
  appId: string;
  uri: string;
  environment: "test" | "live";
  orgId: string;
  confirmation?: string;
}

export interface RemoveRedirectUriResult {
  redirectUris: string[];
  removed: string;
}

const REMOVE_LIVE_CONFIRMATION = "REMOVE LIVE URI";

export async function removeRedirectUri(
  input: RemoveRedirectUriInput
): Promise<ToolResult<RemoveRedirectUriResult>> {
  const isLive = input.environment === "live";

  // Live mode requires confirmation
  if (isLive && input.confirmation !== REMOVE_LIVE_CONFIRMATION) {
    return {
      success: false,
      requiresConfirmation: true,
      confirmationPhrase: REMOVE_LIVE_CONFIRMATION,
      warning: `⚠️ Removing LIVE redirect URI: ${input.uri}

**Impact:**
• Callbacks to this URI will STOP working immediately
• Any production integration using this URI will FAIL

**Requires Admin or Owner role.**

To proceed, confirm with: "${REMOVE_LIVE_CONFIRMATION}"`,
    };
  }

  const response = await apiClient.removeRedirectUri(input.appId, input.uri, input.environment, input.orgId);

  if (!response.success || !response.data) {
    return {
      success: false,
      error: response.error?.message || "Failed to remove redirect URI",
    };
  }

  return {
    success: true,
    data: {
      redirectUris: response.data,
      removed: input.uri,
    },
  };
}

// =============================================================================
// Tool Definitions for MCP
// =============================================================================

export const redirectUriTools = {
  add_redirect_uri: {
    name: "add_redirect_uri",
    description: `Add a redirect URI to an AgeKey application.

For TEST mode: Any valid URL (localhost allowed). Requires Member role.
For LIVE mode: Must be HTTPS (no localhost). Requires Admin role AND confirmation.`,
    inputSchema: z.object({
      appId: z.string().describe("The application ID"),
      uri: z.string().describe("The redirect URI to add (e.g., 'http://localhost:3000/callback' or 'https://myapp.com/callback')"),
      environment: envSchema.describe("Which environment to add the URI to"),
      orgId: z.string().describe("The organization ID that owns the application"),
      confirmation: z.string().optional().describe("Confirmation phrase (required for live mode). Use 'ADD LIVE URI'."),
    }),
    handler: addRedirectUri,
  },

  remove_redirect_uri: {
    name: "remove_redirect_uri",
    description: `Remove a redirect URI from an AgeKey application.

For TEST mode: Requires Member role.
For LIVE mode: Requires Admin role AND confirmation.

⚠️ WARNING: Removing a live URI will immediately break any production integration using it!`,
    inputSchema: z.object({
      appId: z.string().describe("The application ID"),
      uri: z.string().describe("The redirect URI to remove"),
      environment: envSchema.describe("Which environment to remove the URI from"),
      orgId: z.string().describe("The organization ID that owns the application"),
      confirmation: z.string().optional().describe("Confirmation phrase (required for live mode). Use 'REMOVE LIVE URI'."),
    }),
    handler: removeRedirectUri,
  },
};
