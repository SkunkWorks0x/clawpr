#!/usr/bin/env node
import { runReview } from './core/orchestrator.js';
import { DEFAULT_CONFIG } from './core/types.js';
import { createOctokit } from './core/octokit.js';
import { formatTerminal, formatGitHubComment } from './core/reporter.js';
import { postComment } from './core/comment-poster.js';
const USAGE = `
Usage: clawpr review --owner <owner> --repo <repo> --pr <number> --token <token> [options]

Required:
  --owner         Repository owner
  --repo          Repository name
  --pr            PR number
  --token         GitHub personal access token (or set GITHUB_TOKEN env var)

Options:
  --post-comment      Post results as PR comment (default: false)
  --dry-run           Run full analysis but skip posting comment even if --post-comment is set
  --threshold         Duplicate detection threshold 0.0-1.0 (default: 0.4)
  --max-diff          Max diff size in bytes (default: 102400)
  --security-fail-threshold  Security score below which the review fails (default: 50)
  --github-api-url    GitHub API base URL for GitHub Enterprise (default: https://api.github.com)
  --help              Show this help message
  --version           Show version
`.trim();
const FLAG_MAP = {
    'owner': 'owner',
    'repo': 'repo',
    'pr': 'prNumber',
    'token': 'token',
    'threshold': 'duplicateThreshold',
    'max-diff': 'maxDiffBytes',
    'security-fail-threshold': 'securityFailThreshold',
    'github-api-url': 'apiUrl',
};
const NUMERIC_FLAGS = new Set(['prNumber', 'maxDiffBytes', 'duplicateThreshold', 'securityFailThreshold']);
function parseArgs(argv) {
    const args = argv.slice(2);
    const config = {};
    let help = false;
    let version = false;
    let i = args[0] === 'review' ? 1 : 0;
    for (; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--help') {
            help = true;
            continue;
        }
        if (arg === '--version') {
            version = true;
            continue;
        }
        if (arg === '--post-comment') {
            config.postComment = true;
            continue;
        }
        if (arg === '--dry-run') {
            config.dryRun = true;
            continue;
        }
        if (arg.startsWith('--') && i + 1 < args.length) {
            const rawKey = arg.slice(2);
            const configKey = FLAG_MAP[rawKey];
            if (!configKey) {
                console.error(`Unknown flag: ${arg}`);
                process.exit(3);
            }
            const rawValue = args[++i];
            if (NUMERIC_FLAGS.has(configKey)) {
                const num = configKey === 'duplicateThreshold' ? parseFloat(rawValue) : parseInt(rawValue, 10);
                if (isNaN(num)) {
                    console.error(`Invalid numeric value for ${arg}: ${rawValue}`);
                    process.exit(3);
                }
                config[configKey] = num;
            }
            else {
                config[configKey] = rawValue;
            }
        }
    }
    return { config, help, version };
}
function resolveToken(config) {
    const token = config.token
        || process.env.GITHUB_TOKEN
        || process.env['INPUT_GITHUB-TOKEN'];
    if (!token) {
        console.error('Error: No GitHub token provided. Use --token or set GITHUB_TOKEN env var.');
        process.exit(3);
    }
    return token;
}
async function main() {
    const { config, help, version } = parseArgs(process.argv);
    if (help) {
        console.log(USAGE);
        process.exit(0);
    }
    if (version) {
        console.log('0.1.0');
        process.exit(0);
    }
    const token = resolveToken(config);
    if (!config.owner || !config.repo || !config.prNumber) {
        console.error('Error: --owner, --repo, and --pr are required.');
        console.error('');
        console.error(USAGE);
        process.exit(3);
    }
    const fullConfig = {
        token,
        owner: config.owner,
        repo: config.repo,
        prNumber: config.prNumber,
        postComment: config.postComment ?? DEFAULT_CONFIG.postComment,
        dryRun: config.dryRun ?? DEFAULT_CONFIG.dryRun,
        maxDiffBytes: config.maxDiffBytes ?? DEFAULT_CONFIG.maxDiffBytes,
        duplicateThreshold: config.duplicateThreshold ?? DEFAULT_CONFIG.duplicateThreshold,
        securityFailThreshold: config.securityFailThreshold ?? DEFAULT_CONFIG.securityFailThreshold,
        apiUrl: config.apiUrl ?? DEFAULT_CONFIG.apiUrl,
    };
    try {
        const result = await runReview(fullConfig);
        const terminalOutput = formatTerminal(result);
        console.log(terminalOutput);
        if (fullConfig.postComment && !fullConfig.dryRun) {
            const octokit = createOctokit(fullConfig.token, fullConfig.apiUrl);
            const commentBody = formatGitHubComment(result);
            const url = await postComment(octokit, fullConfig, commentBody);
            if (url) {
                console.log(`\nComment posted: ${url}`);
            }
        }
        process.exit(result.overallVerdict === 'pass' ? 0 : result.overallVerdict === 'warn' ? 1 : 2);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`ClawPR error: ${message}`);
        process.exit(3);
    }
}
main();
//# sourceMappingURL=index.js.map