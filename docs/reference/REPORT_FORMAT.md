# 점검 결과 형식

이 문서는 `egov_check_compliance` 도구가 돌려주는 응답의 형식을 설명합니다. 점검 항목과 판정 규칙은 [CHECK_RULES.md](./CHECK_RULES.md)에서 다룹니다.

> 구현 파일: `src/tools/checkArchitecture.ts` (텍스트 리포트와 링크), `src/utils/archChecker.ts` (CSV)

## 응답의 구성

응답의 `content` 는 다음 순서의 블록으로 이루어집니다.

| 순서 | 블록 | 내용 |
|------|------|------|
| 1 | `text` 1개 | LLM 과 사람이 읽는 텍스트 리포트 |
| 2 | `resource_link` 0개 이상 | 실패로 판정된 파일의 링크 (최대 100개) |
| 3 | `resource_link` 0개 이상 | `exportResults: true` 일 때 실제로 쓰인 CSV 파일의 링크 |

텍스트 안의 파일 경로는 모두 **`projectPath` 기준 상대 경로**(`/` 구분자)이며 절대 경로는 쓰지 않습니다. 절대 경로가 들어가는 곳은 `resource_link` 의 `uri` 와, 사용자가 넘긴 `projectPath` 를 그대로 되돌려 주는 입력 검증 오류 문구뿐입니다.

## 텍스트 리포트

텍스트는 영문으로 작성되며 다음 순서의 섹션으로 이루어집니다. 실제 출력에는 섹션 제목 앞에 그림 문자가 하나씩 붙고, 통과와 실패 수 뒤에 표시 기호가 붙습니다. 이 문서의 표와 예시에서는 그 기호를 생략하고 적습니다.

| 순서 | 섹션 제목 | 내용 |
|------|-----------|------|
| 1 | `eGovFrame Architecture Check Completed` | 첫 줄 |
| 2 | `Overall Statistics (Controller + Service + DAO / Mapper)` | 세 레이어의 합계: 총 파일 수(`Total Files`), 통과(`Passed`), 실패(`Failed`), 준수율(`Compliance Rate`), 판정에서 뺀 파일 수(`Skipped (not judged)`). Project 는 파일 집계에 넣지 않습니다. |
| 3 | `Project (build files)` | 프로젝트 전체의 실행환경과 결과, 결과 값과 라이브러리 상태 값의 뜻을 적은 `Legend` 두 줄, 버전 일관성, 모듈별 결과, 데이터 접근 설정 정보, 미분류 데이터 접근 파일 |
| 4 | `DAO / Mapper Layer` | 집계, 구현 방식(Style)별 수, 점검 항목 설명, 실패 파일과 사유, 판정에서 뺀 파일(사유별 묶음) |
| 5 | `Controller Layer` | 집계, 점검 항목 설명, 실패 파일과 사유 |
| 6 | `Service Layer` | 집계, 점검 항목 설명, 실패 파일과 사유 |
| 7 | `Progress` | 진행 메시지. 문구에 `with ripgrep` 이 붙어 있으면 ripgrep 으로 파일을 수집한 것입니다. |
| 8 | `Exported Files` | `exportResults: true` 일 때만 나옵니다. 실제로 쓰인 CSV 파일의 이름을 나열합니다. |
| 9 | `Failed File Links` | 실패 파일 가운데 몇 개를 링크로 붙였는지 알립니다. 실패 파일이 0개이면 나오지 않습니다. |
| 10 | `Tips` | `exportResults`, `runtimeGeneration` 사용 안내 |

### 예시

`pom.xml` 하나와 Controller 2개, DAO / Mapper 후보 4개가 있는 프로젝트를 점검한 결과입니다.

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
  Legend — Result: OK = all 4 required libraries resolved; NotFound = a required library is missing or excluded, or versions are inconsistent; Unknown = could not be resolved (not counted as failure); Skipped = aggregate build file.
  Legend — library status: direct | transitive via <path> | excluded (cut by an <exclusion>) | missing | unknown (unresolvable, not a failure). Runtime source: property | bom | dependency-version | artifact-pattern | manual | none.
  Version consistency: PASS (4.3.0)
  Modules:
  - pom.xml [maven] NotFound — runtime 4.3.0 (4.x, property)
      ptl-mvc: direct; fdl-cmmn: transitive via ptl-mvc > fdl-cmmn; fdl-logging: transitive via ptl-mvc > fdl-cmmn > fdl-logging; psl-dataaccess: missing (not declared)
  Data access configuration (informational, does not affect results):
    Mapper interfaces exist but no MapperConfigurer, @MapperScan or mybatis-spring-boot-starter was found

