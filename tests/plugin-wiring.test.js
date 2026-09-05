import { test } from "node:test";
import assert from "node:assert/strict";
import forceDelegation from "../plugins/force-delegation.js";

/**
 * Wiring smoke test (P1-8).
 *
 * v3.1 shipped a guard whose default export had signature `setup({ on })` —
 * a contract that does not exist in the official plugin API. The loader threw
 * "on is not a function", absorbed the failure, and the hook NEVER registered:
 * unit tests kept passing against the exported pure functions while the
 * runtime enforcement was silently dead ("green tests, dead guard").
 *
 * This suite asserts the WIRING itself: import module -> call default export
 * with a mock plugin context -> assert the returned hooks object exposes a
 * callable `tool.execute.before` -> drive it with mock (input, output) pairs.
 */

/** SDK client stub resolving a session whose agent is `conductor`. */
function conductorClient() {
  return {
    session: {
      messages: async () => ({
        data: [{ info: { role: "user", agent: "conductor" }, parts: [] }],
      }),
    },
  };
}

const HOOK_INPUT = { sessionID: "ses_test", callID: "call_test" };

test("default export returns hooks with callable tool.execute.before (wiring)", async () => {
  const hooks = await forceDelegation({
    project: {},
    client: {},
    $: {},
    directory: "",
    worktree: "",
  });
  assert.equal(typeof hooks, "object");
  assert.equal(typeof hooks["tool.execute.before"], "function");
});

test("write tool blocked for conductor, read passes (output.args path)", async () => {
  const hooks = await forceDelegation({
    project: {},
    client: conductorClient(),
    $: {},
    directory: "",
    worktree: "",
  });
  await assert.rejects(
    () =>
      hooks["tool.execute.before"](
        { ...HOOK_INPUT, tool: "write" },
        { args: { filePath: "x.txt", content: "x" } }
      ),
    /conductor cannot use 'write'/
  );
  // must resolve without throwing
  await hooks["tool.execute.before"]({ ...HOOK_INPUT, tool: "read" }, { args: { filePath: "README.md" } });
});

test("Task gate universal + fail-closed even with an empty client (no identity needed)", async () => {
  const hooks = await forceDelegation({
    project: {},
    client: {},
    $: {},
    directory: "",
    worktree: "",
  });
  await assert.rejects(
    () =>
      hooks["tool.execute.before"]({ ...HOOK_INPUT, tool: "task" }, { args: { prompt: "no marker here" } }),
    /Echo gate not satisfied/
  );
  await hooks["tool.execute.before"](
    { ...HOOK_INPUT, tool: "task" },
    { args: { prompt: "gate:research-exempt research vault policy" } }
  );
});

test("destructive bash blocked universally when identity unresolved; reads pass", async () => {
  const hooks = await forceDelegation({
    project: {},
    client: {},
    $: {},
    directory: "",
    worktree: "",
  });
  await assert.rejects(
    () => hooks["tool.execute.before"]({ ...HOOK_INPUT, tool: "bash" }, { args: { command: "rm -rf build" } }),
    /destructive command/
  );
  await hooks["tool.execute.before"]({ ...HOOK_INPUT, tool: "bash" }, { args: { command: "git status" } });
});
