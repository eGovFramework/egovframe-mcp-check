#!/usr/bin/env node

/**
 * eGovFrame Architecture Compliance MCP Server
 *
 * Exposes a single tool: egov_check_compliance
 */

import { createRequire } from "node:module";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { FAILED_FILES_LIMIT, MAX_FILE_LINKS, checkArchitecture } from "./tools/checkArchitecture.js";
import { isDebugEnabled } from "./utils/debugLog.js";

// 서버 이름과 버전은 package.json 한 곳에서만 관리한다 (build/index.js 기준 한 단계 위).
const packageJson = createRequire(import.meta.url)("../package.json") as { name: string; version: string };

const server = new McpServer({
  name: packageJson.name,
  version: packageJson.version,
});

/**
 * @vscode/ripgrep 의 rgPath 를 지연 로드한다.
 * 이 패키지는 플랫폼별 바이너리 패키지(optionalDependencies)가 없으면 모듈 로드 시점에 throw 하므로,
 * 정적 import 를 쓰면 폐쇄망·미지원 플랫폼에서 서버 기동 자체가 실패한다. 여기서 실패를 삼키고 undefined 를
 * 돌려주면 엔진이 fs 재귀 탐색으로 대체한다 (결과는 동일, 속도만 느림).
 */
let rgPathPromise: Promise<string | undefined> | undefined;
function resolveRgPath(): Promise<string | undefined> {
  rgPathPromise ??= import("@vscode/ripgrep")
    .then((mod) => (typeof mod.rgPath === "string" ? mod.rgPath : undefined))
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[egovframe-mcp-check] ripgrep unavailable, using fs-based file search: ${message}`);
      return undefined;
    });
  return rgPathPromise;
}

server.registerTool(
  "egov_check_compliance",
  {
    title: "eGovFrame Architecture Check",
    description:
      "Statically analyze an eGovFrame (Korean e-Government Standard Framework) project for architecture compliance. " +
      "It reads the Maven/Gradle build files to determine the eGovFrame runtime generation (3.x / 4.x / 5.x) and version " +
      "per module, checks that the four required runtime libraries (ptl-mvc, fdl-cmmn, fdl-logging, psl-dataaccess) are " +
      "declared directly or transitively, and verifies version consistency across modules. It then checks the Java sources " +
      "of the Controller layer (@Controller/@RestController, request mapping annotations, no DAO injection), the Service " +
      "layer (extends EgovAbstractServiceImpl, @Service, implements *Service) and the combined DAO / Mapper layer " +
      "(*DAO.java, *Dao.java, *Mapper.java classified as iBatis DAO, MyBatis DAO or Mapper interface; eGov base class or " +
      "Mapper annotation origin, @Repository or @Mapper/@EgovMapper bean annotation, and annotation package matching the " +
      "runtime generation). Spring data-access configuration findings are reported as informational. The text report lists " +
      `at most ${FAILED_FILES_LIMIT} failed files per layer and uses paths relative to projectPath. After the text, failed files (including ` +
      `build files of NotFound modules) are returned as resource_link content blocks, at most ${MAX_FILE_LINKS} in total; ` +
      "each uri is the file's absolute file:// URI and each description is the failure reason. " +
      "When exportResults is true, the written CSV files are attached as resource_link blocks too. The tool only reads the project unless " +
      "exportResults is true, in which case it writes CSV reports into the project root.",
    inputSchema: {
      projectPath: z
        .string()
        .min(1)
        .describe("Path to the eGovFrame project directory to check (absolute path recommended)"),
      exportResults: z
        .boolean()
        .optional()
        .describe(
          "Write detailed CSV reports (Result_Controller/Service/DAO/Project_<date>.csv) into the project root. " +
            `The text report shows at most ${FAILED_FILES_LIMIT} failed files per layer and links at most ${MAX_FILE_LINKS} failed files; ` +
            "enable this when the full list is needed (default: false)",
        ),
      runtimeGeneration: z
        .enum(["3.x", "4.x", "5.x"])
        .optional()
        .describe(
          "Override the eGovFrame runtime generation used for the Project check and the DAO / Mapper 'Version' check. " +
            "Leave it unset normally: the generation is detected per module from pom.xml / build.gradle. Set it only when " +
            "the report shows 'Runtime: unknown' or no build files, or when the user names a target generation (for example " +
            "checking readiness for 5.x). It replaces the detected generation for every module.",
        ),
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  async ({ projectPath, exportResults, runtimeGeneration }) => {
    try {
      const rgPath = await resolveRgPath();
      const report = await checkArchitecture({
        projectPath,
        exportResults: exportResults ?? false,
        runtimeGeneration,
        rgPath,
      });
      // 텍스트 리포트 뒤에 실패 파일(최대 MAX_FILE_LINKS 개)과 내보낸 CSV 의 file:// resource_link 를 붙인다
      return {
        content: [{ type: "text", text: report.text }, ...report.resourceLinks],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // 스택 트레이스는 EGOV_CHECK_DEBUG 가 켜진 경우에만 stderr 로 남긴다
      console.error(`[egovframe-mcp-check] egov_check_compliance failed:`, isDebugEnabled() ? error : message);
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
