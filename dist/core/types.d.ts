export interface PRData {
    number: number;
    title: string;
    body: string;
    author: string;
    baseBranch: string;
    headBranch: string;
    url: string;
    createdAt: string;
    files: PRFile[];
    diff: string;
    diffTruncated: boolean;
}
export interface PRFile {
    filename: string;
    status: 'added' | 'modified' | 'removed' | 'renamed';
    additions: number;
    deletions: number;
    patch?: string;
}
export interface ExistingItem {
    number: number;
    title: string;
    body: string;
    labels: string[];
    type: 'pr' | 'issue';
    url: string;
    createdAt: string;
    changedFiles?: string[];
}
export type Severity = 'critical' | 'warning' | 'info';
export type PRScope = 'small' | 'medium' | 'large';
export interface PRSummary {
    scope: PRScope;
    description: string;
    filesChanged: number;
    additions: number;
    deletions: number;
    categories: string[];
}
export interface DuplicateMatch {
    item: ExistingItem;
    similarityScore: number;
    matchReasons: string[];
}
export interface DuplicateResult {
    hasPotentialDuplicates: boolean;
    matches: DuplicateMatch[];
}
export interface SecurityFinding {
    severity: Severity;
    rule: string;
    message: string;
    file: string;
    line?: number;
    matchedContent?: string;
}
export interface SecurityResult {
    score: number;
    findings: SecurityFinding[];
    criticalCount: number;
    warningCount: number;
    infoCount: number;
}
export interface VisionAlignment {
    score: number;
    visionSource: 'VISION.md' | 'README.md' | 'none';
    analysis: string;
    concerns: string[];
    alignedAspects: string[];
}
export interface ReviewResult {
    pr: PRData;
    summary: PRSummary;
    duplicates: DuplicateResult;
    security: SecurityResult;
    vision: VisionAlignment;
    overallVerdict: 'pass' | 'warn' | 'fail';
    reviewedAt: string;
}
export interface ClawPRConfig {
    token: string;
    owner: string;
    repo: string;
    prNumber: number;
    postComment: boolean;
    dryRun: boolean;
    maxDiffBytes: number;
    duplicateThreshold: number;
    securityFailThreshold: number;
    apiUrl: string;
}
export declare const DEFAULT_CONFIG: Partial<ClawPRConfig>;
export declare const MAX_DIFF_BYTES = 102400;
export declare const FOOTER = "---\n\uD83D\uDD0D Reviewed by [ClawPR](https://github.com/SkunkWorks0x/clawpr) \u2014 powered by [ClawStack Sentinel](https://github.com/SkunkWorks0x/clawstack-sentinel) | [clawpilled.me](https://clawpilled.me)";
export declare function computeVerdict(result: {
    pr: PRData;
    summary: PRSummary;
    duplicates: DuplicateResult;
    security: SecurityResult;
    vision: VisionAlignment;
}, securityFailThreshold?: number): 'pass' | 'warn' | 'fail';
