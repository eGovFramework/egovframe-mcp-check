/**
 * Tool for checking eGovFrame architecture compliance
 *
 * 엔진(src/utils/archChecker.ts)의 결과를 LLM 이 읽는 텍스트 리포트로 만든다.
 * 결과 텍스트의 파일 경로는 모두 projectPath 기준 상대 경로("/" 구분자) 로 쓰고 절대 경로는 쓰지 않는다
 * (사용자가 넘긴 projectPath 를 입력 검증 오류 메시지에 되돌려 주는 것은 예외).
 */

import { existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import * as path from "node:path";
import type {
  ArchCheckResult,
  ArchCheckSummary,
  BuildModuleCheck,
  DaoStyle,
  ProjectCheckSummary,
  RequiredLibraryCheck,
  RuntimeGeneration,
  SkippedFile,
  SkippedReason,
} from "../shared/archCheck.js";
import { checkEgovArchitecture, exportArchResults } from "../utils/archChecker.js";

export interface CheckArchitectureOptions {
  projectPath: string;
  exportResults?: boolean;
  /** 실행환경 세대 수동 지정 — 생략하면 빌드 파일에서 판정한 세대(파일이 속한 모듈 → 프로젝트)를 쓴다 */
  runtimeGeneration?: RuntimeGeneration;
  /** ripgrep 실행 파일 경로 — 없거나 존재하지 않으면 엔진이 fs 재귀 탐색으로 대체한다 */
  rgPath?: string;
}

/** 레이어별 실패 파일 목록의 최대 표시 수 */
export const FAILED_FILES_LIMIT = 30;

/** Skipped 사유별 파일의 최대 표시 수 */
const SKIPPED_FILES_LIMIT = 10;

/** 정보 항목(데이터 접근 설정 finding, 미분류 파일)의 최대 표시 수 */
const INFO_ITEMS_LIMIT = 20;

/** 모듈이 이 수를 넘으면 OK 모듈은 한 줄로 접는다 */
const DETAILED_MODULES_LIMIT = 15;

/** 모듈을 접을 때 이름을 나열하는 최대 수 */
const FOLDED_MODULE_NAMES_LIMIT = 10;

const DAO_STYLE_LABELS: Record<DaoStyle, string> = {
  ibatisDao: "iBatis DAO",
  mybatisDao: "MyBatis DAO",
  mapperInterface: "Mapper IF",
};

/** DAO / Mapper 레이어에서 판정 대상에서 뺀 사유의 설명 */
const SKIPPED_REASON_LABELS: Record<SkippedReason, string> = {
  abstract: "abstract class (judged through its subclasses)",
  configuration: "@Configuration class",
  "not-data-access": "*Mapper class without eGov base class or stereotype (e.g. RowMapper)",
  "spring-data": "Spring Data repository",
  mapstruct: "MapStruct mapper",
  "base-class": "base class extended by other DAOs (judged through its children)",
  "not-a-class": "not a class (annotation / enum / record)",
  unreadable: "unreadable file",
};

const CSV_LAYERS = ["Controller", "Service", "DAO", "Project"] as const;

/** 절대 경로를 projectPath 기준 상대 경로("/" 구분자) 로 바꾼다 */
function relativePath(projectPath: string, filePath: string): string {
  const rel = path.relative(projectPath, filePath);
  return (rel === "" ? path.basename(filePath) : rel).split(path.sep).join("/");
}

/** 엔진이 만든 자유 텍스트(오류 메시지 등)에 섞인 프로젝트 절대 경로를 가린다 */
function hideProjectPath(projectPath: string, text: string): string {
  return text.split(projectPath).join("<projectPath>");
}

/** 엔진의 CSV 파일 이름 날짜 접미어와 같은 규칙 (YYYY-MM-DD) */
function csvDateStamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-").split("T")[0];
}

/** 레이어가 점검되지 않은(엔진 오류) 경우의 공통 안내 */
function notChecked(label: string): string[] {
  return [``, `${label}`, `  not checked`];
}

