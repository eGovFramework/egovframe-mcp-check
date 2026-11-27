# 설치와 MCP 클라이언트 등록 가이드

이 문서는 `egovframe-mcp-check` 서버를 AI 클라이언트(MCP 클라이언트)에 등록하고 사용하는 방법을 설명합니다. 점검 항목은 [CHECK_RULES.md](../reference/CHECK_RULES.md)에서, 점검 결과의 형식은 [REPORT_FORMAT.md](../reference/REPORT_FORMAT.md)에서 다룹니다.

## 요구 사항

| 항목 | 내용 |
|------|------|
| Node.js | 18 이상 (22 권장). `node -v` 로 확인합니다. |
| 운영체제와 CPU | Windows x64, macOS (Apple Silicon, Intel), Linux x64 (glibc). 운영체제와 CPU 에 맞는 배포 파일을 사용합니다. |

## 배포 파일 내려받기

[표준프레임워크 포털](https://www.egovframe.go.kr/home/sub.do?menuNo=114)에서 사용하는 운영체제와 CPU 에 맞는 파일을 로컬에 내려받습니다. 압축은 풀지 않습니다.

| 운영체제와 CPU | 파일 |
|----------------|------|
| Windows x64 | `egovframe-mcp-check-5.1.x-win32-x64.tgz` |
| macOS (Apple Silicon) | `egovframe-mcp-check-5.1.x-darwin-arm64.tgz` |
| macOS (Intel) | `egovframe-mcp-check-5.1.x-darwin-x64.tgz` |
| Linux x64 (glibc) | `egovframe-mcp-check-5.1.x-linux-x64.tgz` |

- tgz 에는 빌드된 서버와 실행에 필요한 의존 패키지(`node_modules`)가 모두 들어 있으므로, 실행할 때 다른 패키지를 내려받지 않습니다. 인터넷에 연결되지 않은 환경에서도 그대로 쓸 수 있습니다.
- 운영체제와 CPU 별로 파일이 나뉘는 이유는 파일 수집에 쓰는 ripgrep 실행 파일이 플랫폼마다 다르기 때문입니다.
- 파일별 체크섬은 [릴리스 노트](../release-notes/v5.1.0-beta.md#체크섬)에 있습니다.

## 서버 실행 명령

AI 클라이언트에는 `npx` 가 tgz 를 직접 실행하도록 등록합니다. 이 문서의 예시에서 `<TGZ>` 는 내려받은 tgz 파일의 절대 경로입니다.

| 운영체제 | 실행 명령 |
|----------|-----------|
| macOS, Linux | `npx -y --package=<TGZ> egovframe-mcp-check` |
| Windows | `cmd /c npx -y --package=<TGZ> egovframe-mcp-check` |

- **경로는 절대 경로로 적습니다.** 클라이언트가 서버를 어느 디렉토리에서 실행할지 정해져 있지 않으므로 상대 경로는 쓰지 않습니다.
- **Windows 에서는 `cmd /c` 로 감쌉니다.** `npx` 가 배치 파일(`npx.cmd`)이어서 직접 실행하지 못하는 클라이언트가 있기 때문입니다.
- **포트를 열지 않습니다.** 이 서버는 stdio 로 통신하는 MCP 서버입니다. 포트를 열고 계속 실행되는 서비스가 아니며, AI 클라이언트가 필요할 때 프로세스를 실행합니다.

### 등록하기 전에 실행해 보기

클라이언트에 등록하기 전에 터미널에서 실행 명령을 그대로 실행해 보면 경로가 맞는지 확인할 수 있습니다. 서버가 시작되면 `[egovframe-mcp-check]` 로 시작하는 로그 세 줄이 stderr 로 출력되고(마지막 줄은 `Server started successfully` 로 끝납니다), 서버는 클라이언트의 요청을 기다리는 상태가 됩니다. 확인한 뒤에는 Ctrl+C 로 종료합니다.

## 공통 JSON 형식

`mcpServers` 형식을 쓰는 AI 클라이언트에 등록하는 MCP 서버 연결 설정의 공통 형식입니다. 설정 파일에 이미 `mcpServers` 항목이 있으면 그 안에 `egovframe-mcp-check` 만 추가합니다.

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

- JSON 문자열 안에서는 Windows 경로의 역슬래시를 두 번씩 적거나(`C:\\mcp\\egovframe-mcp-check-5.1.0-win32-x64.tgz`) 슬래시로 적습니다(`C:/mcp/egovframe-mcp-check-5.1.0-win32-x64.tgz`).
- 클라이언트가 셸의 `PATH` 를 물려받지 않아 `npx` 를 찾지 못하면 `command` 에 `npx` 의 절대 경로를 적습니다. 경로는 macOS/Linux 에서는 `which npx`, Windows 에서는 `where npx` 로 확인합니다.
- tgz 를 새 버전으로 바꾸면 파일 이름이 달라지므로 등록한 경로도 함께 고칩니다.

## AI 클라이언트별 등록

| AI 클라이언트 | 등록 방법 | 유의 사항 |
|---------------|-----------|-----------|
| [Claude Code](#claude-code) | `claude mcp add` 명령 또는 `~/.claude.json` (Windows 는 `%USERPROFILE%\.claude.json`) | 공통 JSON 형식 |
| [Codex](#codex) | `codex mcp add` 명령 또는 `~/.codex/config.toml` (Windows 는 `%USERPROFILE%\.codex\config.toml`) | TOML 형식 |
| [Cursor](#cursor) | `~/.cursor/mcp.json` (Windows 는 `%USERPROFILE%\.cursor\mcp.json`) | 공통 JSON 형식에 `"type": "stdio"` 추가 |
| [VS Code (GitHub Copilot)](#vs-code-github-copilot) | `~/.copilot/mcp-config.json` (Windows 는 `%USERPROFILE%\.copilot\mcp-config.json`) | 공통 JSON 형식에 `"tools": ["*"]`, `"type": "stdio"` 추가 |
| [Cline](#cline) | Cline 패널의 MCP Servers 에서 여는 `cline_mcp_settings.json` | 공통 JSON 형식 |
| [OpenCode](#opencode) | `opencode mcp add` 명령 | `--global` 옵션으로 전역 등록 |
| [Claude Desktop](#claude-desktop) | `claude_desktop_config.json` | 공통 JSON 형식. 등록한 뒤 앱을 다시 실행 |

### Claude Code

CLI 로 등록하는 방법을 권장합니다.

```bash
# macOS, Linux
claude mcp add --scope user egovframe-mcp-check -- npx -y --package=<TGZ> egovframe-mcp-check

# Windows
claude mcp add --scope user egovframe-mcp-check -- cmd /c npx -y --package=<TGZ> egovframe-mcp-check
```

`--scope user` 는 모든 프로젝트에서 이 서버를 쓰도록 등록한다는 뜻입니다. 등록 상태는 `claude mcp list` 또는 세션 안의 `/mcp` 로 확인합니다.

설정 파일로 등록하려면 `~/.claude.json`(Windows 는 `%USERPROFILE%\.claude.json`)의 최상위 `mcpServers` 에 [공통 JSON 형식](#공통-json-형식)의 `egovframe-mcp-check` 항목을 추가합니다.

### Codex

CLI 로 등록합니다.

```bash
# macOS, Linux
codex mcp add egovframe-mcp-check -- npx -y --package=<TGZ> egovframe-mcp-check

# Windows
codex mcp add egovframe-mcp-check -- cmd /c npx -y --package=<TGZ> egovframe-mcp-check
```

설정 파일로 등록하려면 `~/.codex/config.toml`(Windows 는 `%USERPROFILE%\.codex\config.toml`)에 다음 내용을 추가합니다. 최상위 키는 `mcp_servers` 입니다.

**macOS, Linux**

```toml
[mcp_servers.egovframe-mcp-check]
command = "npx"
args = ["-y", "--package=<TGZ>", "egovframe-mcp-check"]
```

**Windows**

```toml
[mcp_servers.egovframe-mcp-check]
command = "cmd"
args = ["/c", "npx", "-y", "--package=<TGZ>", "egovframe-mcp-check"]
```

### Cursor

설정 파일 `~/.cursor/mcp.json`(Windows 는 `%USERPROFILE%\.cursor\mcp.json`)에 다음 형식으로 추가합니다.

**macOS, Linux**

```json
{
  "mcpServers": {
    "egovframe-mcp-check": {
      "type": "stdio",
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
      "type": "stdio",
      "command": "cmd",
      "args": ["/c", "npx", "-y", "--package=<TGZ>", "egovframe-mcp-check"]
    }
  }
}
```

### VS Code (GitHub Copilot)

설정 파일 `~/.copilot/mcp-config.json`(Windows 는 `%USERPROFILE%\.copilot\mcp-config.json`)에 다음 형식으로 추가합니다.

**macOS, Linux**

```json
{
  "mcpServers": {
    "egovframe-mcp-check": {
      "tools": ["*"],
      "type": "stdio",
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
      "tools": ["*"],
      "type": "stdio",
      "command": "cmd",
      "args": ["/c", "npx", "-y", "--package=<TGZ>", "egovframe-mcp-check"]
    }
  }
}
```

VS Code 의 워크스페이스 설정 파일(`<프로젝트 루트>/.vscode/mcp.json`)에 등록할 때에는 최상위 키가 `mcpServers` 가 아니라 `servers` 입니다. Windows 에서는 `command` 와 `args` 를 위의 Windows 예시와 같게 적습니다.

```json
{
  "servers": {
    "egovframe-mcp-check": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "--package=<TGZ>", "egovframe-mcp-check"]
    }
  }
}
```

등록한 뒤에 Copilot Chat 을 에이전트 모드로 전환하면 도구가 보입니다.

### Cline

VS Code 의 Cline 패널에서 MCP Servers 아이콘, Configure 탭, Configure MCP Servers 를 차례로 누르면 `cline_mcp_settings.json` 파일이 열립니다. 이 파일에 [공통 JSON 형식](#공통-json-형식)의 `egovframe-mcp-check` 항목을 추가합니다. 파일을 저장하면 Cline 이 서버에 다시 연결합니다.

### OpenCode

CLI 로 등록하는 방법을 권장합니다.

```bash
# macOS, Linux
opencode mcp add egovframe-mcp-check --global -- npx -y --package=<TGZ> egovframe-mcp-check

# Windows
opencode mcp add egovframe-mcp-check --global -- cmd /c npx -y --package=<TGZ> egovframe-mcp-check
```

설정 파일(`~/.config/opencode/opencode.json`)에 직접 적을 때에는 형식이 다른 클라이언트와 다릅니다. 최상위 키는 `mcp` 이고, `command` 하나에 명령과 인자를 모두 배열로 적습니다.

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "egovframe-mcp-check": {
      "type": "local",
      "command": ["npx", "-y", "--package=<TGZ>", "egovframe-mcp-check"],
      "enabled": true
    }
  }
}
```

### Claude Desktop

설정 파일에 [공통 JSON 형식](#공통-json-형식)의 `egovframe-mcp-check` 항목을 추가하고, 앱을 완전히 종료했다가 다시 실행합니다. 앱의 Settings, Developer 탭, Edit Config 를 차례로 누르면 설정 파일이 열립니다.

| 운영체제 | 설정 파일 |
|----------|-----------|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |

Claude Desktop 과 같은 GUI 앱은 셸의 `PATH` 를 그대로 물려받지 않을 수 있습니다. nvm 이나 Homebrew 로 Node.js 를 설치한 환경에서 서버가 시작되지 않으면, `command` 에 `npx` 의 절대 경로(`which npx` 로 확인)를 적습니다.

## 등록 확인

등록이 끝나면 클라이언트의 도구 목록에 다음 도구 하나가 보입니다.

| 도구 | 설명 |
|------|------|
| `egov_check_compliance` | 표준프레임워크 프로젝트의 빌드 파일과 Java 소스를 점검하고 결과를 보고 |

점검 항목과 판정 규칙은 [CHECK_RULES.md](../reference/CHECK_RULES.md)에, 점검 결과의 형식은 [REPORT_FORMAT.md](../reference/REPORT_FORMAT.md)에 있습니다.

## 다른 실행 형태

### 저장소를 클론해서 실행

저장소를 클론해 빌드한 `build/index.js` 를 직접 등록할 수도 있습니다.

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
      "args": ["/absolute/path/to/egovframe-mcp-check/build/index.js"]
    }
  }
}
```

Windows 에서는 JSON 문자열 안의 역슬래시를 두 번씩 적습니다(`"C:\\path\\to\\egovframe-mcp-check\\build\\index.js"`).

## 환경 변수

서버 등록에 필요한 환경 변수는 없습니다. 서버가 읽는 환경 변수는 아래 하나입니다.

| 환경 변수 | 설명 | 기본값 |
|-----------|------|--------|
| `EGOV_CHECK_DEBUG` | 파일별 진행 상황 같은 정보성 로그와 오류의 스택 트레이스를 서버 로그(stderr)에 출력합니다. 비어 있지 않은 값 가운데 `0` 과 `false` 를 뺀 값이면 켜진 것으로 봅니다. | 꺼짐 |

켜려면 클라이언트 등록의 `env` 에 값을 넣습니다.

```json
{
  "mcpServers": {
    "egovframe-mcp-check": {
      "command": "npx",
      "args": ["-y", "--package=<TGZ>", "egovframe-mcp-check"],
      "env": { "EGOV_CHECK_DEBUG": "1" }
    }
  }
}
```

## 도구 승인

`egov_check_compliance` 는 기본적으로 프로젝트를 읽기만 합니다. 다만 `exportResults: true` 로 호출하면 프로젝트 루트에 CSV 파일을 쓰므로, `tools/list` 에는 `readOnlyHint: false` 로 표시됩니다. 쓰는 위치는 `projectPath` 바로 아래로 한정되며, 다른 파일을 고치거나 지우지 않습니다(`destructiveHint: false`).

## 사용 예시

자연어로 요청하면 LLM 이 `egov_check_compliance` 호출로 옮깁니다. 프로젝트 경로는 절대 경로로 알려 주는 것이 안전합니다.

```text
/workspace/board-app 이 표준프레임워크 아키텍처를 따르는지 점검해줘.
```

```json
{ "projectPath": "/workspace/board-app" }
```

```text
/workspace/board-app 점검 결과를 CSV 로도 저장해줘.
```

```json
{ "projectPath": "/workspace/board-app", "exportResults": true }
```

```text
/workspace/legacy-app 을 5.x 기준으로 점검해줘.
```

```json
{ "projectPath": "/workspace/legacy-app", "runtimeGeneration": "5.x" }
```

## 문제 해결

| 증상 | 확인할 것 |
|------|-----------|
| 클라이언트에 서버가 보이지 않거나 시작하자마자 종료됨 | `--package=` 에 적은 tgz 경로(또는 `args` 의 `build/index.js` 경로)가 절대 경로인지, 그 파일이 실제로 있는지 확인합니다. 터미널에서 실행 명령을 그대로 실행하면 `Server started successfully` 로그가 나와야 합니다. |
| Windows 에서 `npx` 를 찾지 못하거나 서버가 실행되지 않음 | `command` 를 `cmd` 로, `args` 의 앞을 `"/c", "npx"` 로 적었는지 확인합니다. |
| `Error: projectPath does not exist or is not accessible: <경로>` | 경로가 없거나 서버 프로세스가 읽을 수 없는 경로입니다. 상대 경로는 서버가 실행된 디렉토리를 기준으로 해석되므로 절대 경로로 호출합니다. |
| `Error: projectPath must be a directory: <경로>` | 파일 경로를 넘긴 경우입니다. 프로젝트의 루트 디렉토리를 넘깁니다. |
| `MCP error -32602: Input validation error ...` | 입력이 스키마에 맞지 않습니다. `runtimeGeneration` 은 `"3.x"`, `"4.x"`, `"5.x"` 가운데 하나여야 하고, `exportResults` 는 boolean 이어야 합니다. |
| 결과의 `Project (build files)` 에 `No Maven/Gradle build files found` 가 나옴 | `projectPath` 아래에서 `pom.xml`, `build.gradle`, `build.gradle.kts` 를 찾지 못했습니다. 빌드 파일이 있는 프로젝트 루트를 넘겼는지 확인합니다. |
| 결과의 Progress 줄에 `with ripgrep` 이 붙지 않음 | ripgrep 실행 파일을 쓰지 못해 Node.js 의 파일 탐색으로 대체된 것입니다. 점검 결과는 같지만 느립니다. 서버 로그(stderr)의 `ripgrep unavailable` 문구를 확인하고, 운영체제와 CPU 에 맞는 tgz 를 쓰고 있는지 확인합니다. |
| `CSV export failed (EACCES)` 같은 경고가 결과에 붙음 | 프로젝트 루트에 쓸 권한이 없어 CSV 를 저장하지 못했습니다. 점검 결과 자체는 그대로 유효합니다. |
| 파일별 로그가 보이지 않음 | 정보성 로그는 `EGOV_CHECK_DEBUG` 를 켰을 때만 서버 로그(stderr)에 출력됩니다. |
