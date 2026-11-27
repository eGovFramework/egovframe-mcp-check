# eGovFrame MCP Check 문서

`egovframe-mcp-check` 서버가 MCP 클라이언트에 노출하는 도구는 **`egov_check_compliance` 하나**입니다(등록 위치는 `src/index.ts`). 이 디렉토리의 문서는 이 도구의 점검 항목과 결과 형식, 서버의 설치와 개발에 필요한 내용을 주제별 폴더로 나누어 다룹니다. 서버의 개요와 빠른 설치 방법은 저장소 최상위의 [README](../README.md)에 있습니다.

## 폴더 구성

| 폴더 | 주제 | 주요 독자 |
|------|------|-----------|
| [setup/](./setup/) | 설치와 MCP 클라이언트 등록 | 사용자 |
| [reference/](./reference/) | 점검 항목과 판정 규칙, 점검 결과의 형식 | 사용자, 점검 결과를 해석하는 사람 |
| [architecture/](./architecture/) | 코드 구성과 동작 방식 | 개발자 |
| [development/](./development/) | 빌드, 테스트, 패키징, 코드 수정 규칙 | 개발자, 유지보수자 |
| [release-notes/](./release-notes/) | 버전별 릴리스 노트 | 모든 독자 |

## 사용자 문서

| 문서 | 설명 |
|------|------|
| [setup/MCP_SETUP_GUIDE.md](./setup/MCP_SETUP_GUIDE.md) | 배포 파일(tgz)을 받아 AI 클라이언트(Claude Code, Codex, Cursor, VS Code, Cline, OpenCode, Claude Desktop)에 등록하는 방법, 저장소 클론 실행, 환경 변수, 문제 해결 |
| [reference/CHECK_RULES.md](./reference/CHECK_RULES.md) | Project(빌드 파일), Controller, Service, DAO / Mapper 의 점검 항목과 판정 규칙, 판정에서 빼는 파일, 점검 범위의 한계 |
| [reference/REPORT_FORMAT.md](./reference/REPORT_FORMAT.md) | 응답의 구성, 텍스트 리포트의 섹션, 실패 파일 링크(`resource_link`), CSV 내보내기, 오류 응답 |
| [release-notes/v5.1.0-beta.md](./release-notes/v5.1.0-beta.md) | 5.1.0 Beta 릴리스 노트와 배포 파일의 체크섬 |

## 개발자 문서

| 문서 | 설명 |
|------|------|
| [architecture/HOW_IT_WORKS.md](./architecture/HOW_IT_WORKS.md) | 모듈 구성과 의존 방향, 파일 수집, 실행 순서, 읽기 캐시, 로그 |
| [development/DEVELOPMENT_GUIDE.md](./development/DEVELOPMENT_GUIDE.md) | 빌드와 테스트, MCP Inspector, 업스트림 동기화 규칙, 실행환경 모듈 그래프 갱신, 배포 패키지 제작 |

## 공개 도구

| Tool | 용도 |
|------|------|
| `egov_check_compliance` | 표준프레임워크 프로젝트의 빌드 파일과 Java 소스를 점검하고 결과를 보고 |

이 서버는 점검만 제공합니다. 프로젝트와 코드 생성은 [egovframe-mcp-codegen](https://github.com/eGovFramework/egovframe-mcp-codegen) 서버가, 가이드와 공통컴포넌트 등의 자료 검색은 [egovframe-mcp-search](https://github.com/eGovFramework/egovframe-mcp-search) 서버가 제공하므로, 그 기능이 필요하면 해당 서버를 따로 등록합니다.