/** "Total: n | Passed: n ✓ | Failed: n ✗ [| Skipped: n]" */
function layerCounts(summary: ArchCheckSummary, withSkipped: boolean): string {
  const base = `Total: ${summary.totalFiles} | Passed: ${summary.passedFiles} ✓ | Failed: ${summary.failedFiles} ✗`;
  return withSkipped ? `${base} | Skipped: ${summary.skipped?.length ?? 0}` : base;
}

/**
 * 실패 파일 목록을 최대 FAILED_FILES_LIMIT 개까지 출력한다.
 * describe 는 실패한 파일 1건의 사유 문자열(접두어 "✗ <rel path>" 뒤에 붙는 부분)을 돌려준다.
 */
function failedFileLines(
  projectPath: string,
  summary: ArchCheckSummary,
  describe: (r: ArchCheckResult) => string,
): string[] {
  const failed = summary.results.filter((r) => r.result !== "OK");
  if (failed.length === 0) {
    return [];
  }
  const lines = [`  Failed files:`];
  for (const r of failed.slice(0, FAILED_FILES_LIMIT)) {
    lines.push(`    ✗ ${relativePath(projectPath, r.filePath)}${describe(r)}`);
  }
  if (failed.length > FAILED_FILES_LIMIT) {
    lines.push(
      `    ... and ${failed.length - FAILED_FILES_LIMIT} more (set exportResults: true for the full list in CSV)`,
    );
  }
  return lines;
}

/** Skipped 파일을 reason 별로 묶어 "reason — 설명 (count): 상대 경로 최대 10개, ..." 로 출력한다 */
function skippedFileLines(projectPath: string, skipped: SkippedFile[] | undefined): string[] {
  if (!skipped || skipped.length === 0) {
    return [];
  }
  const byReason = new Map<SkippedReason, SkippedFile[]>();
  for (const s of skipped) {
    const files = byReason.get(s.reason) ?? [];
    files.push(s);
    byReason.set(s.reason, files);
  }
  const lines = [`  Skipped files (not judged):`];
  for (const [reason, files] of byReason) {
    const shown = files
      .slice(0, SKIPPED_FILES_LIMIT)
      .map((s) => {
        const detail = s.detail ? ` (${hideProjectPath(projectPath, s.detail)})` : "";
        return `${relativePath(projectPath, s.filePath)}${detail}`;
      })
      .join(", ");
    const more = files.length > SKIPPED_FILES_LIMIT ? `, ... and ${files.length - SKIPPED_FILES_LIMIT} more` : "";
    lines.push(`    - ${reason} — ${SKIPPED_REASON_LABELS[reason] ?? reason} (${files.length}): ${shown}${more}`);
  }
  return lines;
}

/** 필수 라이브러리 1종을 "name: status[ via a > b | (evidence)]" 로 */
function formatRequiredLibrary(lib: RequiredLibraryCheck): string {
  let text = `${lib.name}: ${lib.status}`;
  if ((lib.status === "transitive" || lib.status === "excluded") && lib.via && lib.via.length > 0) {
    text += ` via ${lib.via.join(" > ")}`;
  } else if ((lib.status === "missing" || lib.status === "unknown") && lib.evidence) {
    text += ` (${lib.evidence})`;
  }
  return text;
}

/** 빌드 모듈 1개의 상세 출력 행 */
function moduleLines(module: BuildModuleCheck): string[] {
  const runtime = module.runtime;
  const lines = [
    `  - ${module.buildFile} [${module.buildTool}] ${module.result} — runtime ${runtime.version ?? "unknown"} (${runtime.generation}, ${runtime.source})`,
  ];
  if (module.aggregate) {
    lines.push(`      (aggregate build file — not judged)`);
  } else if (module.requiredLibraries.length > 0) {
    lines.push(`      ${module.requiredLibraries.map(formatRequiredLibrary).join("; ")}`);
  }
  // 집계 모듈의 "aggregate pom" 류 note 는 바로 위 안내와 중복이므로 뺀다
  const notes = (module.notes ?? []).filter((note) => !(module.aggregate && /^aggregate/.test(note)));
  for (const note of notes) {
    lines.push(`      note: ${note}`);
  }
  return lines;
}

