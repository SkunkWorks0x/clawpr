import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { classifyEffort, hasSecurityFlag } from "../src/lib/classifier.js";

describe("classifyEffort", () => {
  it("classifies typo in README as low effort", () => {
    assert.equal(classifyEffort("Typo in README", ""), "low");
  });

  it("classifies docs title as low effort", () => {
    assert.equal(classifyEffort("Update documentation", ""), "low");
  });

  it("classifies fix null pointer as medium effort", () => {
    assert.equal(
      classifyEffort("Fix null pointer in auth handler", ""),
      "medium"
    );
  });

  it("classifies bug in body as medium effort", () => {
    assert.equal(
      classifyEffort("Issue with login", "There is a bug in the auth flow"),
      "medium"
    );
  });

  it("classifies rewrite as high effort", () => {
    assert.equal(classifyEffort("Rewrite plugin architecture", ""), "high");
  });

  it("classifies no keyword match as high effort", () => {
    assert.equal(
      classifyEffort("Implement new feature", "Build something entirely new"),
      "high"
    );
  });
});

describe("hasSecurityFlag", () => {
  it("returns true for security label", () => {
    assert.equal(hasSecurityFlag(["security", "bug"], 0), true);
  });

  it("returns true for vulnerability label", () => {
    assert.equal(hasSecurityFlag(["vulnerability"], 0), true);
  });

  it("returns true for CVE label", () => {
    assert.equal(hasSecurityFlag(["CVE-2026-1234"], 0), true);
  });

  it("returns true when critical findings exist", () => {
    assert.equal(hasSecurityFlag(["bug"], 2), true);
  });

  it("returns false with no security indicators", () => {
    assert.equal(hasSecurityFlag(["bug", "enhancement"], 0), false);
  });
});
