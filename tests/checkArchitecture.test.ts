/**
 * egov_check_compliance 도구 동작 테스트 — 임시 프로젝트 fixture 기반.
 * 레이어별 판정 규칙 자체는 엔진 테스트(tests/archChecker.test.ts, tests/daoCheck.test.ts)가 다루고,
 * 여기서는 엔진 결과가 텍스트 리포트로 어떻게 드러나는지와 입력 검증·stdout 청결·로그 gating 을 확인한다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import { pathToFileURL } from "node:url";
import {
  FAILED_FILES_LIMIT,
  MAX_FILE_LINKS,
  checkArchitecture,
  failedFileResourceLinks,
} from "../src/tools/checkArchitecture.js";
import { rgPath as packagedRgPath } from "@vscode/ripgrep";
import { existsSync } from "node:fs";

/** 저장소에 설치된 @vscode/ripgrep 플랫폼 패키지의 rg 가 있으면 ripgrep 경로도 검증한다 */
const bundledRg = typeof packagedRgPath === "string" && existsSync(packagedRgPath) ? packagedRgPath : undefined;

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "egov-check-"));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

async function writeFile(rel: string, content: string) {
  const abs = path.join(tmpDir, rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, content, "utf-8");
}

const SRC = "src/main/java/egov/sample";
const EGOV4 = "org.egovframe.rte.psl.dataaccess";

/** `package …;` + import 줄 + 본문 */
function java(pkg: string, imports: string[], body: string): string {
  return [`package ${pkg};`, "", ...imports.map((name) => `import ${name};`), "", body, ""].join("\n");
}

const compliantController = java(
  "egov.sample.web",
  ["org.springframework.stereotype.Controller", "org.springframework.web.bind.annotation.RequestMapping"],
  ['@Controller', '@RequestMapping("/foo")', "public class FooController {", "\tpublic String list() {", '\t\treturn "foo/list";', "\t}", "}"].join("\n"),
);

const nonCompliantController = java(
  "egov.sample.web",
  [],
  ["public class BarController {", "\tpublic String list() {", '\t\treturn "bar/list";', "\t}", "}"].join("\n"),
);

/** 4.x pom — org.egovframe.rte.version 속성 + ptl.mvc 만 직접 선언 (psl-dataaccess 는 missing) */
const pom4x = `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
<modelVersion>4.0.0</modelVersion>
<groupId>egovframework</groupId><artifactId>sample</artifactId><version>1.0.0</version><packaging>war</packaging>
<properties><org.egovframe.rte.version>4.3.0</org.egovframe.rte.version></properties>
<dependencies>
<dependency><groupId>org.egovframe.rte</groupId><artifactId>org.egovframe.rte.ptl.mvc</artifactId><version>\${org.egovframe.rte.version}</version></dependency>
</dependencies>
</project>
`;

/** DAO / Mapper + Project 시나리오 공통 fixture */
async function writeDaoProjectFixture() {
  await writeFile("pom.xml", pom4x);
  // (a) org.egovframe.rte.psl.dataaccess.mapper.Mapper 를 import 한 @Mapper 인터페이스 → Mapper IF
  await writeFile(
    `${SRC}/mapper/SampleMapper.java`,
    java("egov.sample.mapper", [`${EGOV4}.mapper.Mapper`], '@Mapper("sampleMapper")\npublic interface SampleMapper {\n}'),
  );
  // (b) 소문자 *Dao.java — @Repository + EgovAbstractMapper 상속 → MyBatis DAO
  await writeFile(
    `${SRC}/dao/BoardDao.java`,
    java(
      "egov.sample.dao",
      [`${EGOV4}.EgovAbstractMapper`, "org.springframework.stereotype.Repository"],
      '@Repository("boardDao")\npublic class BoardDao extends EgovAbstractMapper {\n}',
    ),
  );
  // (c) @Configuration 이 붙은 *Mapper.java 설정 클래스 → skipped(configuration)
  await writeFile(
    `${SRC}/config/EgovConfigMapper.java`,
    java("egov.sample.config", ["org.springframework.context.annotation.Configuration"], "@Configuration\npublic class EgovConfigMapper {\n}"),
  );
  // (d) 어노테이션 없는 *DAO.java → Base/Bean 실패
  await writeFile(`${SRC}/dao/PlainDAO.java`, java("egov.sample.dao", [], "public class PlainDAO {\n}"));
}

