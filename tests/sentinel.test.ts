import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseSentinelReport, parseSentinelStdout } from "../src/lib/sentinel.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureReport = join(__dirname, "fixtures", "sentinel-report.md");

describe("parseSentinelReport", () => {
  it("parses score correctly", () => {
    const result = parseSentinelReport(fixtureReport);
    assert.equal(result.score, 72);
  });

  it("counts findings by severity", () => {
    const result = parseSentinelReport(fixtureReport);
    assert.equal(result.critical, 2);
    assert.equal(result.high, 3);
    assert.equal(result.low, 1);
    assert.equal(result.findings.length, 6);
  });

  it("returns null score for missing file", () => {
    const result = parseSentinelReport("/nonexistent/report.md");
    assert.equal(result.score, null);
    assert.equal(result.findings.length, 0);
  });

  it("extracts finding codes", () => {
    const result = parseSentinelReport(fixtureReport);
    const codes = result.findings.map((f) => f.code);
    assert.ok(codes.includes("CRED-001"));
    assert.ok(codes.includes("CRED-002"));
    assert.ok(codes.includes("PERM-001"));
    assert.ok(codes.includes("HYG-001"));
  });

  it("returns empty result for empty report", async () => {
    const { writeFileSync, unlinkSync } = await import("node:fs");
    const tmpPath = join(__dirname, "fixtures", "empty-report.md");
    writeFileSync(tmpPath, "# Some report\nNo score here\n");
    const result = parseSentinelReport(tmpPath);
    assert.equal(result.score, null);
    assert.equal(result.findings.length, 0);
    unlinkSync(tmpPath);
  });

  it("maps Warning heading to high severity", () => {
    const result = parseSentinelReport(fixtureReport);
    const highs = result.findings.filter((f) => f.severity === "high");
    assert.equal(highs.length, 3);
  });

  it("maps Info heading to low severity", () => {
    const result = parseSentinelReport(fixtureReport);
    const lows = result.findings.filter((f) => f.severity === "low");
    assert.equal(lows.length, 1);
  });
});

describe("parseSentinelStdout", () => {
  it("parses score from stdout", () => {
    const output = `
  SECURITY SCORE: 0 / 100 [CRITICAL RISK]
  1300 findings: 372 critical · 923 high · 5 medium · 0 low
`;
    const result = parseSentinelStdout(output);
    assert.equal(result.score, 0);
    assert.equal(result.critical, 372);
    assert.equal(result.high, 923);
    assert.equal(result.medium, 5);
    assert.equal(result.low, 0);
  });

  it("parses clean score from stdout", () => {
    const output = `
  SECURITY SCORE: 95 / 100 [LOW RISK]
  2 findings: 0 critical · 0 high · 1 medium · 1 low
`;
    const result = parseSentinelStdout(output);
    assert.equal(result.score, 95);
    assert.equal(result.critical, 0);
    assert.equal(result.high, 0);
    assert.equal(result.medium, 1);
    assert.equal(result.low, 1);
  });

  it("returns null score for empty output", () => {
    const result = parseSentinelStdout("");
    assert.equal(result.score, null);
    assert.equal(result.critical, 0);
  });
});
