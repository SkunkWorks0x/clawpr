import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import {
  checkGhInstalled,
  checkGhAuth,
  fetchIssues,
  fetchPullRequests,
  fetchOpenCount,
} from "../lib/github.js";
import { runSentinel } from "../lib/sentinel.js";
import { classifyEffort, hasSecurityFlag } from "../lib/classifier.js";
import { formatTable } from "../lib/formatter.js";
import type { ClassifiedItem, ScanResult } from "../lib/types.js";

interface ScanOptions {
  limit: string;
  type: string;
  label?: string;
  json: boolean;
}

function findLocalRepoDir(owner: string, repo: string): string | null {
  const candidates = [
    join(process.cwd(), repo),
    join(process.cwd(), `${owner}-${repo}`),
    join(homedir(), repo),
    join(homedir(), `${owner}-${repo}`),
    join("/tmp", repo),
    join("/tmp", `${owner}-${repo}`),
    join("/tmp", "clawpr", `${owner}-${repo}`),
  ];

  for (const dir of candidates) {
    if (existsSync(join(dir, ".git"))) {
      return dir;
    }
  }

  return null;
}

export function scanCommand(repoArg: string, options: ScanOptions): void {
  const parts = repoArg.split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    console.error("Error: Invalid repo format. Use owner/repo");
    process.exit(1);
  }

  const [owner, repo] = parts as [string, string];
  const limit = parseInt(options.limit, 10);

  checkGhInstalled();
  checkGhAuth();

  let items: ClassifiedItem[] = [];
  let totalOpen = 0;

  if (options.type === "issue" || options.type === "all") {
    const issues = fetchIssues(owner, repo, limit, options.label);
    totalOpen += fetchOpenCount(owner, repo, "issue");
    for (const issue of issues) {
      items.push({
        number: issue.number,
        type: "issue",
        title: issue.title,
        effort: classifyEffort(issue.title, issue.body ?? ""),
        security: hasSecurityFlag(issue.labels, 0),
        labels: issue.labels,
        url: `https://github.com/${owner}/${repo}/issues/${issue.number}`,
      });
    }
  }

  if (options.type === "pr" || options.type === "all") {
    const prs = fetchPullRequests(owner, repo, limit, options.label);
    totalOpen += fetchOpenCount(owner, repo, "pr");
    for (const pr of prs) {
      items.push({
        number: pr.number,
        type: "pr",
        title: pr.title,
        effort: classifyEffort(pr.title, pr.body ?? ""),
        security: hasSecurityFlag(pr.labels, 0),
        labels: pr.labels,
        url: `https://github.com/${owner}/${repo}/pulls/${pr.number}`,
      });
    }
  }

  items = items.slice(0, limit);
  const scanned = items.length;

  // Run sentinel against a local clone if one exists
  let sentinel = {
    score: null as number | null,
    findings: [] as {
      code: string;
      description: string;
      severity: "critical" | "warning" | "info";
    }[],
    critical: 0,
    warning: 0,
    info: 0,
  };

  const localDir = findLocalRepoDir(owner, repo);
  if (localDir) {
    process.stderr.write(`Sentinel: scanning ${localDir}\n`);
    sentinel = runSentinel(localDir);
  } else {
    process.stderr.write(
      `Sentinel: no local clone found for ${owner}/${repo}, skipping security scan\n`
    );
  }

  // Update security flags based on sentinel findings
  if (sentinel.critical > 0) {
    for (const item of items) {
      if (hasSecurityFlag(item.labels, sentinel.critical)) {
        item.security = true;
      }
    }
  }

  if (options.json) {
    const result: ScanResult = {
      repo: repoArg,
      items,
      sentinel,
      scanned,
      total_open: totalOpen,
    };
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatTable(repoArg, items, sentinel, scanned, totalOpen));
  }
}
