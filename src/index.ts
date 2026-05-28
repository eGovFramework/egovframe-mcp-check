#!/usr/bin/env node

/**
 * eGovFrame Architecture Compliance MCP Server
 *
 * Exposes a single tool: egov_check_compliance
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { checkArchitecture } from "./tools/checkArchitecture.js";

const server = new McpServer({
  name: "egovframe-mcp-check",
  version: "1.0.0",
});

server.registerTool(
  "egov_check_compliance",
  {
    title: "eGovFrame Compliance Check",
    description:
      "Check eGovFrame project architecture compliance (Controller, Service, DAO, Mapper layers).",
    inputSchema: {
      projectPath: z
        .string()
        .min(1)
        .describe("Path to eGovFrame project directory to check"),
      exportResults: z
        .boolean()
        .optional()
        .describe("Export detailed results to CSV files (default: false)"),
    },
  },
  async ({ projectPath, exportResults }) => {
    try {
      const result = await checkArchitecture({
        projectPath,
        exportResults: exportResults ?? false,
      });
      return {
        content: [{ type: "text", text: result }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[egovframe-mcp-check] egov_check_compliance failed:`, error);
      return {
        content: [{ type: "text", text: `Error: ${message}` }],
        isError: true,
      };
    }
  },
);

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
