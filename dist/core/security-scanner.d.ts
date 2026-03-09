import { SecurityResult, PRFile } from './types.js';
export declare function scanSecurity(addedLines: Array<{
    file: string;
    line: number;
    content: string;
}>, files: PRFile[]): SecurityResult;
