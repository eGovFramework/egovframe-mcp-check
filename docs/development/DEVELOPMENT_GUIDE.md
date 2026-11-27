# 개발 가이드

이 문서는 `egovframe-mcp-check` 저장소를 클론해서 빌드, 테스트, 패키징하는 방법과 코드를 고칠 때 지켜야 할 규칙을 설명합니다. 코드의 구성과 동작 방식은 [HOW_IT_WORKS.md](../architecture/HOW_IT_WORKS.md)에 있습니다.

## 준비

- Node.js 18 이상이 필요하고, Node.js 22 를 권장합니다. 저장소의 `.nvmrc` 가 22 를 가리키므로 nvm 을 쓰는 경우 `nvm use` 로 맞춥니다.
- `npm install` 은 의존성을 설치한 뒤 `prepare` 스크립트로 빌드까지 실행합니다. 의존성인 `@vscode/ripgrep` 이 현재 플랫폼용 ripgrep 실행 파일을 함께 설치하므로 ripgrep 을 따로 설치하지 않아도 됩니다.

```bash
git clone https://github.com/eGovFramework/egovframe-mcp-check.git
cd egovframe-mcp-check
nvm use
npm install
```

## 명령

| 명령 | 동작 |
|------|------|
| `npm run build` | `tsc` 로 `src/` 를 `build/` 에 컴파일하고 `build/index.js` 에 실행 권한을 줍니다. |
| `npm run watch` | `tsc --watch` |
| `npm test` | 빌드한 뒤 vitest 로 `tests/**/*.test.ts` 전체를 실행합니다. |
| `npm run test:watch` | vitest 의 watch 모드 (빌드하지 않습니다) |
| `npm run inspector` | MCP Inspector 를 `build/index.js` 에 연결합니다. |
| `npm run pack:platforms` | 플랫폼별 배포 tgz 를 `dist/` 에 만듭니다. |

MCP 클라이언트에 등록하는 진입점은 `build/index.js` 입니다.

## 테스트

vitest 를 쓰며, 테스트 하나의 제한 시간은 30초입니다(`vitest.config.ts`).

| 파일 | 검증 대상 |
|------|-----------|
| `tests/checkArchitecture.test.ts` | 도구 진입점: `projectPath` 검증, 레이어별 리포트, 실패 파일 `resource_link`, CSV 내보내기와 그 실패 처리, 경로 처리, stdout 에 아무것도 쓰지 않는지, `EGOV_CHECK_DEBUG` 에 따른 로그 출력. 임시 디렉토리에 만든 fixture 프로젝트를 씁니다. |
| `tests/archChecker.test.ts`, `tests/daoCheck.test.ts`, `tests/buildFileCheck.test.ts`, `tests/dataAccessConfigScan.test.ts`, `tests/gradleBuild.test.ts`, `tests/mavenPom.test.ts`, `tests/javaIndex.test.ts`, `tests/javaSource.test.ts`, `tests/archCheckReport.test.ts` | 점검 엔진의 모듈별 규칙. 업스트림의 `*.spec.ts` 를 이식한 것입니다. |
| `tests/runtimeModuleGraph.test.ts` | 실행환경 모듈 의존 그래프 상수(`RUNTIME_MODULE_GRAPH`)가 `tests/fixtures/runtime-graph/graph-<브랜치>.txt` 의 추출 원본과 일치하는지 |
| `tests/acceptance.test.ts` | 공식 템플릿 인수 검증. 환경 변수 `EGOV_ACCEPTANCE_DIR` 을 준 경우에만 실행하고, 없으면 건너뜁니다. |

`tests/checkArchitecture.test.ts` 의 fixture 기대값은 엔진의 실제 판정에 맞춰 작성합니다. 테스트 기대값을 맞추려고 엔진을 고치지 않습니다.

### 인수 테스트

공식 템플릿 프로젝트로 엔진의 판정을 확인하는 테스트입니다. `EGOV_ACCEPTANCE_DIR` 이 가리키는 디렉토리 아래에 템플릿 ZIP 을 템플릿 이름의 디렉토리로 풀어 두고 실행합니다. 디렉토리가 없는 템플릿의 케이스는 건너뜁니다.

```bash
EGOV_ACCEPTANCE_DIR=/path/to/templates npm test
```

대상 디렉토리 이름은 `egovframe-web`, `egovframe-boot-web`, `egovframe-template-common-components`, `egovframe-boot-simple-backend`, `egovframe-boot-batch-db-web`, `egovframe-msa-portal-backend/msa-board-service` 입니다.

### MCP Inspector

```bash
npm run inspector
```