describe("checkArchitecture — projectPath 검증", () => {
  it("존재하지 않는 경로는 명확한 에러로 거부한다", async () => {
    await expect(checkArchitecture({ projectPath: path.join(tmpDir, "no-such-dir") })).rejects.toThrow(/does not exist/);
  });

  it("디렉터리가 아닌 파일 경로는 거부한다", async () => {
    const filePath = path.join(tmpDir, "a-file.txt");
    await fs.writeFile(filePath, "x", "utf-8");
    await expect(checkArchitecture({ projectPath: filePath })).rejects.toThrow(/must be a directory/);
  });

  it("빈 projectPath 는 거부한다", async () => {
    await expect(checkArchitecture({ projectPath: "  " })).rejects.toThrow(/projectPath is required/);
  });
});

describe("checkArchitecture — Controller 레이어", () => {
  it("규약을 지킨 Controller 는 통과, 어긋난 Controller 는 상대 경로와 사유로 보고한다", async () => {
    await writeFile(`${SRC}/web/FooController.java`, compliantController);
    await writeFile(`${SRC}/web/BarController.java`, nonCompliantController);

    const { text: out } = await checkArchitecture({ projectPath: tmpDir });

    expect(out).toMatch(/Total Files: 2/);
    expect(out).toMatch(/Passed: 1 ✓/);
    expect(out).toMatch(/Failed: 1 ✗/);
    expect(out).toContain("🎯 Controller Layer:");
    expect(out).toContain(`✗ ${SRC}/web/BarController.java: missing @Controller/@RestController, mapping annotation on 0/1 public methods`);
    expect(out).not.toContain(tmpDir);
  });

  it("점검 대상 파일이 없으면 0건으로 정상 완료하고 빌드 파일 부재를 알린다", async () => {
    const { text: out } = await checkArchitecture({ projectPath: tmpDir });
    expect(out).toMatch(/Total Files: 0/);
    expect(out).toContain("Compliance Rate: n/a (no files checked)");
    expect(out).toContain("No Maven/Gradle build files found");
    expect(out).toContain("Runtime: unknown (unknown) · Result: Unknown");
  });
});

