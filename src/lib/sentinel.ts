import { readFileSync } from "node:fs";
import { join } from "node:path";
import { exec } from "./exec.js";
import type { SentinelFinding, SentinelResult, SentinelSeverity } from "./types.js";

const EMPTY_RESULT: SentinelResult = {
  score: null,
  findings: [],
  critical: 0,
  high: 0,
  medium: 0,
  low: 0,
};

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

export function parseSentinelStdout(output: string): SentinelResult {
  // Strip ANSI escape codes before parsing
  const clean = output.replace(/\x1b\[[0-9;]*m/g, "");

  // Parse: SECURITY SCORE: 0 / 100 [CRITICAL RISK]
  const scoreMatch = clean.match(/SECURITY SCORE:\s*(\d+)\s*\/\s*100/);
  const score = scoreMatch ? parseInt(scoreMatch[1]!, 10) : null;

  // Parse: 1300 findings: 372 critical · 923 high · 5 medium · 0 low
  let critical = 0;
  let high = 0;
  let medium = 0;
  let low = 0;

  const countsMatch = clean.match(
    /(\d+)\s+findings?:\s*(\d+)\s+critical\s*·\s*(\d+)\s+high\s*·\s*(\d+)\s+medium\s*·\s*(\d+)\s+low/
  );
  if (countsMatch) {
    critical = parseInt(countsMatch[2]!, 10);
    high = parseInt(countsMatch[3]!, 10);
    medium = parseInt(countsMatch[4]!, 10);
    low = parseInt(countsMatch[5]!, 10);
  }

  return { score, findings: [], critical, high, medium, low };
}

export function runSentinel(dir: string): SentinelResult {
  if (!detectSentinel()) {
    process.stderr.write(
      "Warning: Sentinel not found, skipping security scan\n"
    );
    return { ...EMPTY_RESULT };
  }

  let stdout = "";
  try {
    stdout = exec(`npx clawstack-sentinel --path "${dir}"`, {
      timeout: 120000,
      stdio: "pipe",
    });
  } catch (err: unknown) {
    // Sentinel may exit non-zero on critical findings but still print results
    if (err && typeof err === "object" && "stdout" in err) {
      stdout = String((err as { stdout: unknown }).stdout);
    }
    if (!stdout) {
      process.stderr.write(
        "Warning: Sentinel execution failed, skipping security scan\n"
      );
      return { ...EMPTY_RESULT };
    }
  }

  // Primary: parse stdout directly
  const result = parseSentinelStdout(stdout);
  if (result.score !== null) {
    return result;
  }

  // Fallback: try reading report from CWD (where Sentinel writes it)
  const cwdReport = join(process.cwd(), "sentinel-report.md");
  const fallback = parseSentinelReport(cwdReport);
  if (fallback.score !== null) {
    return fallback;
  }

  // Last resort: try scanned dir
  return parseSentinelReport(join(dir, "sentinel-report.md"));
}

export function parseSentinelReport(reportPath: string): SentinelResult {
  let content: string;
  try {
    content = readFileSync(reportPath, "utf-8");
  } catch {
    return { ...EMPTY_RESULT };
  }

  // Match both formats:
  // "**Score: 72/100**"  (old fixture format)
  // "## Security Score: 0 / 100 — CRITICAL RISK"  (real Sentinel)
  const scoreMatch = content.match(/Score:\s*(\d+)\s*\/\s*100/);
  const score = scoreMatch ? parseInt(scoreMatch[1]!, 10) : null;

  const findings: SentinelFinding[] = [];
  let currentSeverity: SentinelSeverity | null = null;

  for (const line of content.split("\n")) {
    const headingMatch = line.match(/^###\s+(\w+)/);
    if (headingMatch) {
      const h = headingMatch[1]!.toLowerCase();
      if (h === "critical" || h === "high" || h === "medium" || h === "low") {
        currentSeverity = h;
      } else if (h === "warning") {
        currentSeverity = "high";
      } else if (h === "info") {
        currentSeverity = "low";
      } else {
        currentSeverity = null;
      }
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
    high: findings.filter((f) => f.severity === "high").length,
    medium: findings.filter((f) => f.severity === "medium").length,
    low: findings.filter((f) => f.severity === "low").length,
  };
}
