import { combinedSimilarity, fileOverlapJaccard } from './similarity.js';
export function detectDuplicates(pr, existingItems, threshold) {
    const prText = `${pr.title} ${pr.body}`;
    const prFiles = pr.files.map(f => f.filename);
    const matches = [];
    for (const item of existingItems) {
        // Skip self
        if (item.number === pr.number && item.type === 'pr')
            continue;
        const itemText = `${item.title} ${item.body}`;
        let score = combinedSimilarity(prText, itemText);
        const matchReasons = [`text similarity: ${score.toFixed(2)}`];
        // File overlap bonus for PRs
        if (item.type === 'pr' && item.changedFiles && item.changedFiles.length > 0) {
            const overlap = fileOverlapJaccard(prFiles, item.changedFiles);
            if (overlap > 0.3) {
                score += 0.15;
                matchReasons.push(`file overlap: ${(overlap * 100).toFixed(0)}% (+0.15 bonus)`);
            }
            else if (overlap > 0) {
                matchReasons.push(`file overlap: ${(overlap * 100).toFixed(0)}% (no bonus)`);
            }
        }
        if (score >= threshold) {
            matches.push({
                item,
                similarityScore: score,
                matchReasons,
            });
        }
    }
    matches.sort((a, b) => b.similarityScore - a.similarityScore);
    return {
        hasPotentialDuplicates: matches.length > 0,
        matches,
    };
}
//# sourceMappingURL=duplicate-detector.js.map