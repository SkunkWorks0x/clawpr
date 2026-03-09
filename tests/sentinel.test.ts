import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parseSentinelReport } from "../src/lib/sentinel.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureReport = join(__dirname, "fixtures", "sentinel-report.md");

describe("sentinel module", () => {
  it("parseSentinelReport parses score correctly", () => {
    const result = parseSentinelReport(fixtureReport);
    assert.equal(result.score, 72);
  });

  it("parseSentinelReport counts findings by severity", () => {
    const result = parseSentinelReport(fixtureReport);
    assert.equal(result.critical, 2);
    assert.equal(result.warning, 3);
    assert.equal(result.info, 1);
    assert.equal(result.findings.length, 6);
  });

  it("parseSentinelReport returns null score for missing file", () => {
    const result = parseSentinelReport("/nonexistent/report.md");
    assert.equal(result.score, null);
    assert.equal(result.findings.length, 0);
  });

  it("parseSentinelReport extracts finding codes", () => {
    const result = parseSentinelReport(fixtureReport);
    const codes = result.findings.map((f) => f.code);
    assert.ok(codes.includes("CRED-001"));
    assert.ok(codes.includes("CRED-002"));
    assert.ok(codes.includes("PERM-001"));
    assert.ok(codes.includes("HYG-001"));
  });

  it("parseSentinelReport returns empty result for empty report", async () => {
    // Create a temp file with no sentinel data
    const { writeFileSync, unlinkSync } = await import("node:fs");
    const tmpPath = join(__dirname, "fixtures", "empty-report.md");
    writeFileSync(tmpPath, "# Some report\nNo score here\n");
    const result = parseSentinelReport(tmpPath);
    assert.equal(result.score, null);
    assert.equal(result.findings.length, 0);
    unlinkSync(tmpPath);
  });

  it("parseSentinelReport correctly categorizes severity", () => {
    const result = parseSentinelReport(fixtureReport);
    const criticals = result.findings.filter((f) => f.severity === "critical");
    const warnings = result.findings.filter((f) => f.severity === "warning");
    const infos = result.findings.filter((f) => f.severity === "info");
    assert.equal(criticals.length, 2);
    assert.equal(warnings.length, 3);
    assert.equal(infos.length, 1);
  });
});