DAO / Mapper Layer:
  Total: 3 | Passed: 2 | Failed: 1 | Skipped: 1
  Styles: iBatis DAO 0, MyBatis DAO 1, Mapper IF 1, no style (no eGov base class or Mapper annotation) 1
  Check: Base (eGov base class / Mapper annotation origin) + Bean (@Repository or @Mapper/@EgovMapper) + Version (annotation package matches runtime generation; n/a when the generation is unknown)
  Failed files:
    src/main/java/egov/sample/dao/PlainDAO.java [no style]: Base FAIL (no egov base); Bean FAIL (no @Repository)
  Skipped files (not judged):
    - configuration — @Configuration class (1): src/main/java/egov/sample/config/EgovConfigMapper.java

Controller Layer:
  Total: 2 | Passed: 1 | Failed: 1
  Check: @Controller/@RestController + mapping annotation (class level or on every public method) + does not inject DAO/Dao/Mapper types (DAO belongs in ServiceImpl)
  Failed files:
    src/main/java/egov/sample/web/BarController.java: missing @Controller/@RestController, mapping annotation on 0/1 public methods

Service Layer:
  Total: 0 | Passed: 0 | Failed: 0
  Check: extends EgovAbstractServiceImpl + @Service + implements *Service

Progress:
  Checking project build files with ripgrep...
  Checking DAO / Mapper layer with ripgrep...
  Scanning data access configuration with ripgrep...
  Checking Controller layer with ripgrep...
  Checking Service layer with ripgrep...
  Architecture check completed with ripgrep

Failed File Links: all 3 failed files are attached as resource_link blocks

Tips:
  • Use exportResults: true to save detailed results to CSV files in the project directory
  • Use runtimeGeneration ("3.x" | "4.x" | "5.x") to override the generation detected from build files
  • Review failed files to ensure eGovFrame standards compliance
