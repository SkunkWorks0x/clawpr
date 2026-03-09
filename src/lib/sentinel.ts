import { readFileSync } from "node:fs";
import { join } from "node:path";
import { exec } from "./exec.js";
import type { SentinelFinding, SentinelResult } from "./types.js";

export function detectSentinel(): boolean {
  try {
    exec("npx clawstack-sentinel --help", {
      timeout: 15000,
      stdio: "pipe",
    });
    return true;
  } catch {
    return false;
  }
}

export function runSentinel(dir: string): SentinelResult {
  const empty: SentinelResult = {
    score: null,
    findings: [],
    critical: 0,
    warning: 0,
    info: 0,
  };

  if (!detectSentinel()) {
    process.stderr.write(
      "Warning: Sentinel not found, skipping security scan\n"
    );
    return empty;
  }

  try {
    exec(`npx clawstack-sentinel --path "${dir}"`, {
      timeout: 60000,
      stdio: "pipe",
    });
  } catch {
    process.stderr.write(
      "Warning: Sentinel execution failed, skipping security scan\n"
    );
    return empty;
  }

  return parseSentinelReport(join(dir, "sentinel-report.md"));
}

export function parseSentinelReport(reportPath: string): SentinelResult {
  const empty: SentinelResult = {
    score: null,
    findings: [],
    critical: 0,
    warning: 0,
    info: 0,
  };

  let content: string;
  try {
    content = readFileSync(reportPath, "utf-8");
  } catch {
    return empty;
  }

  const scoreMatch = content.match(/Score:\s*(\d+)\/100/);
  const score = scoreMatch ? parseInt(scoreMatch[1]!, 10) : null;

  const findings: SentinelFinding[] = [];
  let currentSeverity: "critical" | "warning" | "info" | null = null;

  for (const line of content.split("\n")) {
    const headingMatch = line.match(/^###\s+(\w+)/);
    if (headingMatch) {
      const h = headingMatch[1]!.toLowerCase();
      if (h === "critical") currentSeverity = "critical";
      else if (h === "warning") currentSeverity = "warning";
      else if (h === "info") currentSeverity = "info";
      else currentSeverity = null;
      continue;
    }

    if (currentSeverity && line.match(/^- \[/)) {
      const findingMatch = line.match(/^- \[([A-Z]+-\d+)\]\s*(.*)/);
      if (findingMatch) {
        findings.push({
          code: findingMatch[1]!,
          description: findingMatch[2]!,
          severity: currentSeverity,
        });
      }
    }
  }

  return {
    score,
    findings,
    critical: findings.filter((f) => f.severity === "critical").length,
    warning: findings.filter((f) => f.severity === "warning").length,
    info: findings.filter((f) => f.severity === "info").length,
  };
}
