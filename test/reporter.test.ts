import { describe, it, expect } from 'vitest';
import { formatTerminal, formatGitHubComment } from '../src/core/reporter.js';
import { ReviewResult, FOOTER } from '../src/core/types.js';

function makeResult(overrides: Partial<ReviewResult> = {}): ReviewResult {
  return {
    pr: {
      number: 42,
      title: 'Test PR',
      body: 'Test body',
      author: 'test-user',
      baseBranch: 'main',
      headBranch: 'feature/test',
      url: 'https://github.com/test-org/test-repo/pull/42',
      createdAt: '2026-03-08T10:00:00Z',
      files: [],
      diff: '',
      diffTruncated: false,
    },
    summary: {
      scope: 'small',
      description: 'Test summary',
      filesChanged: 2,
      additions: 10,
      deletions: 5,
      categories: ['docs'],
    },
    duplicates: { hasPotentialDuplicates: false, matches: [] },
    security: { score: 100, findings: [], criticalCount: 0, warningCount: 0, infoCount: 0 },
    vision: { score: 75, visionSource: 'VISION.md', analysis: 'Good alignment', concerns: [], alignedAspects: [] },
    overallVerdict: 'pass',
    reviewedAt: '2026-03-08T10:00:00Z',
    ...overrides,
  };
}

describe('reporter', () => {
  it('should include box-drawing characters and ANSI codes in terminal format', () => {
    const result = makeResult({
      security: {
        score: 80,
        findings: [
          { severity: 'critical', rule: 'CRED-001', message: 'API key', file: 'src/config.ts', line: 5 },
          { severity: 'warning', rule: 'CRED-005', message: 'Password', file: 'src/config.ts', line: 10 },
          { severity: 'info', rule: 'CONFIG-002', message: 'Env ref', file: 'src/index.ts' },
        ],
        criticalCount: 1, warningCount: 1, infoCount: 1,
      },
      overallVerdict: 'fail',
    });
    const output = formatTerminal(result);
    expect(output).toContain('╔');
    expect(output).toContain('╚');
    expect(output).toContain('\x1b[31m'); // red for critical
    expect(output).toContain('\x1b[33m'); // yellow for warning
    expect(output).toContain('\x1b[36m'); // cyan for info
  });

  it('should include FOOTER and Markdown emojis in GitHub comment', () => {
    const result = makeResult();
    const output = formatGitHubComment(result);
    expect(output).toContain(FOOTER);
    expect(output).toContain('✅');
  });

  it('should handle zero-changed-files PR as warn verdict', () => {
    const result = makeResult({
      pr: {
        number: 1,
        title: 'Empty',
        body: '',
        author: 'user',
        baseBranch: 'main',
        headBranch: 'empty',
        url: 'https://github.com/test/test/pull/1',
        createdAt: '2026-03-08T10:00:00Z',
        files: [],
        diff: '',
        diffTruncated: false,
      },
      summary: { scope: 'small', description: 'Empty PR', filesChanged: 0, additions: 0, deletions: 0, categories: [] },
      security: { score: 100, findings: [], criticalCount: 0, warningCount: 0, infoCount: 0 },
      vision: { score: 50, visionSource: 'none', analysis: 'No files changed', concerns: ['PR has no changed files'], alignedAspects: [] },
      overallVerdict: 'warn',
    });
    const terminal = formatTerminal(result);
    expect(terminal).toContain('WARN');
    expect(terminal).toContain('50/100');
    const gh = formatGitHubComment(result);
    expect(gh).toContain('WARN');
    expect(gh).toContain(FOOTER);
  });
});
