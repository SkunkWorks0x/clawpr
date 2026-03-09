// ── PR Data ──────────────────────────────────────────────
export const DEFAULT_CONFIG = {
    postComment: false,
    dryRun: false,
    maxDiffBytes: 102400,
    duplicateThreshold: 0.4,
    securityFailThreshold: 50,
    apiUrl: 'https://api.github.com',
};
export const MAX_DIFF_BYTES = 102400;
export const FOOTER = `---\n🔍 Reviewed by [ClawPR](https://github.com/SkunkWorks0x/clawpr) — powered by [ClawStack Sentinel](https://github.com/SkunkWorks0x/clawstack-sentinel) | [clawpilled.me](https://clawpilled.me)`;
// ── Verdict Logic ────────────────────────────────────────
export function computeVerdict(result, securityFailThreshold = 50) {
    if (result.security.criticalCount > 0)
        return 'fail';
    if (result.security.score < securityFailThreshold)
        return 'fail';
    if (result.vision.score < 30)
        return 'fail';
    if (result.security.warningCount > 0)
        return 'warn';
    if (result.duplicates.hasPotentialDuplicates)
        return 'warn';
    if (result.vision.score < 60)
        return 'warn';
    if (result.summary.scope === 'large' && !result.pr.body)
        return 'warn';
    return 'pass';
}
//# sourceMappingURL=types.js.map