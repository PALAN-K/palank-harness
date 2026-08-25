# Cache Placement Protocol

Vault-Base: git:643af10b22dfeb76c9707ef28270429b15d865df

> Raw: raw/notes/cache-economics.md

## 요약

v3.1 신설. 하네스 비용은 로딩 횟수가 아니라 프롬프트 캐시 히트율이 결정한다.
로딩 횟수는 우리 래퍼가 통제할 수 없으므로, 통제 가능한 **prefix 바이트 안정성**만 관리한다 —
설계 목표는 "재적재가 캐시 히트로 변한다".

## 3원칙

1. **Stable prefix** — 헌법(AGENTS.md)은 세션 중 불변(수정 시 재시작). 프롬프트 조립 시
   휘발성 내용(inventory 결과, 작업 컨텍스트)은 반드시 안정 prefix 뒤에 배치한다.
   get_context도 AGENTS.md 선두를 첫 반환으로 고정해 같은 원칙을 따른다.
2. **Late compaction** — 컴팩션은 임계 도달 시에만 발동. 조기 컴팩션은 캐시 전량 무효화이며,
   재구축 비용은 긴 후속 대화로 상각해야 한다.
3. **Delegation = isolation** — 서브에이전트 강제 위임(Rule 5)은 메인 스레드 prefix를
   소형·안정 유지하게 하는 캐시 경제 장치다. 강제 위임 규칙의 경제학적 근거.

## 이식 출처

- Aider caching (`--cache-prompts` 안정 prefix 재배열, `--cache-keepalive-pings`) —
  <https://aider.chat/docs/usage/caching.html>
- OpenHands context condenser (임계 도달 시에만 condense → 캐시 효율 유지, 요약 호출엔 캐싱 off) —
  <https://www.openhands.dev/blog/openhands-context-condensensation-for-more-efficient-ai-agents>

## 검증법

- `npm run verify` — lint(node --check) + check:vault --strict(Raw 필수·index 패리티·drift)
  + test + pack --dry-run 전체 통과.

## 참조

- `raw/notes/cache-economics.md` — 근거 원문(출처 URL·우리 제약 명시)
- `wiki/concepts/echo-first-interpreter.md` — Echo 게이트와 강제 위임 구조
