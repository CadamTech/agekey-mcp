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

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { allTools } from "./tools/index.js";
import { logConfig } from "./config.js";

// =============================================================================
// Server Setup
// =============================================================================

const server = new Server(
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

// =============================================================================
// Tool Listing
// =============================================================================

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: Object.values(allTools).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  };
});

// =============================================================================
// Tool Execution
// =============================================================================

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const tool = allTools[name as keyof typeof allTools];

  if (!tool) {
    return {
      content: [
        {
          type: "text",
          text: `Unknown tool: ${name}`,
        },
      ],
      isError: true,
    };
  }

  try {
    // Execute the tool handler
    const result = await tool.handler(args as never);

    // Format the result
    if (result.success) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result.data, null, 2),
          },
        ],
      };
    }

    // Handle confirmation required
    if (result.requiresConfirmation) {
      return {
        content: [
          {
            type: "text",
            text: `${result.warning || "Confirmation required"}\n\nTo proceed, call this tool again with confirmation: "${result.confirmationPhrase}"`,
          },
        ],
      };
    }

    // Handle errors
    return {
      content: [
        {
          type: "text",
          text: `Error: ${result.error}`,
        },
      ],
      isError: true,
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error executing ${name}: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
      isError: true,
    };
  }
});

// =============================================================================
// Server Start
// =============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

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
