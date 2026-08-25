# Hashline — Thin TS 선별 차용 (oh-my-pi → Palank)

> oh-my-pi `packages/hashline`의 LINE:HASH 앵커 편집 신뢰도(6.7%→68.3%)를 Rust 없이 TS 해시 검증만으로 80% 재현. 파일당 배치 1회, stale 거부.

## 원전
- oh-my-pi README: `packages/hashline/README.md` — `[PATH#TAG]` TAG=4-hex snapshot, `PUT N.=M:` / `PUT <N:` / `CUT` / `MV`, `Patcher`+`SnapshotStore`+`Filesystem` 추상화
- Prompt: `src/prompt.md` — LINE:TEXT 앵커는 `read` 직후 원본 라인 번호, hunk 이후 재ground 필요
- Thin 차이: SnapshotStore/4-hex 대신 `oldText`의 `sha1 7hex`(`shortHash`)로 stale 검증, `lineHint`와 `expectedHash` 이중 앵커

## 언제 쓰는지
- `intent ∈ {build, migrate, fix}`에서 파일 편집이 필요할 때 — LLM이 `read`로 원본을 본 직후 `edits[]`를 계획하고 `hashlineReplace`로 적용. `verify` 게이트가 stale을 감지해 재시도 → 편집 신뢰도 상승.
- 선택적: 기존 `write`/`edit` 그대로 동작 가능, hashline은 권장 경로 (강제 아님, Thin 유지)

## API (scripts/hashline.js)
```js
import { shortHash, hashlineApplyContent, hashlineReplace } from "../scripts/hashline.js";
// edit = { oldText, newText, lineHint, expectedHash } — expectedHash = shortHash(oldText)
hashlineReplace("src/app.ts", [
  { oldText: 'const a = 1;', newText: 'const a = 2;', lineHint: 12, expectedHash: shortHash('const a = 1;') }
]);
const next = hashlineApplyContent(original, edits); // pure, no I/O, offset descending 적용
```
- `lineHint`는 원본 라인 번호(`read` 직후), hunk로 shift되지 않음 — 모든 edit를 원본에 locate 후 descending offset으로 1-write 적용
- `expectedHash`는 `oldText`의 동적 `sha1` 7자리, 하드코딩 금지
- `oldText === ""`이면 `lineHint` 앞에 `newText` 삽입 (`<N:` 동등)

## 실패 모드 (verify가 감지)
- `hash mismatch — file changed since edit planned` — `oldText`가 `lineHint`에도 없고 전역에도 없거나, `expectedHash != shortHash(oldText)`일 때 throw. `lineHint`와 `hash` 둘 다 불일치 시 거부 (하나는 drift 허용)
- `overlapping edits detected` — 동일 원본 구간에 두 edit가 겹치면 throw

## 예시 1개 — 배치 편집 (파일당 1 read/1 write)
```js
const before = fs.readFileSync("hello.ts","utf8"); // read 1회
const edits = [
  { oldText: 'const greeting = "hi";', newText: 'const greeting = "hello";', lineHint: 1, expectedHash: shortHash('const greeting = "hi";') },
  { oldText: 'console.log(greeting);', newText: 'console.log(greeting+"!");', lineHint: 3, expectedHash: shortHash('console.log(greeting);') }
];
hashlineReplace("hello.ts", edits); // 내부에서 1 read → 2 edits offset 정렬 → 1 write
```

## 제약
- Rust/Bun/Zig 금지, 순수 Node.js `crypto`
- 하드코딩된 해시 금지, `shortHash` 동적 계산 필수
- `main` 직접 수정 금지, worktree 격리 후 `verify` 통과 후 머지

## 검증
- `tests/hashline.test.js`: stale 거부 케이스, 배치 성공 케이스 (2개 이상)
- `npm run lint`는 `node --check scripts/hashline.js` 포함
- `opencode.json:mcp.type=local` 유지 — provider 자립화(07d7062) 불변