/** 모듈 목록 — 많으면 OK 모듈은 한 줄로 접고 나머지만 상세 출력한다 */
function modulesLines(modules: BuildModuleCheck[]): string[] {
  if (modules.length === 0) {
    return [`  Modules: No Maven/Gradle build files found`];
  }
  const lines = [`  Modules:`];
  const detailed = modules.length <= DETAILED_MODULES_LIMIT ? modules : modules.filter((m) => m.result !== "OK");
  for (const module of detailed) {
    lines.push(...moduleLines(module));
  }
  const folded = modules.filter((m) => !detailed.includes(m));
  if (folded.length > 0) {
    const names = folded.slice(0, FOLDED_MODULE_NAMES_LIMIT).map((m) => m.buildFile);
    const more = folded.length > FOLDED_MODULE_NAMES_LIMIT ? `, ... and ${folded.length - FOLDED_MODULE_NAMES_LIMIT} more` : "";
    lines.push(`  - ${folded.length} modules OK (all 4 required libraries resolved): ${names.join(", ")}${more}`);
  }
  return lines;
}

/** 정보 항목 목록을 최대 INFO_ITEMS_LIMIT 개까지 출력하고 넘는 수를 안내한다 */
function cappedInfoLines(items: string[], indent: string): string[] {
  const lines = items.slice(0, INFO_ITEMS_LIMIT).map((item) => `${indent}${item}`);
  if (items.length > INFO_ITEMS_LIMIT) {
    lines.push(
      `${indent}... and ${items.length - INFO_ITEMS_LIMIT} more (full list in Result_Project_<date>.csv with exportResults: true)`,
    );
  }
  return lines;
}

/** "🏗️ Project (build files)" 섹션 */
function projectSection(projectPath: string, project: ProjectCheckSummary | undefined): string[] {
  if (!project) {
    return notChecked(`🏗️ Project (build files):`);
  }
  const lines = [
    ``,
    `🏗️ Project (build files):`,
    `  Runtime: ${project.version ?? "unknown"} (${project.generation}) · Result: ${project.result}`,
    `  Legend — Result: OK = all 4 required libraries resolved; NotFound = a required library is missing or excluded, or versions are inconsistent; Unknown = could not be resolved (not counted as failure); Skipped = aggregate build file.`,
    `  Legend — library status: direct | transitive via <path> | excluded (cut by an <exclusion>) | missing | unknown (unresolvable, not a failure). Runtime source: property | bom | dependency-version | artifact-pattern | manual | none.`,
  ];

  const vc = project.versionConsistency;
  const vcState = vc.state === "pass" ? "PASS" : vc.state === "fail" ? "FAIL" : "n/a (not judged)";
  lines.push(`  Version consistency: ${vcState}${vc.evidence ? ` (${vc.evidence})` : ""}`);

  lines.push(...modulesLines(project.modules));

  lines.push(`  Data access configuration (informational, does not affect results):`);
  const config = project.dataAccessConfig;
  if (!config || (config.findings.length === 0 && config.warnings.length === 0)) {
    lines.push(`    none found`);
  } else {
    lines.push(
      ...cappedInfoLines(
        config.findings.map((f) => `- ${f.kind}: ${relativePath(projectPath, f.filePath)} — ${f.evidence}`),
        "    ",
      ),
    );
    for (const warning of config.warnings) {
      lines.push(`    ⚠ ${warning}`);
    }
  }

  const unclassified = project.unclassifiedDataAccessFiles ?? [];
  if (unclassified.length > 0) {
    lines.push(`  Unclassified data-access files (informational — use JdbcTemplate/SqlSession/EntityManager outside the DAO / Mapper layer):`);
    lines.push(...cappedInfoLines(unclassified.map((f) => `- ${f.relativePath}: ${f.evidence}`), "    "));
  }

  return lines;
}

