/**
 * Organization Tools
 *
 * MCP tools for managing AgeKey organizations.
 *
 * @values DAD - Simple, clear tool definitions
 */

import { apiClient } from "../api/client.js";
import type { ToolResult, Organization } from "../types.js";

// =============================================================================
// List Organizations
// =============================================================================

export interface ListOrganizationsResult {
  organizations: Array<{
    id: string;
    name: string;
    slug: string;
    role: string;
    applicationCount: number;
  }>;
}

/**
 * List all organizations the user has access to
 */
export async function listOrganizations(): Promise<ToolResult<ListOrganizationsResult>> {
  const response = await apiClient.listOrganizations();

  if (!response.success || !response.data) {
    return {
      success: false,
      error: response.error?.message || "Failed to list organizations",
    };
  }

  return {
    success: true,
    data: {
      organizations: response.data.map((org: Organization) => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        role: org.role,
        applicationCount: org.applicationCount,
      })),
    },
  };
}

// =============================================================================
// Tool Definitions for MCP
// =============================================================================

export const organizationTools = {
  list_organizations: {
    name: "list_organizations",
    description: "List all AgeKey organizations you have access to. Returns organization details including your role and the number of applications.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [] as string[],
    },
    handler: listOrganizations,
  },
};
