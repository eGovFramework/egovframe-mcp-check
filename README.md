# eGovFrame MCP Check

> **eGovFrame 프로젝트의 빌드 파일과 레이어별 Java 소스를 정적 분석해 아키텍처 컴플라이언스를 판정하는 미니멀 MCP 서버**

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org)

## 📖 MCP 개요

**MCP (Model Context Protocol)** 는 Anthropic 이 공개한 개방형 표준으로, LLM 클라이언트(Claude Desktop, Cursor, Claude Code 등) 와 외부 도구/데이터 소스를 안전하고 일관된 방식으로 연결합니다. MCP 서버는 stdio 또는 HTTP 위에 JSON-RPC 로 동작하며, LLM 에게 호출 가능한 **Tool** 목록과 각 Tool 의 입력 스키마를 노출합니다.

**eGovFrame MCP Check** 는 이 MCP 표준을 따르는 정적 분석 전용 서버입니다. 사용자가 자연어로 "이 프로젝트가 전자정부 표준을 따르는지 검사해줘" 라고 요청하면 LLM 이 `egov_check_compliance` 도구를 호출하고, 서버는 다음을 결정적으로 판정합니다.

- **Project (빌드 파일)** — `pom.xml` / `build.gradle(.kts)` 를 빌드 도구 실행 없이 읽어 모듈별 **실행환경 세대(3.x / 4.x / 5.x)·버전**, **필수 라이브러리 4종**(`ptl-mvc`, `fdl-cmmn`, `fdl-logging`, `psl-dataaccess`) 의 적용 여부, 모듈 간 **버전 일관성**을 판정합니다. 스프링 데이터 접근 설정 정보는 참고 항목으로 함께 모읍니다.
- **Controller / Service / DAO·Mapper (통합) 세 레이어** — 각 레이어의 Java 소스를 [vscode-ripgrep](https://www.npmjs.com/package/@vscode/ripgrep) 으로 수집해 eGovFrame 표준 어노테이션·베이스 클래스 상속·세대 정합을 검사합니다. 종전의 DAO 와 Mapper 레이어는 공식 적용점검 가이드의 DAO 항목(iBatis DAO · MyBatis DAO · Mapper 인터페이스 택1) 에 맞춰 **"DAO / Mapper" 한 레이어로 통합**되었습니다.

LLM 은 검사 결과 해석/요약만 수행하며, 판정 로직 자체는 모두 서버 코드에 고정되어 있습니다 — 즉 같은 프로젝트에 대해 같은 결과가 반드시 나오는 reproducible check 입니다.

> 이 저장소의 점검 엔진은 VS Code 확장 [egovframe-vscode-initializr](https://github.com/eGovFramework/egovframe-vscode-initializr) 의 **Architecture Check (archChecker)** 엔진을 이식한 것이며, 판정 로직은 업스트림과 동일하게 유지합니다.

## 🛠️ 제공 도구 (Tools)

이 MCP 서버는 **단 하나의 도구**만 노출합니다.

### `egov_check_compliance`

eGovFrame 프로젝트의 빌드 파일과 Java 소스를 스캔해서 Project 판정 + 레이어별 컴플라이언스 비율 + 위반 파일 목록을 리포트합니다.

| 파라미터           | 타입                          | 필수 | 설명                                                                                                                                                  |
|-------------------|------------------------------|------|-------------------------------------------------------------------------------------------------------------------------------------------------------|
| projectPath       | string                       | ✓    | 검사 대상 eGovFrame 프로젝트의 절대 경로                                                                                                                 |
| exportResults     | bool                         |      | true 면 프로젝트 루트에 `Result_Controller/Service/DAO/Project_<date>.csv` 4종을 추가로 작성 (기본 false)                                                |
| runtimeGeneration | `"3.x"` \| `"4.x"` \| `"5.x"` |      | 실행환경 세대를 수동 지정. 지정하면 Project 점검과 DAO / Mapper 의 Version 체크를 이 세대 기준으로 판정하고, 생략하면 빌드 파일에서 판정한 세대(파일이 속한 모듈 → 프로젝트) 를 씁니다 |

### 레이어별 검사 항목

#### Controller / Service

| 레이어         | 파일명 패턴          | check1                                                              | check2                                                                                           | check3                                                        |
|--------------|---------------------|---------------------------------------------------------------------|--------------------------------------------------------------------------------------------------|---------------------------------------------------------------|
| **Controller** | `*Controller.java`  | 클래스에 `@Controller` 또는 `@RestController`                          | 클래스 레벨 `@RequestMapping`, 또는 모든 public 메서드에 `@RequestMapping`/`@GetMapping` 등 매핑 어노테이션 | **DAO X** — `*DAO`/`*Dao` 타입이나 DAO 레이어 판정 대상 `*Mapper` 타입을 주입받지 않음 |
| **Service**    | `*ServiceImpl.java` | `EgovAbstractServiceImpl` 상속 (직접 또는 중간 클래스 경유, 최대 5단계 추적) | `@Service`                                                                                       | 클래스 선언부의 `implements` 목록에 `*Service` 인터페이스가 있음         |

- Controller 의 check2 는 메서드 단위로 집계되어 결과에 `mapped/total` 수가 실립니다 (예: `mapping annotation on 0/1 public methods`). 클래스 레벨 `@RequestMapping` 이 있으면 메서드 매핑 없이도 통과합니다.
- Controller "DAO X" 는 `ObjectMapper` 같은 라이브러리 타입을 오탐하지 않도록 `*Mapper` 타입은 DAO 레이어 판정 대상에 같은 이름이 있을 때만 DAO 로 봅니다.
- `abstract` 클래스는 두 레이어 모두 점검 대상에서 제외합니다.

#### DAO / Mapper (통합)

`*DAO.java`, `*Dao.java`, `*Mapper.java` 를 함께 모아 **파일 내용**으로 구현 방식을 분류한 뒤 세 항목을 판정합니다. 판정식은 `OK ⇔ Base ∧ Bean ∧ Version ≠ FAIL` 입니다.

| 구현 방식 (Style)   | 분류 기준                                          | Base (check1)                                | Bean (check2)                                         | Version (check3)                                                      |
|--------------------|---------------------------------------------------|----------------------------------------------|-------------------------------------------------------|-----------------------------------------------------------------------|
| **iBatis DAO**     | 상속 체인 종점이 `EgovAbstractDAO`                   | 상속 체인이 eGov 기반 클래스에 도달 (중간 클래스 경유 허용) | `@Repository` (기반 클래스를 프로젝트 안에 복사한 경우는 실패)   | 기반 클래스 패키지가 세대와 일치 (3.x → `egovframework.rte…`, 4.x/5.x → `org.egovframe.rte…`) |
| **MyBatis DAO**    | 상속 체인 종점이 `EgovAbstractMapper`                | 같음                                          | 같음                                                   | 같음                                                                   |
| **Mapper IF**      | `@Mapper` 또는 `@EgovMapper` 가 붙은 인터페이스        | `@Mapper`/`@EgovMapper` 존재                   | 어노테이션의 import 출처가 표준프레임워크 패키지 (MyBatis `org.apache.ibatis.annotations.Mapper` 는 실패) | 어노테이션 이름과 패키지가 세대와 일치 (5.x 는 `@EgovMapper`, 3.x/4.x 는 `@Mapper`) |

- 세대를 알 수 없으면 Version 은 `n/a`(skipped) 로 두고 판정에 넣지 않습니다.
- 중간 클래스 경유 상속은 `package` 선언 기준 FQCN 색인으로 추적하므로 동명 클래스나 주석 안의 `extends` 를 오독하지 않습니다.
- 다음 파일은 판정하지 않고 **Skipped** 목록에 사유와 함께 표시합니다.

| 제외 사유 (reason)  | 대상                                                            |
|-------------------|-----------------------------------------------------------------|
| `abstract`        | `abstract` 클래스                                                 |
| `configuration`   | `@Configuration` 이 붙은 클래스                                    |
| `not-data-access` | eGov 기반도 스테레오타입도 없는 `*Mapper` 클래스 (RowMapper 등 비데이터 접근 Mapper) |
| `spring-data`     | Spring Data 저장소 인터페이스 (`JpaRepository` 등 상속)              |
| `mapstruct`       | MapStruct `@Mapper` 인터페이스                                     |
| `base-class`      | `@Repository` 없이 다른 수집 파일의 부모로만 쓰이는 기반 클래스          |
| `not-a-class`     | 타입 선언이 없거나 enum / record / `@interface`                     |
| `unreadable`      | 읽을 수 없는 파일                                                  |

#### Project (빌드 파일)

| 항목                | 내용                                                                                                                                                                                                  |
|--------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 실행환경 세대·버전     | 모듈(`pom.xml`, `build.gradle`, `build.gradle.kts`) 마다 버전 속성 → BOM(parent/import) → 의존성 버전 → 아티팩트 좌표 패턴 순으로 판정하고 근거(source/evidence) 를 함께 보고합니다. `packaging pom` 집계 모듈과 `buildSrc` 는 판정하지 않고 Skipped 로 둡니다 |
| 필수 라이브러리 4종    | `ptl-mvc`, `fdl-cmmn`, `fdl-logging`, `psl-dataaccess` 를 집계 모듈을 뺀 **모든 모듈에 엄격 적용**합니다. 상태는 `direct` / `transitive`(내장한 실행환경 모듈 의존 그래프로 전이 도달, 경로 표시) / `excluded`(exclusion 으로 끊김) / `missing` / `unknown`(그래프 밖 표준프레임워크 아티팩트를 선언해 해석 불가) |
| 버전 일관성          | 모듈 간 실행환경 버전이 하나로 모이는지 (`PASS` / `FAIL` / `n/a`)                                                                                                                                              |
| 데이터 접근 설정 정보  | `src/main/resources`·`src/main/java`·`src/main/webapp/WEB-INF`·빌드 파일에서 `SqlMapClientFactoryBean`, `SqlSessionFactoryBean`, `MapperConfigurer`, `@MapperScan`, `mybatis-spring-boot-starter`, `mybatis.mapper-locations` 의 존재를 모으고, DAO / Mapper 판정과 엇갈리는 경우(Mapper IF 는 있는데 스캔 설정이 없음 등) 를 교차 경고로 표시합니다. **정보 항목이라 판정에는 영향을 주지 않습니다** |
| 미분류 데이터 접근 파일 | DAO / Mapper 수집 글롭 밖에서 `JdbcTemplate`, `SqlSessionTemplate`, `EntityManager` 등을 직접 쓰는 파일 (정보 항목)                                                                                                 |

### 출력 형식

도구는 다음 순서의 콘솔 친화적 텍스트를 리턴합니다. 결과 안의 파일 경로는 모두 **projectPath 기준 상대 경로**(`/` 구분자) 이며 절대 경로는 쓰지 않습니다.

1. `📊 Overall Statistics` — Controller + Service + DAO 합계: 총 파일 수 / 통과 / 실패 / 컴플라이언스 비율 / Skipped (Project 는 파일 집계에 넣지 않음)
2. `🏗️ Project (build files)` — 실행환경·결과, Result 값과 라이브러리 status 값의 뜻을 적은 Legend 두 줄, 버전 일관성, 모듈별 한 줄 + 필수 라이브러리 4종 상태 (모듈이 15개를 넘으면 OK 모듈은 한 줄로 접음), 데이터 접근 설정 정보, 미분류 데이터 접근 파일 (정보 항목은 각 최대 20건)
3. `🗄️ DAO / Mapper Layer` — 집계 + Style 별 수 (기반 클래스·어노테이션이 없어 Style 을 정하지 못한 파일은 `no style` 로 집계) + 실패 파일(실패한 체크만 사유와 함께) + Skipped 파일(사유별 묶음, 사유 설명과 엔진 detail 포함)
4. `🎯 Controller Layer`, `⚙️ Service Layer` — 집계 + 실패 파일과 사유
5. `Progress` — 진행 메시지 (`with ripgrep` 이 붙으면 ripgrep 으로 수집한 것)
6. `📁 Exported Files` (exportResults 일 때 실제로 쓰인 파일 이름만 나열) 와 `💡 Tips`

레이어별 실패 파일은 최대 **30개**까지 보여 주고 넘으면 `... and N more` 로 줄이며, Skipped 파일은 사유별로 최대 10개를 보여 줍니다. 전체 목록은 CSV 로 확인합니다. 점검 대상 파일이 0건이면 Compliance Rate 는 `n/a (no files checked)` 로 표기합니다. `exportResults: true` 인데 프로젝트 루트에 쓸 수 없으면 점검 결과는 그대로 돌려주고 `⚠ CSV export failed (EACCES)` 경고만 덧붙입니다.

## 🚀 설치 (Installation)

### Prerequisites

- **Node.js**: v18.0.0 이상 (v22.x 권장, `.nvmrc`)
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

📊 Overall Statistics (Controller + Service + DAO / Mapper):
  • Total Files: 5
  • Passed: 3 ✓
  • Failed: 2 ✗
  • Compliance Rate: 60%
  • Skipped (not judged): 1

🏗️ Project (build files):
  Runtime: 4.3.0 (4.x) · Result: NotFound
  Legend — Result: OK = all 4 required libraries resolved; NotFound = a required library is missing or excluded, or versions are inconsistent; Unknown = could not be resolved (not counted as failure); Skipped = aggregate build file.
  Legend — library status: direct | transitive via <path> | excluded (cut by an <exclusion>) | missing | unknown (unresolvable, not a failure). Runtime source: property | bom | dependency-version | artifact-pattern | manual | none.
  Version consistency: PASS (4.3.0)
  Modules:
  - pom.xml [maven] NotFound — runtime 4.3.0 (4.x, property)
      ptl-mvc: direct; fdl-cmmn: transitive via ptl-mvc > fdl-cmmn; fdl-logging: transitive via ptl-mvc > fdl-cmmn > fdl-logging; psl-dataaccess: missing (not declared)
  Data access configuration (informational, does not affect results):
    ⚠ Mapper interfaces exist but no MapperConfigurer, @MapperScan or mybatis-spring-boot-starter was found

🗄️ DAO / Mapper Layer:
  Total: 3 | Passed: 2 ✓ | Failed: 1 ✗ | Skipped: 1
  Styles: iBatis DAO 0, MyBatis DAO 1, Mapper IF 1, no style (no eGov base class or Mapper annotation) 1
  Check: Base (eGov base class / Mapper annotation origin) + Bean (@Repository or @Mapper/@EgovMapper) + Version (annotation package matches runtime generation; n/a when the generation is unknown)
  Failed files:
    ✗ src/main/java/egov/sample/dao/PlainDAO.java [no style]: Base FAIL (no egov base); Bean FAIL (no @Repository)
  Skipped files (not judged):
    - configuration — @Configuration class (1): src/main/java/egov/sample/config/EgovConfigMapper.java

🎯 Controller Layer:
  Total: 2 | Passed: 1 ✓ | Failed: 1 ✗
  Check: @Controller/@RestController + mapping annotation (class level or on every public method) + does not inject DAO/Dao/Mapper types (DAO belongs in ServiceImpl)
  Failed files:
    ✗ src/main/java/egov/sample/web/BarController.java: missing @Controller/@RestController, mapping annotation on 0/1 public methods

⚙️ Service Layer:
  Total: 0 | Passed: 0 ✓ | Failed: 0 ✗
  Check: extends EgovAbstractServiceImpl + @Service + implements *Service

Progress:
  🔍 Checking project build files with ripgrep...
  🔍 Checking DAO / Mapper layer with ripgrep...
  🔍 Scanning data access configuration with ripgrep...
  🔍 Checking Controller layer with ripgrep...
  🔍 Checking Service layer with ripgrep...
  ✅ Architecture check completed with ripgrep

💡 Tips:
  • Use exportResults: true to save detailed results to CSV files in the project directory
  • Use runtimeGeneration ("3.x" | "4.x" | "5.x") to override the generation detected from build files
  • Review failed files to ensure eGovFrame standards compliance
```

### 예시 2. CSV 리포트까지 생성

```
User: "/workspace/board-app 검사 결과를 CSV 로도 뽑아줘"

Claude: (egov_check_compliance 호출, exportResults: true)
        → /workspace/board-app/Result_Controller_<date>.csv
        → /workspace/board-app/Result_Service_<date>.csv
        → /workspace/board-app/Result_DAO_<date>.csv
        → /workspace/board-app/Result_Project_<date>.csv
```

`<date>` 는 실행일(`YYYY-MM-DD`) 입니다. 결과가 0건인 레이어의 CSV 는 쓰지 않고, `Result_Project_<date>.csv` 는 Java 파일이 하나도 없어도 빌드 파일 판정이 있으면 작성됩니다. CSV 열은 다음과 같습니다.

| 파일                   | 열                                                                           |
|-----------------------|------------------------------------------------------------------------------|
| `Result_Controller_*` | Path, FileName, @Controller, Mapping Annotation (`PASS` / `Class level` / `a/b` / `FAIL`), DAO X, Result |
| `Result_Service_*`    | Path, FileName, Extends EgovAbstractServiceImpl, @Service, Implements Service, Result |
| `Result_DAO_*`        | Path, FileName, Style, Base, Bean, Version, Result                           |
| `Result_Project_*`    | Module, Item, Status, Evidence (모듈별 runtime · 필수 라이브러리 4종 · result 행, 데이터 접근 설정 행, 미분류 파일 행, 프로젝트 전체 version-consistency · result 행) |

### 예시 3. 실행환경 세대를 수동 지정

```
User: "/workspace/legacy-app 은 5.x 로 올릴 예정이야. 5.x 기준으로 DAO 어노테이션이 맞는지 봐줘"

Claude: (egov_check_compliance 호출, runtimeGeneration: "5.x")
        → 4.x 용 @Mapper 인터페이스가 Version FAIL (@Mapper → 5.x requires @EgovMapper) 로 표시됨
```

호출 입력 예:
```json
{
  "projectPath": "/workspace/legacy-app",
  "runtimeGeneration": "5.x"
}
```

빌드 파일이 없거나 세대를 판정할 수 없는 프로젝트에서도 이 옵션으로 Version 체크를 켤 수 있습니다.

### 예시 4. codegen 으로 만든 직후 검증

```
User: "방금 만든 board-app 이 표준에 맞는지 바로 확인하고,
       문제 있으면 위반 파일 보여줘"

Claude: (egov_check_compliance 호출 후, 실패 파일 목록과 사유를 사람이 읽기 좋게 정리)
```

> 💡 **Tip** — [`egovframe-mcp-codegen`](../egovframe-mcp-codegen) 으로 생성한 프로젝트는 모든 레이어가 자동으로 표준을 만족하도록 템플릿화되어 있어, 신규 스캐폴드 직후의 검사 결과는 100% 가 기대값입니다. 이 도구의 진가는 **legacy 코드** 또는 **수동으로 추가한 컴포넌트** 검사에서 드러납니다. 단, Project 항목은 필수 라이브러리 4종을 모든 모듈에 엄격 적용하므로 배치·MSA 같은 템플릿은 누락 라이브러리가 근거와 함께 `NotFound` 로 표시될 수 있습니다.

## 🗂️ 폴더 구조 (Project Structure)

```
egovframe-mcp-check/
├── src/
│   ├── index.ts                      # MCP 서버 진입점 (egov_check_compliance 만 등록, rgPath 지연 로드·주입)
│   ├── tools/
│   │   └── checkArchitecture.ts      # 도구 진입 — projectPath 검증 + 엔진 호출 + 텍스트 리포트 생성
│   ├── shared/                       # 결과 계약 (업스트림과 공유하는 순수 타입·함수)
│   │   ├── archCheck.ts              #   결과 타입 (ArchCheckResults, ProjectCheckSummary 등)
│   │   └── archCheckReport.ts        #   Project 결과를 Module/Item/Status/Evidence 행으로 펴는 projectReportRows
│   └── utils/                        # 점검 엔진 (업스트림 egovframe-vscode-initializr 와 동일 로직)
│       ├── archChecker.ts            #   진입점 checkEgovArchitecture / exportArchResults, 파일 수집(ripgrep/fs), Controller·Service 판정, CSV 작성
│       ├── daoCheck.ts               #   DAO / Mapper 통합 레이어 — 분류·제외 규칙, 상속 체인 추적, Base/Bean/Version 판정
│       ├── buildFileCheck.ts         #   Project 항목 — 모듈별 세대·버전, 필수 4종, 버전 일관성, 파일→모듈 세대 매핑
│       ├── dataAccessConfigScan.ts   #   데이터 접근 설정 정보 + 미분류 데이터 접근 파일
│       ├── runtimeModuleGraph.ts     #   실행환경 브랜치별 모듈 의존 그래프 상수 + 전이 도달 판정
│       ├── mavenPom.ts               #   pom.xml 파서 (parent·properties·dependencies·dependencyManagement·modules, ${…} 치환)
│       ├── gradleBuild.ts            #   build.gradle(.kts)·settings.gradle·gradle.properties·libs.versions.toml 파서
│       ├── javaIndex.ts              #   .java FQCN 색인 + Java 이름 해석 순서의 타입 참조 해석
│       ├── javaSource.ts             #   주석 제거, package/import 수집, 타입 선언부 추출, 읽기 캐시
│       └── debugLog.ts               #   EGOV_CHECK_DEBUG 로 gating 되는 stderr 정보성 로그
│
├── tests/                            # vitest (tests/**/*.test.ts)
│   ├── checkArchitecture.test.ts     #   도구 리포트·입력 검증·stdout 청결·로그 gating (임시 fixture 프로젝트)
│   ├── archChecker.test.ts, daoCheck.test.ts, buildFileCheck.test.ts, dataAccessConfigScan.test.ts,
│   │   runtimeModuleGraph.test.ts, mavenPom.test.ts, gradleBuild.test.ts, javaIndex.test.ts,
│   │   javaSource.test.ts, archCheckReport.test.ts   # 업스트림 spec 의 이식본
│   ├── acceptance.test.ts            #   공식 템플릿 인수 검증 (EGOV_ACCEPTANCE_DIR 미설정 시 skip)
│   └── fixtures/runtime-graph/       #   실행환경 브랜치별 모듈 의존 추출 원본 (graph-<branch>.txt)
│
├── build/                            # tsc 산출물 (npm run build 후 생성)
│   └── index.js                      # MCP 실행 엔트리 (chmod 755)
│
├── scripts/pack-platforms.sh         # 플랫폼별 번들 tgz 패키징
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── LICENSE
```

의존 방향은 `javaSource` → `javaIndex` → `daoCheck`, 그리고 `mavenPom`·`gradleBuild`·`runtimeModuleGraph` → `buildFileCheck` 입니다. `archChecker.ts` 가 이들을 순서대로 호출하며, Project 결과의 세대를 DAO / Mapper 의 Version 체크에 넘기고 DAO 판정 대상 타입 이름을 Controller "DAO X" 의 입력으로 씁니다. 도구 진입점(`src/index.ts`, `src/tools/checkArchitecture.ts`) 만 이 저장소 고유 코드이고, `src/utils/*`·`src/shared/*` 는 업스트림과 동기화를 위해 판정 로직을 그대로 유지합니다.

## ⚙️ 내부 동작 (How it works)

1. **파일 수집** (`collectProjectFiles`, 모든 레이어 공통 규칙)
   - `@vscode/ripgrep` 의 `rgPath` 가 실제로 존재하면 `rg --files --no-ignore` 를 `shell: false` 인자 배열로 spawn 하고, 없으면 Node `fs` 재귀 탐색으로 대체합니다. **두 경로는 같은 파일 집합**을 돌려줍니다. `@vscode/ripgrep` 은 플랫폼 바이너리 패키지가 없으면 로드 시점에 예외를 던지므로 `src/index.ts` 가 **지연 로드**하여 실패 시 서버를 죽이지 않고 fs 경로로 넘어갑니다. 검색 경로 인자 앞에는 `--` 를 붙여 `-` 로 시작하는 디렉터리 이름이 rg 옵션으로 해석되지 않게 합니다.
   - 숨김 디렉터리(`.` 으로 시작) 와 빌드 산출물 디렉터리(`node_modules`, `target`, `build`, `out`, `dist`) 는 건너뛰고, `src/test`·`src/it` 아래는 수집하지 않습니다 (테스트 픽스처가 판정과 "DAO X" 이름 집합에 섞이지 않도록).
   - `--no-ignore` 로 `.gitignore`·`.ignore` 와 무관하게 수집합니다. `.java` 는 한 번만 모아 색인하고 레이어별 파일은 그 목록에서 파일 이름 접미어로 거릅니다.
2. **실행 순서**
   Project(빌드 파일) → DAO / Mapper → 데이터 접근 설정 정보 → Controller → Service. Project 가 먼저 도는 이유는 그 세대가 DAO / Mapper Version 체크의 입력이기 때문이고, DAO / Mapper 가 Controller 보다 먼저 도는 이유는 그 판정 대상 타입 이름이 Controller "DAO X" 의 입력이기 때문입니다.
3. **읽기 캐시**
   빌드 파일과 `.java` 는 `createCachedReader` 로 경로당 한 번만 읽습니다. 판정 모듈은 파일 읽기를 주입받는 순수 모듈이어서 vitest 로 직접 검증합니다.
4. **리포트 생성**
   `src/tools/checkArchitecture.ts` 가 엔진 결과를 위 출력 형식의 텍스트로 만들고, `exportResults: true` 면 `exportArchResults` 로 CSV 도 함께 작성합니다.

### 로그

stdio 전송에서 **stdout 은 JSON-RPC 채널**이므로 서버는 stdout 에 아무것도 쓰지 않습니다. 파일별 진행 상황 같은 정보성 로그는 환경 변수 `EGOV_CHECK_DEBUG` 가 켜진 경우에만 stderr 로 출력하며, 오류 로그도 파일 이름(basename) 만 남기고 절대 경로는 남기지 않습니다.

```bash
EGOV_CHECK_DEBUG=1 node build/index.js
```

## 🧪 디버깅 / Inspector

```bash
npm run inspector
```

빌드된 `build/index.js` 를 MCP Inspector 에 띄워 `egov_check_compliance` 를 인터랙티브하게 호출할 수 있습니다.

```bash
npm test                                   # tsc 빌드 + vitest 전체
EGOV_ACCEPTANCE_DIR=/path/to/templates npm test   # 공식 템플릿을 풀어 둔 디렉터리로 인수 테스트까지
```

## ⚠️ 한계 (Limitations)

- 현재 검사 범위는 **Java + eGovFrame 표준 어노테이션/베이스 클래스** 에 한정됩니다. Kotlin/Groovy 소스나 Spring 표준만 따르는(eGov 베이스 미상속) 클래스는 별도 규칙으로 추가가 필요합니다.
- Mapper XML 의 SQL 내용은 검사하지 않습니다. 설정 파일(XML·yml·properties·Java Config) 과 빌드 파일은 데이터 접근 설정의 **존재 여부**만 정보 항목으로 모으며 판정에는 넣지 않습니다.
- 빌드 파일은 빌드 도구를 실행하지 않고 텍스트로 읽습니다. Gradle 은 1차 범위의 선언 형태만 인식하고, 번들·루프·헬퍼 함수·conventions 플러그인처럼 해석이 확실하지 않은 형태는 추측하지 않고 `unknown` 으로 남깁니다.
- 검사는 **정적(static)** 분석입니다. 런타임 Bean 등록 여부나 트랜잭션 propagation 정상성은 판정하지 않습니다.

## 🔗 함께 쓰는 자매 MCP

- **[egovframe-mcp-codegen](../egovframe-mcp-codegen)** — DDL 한 줄로 eGovFrame 프로젝트/엔티티 자동 생성 (이 도구의 레이어 검사 결과를 100% 만족)
- **[egovframe-mcp-search](../egovframe-mcp-search)** — eGovFrame 가이드/표준 용어/공통컴포넌트/호환성 통합 검색

## 📄 라이선스

Apache-2.0
