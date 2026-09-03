/**
 * force-delegation hook — layer 2 of the 3-layer forced-subagent guard (palank-harness v3.2)
 * Layer 1: opencode.json permission (edit deny on conductor) — config-level
 * Layer 2: this hook — runtime hard block, model-agnostic (even open-weight that ignores prompt)
 * Layer 3: AGENTS.md front-loaded prompt — few-shot examples
 *
 * v3.2 — REWRITTEN TO THE OFFICIAL PLUGIN CONTRACT. The v3.1 file used a
 *   non-existent `setup({on})` callback entry, so the loader threw and the
 *   whole guard never registered ("green tests, dead guard" incident).
 *   4 defects fixed at once:
 *     1) entry is now ({ project, client, $, directory, worktree }) => Promise<Hooks>
 *     2) hooks are RETURNED as an object, not registered via on(...)
 *     3) tool args are read from output.args (hook input has no args)
 *     4) hook input is {tool, sessionID, callID} only — agent identity is
 *        resolved via client.session.messages({sessionID}) (UserMessage.agent)
 *   FAIL-CLOSED by design: the Task marker gate applies to ALL agents (nested
 *   dispatch included) and needs no identity; destructive shell commands are
 *   blocked universally even when agent identity cannot be resolved.
 *
 * Blocks any direct write/edit/bash-write from conductor, forces Task delegation.
 */