/** "🗄️ DAO / Mapper Layer" 섹션 */
function daoSection(projectPath: string, dao: ArchCheckSummary | undefined): string[] {
  if (!dao) {
    return notChecked(`🗄️ DAO / Mapper Layer:`);
  }
  const styleCount = (style: DaoStyle) => dao.results.filter((r) => r.daoStyle === style).length;
  const noStyleCount = dao.results.filter((r) => r.daoStyle === undefined).length;
  const lines = [
    ``,
    `🗄️ DAO / Mapper Layer:`,
    `  ${layerCounts(dao, true)}`,
    `  Styles: iBatis DAO ${styleCount("ibatisDao")}, MyBatis DAO ${styleCount("mybatisDao")}, Mapper IF ${styleCount("mapperInterface")}, no style (no eGov base class or Mapper annotation) ${noStyleCount}`,
    `  Check: Base (eGov base class / Mapper annotation origin) + Bean (@Repository or @Mapper/@EgovMapper) + Version (annotation package matches runtime generation; n/a when the generation is unknown)`,
  ];
  lines.push(
    ...failedFileLines(projectPath, dao, (r) => {
      const style = r.daoStyle ? DAO_STYLE_LABELS[r.daoStyle] : "no style";
      const checks: string[] = [];
      if (!r.check1) checks.push(`Base FAIL (${r.check1Detail ?? "no detail"})`);
      if (!r.check2) checks.push(`Bean FAIL (${r.check2Detail ?? "no detail"})`);
      if (r.check3State === "fail") checks.push(`Version FAIL (${r.check3Detail ?? "no detail"})`);
      return ` [${style}]: ${checks.join("; ")}`;
    }),
  );
  lines.push(...skippedFileLines(projectPath, dao.skipped));
  return lines;
}

/** "🎯 Controller Layer" 섹션 */
function controllerSection(projectPath: string, controller: ArchCheckSummary | undefined): string[] {
  if (!controller) {
    return notChecked(`🎯 Controller Layer:`);
  }
  const lines = [
    ``,
    `🎯 Controller Layer:`,
    `  ${layerCounts(controller, false)}`,
    `  Check: @Controller/@RestController + mapping annotation (class level or on every public method) + does not inject DAO/Dao/Mapper types (DAO belongs in ServiceImpl)`,
  ];
  lines.push(
    ...failedFileLines(projectPath, controller, (r) => {
      const checks: string[] = [];
      if (!r.check1) checks.push("missing @Controller/@RestController");
      if (!r.check2) {
        if (r.methodCount === undefined) {
          checks.push("missing mapping annotation");
        } else if (r.methodCount === 0) {
          checks.push("no mapping annotation (no public methods found)");
        } else {
          checks.push(`mapping annotation on ${r.mappedMethodCount ?? 0}/${r.methodCount} public methods`);
        }
      }
      if (!r.check3) checks.push("injects a DAO/Dao/Mapper type");
      return `: ${checks.join(", ")}`;
    }),
  );
  return lines;
}

/** "⚙️ Service Layer" 섹션 */
function serviceSection(projectPath: string, service: ArchCheckSummary | undefined): string[] {
  if (!service) {
    return notChecked(`⚙️ Service Layer:`);
  }
  const lines = [
    ``,
    `⚙️ Service Layer:`,
    `  ${layerCounts(service, false)}`,
    `  Check: extends EgovAbstractServiceImpl + @Service + implements *Service`,
  ];
  lines.push(
    ...failedFileLines(projectPath, service, (r) => {
      const checks: string[] = [];
      if (!r.check1) checks.push("missing extends EgovAbstractServiceImpl");
      if (!r.check2) checks.push("missing @Service");
      if (!r.check3) checks.push("missing implements *Service");
      return `: ${checks.join(", ")}`;
    }),
  );
  return lines;
}

/**
 * Check eGovFrame project architecture compliance
 */
