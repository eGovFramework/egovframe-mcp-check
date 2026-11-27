# 코드 구성과 동작 방식

이 문서는 `egovframe-mcp-check` 서버의 모듈 구성과 점검이 진행되는 과정을 설명합니다. 판정 규칙 자체는 [CHECK_RULES.md](../reference/CHECK_RULES.md)에, 빌드와 테스트 방법은 [DEVELOPMENT_GUIDE.md](../development/DEVELOPMENT_GUIDE.md)에 있습니다.

## 전체 구조

```
        MCP client (stdio, JSON-RPC)
                    |
          egov_check_compliance            src/index.ts
                    |
      입력 검증, 텍스트 리포트와 링크 생성      src/tools/checkArchitecture.ts
                    |
        점검 엔진 (checkEgovArchitecture)    src/utils/archChecker.ts
                    |
   +----------+-----+------+-----------+-----------+
   |          |            |           |           |
 Project   DAO/Mapper   데이터 접근   Controller   Service
                        설정 정보
```

서버는 stdio 로 통신하는 MCP 서버이고 도구 하나만 등록합니다. 리소스와 프롬프트는 노출하지 않습니다. 서버 이름과 버전은 `package.json` 에서 읽습니다.

## 모듈 구성

| 모듈 | 책임 | 출처 |
|------|------|------|
| `src/index.ts` | MCP 서버 진입점. `egov_check_compliance` 를 등록하고, `@vscode/ripgrep` 의 실행 파일 경로(`rgPath`)를 지연 로드해서 도구에 넘깁니다. 텍스트 리포트 뒤에 `resource_link` 블록을 붙여 응답하고, 예외는 `isError` 인 텍스트 결과로 바꿉니다. | 이 저장소 고유 |
| `src/tools/checkArchitecture.ts` | `projectPath` 를 검증하고 절대 경로로 바꾼 뒤 엔진을 호출합니다. 엔진의 결과로 텍스트 리포트, 실패 파일 목록, `resource_link` 블록을 만들고, `exportResults` 이면 CSV 내보내기를 호출합니다. | 이 저장소 고유 |
| `src/utils/debugLog.ts` | `EGOV_CHECK_DEBUG` 가 켜졌을 때만 stderr 로 쓰는 정보성 로그 | 이 저장소 고유 |
| `src/shared/archCheck.ts` | 결과 타입 (`ArchCheckResults`, `ProjectCheckSummary`, `SkippedFile` 등) | 업스트림과 동일 |
| `src/shared/archCheckReport.ts` | Project 결과를 Module / Item / Status / Evidence 행으로 펴는 `projectReportRows` (CSV `Result_Project` 가 사용) | 업스트림과 동일 |
| `src/utils/archChecker.ts` | 엔진 진입점 `checkEgovArchitecture` 와 `exportArchResults`. 파일 수집(ripgrep 또는 fs), 실행 순서, Controller 와 Service 판정, 레이어별 집계, CSV 작성 | 업스트림과 동일 |
| `src/utils/daoCheck.ts` | DAO / Mapper 레이어. 구현 방식 분류, 제외 규칙, 상속 체인 추적, Base / Bean / Version 판정 | 업스트림과 동일 |
| `src/utils/buildFileCheck.ts` | Project 항목. 모듈별 세대와 버전, 필수 라이브러리 4종, 버전 일관성, 파일이 속한 모듈의 세대 조회 | 업스트림과 동일 |
| `src/utils/dataAccessConfigScan.ts` | 데이터 접근 설정 정보와 미분류 데이터 접근 파일 (정보 항목) | 업스트림과 동일 |
| `src/utils/runtimeModuleGraph.ts` | 실행환경 브랜치별 모듈 의존 그래프 상수와 전이 도달 판정 | 업스트림과 동일 |
| `src/utils/mavenPom.ts` | `pom.xml` 파서 (parent, properties, dependencies, dependencyManagement, modules, `${...}` 치환) | 업스트림과 동일 |
| `src/utils/gradleBuild.ts` | `build.gradle`, `build.gradle.kts`, `settings.gradle`, `gradle.properties`, `libs.versions.toml` 파서 | 업스트림과 동일 |
| `src/utils/javaIndex.ts` | `.java` 파일의 FQCN 색인과, Java 의 이름 해석 순서를 따르는 타입 참조 해석 | 업스트림과 동일 |
| `src/utils/javaSource.ts` | 주석 제거, package 와 import 수집, 타입 선언부 추출, 읽기 캐시 | 업스트림과 동일 |

