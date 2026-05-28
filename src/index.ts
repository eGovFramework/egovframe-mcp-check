#!/usr/bin/env node

/**
 * eGovFrame Architecture Compliance MCP Server
 *
 * Exposes a single tool: egov_check_compliance
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { checkArchitecture } from "./tools/checkArchitecture.js";

const server = new Server(
  {
    name: "egovframe-mcp-check",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "egov_check_compliance",
        description:
          "Check eGovFrame project architecture compliance (Controller, Service, DAO, Mapper layers)",
        inputSchema: {
          type: "object",
          properties: {
            projectPath: {
              type: "string",
              description: "Path to eGovFrame project directory to check",
            },
            exportResults: {
              type: "boolean",
              description: "Export detailed results to CSV files (default: false)",
              default: false,
            },
          },
          required: ["projectPath"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name !== "egov_check_compliance") {
      throw new Error(`Unknown tool: ${name}`);
    }

    const { projectPath, exportResults } = args as {
      projectPath?: string;
      exportResults?: boolean;
    };
    if (!projectPath) {
      throw new Error("projectPath is required");
    }
    const result = await checkArchitecture({
      projectPath,
      exportResults: exportResults || false,
    });
    return {
      content: [{ type: "text", text: result }],
    };
  } catch (error) {
    console.error(`Error executing tool '${name}':`, error);
    throw error;
  }
});

async function main() {
  try {
    console.error("[egovframe-mcp-check] Creating transport...");
    const transport = new StdioServerTransport();

    console.error("[egovframe-mcp-check] Connecting server...");
    await server.connect(transport);

    console.error("[egovframe-mcp-check] ✓ Server started successfully");
  } catch (error) {
    console.error("[egovframe-mcp-check] ✗ Failed to start:", error);
    throw error;
  }
}

main().catch((error) => {
  console.error("[egovframe-mcp-check] Fatal error:", error);
  process.exit(1);
});
