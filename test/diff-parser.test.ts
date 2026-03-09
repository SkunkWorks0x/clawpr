import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseDiff, getAddedLines } from '../src/utils/diff-parser.js';

const fixturesDir = join(import.meta.dirname, 'fixtures');

describe('diff-parser', () => {
  it('should parse clean diff correctly', () => {
    const raw = readFileSync(join(fixturesDir, 'mock-diff-clean.patch'), 'utf-8');
    const files = parseDiff(raw);
    expect(files).toHaveLength(1);
    expect(files[0].newPath).toBe('src/utils/format.ts');
    expect(files[0].hunks.length).toBeGreaterThan(0);
  });

  it('should extract only added lines from credentials diff', () => {
    const raw = readFileSync(join(fixturesDir, 'mock-diff-credentials.patch'), 'utf-8');
    const files = parseDiff(raw);
    const added = getAddedLines(files);
    // Should only have + lines, not +++ headers
    for (const line of added) {
      expect(line.content).not.toMatch(/^\+\+\+/);
    }
    expect(added.length).toBeGreaterThan(0);
    // Should contain the credential lines
    const contents = added.map(l => l.content);
    expect(contents.some(c => c.includes('sk-proj-'))).toBe(true);
  });
});
