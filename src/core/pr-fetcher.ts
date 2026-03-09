import { Octokit } from '@octokit/rest';
import { ClawPRConfig, PRData, PRFile, ExistingItem, MAX_DIFF_BYTES } from './types.js';

function handleApiError(err: unknown, context: string): never {
  if (err && typeof err === 'object' && 'status' in err) {
    const status = (err as { status: number }).status;
    if (status === 401 || status === 403) {
      // Check for rate limit
      if (err && typeof err === 'object' && 'response' in err) {
        const response = (err as { response: { headers: Record<string, string> } }).response;
        if (response?.headers?.['x-ratelimit-remaining'] === '0') {
          const resetTime = response.headers['x-ratelimit-reset'];
          const resetDate = resetTime ? new Date(parseInt(resetTime, 10) * 1000).toISOString() : 'unknown';
          throw new Error(`GitHub API rate limit exceeded. Resets at ${resetDate}`);
        }
      }
      throw new Error('Authentication failed — check your GitHub token');
    }
    if (status === 404) {
      throw new Error(`${context} not found (404)`);
    }
  }
  throw err;
}

export async function fetchPR(octokit: Octokit, config: ClawPRConfig): Promise<PRData> {
  const { owner, repo, prNumber } = config;
  const maxDiffBytes = config.maxDiffBytes ?? MAX_DIFF_BYTES;

  try {
    const { data: pr } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    });

    const { data: files } = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber,
      per_page: 100,
    });

    // Fetch raw diff
    const { data: diffData } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
      mediaType: { format: 'diff' },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- octokit returns string for diff format but types say object
    let diff = diffData as any as string;
    let diffTruncated = false;

    if (typeof diff === 'string' && Buffer.byteLength(diff, 'utf-8') > maxDiffBytes) {
      diff = diff.slice(0, maxDiffBytes);
      diffTruncated = true;
    }

    const prFiles: PRFile[] = files.map(f => ({
      filename: f.filename,
      status: f.status as PRFile['status'],
      additions: f.additions,
      deletions: f.deletions,
      patch: f.patch,
    }));

    return {
      number: pr.number,
      title: pr.title,
      body: pr.body ?? '',
      author: pr.user?.login ?? 'unknown',
      baseBranch: pr.base.ref,
      headBranch: pr.head.ref,
      url: pr.html_url,
      createdAt: pr.created_at,
      files: prFiles,
      diff: typeof diff === 'string' ? diff : '',
      diffTruncated,
    };
  } catch (err) {
    handleApiError(err, `PR #${prNumber}`);
  }
}

export async function fetchExistingItems(octokit: Octokit, config: ClawPRConfig): Promise<ExistingItem[]> {
  const { owner, repo } = config;
  const items: ExistingItem[] = [];

  try {
    const prs = await octokit.paginate(octokit.rest.pulls.list, {
      owner,
      repo,
      state: 'open',
      per_page: 100,
    });

    for (const pr of prs.slice(0, 50)) {
      let changedFiles: string[] | undefined;
      try {
        const { data: files } = await octokit.rest.pulls.listFiles({
          owner,
          repo,
          pull_number: pr.number,
          per_page: 30,
        });
        changedFiles = files.map(f => f.filename);
      } catch {
        // Ignore errors fetching files for existing PRs
      }

      items.push({
        number: pr.number,
        title: pr.title,
        body: pr.body ?? '',
        labels: pr.labels.map(l => (typeof l === 'string' ? l : l.name ?? '')),
        type: 'pr',
        url: pr.html_url,
        createdAt: pr.created_at,
        changedFiles,
      });
    }

    const issues = await octokit.paginate(octokit.rest.issues.listForRepo, {
      owner,
      repo,
      state: 'open',
      per_page: 100,
    });

    const remaining = 100 - items.length;
    for (const issue of issues.slice(0, remaining)) {
      // Skip PRs (issues API includes PRs)
      if (issue.pull_request) continue;

      items.push({
        number: issue.number,
        title: issue.title,
        body: issue.body ?? '',
        labels: issue.labels.map(l => (typeof l === 'string' ? l : (typeof l === 'object' && l !== null && 'name' in l ? (l.name ?? '') : ''))),
        type: 'issue',
        url: issue.html_url,
        createdAt: issue.created_at,
      });
    }
  } catch (err) {
    handleApiError(err, 'existing items');
  }

  return items;
}

export async function fetchVisionDocument(octokit: Octokit, config: ClawPRConfig): Promise<string | null> {
  const { owner, repo } = config;

  for (const path of ['VISION.md', 'README.md']) {
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
      });

      if ('content' in data && 'encoding' in data) {
        if (data.encoding === 'base64') {
          return Buffer.from(data.content, 'base64').toString('utf-8');
        }
        return data.content;
      }
    } catch {
      // Try next file
    }
  }

  return null;
}
