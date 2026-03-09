import { describe, it, expect } from 'vitest';
import { combinedSimilarity, tokenize, cosineSimilarity, jaccardSimilarity } from '../src/core/similarity.js';

describe('similarity', () => {
  it('should find high similarity for similar auth texts', () => {
    const score = combinedSimilarity(
      'fix authentication bypass in login',
      'fix auth bypass vulnerability in login'
    );
    expect(score).toBeGreaterThan(0.5);
  });

  it('should find low similarity for unrelated texts', () => {
    const score = combinedSimilarity(
      'add websocket support',
      'update README'
    );
    expect(score).toBeLessThan(0.3);
  });
});
