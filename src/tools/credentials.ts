/**
 * Credentials Tools
 *
 * MCP tools for managing AgeKey application credentials.
 *
 * @values TEEN - Live mode operations require Admin+ role and confirmation
 */

import { z } from "zod";
import { apiClient } from "../api/client.js";
import type { ToolResult } from "../types.js";

const envSchema = z.enum(["test", "live"]);

// =============================================================================
// Get Credentials
// =============================================================================

export interface GetCredentialsInput {
  appId: string;
  environment: "test" | "live";
  orgId: string;
}

export interface GetCredentialsResult {
  appId: string;
  secret?: string;
  authority: string;
  redirectUris: string[];
  warning?: string;
}

export async function getCredentials(
  input: GetCredentialsInput
): Promise<ToolResult<GetCredentialsResult>> {
  const response = await apiClient.getCredentials(input.appId, input.environment, input.orgId);

  if (!response.success || !response.data) {
    return {
      success: false,
      error: response.error?.message || "Failed to get credentials",
    };
  }

  const result: GetCredentialsResult = {
    appId: response.data.appId,
    secret: response.data.secret,
    authority: response.data.authority,
    redirectUris: response.data.redirectUris ?? [],
  };

  if (input.environment === "live") {
    result.warning = "⚠️ These are PRODUCTION credentials. Handle with care.";
  }

  return {
    success: true,
    data: result,
  };
}

// =============================================================================
// Rotate Credentials
// =============================================================================

export interface RotateCredentialsInput {
  appId: string;
  environment: "test" | "live";
  orgId: string;
  confirmation?: string;
}

export interface RotateCredentialsResult {
  newAppId: string;
  newSecret: string;
  oldAppIdInvalidated: boolean;
  urgentAction?: string;
}

// Confirmation phrases
const TEST_CONFIRMATION = "ROTATE TEST CREDENTIALS";
const LIVE_CONFIRMATION = "ROTATE LIVE CREDENTIALS";

export async function rotateCredentials(
  input: RotateCredentialsInput
): Promise<ToolResult<RotateCredentialsResult>> {
  const isLive = input.environment === "live";

  // Live mode always requires confirmation
  // Test mode is more lenient but still good to confirm
  if (isLive && input.confirmation !== LIVE_CONFIRMATION) {
    return {
      success: false,
      requiresConfirmation: true,
      confirmationPhrase: LIVE_CONFIRMATION,
      warning: `⚠️ WARNING: This will rotate LIVE credentials for this application.

**Impact:**
• Current credentials will be IMMEDIATELY invalidated
• All production traffic using old credentials will FAIL
• You must update your production environment IMMEDIATELY after

**Your role must be Admin or Owner to perform this action.**

To proceed, please confirm by providing: "${LIVE_CONFIRMATION}"`,
    };
  }

  // For test mode, we'll allow without confirmation but still warn
  if (!isLive && !input.confirmation) {
    return {
      success: false,
      requiresConfirmation: true,
      confirmationPhrase: TEST_CONFIRMATION,
      warning: `This will rotate TEST credentials for this application.

The old test credentials will be invalidated. Your test environment will need to be updated.

To proceed, confirm with: "${TEST_CONFIRMATION}"`,
    };
  }

  const response = await apiClient.rotateCredentials(input.appId, input.environment, input.orgId);

  if (!response.success || !response.data) {
    return {
      success: false,
      error: response.error?.message || "Failed to rotate credentials",
    };
  }

  const result: RotateCredentialsResult = {
    newAppId: response.data.newAppId,
    newSecret: response.data.newSecret,
    oldAppIdInvalidated: response.data.oldAppIdInvalidated ?? true,
    ...(response.data.urgentAction && { urgentAction: response.data.urgentAction }),
  };

  return {
    success: true,
    data: result,
  };
}

// =============================================================================
// Tool Definitions for MCP
// =============================================================================

export const credentialTools = {
  get_credentials: {
    name: "get_credentials",
    description: "Get credentials (App ID, Secret, Authority URL) for an AgeKey application. Specify 'test' or 'live' environment. Requires orgId (the organization that owns the app).",
    inputSchema: z.object({
      appId: z.string().describe("The application ID"),
      environment: envSchema.describe("Which environment's credentials to retrieve"),
      orgId: z.string().describe("The organization ID that owns the application"),
    }),
    handler: getCredentials,
  },

  rotate_credentials: {
    name: "rotate_credentials",
    description: `Rotate credentials for an AgeKey application. 

For TEST mode: Requires Member role or higher.
For LIVE mode: Requires Admin role or higher AND explicit confirmation phrase.

⚠️ WARNING: Old credentials are invalidated immediately!`,
    inputSchema: z.object({
      appId: z.string().describe("The application ID"),
      environment: envSchema.describe("Which environment's credentials to rotate"),
      orgId: z.string().describe("The organization ID that owns the application"),
      confirmation: z.string().optional().describe("Confirmation phrase (required for live mode). Use 'ROTATE LIVE CREDENTIALS' for live, 'ROTATE TEST CREDENTIALS' for test."),
    }),
    handler: rotateCredentials,
  },
};
