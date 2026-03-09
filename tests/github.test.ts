import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  fetchIssues,
  fetchPullRequests,
  createPR,
} from "../src/lib/github.js";
import { setExecFn, resetExecFn } from "../src/lib/exec.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const issuesFixture = readFileSync(
  join(__dirname, "fixtures", "gh-issues.json"),
  "utf-8"
);

describe("github module", () => {
  afterEach(() => {
    resetExecFn();
  });

  it("fetchIssues returns correctly typed array", () => {
    const issues = JSON.parse(issuesFixture) as Array<Record<string, unknown>>;
    const jqOutput = issues.map((i) => JSON.stringify(i)).join("\n");

    setExecFn((cmd: string) => {
      if (cmd.includes("repos/") && cmd.includes("issues")) return jqOutput;
      return "";
    });

    const result = fetchIssues("test", "repo", 10);
    assert.equal(result.length, 5);
    assert.equal(result[0]!.number, 1);
    assert.equal(result[0]!.title, "Typo in README");
    assert.deepEqual(result[0]!.labels, ["documentation"]);
  });

  it("fetchIssues with label filters correctly", () => {
    let capturedCmd = "";
    const issues = JSON.parse(issuesFixture) as Array<Record<string, unknown>>;
    const jqOutput = issues.map((i) => JSON.stringify(i)).join("\n");

    setExecFn((cmd: string) => {
      capturedCmd = cmd;
      if (cmd.includes("issues")) return jqOutput;
      return "";
    });

    fetchIssues("test", "repo", 10, "bug");
    assert.ok(capturedCmd.includes("labels=bug"));
  });

  it("fetchIssues handles gh failure without crashing", () => {
    setExecFn(() => {
      throw new Error("Not Found (HTTP 404)");
    });

    const origExit = process.exit;
    let exitCalled = false;
    process.exit = (() => {
      exitCalled = true;
      throw new Error("exit");
    }) as never;

    try {
      fetchIssues("bad", "repo", 10);
    } catch {
      // expected
    }

    process.exit = origExit;
    assert.ok(exitCalled);
  });

  it("createPR spawns correct gh command", () => {
    let capturedCmd = "";
    setExecFn((cmd: string) => {
      capturedCmd = cmd;
      if (cmd.includes("gh pr create"))
        return "https://github.com/test/repo/pull/1";
      return "";
    });

    const url = createPR(
      "test",
      "repo",
      "feature-branch",
      "Test PR",
      "Body text"
    );
    assert.equal(url, "https://github.com/test/repo/pull/1");
    assert.ok(capturedCmd.includes("--repo"));
    assert.ok(capturedCmd.includes("--head"));
    assert.ok(capturedCmd.includes("feature-branch"));
  });
});
