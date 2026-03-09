import fs from 'node:fs';
import { ClawPRConfig, DEFAULT_CONFIG } from './core/types.js';
import { createOctokit } from './core/octokit.js';
import { runReview } from './core/orchestrator.js';
import { formatGitHubComment } from './core/reporter.js';
import { postComment } from './core/comment-poster.js';

async function run(): Promise<void> {
  try {
    const token = process.env['INPUT_GITHUB-TOKEN'];
    if (!token) {
      throw new Error('github-token input is required');
    }

    const duplicateThreshold = process.env['INPUT_DUPLICATE-THRESHOLD']
      ? parseFloat(process.env['INPUT_DUPLICATE-THRESHOLD'])
      : DEFAULT_CONFIG.duplicateThreshold!;
    const securityFailThreshold = process.env['INPUT_SECURITY-FAIL-THRESHOLD']
      ? parseInt(process.env['INPUT_SECURITY-FAIL-THRESHOLD'], 10)
      : DEFAULT_CONFIG.securityFailThreshold!;
    const maxDiffBytes = process.env['INPUT_MAX-DIFF-BYTES']
      ? parseInt(process.env['INPUT_MAX-DIFF-BYTES'], 10)
      : DEFAULT_CONFIG.maxDiffBytes!;
    const apiUrl = process.env['INPUT_GITHUB-API-URL'] || DEFAULT_CONFIG.apiUrl!;

    const eventPath = process.env.GITHUB_EVENT_PATH;
    if (!eventPath) {
      throw new Error('GITHUB_EVENT_PATH not set — are you running inside GitHub Actions?');
    }
    const event = JSON.parse(fs.readFileSync(eventPath, 'utf-8'));
    const owner: string = event.repository.owner.login;
    const repo: string = event.repository.name;
    const prNumber: number = event.pull_request?.number ?? event.number;
    if (!prNumber) {
      throw new Error('Could not determine PR number from event payload');
    }

    const config: ClawPRConfig = {
      token,
      owner,
      repo,
      prNumber,
      postComment: true,
      dryRun: false,
      maxDiffBytes,
      duplicateThreshold,
      securityFailThreshold,
      apiUrl,
    };

    const result = await runReview(config);

    const commentBody = formatGitHubComment(result);
    const octokit = createOctokit(config.token, config.apiUrl);
    const commentUrl = await postComment(octokit, config, commentBody);
    if (commentUrl) {
      console.log(`Comment posted: ${commentUrl}`);
    }

    const outputFile = process.env.GITHUB_OUTPUT;
    if (outputFile) {
      fs.appendFileSync(outputFile, `verdict=${result.overallVerdict}\n`);
      fs.appendFileSync(outputFile, `security-score=${result.security.score}\n`);
      fs.appendFileSync(outputFile, `vision-score=${result.vision.score}\n`);
    }

    if (result.overallVerdict === 'fail') {
      process.exitCode = 2;
    } else if (result.overallVerdict === 'warn') {
      process.exitCode = 1;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`ClawPR Action failed: ${message}`);
    process.exitCode = 3;
  }
}

run();
