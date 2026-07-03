/**
 * egov_check_compliance 도구 동작 테스트 — 임시 프로젝트 fixture 기반.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import { checkArchitecture } from "../src/tools/checkArchitecture.js";

let tmpDir: string;

beforeEach(async () => {
	tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "egov-check-"));
});

afterEach(async () => {
	await fs.rm(tmpDir, { recursive: true, force: true });
});

async function writeJava(rel: string, content: string) {
	const abs = path.join(tmpDir, rel);
	await fs.mkdir(path.dirname(abs), { recursive: true });
	await fs.writeFile(abs, content, "utf-8");
}

describe("checkArchitecture — projectPath 검증", () => {
	it("존재하지 않는 경로는 명확한 에러로 거부한다", async () => {
		await expect(
			checkArchitecture({ projectPath: path.join(tmpDir, "no-such-dir") }),
		).rejects.toThrow(/does not exist/);
	});

	it("디렉터리가 아닌 파일 경로는 거부한다", async () => {
		const filePath = path.join(tmpDir, "a-file.txt");
		await fs.writeFile(filePath, "x", "utf-8");
		await expect(checkArchitecture({ projectPath: filePath })).rejects.toThrow(
			/must be a directory/,
		);
	});

	it("빈 projectPath 는 거부한다", async () => {
		await expect(checkArchitecture({ projectPath: "  " })).rejects.toThrow(
			/projectPath is required/,
		);
	});
});

describe("checkArchitecture — 레이어 판정", () => {
	it("규약을 지킨 Controller 는 통과, 어긋난 Controller 는 실패로 집계한다", async () => {
		await writeJava(
			"src/main/java/com/example/web/FooController.java",
			[
				"package com.example.web;",
				"",
				"import org.springframework.stereotype.Controller;",
				"import org.springframework.web.bind.annotation.RequestMapping;",
				"",
				"@Controller",
				"@RequestMapping(\"/foo\")",
				"public class FooController {",
				"\tpublic String list() {",
				"\t\treturn \"foo/list\";",
				"\t}",
				"}",
				"",
			].join("\n"),
		);
		await writeJava(
			"src/main/java/com/example/web/BarController.java",
			[
				"package com.example.web;",
				"",
				"public class BarController {",
				"\tpublic String list() {",
				"\t\treturn \"bar/list\";",
				"\t}",
				"}",
				"",
			].join("\n"),
		);

		const out = await checkArchitecture({ projectPath: tmpDir });

		expect(out).toMatch(/Total Files: 2/);
		expect(out).toMatch(/Passed: 1/);
		expect(out).toMatch(/Failed: 1/);
		expect(out).toMatch(/BarController\.java: missing @Controller/);
	});

	it("점검 대상 파일이 없으면 0건으로 정상 완료한다", async () => {
		const out = await checkArchitecture({ projectPath: tmpDir });
		expect(out).toMatch(/Total Files: 0/);
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

	async function writeNonCompliantController() {
		await writeJava(
			"src/main/java/com/example/web/BarController.java",
			["package com.example.web;", "", "public class BarController {", "\tpublic String list() {", "\t\treturn \"bar/list\";", "\t}", "}", ""].join("\n"),
		);
	}

	it("EGOV_CHECK_DEBUG 미설정 시 파일별 ✅/⏭️/❌ 로그를 출력하지 않는다", async () => {
		delete process.env.EGOV_CHECK_DEBUG;
		const spy = vi.spyOn(console, "error").mockImplementation(() => {});

		await writeNonCompliantController();
		await checkArchitecture({ projectPath: tmpDir });

		const infoLines = spy.mock.calls.map((args) => String(args[0])).filter((m) => /[✅❌🔍🚀]|⏭️/u.test(m));
		expect(infoLines).toEqual([]);
	});

	it("EGOV_CHECK_DEBUG=1 이면 파일별 정보성 로그가 출력된다", async () => {
		process.env.EGOV_CHECK_DEBUG = "1";
		const spy = vi.spyOn(console, "error").mockImplementation(() => {});

		await writeNonCompliantController();
		await checkArchitecture({ projectPath: tmpDir });

		const infoLines = spy.mock.calls.map((args) => String(args[0])).filter((m) => /[✅❌🔍🚀]|⏭️/u.test(m));
		expect(infoLines.length).toBeGreaterThan(0);
		// 절대 경로 대신 basename 만 로그되는지 확인
		expect(infoLines.join("\n")).not.toContain(tmpDir);
	});
});
