/**
 * archChecker 순수 헬퍼 단위 테스트.
 */
import { describe, expect, it } from "vitest";

import {
	findPatternIgnoringComments,
	findRegexPatternIgnoringComments,
	formatCheckValue,
	getLayerCheckInfo,
	globToRegex,
} from "../src/utils/archChecker.js";

describe("globToRegex", () => {
	it("'*Controller.java' 글롭이 경로 끝의 Controller 파일에 매칭된다", () => {
		const re = globToRegex("*Controller.java");
		expect(re.test("/proj/src/main/java/FooController.java")).toBe(true);
		expect(re.test("/proj/src/main/java/FooService.java")).toBe(false);
	});

	it("'.' 는 리터럴로 취급된다 — 'Controller_java' 같은 변형은 매칭되지 않는다", () => {
		const re = globToRegex("*Controller.java");
		expect(re.test("/proj/FooController_java")).toBe(false);
		expect(re.test("/proj/FooControllerXjava")).toBe(false);
	});

	it("확장자 뒤에 문자가 붙으면 매칭되지 않는다 (끝 앵커)", () => {
		const re = globToRegex("*Controller.java");
		expect(re.test("/proj/FooController.javax")).toBe(false);
	});
});

describe("findPatternIgnoringComments", () => {
	it("코드 라인의 패턴은 찾는다", () => {
		expect(findPatternIgnoringComments(["@Controller", "public class A {}"], "@Controller")).toBe(true);
	});

	it("// 주석 안의 패턴은 무시한다", () => {
		expect(findPatternIgnoringComments(["// @Controller", "public class A {}"], "@Controller")).toBe(false);
	});

	it("블록 주석(*) 안의 패턴은 무시한다", () => {
		expect(findPatternIgnoringComments(["/* legacy", " * @Controller", " */"], "@Controller")).toBe(false);
	});

	it("빈 입력은 false", () => {
		expect(findPatternIgnoringComments([], "@Controller")).toBe(false);
	});
});

describe("findRegexPatternIgnoringComments", () => {
	it("코드 라인의 정규식 매칭은 찾고 주석은 무시한다", () => {
		const pattern = /extends\s+EgovAbstractServiceImpl/;
		expect(
			findRegexPatternIgnoringComments(
				["public class A extends EgovAbstractServiceImpl {"],
				pattern,
			),
		).toBe(true);
		expect(
			findRegexPatternIgnoringComments(
				["// public class A extends EgovAbstractServiceImpl {"],
				pattern,
			),
		).toBe(false);
	});
});

describe("formatCheckValue", () => {
	it("사용 중인 체크는 PASS/FAIL, 미사용 체크는 '-'", () => {
		expect(formatCheckValue(true, true)).toBe("PASS");
		expect(formatCheckValue(false, true)).toBe("FAIL");
		expect(formatCheckValue(true, false)).toBe("-");
		expect(formatCheckValue(false, false)).toBe("-");
	});
});

describe("getLayerCheckInfo", () => {
	it("4개 레이어 모두 6개 컬럼과 check 사용 여부를 반환한다", () => {
		for (const layer of ["Controller", "Service", "DAO", "Mapper"] as const) {
			const info = getLayerCheckInfo(layer);
			expect(info.columns).toHaveLength(6);
			expect(info.used).toHaveLength(3);
		}
		expect(getLayerCheckInfo("Service").used).toEqual([true, true, true]);
		expect(getLayerCheckInfo("Mapper").used).toEqual([true, false, false]);
	});
});
