import { describe, it, mock, afterEach } from "node:test";
import assert from "node:assert/strict";
import { setExecFn, resetExecFn } from "../src/lib/exec.js";
import { prCommand } from "../src/commands/pr.js";

function setupMockExec(): void {
  setExecFn((cmd: string) => {
    if (cmd.includes("rev-parse")) return "abc123\n";
    if (cmd.includes("gh --version")) return "gh version 2.0.0";
    if (cmd.includes("gh auth status")) return "Logged in";
    if (cmd.includes("git log"))
      return "abc123 First commit\ndef456 Second commit\n";
    if (cmd.includes("git diff"))
      return " src/index.ts | 10 ++++++++++\n 1 file changed, 10 insertions(+)\n";
    if (cmd.includes("clawstack-sentinel")) throw new Error("not found");
    if (cmd.includes("gh pr create"))
      return "https://github.com/test/repo/pull/1";
    return "";
  });
}

describe("pr command", () => {
  afterEach(() => {
    resetExecFn();
    mock.restoreAll();
  });

  it("--dry-run prints body and does not call gh pr create", () => {
    const calledCmds: string[] = [];
    setExecFn((cmd: string) => {
      calledCmds.push(cmd);
      if (cmd.includes("rev-parse")) return "abc123\n";
      if (cmd.includes("gh --version")) return "gh version 2.0.0";
      if (cmd.includes("gh auth status")) return "Logged in";
      if (cmd.includes("git log"))
        return "abc123 First commit\ndef456 Second commit\n";
      if (cmd.includes("git diff"))
        return " src/index.ts | 10 ++++++++++\n 1 file changed\n";
      if (cmd.includes("clawstack-sentinel")) throw new Error("not found");
      return "";
    });

    const logs: string[] = [];
    mock.method(console, "log", (msg: string) => logs.push(msg));
    mock.method(console, "error", () => {});
    mock.method(process.stderr, "write", () => true);

    prCommand("test/repo", {
      branch: "feature-branch",
      dryRun: true,
    });

    const output = logs.join("\n");
    assert.ok(output.includes("## ClawPR Report"));
    assert.ok(output.includes("### Changes"));

    const prCreateCalls = calledCmds.filter((c) => c.includes("gh pr create"));
    assert.equal(
      prCreateCalls.length,
      0,
      "gh pr create should not be called in dry-run"
    );
  });

  it("PR body contains sentinel badge", () => {
    setupMockExec();
    const logs: string[] = [];
    mock.method(console, "log", (msg: string) => logs.push(msg));
    mock.method(console, "error", () => {});
    mock.method(process.stderr, "write", () => true);

    prCommand("test/repo", {
      branch: "feature-branch",
      dryRun: true,
    });

    const output = logs.join("\n");
    assert.ok(output.includes("Sentinel:"));
  });

  it("PR body contains commit list", () => {
    setupMockExec();
    const logs: string[] = [];
    mock.method(console, "log", (msg: string) => logs.push(msg));
    mock.method(console, "error", () => {});
    mock.method(process.stderr, "write", () => true);

    prCommand("test/repo", {
      branch: "feature-branch",
      dryRun: true,
    });

    const output = logs.join("\n");
    assert.ok(output.includes("- abc123 First commit"));
  });

  it("missing --branch exits with error", () => {
    setupMockExec();
    const errors: string[] = [];
    mock.method(console, "error", (msg: string) => errors.push(msg));

    const origExit = process.exit;
    let exitCalled = false;
    process.exit = (() => {
      exitCalled = true;
      throw new Error("exit");
    }) as never;

    try {
      prCommand("test/repo", {
        branch: "",
        dryRun: false,
      });
    } catch {
      // expected
    }

    process.exit = origExit;
    assert.ok(exitCalled);
  });
});
