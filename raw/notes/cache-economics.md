# Cache Economics — 근거 노트 (v3.1)

날짜: 2026-08-25

## 배경과 우리 래퍼의 제약

투명래퍼 하네스의 비용 곡선은 토큰 단가가 아니라 **프롬프트 캐시 히트율**이 결정한다.
우리 래퍼의 제약을 먼저 명시한다:

- **로딩 횟수는 통제 불가** — 세션 재적재, 서브에이전트 스폰, 시스템 프롬프트 재전송은
  하네스 바깥(opencode 런타임·프로바이더)이 결정한다.
- **통제 가능한 것은 prefix 바이트 안정성 하나** — 안정 내용이 매번 같은 순서·같은 바이트로
  전송되게만 보장하면 된다.

따라서 설계 목표는 한 문장으로 요약된다: **"재적재가 캐시 히트로 변한다."**

## 3원칙과 출처

### 원칙 1 — Stable prefix

- 헌법(AGENTS.md)과 스킬 정의는 세션 중 불변이다. 세션 중 수정 금지, 변경이 필요하면 재시작한다.
- 프롬프트 조립 시 휘발성 내용(inventory 결과, 작업 컨텍스트)은 **반드시 안정 prefix 뒤에** 배치한다.
  안정 구간이 앞에서 바이트 단위로 동일해야 그 구간이 캐시 히트 구간이 된다.
- 출처: Aider 캐싱 문서 — <https://aider.chat/docs/usage/caching.html>
  - `--cache-prompts`: 안정 내용을 캐시 히트 구간으로 만들도록 프롬프트를 재배열(안정 prefix 유지)
  - `--cache-keepalive-pings`: 유효 기간 짧은 캐시를 ping으로 유지(재적재 비용 절감)
- 적용: AGENTS.md 헌법 불변 / `mcp/server.js` get_context가 AGENTS.md 선두를 첫 반환으로 고정 /
  시스템 프롬프트 규칙 증식 금지(KV 캐시 히트 유지).

### 원칙 2 — Late compaction

- 컴팩션(맥락 요약·절단)은 **임계 도달 시에만** 발동한다.
- 조기 컴팩션은 캐시 전량 무효화를 유발한다 — 절약한 토큰보다 캐시 재구축 비용이 크다.
  임계 도달 시 한 번의 재구축 비용을 긴 후속 대화로 상각하는 것이 최적이다.
- 출처: OpenHands context condensation —
  <https://www.openhands.dev/blog/openhands-context-condensensation-for-more-efficient-ai-agents>
  - condenser는 임계 도달 시에만 condense → 프롬프트 캐시 효율 유지
  - 요약(summarization) 호출 자체에는 캐싱 off (일회성 호출이라 캐시 유지 무의미)

### 원칙 3 — Delegation = isolation

- 서브에이전트 강제 위임(Rule 5)은 안전장치인 동시에 **캐시 경제 장치**다.
- 파일 탐색·수정·검증이 서브 에이전트의 독립 컨텍스트에서 일어나므로
  메인 스레드 prefix는 소형으로 유지되고, 대화가 길어져도 안정적이다.
- 이것이 강제 위임 규칙의 경제학적 근거다: "위임은 컨텍스트 격리 = 메인 prefix 보호"이다.

## 검증

- `npm run verify` — lint + check:vault --strict + test + pack --dry-run 전체 게이트 통과.
- 위키 페이지: `wiki/concepts/cache-placement.md`
