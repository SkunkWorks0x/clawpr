import { describe, it, mock, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { setExecFn, resetExecFn } from "../src/lib/exec.js";
import { scanCommand } from "../src/commands/scan.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const issuesFixture = readFileSync(
  join(__dirname, "fixtures", "gh-issues.json"),
  "utf-8"
);
const prsFixture = readFileSync(
  join(__dirname, "fixtures", "gh-prs.json"),
  "utf-8"
);

function setupMockExec(): void {
  const issues = JSON.parse(issuesFixture) as Array<Record<string, unknown>>;
  const prs = JSON.parse(prsFixture) as Array<Record<string, unknown>>;
  const issueJq = issues.map((i) => JSON.stringify(i)).join("\n");
  const prJq = prs.map((p) => JSON.stringify(p)).join("\n");

  setExecFn((cmd: string) => {
    if (cmd.includes("gh --version")) return "gh version 2.0.0";
    if (cmd.includes("gh auth status")) return "Logged in";
    if (cmd.includes("search/issues") && cmd.includes("type%3Aissue"))
      return "42";
    if (cmd.includes("search/issues") && cmd.includes("type%3Apr"))
      return "17";
    if (cmd.includes("/issues")) return issueJq;
    if (cmd.includes("/pulls")) return prJq;
    if (cmd.includes("clawstack-sentinel")) throw new Error("not found");
    return "";
  });
}

describe("scan command", () => {
  afterEach(() => {
    resetExecFn();
    mock.restoreAll();
  });

  it("produces table output with items", () => {
    setupMockExec();
    const logs: string[] = [];
    mock.method(console, "log", (msg: string) => logs.push(msg));
    mock.method(console, "error", () => {});
    mock.method(process.stderr, "write", () => true);

    scanCommand("test/repo", {
      limit: "10",
      type: "all",
      json: false,
    });

    const output = logs.join("\n");
    assert.ok(output.includes("ClawPR Scan: test/repo"));
    assert.ok(output.includes("Items scanned:"));
  });

  it("--json flag produces valid JSON with total_open from API", () => {
    setupMockExec();
    const logs: string[] = [];
    mock.method(console, "log", (msg: string) => logs.push(msg));
    mock.method(console, "error", () => {});
    mock.method(process.stderr, "write", () => true);

    scanCommand("test/repo", {
      limit: "10",
      type: "all",
      json: true,
    });

    const output = logs.join("\n");
    const parsed = JSON.parse(output);
    assert.equal(parsed.repo, "test/repo");
    assert.ok(Array.isArray(parsed.items));
    assert.ok(typeof parsed.sentinel === "object");
    assert.equal(parsed.total_open, 59);
  });

  it("--limit restricts output count", () => {
    setupMockExec();
    const logs: string[] = [];
    mock.method(console, "log", (msg: string) => logs.push(msg));
    mock.method(console, "error", () => {});
    mock.method(process.stderr, "write", () => true);

    scanCommand("test/repo", {
      limit: "2",
      type: "all",
      json: true,
    });

    const output = logs.join("\n");
    const parsed = JSON.parse(output);
    assert.equal(parsed.items.length, 2);
    assert.equal(parsed.scanned, 2);
  });

  it("scan with sentinel unavailable still produces output", () => {
    setupMockExec();
    const logs: string[] = [];
    mock.method(console, "log", (msg: string) => logs.push(msg));
    mock.method(console, "error", () => {});
    mock.method(process.stderr, "write", () => true);

    scanCommand("test/repo", {
      limit: "5",
      type: "issue",
      json: true,
    });

    const output = logs.join("\n");
    const parsed = JSON.parse(output);
    assert.equal(parsed.sentinel.score, null);
    assert.ok(parsed.items.length > 0);
  });
});
