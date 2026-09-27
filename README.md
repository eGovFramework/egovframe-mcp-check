# eGovFrame MCP Check

> **eGovFrame 프로젝트의 레이어별 아키텍처 컴플라이언스를 검사하는 미니멀 MCP 서버**

[![eGovFrame](https://img.shields.io/badge/eGovFrame-5.1.0-134F8C?labelColor=white&logo=data:image/svg%2Bxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNzMuMjgyIDE3My4yODIiPjxwYXRoIGZpbGw9IiNmZmYiIGQ9Ik0xNzMuMjgyIDg2LjY1YzAgNDcuODQ0LTM4Ljc5NCA4Ni42MzItODYuNjQ2IDg2LjYzMkMzOC43OTkgMTczLjI4MiAwIDEzNC40OTQgMCA4Ni42NSAwIDM4Ljc4OCAzOC43OTkgMCA4Ni42MzYgMGM0Ny44NTIgMCA4Ni42NDYgMzguNzg4IDg2LjY0NiA4Ni42NSIvPjxwYXRoIGZpbGw9IiMwMDM3NjQiIGQ9Ik0xMjcuMzg5IDgwLjU5OGMtMTMuNzkxLTkuMzY1LTMxLjQzOS01LjU0Mi00MC43MTcgOC41MzMtNy43MiAxMS43NjctMTkuNDA1IDEzLjIzNS0yMy45MDYgMTMuMjM1LTE0Ljc1MSAwLTI0LjgyNC0xMC4zNjctMjcuODE4LTIxLjA5NWgtLjAxYy0uMDM5LS4xMDgtLjA1OS0uMi0uMDktLjMwNy0uMDI1LS4xMi0uMDU2LS4yMzMtLjA4OS0uMzY2LTEuMTc3LTQuNDY3LTEuNDY3LTYuNjA5LTEuNDY3LTExLjM2OCAwLTI1LjY1IDI2LjMyMS01NC4yMTMgNjQuMjE1LTU0LjIxMyAzOC44MjkgMCA2MS4wNSAyOS41NDUgNjYuNzggNDUuOTc5LS4xMDctLjI5NS0uMjA5LS41ODEtLjI5MS0uODc3LTExLjAxNS0zMi4xMjUtNDEuNDc0LTU1LjIxNi03Ny4zNTctNTUuMjE2LTQ1LjEzIDAtODEuNzI5IDM2LjU5LTgxLjcyOSA4MS43MzkgMCA0MC4zNTEgMjkuMTA4IDc0Ljg5MSA2OS40NzkgNzQuODkxIDMyLjE5NyAwIDUzLjg0Mi0xOC4wNTIgNjMuNzU3LTQyLjkzIDUuNDUtMTMuNjE0IDEuNTk1LTI5LjYwNS0xMC43NTctMzguMDA1Ii8%2BPHBhdGggZmlsbD0iI2U0MDMyZSIgZD0iTTE2NC43ODggNjIuNTg5Yy00Ljc3Ny0xNi4wMjYtMjcuMTUzLTQ3LjU3MS02Ny4yODItNDcuNTcxLTM3Ljg5NCAwLTY0LjIxNCAyOC41NjMtNjQuMjE0IDU0LjIxMiAwIDQuNzU5LjI5IDYuOTAxIDEuNDY2IDExLjM2OC0uNDg5LTEuOTUxLS43NC0zLjkwOC0uNzQtNS44MjMgMC0yNi43MjEgMjYuNzQxLTQ1LjIyNyA1NC4yNDgtNDUuMjI3IDM3LjIxOCAwIDY3LjM4OCAzMC4xNzQgNjcuMzg4IDY3LjM5IDAgMjkuMTczLTE2Ljc4NSA1NC40MzctNDEuMTc5IDY2LjU2NXYuMDIzYzMxLjQ1NS0xMS4zOTEgNTMuOTA4LTQxLjUxMiA1My45MDgtNzYuODg0IDAtOC4zNzgtMS4xMjctMTUuNzU5LTMuNTk1LTI0LjA1MyIvPjwvc3ZnPg%3D%3D)](https://www.egovframe.go.kr)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org)

## 📖 MCP 개요

**MCP (Model Context Protocol)** 는 Anthropic 이 공개한 개방형 표준으로, LLM 클라이언트(Claude Desktop, Cursor, Claude Code 등) 와 외부 도구/데이터 소스를 안전하고 일관된 방식으로 연결합니다. MCP 서버는 stdio 또는 HTTP 위에 JSON-RPC 로 동작하며, LLM 에게 호출 가능한 **Tool** 목록과 각 Tool 의 입력 스키마를 노출합니다.

**eGovFrame MCP Check** 는 이 MCP 표준을 따르는 정적 분석 전용 서버입니다. 사용자가 자연어로 "이 프로젝트가 전자정부 표준을 따르는지 검사해줘" 라고 요청하면 LLM 이 `egov_check_compliance` 도구를 호출하고, 서버는 프로젝트 `src/main/java` 트리를 [vscode-ripgrep](https://www.npmjs.com/package/@vscode/ripgrep) 기반으로 스캔하여 **Controller / Service / DAO / Mapper** 네 개 레이어 각각에 대해 eGovFrame 표준 어노테이션과 베이스 클래스 상속이 적용되어 있는지를 결정적으로 검사합니다.

LLM 은 검사 결과 해석/요약만 수행하며, 판정 로직 자체는 모두 서버 코드에 고정되어 있습니다 — 즉 같은 프로젝트에 대해 같은 결과가 반드시 나오는 reproducible check 입니다.

## 🛠️ 제공 도구 (Tools)

이 MCP 서버는 **단 하나의 도구**만 노출합니다.

### `egov_check_compliance`

eGovFrame 프로젝트의 `src/main/java` 하위 Java 소스를 스캔해서 레이어별 컴플라이언스 비율 + 위반 파일 목록을 리포트합니다.

| 파라미터        | 타입    | 필수 | 설명                                                                         |
|---------------|--------|------|------------------------------------------------------------------------------|
| projectPath   | string | ✓    | 검사 대상 eGovFrame 프로젝트의 절대 경로                                       |
| exportResults | bool   |      | true 면 프로젝트 루트에 레이어별 `Result_*.csv` 파일을 추가로 작성 (기본 false) |

### 레이어별 검사 항목

| 레이어         | 파일명 패턴               | check1                                                                 | check2                                                                |
|--------------|--------------------------|------------------------------------------------------------------------|----------------------------------------------------------------------|
| **Controller** | `*Controller.java`       | 클래스에 `@Controller` 또는 `@RestController`                            | 클래스 또는 메서드에 `@RequestMapping` / `@GetMapping` 등 매핑 어노테이션 |
| **Service**    | `*ServiceImpl.java`      | `EgovAbstractServiceImpl` 상속 (직접 또는 `EgovCommonServiceImpl` 경유)   | `@Service` + `implements …Service`                                   |
| **DAO**        | `*DAO.java`              | `@Repository`                                                          | `EgovAbstractDAO` 또는 `EgovAbstractMapper` 상속 (직간접)             |
| **Mapper**     | `*Mapper.java`           | `@Mapper` 또는 `@EgovMapper`                                            | -                                                                    |

### 출력 형식

도구는 다음을 콘솔 친화적 텍스트로 리턴합니다:

- 전체 통계: 총 파일 수 / 통과 / 실패 / 컴플라이언스 비율
- 레이어별 상세: 통과/실패 수 + 실패한 파일 상위 5개 (사유 포함)
- `exportResults: true` 인 경우 — `Result_Controller.csv` 등 레이어별 CSV 가 프로젝트 루트에 생성됨

## 🚀 설치 (Installation)

### Prerequisites

- **Node.js**: v18.0.0 이상 (v22.x 권장)
- **npm**: v8.0.0 이상

`@vscode/ripgrep` 가 의존성으로 포함되어 있으며 `npm install` 시 자동으로 플랫폼별 ripgrep 바이너리를 다운로드합니다 — 별도 설치 불필요.

### Build

```bash
npm install
npm run build
```

## 🔧 MCP 클라이언트 설정 (Configuration)

### Claude Desktop

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "egovframe-mcp-check": {
      "command": "node",
      "args": ["/path/to/egovframe-mcp-check/build/index.js"]
    }
  }
}
```

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json` (경로만 Windows 형식으로 치환)

### Cursor

`.cursor/mcp.json` 또는 settings 에서 동일한 형식으로 등록.

### Standalone 실행

별도 MCP 클라이언트 없이 stdio 서버만 띄우려면:

```bash
node build/index.js
# 또는 (npm link 후)
npx egovframe-mcp-check
```

## 💡 사용 예시 (Usage Examples)

### 예시 1. 기본 컴플라이언스 검사

```
User: "/workspace/board-app 이 eGovFrame 표준 아키텍처를 따르는지 검사해줘"

Claude: (egov_check_compliance 호출)
```

호출 입력 예:
```json
{
  "projectPath": "/workspace/board-app"
}
```

출력 예 (요약):
```
✅ eGovFrame Architecture Check Completed

📊 Overall Statistics:
  • Total Files: 24
  • Passed: 22 ✓
  • Failed: 2 ✗
  • Compliance Rate: 91%

📋 Layer Details:

  🎯 Controller Layer:
     Total: 6 | Passed: 6 ✓ | Failed: 0 ✗
     Check: @Controller + Mapping Annotations

  🔧 Service Layer:
     Total: 5 | Passed: 4 ✓ | Failed: 1 ✗
     Failed files:
       ✗ EgovBoardServiceImpl.java: not extending EgovAbstractServiceImpl
  ...
```

### 예시 2. CSV 리포트까지 생성

```
User: "/workspace/board-app 검사 결과를 CSV 로도 뽑아줘"

Claude: (egov_check_compliance 호출, exportResults: true)
        → /workspace/board-app/Result_Controller.csv
        → /workspace/board-app/Result_Service.csv
        → /workspace/board-app/Result_DAO.csv
        → /workspace/board-app/Result_Mapper.csv
```

### 예시 3. codegen 으로 만든 직후 검증

```
User: "방금 만든 board-app 이 표준에 맞는지 바로 확인하고,
       문제 있으면 위반 파일 보여줘"

Claude: (egov_check_compliance 호출 후, 실패 파일 목록과 사유를 사람이 읽기 좋게 정리)
```

> 💡 **Tip** — [`egovframe-mcp-codegen`](../egovframe-mcp-codegen) 으로 생성한 프로젝트는 모든 레이어가 자동으로 표준을 만족하도록 템플릿화되어 있어, 신규 스캐폴드 직후의 검사 결과는 100% 가 기대값입니다. 이 도구의 진가는 **legacy 코드** 또는 **수동으로 추가한 컴포넌트** 검사에서 드러납니다.

## 🗂️ 폴더 구조 (Project Structure)

```
egovframe-mcp-check/
├── src/
│   ├── index.ts                      # MCP 서버 진입점 (egov_check_compliance 만 등록)
│   ├── tools/
│   │   └── checkArchitecture.ts      # 도구 진입 — 검사 실행 + 결과 포맷팅
│   └── utils/
│       └── archChecker.ts            # ripgrep 기반 스캐너 + 레이어별 판정 로직 + CSV 익스포터
│
├── build/                            # tsc 산출물 (npm run build 후 생성)
│   └── index.js                      # MCP 실행 엔트리 (chmod 755)
│
├── package.json
├── tsconfig.json
└── LICENSE
```

소스가 매우 작습니다(파일 3개). 모든 판정 로직은 `src/utils/archChecker.ts` 한 곳에 모여 있으며, 새로운 레이어/규칙을 추가하려면 이 파일에 규칙 함수 하나를 더하고 `src/index.ts` 의 `ListToolsRequestSchema` 응답을 손대지 않아도 됩니다 (입력 스키마는 같음).

## ⚙️ 내부 동작 (How it works)

1. **ripgrep 으로 파일 수집**
   `@vscode/ripgrep` 의 `rgPath` 를 spawn 해서 `src/main/java/**/*Controller.java`, `**/*ServiceImpl.java`, `**/*DAO.java`, `**/*Mapper.java` 를 각각 글로빙.
2. **레이어별 규칙 평가**
   각 파일을 읽어 정규식 기반으로 어노테이션 / `extends` / `implements` 절을 검사. 베이스 클래스 상속은 transitive (예: `EgovCommonServiceImpl → EgovAbstractServiceImpl`) 까지 따라갑니다.
3. **요약 + 상위 5개 실패 출력**
   결과를 사람이 읽기 쉬운 텍스트로 포맷팅. `exportResults: true` 면 CSV 도 함께 작성.

ripgrep 이 사용 불가한 환경(예: 일부 폐쇄망 빌드) 에서는 노드 fs 기반 fallback 으로 동작합니다 — 속도는 떨어지지만 동일 결과를 냅니다.

## 🧪 디버깅 / Inspector

```bash
npm run inspector
```

빌드된 `build/index.js` 를 MCP Inspector 에 띄워 `egov_check_compliance` 를 인터랙티브하게 호출할 수 있습니다.

## ⚠️ 한계 (Limitations)

- 현재 검사 범위는 **Java + eGovFrame 표준 어노테이션/베이스 클래스** 에 한정됩니다. Kotlin/Groovy 소스나 Spring 표준만 따르는(eGov 베이스 미상속) 클래스는 별도 규칙으로 추가가 필요합니다.
- Mapper XML, application.properties, pom.xml 같은 비-Java 자산은 검사하지 않습니다 (별도 도구에서 다룰 영역).
- 검사는 **정적(static)** 분석입니다. 런타임 Bean 등록 여부나 트랜잭션 propagation 정상성은 판정하지 않습니다.

## 🔗 함께 쓰는 자매 MCP

- **[egovframe-mcp-codegen](../egovframe-mcp-codegen)** — DDL 한 줄로 eGovFrame 프로젝트/엔티티 자동 생성 (이 도구의 검사 결과를 100% 만족)
- **[egovframe-mcp-search](../egovframe-mcp-search)** — eGovFrame 가이드/표준 용어/공통컴포넌트/호환성 통합 검색

## 📄 라이선스

Apache-2.0
