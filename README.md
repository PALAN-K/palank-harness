# palank-harness v3.3 — Echo-first interpreter on opencode

> **⚠️ thin v3.3 — 설치는 파일 복사만 (WSL은 Linux 절대경로만, UNC 쓰기 금지) — AGENTS.md 헌법 참조**
> thin 설치는 `006-palank-harness`에서 **파일 복사**만으로 수행 — `npx harness-bootstrap` / `opencode init` / `.opencode/agent/*.md` 수동 생성 **절대 금지**.
> Windows UNC(`\\wsl.localhost\...`)는 읽기만, 쓰기는 WSL `~/projects/<repo>` Linux 절대경로로만. 오염 시 즉시 삭제: `python3 -c "import shutil,pathlib; shutil.rmtree(pathlib.Path('.opencode'))"`

```bash
# thin 설치는 파일 복사만 (WSL은 Linux 절대경로 사용)
cp -a AGENTS.md opencode.json scripts/ plugins/ skills/ mcp/ ~/projects/<target>/
# + wiki/architecture/*.md 이식 후 npm run sync:architecture 로 architecture.html 재생성 (replication-guide 56-59 정합)
# 금지: npx harness-bootstrap, opencode init, .opencode/agent/*.md 수동 생성
# 오염 시: python3 -c "import shutil,pathlib; shutil.rmtree(pathlib.Path('.opencode'))"
```

## 이것이 무엇인가

- opencode 위에 얹는 **투명래퍼 인터프리터**. 사용자가 일기처럼 말해도
  Listen → Echo → Interview → Lock → 최적 opencode 호출로 해석·위임한다.
- **Echo 게이트** — 위임 전 일상어 의도 요약과 사용자 확인을 강제한다.
  스키마 타입(`echo.confirmed !== true`면 Lock 불가) + 플러그인 코드(무마커 Task 차단,
  fail-closed)의 이중 강제.
- **wiki + raw 지식 볼트와 로컬 MCP** — 모든 주장은 raw/ 인용(Raw)을 요구하고,
  검증은 사람이 아니라 기계(`npm run verify`)가 한다.

## 사전 요구사항

- **opencode CLI** — 인터프리터 실행기이자 플러그인 로더.
  프로브: `opencode debug config --print-logs`
- **LLM 제공자 접속 수단** — `opencode.json`의 relay baseURL·모델 ID에 대응하는
  계정/API 키. 기본값은 프로젝트 전용 프록시이므로 이식 시 반드시 자신의
  엔드포인트로 교체할 것(업데이트 절의 보호 경로 참조).
- **Node >=22** — `package.json` `engines.node`. 근거: `npm test`가
  `node --test "tests/*.test.js"` 처럼 glob 인수를 지정하는 node --test(v21+ 도입)를 쓰고,
  ESM(`"type": "module"`)이다. 실측은 v24.
- **git** — Vault-Base 해시 도달성(`git cat-file -e <hash>`) 유지에 필수.

## 설치 (새 프로젝트 이식)

> **금지 — thin 설치 원칙 (모든 AI 필수 준수, AGENTS.md 헌법 참조)**
> - `opencode init`, `npx harness-bootstrap`, `.opencode/agent/*.md` 수동 생성 **절대 금지** — thin 설치는 `006-palank-harness`에서 **파일 복사**만으로 수행: `AGENTS.md`, `opencode.json`, `scripts/`, `plugins/`, `skills/`, `mcp/` → 대상 repo 루트로 `cp -a`. `.opencode/` 디렉터리 자체는 생성 금지(런타임 산출물 아님).
> - Windows UNC(`\\wsl.localhost\Ubuntu\home\...`)로는 읽기만, 쓰기는 WSL `~/projects/<repo>` Linux 절대경로로만.
> - 전역 오염 시 즉시 삭제: `python3 -c "import shutil,pathlib; shutil.rmtree(pathlib.Path('.opencode'))"` → `npm run inventory:refresh`로 3 agents 복구 확인.
> - 위반은 `npm run verify`의 `check_vault --strict`(e항) + `inventory --strict`가 기계적으로 FAIL 차단 (사람이 아닌 기계가 검증).

```bash
# thin 설치는 파일 복사만 (WSL은 Linux 절대경로 사용)
cp -a AGENTS.md opencode.json scripts/ plugins/ skills/ mcp/ ~/projects/<target>/
# 금지: npx harness-bootstrap, opencode init, .opencode/agent/*.md 수동 생성
# 오염 시: python3 -c "import shutil,pathlib; shutil.rmtree(pathlib.Path('.opencode'))"
```

한 줄 요약:

> git 이력 포함 복제 → `opencode.json` 머신 값 교체(relay URL·모델 ID) →
> `cd mcp && npm install` → `npm run inventory` → 볼트 재시드 → `npm run verify` → 수동 프로브

**전제 — 복제 금지 조항**: 출발지 저장소에 프로브 통과 이력이 없으면 복제를 시작하지 않는다.
`npm run verify` PASS + `"failed to load plugin"` 부재 + 수동 프로브 1·2·3번 통과 이력,
셋 중 하나라도 없으면 금지("green tests, dead guard", P0).

