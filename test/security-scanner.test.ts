import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { scanSecurity } from '../src/core/security-scanner.js';
import { parseDiff, getAddedLines } from '../src/utils/diff-parser.js';
import { PRFile } from '../src/core/types.js';
import maliciousPR from './fixtures/mock-pr-malicious.json';

const fixturesDir = join(import.meta.dirname, 'fixtures');

describe('security-scanner', () => {
  it('should find critical findings in credentials diff', () => {
    const raw = readFileSync(join(fixturesDir, 'mock-diff-credentials.patch'), 'utf-8');
    const diffFiles = parseDiff(raw);
    const addedLines = getAddedLines(diffFiles);
    const files: PRFile[] = [{ filename: 'src/config.ts', status: 'modified', additions: 6, deletions: 0 }];
    const result = scanSecurity(addedLines, files);
    expect(result.criticalCount).toBeGreaterThanOrEqual(2);
    const rules = result.findings.map(f => f.rule);
    expect(rules).toContain('CRED-001'); // api_key = "sk-proj-..."
    expect(rules).toContain('CRED-002'); // ghp_ token
    expect(rules).toContain('CRED-004'); // BEGIN PRIVATE KEY
  });

  it('should return clean score for clean diff', () => {
    const raw = readFileSync(join(fixturesDir, 'mock-diff-clean.patch'), 'utf-8');
    const diffFiles = parseDiff(raw);
    const addedLines = getAddedLines(diffFiles);
    const files: PRFile[] = [{ filename: 'src/utils/format.ts', status: 'modified', additions: 4, deletions: 1 }];
    const result = scanSecurity(addedLines, files);
    expect(result.score).toBe(100);
    expect(result.findings).toHaveLength(0);
  });

  it('should detect multiple threats in malicious PR', () => {
    const diffFiles = parseDiff(maliciousPR.diff);
    const addedLines = getAddedLines(diffFiles);
    const files = maliciousPR.files as PRFile[];
    const result = scanSecurity(addedLines, files);
    const rules = result.findings.map(f => f.rule);
    expect(rules).toContain('CRED-001'); // api_key = "sk-proj-..."
    expect(rules).toContain('DANGER-004'); // external fetch
    expect(rules).toContain('DANGER-001'); // eval(request.body...)
    expect(rules).toContain('DEPS-001'); // crypto-miner
  });

  it('should skip binary files', () => {
    const addedLines = [{ file: 'image.png', line: 1, content: 'Binary files /dev/null and b/image.png differ' }];
    const files: PRFile[] = [{ filename: 'image.png', status: 'added', additions: 0, deletions: 0, patch: 'Binary files /dev/null and b/image.png differ' }];
    const result = scanSecurity(addedLines, files);
    expect(result.findings).toHaveLength(0);
  });
});
