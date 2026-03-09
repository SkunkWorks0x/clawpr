import { FOOTER } from './types.js';
import { box, sectionHeader, severityColor, success, warn, error } from '../utils/logger.js';
const RESET = '\x1b[0m';
export function formatTerminal(result) {
    const lines = [];
    // Header box
    const headerBox = box('ClawPR Review Report', [
        `PR #${result.pr.number}: ${result.pr.title}`,
        `Repo: ${result.pr.url.split('/').slice(3, 5).join('/')}`,
        `Reviewed: ${result.reviewedAt}`,
    ]);
    lines.push(headerBox);
    lines.push('');
    // Summary
    lines.push(sectionHeader('Summary'));
    lines.push(`Scope: ${result.summary.scope} | Files: ${result.summary.filesChanged} | +${result.summary.additions} -${result.summary.deletions}`);
    lines.push(`Categories: ${result.summary.categories.join(', ')}`);
    lines.push(`Description: ${result.summary.description}`);
    lines.push('');
    // Duplicates
    lines.push(sectionHeader('Duplicate Check'));
    if (!result.duplicates.hasPotentialDuplicates) {
        lines.push(success('No potential duplicates found'));
    }
    else {
        for (const match of result.duplicates.matches) {
            lines.push(warn(`Potential duplicate: ${match.item.type} #${match.item.number} "${match.item.title}" (score: ${match.item.type === 'pr' ? 'PR' : 'Issue'} ${match.similarityScore.toFixed(2)})`));
            for (const reason of match.matchReasons) {
                lines.push(`  ${reason}`);
            }
        }
    }
    lines.push('');
    // Security
    lines.push(sectionHeader('Security Scan'));
    lines.push(`Score: ${result.security.score}/100`);
    if (result.security.findings.length === 0) {
        lines.push(success('No security issues found'));
    }
    else {
        for (const finding of result.security.findings) {
            const color = severityColor(finding.severity);
            const locationParts = [finding.file];
            if (finding.line)
                locationParts.push(String(finding.line));
            const location = locationParts.join(':');
            const icon = finding.severity === 'critical' ? '🔴' : finding.severity === 'warning' ? '⚠' : 'ℹ';
            lines.push(`${color}${icon} ${finding.rule}: ${finding.message} (${location})${RESET}`);
        }
    }
    lines.push('');
    // Vision
    lines.push(sectionHeader('Vision Alignment'));
    lines.push(`Score: ${result.vision.score}/100 (source: ${result.vision.visionSource})`);
    lines.push(`Analysis: ${result.vision.analysis}`);
    if (result.vision.concerns.length > 0) {
        lines.push('Concerns:');
        for (const concern of result.vision.concerns) {
            lines.push(`  - ${concern}`);
        }
    }
    if (result.vision.alignedAspects.length > 0) {
        lines.push('Aligned:');
        for (const aspect of result.vision.alignedAspects) {
            lines.push(`  + ${aspect}`);
        }
    }
    lines.push('');
    // Verdict
    lines.push(sectionHeader('Verdict'));
    switch (result.overallVerdict) {
        case 'pass':
            lines.push(success('PASS — No issues found'));
            break;
        case 'warn':
            lines.push(warn('WARN — Review findings before merging'));
            break;
        case 'fail':
            lines.push(error('FAIL — Critical issues must be addressed'));
            break;
    }
    return lines.join('\n');
}
export function formatGitHubComment(result) {
    const lines = [];
    lines.push('# ClawPR Review Report');
    lines.push('');
    lines.push(`**PR #${result.pr.number}**: ${result.pr.title}`);
    lines.push(`**Reviewed**: ${result.reviewedAt}`);
    lines.push('');
    // Summary
    lines.push('## Summary');
    lines.push(`**Scope**: ${result.summary.scope} | **Files**: ${result.summary.filesChanged} | +${result.summary.additions} -${result.summary.deletions}`);
    lines.push(`**Categories**: ${result.summary.categories.join(', ')}`);
    lines.push('');
    lines.push(result.summary.description);
    lines.push('');
    // Duplicates
    lines.push('## Duplicate Check');
    if (!result.duplicates.hasPotentialDuplicates) {
        lines.push('✅ No potential duplicates found');
    }
    else {
        for (const match of result.duplicates.matches) {
            lines.push(`- 🟡 Potential duplicate: ${match.item.type} #${match.item.number} "${match.item.title}" (score: ${match.similarityScore.toFixed(2)})`);
            for (const reason of match.matchReasons) {
                lines.push(`  - ${reason}`);
            }
        }
    }
    lines.push('');
    // Security
    lines.push('## Security Scan');
    lines.push(`**Score**: ${result.security.score}/100`);
    lines.push('');
    if (result.security.findings.length === 0) {
        lines.push('✅ No security issues found');
    }
    else if (result.security.findings.length > 5) {
        // Collapsible
        lines.push('<details>');
        lines.push(`<summary>${result.security.findings.length} findings (${result.security.criticalCount} critical, ${result.security.warningCount} warning, ${result.security.infoCount} info)</summary>`);
        lines.push('');
        for (const finding of result.security.findings) {
            const icon = finding.severity === 'critical' ? '🔴' : finding.severity === 'warning' ? '🟡' : '🔵';
            const locationParts = [finding.file];
            if (finding.line)
                locationParts.push(String(finding.line));
            lines.push(`- ${icon} **${finding.rule}**: ${finding.message} (\`${locationParts.join(':')}\`)`);
        }
        lines.push('');
        lines.push('</details>');
    }
    else {
        for (const finding of result.security.findings) {
            const icon = finding.severity === 'critical' ? '🔴' : finding.severity === 'warning' ? '🟡' : '🔵';
            const locationParts = [finding.file];
            if (finding.line)
                locationParts.push(String(finding.line));
            lines.push(`- ${icon} **${finding.rule}**: ${finding.message} (\`${locationParts.join(':')}\`)`);
        }
    }
    lines.push('');
    // Vision
    lines.push('## Vision Alignment');
    lines.push(`**Score**: ${result.vision.score}/100 (source: ${result.vision.visionSource})`);
    lines.push('');
    lines.push(result.vision.analysis);
    lines.push('');
    if (result.vision.concerns.length > 0) {
        lines.push('**Concerns:**');
        for (const concern of result.vision.concerns) {
            lines.push(`- ${concern}`);
        }
        lines.push('');
    }
    if (result.vision.alignedAspects.length > 0) {
        lines.push('**Aligned:**');
        for (const aspect of result.vision.alignedAspects) {
            lines.push(`- ✅ ${aspect}`);
        }
        lines.push('');
    }
    // Verdict
    lines.push('## Verdict');
    switch (result.overallVerdict) {
        case 'pass':
            lines.push('✅ **PASS** — No issues found');
            break;
        case 'warn':
            lines.push('🟡 **WARN** — Review findings before merging');
            break;
        case 'fail':
            lines.push('🔴 **FAIL** — Critical issues must be addressed');
            break;
    }
    lines.push('');
    lines.push(FOOTER);
    return lines.join('\n');
}
//# sourceMappingURL=reporter.js.map