describe("checkArchitecture — DAO / Mapper 레이어와 Project 점검", () => {
  it("Mapper IF·소문자 Dao 통과, 설정 클래스는 skipped, 어노테이션 없는 DAO 는 사유와 함께 실패한다", async () => {
    await writeDaoProjectFixture();

    const { text: out } = await checkArchitecture({ projectPath: tmpDir });

    expect(out).toContain("🗄️ DAO / Mapper Layer:");
    expect(out).toContain("Total: 3 | Passed: 2 ✓ | Failed: 1 ✗ | Skipped: 1");
    expect(out).toContain("Styles: iBatis DAO 0, MyBatis DAO 1, Mapper IF 1, no style (no eGov base class or Mapper annotation) 1");
    expect(out).toContain(`✗ ${SRC}/dao/PlainDAO.java [no style]: Base FAIL (no egov base); Bean FAIL (no @Repository)`);
    expect(out).toContain(`- configuration — @Configuration class (1): ${SRC}/config/EgovConfigMapper.java`);
    // 통과한 파일은 실패 목록에 나오지 않는다
    expect(out).not.toMatch(/✗ .*SampleMapper\.java/);
    expect(out).not.toMatch(/✗ .*BoardDao\.java/);
    // 전체 통계는 Controller + Service + DAO 합계 (Project 는 제외)
    expect(out).toMatch(/Total Files: 3/);
    expect(out).toMatch(/Skipped \(not judged\): 1/);
    expect(out).not.toContain(tmpDir);
  });

  it("Project 섹션에 세대 4.x·pom.xml 모듈 행·필수 라이브러리 missing 이 나온다", async () => {
    await writeDaoProjectFixture();

    const { text: out } = await checkArchitecture({ projectPath: tmpDir });

    expect(out).toContain("🏗️ Project (build files):");
    expect(out).toContain("Runtime: 4.3.0 (4.x) · Result: NotFound");
    expect(out).toContain("Version consistency: PASS (4.3.0)");
    expect(out).toContain("- pom.xml [maven] NotFound — runtime 4.3.0 (4.x, property)");
    expect(out).toContain("ptl-mvc: direct");
    expect(out).toContain("fdl-cmmn: transitive via ptl-mvc > fdl-cmmn");
    expect(out).toMatch(/psl-dataaccess: missing \(/);
    expect(out).toContain("Data access configuration (informational, does not affect results):");
    expect(out).toContain("Legend — Result: OK = all 4 required libraries resolved");
  });

  it("runtimeGeneration: '5.x' 를 넘기면 4.x @Mapper 인터페이스가 Version 체크에서 실패한다", async () => {
    await writeDaoProjectFixture();

    const { text: out } = await checkArchitecture({ projectPath: tmpDir, runtimeGeneration: "5.x" });

    expect(out).toContain(`✗ ${SRC}/mapper/SampleMapper.java [Mapper IF]: Version FAIL (@Mapper → 5.x requires @EgovMapper)`);
    expect(out).toContain("Total: 3 | Passed: 1 ✓ | Failed: 2 ✗ | Skipped: 1");
    expect(out).toContain("(5.x, manual)");
  });
});

/** 규약을 어긴 Controller n 개 (Bar1Controller … Bar<n>Controller) */
async function writeFailingControllers(n: number) {
  for (let i = 1; i <= n; i++) {
    await writeFile(`${SRC}/web/Bar${i}Controller.java`, nonCompliantController.replace("BarController", `Bar${i}Controller`));
  }
}

describe("checkArchitecture — 실패 파일 resource_link", () => {
  it("실패 파일마다 절대 경로 file:// URI·상대 경로·사유를 failedFiles 로 돌려준다 (Project → DAO → Controller 순)", async () => {
    await writeDaoProjectFixture();
    await writeFile(`${SRC}/web/FooController.java`, compliantController);
    await writeFile(`${SRC}/web/BarController.java`, nonCompliantController);

    const { text, failedFiles, resourceLinks } = await checkArchitecture({ projectPath: tmpDir });

    expect(failedFiles).toEqual([
      {
        layer: "Project",
        relativePath: "pom.xml",
        uri: pathToFileURL(path.join(tmpDir, "pom.xml")).href,
        reason: expect.stringMatching(/^Project \[maven\] NotFound: psl-dataaccess: missing/),
      },
      {
        layer: "DAO",
        relativePath: `${SRC}/dao/PlainDAO.java`,
        uri: pathToFileURL(path.join(tmpDir, SRC, "dao/PlainDAO.java")).href,
        reason: "DAO / Mapper [no style]: Base FAIL (no egov base); Bean FAIL (no @Repository)",
      },
      {
        layer: "Controller",
        relativePath: `${SRC}/web/BarController.java`,
        uri: pathToFileURL(path.join(tmpDir, SRC, "web/BarController.java")).href,
        reason: "Controller: missing @Controller/@RestController, mapping annotation on 0/1 public methods",
      },
    ]);
    // 상한(기본 100) 안이면 실패 파일 전부가 같은 순서로 resource_link 가 된다
    expect(resourceLinks).toEqual(failedFileResourceLinks(failedFiles));
    expect(text).toContain("🔗 Failed File Links: all 3 failed files are attached as resource_link blocks");
    // 텍스트 리포트에는 여전히 절대 경로가 없다
    expect(text).not.toContain(tmpDir);
  });

  it("실패가 없으면 failedFiles·resourceLinks 가 비어 있고 링크 섹션도 없다", async () => {
    await writeFile(`${SRC}/web/FooController.java`, compliantController);
    const { text, failedFiles, resourceLinks } = await checkArchitecture({ projectPath: tmpDir });
    expect(failedFiles).toEqual([]);
    expect(resourceLinks).toEqual([]);
    expect(text).not.toContain("🔗 Failed File Links");
  });

  it(`텍스트 목록은 레이어당 ${FAILED_FILES_LIMIT}개, 링크는 전체 ${MAX_FILE_LINKS}개까지만 내고 나머지 수와 방법을 알린다`, async () => {
    const count = Math.max(FAILED_FILES_LIMIT, MAX_FILE_LINKS) + 5;
    await writeFailingControllers(count);

    const { text, failedFiles, resourceLinks } = await checkArchitecture({ projectPath: tmpDir });

    expect(failedFiles).toHaveLength(count);
    expect(text.match(/✗ .*Controller\.java/g)).toHaveLength(FAILED_FILES_LIMIT);
    expect(text).toContain(`... and ${count - FAILED_FILES_LIMIT} more (see "🔗 Failed File Links" below`);
    expect(resourceLinks).toEqual(failedFileResourceLinks(failedFiles.slice(0, MAX_FILE_LINKS)));
    expect(text).toContain(
      `🔗 Failed File Links: ${MAX_FILE_LINKS} of ${count} failed files are attached as resource_link blocks (at most ${MAX_FILE_LINKS})`,
    );
    expect(text).toContain(`The remaining ${count - MAX_FILE_LINKS} files are not linked.`);
    expect(text).toContain("Use exportResults: true to write the full list to CSV files");
  });

  it("exportResults: true 면 쓰인 CSV 파일도 resource_link 로 실패 파일 링크 뒤에 붙는다", async () => {
    await writeFailingControllers(3);

    const { text, resourceLinks } = await checkArchitecture({ projectPath: tmpDir, exportResults: true });

    const csvLinks = resourceLinks.filter((l) => l.name.endsWith(".csv"));
    expect(resourceLinks).toHaveLength(3 + csvLinks.length);
    expect(resourceLinks.slice(0, 3).map((l) => l.name)).toEqual([1, 2, 3].map((i) => `${SRC}/web/Bar${i}Controller.java`));
    expect(csvLinks.map((l) => l.name)).toEqual([
      expect.stringMatching(/^Result_Controller_\d{4}-\d{2}-\d{2}\.csv$/),
      expect.stringMatching(/^Result_Project_\d{4}-\d{2}-\d{2}\.csv$/),
    ]);
    for (const link of csvLinks) {
      expect(link.uri).toBe(pathToFileURL(path.join(tmpDir, link.name)).href);
      expect(existsSync(path.join(tmpDir, link.name))).toBe(true);
    }
    expect(csvLinks[0].description).toBe("Full Controller check results (CSV)");
    expect(text).toContain("(each CSV file is also attached as a resource_link block)");
    expect(text).toContain("all 3 failed files are attached");
    expect(text).not.toContain("The remaining");
  });

  it("failedFileResourceLinks 는 failedFiles 를 resource_link 블록으로 1:1 변환한다 (title·mimeType 없음)", () => {
    const uri = pathToFileURL(path.join(tmpDir, "build.gradle")).href;
    const links = failedFileResourceLinks([
      { layer: "DAO", relativePath: `${SRC}/dao/PlainDAO.java`, uri: "file:///p/PlainDAO.java", reason: "DAO / Mapper [no style]: x" },
      { layer: "Project", relativePath: "build.gradle", uri, reason: "Project [gradle] NotFound: y" },
      { layer: "Project", relativePath: "app/build.gradle.kts", uri: "file:///p/app/build.gradle.kts", reason: "z" },
    ]);

    expect(links).toEqual([
      { type: "resource_link", uri: "file:///p/PlainDAO.java", name: `${SRC}/dao/PlainDAO.java`, description: "DAO / Mapper [no style]: x" },
      { type: "resource_link", uri, name: "build.gradle", description: "Project [gradle] NotFound: y" },
      { type: "resource_link", uri: "file:///p/app/build.gradle.kts", name: "app/build.gradle.kts", description: "z" },
    ]);
  });
});

describe("checkArchitecture — CSV 내보내기", () => {
  it("exportResults: true 면 결과가 있는 레이어와 Project 의 CSV 만 프로젝트 루트에 쓴다", async () => {
    await writeDaoProjectFixture();
    await writeFile(`${SRC}/web/FooController.java`, compliantController);

    const { text: out } = await checkArchitecture({ projectPath: tmpDir, exportResults: true });

    const names = (await fs.readdir(tmpDir)).filter((n) => n.endsWith(".csv")).sort();
    expect(names.some((n) => /^Result_Controller_.*\.csv$/.test(n))).toBe(true);
    expect(names.some((n) => /^Result_DAO_.*\.csv$/.test(n))).toBe(true);
    expect(names.some((n) => /^Result_Project_.*\.csv$/.test(n))).toBe(true);
    // Service 결과가 0건이면 Service CSV 는 쓰이지 않는다
    expect(names.some((n) => /^Result_Service_/.test(n))).toBe(false);
    expect(names).toHaveLength(3);

    expect(out).toContain("📁 Exported Files (in the project root):");
    // 실제로 쓰인 파일만 나열하고, 쓰이지 않은 Service CSV 는 나열하지 않는다
    expect(out).toMatch(/• Result_Controller_\d{4}-\d{2}-\d{2}\.csv/);
    expect(out).toMatch(/• Result_DAO_\d{4}-\d{2}-\d{2}\.csv/);
    expect(out).toMatch(/• Result_Project_\d{4}-\d{2}-\d{2}\.csv/);
    expect(out).not.toMatch(/• Result_Service_/);
    expect(out).not.toContain(tmpDir);
  });
});

describe("checkArchitecture — CSV 내보내기 실패", () => {
  it.skipIf(process.platform === "win32" || (typeof process.getuid === "function" && process.getuid() === 0))(
    "프로젝트 루트에 쓸 수 없으면 리포트는 그대로 돌려주고 경고만 남긴다 (절대 경로 없음)",
    async () => {
      await writeFile(`${SRC}/web/FooController.java`, compliantController);
      // 엔진이 쓰기 실패를 stderr 로 남기므로 테스트 출력에서는 숨긴다
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      await fs.chmod(tmpDir, 0o555);
      try {
        const { text: out } = await checkArchitecture({ projectPath: tmpDir, exportResults: true });
        expect(out).toContain("✅ eGovFrame Architecture Check Completed");
        expect(out).toMatch(/Total Files: 1/);
        expect(out).toContain("⚠ CSV export failed (EACCES)");
        expect(out).toContain("📁 Exported Files: none");
        expect(out).not.toContain(tmpDir);
      } finally {
        await fs.chmod(tmpDir, 0o755);
        errorSpy.mockRestore();
      }
    },
  );
});

describe("checkArchitecture — 경로 처리", () => {
  it("상대 projectPath 도 절대 경로와 같은 모듈별 판정을 낸다", async () => {
    await writeDaoProjectFixture();
    // vitest 워커에서는 chdir 을 못 쓰므로 현재 cwd 기준 상대 경로를 만들어 넘긴다
    const relativeProjectPath = path.relative(process.cwd(), tmpDir);
    expect(path.isAbsolute(relativeProjectPath)).toBe(false);

    const relativeReport = await checkArchitecture({ projectPath: relativeProjectPath });
    const absoluteReport = await checkArchitecture({ projectPath: tmpDir });
    const relative = relativeReport.text;

    expect(relative).toBe(absoluteReport.text);
    expect(relativeReport.failedFiles).toEqual(absoluteReport.failedFiles);
    expect(relativeReport.resourceLinks).toEqual(absoluteReport.resourceLinks);
    expect(relative).toContain("- pom.xml [maven] NotFound — runtime 4.3.0 (4.x, property)");
    expect(relative).not.toContain(tmpDir);
  });

  it.skipIf(!bundledRg)("'-' 로 시작하는 디렉터리 이름도 ripgrep 옵션으로 해석되지 않고 프로젝트 안만 수집한다", async () => {
    // 형제 디렉터리의 Controller 는 수집되면 안 된다
    await writeFile("outside/src/main/java/egov/OutController.java", compliantController);
    await writeFile(`-x/${SRC}/web/FooController.java`, compliantController);

    const { text: out } = await checkArchitecture({ projectPath: path.join(tmpDir, "-x"), rgPath: bundledRg });

    expect(out).toMatch(/Total Files: 1/);
    expect(out).toContain("with ripgrep");
    expect(out).not.toContain("OutController");
  });

  it.skipIf(!bundledRg)("ripgrep 경로와 fs 대체 경로의 리포트가 같다 (Progress 제외)", async () => {
    await writeDaoProjectFixture();
    await writeFile(`${SRC}/web/BarController.java`, nonCompliantController);

    const withRgReport = await checkArchitecture({ projectPath: tmpDir, rgPath: bundledRg });
    const withFsReport = await checkArchitecture({ projectPath: tmpDir });
    const withRg = withRgReport.text;
    const withFs = withFsReport.text;

    expect(withRgReport.failedFiles).toEqual(withFsReport.failedFiles);

    expect(withRg).toContain("with ripgrep");
    expect(withFs).not.toContain("with ripgrep");
    expect(withRg.replace(/ with ripgrep/g, "")).toBe(withFs);
  });
});

describe("checkArchitecture — stdout 청결", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("점검 한 번 동안 console.log 를 한 번도 호출하지 않는다 (stdout 은 JSON-RPC 채널)", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    await writeDaoProjectFixture();
    await writeFile(`${SRC}/web/BarController.java`, nonCompliantController);

    await checkArchitecture({ projectPath: tmpDir, exportResults: true });

    expect(logSpy).not.toHaveBeenCalled();
  });
});

