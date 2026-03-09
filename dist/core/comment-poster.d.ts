import { Octokit } from '@octokit/rest';
import { ClawPRConfig } from './types.js';
export declare function postComment(octokit: Octokit, config: ClawPRConfig, commentBody: string): Promise<string | null>;