export async function checkArchitecture(options: CheckArchitectureOptions): Promise<string> {
  const { projectPath, exportResults = false, runtimeGeneration, rgPath } = options;

  if (!projectPath || !projectPath.trim()) {
    throw new Error("projectPath is required");
  }

  // 존재하지 않는 경로가 깊은 호출부에서 모호하게 실패하지 않도록 선제 검증
  let pathStat;
  try {
    pathStat = await stat(projectPath);
  } catch {
    throw new Error(`projectPath does not exist or is not accessible: ${projectPath}`);
  }
  if (!pathStat.isDirectory()) {
    throw new Error(`projectPath must be a directory: ${projectPath}`);
  }

  // 엔진의 모듈별 세대 조회는 수집한 절대 경로와 projectPath 를 세그먼트로 비교하므로 절대 경로로 통일한다
  const resolvedProjectPath = path.resolve(projectPath);

  // Progress messages (" with ripgrep" 이 붙으면 ripgrep 경로로 수집한 것이다)
  const progressMessages: string[] = [];
  const progressCallback = (message: string) => {
    progressMessages.push(message);
  };

  // Perform architecture check
  let results;
  try {
    results = await checkEgovArchitecture(resolvedProjectPath, progressCallback, { rgPath, runtimeGeneration });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Architecture check failed: ${hideProjectPath(resolvedProjectPath, message)}`);
  }

  // Overall statistics — Controller + Service + DAO (Project 는 파일 집계에 넣지 않는다)
  const layers = [results.Controller, results.Service, results.DAO];
  const totalFiles = layers.reduce((sum, s) => sum + (s?.totalFiles ?? 0), 0);
  const passedFiles = layers.reduce((sum, s) => sum + (s?.passedFiles ?? 0), 0);
  const failedFiles = layers.reduce((sum, s) => sum + (s?.failedFiles ?? 0), 0);
  const skippedFiles = layers.reduce((sum, s) => sum + (s?.skipped?.length ?? 0), 0);
  const complianceRate = totalFiles > 0 ? `${Math.round((passedFiles / totalFiles) * 100)}%` : "n/a (no files checked)";

  // Export to CSV if requested. 점검은 이미 끝났으므로 CSV 쓰기 실패는 리포트를 버리지 않고 경고로만 남긴다
  // (총 파일이 0 이어도 project 결과가 있으면 Result_Project CSV 가 쓰인다)
  let exportedFiles: string[] = [];
  let exportError: string | undefined;
  if (exportResults) {
    try {
      await exportArchResults(results, resolvedProjectPath);
      const stamp = csvDateStamp();
      exportedFiles = CSV_LAYERS.map((layer) => `Result_${layer}_${stamp}.csv`).filter((name) =>
        existsSync(path.join(resolvedProjectPath, name)),
      );
      progressMessages.push(`📄 Results exported to CSV files in the project root`);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException | undefined)?.code;
      exportError = `⚠ CSV export failed${code ? ` (${code})` : ""} — check write permission on the project root. The analysis results above are complete.`;
      progressMessages.push(exportError);
    }
  }

  const output = [
    `✅ eGovFrame Architecture Check Completed`,
    ``,
    `📊 Overall Statistics (Controller + Service + DAO / Mapper):`,
    `  • Total Files: ${totalFiles}`,
    `  • Passed: ${passedFiles} ✓`,
    `  • Failed: ${failedFiles} ✗`,
    `  • Compliance Rate: ${complianceRate}`,
    `  • Skipped (not judged): ${skippedFiles}`,
  ];

  output.push(...projectSection(resolvedProjectPath, results.project));
  output.push(...daoSection(resolvedProjectPath, results.DAO));
  output.push(...controllerSection(resolvedProjectPath, results.Controller));
  output.push(...serviceSection(resolvedProjectPath, results.Service));

  output.push(``, `Progress:`, ...progressMessages.map((msg) => `  ${msg}`));

  if (exportResults) {
    if (exportError) {
      output.push(``, `📁 Exported Files: none (${exportError})`);
    } else {
      output.push(``, `📁 Exported Files (in the project root):`);
      output.push(...exportedFiles.map((name) => `  • ${name}`));
      if (exportedFiles.length < CSV_LAYERS.length) {
        output.push(`  (a layer CSV is not written when that layer has 0 results)`);
      }
    }
  }

  output.push(
    ``,
    `💡 Tips:`,
    `  • Use exportResults: true to save detailed results to CSV files in the project directory`,
    `  • Use runtimeGeneration ("3.x" | "4.x" | "5.x") to override the generation detected from build files`,
    `  • Review failed files to ensure eGovFrame standards compliance`,
  );

  return output.join("\n");
}
