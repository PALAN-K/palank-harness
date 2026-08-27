# Log — append-only audit ledger

## [2026-08-25] rebuild | v2 → v3 clean rebuild (Echo-first interpreter)
- v2 HEAD 보존: b14f1bbcfd574590a6cd13b5b662fa3e994bca2e — _archive는 게이트 통과 후 삭제(git이 곧 아카이브).
- 결정 1: Echo 게이트 신설 — 위임 작업 전 일상어 요약 확인 강제, `echo.confirmed !== true`면 Lock 불가(타입+코드 강제).
- 결정 2: confidence 폐기 → 결정론 필수 필드 체크리스트(intent/scope-files/done, 누락만 질문, max 1라운드).
- 결정 3: startup inventory 실코드화(scripts/inventory.js, 24h 캐시), hashline/worktree 비핵심 제외 — 필요 시 git b14f1bb 회수.

## [2026-08-25] feat | v3.1 — cache placement protocol, echo gate enforcement
- 결정 4: Cache Economics 3원칙 — stable prefix(헌법 세션 중 불변·휘발성은 prefix 뒤 배치) / late compaction(임계 도달 시에만) / delegation=isolation(강제 위임의 경제학적 근거). 이식 출처: Aider caching(--cache-prompts), OpenHands condenser(임계 시에만 condense). 근거: raw/notes/cache-economics.md → wiki/concepts/cache-placement.md.
- 결정 5: Echo 게이트 코드 집행 — 모든 Task 프롬프트에 `gate:echo-confirmed` | `gate:research-exempt` 선언 필수, 미선언 차단(fail-closed; Goose PreToolUse는 fail-open, 우리는 반대). plugins/force-delegation.js `taskGateOk` export + tests/echo-gate.test.js.
- 결정 6: Interview 형식 이식(Spec Kit clarify) — 질문 ≤5 하드캡, 옵션 2~4 + Recommended 최상단(한 줄 이유), "yes" 한 글자 전체 수락, 선정 우선순위 Impact × Uncertainty. 트리거 결정론·confidence 금지 유지.
- 결정 7: MCP behavior hints(basic-memory 패턴) — search_wiki/get_context readOnlyHint, verify_before_tag idempotentHint. get_context AGENTS.md 선두 반환은 기존 구현 그대로 확인됨.

## [2026-08-25] fix | v3.2 — P0: revive dead force-delegation guard (official plugin contract)
- **사건 요약 ("green tests, dead guard")**: v3.1 가드가 유닛 테스트 100% 통과에도 런타임에서 단 한 번도 작동하지 않았다. 런타임 프로브(`opencode debug config --print-logs`)가 baseline으로 실측: `level=ERROR message="failed to load plugin" error="on is not a function ... 'on' is undefined"` → 로더가 흡수 → 훅 0개 등록 = Layer 2 사(死)코드.
- **4중 결함**: ①진입 `setup({on})` — PluginInput에 on 없음 ②`on("tool.execute.before",...)` 콜백 등록 — 훅 객체 반환 필요 ③args를 `input.args`에서 읽음 — 실제론 `output.args` ④훅 input은 `{tool, sessionID, callID}`뿐 agent 필드 없음.
- **수정 내역**: plugins/force-delegation.js 전면 재작성 — 공식 계약 `({project,client,$,directory,worktree}) => Promise<Hooks>`, 훅 객체 반환, `output.args` 직독. 에이전트 판별은 SDK 1.18.23 타입 실측으로 [가능] 확정: `client.session.messages({sessionID})` → UserMessage.agent (보조: AssistantMessage.mode) → conductor 전용 풀 가드(write/edit/patch + bash 쓰기 패턴). Task 마커 게이트는 신원 불필요 → **전 에이전트 적용**(P1-4 중첩 우회 차단). 신원 미확정 시 파괴 명령(rm/del/Remove-Item/ri)만 전역 차단(P1-2). 리다이렉트 통합 정규식(공백 없는 >f/>>f/2>f 차단, 2>&1/$null/NUL 면제), heredoc `<<`·PS here-string `@'`/`@"`, PS 별칭 sc/ac/ni/mi 추가.
- **재발 방지선 (P1-8)**: tests/plugin-wiring.test.js 신설 — default export → mock 컨텍스트 호출 → 훅 객체 배선 단언 → mock input/output 구동. 이 테스트가 있었다면 v3.1 사코드를 배포 전에 잡았을 것.
- **기타 P1/P2**: 버전 통일 v3.2(package.json/AGENTS.md H1/README H1), Lock 스키마 검증기 실코드화(scripts/validate-schema.js, stdlib, exit 0/1/2 + 테스트 4건 — P1-6), 마커 자체선언 한계 문서화(skills/interpreter/SKILL.md — P1-5), check_vault 출력 "drift"→"hash reachability"(P1-7), Rule 5 explore 위임 명시 + Cache Economics 제목 "(design guidance, 미실측)" + package.json files에 log.md 추가(P2).

