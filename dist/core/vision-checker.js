import { combinedSimilarity, tokenize } from './similarity.js';
function extractHeadingsAndFirstSentences(doc) {
    const lines = doc.split('\n');
    const parts = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('#')) {
            parts.push(line.replace(/^#+\s*/, ''));
            // Grab first sentence of section
            for (let j = i + 1; j < lines.length; j++) {
                const next = lines[j].trim();
                if (next.startsWith('#'))
                    break;
                if (next.length > 0) {
                    const sentence = next.split(/[.!?]/)[0];
                    if (sentence)
                        parts.push(sentence);
                    break;
                }
            }
        }
    }
    return parts.join(' ');
}
function buildPRIntentText(pr) {
    const filenames = pr.files.map(f => f.filename).join(' ');
    // Get first 20 added lines from each file
    const addedLines = [];
    for (const file of pr.files) {
        if (!file.patch)
            continue;
        const lines = file.patch.split('\n');
        let count = 0;
        for (const line of lines) {
            if (line.startsWith('+') && !line.startsWith('+++')) {
                addedLines.push(line.slice(1));
                count++;
                if (count >= 20)
                    break;
            }
        }
    }
    return `${pr.title} ${pr.body} ${filenames} ${addedLines.join(' ')}`;
}
function isMinorDocFix(pr) {
    const titlePattern = /typo|spelling|fix\s+doc|readme|grammar|wording/i;
    if (!titlePattern.test(pr.title))
        return false;
    const totalAdditions = pr.files.reduce((sum, f) => sum + f.additions, 0);
    if (totalAdditions > 30)
        return false;
    const allMd = pr.files.every(f => f.filename.endsWith('.md'));
    return allMd;
}
export function checkVisionAlignment(pr, visionDoc) {
    if (!visionDoc) {
        return {
            score: 50,
            visionSource: 'none',
            analysis: 'No vision document found — cannot assess alignment.',
            concerns: [],
            alignedAspects: [],
        };
    }
    // Determine source
    const visionSource = visionDoc.includes('# Project Vision') || visionDoc.includes('## Mission')
        ? 'VISION.md'
        : 'README.md';
    const visionKeywords = extractHeadingsAndFirstSentences(visionDoc);
    const prIntentText = buildPRIntentText(pr);
    // Base score from similarity — start at 55 (neutral) and scale up with similarity
    const similarity = combinedSimilarity(visionKeywords, prIntentText);
    let score = 55 + similarity * 100;
    const concerns = [];
    const alignedAspects = [];
    const minorDoc = isMinorDocFix(pr);
    // Check file patterns
    const docFiles = pr.files.filter(f => f.filename.endsWith('.md') || f.filename.startsWith('docs/'));
    const codeFiles = pr.files.filter(f => /\.(ts|js|tsx|jsx|py|go|rs)$/.test(f.filename) &&
        !/\.test\.|\.spec\./.test(f.filename));
    // Penalty: modifies docs without description
    if (docFiles.length > 0 && !pr.body) {
        const penalty = minorDoc ? 10 : 20;
        score -= penalty;
        concerns.push('Modifies docs without description');
    }
    // Penalty: many doc files, few code files
    if (docFiles.length > 3 && codeFiles.length < 1) {
        const penalty = minorDoc ? 7.5 : 15;
        score -= penalty;
        concerns.push('Modifies many doc files with no code changes — possible doc manipulation');
    }
    // Penalty: title says "fix"/"bug" but only docs
    if (/fix|bug/i.test(pr.title) && docFiles.length > 0 && codeFiles.length === 0) {
        const penalty = minorDoc ? 5 : 10;
        score -= penalty;
        concerns.push('Title implies bug fix but only doc files changed');
    }
    // Bonus: adds tests
    const testFiles = pr.files.filter(f => /\.test\.|\.spec\.|\/test\/|__tests__\//.test(f.filename));
    if (testFiles.length > 0) {
        score += 10;
        alignedAspects.push('Adds test coverage');
    }
    // Bonus: description mentions vision keywords
    if (pr.body) {
        const visionTokens = new Set(tokenize(visionKeywords));
        const bodyTokens = tokenize(pr.body);
        const overlap = bodyTokens.filter(t => visionTokens.has(t));
        if (overlap.length >= 2) {
            score += 10;
            alignedAspects.push('PR description references vision-aligned concepts');
        }
    }
    if (minorDoc) {
        alignedAspects.push('Minor documentation improvement');
    }
    // Clamp
    score = Math.max(0, Math.min(100, Math.round(score)));
    // Generate analysis
    let analysis;
    if (score >= 70) {
        analysis = `PR aligns well with project vision (score: ${score}/100). Changes are consistent with documented goals and principles.`;
    }
    else if (score >= 40) {
        analysis = `PR has moderate alignment with project vision (score: ${score}/100). Some aspects match but there are concerns worth reviewing.`;
    }
    else {
        analysis = `PR has low alignment with project vision (score: ${score}/100). Changes may conflict with documented goals or lack clear connection to project direction.`;
    }
    if (concerns.length > 0) {
        analysis += ` Concerns: ${concerns.join('; ')}.`;
    }
    return {
        score,
        visionSource,
        analysis,
        concerns,
        alignedAspects,
    };
}
//# sourceMappingURL=vision-checker.js.map