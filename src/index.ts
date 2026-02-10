#!/usr/bin/env node

/**
 * AgeKey MCP Server
 *
 * Model Context Protocol server for managing AgeKey applications from AI IDEs.
 * Supports Cursor, Claude Desktop, and other MCP-compatible clients.
 *
 * @values DAD - Zero config, Clerk OAuth "just works"
 * @values TEEN - RBAC inherited from portal, live mode protected
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { allTools } from "./tools/index.js";
import { logConfig } from "./config.js";

// =============================================================================
// Server Setup
// =============================================================================

const mcpServer = new McpServer(
  {
    name: "agekey-mcp-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register each tool with a wrapper that adapts our handler result to MCP format
for (const tool of Object.values(allTools)) {
  mcpServer.registerTool(
    tool.name,
    {
      description: tool.description,
      // SDK types expect Zod; we use JSON Schema. Cast for compatibility (runtime accepts both).
      inputSchema: tool.inputSchema as unknown as Parameters<typeof mcpServer.registerTool>[1]["inputSchema"],
    },
    async (args: unknown) => {
      try {
        const result = await tool.handler(args as never);

        if (result.success) {
          return {
            content: [
              { type: "text" as const, text: JSON.stringify(result.data, null, 2) },
            ],
          };
        }

        if (result.requiresConfirmation) {
          return {
            content: [
              {
                type: "text" as const,
                text: `${result.warning || "Confirmation required"}\n\nTo proceed, call this tool again with confirmation: "${result.confirmationPhrase}"`,
              },
            ],
          };
        }

        return {
          content: [
            { type: "text" as const, text: `Error: ${result.error}` },
          ],
          isError: true,
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error executing ${tool.name}: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}

// =============================================================================
// Server Start
// =============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);

  // Log to stderr so it doesn't interfere with MCP communication
  console.error("🔑 AgeKey MCP Server started");
  console.error("   Tools available:", Object.keys(allTools).length);

  // Show environment config (only for non-production)
  logConfig();
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
