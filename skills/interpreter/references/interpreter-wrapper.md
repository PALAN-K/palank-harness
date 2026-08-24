# Interpreter Dynamic Transparent Wrapper — Startup Inventory

> 이 문서는 `skills/interpreter/SKILL.md: Startup Inventory` 섹션의 상세 스펙이다.
> 정적 매핑 테이블 금지 — 매 실행 인벤토리 리딩으로 신형 커맨드 자동 반영.

## 목적

Interpreter는 **동적 투명 래퍼**다. 슬래시 커맨드/스킬/에이전트 목록을 SKILL.md에 하드코딩하지 않고,
매 실행마다 opencode의 실제 가용 목록을 조회해 LLM이 런타임에 최적 기능을 선택하도록 한다.
사용자는 “일기”로 말해도 되고, 하네스는 매번 최신 하네스 기능을 자동 반영한다.

## Startup Inventory 파이프라인

```
매 실행 시: debug skill+config+glob → available_tools[] → LLM 프롬프트 주입 → classify → LLM이 런타임 목록에서 최적 하네스 기능 선택
```

1. **debug skill** — `opencode debug skill` (JSON) 실행 → built-in + project + global + external 스킬 목록 수집
2. **debug config** — `opencode debug config` (JSON) 실행 → 병합된 `agent`/`command`/`provider`/`plugin`/`mcp` 해소 결과 수집
3. **glob** — 아래 패턴으로 슬래시 커맨드/스킬/에이전트 파일 목록 수집:
   - `.opencode/command/*.md` (또는 `.opencode/commands/*.md`)
   - `~/.config/opencode/command/*.md` (또는 `commands/*.md`)
   - `skills/**/SKILL.md`, `.opencode/skills/**/SKILL.md`, `~/.config/opencode/skills/**/SKILL.md`
   - `.opencode/agent/*.md`, `~/.config/opencode/agent/*.md`
   - `opencode debug paths`로 전역 경로 확인
4. **available_tools[]** — 위 결과를 정규화해 `[{name, description, source, invocation}]` 배열로 합치기
5. **LLM 프롬프트 주입** — `available_tools[]`를 interpreter 시스템 프롬프트 또는 classify 단계 입력에 주입
6. **classify** — LLM이 사용자 의도(intent)와 `available_tools[]`를 대조해 최적 하네스 기능 1개를 선택
7. **opencode_call 생성** — 선택된 기능의 호출 형태(`opencode run` / `opencode mcp` / 슬래시 커맨드)로 `Translate` 스키마를 생성

## 동적 vs 정적 — 금지 사항

- ❌ 금지: SKILL.md 안에 고정 표를 나열

  | 컨텍스트 | 명령 |
  |---|---|
  | 왜 느려졌어 | /debug |
  | 새 기능 | /diff |

  이런 정적 매핑은 신형 커맨드 추가 시 즉시 구식이 되고, 프로젝트별 커스텀 커맨드를 반영하지 못한다.

- ✅ 권장: 매 실행 인벤토리 리딩

  ```js
  const skills = JSON.parse(execSync("opencode debug skill --json") || "[]");
  const config = JSON.parse(execSync("opencode debug config --json"));
  const projectCommands = globSync(".opencode/command/*.md");
  const globalCommands = globSync(path.join(os.homedir(), ".config/opencode/command/*.md"));
  const available = [...skills, ...config.commands, ...projectCommands, ...globalCommands];
  // available_tools[]를 LLM에 주입
  ```

## 예시 2개 (런타임 선택 시뮬레이션)

### 1) “왜 느려졌어” → 프로파일링 + 지식 검색

- 사용자 원문: “로그인 왜 느려졌어? 최근 배포 후 체감 느림”
- 인벤토리 조회 결과(예시): `skills: [harness-bootstrap, wiki-manager, interpreter, verify]`, `commands: [harness]`, `mcp: [palank-domain: search_wiki, get_context]`, `agents: [conductor, interpreter, verify, explore]`
- LLM 판단: `intent=profile` + `ambiguous(files)` → GRILL 스킵(명확한 프로파일링) → `available_tools`에서 `mcp/palank-domain`의 `search_wiki`와 `verify`의 프로파일링 루틴을 조합 → `opencode_call: "opencode run --agent verify 'login p99<800ms 검증 + wiki search'"`

### 2) “새 기능 추가해줘” (모호) → GRILL + 스캐폴드 + 검증

- 사용자 원문: “새 기능 추가해줘”
- 인벤토리 조회 결과: 동일 + `worktree` 관련 스크립트(`scripts/worktree.js`) 감지
- LLM 판단: `confidence 0.45 < 0.7` + `intent=build` + `ambiguous(schema, files)` → GRILL 트리거 → `question` 툴로 배치 질문 3개(기능 유형/대상 파일/완료 기준) → 응답 후 `available_tools`에서 `sandbox:new` 격리 + `build` + `verify` 조합을 선택 → `opencode_call: "opencode run --agent verify 'worktree grill-transparent-wrapper에서 요구사항 반영 후 verify'"`

## 검증 방법 (dry-run 로그)

```bash
# worktree 내부에서 실행해 inventory 명령이 실제 동작하는지 확인
opencode debug skill 2>&1 | head -20
opencode debug config 2>&1 | head -40
ls .opencode/command/*.md 2>&1; ls ~/.config/opencode/command/*.md 2>&1
ls skills/**/SKILL.md 2>&1; ls ~/.config/opencode/skills/**/SKILL.md 2>&1
opencode debug paths 2>&1
```

모든 명령은 하드코딩 없이 매 실행마다 최신 결과를 반환해야 한다. 결과가 바뀌면 LLM의 선택도 자동으로 바뀐다 — 이게 투명 래퍼의 핵심이다.

## 관련 규칙

- `AGENTS.md:6 Clarify Before Contract` — 임계치 넘으면 배치 질문 후 스키마 잠금
- `AGENTS.md:1 Interpreter first` — 동적 래퍼 역할 1줄
- `skills/interpreter/SKILL.md:2.5 GRILL(soft)` — soft gate 상세 로직
