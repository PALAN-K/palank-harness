# Palank Harness — Thin Foundry (0.1.0)

> 프레임워크 파운드리 + MCP 골격 = 완전체. 인기 얇은 하네스의 장점만 이식.

**한 줄**: `OpenCode` 베이스에 `AGENTS.md` 단일 소스, `interpreter`로 자연어→스키마, `verify`로 기계 검증, `MCP`로 도메인 연결.

## 왜 얇은가

- 모델은 임대료, 하네스는 소유 자산. `Qwen2.5-7B 30%→80%`는 하네스가 만든 차이.
- `Claude Code` lean, `Muse Code` 이벤트로그, `OpenCode` 모델 무관 — 각각의 장점만 4원칙으로 압축: **라우팅 / 제약(스키마) / 검증 루프 / 폐기성**.

## 모델 선택 (사용자 체크박스)

`opencode.json` 1줄 교체:

- 벌크 생성: `deepseek-v4-flash` / `muse-spark-1.2` (저렴)
- 터미널/툴: `qwen3.8-pro`
- 하드 추론: `deepseek-v4-pro`
- 검증: `qwen3.8-pro` (저렴하고 엄격)

> 모델 매핑은 예시 — easy→ muse-spark/flash, hard→ qwen3.8-pro/deepseek-pro로 바꿔도, 하나의 모델만 사용해도 정상. `opencode.json: model` 1줄 교체로 라우팅 변경, 비용 최적 + 교차 긍정 효과(per papers).

## 시작

```bash
# 이 폴더에서
opencode  # AGENTS.md 자동 로드, interpreter가 당신 말을 스키마로 바꿔 최적 호출
# 또는
npx palank-harness init ./my-project  # 스캐폴드만
```

## 구조

- `skills/interpreter` — 20개 명령 중 3개(`run`, `session`, `mcp`)만 최적 조합으로 호출
- `skills/verify` — `scaffold/lint/loop` 가드 (모델 무관)
- `mcp/palank-domain` — 최적화 라이브러리 `@modelcontextprotocol/sdk` 기반 스텁, 프로젝트별 1개씩 복사

## MCP 최적화 라이브러리

`@modelcontextprotocol/sdk` (MIT, Model Context Protocol 표준) — `OpenHarness`, `DeepSeek Harness`도 동일 베이스. 도구 디스커버리, 스키마 검증, 재시도 내장. 하네스가 바뀌어도 MCP 서버는 그대로 재사용.

## 다음

`AGENTS.md` 50줄이 헌법. 새 프로젝트는 `006`을 복사해 `mcp/palank-domain` 1개만 교체 — 10분 확장.
