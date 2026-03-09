import { exec } from "./exec.js";
import type { GHIssue, GHPullRequest } from "./types.js";

// Re-export for test convenience
export { setExecFn, resetExecFn } from "./exec.js";

const GH_EXEC_OPTS = {
  timeout: 30000,
  stdio: ["pipe", "pipe", "pipe"] as const,
};

export function checkGhInstalled(): void {
  try {
    exec("gh --version", { stdio: "pipe" });
  } catch {
    console.error(
      "Error: GitHub CLI (gh) is required. Install: https://cli.github.com"
    );
    process.exit(1);
  }
}

export function checkGhAuth(): void {
  try {
    exec("gh auth status", { stdio: "pipe" });
  } catch {
    console.error("Error: Run `gh auth login` first");
    process.exit(1);
  }
}

function handleGhError(err: unknown, owner: string, repo: string, resource: string): never {
  const msg =
    err instanceof Error ? err.message : "Failed to fetch from GitHub API";
  if (msg.includes("ENOBUFS") || msg.includes("maxBuffer")) {
    console.error(
      `Error: GitHub API response too large for ${owner}/${repo} ${resource}. Try a smaller --limit or --label.`
    );
    process.exit(1);
  }
  if (msg.includes("ETIMEDOUT") || msg.includes("timed out")) {
    console.error(
      `Error: GitHub API request timed out for ${owner}/${repo} ${resource}. Try a smaller --limit or --label.`
    );
    process.exit(1);
  }
  if (msg.includes("Not Found") || msg.includes("404")) {
    console.error(
      `Error: Repository ${owner}/${repo} not found or not accessible`
    );
    process.exit(1);
  }
  console.error(`Error: Failed to fetch from GitHub API\n${msg}`);
  process.exit(1);
}

export function fetchIssues(
  owner: string,
  repo: string,
  limit: number,
  label?: string
): GHIssue[] {
  try {
    const jqFilter = `.[] | {number, title, labels: [.labels[].name], state, created_at, body}`;
    const params = new URLSearchParams({
      state: "open",
      per_page: String(Math.min(limit, 100)),
    });
    if (label) {
      params.set("labels", label);
    }
    const cmd = `gh api "repos/${owner}/${repo}/issues?${params.toString()}" -q '${jqFilter}'`;
    const raw = exec(cmd, GH_EXEC_OPTS);
    if (!raw.trim()) return [];
    const lines = raw.trim().split("\n");
    const jsonStr = "[" + lines.join(",") + "]";
    return JSON.parse(jsonStr) as GHIssue[];
  } catch (err) {
    handleGhError(err, owner, repo, "issues");
  }
}

export function fetchPullRequests(
  owner: string,
  repo: string,
  limit: number,
  label?: string
): GHPullRequest[] {
  try {
    const jqFilter = `.[] | {number, title, labels: [.labels[].name], state, created_at, body, diff_url}`;
    const params = new URLSearchParams({
      state: "open",
      per_page: String(Math.min(limit, 100)),
    });
    if (label) {
      params.set("labels", label);
    }
    const cmd = `gh api "repos/${owner}/${repo}/pulls?${params.toString()}" -q '${jqFilter}'`;
    const raw = exec(cmd, GH_EXEC_OPTS);
    if (!raw.trim()) return [];
    const lines = raw.trim().split("\n");
    const jsonStr = "[" + lines.join(",") + "]";
    return JSON.parse(jsonStr) as GHPullRequest[];
  } catch (err) {
    handleGhError(err, owner, repo, "pulls");
  }
}

export function createPR(
  owner: string,
  repo: string,
  branch: string,
  title: string,
  body: string
): string {
  try {
    const result = exec(
      `gh pr create --repo "${owner}/${repo}" --head "${branch}" --title "${title.replace(/"/g, '\\"')}" --body "${body.replace(/"/g, '\\"')}"`,
      GH_EXEC_OPTS
    );
    return result.trim();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "PR creation failed";
    console.error(msg);
    process.exit(1);
  }
}