"업스트림" 은 VS Code 확장 [egovframe-vscode-initializr](https://github.com/eGovFramework/egovframe-vscode-initializr) 의 Architecture Check(archChecker) 엔진입니다. 이 저장소의 점검 엔진은 그 엔진을 이식한 것이며, 판정 로직을 업스트림과 동일하게 유지합니다. 동기화 규칙은 [DEVELOPMENT_GUIDE.md](../development/DEVELOPMENT_GUIDE.md#엔진-모듈은-업스트림과-동일하게-유지)에 있습니다.

엔진 안의 의존 관계는 두 갈래입니다. Java 소스 쪽에서는 `daoCheck` 가 `javaIndex` 를, `javaIndex` 가 `javaSource` 를 사용합니다. 빌드 파일 쪽에서는 `buildFileCheck` 가 `mavenPom`, `gradleBuild`, `runtimeModuleGraph` 를 사용합니다. `archChecker.ts` 가 이 모듈들을 순서대로 호출합니다.

## 점검이 진행되는 과정

### 1. 입력 검증

`src/tools/checkArchitecture.ts` 가 `projectPath` 가 존재하는 디렉토리인지 먼저 확인하고, 절대 경로로 바꿉니다. 존재하지 않거나 디렉토리가 아니면 엔진을 호출하지 않고 오류를 돌려줍니다.

### 2. 파일 수집

모든 레이어가 같은 규칙으로 파일을 수집합니다.

- `@vscode/ripgrep` 의 실행 파일이 실제로 있으면 `rg --files --no-ignore` 를 실행하고, 없으면 Node.js 의 `fs` 로 디렉토리를 재귀 탐색합니다. 두 경로는 같은 수집 규칙을 쓰며, ripgrep 쪽이 빠릅니다. ripgrep 으로 수집했으면 결과의 Progress 문구에 `with ripgrep` 이 붙습니다.
- ripgrep 은 셸을 거치지 않고 인자 배열로 실행합니다. 프로젝트의 부모 디렉토리를 작업 디렉토리로 삼아 프로젝트 디렉토리 이름을 검색 경로로 넘기고, 검색 경로 인자 앞에는 `--` 를 붙여서 `-` 로 시작하는 디렉토리 이름이 ripgrep 의 옵션으로 해석되지 않게 합니다.
- `@vscode/ripgrep` 패키지는 플랫폼용 실행 파일 패키지가 없으면 불러오는 시점에 예외를 던집니다. 그래서 `src/index.ts` 는 이 패키지를 서버 시작 시점이 아니라 도구가 처음 호출될 때 불러오고, 실패하면 서버를 종료하지 않고 `fs` 탐색으로 넘어갑니다. 이때 서버 로그(stderr)에 `ripgrep unavailable, using fs-based file search` 가 남습니다.
- 이름이 `.` 으로 시작하는 디렉토리와 이름이 `node_modules`, `target`, `build`, `out`, `dist` 인 디렉토리는 깊이와 관계없이 건너뛰고, `src/test` 와 `src/it` 아래는 수집하지 않습니다. 심볼릭 링크는 따라가지 않습니다.
- `--no-ignore` 를 주어 `.gitignore`, `.ignore` 와 관계없이 수집합니다.
- `.java` 파일은 한 번만 모아서 색인하고, 레이어별 파일은 그 목록에서 파일 이름의 접미어로 거릅니다.

두 수집 경로의 결과가 달라지는 경우가 두 가지 있습니다.

| 경우 | ripgrep 경로 | fs 경로 |
|------|--------------|---------|
| 이름이 `.` 으로 시작하는 파일 (예: macOS 에서 만든 압축 파일을 풀면 생기는 `__MACOSX/._Foo.java`) | 수집함 | 수집하지 않음 |
| 프로젝트 안에 읽을 권한이 없는 디렉토리가 있음 | ripgrep 이 오류 코드로 끝나서 수집 결과가 0건이 됨 | 그 디렉토리만 건너뛰고 나머지를 수집함 |

모든 레이어의 총 파일 수가 0으로 나오는데 Progress 문구에 `with ripgrep` 이 붙어 있으면, 프로젝트 안에 읽을 수 없는 디렉토리가 있는지 확인합니다.

### 3. 실행 순서

Project(빌드 파일), DAO / Mapper, 데이터 접근 설정 정보, Controller, Service 의 순서로 실행합니다.

- Project 가 가장 먼저 실행되는 이유는, 여기에서 판정한 실행환경 세대가 DAO / Mapper 의 Version 체크에 입력으로 쓰이기 때문입니다.
- DAO / Mapper 가 Controller 보다 먼저 실행되는 이유는, DAO / Mapper 의 판정 대상 타입 이름이 Controller 의 "DAO X" 체크에 입력으로 쓰이기 때문입니다.

### 4. 읽기 캐시

빌드 파일과 `.java` 파일은 `createCachedReader` 로 경로마다 한 번만 읽습니다. 판정 모듈은 파일 읽기 함수를 주입받는 순수 모듈이어서, 실제 파일 없이 테스트에서 직접 검증할 수 있습니다.

### 5. 리포트 생성

`src/tools/checkArchitecture.ts` 가 엔진의 결과를 텍스트 리포트로 만들고, 실패 파일을 `resource_link` 블록으로 바꿉니다. `exportResults: true` 이면 엔진의 `exportArchResults` 로 CSV 도 함께 작성합니다. CSV 쓰기에 실패해도 점검 결과는 버리지 않고 경고만 덧붙입니다. 형식은 [REPORT_FORMAT.md](../reference/REPORT_FORMAT.md)에 있습니다.

## 로그

stdio 전송에서 **stdout 은 JSON-RPC 채널**이므로 서버는 JSON-RPC 메시지 외에는 stdout 에 아무것도 쓰지 않습니다. 로그는 모두 stderr 로 나갑니다.

| 종류 | 출력 조건 |
|------|-----------|
| 서버 시작 로그 세 줄, 오류, 경고 | 항상 |
| 파일별 진행 상황 같은 정보성 로그 | 환경 변수 `EGOV_CHECK_DEBUG` 가 켜진 경우 |
| 도구 실행 오류의 스택 트레이스 | 환경 변수 `EGOV_CHECK_DEBUG` 가 켜진 경우 |

`EGOV_CHECK_DEBUG` 는 비어 있지 않은 값 가운데 `0` 과 `false`(대소문자 구분 없음)를 뺀 값이면 켜진 것으로 봅니다. 점검 엔진의 오류 로그에는 파일 이름만 남기고 절대 경로는 남기지 않습니다. 다만 서버 시작 실패, ripgrep 을 불러오지 못했을 때의 메시지, 디버그 로그에는 절대 경로가 들어갈 수 있습니다.

```bash
EGOV_CHECK_DEBUG=1 node build/index.js
```

## 응답 크기의 상한

MCP 클라이언트는 큰 도구 응답을 자르거나 거부할 수 있으므로, 응답에 싣는 항목 수에 상한을 둡니다.

| 항목 | 상한 | 상수 (`src/tools/checkArchitecture.ts`) |
|------|------|------------------------------------------|
| 레이어별 실패 파일의 텍스트 목록 | 100개 | `FAILED_FILES_LIMIT` |
| 실패 파일 `resource_link` (레이어 합계) | 100개 | `MAX_FILE_LINKS` |
| 레이어마다 먼저 확보하는 링크 수 | 5개 | `MIN_FILE_LINKS_PER_LAYER` |
| 사유별 Skipped 파일 | 10개 | `SKIPPED_FILES_LIMIT` |
| 정보 항목 (데이터 접근 설정, 미분류 파일) | 각 20건 | `INFO_ITEMS_LIMIT` |
| 상세하게 출력하는 모듈 수 (넘으면 `OK` 모듈을 한 줄로 접음) | 15개 | `DETAILED_MODULES_LIMIT` |

실패 파일의 전체 목록은 `exportResults: true` 로 내보낸 CSV 에서 확인합니다.