## [2026-08-25] docs | v3.2 replication checklist 문서화 + engines 필드 신설
- 복제 체크리스트 상세화: raw/notes/replication-checklist.md(원본 상세판) + wiki/references/replication-guide.md(요약, 볼트) — 0단계 출발지 자격(P0 사건 반영 복제 금지 조항)/1~7단계/함정 6종. package.json engines 신설: `"node": ">=22"` — 근거: node --test glob 인수 지원 v21.0.0(SEMVER-MAJOR, PR #47653; v21은 EOL 단기 Current라 최소 활성 LTS 라인 22 채택)+ESM("type": "module"), 실측 v24.11.0.
- 수동 프로브 7종 번호 확정(이후 문서는 이 번호 참조): 1) `opencode debug config --print-logs`에 "failed to load plugin" 없음 2) 무마커 Task 프롬프트 차단(Echo 게이트 fail-closed) 3) `gate:echo-confirmed` 선언 Task 통과 4) conductor 직접 write/edit 차단 5) conductor bash 쓰기(Set-Content/리다이렉트/heredoc) 차단 6) 파괴 명령 rm/del/Remove-Item/ri 신원 불문 차단 7) `npm test` PASS(plugin-wiring.test.js 포함).

## [2026-08-26] fix | v3.2 audit follow-up — guard depth, plugin pinning, link gate, version SSOT
- 결정 8: bash Layer 1 완성 — conductor.permission에 `"bash": {"*":"deny"}` 추가(글로벌과 객체형 통일). 재프로브 실측: 해석 설정에 반영 확인. Layer 1이 이제 edit/write(포괄)/bash 전부 커버.
- 결정 9: 외부 플러그인 유령 발견 → npm 고정·활성화. spec `cgasgarth/opencode-dynamic-subagents`는 관성임을 실측(normal ≡ --pure 프로브, 빈 클론 캐시 2026-08-22 잔해, node_modules 부재). 사용자 확정 하에 `opencode-dynamic-subagents@0.3.1`(npm 최신, SLSA provenance)로 교체 → 재프로브에서 dsa-* 서브에이전트 12개 생성, failed-to-load 부재. 함정 목록 7종으로 갱신("무버전 owner/repo spec은 조용히 관성이 된다").
- 결정 10: write 키 제거 — 공식 Permissions 문서 실증 "`edit` covers edit/write/patch"(2026-08-25판). replication-checklist의 "유지 중" 표기 종결. _routing_note의 유령 4-tier(tier:minimal 등) 삭제 → SKILL.md Flow 8단계 실사용 3-tier 어휘와 정합.
- 결정 11: check_vault 검사 d 신설 — `[text](path)` 대상 존재 검사(index.md+wiki/**; scheme/앵커 스킵, 상대경로는 저장소 루트 기준). 실패 분기 테스트 3종 추가(index-parity / hash-unreachable git 픽스처 / 끊긴 링크+정상 링크 병행 단언).
- 결정 12: 버전 SSOT 도입 — scripts/sync-version.js(마스터=root package.json, TARGETS 허용 목록: mcp/package.json, mcp/package-lock.json 양 version 필드, AGENTS.md H1, README.md H1, package.json description). log.md 역사와 wiki/raw 출처 라벨은 구조적 제외. scripts sync:version/check:version 신설, check:version verify 체인 편입. 1회 실행: mcp 3.1.0→3.2.0, lockfile 3.0.0→3.2.0 정렬(diff 4줄, churn 없음).
- 문서: AGENTS.md lint 나열 5건 수정(validate-schema.js 누락분)+check:version 절 신설+scripts 레이아웃 주석 갱신(사용자 승인, 세션 중 수정 — 다음 세션부터 반영). explore/general 태스크 키의 의도적 참조 근거를 replication-checklist 3단계와 wiki/topics/guard-depth-version-ssot.md에 기록(explore 빌트인 resolve 실측 포함).
- 잔여 리스크: mcp/server.js 폴백 상수 "3.1.0"(도달 불가 dead default), 캐시 잔해 packages/cgasgarth 빈 디렉터리(저장소 밖, 무해).

## [2026-08-26] fix | v3.2 audit follow-up 2 — dead 폴백 상수 제거(fail-fast 전환)
- 내용: mcp/server.js SERVER_VERSION IIFE의 도달 불가 폴백 상수 "3.1.0" 제거 — 루트 package.json read/parse 실패 또는 version 누락 시 명확한 Error를 throw해 조용한 오버라이트 부트 차단(fail-fast). scripts/sync-version.js 헤더 제외 목록에서 무효화된 server.js 불릿을 역사 주석으로 정리(TARGETS allow-list 5개 로직 무변경).
- 근거: 사용자 배치 질의 확정(2026-08-26) — (1) 폴백 즉시 제거·fail-fast 전환 (2) dsa-* 에이전트 유지(플러그인 무조치) (3) 캐시 잔해는 사용자 수동 삭제 안내만(저장소 밖, 범위 외).
- 테스트 영향: tests/ 전수 grep에서 "3.1.0"/"SERVER_VERSION" 단언 부재, "fallback" 1건은 force-delegation 파괴 명령 식별 폴백으로 무관 → 수정 없이 기존 25테스트 유지(실측 pass 25 / fail 0).
- 남은 과제: dsa-* 유지 확정으로 추가 작업 없음. 캐시 잔해 packages/cgasgarth 빈 디렉터리는 사용자 수동 삭제 예정.

## [2026-08-26] chore | publishing identity — MIT license, package metadata, tarball completeness
- 내용: LICENSE 신설(표준 MIT, Copyright (c) 2026 PALAN-K) + package.json 메타 3필드(`"license": "MIT"`, `"repository": "github:PALAN-K/palank-harness"`, keywords 6종 — opencode/harness/interpreter/ai-agents/llm/developer-tools) + files 허용목록에 opencode.json·tests/ 추가(tarball 완전성 — 기존 목록엔 머신 값과 테스트가 빠져 있었다) + README 사전 요구사항에 LLM 제공자 접속 수단 항목 신설(relay 프록시 기본값 → 이식 시 자체 엔드포인트 교체 경고).
- 결정 13: private:true 유지 — 상품화 정체성(MIT·메타·tarball 완비)만 선제 정비하고 npm 게시 여부는 별도 결정으로 유보.
- 검증: check:version 0 drift + npm run verify exit 0 + npm pack --dry-run에서 opencode.json·tests/*.test.js 포함 확인.

## [2026-08-27] chore | refresh inventory + verify PASS (dual vault N/A) [verify PASS]
- inventory 갱신 — `npm run inventory --refresh` 재실행(006: 2026-08-27T08:41:40Z, 008: 2026-08-27T08:42:14Z) — `.opencode-inventory.json`은 gitignore 유지로 미커밋.
- verify 체인 확인 — `verify`는 이미 `lint && check:vault && test && check:version && pack` 정렬 완료(2026-08-26 SSOT), drift 0 유지.
- vault 단일화 유지 — 006은 canonical `wiki/`+`raw/`+`index.md` 단일 vault 체제이므로 `.wiki` 이중 vault 처리 해당 없음(008만 archive).
- raw/data — 006은 `raw/data` 미사용으로 `.gitkeep` 불필요.
- 검증: `npm run verify` PASS — lint/vault/test/version/pack 전 통과(tarball 32 files, 52.7 kB), `sync-version --check` 0 drift.