describe("checkArchitecture — 정보성 로그 gating (EGOV_CHECK_DEBUG)", () => {
  const prevDebug = process.env.EGOV_CHECK_DEBUG;

  afterEach(() => {
    if (prevDebug === undefined) {
      delete process.env.EGOV_CHECK_DEBUG;
    } else {
      process.env.EGOV_CHECK_DEBUG = prevDebug;
    }
    vi.restoreAllMocks();
  });

  it("EGOV_CHECK_DEBUG 미설정 시 파일별 ✅/⏭️/❌/🔍/🚀 로그를 출력하지 않는다", async () => {
    delete process.env.EGOV_CHECK_DEBUG;
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    await writeFile(`${SRC}/web/BarController.java`, nonCompliantController);
    await checkArchitecture({ projectPath: tmpDir });

    const infoLines = spy.mock.calls.map((args) => String(args[0])).filter((m) => /[✅❌🔍🚀]|⏭️/u.test(m));
    expect(infoLines).toEqual([]);
  });

  it("EGOV_CHECK_DEBUG=1 이면 정보성 로그가 출력되고, 어떤 로그에도 절대 경로가 없다", async () => {
    process.env.EGOV_CHECK_DEBUG = "1";
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    await writeDaoProjectFixture();
    await writeFile(`${SRC}/web/BarController.java`, nonCompliantController);
    await checkArchitecture({ projectPath: tmpDir, exportResults: true });

    const allLines = spy.mock.calls.map((args) => args.map(String).join(" "));
    const infoLines = allLines.filter((m) => /[✅❌🔍🚀]|⏭️/u.test(m));
    expect(infoLines.length).toBeGreaterThan(0);
    // 오류 로그·CSV 저장 로그를 포함한 모든 console.error 호출에 tmpDir 절대 경로가 없어야 한다
    expect(allLines.join("\n")).not.toContain(tmpDir);
  });
});
