import { Octokit } from '@octokit/rest';
import { ClawPRConfig, PRData, ExistingItem } from './types.js';
export declare function fetchPR(octokit: Octokit, config: ClawPRConfig): Promise<PRData>;
export declare function fetchExistingItems(octokit: Octokit, config: ClawPRConfig): Promise<ExistingItem[]>;
export declare function fetchVisionDocument(octokit: Octokit, config: ClawPRConfig): Promise<string | null>;
