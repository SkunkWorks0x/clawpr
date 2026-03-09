export interface DiffFile {
    oldPath: string;
    newPath: string;
    hunks: DiffHunk[];
}
export interface DiffHunk {
    oldStart: number;
    oldCount: number;
    newStart: number;
    newCount: number;
    lines: DiffLine[];
}
export interface DiffLine {
    type: 'add' | 'remove' | 'context';
    content: string;
    newLineNumber?: number;
    oldLineNumber?: number;
}
export declare function parseDiff(rawDiff: string): DiffFile[];
export declare function getAddedLines(diffFiles: DiffFile[]): Array<{
    file: string;
    line: number;
    content: string;
}>;
