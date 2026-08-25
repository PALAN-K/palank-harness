/**
 * Force-delegation hook — 2nd layer of 3-layer forced subagent guard
 * Layer 1: opencode.json permission (edit/write deny on conductor) — prompt-level
 * Layer 2: this hook — runtime hard block, model-agnostic (even open-weight that ignores prompt)
 * Layer 3: AGENTS.md front-loaded prompt — few-shot examples
 *
 * Blocks any direct write/edit/bash-redirect from conductor, forces Task delegation.
 */

export default async function setup({ on }) {
  on("tool.execute.before", async (input, ctx) => {
    const agent = ctx?.agent?.id || ctx?.agent || "";
    const tool = input?.tool || input?.name || "";
    // Only enforce on conductor (primary)
    if (agent !== "conductor" && agent !== "main" && !String(agent).includes("conductor")) return;

    // Block direct file mutation
    if (["write", "edit", "patch"].includes(tool)) {
      throw new Error(
        `Blocked: conductor cannot use '${tool}' directly. Use Task tool with subagent_type="interpreter" or "verify" instead. See AGENTS.md:1.`
      );
    }
    // Block bash redirects that would write files via shell
    if (tool === "bash" || tool === "shell") {
      const cmd = (input?.args?.command || input?.input || "").toString();
      const redirectRe = /(^|\s)(>|>>|tee\s|sed\s+-i|heredoc|python\s+-c\s+.*open\(.*\.write)/;
      if (redirectRe.test(cmd)) {
        throw new Error(
          `Blocked: bash redirect detected. Conductor must not write via shell. Use Task→interpreter instead. Command: ${cmd.slice(0, 80)}`
        );
      }
    }
  });
}
