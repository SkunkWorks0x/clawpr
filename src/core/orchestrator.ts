import { ClawPRConfig, ReviewResult, PRSummary, computeVerdict } from './types.js';
import { createOctokit } from './octokit.js';
import { fetchPR, fetchExistingItems, fetchVisionDocument } from './pr-fetcher.js';
import { parseDiff, getAddedLines } from '../utils/diff-parser.js';
import { summarize } from './summarizer.js';
import { detectDuplicates } from './duplicate-detector.js';
import { scanSecurity } from './security-scanner.js';
import { checkVisionAlignment } from './vision-checker.js';

export async function runReview(config: ClawPRConfig): Promise<ReviewResult> {
  const octokit = createOctokit(config.token, config.apiUrl);

  const pr = await fetchPR(octokit, config);
  const existingItems = await fetchExistingItems(octokit, config);
  const visionDoc = await fetchVisionDocument(octokit, config);

  // Handle zero-changed-files PRs
  if (pr.files.length === 0) {
    const emptySummary: PRSummary = {
      scope: 'small',
      description: `Empty PR by ${pr.author} with no changed files.`,
      filesChanged: 0,
      additions: 0,
      deletions: 0,
      categories: [],
    };
    return {
      pr,
      summary: emptySummary,
      duplicates: { hasPotentialDuplicates: false, matches: [] },
      security: { score: 100, findings: [], criticalCount: 0, warningCount: 0, infoCount: 0 },
      vision: { score: 50, visionSource: 'none', analysis: 'No files changed — cannot assess alignment.', concerns: ['PR has no changed files'], alignedAspects: [] },
      overallVerdict: 'warn',
      reviewedAt: new Date().toISOString(),
    };
  }

  const diffFiles = parseDiff(pr.diff);
  const addedLines = getAddedLines(diffFiles);

  const summary = summarize(pr);
  const duplicates = detectDuplicates(pr, existingItems, config.duplicateThreshold);
  const security = scanSecurity(addedLines, pr.files);
  const vision = checkVisionAlignment(pr, visionDoc);

  const overallVerdict = computeVerdict(
    { summary, duplicates, security, vision, pr },
    config.securityFailThreshold
  );

  return {
    pr,
    summary,
    duplicates,
    security,
    vision,
    overallVerdict,
    reviewedAt: new Date().toISOString(),
  };
}