상세 7단계 + 복제 금지 조항 전문: [wiki/references/replication-guide.md](wiki/references/replication-guide.md) — 용어 분리표는 [wiki/concepts/terminology.md](wiki/concepts/terminology.md) (replication≠distribution≠scaffold, foundry≠harness)

## 업데이트 (기존 복제본 → upstream 동기화)

```bash
git remote add upstream https://github.com/PALAN-K/palank-harness.git
git fetch upstream
```

1. upstream의 `log.md`로 변경점 리뷰 — 결정 이력(append-only 감사 장부)이 곧 업데이트 노트다.
2. **병합 대상 (코어)**: `plugins/` · `scripts/` · `skills/` · `mcp/` · `AGENTS.md`
3. **보호 경로 (절대 덮어쓰기 금지)**:
   - `opencode.json`의 머신 값 — relay URL(baseURL) · 모델 ID(small_model 포함)
   - `wiki/` · `raw/` — 이 프로젝트의 지식 볼트
   - `package.json`의 프로젝트 메타(name/description)
4. 의존 변경 시: `cd mcp && npm install` 후 `npm run inventory:refresh` 재생성
5. 검증: `npm run verify` + 플러그인 로드 프로브 —
   `opencode debug config --print-logs` 출력에 `"failed to load plugin"` 부재 확인(P0 재발 방지선)
6. 동기화 버전 기록: 복제본 `log.md`에 `synced to upstream vX.Y.Z` 엔트리 추가
7. 커밋: `sync: upstream v3.x`

## 일상 명령어

```bash
npm run verify                            # 전체 게이트(FULL): lint + check:vault + test + check:version + check:architecture + pack --dry-run
npm run verify:tiered                     # tier 분기 게이트(SKIPPED→종료, QUICK→verify:quick, FULL→verify, Fail-Closed)
npm run verify:quick                      # 가벼운 게이트(QUICK): lint + check:vault + test — version/arch 제외(FULL에서만, 일상 단축용)
npm run inventory                         # startup inventory (24h 캐시 우선, .opencode-inventory.json, 커밋 금지)
npm run inventory:refresh                 # startup inventory 실시간 강제 갱신 (pull·모델변경 직후 1회)
node scripts/validate-schema.js '<json>'  # Lock 스키마 검증 (exit 0 유효 / 1 무효 / 2 usage)
```

- `npm run verify`(FULL) = lint + check:vault + test + check:version + check:architecture + pack --dry-run 순 발동(AGENTS.md Verification 절 SSOT).
- pre-commit 훅(`scripts/pre-commit` → `scripts/verify-tiered.js`)이 tier 판정 후 SKIPPED→종료 / QUICK→`verify:quick` / FULL→`verify` 분기, 실측만 `foundry/verify-history.jsonl`에 1줄 기록(--dry-run·fixture 미기록).
- pre-push 훅(`scripts/pre-push` → `npm run verify` FULL, 공유 전 필수, QUICK 우회 금지).
- Lock 스키마 필수 필드: `intent, files, schema, opencode_call, model, mcp, echo` —
  `echo.confirmed`는 엄격 boolean `true`(미확인 스키마는 Lock 불가).

## 문서 지도

| 문서 | 역할 |
|---|---|
| `AGENTS.md` | 헌법 — 세션 중 불변(수정은 세션 재시작으로), Layout 8줄 SSOT |
| `wiki/` + `raw/` + `index.md` | 지식 볼트 — 7-structure(`architecture/decisions/releases/gotchas/archive` + `concepts/topics/references`), Raw 인용·패리티·해시 검증 |
| `foundry/` | 공장 전용 — brainstorm/templates/verify-history, hermetic·`npm pack` 제외, 하네스 밖 |
| `log.md` | 결정 이력 — append-only 감사 장부, 업데이트 노트 겸용 |
| [wiki/references/replication-guide.md](wiki/references/replication-guide.md) | 이식 절차 — 7단계 요약(볼트 페이지), 상세판은 raw/notes |
| [wiki/concepts/terminology.md](wiki/concepts/terminology.md) | 용어 분리 — replication≠distribution≠scaffold, foundry≠harness 5행 표 + REPO_ROOT 별칭 4종 |

## 문제해결

- **git 없는 복제** → strict vault 적색(Vault-Base 해시 미도달) — 반드시 `git clone`/`git bundle`로 이력 포함 복제.
- **`sc` 별칭 차단이 Windows sc.exe(서비스 제어)와 오탐** — 수용된 한계(`plugins/force-delegation.js` 주석).
- **Node 버전 부족** → node --test glob 인수 실패 — engines `>=22`(실측 v24).

전체 함정 6종(실측 기반): [raw/notes/replication-checklist.md](raw/notes/replication-checklist.md) — 용어·별칭 상세: [raw/notes/glossary.md](raw/notes/glossary.md)
