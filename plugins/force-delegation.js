/**
 * force-delegation hook — layer 2 of the 3-layer forced-subagent guard (palank-harness v3.1)
 * Layer 1: opencode.json permission (edit/write deny on conductor) — prompt-level
 * Layer 2: this hook — runtime hard block, model-agnostic (even open-weight that ignores prompt)
 * Layer 3: AGENTS.md front-loaded prompt — few-shot examples
 *
 * v3 changes vs v2 (_archive/plugins/force-delegation.js @ git:b14f1bb):
 *   - matcher exported for tests: isBlocked(command) (+ default handler)
 *   - PowerShell write-cmdlet coverage added:
 *     Set-Content / Add-Content / Out-File / New-Item -ItemType File /
 *     [System.IO.File]::WriteAllText|WriteAllLines|AppendAllText|WriteAllBytes /
 *     [IO.File]::* / node -e "...fs write APIs..."
 *
 * v3.1 — echo gate enforcement on Task dispatch (pattern: Goose PreToolUse block):
 *   - every Task prompt must declare `gate:echo-confirmed` (user confirmed the
 *     plain-language intent summary) or `gate:research-exempt` (research-only).
 *   - FAIL-CLOSED by design — Goose's PreToolUse blocking is fail-open; we invert it.
 *     Missing marker, empty prompt, malformed args -> block. The gate never opens by accident.
 *   - exported for tests: taskGateOk(prompt), isBlocked(command)
 *
 * Blocks any direct write/edit/bash-write from conductor, forces Task delegation.
 */

// --- Unix / classic shell patterns (kept from v2) ---
const UNIX_PATTERNS = [
  /(^|\s)(>|>>|tee\s|sed\s+-i|heredoc|python\s+-c\s+.*open\(.*\.write)/,
];

// --- PowerShell write-cmdlet patterns (v3) ---
const POWERSHELL_PATTERNS = [
  /\bSet-Content\b/i,
  /\bAdd-Content\b/i,
  /\bOut-File\b/i,
  /\[System\.IO\.File\]::(?:WriteAllText|WriteAllLines|AppendAllText|WriteAllBytes)\b/i,
  /\[IO\.File\]::/i,
  // node -e followed by an fs write-family API anywhere in the script body
  /\bnode\s+-e\b[\s\S]*?\b(?:writeFile|appendFile|createWriteStream)\w*/i,
];

// --- Echo gate marker (v3.1) ---
const GATE_RE = /gate:(echo-confirmed|research-exempt)/;

/**
 * True when a shell command would mutate the filesystem via redirect,
 * Unix classic tools, or PowerShell write cmdlets. Exported for tests.
 */
export function isBlocked(command) {
  const cmd = String(command ?? "");
  if (!cmd) return false;
  // New-Item + -ItemType File can appear in any argument order
  if (/\bNew-Item\b/i.test(cmd) && /-ItemType\s+File\b/i.test(cmd)) return true;
  return [...UNIX_PATTERNS, ...POWERSHELL_PATTERNS].some((re) => re.test(cmd));
}

/**
 * Echo gate predicate (v3.1): true only when a Task prompt declares
 * `gate:echo-confirmed` or `gate:research-exempt`. Fail-closed —
 * undefined/empty/marker-less prompts are all rejected. Exported for tests.
 */
export function taskGateOk(prompt) {
  return GATE_RE.test(String(prompt ?? ""));
}

/** Default plugin entry — opencode calls setup({ on }). */
export default async function setup({ on }) {
  on("tool.execute.before", async (input, ctx) => {
    const agent = ctx?.agent?.id || ctx?.agent || "";
    const tool = String(input?.tool || input?.name || "").toLowerCase();
    // Only enforce on conductor (primary)
    if (agent !== "conductor" && agent !== "main" && !String(agent).includes("conductor")) return;

    // Block direct file mutation
    if (["write", "edit", "patch"].includes(tool)) {
      throw new Error(
        `Blocked: conductor cannot use '${tool}' directly. Use Task tool with subagent_type="interpreter" or "verify" instead. See AGENTS.md Rules 1/5.`
      );
    }
    // Block bash/shell commands that would write files
    if (tool === "bash" || tool === "shell") {
      const cmd = (input?.args?.command || input?.input || "").toString();
      if (isBlocked(cmd)) {
        throw new Error(
          `Blocked: shell write detected. Conductor must not write via shell. Use Task->interpreter instead. Command: ${cmd.slice(0, 80)}`
        );
      }
    }
    // Echo gate on Task dispatch (v3.1, fail-closed)
    if (tool === "task") {
      const prompt = input?.args?.prompt ?? input?.input?.prompt ?? input?.input;
      if (!taskGateOk(prompt)) {
        throw new Error(
          "Echo gate not satisfied: Task prompt must declare `gate:echo-confirmed` (user confirmed intent summary) or `gate:research-exempt` (research-only). See skills/interpreter/SKILL.md Flow step 2."
        );
      }
    }
  });
}
