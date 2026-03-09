import { describe, it, expect } from 'vitest';
import { detectDuplicates } from '../src/core/duplicate-detector.js';
import { PRData, ExistingItem } from '../src/core/types.js';
import duplicatePR from './fixtures/mock-pr-duplicate.json';
import simplePR from './fixtures/mock-pr-simple.json';
import existingPRs from './fixtures/mock-existing-prs.json';
import existingIssues from './fixtures/mock-existing-issues.json';

describe('duplicate-detector', () => {
  it('should detect PR #50 as potential duplicate of mock-pr-duplicate', () => {
    const result = detectDuplicates(
      duplicatePR as PRData,
      existingPRs as ExistingItem[],
      0.4
    );
    expect(result.hasPotentialDuplicates).toBe(true);
    const pr50 = result.matches.find(m => m.item.number === 50);
    expect(pr50).toBeDefined();
    expect(pr50!.similarityScore).toBeGreaterThanOrEqual(0.4);
  });

  it('should find no duplicates for simple PR', () => {
    const result = detectDuplicates(
      simplePR as PRData,
      existingPRs as ExistingItem[],
      0.4
    );
    expect(result.hasPotentialDuplicates).toBe(false);
  });

  it('should detect issue #51 as potential duplicate', () => {
    const result = detectDuplicates(
      duplicatePR as PRData,
      existingIssues as ExistingItem[],
      0.2
    );
    expect(result.hasPotentialDuplicates).toBe(true);
    const issue51 = result.matches.find(m => m.item.number === 51);
    expect(issue51).toBeDefined();
  });
});
