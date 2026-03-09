import { exec } from "./exec.js";
import type { GHIssue, GHPullRequest } from "./types.js";

// Re-export for test convenience
export { setExecFn, resetExecFn } from "./exec.js";

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

export function fetchIssues(
  owner: string,
  repo: string,
  label?: string
): GHIssue[] {
  try {
    const jqFilter = `.[] | {number, title, labels: [.labels[].name], state, created_at, body}`;
    let cmd = `gh api "repos/${owner}/${repo}/issues" --paginate -q '${jqFilter}'`;
    if (label) {
      cmd = `gh api "repos/${owner}/${repo}/issues?labels=${encodeURIComponent(label)}" --paginate -q '${jqFilter}'`;
    }
    const raw = exec(cmd, {
      timeout: 30000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    if (!raw.trim()) return [];
    const lines = raw.trim().split("\n");
    const jsonStr = "[" + lines.join(",") + "]";
    return JSON.parse(jsonStr) as GHIssue[];
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to fetch from GitHub API";
    if (msg.includes("ENOBUFS") || msg.includes("maxBuffer")) {
      console.error(
        `Error: GitHub API response too large for ${owner}/${repo} issues. Try narrowing with --limit or --label.`
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
}

export function fetchPullRequests(
  owner: string,
  repo: string,
  label?: string
): GHPullRequest[] {
  try {
    const jqFilter = `.[] | {number, title, labels: [.labels[].name], state, created_at, body, diff_url}`;
    let cmd = `gh api "repos/${owner}/${repo}/pulls" --paginate -q '${jqFilter}'`;
    if (label) {
      cmd = `gh api "repos/${owner}/${repo}/pulls?labels=${encodeURIComponent(label)}" --paginate -q '${jqFilter}'`;
    }
    const raw = exec(cmd, {
      timeout: 30000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    if (!raw.trim()) return [];
    const lines = raw.trim().split("\n");
    const jsonStr = "[" + lines.join(",") + "]";
    return JSON.parse(jsonStr) as GHPullRequest[];
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Failed to fetch from GitHub API";
    if (msg.includes("ENOBUFS") || msg.includes("maxBuffer")) {
      console.error(
        `Error: GitHub API response too large for ${owner}/${repo} pulls. Try narrowing with --limit or --label.`
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
      {
        timeout: 30000,
        stdio: ["pipe", "pipe", "pipe"],
      }
    );
    return result.trim();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "PR creation failed";
    console.error(msg);
    process.exit(1);
  }
}
