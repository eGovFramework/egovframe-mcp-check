/**
 * 정보성 로그 게이트.
 * MCP stdio 전송에서는 stdout 이 JSON-RPC 채널이므로 엔진의 모든 로그는 stderr 로만 보낸다.
 * 파일별 진행 상황 같은 정보성 로그는 EGOV_CHECK_DEBUG 환경 변수가 켜진 경우에만 출력한다.
 */

/**
 * EGOV_CHECK_DEBUG 환경 변수가 켜져 있는지 확인 (호출 시점 평가 — 테스트에서 토글 가능)
 * "0"/"false" 를 제외한 비어있지 않은 값이면 켜진 것으로 본다.
 */
export function isDebugEnabled(): boolean {
	const value = process.env.EGOV_CHECK_DEBUG
	return value !== undefined && value !== "" && value !== "0" && value.toLowerCase() !== "false"
}

/**
 * 파일별 진행 상황 등 정보성 로그. EGOV_CHECK_DEBUG 가 켜진 경우에만 stderr 로 출력한다.
 * 실제 오류/경고는 이 함수를 거치지 않고 console.error 로 항상 출력한다.
 */
export function debugLog(message: string): void {
	if (isDebugEnabled()) {
		console.error(message)
	}
}