```

### Project 섹션 읽는 법

- `Runtime: <버전> (<세대>) · Result: <결과>` 는 프로젝트 전체의 판정입니다. `runtimeGeneration` 을 지정한 호출에서는 세대가 지정한 값으로 표시되고, 모듈 줄의 근거(source)가 `manual` 이 됩니다.
- `Version consistency` 는 `PASS`, `FAIL`, `n/a (not judged)` 가운데 하나이고, 괄호 안에 근거가 붙습니다.
- 모듈마다 `- <빌드 파일> [maven 또는 gradle] <결과> — runtime <버전> (<세대>, <근거>)` 한 줄과, 필수 라이브러리 4종의 상태를 적은 한 줄이 나옵니다. 집계 모듈은 라이브러리 줄 대신 `(aggregate build file — not judged)` 가 나옵니다.
- 모듈이 15개를 넘으면 결과가 `OK` 인 모듈은 `- N modules OK (all 4 required libraries resolved): ...` 한 줄로 접고(이름은 10개까지), 나머지 모듈만 상세하게 출력합니다.
- 빌드 파일을 찾지 못하면 `Modules: No Maven/Gradle build files found` 가 나옵니다.
- `Data access configuration` 과 `Unclassified data-access files` 는 정보 항목이며 판정에 영향을 주지 않습니다. 각각 20건까지 출력하고, 넘으면 남은 수와 CSV 로 전체를 보는 방법을 알립니다. 데이터 접근 설정을 하나도 찾지 못하면 `none found` 가 나옵니다.

### 레이어 섹션 읽는 법

- 집계 줄은 `Total: n | Passed: n | Failed: n` 형태이고, DAO / Mapper 레이어에는 `| Skipped: n` 이 더 붙습니다.
- 실패 파일 줄은 `<상대 경로>: <사유>` 형태입니다. DAO / Mapper 레이어는 경로 뒤에 `[iBatis DAO]`, `[MyBatis DAO]`, `[Mapper IF]`, `[no style]` 가운데 하나가 붙고, 실패한 체크만 `Base FAIL (...)`, `Bean FAIL (...)`, `Version FAIL (...)` 로 나옵니다.
- 레이어별 실패 파일은 **100개**까지 출력하고, 넘으면 `... and N more` 로 줄입니다. 전체 목록은 CSV 로 확인합니다.
- 판정에서 뺀 파일(`Skipped files`)은 사유별로 묶어 `- <사유> — <설명> (<개수>): <경로>, ...` 로 출력하며, 사유마다 10개까지 나옵니다.
- 점검 대상 파일이 0건이면 `Compliance Rate` 는 `n/a (no files checked)` 로 표기됩니다.
- 엔진 오류로 점검하지 못한 섹션에는 `not checked` 가 나옵니다.

## 실패 파일 링크 (`resource_link`)

텍스트 블록 뒤에는 실패로 판정된 파일마다 MCP `resource_link` 콘텐츠 블록이 하나씩 붙습니다. Project 섹션에서 `NotFound` 로 판정된 모듈의 빌드 파일(`pom.xml`, `build.gradle`, `build.gradle.kts`)도 포함하며, 순서는 Project, DAO / Mapper, Controller, Service 입니다. 버전 불일치는 특정 파일의 실패가 아니므로 링크로 붙지 않습니다.

```json
{
  "type": "resource_link",
  "uri": "file:///home/me/sample/src/main/java/egov/sample/web/BarController.java",
  "name": "src/main/java/egov/sample/web/BarController.java",
  "description": "Controller: missing @Controller/@RestController, mapping annotation on 0/1 public methods"
}
```

| 필드 | 값 |
|------|-----|
| `uri` | 파일의 절대 경로를 나타내는 `file://` URI. 클라이언트가 파일을 바로 열 수 있게 하려는 것이며, `projectPath` 아래의 파일만 담습니다. |
| `name` | `projectPath` 기준 상대 경로 |
| `description` | 레이어 이름과 실패 사유. 텍스트 리포트의 사유와 같은 문구입니다. |

링크는 레이어 합계로 최대 **100개**까지 붙습니다. 실패 파일이 100개를 넘으면 먼저 레이어마다 앞쪽 **5개**를 확보하고, 남은 자리를 위 순서대로 채워 100개를 맞춥니다. 그래서 앞 레이어의 실패가 많아도 뒤 레이어의 실패 파일이 최소 5개(5개 이하면 전부)는 링크로 붙습니다. 링크로 붙지 않은 파일이 있으면 텍스트의 `Failed File Links` 섹션이 그 수와, `exportResults: true` 로 전체 목록을 CSV 로 받는 방법을 알립니다.

상한을 두는 이유는 응답 크기입니다. 링크 하나가 약 400자여서, 실패 파일이 500개인 프로젝트에서 링크를 모두 붙이면 응답이 약 19만 자가 되어 MCP 클라이언트의 도구 응답 한도를 넘을 수 있습니다. 상한이 100 이면 같은 프로젝트에서 응답 전체가 약 5만 3천 자입니다.

링크를 누를 수 있는 형태로 보여 줄지는 MCP 클라이언트마다 다르므로, 텍스트의 실패 목록도 그대로 유지합니다. 채팅 답변에 링크를 옮겨 적을지는 LLM 이 판단합니다. 도구의 description 에는 레이어별로 실패 파일이 5개 이하이면 전부, 넘으면 최소 5개를 `uri` 를 대상으로 하는 마크다운 링크로 보여 주라는 안내가 들어 있지만, LLM 이 항상 그대로 따른다고 보장할 수는 없습니다.

## CSV 내보내기 (`exportResults: true`)

`exportResults: true` 로 호출하면 `projectPath` 바로 아래에 CSV 파일을 씁니다. `<date>` 는 실행일(UTC 기준 `YYYY-MM-DD`)입니다.

| 파일 | 열 |
|------|-----|
| `Result_Controller_<date>.csv` | `Path`, `FileName`, `@Controller`, `Mapping Annotation`, `DAO X`, `Result` |
| `Result_Service_<date>.csv` | `Path`, `FileName`, `Extends EgovAbstractServiceImpl`, `@Service`, `Implements Service`, `Result` |
| `Result_DAO_<date>.csv` | `Path`, `FileName`, `Style`, `Base`, `Bean`, `Version`, `Result` |
| `Result_Project_<date>.csv` | `Module`, `Item`, `Status`, `Evidence` |

