import type { EffortLevel } from "./types.js";

const LOW_KEYWORDS = [
  "typo",
  "typos",
  "spelling",
  "readme",
  "docs",
  "documentation",
  "comment",
  "whitespace",
  "formatting",
  "lint",
  "style",
];

const MEDIUM_KEYWORDS = [
  "bug",
  "fix",
  "error",
  "warning",
  "deprecat",
  "update",
  "upgrade",
  "refactor",
  "test",
];

export function classifyEffort(title: string, body: string): EffortLevel {
  const text = `${title} ${body}`.toLowerCase();

  for (const kw of LOW_KEYWORDS) {
    if (text.includes(kw)) return "low";
  }

  for (const kw of MEDIUM_KEYWORDS) {
    if (text.includes(kw)) return "medium";
  }

  return "high";
}

export function hasSecurityFlag(
  labels: string[],
  criticalFindings: number
): boolean {
  const securityLabels = labels.some((l) => {
    const lower = l.toLowerCase();
    return (
      lower.includes("security") ||
      lower.includes("vulnerability") ||
      lower.includes("cve")
    );
  });
  return securityLabels || criticalFindings > 0;
}
