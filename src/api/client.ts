/**
 * AgeKey API Client
 *
 * HTTP client for making authenticated requests to the AgeKey backend.
 * Handles token management and error handling.
 *
 * @values TEEN - Proper error handling and type safety
 */

import { getAccessToken, authenticate } from "../auth/index.js";
import { clearSession } from "../auth/session.js";
import type {
  ApiResponse,
  Organization,
  Application,
  ApplicationListItem,
  Credentials,
} from "../types.js";
import { API_URL } from "../config.js";

// =============================================================================
// API Client
// =============================================================================

/**
 * Make an authenticated request to the AgeKey API
 */
async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  let token = getAccessToken();

  // If no token, authenticate first
  if (!token) {
    const session = await authenticate();
    token = session.accessToken;
  }

  const url = `${API_URL}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearSession();
      const session = await authenticate();
      // Retry the request with new token
      const retryResponse = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
          ...options.headers,
        },
      });

      if (!retryResponse.ok) {
        const error = await retryResponse.json().catch(() => ({ message: retryResponse.statusText }));
        return {
          success: false,
          error: {
            code: `HTTP_${retryResponse.status}`,
            message: error.message || retryResponse.statusText,
          },
        };
      }

      const data = await retryResponse.json() as T;
      return { success: true, data };
    }

    const error = await response.json().catch(() => ({ message: response.statusText }));
    return {
      success: false,
      error: {
        code: `HTTP_${response.status}`,
        message: error.message || response.statusText,
      },
    };
  }

  const data = await response.json() as T;
  return { success: true, data };
}

// =============================================================================
// Organization APIs
// =============================================================================

/**
 * List all organizations the user has access to
 */
export async function listOrganizations(): Promise<ApiResponse<Organization[]>> {
  const response = await request<{ organizations: Organization[] }>("/mcp/organizations");
  if (!response.success || !response.data) {
    return { success: false, error: response.error };
  }
  return { success: true, data: response.data.organizations };
}

/**
 * Get a single organization by ID
 */
export async function getOrganization(orgId: string): Promise<ApiResponse<Organization>> {
  return request<Organization>(`/mcp/organizations/${orgId}`);
}

// =============================================================================
// Application APIs
// =============================================================================

/**
 * List all applications in an organization.
 * API returns { applications: ApplicationListItem[] }; we unwrap to an array.
 */
export async function listApplications(
  orgId: string
): Promise<ApiResponse<ApplicationListItem[]>> {
  const response = await request<{ applications?: ApplicationListItem[] }>(
    `/mcp/orgs/${orgId}/apps`
  );
  if (!response.success || response.data == null) {
    return { success: false, error: response.error };
  }
  const raw = response.data;
  const list = Array.isArray(raw) ? raw : raw.applications;
  if (!Array.isArray(list)) {
    return { success: false, error: { code: "INVALID_RESPONSE", message: "Applications list missing" } };
  }
  return { success: true, data: list };
}

/**
 * Get a single application by ID
 */
export async function getApplication(appId: string): Promise<ApiResponse<Application>> {
  return request<Application>(`/mcp/apps/${appId}`);
}

/**
 * Create a new application
 */
export async function createApplication(
  orgId: string,
  name: string,
  description?: string
): Promise<ApiResponse<Application>> {
  return request<Application>(`/mcp/orgs/${orgId}/apps`, {
    method: "POST",
    body: JSON.stringify({ name, description }),
  });
}

// =============================================================================
// Credentials APIs
// =============================================================================

/**
 * Get credentials for an application
 */
export async function getCredentials(
  appId: string,
  environment: "test" | "live"
): Promise<ApiResponse<Credentials>> {
  return request<Credentials>(`/mcp/apps/${appId}/credentials?environment=${environment}`);
}

/**
 * Rotate credentials for an application
 */
export async function rotateCredentials(
  appId: string,
  environment: "test" | "live"
): Promise<ApiResponse<Credentials>> {
  return request<Credentials>(`/mcp/apps/${appId}/credentials/rotate`, {
    method: "POST",
    body: JSON.stringify({ environment }),
  });
}

// =============================================================================
// Redirect URI APIs
// =============================================================================

/**
 * Add a redirect URI
 */
export async function addRedirectUri(
  appId: string,
  uri: string,
  environment: "test" | "live"
): Promise<ApiResponse<string[]>> {
  return request<string[]>(`/mcp/apps/${appId}/redirect-uris`, {
    method: "POST",
    body: JSON.stringify({ uri, environment }),
  });
}

/**
 * Remove a redirect URI
 */
export async function removeRedirectUri(
  appId: string,
  uri: string,
  environment: "test" | "live"
): Promise<ApiResponse<string[]>> {
  return request<string[]>(`/mcp/apps/${appId}/redirect-uris`, {
    method: "DELETE",
    body: JSON.stringify({ uri, environment }),
  });
}

// =============================================================================
// Export Client
// =============================================================================

export const apiClient = {
  listOrganizations,
  getOrganization,
  listApplications,
  getApplication,
  createApplication,
  getCredentials,
  rotateCredentials,
  addRedirectUri,
  removeRedirectUri,
};
