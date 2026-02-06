/**
 * Tools Index
 *
 * Exports all MCP tools for the AgeKey MCP server.
 */

export { organizationTools } from "./organizations.js";
export { applicationTools } from "./applications.js";
export { credentialTools } from "./credentials.js";
export { redirectUriTools } from "./redirect-uris.js";
export { utilityTools } from "./utilities.js";

// Aggregate all tools
import { organizationTools } from "./organizations.js";
import { applicationTools } from "./applications.js";
import { credentialTools } from "./credentials.js";
import { redirectUriTools } from "./redirect-uris.js";
import { utilityTools } from "./utilities.js";

export const allTools = {
  ...organizationTools,
  ...applicationTools,
  ...credentialTools,
  ...redirectUriTools,
  ...utilityTools,
};