빌드된 `build/index.js` 를 MCP Inspector 에 연결해 `egov_check_compliance` 를 직접 호출해 볼 수 있습니다. `npx` 가 Inspector 패키지를 내려받으므로 네트워크가 필요합니다. ripgrep 경로와 관련된 변경은 테스트와 함께 Inspector 로 실제 동작도 확인합니다.

### 디버그 로그

파일별 진행 상황 같은 정보성 로그는 환경 변수 `EGOV_CHECK_DEBUG` 를 켠 경우에만 stderr 로 출력됩니다.

```bash
EGOV_CHECK_DEBUG=1 node build/index.js
```

## 코드를 고칠 때의 규칙

### 엔진 모듈은 업스트림과 동일하게 유지

점검 엔진은 VS Code 확장 [egovframe-vscode-initializr](https://github.com/eGovFramework/egovframe-vscode-initializr) 의 Architecture Check(archChecker) 엔진을 이식한 것입니다.

- `src/utils/*`(`debugLog.ts` 제외)와 `src/shared/*` 는 업스트림의 `src/utils/*`, `src/shared/*` 와 **판정 로직이 동일**해야 합니다. 허용되는 차이는 세 가지입니다: import 경로의 `.js` 접미어, `console.log` 를 `debugLog` 로 바꾼 것, CSV 저장 디버그 로그의 절대 경로를 `path.basename` 으로 바꾼 것.
- 동기화 기준은 업스트림 develop 브랜치의 커밋 `a9254a4`(2026-11-03)입니다.
- 판정 로직을 바꾸려면 **업스트림에 먼저 반영**한 뒤 이 저장소로 다시 이식합니다. 엔진을 다시 동기화할 때에는 이식한 테스트(`tests/` 의 엔진 테스트)도 함께 가져옵니다.
- 이 저장소 고유의 코드는 도구 진입점(`src/index.ts`, `src/tools/checkArchitecture.ts`)과 `src/utils/debugLog.ts` 입니다. 리포트 형식은 여기에서만 바꿉니다.
- 코드 스타일도 출처를 따릅니다. 엔진 모듈은 업스트림 그대로 탭 들여쓰기에 세미콜론을 쓰지 않고, 도구 진입점은 2칸 들여쓰기에 세미콜론을 씁니다.

### 도구와 입력 스키마

- 도구 이름은 `egov_<scope>_<verb>` 형태의 snake_case 입니다.
- 새 기능은 새 도구를 추가하기보다 기존 도구의 파라미터 확장을 먼저 검토합니다(`runtimeGeneration` 이 그 예입니다).
- 도구는 `server.registerTool(name, { title, description, inputSchema }, handler)` 로 등록하고, `inputSchema` 는 zod 로 정의하며 필드 설명은 `.describe()` 로 작성합니다.

### stdout 에 쓰지 않기

stdio 전송에서 stdout 은 JSON-RPC 채널입니다. `src/` 어디에서도 `console.log` 를 쓰지 않습니다. 정보성 로그는 `debugLog()` 로만 쓰고, 실제 오류와 경고는 `console.error` 로 출력합니다. `tests/checkArchitecture.test.ts` 가 점검 한 번 동안 `console.log` 가 호출되지 않는지 검증합니다.

### 오류 처리와 보안

- 파일과 프로세스 접근은 try/catch 로 감싸고, 사용자가 이해할 수 있는 문구로 바꿔 돌려줍니다.
- 응답과 로그에 스택 트레이스와 절대 경로를 그대로 싣지 않습니다. 결과 텍스트의 경로는 `projectPath` 기준 상대 경로로 쓰고, 오류 로그에는 파일 이름만 남깁니다. 예외는 사용자가 넘긴 `projectPath` 를 검증 오류 문구에 되돌려 주는 것과, `resource_link` 의 `uri` 에 절대 경로의 `file://` URI 를 쓰는 것입니다.
- 사용자 입력을 셸 명령으로 넘기지 않습니다. `child_process` 는 엔진의 ripgrep 호출에서만 쓰며, 셸을 거치지 않고 인자 배열로 실행합니다. 글롭 패턴은 코드의 상수에서만 옵니다.
- 파일 시스템 접근은 `projectPath` 아래로 한정하고, CSV 는 `projectPath` 바로 아래에만 씁니다.

## 실행환경 모듈 그래프 갱신

필수 라이브러리의 전이 의존을 판정하는 `RUNTIME_MODULE_GRAPH`(`src/utils/runtimeModuleGraph.ts`)는 GitHub `eGovFramework/egovframe-runtime` 의 브랜치별 모듈 `pom.xml` 에서 compile 의존을 추출한 상수입니다. 다루는 브랜치는 3.9.x, 3.10.x, 4.0.x, 4.1.x, 4.2.x, 4.3.x, 5.0.x, 5.1.x 입니다.

5.1.x 그래프는 v5.1.0 **베타** 의 sources jar 에서 2026-11-03 에 추출한 것입니다. 그래서 실행환경 버전이 `5.1.` 로 시작할 때만 쓰이고, 버전을 모르는 5.x 프로젝트와 5.0.x 프로젝트에는 5.0.x 그래프가 쓰입니다. 정식 5.1.0 이 릴리스되면 다시 추출해야 합니다.

새 실행환경 버전이 나오면 **업스트림에서 먼저** 다음 순서로 갱신한 뒤 이 저장소에 이식합니다.

1. 해당 브랜치의 모듈 pom 에서 의존을 다시 추출해 `tests/fixtures/runtime-graph/graph-<브랜치>.txt` 를 교체합니다. 새 브랜치이면 파일을 추가하고 `RuntimeGraphBranch` 와 `selectGraphBranch` 도 확장합니다.
2. `npm test` 를 실행합니다. `tests/runtimeModuleGraph.test.ts` 가 상수와 추출 원본의 불일치를 잡아냅니다.
3. 실패한 모듈 항목을 `RUNTIME_MODULE_GRAPH` 에 반영하고 테스트가 통과하는지 확인합니다.

## 배포 패키지 만들기

`package.json` 이 `"private": true` 이므로 npm 레지스트리에는 게시하지 않고, 플랫폼별 tgz 로 배포합니다. tgz 에는 `build/` 와, `bundleDependencies` 설정에 따라 실행에 필요한 의존 패키지(`node_modules`)가 함께 들어갑니다. 그래서 사용처에서 다른 패키지를 내려받지 않고 실행할 수 있습니다.

```bash
npm test
npm run pack:platforms                               # 기본 타깃 전체
PACK_TARGETS="linux-x64 win32-x64" npm run pack:platforms   # 타깃 지정
```

- 기본 타깃은 `darwin-arm64`, `darwin-x64`, `linux-x64`, `linux-arm64`, `win32-x64` 이고, 결과물은 git 이 추적하지 않는 `dist/` 에 `egovframe-mcp-check-<버전>-<타깃>.tgz` 로 생깁니다. 5.1.0 Beta 로 배포한 것은 이 가운데 `linux-arm64` 를 뺀 네 가지입니다.
- 스크립트(`scripts/pack-platforms.sh`)는 타깃마다 `node_modules` 를 지우고 그 타깃용으로 `npm ci` 를 다시 실행한 뒤 `npm pack` 을 실행합니다. 타깃마다 달라지는 것은 `@vscode/ripgrep` 의 플랫폼별 실행 파일 패키지입니다. 끝나면 `npm ci` 로 현재 플랫폼용 `node_modules` 를 복원합니다.
- 타깃별 패키지를 내려받으므로 네트워크가 필요합니다. 실행하는 동안 `node_modules` 와 `build/` 가 다시 만들어지므로, 같은 체크아웃에서 서버나 테스트를 함께 실행하지 않습니다.
- 버전이 같으면 파일 이름도 같으므로, 패키징하기 전에 `dist/` 에 이전 버전의 tgz 가 섞여 있지 않은지 확인합니다.

만든 tgz 에 해당 플랫폼의 ripgrep 실행 파일이 들어 있는지는 다음 명령으로 확인합니다.

```bash
tar -tzf dist/egovframe-mcp-check-<버전>-<타깃>.tgz | grep -E "ripgrep-[^/]+/bin/rg(\.exe)?$"
```

배포하기 전에는 tgz 를 실제 실행 명령으로 실행해서 서버가 시작되는지와 `tools/list` 에 `egov_check_compliance` 하나가 보이는지 확인하고, 릴리스 노트에 싣는 체크섬을 계산합니다.

```bash
npx -y --package=$PWD/dist/egovframe-mcp-check-<버전>-<타깃>.tgz egovframe-mcp-check
shasum -a 256 dist/egovframe-mcp-check-<버전>-*.tgz
```

## Git 규칙

- 커밋 메시지는 [Conventional Commits 1.0](https://www.conventionalcommits.org/ko/v1.0.0/) 을 따릅니다(`feat`, `fix`, `refactor`, `chore`, `build`, `docs`, `test` 등). 의존성 변경에는 `build(deps)` scope 를 권장합니다.
- `develop` 브랜치에서 작업한 뒤 `main` 으로 병합합니다.
