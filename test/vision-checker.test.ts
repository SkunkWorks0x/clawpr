import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkVisionAlignment } from '../src/core/vision-checker.js';
import { PRData } from '../src/core/types.js';
import misalignedPR from './fixtures/mock-pr-vision-misaligned.json';
import largePR from './fixtures/mock-pr-large.json';

const fixturesDir = join(import.meta.dirname, 'fixtures');
const visionDoc = readFileSync(join(fixturesDir, 'mock-vision.md'), 'utf-8');

describe('vision-checker', () => {
  it('should score misaligned PR below 60', () => {
    const result = checkVisionAlignment(misalignedPR as PRData, visionDoc);
    expect(result.score).toBeLessThan(60);
    expect(result.concerns.length).toBeGreaterThan(0);
  });

  it('should score large feature PR above 60', () => {
    const result = checkVisionAlignment(largePR as PRData, visionDoc);
    expect(result.score).toBeGreaterThan(60);
    expect(result.alignedAspects).toContain('Adds test coverage');
  });
});
