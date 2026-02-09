/**
 * Application Tools
 *
 * MCP tools for managing AgeKey applications.
 *
 * @values DAD - Simple, clear tool definitions
 * @values TEEN - RBAC enforced for write operations
 */

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
    createdAt: string;
    testAppId: string;
    hasLiveCredentials: boolean;
    testRedirectUris: string[];
    liveRedirectUris: string[];
  }>;
}

export async function listApplications(
  input: ListApplicationsInput
): Promise<ToolResult<ListApplicationsResult>> {
  const response = await apiClient.listApplications(input.orgId);

  if (!response.success || !response.data) {
    return {
      success: false,
      error: response.error?.message || "Failed to list applications",
    };
  }

  const list = Array.isArray(response.data) ? response.data : [];
  return {
    success: true,
    data: {
      applications: list.map((app: ApplicationListItem) => ({
        id: app.id,
        name: app.name,
        description: undefined,
        createdAt: "",
        testAppId: app.testAppId,
        hasLiveCredentials: !!app.liveAppId,
        testRedirectUris: [] as string[],
        liveRedirectUris: [] as string[],
      })),
    },
  };
}

// =============================================================================
// Get Application
// =============================================================================

export interface GetApplicationInput {
  appId: string;
}

export interface GetApplicationResult {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
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
  const response = await apiClient.getApplication(input.appId);

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
      createdAt: app.createdAt,
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

  const app = response.data;

  return {
    success: true,
    data: {
      id: app.id,
      name: app.name,
      testCredentials: {
        appId: app.testCredentials.appId,
        secret: app.testCredentials.secret || "sk_test_...",
        authority: app.testCredentials.authority,
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
    inputSchema: {
      type: "object" as const,
      properties: {
        orgId: {
          type: "string",
          description: "The organization ID to list applications for",
        },
      },
      required: ["orgId"],
    },
    handler: listApplications,
  },

  get_application: {
    name: "get_application",
    description: "Get detailed information about a specific AgeKey application including credentials and redirect URIs.",
    inputSchema: {
      type: "object" as const,
      properties: {
        appId: {
          type: "string",
          description: "The application ID",
        },
      },
      required: ["appId"],
    },
    handler: getApplication,
  },

  create_application: {
    name: "create_application",
    description: "Create a new AgeKey application. Returns test credentials (secret shown only once!). Requires Member role or higher.",
    inputSchema: {
      type: "object" as const,
      properties: {
        orgId: {
          type: "string",
          description: "The organization ID to create the application in",
        },
        name: {
          type: "string",
          description: "Name of the application (e.g., 'My Game', 'Production Site')",
        },
        description: {
          type: "string",
          description: "Optional description of the application",
        },
      },
      required: ["orgId", "name"],
    },
    handler: createApplication,
  },
};