// --- Unix / classic shell patterns (kept from v2/v3, extended in v3.2) ---
const UNIX_PATTERNS = [
  /(^|\s)(tee\s|sed\s+-i|heredoc|python\s+-c\s+.*open\(.*\.write)/,
  // P1-2: redirects, spaced AND space-less (>f, >>f, 2>err.log). Stream merges
  // (2>&1) and null sinks (> $null / > NUL) are exempt so pure reads survive.
  /(^|\s|[0-9])>{1,2}\s*(?!&[0-9]\b)(?!\$null\b)(?!\bNUL\b)\S/i,
  // P1-2: real heredoc syntax — bash <<EOF / <<-EOF / <<<here-string
  /<<-?/,
];

// --- PowerShell write-cmdlet patterns (v3, extended in v3.2) ---
const POWERSHELL_PATTERNS = [
  /\bSet-Content\b/i,
  /\bAdd-Content\b/i,
  /\bOut-File\b/i,
  /\[System\.IO\.File\]::(?:WriteAllText|WriteAllLines|AppendAllText|WriteAllBytes)\b/i,
  /\[IO\.File\]::/i,
  // node -e followed by an fs write-family API anywhere in the script body
  /\bnode\s+-e\b[\s\S]*?\b(?:writeFile|appendFile|createWriteStream)\w*/i,
  // P1-2: PS write-cmdlet aliases sc(Set-Content) ac(Add-Content) ni(New-Item) mi(Move-Item*).
  // Known trade-off: "sc.exe ..." (Service Control) collides with the sc alias —
  // accepted per contract; harness sessions practically never invoke sc.exe.
  /\b(?:sc|ac|ni|mi)\b/i,
  // P1-2: PS here-string openers @' / @" (any real here-string contains one)
  /@['"]/,
];

// --- Destructive commands (P1-2): blocked for EVERYONE when identity is unknown,
//     and always for conductor via isBlocked() ---
const NO_VERIFY_RE = /\B--no-verify\b/;
const DESTRUCTIVE_PATTERNS = [
  /\brm\b/,            // also catches `npm rm` (package.json mutation) — intended
  /\bdel\b/i,
  /\bri\b/i,           // Remove-Item alias
  /\bRemove-Item\b/i,
  NO_VERIFY_RE,
];

// --- Echo gate marker (v3.1) ---
const GATE_RE = /gate:(echo-confirmed|research-exempt)/;

// Agents whose direct mutations are forbidden (primary orchestrators)
const CONDUCTOR_RE = /^(conductor|main)$/i;

/**
 * True when a shell command would mutate the filesystem via redirect,
 * Unix classic tools, PowerShell write cmdlets/aliases, or delete files.
 * Exported for tests.
 */
export function isBlocked(command) {
  const cmd = String(command ?? "");
  if (!cmd) return false;
  // New-Item + -ItemType File can appear in any argument order
  if (/\bNew-Item\b/i.test(cmd) && /-ItemType\s+File\b/i.test(cmd)) return true;
  return [...UNIX_PATTERNS, ...POWERSHELL_PATTERNS, ...DESTRUCTIVE_PATTERNS].some((re) =>
    re.test(cmd)
  );
}

/**
 * True for destructive/deleting shell commands (rm/del/Remove-Item/ri family).
 * Applied UNIVERSALLY when agent identity cannot be resolved. Exported for tests.
 */
export function isDestructive(command) {
  const cmd = String(command ?? "");
  if (!cmd) return false;
  return DESTRUCTIVE_PATTERNS.some((re) => re.test(cmd));
}

/**
 * Echo gate predicate (v3.1): true only when a Task prompt declares
 * `gate:echo-confirmed` or `gate:research-exempt`. Fail-closed —
 * undefined/empty/marker-less prompts are all rejected. Exported for tests.
 */
export function taskGateOk(prompt) {
  return GATE_RE.test(String(prompt ?? ""));
}

/**
 * Resolve the agent handling a session via the SDK client (defect 4 fix):
 * client.session.messages({sessionID}) -> [{ info: Message }] where UserMessage
 * carries `.agent`. Falls back to AssistantMessage.mode. Returns null when the
 * client/sessionID is missing or the lookup fails (identity unknown).
 */
async function resolveAgent(client, sessionID) {
  try {
    const messages = client?.session?.messages;
    if (typeof messages !== "function" || !sessionID) return null;
    const res = await messages.call(client.session, { sessionID });
    const rows = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : null;
    if (!rows) return null;
    for (let i = rows.length - 1; i >= 0; i--) {
      const info = rows[i]?.info;
      if (info?.role === "user" && typeof info.agent === "string" && info.agent) return info.agent;
    }
    for (let i = rows.length - 1; i >= 0; i--) {
      const info = rows[i]?.info;
      if (info?.role === "assistant" && typeof info.mode === "string" && info.mode) return info.mode;
    }
    return null;
  } catch {
    return null; // identity unknown — fail-open for conductor-only rules, never for gates below
  }
}

/** Official plugin entry (opencode contract since 0.x): returns a Hooks object. */
// B-1: SDK Project (≠ repo/vault/instance) — `project` is opencode SDK's project handle, distinct from REPO_ROOT/vault root/instance root
export default async function forceDelegation({ project, client, $, directory, worktree } = {}) {
  return {
    "tool.execute.before": async (input, output) => {
      const tool = String(input?.tool ?? "").toLowerCase();

      // 1) Echo gate — ALL agents, no identity needed, FAIL-CLOSED.
      //    Applies to nested Task dispatch too (P1-4: worker -> sub-worker bypass).
      if (tool === "task") {
        const prompt = output?.args?.prompt;
        if (!taskGateOk(prompt)) {
          throw new Error(
            "Echo gate not satisfied: Task prompt must declare `gate:echo-confirmed` (user confirmed intent summary) or `gate:research-exempt` (research-only). See skills/interpreter/SKILL.md Flow step 2."
          );
        }
        return;
      }

      // 2) Identity-scoped guards need session identity first.
      if (!["write", "edit", "patch", "bash", "shell"].includes(tool)) return;

      const cmd = String(output?.args?.command ?? "");
      const agent = await resolveAgent(client, input?.sessionID);

      if (agent === null) {
        // Identity unknown: block destructive commands for everyone (fail-closed),
        // leave other checks to Layer 1 config permission (conductor edit/write deny).
        if ((tool === "bash" || tool === "shell") && isDestructive(cmd)) {
          throw new Error(
            `Blocked: destructive command detected (agent identity unresolved, universal rule). Delegate file mutation via Task->interpreter. Command: ${cmd.slice(0, 80)}`
          );
        }
        return;
      }
      if (!CONDUCTOR_RE.test(agent)) return; // workers may mutate through their own tools

      // 3) Conductor guard: no direct file mutation tools...
      if (["write", "edit", "patch"].includes(tool)) {
        throw new Error(
          `Blocked: conductor cannot use '${tool}' directly. Use Task tool with subagent_type="interpreter" or "verify" instead. See AGENTS.md Rules 1/5.`
        );
      }
      // ...and no shell-side writes either.
      if ((tool === "bash" || tool === "shell") && isBlocked(cmd)) {
        throw new Error(
          `Blocked: shell write detected. Conductor must not write via shell. Use Task->interpreter instead. Command: ${cmd.slice(0, 80)}`
        );
      }
    },
  };
}
