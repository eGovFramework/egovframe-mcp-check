# eGovFrame MCP Check

> 표준프레임워크 프로젝트의 빌드 파일과 레이어별 Java 소스를 정적 분석해 아키텍처 준수 여부를 점검하는 MCP 서버

[![eGovFrame](https://img.shields.io/badge/eGovFrame-5.1.0-134F8C?labelColor=white&logo=data:image/svg%2Bxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNzMuMjgyIDE3My4yODIiPjxwYXRoIGZpbGw9IiNmZmYiIGQ9Ik0xNzMuMjgyIDg2LjY1YzAgNDcuODQ0LTM4Ljc5NCA4Ni42MzItODYuNjQ2IDg2LjYzMkMzOC43OTkgMTczLjI4MiAwIDEzNC40OTQgMCA4Ni42NSAwIDM4Ljc4OCAzOC43OTkgMCA4Ni42MzYgMGM0Ny44NTIgMCA4Ni42NDYgMzguNzg4IDg2LjY0NiA4Ni42NSIvPjxwYXRoIGZpbGw9IiMwMDM3NjQiIGQ9Ik0xMjcuMzg5IDgwLjU5OGMtMTMuNzkxLTkuMzY1LTMxLjQzOS01LjU0Mi00MC43MTcgOC41MzMtNy43MiAxMS43NjctMTkuNDA1IDEzLjIzNS0yMy45MDYgMTMuMjM1LTE0Ljc1MSAwLTI0LjgyNC0xMC4zNjctMjcuODE4LTIxLjA5NWgtLjAxYy0uMDM5LS4xMDgtLjA1OS0uMi0uMDktLjMwNy0uMDI1LS4xMi0uMDU2LS4yMzMtLjA4OS0uMzY2LTEuMTc3LTQuNDY3LTEuNDY3LTYuNjA5LTEuNDY3LTExLjM2OCAwLTI1LjY1IDI2LjMyMS01NC4yMTMgNjQuMjE1LTU0LjIxMyAzOC44MjkgMCA2MS4wNSAyOS41NDUgNjYuNzggNDUuOTc5LS4xMDctLjI5NS0uMjA5LS41ODEtLjI5MS0uODc3LTExLjAxNS0zMi4xMjUtNDEuNDc0LTU1LjIxNi03Ny4zNTctNTUuMjE2LTQ1LjEzIDAtODEuNzI5IDM2LjU5LTgxLjcyOSA4MS43MzkgMCA0MC4zNTEgMjkuMTA4IDc0Ljg5MSA2OS40NzkgNzQuODkxIDMyLjE5NyAwIDUzLjg0Mi0xOC4wNTIgNjMuNzU3LTQyLjkzIDUuNDUtMTMuNjE0IDEuNTk1LTI5LjYwNS0xMC43NTctMzguMDA1Ii8%2BPHBhdGggZmlsbD0iI2U0MDMyZSIgZD0iTTE2NC43ODggNjIuNTg5Yy00Ljc3Ny0xNi4wMjYtMjcuMTUzLTQ3LjU3MS02Ny4yODItNDcuNTcxLTM3Ljg5NCAwLTY0LjIxNCAyOC41NjMtNjQuMjE0IDU0LjIxMiAwIDQuNzU5LjI5IDYuOTAxIDEuNDY2IDExLjM2OC0uNDg5LTEuOTUxLS43NC0zLjkwOC0uNzQtNS44MjMgMC0yNi43MjEgMjYuNzQxLTQ1LjIyNyA1NC4yNDgtNDUuMjI3IDM3LjIxOCAwIDY3LjM4OCAzMC4xNzQgNjcuMzg4IDY3LjM5IDAgMjkuMTczLTE2Ljc4NSA1NC40MzctNDEuMTc5IDY2LjU2NXYuMDIzYzMxLjQ1NS0xMS4zOTEgNTMuOTA4LTQxLjUxMiA1My45MDgtNzYuODg0IDAtOC4zNzgtMS4xMjctMTUuNzU5LTMuNTk1LTI0LjA1MyIvPjwvc3ZnPg%3D%3D)](https://www.egovframe.go.kr)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)

## 개요

**MCP (Model Context Protocol)** 는 Anthropic 이 공개한 개방형 표준으로, AI 클라이언트(Claude Code, Codex, Cursor, VS Code 등)와 외부 도구·데이터 소스를 일관된 방식으로 연결합니다. MCP 서버는 JSON-RPC 로 통신하면서, LLM 이 호출할 수 있는 **도구(Tool)** 목록과 각 도구의 입력 스키마를 클라이언트에 알려 줍니다. 이 서버는 stdio 전송을 사용합니다.

**eGovFrame MCP Check (적용점검 MCP)** 는 전자정부 표준프레임워크(eGovFrame) 기반 프로젝트가 표준프레임워크의 아키텍처 가이드를 따르는지 점검하는 MCP 서버입니다. 사용자가 AI 클라이언트에 자연어로 "이 프로젝트가 표준프레임워크를 따르는지 점검해줘" 라고 요청하면, LLM 이 `egov_check_compliance` 도구를 호출합니다.

판정은 모두 서버 코드가 정해진 규칙에 따라 수행합니다. LLM 은 점검 결과를 해석하고 요약하는 역할만 맡으므로, 같은 프로젝트를 점검하면 항상 같은 결과가 나옵니다. 점검은 빌드 도구를 실행하지 않고 빌드 파일과 Java 소스를 읽기만 하는 정적 분석입니다.

> 이 저장소의 점검 엔진은 VS Code 확장 [egovframe-vscode-initializr](https://github.com/eGovFramework/egovframe-vscode-initializr) 의 **Architecture Check (archChecker)** 엔진을 이식한 것이며, 판정 로직은 업스트림과 동일하게 유지합니다.

## 주요 기능

| 기능 | 설명 |
|------|------|
| Project 빌드 파일 점검 | 빌드 파일(`pom.xml`, `build.gradle`, `build.gradle.kts`)로 모듈별 실행환경 적용 상태를 점검합니다. 실행환경 세대(3.x / 4.x / 5.x)와 버전, 필수 라이브러리 4종(`ptl-mvc`, `fdl-cmmn`, `fdl-logging`, `psl-dataaccess`)의 적용 여부(직접 선언과 전이 의존을 구분), 모듈 간 버전 일관성을 판정합니다. |
| Layer 점검 | 레이어별 Java 소스가 표준프레임워크의 어노테이션과 기반 클래스를 따르는지 점검합니다. 대상은 Controller, Service, DAO / Mapper 세 레이어입니다. |
| 점검 결과 보고 | 레이어별 준수율과 파일별 실패 사유를 보고합니다. 실패 파일은 MCP `resource_link` 로 함께 돌려주므로 클라이언트에서 바로 열 수 있고(최대 100개), 점검 결과를 CSV 4종으로 내보낼 수 있습니다. |

- **빌드 도구 불필요**: Maven 이나 Gradle 을 실행하지 않고 빌드 파일을 텍스트로 읽습니다.
- **결정적 판정**: 같은 프로젝트는 항상 같은 결과를 얻습니다.
- **오프라인 동작**: 실행에 필요한 의존 패키지가 모두 배포 파일(tgz)에 들어 있어서, 폐쇄망에서도 사용할 수 있습니다.

## 제공 도구

이 MCP 서버는 도구 **하나**만 노출합니다. 리소스와 프롬프트는 노출하지 않습니다.

| 도구 | 용도 |
|------|------|
| `egov_check_compliance` | 표준프레임워크 프로젝트의 빌드 파일과 Java 소스를 점검하고 결과를 보고 |

### `egov_check_compliance`

표준프레임워크 프로젝트의 빌드 파일과 Java 소스를 점검하고 결과를 보고합니다.

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `projectPath` | string | 필수 | 점검할 프로젝트의 절대 경로 |
| `exportResults` | boolean | 선택 | `true` 이면 프로젝트 루트에 점검 결과 CSV 4종(`Result_Controller`, `Result_Service`, `Result_DAO`, `Result_Project`)을 저장합니다. 기본값은 `false` 입니다. |
| `runtimeGeneration` | `"3.x"` \| `"4.x"` \| `"5.x"` | 선택 | 판정 기준으로 쓸 실행환경 세대를 지정합니다. 지정하면 Project 점검과 DAO / Mapper 의 Version 체크를 이 세대 기준으로 판정하고, 생략하면 빌드 파일에서 판정한 세대를 씁니다. |

- 도구는 프로젝트를 읽기만 합니다. `exportResults: true` 일 때에만 프로젝트 루트에 CSV 파일을 씁니다.
- 입력이 스키마에 맞지 않거나 `projectPath` 가 존재하는 디렉토리가 아니면 `isError: true` 인 결과가 돌아옵니다.

#### 점검 항목

| 영역 | 대상 파일 | 점검 항목 |
|------|-----------|-----------|
| Project | `pom.xml`, `build.gradle`, `build.gradle.kts` | 모듈별 실행환경 세대와 버전, 필수 라이브러리 4종의 적용 여부, 모듈 간 버전 일관성 |
| Controller | `*Controller.java` | `@Controller` 또는 `@RestController` 선언, 요청 매핑 어노테이션 선언(클래스 레벨 `@RequestMapping` 또는 public 메서드 1개 이상), DAO 를 직접 주입받지 않음 |
| Service | `*ServiceImpl.java` | `EgovAbstractServiceImpl` 상속, `@Service` 선언, `*Service` 인터페이스 구현 |
| DAO / Mapper | `*DAO.java`, `*Dao.java`, `*Mapper.java` | 파일 내용으로 구현 방식(iBatis DAO, MyBatis DAO, Mapper 인터페이스)을 분류한 뒤 기반 클래스(Base), Bean 등록(Bean), 실행환경 세대와의 정합(Version) |

Project 점검은 참고 정보도 함께 모읍니다. 데이터 접근 설정(`SqlSessionFactoryBean`, `MapperConfigurer`, `@MapperScan` 등)이 있는지와, 점검 대상 밖에서 `JdbcTemplate` 등으로 데이터에 직접 접근하는 파일의 목록입니다. 이 정보는 판정에 반영하지 않습니다.

DAO / Mapper 레이어는 `abstract` 클래스, `@Configuration` 클래스, Spring Data 저장소, MapStruct 매퍼처럼 판정 대상이 아닌 파일을 판정에서 빼고 사유와 함께 따로 보여 줍니다.

항목별 판정 조건, 필수 라이브러리의 상태 값, 판정에서 빼는 파일의 사유는 [`docs/reference/CHECK_RULES.md`](docs/reference/CHECK_RULES.md) 에 있습니다.

#### 점검 결과

응답은 텍스트 리포트 하나와, 그 뒤에 붙는 실패 파일 링크로 이루어집니다.

- **텍스트 리포트**: 전체 통계(총 파일 수, 통과, 실패, 준수율), Project 결과, 레이어별 집계와 실패 파일의 사유가 차례로 나옵니다. 파일 경로는 모두 `projectPath` 기준 상대 경로입니다.
- **실패 파일 링크**: 실패로 판정된 파일마다 MCP `resource_link` 블록이 붙습니다. `uri` 는 파일의 절대 경로를 나타내는 `file://` URI 이고, `description` 은 실패 사유입니다. 링크는 레이어 합계로 최대 100개까지 붙고, 레이어마다 앞쪽 5개는 먼저 확보합니다.
- **CSV 내보내기**: `exportResults: true` 이면 프로젝트 루트에 `Result_Controller_<date>.csv`, `Result_Service_<date>.csv`, `Result_DAO_<date>.csv`, `Result_Project_<date>.csv` 를 쓰고, 그 파일도 링크로 돌려줍니다. 텍스트에는 레이어별 실패 파일을 100개까지만 실으므로, 전체 목록이 필요하면 CSV 를 씁니다.

섹션별 내용, 링크의 선택 규칙, CSV 의 열, 오류 응답은 [`docs/reference/REPORT_FORMAT.md`](docs/reference/REPORT_FORMAT.md) 에 있습니다.

## 설치

### 요구 사항

- **Node.js**: 18 이상 (22 권장). 터미널에서 `node -v` 로 확인합니다.
- **운영체제와 CPU**: Windows x64, macOS (Apple Silicon, Intel), Linux x64 (glibc)

### 1. 배포 파일(tgz) 내려받기

[표준프레임워크 포털](https://www.egovframe.go.kr/home/sub.do?menuNo=114)에서 사용하는 운영체제와 CPU 에 맞는 파일을 로컬에 내려받습니다. 압축은 풀지 않습니다.

| 운영체제와 CPU | 파일 |
|----------------|------|
| Windows x64 | `egovframe-mcp-check-5.1.x-win32-x64.tgz` |
| macOS (Apple Silicon) | `egovframe-mcp-check-5.1.x-darwin-arm64.tgz` |
| macOS (Intel) | `egovframe-mcp-check-5.1.x-darwin-x64.tgz` |
| Linux x64 (glibc) | `egovframe-mcp-check-5.1.x-linux-x64.tgz` |

tgz 에는 빌드된 서버와 실행에 필요한 의존 패키지가 모두 들어 있으므로, 실행할 때 다른 패키지를 내려받지 않습니다. 운영체제와 CPU 별로 파일이 나뉘는 이유는 파일 수집에 쓰는 ripgrep 실행 파일이 플랫폼마다 다르기 때문입니다. 파일별 체크섬은 [릴리스 노트](docs/release-notes/v5.1.0-beta.md#체크섬)에 있습니다.

### 2. 서버 실행 명령

AI 클라이언트에는 `npx` 가 tgz 를 직접 실행하도록 등록합니다. 아래에서 `<TGZ>` 는 내려받은 tgz 파일의 절대 경로입니다.

```bash
npx -y --package=<TGZ> egovframe-mcp-check
```

Windows 에서는 `cmd /c` 로 감싸서 실행합니다.

```bat
cmd /c npx -y --package=<TGZ> egovframe-mcp-check
```

### 3. AI 클라이언트 등록

`mcpServers` 형식을 쓰는 AI 클라이언트에는 다음 항목을 등록합니다. 설정 파일에 이미 `mcpServers` 가 있으면 그 안에 `egovframe-mcp-check` 항목만 추가합니다.

**macOS, Linux**

```json
{
  "mcpServers": {
    "egovframe-mcp-check": {
      "command": "npx",
      "args": ["-y", "--package=<TGZ>", "egovframe-mcp-check"]
    }
  }
}
```

**Windows**

```json
{
  "mcpServers": {
    "egovframe-mcp-check": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "--package=<TGZ>", "egovframe-mcp-check"]
    }
  }
}
```

JSON 문자열 안에서는 Windows 경로의 역슬래시를 두 번씩 적거나(`C:\\mcp\\...`) 슬래시(`C:/mcp/...`)로 적습니다.

Claude Code, Codex, Cursor, VS Code (GitHub Copilot), Cline, OpenCode, Claude Desktop 에 등록하는 방법(CLI 명령, 설정 파일의 위치와 형식)은 [`docs/setup/MCP_SETUP_GUIDE.md`](docs/setup/MCP_SETUP_GUIDE.md#ai-클라이언트별-등록) 에 있습니다. 환경 변수와 문제 해결도 같은 문서에서 다룹니다.

### 저장소를 클론해서 실행 (개발자)

```bash
git clone https://github.com/eGovFramework/egovframe-mcp-check.git
cd egovframe-mcp-check
npm install        # 의존성 설치. prepare 스크립트가 빌드(npm run build)까지 실행
```

`npm install` 은 의존성인 `@vscode/ripgrep` 과 함께 현재 플랫폼용 ripgrep 실행 파일도 설치하므로, ripgrep 을 따로 설치하지 않아도 됩니다. 클라이언트에는 `node` 로 `build/index.js` 를 실행하도록 등록하고, 경로는 절대 경로로 적습니다.

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

## 사용 예시

각 예시의 JSON 은 AI 가 `egov_check_compliance` 에 넘기는 인자입니다.

### 예시 1. 기본 점검

```text
User: "/workspace/board-app 이 표준프레임워크 아키텍처를 따르는지 점검해줘"
```

```json
{ "projectPath": "/workspace/board-app" }
```

텍스트 리포트에서 주요 줄만 추리면 다음과 같습니다. 실제 출력에는 섹션 제목 앞에 그림 문자가, 통과와 실패 수 뒤에 표시 기호가 붙지만 이 예시에서는 생략했습니다. 전체 출력 예시는 [`docs/reference/REPORT_FORMAT.md`](docs/reference/REPORT_FORMAT.md#예시) 에 있습니다.

```text
eGovFrame Architecture Check Completed

Overall Statistics (Controller + Service + DAO / Mapper):
  • Total Files: 5
  • Passed: 3
  • Failed: 2
  • Compliance Rate: 60%
  • Skipped (not judged): 1

Project (build files):
  Runtime: 4.3.0 (4.x) · Result: NotFound
  Version consistency: PASS (4.3.0)
  Modules:
  - pom.xml [maven] NotFound — runtime 4.3.0 (4.x, property)
      ptl-mvc: direct; fdl-cmmn: transitive via ptl-mvc > fdl-cmmn; fdl-logging: transitive via ptl-mvc > fdl-cmmn > fdl-logging; psl-dataaccess: missing (not declared)

DAO / Mapper Layer:
  Total: 3 | Passed: 2 | Failed: 1 | Skipped: 1
  Styles: iBatis DAO 0, MyBatis DAO 1, Mapper IF 1, no style (no eGov base class or Mapper annotation) 1
  Failed files:
    src/main/java/egov/sample/dao/PlainDAO.java [no style]: Base FAIL (no egov base); Bean FAIL (no @Repository)
  Skipped files (not judged):
    - configuration — @Configuration class (1): src/main/java/egov/sample/config/EgovConfigMapper.java

Controller Layer:
  Total: 2 | Passed: 1 | Failed: 1
  Failed files:
    src/main/java/egov/sample/web/BarController.java: missing @Controller/@RestController, mapping annotation on 0/1 public methods

Service Layer:
  Total: 0 | Passed: 0 | Failed: 0
```

이 응답에는 실패 파일 3개(`pom.xml`, `PlainDAO.java`, `BarController.java`)의 `resource_link` 블록이 함께 붙습니다.

### 예시 2. CSV 리포트까지 생성

```text
User: "/workspace/board-app 점검 결과를 CSV 로도 저장해줘"
```

```json
{ "projectPath": "/workspace/board-app", "exportResults": true }
```

프로젝트 루트에 `Result_Controller_<date>.csv`, `Result_Service_<date>.csv`, `Result_DAO_<date>.csv`, `Result_Project_<date>.csv` 가 저장됩니다. `<date>` 는 실행일(`YYYY-MM-DD`)입니다. 결과가 0건인 레이어의 CSV 는 쓰지 않고, `Result_Project_<date>.csv` 는 Java 파일이 하나도 없어도 빌드 파일 판정이 있으면 작성됩니다.

### 예시 3. 실행환경 세대를 수동 지정

```text
User: "/workspace/legacy-app 은 5.x 로 올릴 예정이야. 5.x 기준으로 DAO 어노테이션이 맞는지 봐줘"
```

```json
{ "projectPath": "/workspace/legacy-app", "runtimeGeneration": "5.x" }
```

4.x 용 `@Mapper` 인터페이스가 `Version FAIL` 로 표시되고, 사유에는 5.x 에서는 `@EgovMapper` 가 필요하다는 내용이 실립니다. 빌드 파일이 없거나 세대를 판정할 수 없는 프로젝트에서도 이 파라미터로 Version 체크를 켤 수 있습니다.

### 예시 4. codegen 으로 만든 직후 검증

```text
User: "방금 만든 board-app 이 표준에 맞는지 바로 확인하고, 문제가 있으면 위반 파일을 보여줘"
```

[`egovframe-mcp-codegen`](https://github.com/eGovFramework/egovframe-mcp-codegen) 으로 생성한 프로젝트는 레이어 점검을 통과하도록 템플릿이 만들어져 있습니다. 그래서 이 도구는 기존 코드나 손으로 추가한 클래스를 점검할 때 더 쓸모가 있습니다. 다만 Project 항목은 필수 라이브러리 4종을 모든 모듈에 적용하므로, 배치나 MSA 같은 템플릿은 빠진 라이브러리가 근거와 함께 `NotFound` 로 표시될 수 있습니다.

## 제약 사항

- 점검 범위는 **Java 소스와 표준프레임워크의 어노테이션·기반 클래스**로 한정됩니다. Kotlin 이나 Groovy 소스는 점검하지 않습니다. 표준프레임워크의 기반 클래스를 상속하지 않고 Spring 표준만 따르는 `*ServiceImpl`, `*DAO` 클래스는 실패로 보고됩니다.
- Mapper XML 의 SQL 내용은 점검하지 않습니다. 설정 파일(XML, yml, properties, Java Config)과 빌드 파일에서는 데이터 접근 설정의 **존재 여부**만 정보 항목으로 모으며 판정에 넣지 않습니다.
- 빌드 파일은 빌드 도구를 실행하지 않고 텍스트로 읽습니다. Gradle 은 일반적인 선언 형태만 인식하고, 번들, 루프, 헬퍼 함수, conventions 플러그인처럼 해석이 확실하지 않은 형태는 추측하지 않고 `unknown` 으로 남깁니다.
- 필수 라이브러리의 전이 의존은 서버에 내장한 실행환경 모듈 의존 그래프(3.9.x, 3.10.x, 4.0.x, 4.1.x, 4.2.x, 4.3.x, 5.0.x, 5.1.x)로 판정합니다. 5.1.x 그래프는 5.1.0 베타 기준이며, 프로젝트 밖에 있는 parent POM 과 BOM 은 읽지 않습니다.
- Controller 와 Service 는 소스를 줄 단위로 읽어서 판정합니다. 클래스 선언의 `{` 를 다음 줄에 쓰는 코드처럼 일부 형식에서는 어노테이션을 인식하지 못할 수 있습니다.
- 점검은 **정적 분석**입니다. 런타임에 Bean 이 실제로 등록되는지, 트랜잭션 전파가 올바른지는 판정하지 않습니다.

인식 범위의 상세한 내용은 [`docs/reference/CHECK_RULES.md`](docs/reference/CHECK_RULES.md#한계) 에 있습니다.

## 기술 스택

| 구분 | 내용 |
|------|------|
| Protocol | MCP (Model Context Protocol), stdio 전송 |
| MCP SDK | `@modelcontextprotocol/sdk` v1.29.0 |
| Language | TypeScript v5.9.3 |
| Runtime | Node.js 18 이상 (Node.js 22 권장) |
| File Search | `@vscode/ripgrep` v1.18.0 |
| Schema Validation | `zod` v4.4.3 |
| Test | Vitest v1.6.1 |

## 폴더 구조

```text
egovframe-mcp-check/
├── src/
│   ├── index.ts                      # MCP 서버 진입점 (egov_check_compliance 등록, ripgrep 경로 지연 로드)
│   ├── tools/
│   │   └── checkArchitecture.ts      # 도구 진입: projectPath 검증, 엔진 호출, 텍스트 리포트와 링크 생성
│   ├── shared/                       # 결과 계약 (업스트림과 공유하는 타입과 함수)
│   │   ├── archCheck.ts              #   결과 타입 (ArchCheckResults, ProjectCheckSummary 등)
│   │   └── archCheckReport.ts        #   Project 결과를 Module/Item/Status/Evidence 행으로 펴는 projectReportRows
│   └── utils/                        # 점검 엔진 (업스트림 egovframe-vscode-initializr 와 같은 로직)
│       ├── archChecker.ts            #   엔진 진입점, 파일 수집(ripgrep/fs), Controller·Service 판정, CSV 작성
│       ├── daoCheck.ts               #   DAO / Mapper 레이어: 분류와 제외 규칙, 상속 체인 추적, Base/Bean/Version 판정
│       ├── buildFileCheck.ts         #   Project 항목: 모듈별 세대와 버전, 필수 라이브러리 4종, 버전 일관성
│       ├── dataAccessConfigScan.ts   #   데이터 접근 설정 정보, 미분류 데이터 접근 파일
│       ├── runtimeModuleGraph.ts     #   실행환경 브랜치별 모듈 의존 그래프 상수, 전이 도달 판정
│       ├── mavenPom.ts               #   pom.xml 파서
│       ├── gradleBuild.ts            #   build.gradle(.kts), settings.gradle, gradle.properties, libs.versions.toml 파서
│       ├── javaIndex.ts              #   .java 파일의 FQCN 색인, 타입 참조 해석
│       ├── javaSource.ts             #   주석 제거, package/import 수집, 타입 선언부 추출, 읽기 캐시
│       └── debugLog.ts               #   EGOV_CHECK_DEBUG 가 켜졌을 때만 쓰는 stderr 정보성 로그
│
├── tests/                            # Vitest 테스트 (tests/**/*.test.ts)
│   ├── checkArchitecture.test.ts     #   도구 리포트, 입력 검증, stdout 청결, 로그 출력 조건
│   ├── archChecker.test.ts 등        #   엔진 모듈별 테스트 (업스트림 spec 의 이식본)
│   ├── acceptance.test.ts            #   공식 템플릿 인수 검증 (EGOV_ACCEPTANCE_DIR 이 없으면 건너뜀)
│   └── fixtures/runtime-graph/       #   실행환경 브랜치별 모듈 의존 추출 원본 (graph-<브랜치>.txt)
│
├── docs/                             # 상세 문서 (아래 "문서" 참조)
│   ├── setup/                        #   설치와 MCP 클라이언트 등록
│   ├── reference/                    #   점검 항목과 판정 규칙, 점검 결과 형식
│   ├── architecture/                 #   코드 구성과 동작 방식
│   ├── development/                  #   빌드, 테스트, 패키징, 코드 수정 규칙
│   └── release-notes/                #   버전별 릴리스 노트
│
├── scripts/pack-platforms.sh         # 플랫폼별 배포 tgz 생성 (npm run pack:platforms)
├── build/                            # tsc 결과물 (git 미추적). build/index.js 가 실행 진입점
├── dist/                             # pack:platforms 결과물 tgz (git 미추적)
├── .nvmrc                            # Node.js 22
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── LICENSE
```

도구 진입점(`src/index.ts`, `src/tools/checkArchitecture.ts`)과 `src/utils/debugLog.ts` 만 이 저장소 고유의 코드이고, 나머지 `src/utils/*` 와 `src/shared/*` 는 업스트림과 동기화하기 위해 판정 로직을 그대로 유지합니다. 모듈별 책임과 점검이 진행되는 과정은 [`docs/architecture/HOW_IT_WORKS.md`](docs/architecture/HOW_IT_WORKS.md) 에 있습니다.

## 빌드와 테스트

| 명령 | 동작 |
|------|------|
| `npm test` | `npm run build` 후 `vitest run` (전체 테스트) |
| `npm run test:watch` | watch 모드 (빌드하지 않음) |
| `EGOV_ACCEPTANCE_DIR=/path/to/templates npm test` | 공식 템플릿을 풀어 둔 디렉토리로 인수 테스트까지 실행 |
| `npm run inspector` | 빌드된 `build/index.js` 를 MCP Inspector 에 연결해 `egov_check_compliance` 를 직접 호출 |

stdio 전송에서 stdout 은 JSON-RPC 채널이므로 서버는 JSON-RPC 메시지 외에는 stdout 에 아무것도 쓰지 않습니다. 파일별 진행 상황 같은 정보성 로그는 환경 변수 `EGOV_CHECK_DEBUG` 를 켠 경우에만 stderr 로 출력합니다.

```bash
EGOV_CHECK_DEBUG=1 node build/index.js
```

자세한 내용은 [`docs/development/DEVELOPMENT_GUIDE.md`](docs/development/DEVELOPMENT_GUIDE.md) 에 있습니다.

## 문서

상세 문서는 [`docs/`](docs/README.md) 에 주제별 폴더로 나뉘어 있습니다.

| 문서 | 설명 |
|------|------|
| [`docs/setup/MCP_SETUP_GUIDE.md`](docs/setup/MCP_SETUP_GUIDE.md) | 설치와 AI 클라이언트별 등록, 환경 변수, 문제 해결 |
| [`docs/reference/CHECK_RULES.md`](docs/reference/CHECK_RULES.md) | 점검 항목과 판정 규칙 |
| [`docs/reference/REPORT_FORMAT.md`](docs/reference/REPORT_FORMAT.md) | 점검 결과 형식 (텍스트 리포트, 실패 파일 링크, CSV, 오류 응답) |
| [`docs/architecture/HOW_IT_WORKS.md`](docs/architecture/HOW_IT_WORKS.md) | 코드 구성과 동작 방식 |
| [`docs/development/DEVELOPMENT_GUIDE.md`](docs/development/DEVELOPMENT_GUIDE.md) | 빌드, 테스트, 패키징, 코드 수정 규칙 |
| [`docs/release-notes/v5.1.0-beta.md`](docs/release-notes/v5.1.0-beta.md) | 5.1.0 Beta 릴리스 노트와 배포 파일의 체크섬 |

## 변경 이력

| 버전 | 배포일 | 내용 |
|------|--------|------|
| v5.1.0 Beta | 2026-11-27 | 최초 배포 버전 ([릴리스 노트](docs/release-notes/v5.1.0-beta.md)) |

이번 버전은 베타 버전입니다. 문제가 있으면 [GitHub Issues](https://github.com/eGovFramework/egovframe-mcp-check/issues) 에 알려 주세요.

## 함께 쓰는 MCP 서버

이 서버는 점검만 제공합니다. 프로젝트와 코드 생성, 자료 검색은 다음 서버가 제공합니다.

- **[egovframe-mcp-codegen](https://github.com/eGovFramework/egovframe-mcp-codegen)**: DDL 로부터 eGovFrame 프로젝트와 엔티티 코드 생성
- **[egovframe-mcp-search](https://github.com/eGovFramework/egovframe-mcp-search)**: 공식 가이드, 개발자 지식, 공통컴포넌트, 호환 소프트웨어 통합 검색

## 라이선스

Apache-2.0 라이선스를 따릅니다. 전문은 [`LICENSE`](LICENSE) 에 있습니다.

## Credits

점검 엔진은 [egovframe-vscode-initializr](https://github.com/eGovFramework/egovframe-vscode-initializr) 의 Architecture Check (archChecker) 엔진을 기반으로 합니다.
