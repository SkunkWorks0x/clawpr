import { PRData, PRSummary, PRScope } from './types.js';

function computeScope(additions: number, deletions: number): PRScope {
  const total = additions + deletions;
  if (total <= 50) return 'small';
  if (total <= 300) return 'medium';
  return 'large';
}

function categorizeFile(filename: string): string {
  const lower = filename.toLowerCase();

  if (/\.test\.|\.spec\.|\/test\/|__tests__\//.test(lower)) return 'test';
  if (/(?:auth|security|permission|crypt)/.test(lower)) return 'security';
  if (/\.md$|^docs\//.test(lower)) return 'docs';
  if (/^package\.json$|^package-lock\.json$|^yarn\.lock$|^pnpm-lock\.yaml$/.test(lower)) return 'deps';
  if (/\.ya?ml$|\.toml$|\.json$/.test(lower)) return 'config';
  if (/\.ts$|\.js$|\.tsx$|\.jsx$|\.py$|\.go$|\.rs$/.test(lower)) return 'feature';

  return 'feature';
}

export function summarize(pr: PRData): PRSummary {
  const additions = pr.files.reduce((sum, f) => sum + f.additions, 0);
  const deletions = pr.files.reduce((sum, f) => sum + f.deletions, 0);
  const scope = computeScope(additions, deletions);
  const filesChanged = pr.files.length;

  const categorySet = new Set<string>();
  for (const file of pr.files) {
    categorySet.add(categorizeFile(file.filename));
  }
  const categories = Array.from(categorySet).sort();

  const dominantCategory = categories[0] ?? 'feature';
  let dominantSentence = `Changes are primarily ${dominantCategory}-related.`;
  if (categories.length > 1) {
    dominantSentence = `Changes span ${categories.join(', ')}.`;
  }

  let description = `${scope.charAt(0).toUpperCase() + scope.slice(1)} PR by ${pr.author} affecting ${filesChanged} files. ${dominantSentence}`;

  if (pr.body) {
    const truncatedBody = pr.body.length > 200 ? pr.body.slice(0, 200) + '...' : pr.body;
    description += ` Author describes: ${truncatedBody}`;
  }

  return {
    scope,
    description,
    filesChanged,
    additions,
    deletions,
    categories,
  };
}
