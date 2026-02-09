/**
 * AgeKey MCP Server Types
 *
 * Type definitions for the MCP server implementation.
 */

// =============================================================================
// Auth Types
// =============================================================================

export interface Session {
  accessToken: string;
  refreshToken?: string;
  expiresAt: string;
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

export interface OAuthDeviceCodeResponse {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  verificationUriComplete: string;
  expiresIn: number;
  interval: number;
}

export interface OAuthTokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
}

// =============================================================================
// Organization Types
// =============================================================================

export type OrgRole = "owner" | "admin" | "member" | "viewer";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  role: OrgRole;
  applicationCount: number;
  createdAt?: string;
}

// =============================================================================
// Application Types
// =============================================================================

export interface Credentials {
  appId: string;
  secret?: string;
  authority: string;
}

export interface Application {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  testCredentials: Credentials;
  liveCredentials?: Credentials;
  redirectUris: {
    test: string[];
    live: string[];
  };
}

/** Minimal shape returned by GET /mcp/orgs/:orgId/apps (list applications) */
export interface ApplicationListItem {
  id: string;
  name: string;
  testAppId: string;
  liveAppId: string;
  status: "active" | "archived";
}

// =============================================================================
// API Response Types
// =============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// =============================================================================
// Error Diagnosis Types
// =============================================================================

export interface ErrorDiagnosis {
  code: string;
  title: string;
  description: string;
  causes: string[];
  solutions: string[];
  docsUrl?: string;
}

// =============================================================================
// Code Sample Types
// =============================================================================

export type CodeLanguage = "typescript" | "python" | "go" | "java" | "rust";
export type FlowType = "use" | "create";
export type FlowStep = "redirect" | "callback";

export interface CodeSample {
  language: CodeLanguage;
  code: string;
  installCommand: string;
  docsUrl: string;
}

// =============================================================================
// JWT Types
// =============================================================================

export interface DecodedJWT {
  header: {
    alg: string;
    typ: string;
    kid?: string;
  };
  payload: {
    iss: string;
    aud: string;
    sub: string;
    iat: number;
    exp: number;
    nonce?: string;
    age_thresholds?: Record<string, boolean>;
    [key: string]: unknown;
  };
  signature: string;
  isExpired: boolean;
}

// =============================================================================
// Tool Result Types
// =============================================================================

export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  requiresConfirmation?: boolean;
  confirmationPhrase?: string;
  warning?: string;
}

// =============================================================================
// RBAC Types
// =============================================================================

export type Permission =
  | "orgs:read"
  | "apps:read"
  | "apps:write:test"
  | "apps:write:live";

export const ROLE_PERMISSIONS: Record<OrgRole, Permission[]> = {
  viewer: ["orgs:read", "apps:read"],
  member: ["orgs:read", "apps:read", "apps:write:test"],
  admin: ["orgs:read", "apps:read", "apps:write:test", "apps:write:live"],
  owner: ["orgs:read", "apps:read", "apps:write:test", "apps:write:live"],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: OrgRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
