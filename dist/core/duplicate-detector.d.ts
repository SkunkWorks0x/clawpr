import { PRData, ExistingItem, DuplicateResult } from './types.js';
export declare function detectDuplicates(pr: PRData, existingItems: ExistingItem[], threshold: number): DuplicateResult;