- 레이어 CSV 에는 통과한 파일을 포함해 판정한 모든 파일이 한 행씩 들어갑니다. `Result` 열은 통과이면 `OK`, 실패이면 `NotFound` 입니다.
- `Path` 열은 파일이 있는 디렉토리의 **절대 경로**입니다. CSV 를 다른 사람에게 전달할 때에는 이 점을 고려합니다.
- 체크 열의 값은 `PASS` 또는 `FAIL` 입니다. Controller 의 `Mapping Annotation` 열은 `PASS`(모든 public 메서드에 매핑), `Class level`(클래스 레벨 `@RequestMapping` 으로 통과), `a/b`(매핑된 메서드 수/전체 수), `FAIL` 가운데 하나입니다.
- DAO 의 `Style` 열은 `iBatis DAO`, `MyBatis DAO`, `Mapper IF`, `-`(구현 방식을 정하지 못함) 가운데 하나입니다. `Base`, `Bean`, `Version` 열에는 `PASS (4.x)`, `FAIL (no @Repository)` 처럼 결과와 근거가 함께 들어가고, 세대를 몰라 판정하지 않은 `Version` 은 `n/a` 입니다.
- `Result_Project_<date>.csv` 는 모듈마다 `runtime` 행, 필수 라이브러리 4종 행, `result` 행을 싣고(집계 모듈은 `runtime` 과 `result` 행만), 그 뒤에 데이터 접근 설정 행(`data-access-config`), 미분류 파일 행(`unclassified`), 프로젝트 전체의 `version-consistency` 행과 `result` 행을 싣습니다. 프로젝트 전체에 해당하는 행의 `Module` 열은 `*` 입니다.
- 결과가 0건인 레이어의 CSV 는 쓰지 않습니다. `Result_Project_<date>.csv` 는 Java 파일이 하나도 없어도 빌드 파일 판정이 있으면 작성됩니다.
- 같은 날 다시 실행하면 같은 이름의 파일을 덮어씁니다.
- 실제로 쓰인 CSV 파일은 텍스트의 `Exported Files` 섹션에 이름이 나열되고, 실패 파일 링크 뒤에 `resource_link` 블록으로도 붙습니다(`description` 은 `Full Controller check results (CSV)` 형태).
- 프로젝트 루트에 쓸 수 없으면 점검 결과는 그대로 돌려주고, `CSV export failed (EACCES) — check write permission on the project root. The analysis results above are complete.` 형태의 경고를 `Progress` 와 `Exported Files` 섹션에 덧붙입니다.

## 오류 응답

오류는 JSON-RPC 오류가 아니라 `isError: true` 인 도구 결과로 돌아오고, 원인은 `content` 의 `text` 에 담깁니다.

| 상황 | `text` |
|------|--------|
| `projectPath` 인자를 주지 않았거나 빈 문자열을 줌 | 입력 스키마의 검증 오류 (`MCP error -32602: Input validation error ...`) |
| `projectPath` 가 공백뿐인 문자열임 | `Error: projectPath is required` |
| `projectPath` 가 가리키는 경로가 없거나 접근할 수 없음 | `Error: projectPath does not exist or is not accessible: <경로>` |
| `projectPath` 가 디렉토리가 아님 | `Error: projectPath must be a directory: <경로>` |
| `runtimeGeneration` 이 `"3.x"`, `"4.x"`, `"5.x"` 가 아니거나 `exportResults` 가 boolean 이 아님 | 입력 스키마의 검증 오류 (`MCP error -32602: Input validation error: Invalid arguments for tool egov_check_compliance: [...]`) |
| 점검 엔진 실행 중 오류 | `Error: Architecture check failed: <원인>`. 원인 문구에 프로젝트의 절대 경로가 들어 있으면 `<projectPath>` 로 가려서 돌려줍니다. |

응답에는 스택 트레이스가 실리지 않습니다. 스택 트레이스는 환경 변수 `EGOV_CHECK_DEBUG` 를 켠 경우에만 서버 로그(stderr)에 남습니다.
