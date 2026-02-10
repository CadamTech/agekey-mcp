/**
 * Application Tools
 *
 * MCP tools for managing AgeKey applications.
 *
 * @values DAD - Simple, clear tool definitions
 * @values TEEN - RBAC enforced for write operations
 */

import { z } from "zod";
import { apiClient } from "../api/client.js";
import type { ToolResult, ApplicationListItem } from "../types.js";

// =============================================================================
// List Applications
// =============================================================================

export interface ListApplicationsInput {
  orgId: string;
}

export interface ListApplicationsResult {
  applications: Array<{
    id: string;
    name: string;
    description?: string;
    testAppId: string;
    hasLiveCredentials: boolean;
  }>;
}

export async function listApplications(
  input: ListApplicationsInput
): Promise<ToolResult<ListApplicationsResult>> {
  const response = await apiClient.listApplications(input.orgId);

  if (!response.success) {
    return {
      success: false,
      error: response.error?.message || "Failed to list applications",
    };
  }

  const raw = response.data;
  const list = Array.isArray(raw)
    ? raw
    : (raw && typeof raw === "object" && Array.isArray((raw as { applications?: unknown }).applications)
        ? (raw as { applications: ApplicationListItem[] }).applications
        : []);
  const safeList = Array.isArray(list) ? list : [];
  return {
    success: true,
    data: {
      applications: safeList.map((app: ApplicationListItem) => ({
        id: app.id,
        name: app.name,
        description: undefined,
        testAppId: app.testAppId,
        hasLiveCredentials: !!app.liveAppId,
      })),
    },
  };
}

// =============================================================================
// Get Application
// =============================================================================

export interface GetApplicationInput {
  appId: string;
  orgId: string;
}

export interface GetApplicationResult {
  id: string;
  name: string;
  description?: string;
  updatedAt: string;
  testCredentials: {
    appId: string;
    authority: string;
  };
  liveCredentials?: {
    appId: string;
    authority: string;
  };
  redirectUris: {
    test: string[];
    live: string[];
  };
}

export async function getApplication(
  input: GetApplicationInput
): Promise<ToolResult<GetApplicationResult>> {
  const response = await apiClient.getApplication(input.appId, input.orgId);

  if (!response.success || !response.data) {
    return {
      success: false,
      error: response.error?.message || "Failed to get application",
    };
  }

  const app = response.data;

  return {
    success: true,
    data: {
      id: app.id,
      name: app.name,
      description: app.description,
      updatedAt: app.updatedAt,
      testCredentials: {
        appId: app.testCredentials.appId,
        authority: app.testCredentials.authority,
      },
      liveCredentials: app.liveCredentials
        ? {
            appId: app.liveCredentials.appId,
            authority: app.liveCredentials.authority,
          }
        : undefined,
      redirectUris: app.redirectUris,
    },
  };
}

// =============================================================================
// Create Application
// =============================================================================

export interface CreateApplicationInput {
  orgId: string;
  name: string;
  description?: string;
}

export interface CreateApplicationResult {
  id: string;
  name: string;
  testCredentials: {
    appId: string;
    secret: string; // Only shown once at creation!
    authority: string;
  };
  nextSteps: string[];
}

export async function createApplication(
  input: CreateApplicationInput
): Promise<ToolResult<CreateApplicationResult>> {
  const response = await apiClient.createApplication(
    input.orgId,
    input.name,
    input.description
  );

  if (!response.success || !response.data) {
    return {
      success: false,
      error: response.error?.message || "Failed to create application",
    };
  }

  // API returns { application, credentials }
  const data = response.data as {
    application?: { id: string; name: string; description?: string };
    credentials?: { appId: string; signingSecret: string; environment: string };
  };
  const app = data.application;
  const creds = data.credentials;

  if (!app || !creds) {
    return {
      success: false,
      error: "Invalid response from API (missing application or credentials)",
    };
  }

  const authority =
    creds.environment === "test"
      ? "https://api-test.agekey.org"
      : "https://api.agekey.org";

  return {
    success: true,
    data: {
      id: app.id,
      name: app.name,
      testCredentials: {
        appId: creds.appId,
        secret: creds.signingSecret || "sk_test_...",
        authority,
      },
      nextSteps: [
        `Add a redirect URI: http://localhost:3000/callback`,
        `Copy the code sample for your framework`,
        `Try it in the sandbox at agekey.kidentify.com`,
      ],
    },
  };
}

// =============================================================================
// Tool Definitions for MCP
// =============================================================================

export const applicationTools = {
  list_applications: {
    name: "list_applications",
    description: "List all applications in an AgeKey organization. Returns app names, IDs, and credential status.",
    inputSchema: z.object({
      orgId: z.string().describe("The organization ID to list applications for"),
    }),
    handler: listApplications,
  },

  get_application: {
    name: "get_application",
    description: "Get detailed information about a specific AgeKey application including credentials and redirect URIs.",
    inputSchema: z.object({
      appId: z.string().describe("The application ID"),
      orgId: z.string().describe("The organization ID the application belongs to"),
    }),
    handler: getApplication,
  },

  create_application: {
    name: "create_application",
    description: "Create a new AgeKey application. Returns test credentials (secret shown only once!). Requires Admin role or higher in the organization.",
    inputSchema: z.object({
      orgId: z.string().describe("The organization ID to create the application in"),
      name: z.string().describe("Name of the application (e.g., 'My Game', 'Production Site')"),
      description: z.string().optional().describe("Optional description of the application"),
    }),
    handler: createApplication,
  },
};
