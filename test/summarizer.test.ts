import { describe, it, expect } from 'vitest';
import { summarize } from '../src/core/summarizer.js';
import { PRData } from '../src/core/types.js';
import simplePR from './fixtures/mock-pr-simple.json';
import largePR from './fixtures/mock-pr-large.json';
import noDescPR from './fixtures/mock-pr-no-description.json';

describe('summarizer', () => {
  it('should classify small PR correctly', () => {
    const result = summarize(simplePR as PRData);
    expect(result.scope).toBe('small');
    expect(result.categories).toContain('docs');
    expect(result.filesChanged).toBe(2);
  });

  it('should classify large PR correctly', () => {
    const result = summarize(largePR as PRData);
    expect(result.scope).toBe('large');
    expect(result.categories).toContain('feature');
    expect(result.categories).toContain('test');
  });

  it('should handle PR with no description', () => {
    const result = summarize(noDescPR as PRData);
    expect(result.description).toBeTruthy();
    expect(result.description.length).toBeGreaterThan(10);
    expect(result.description).toContain('lazy-dev');
  });
});
