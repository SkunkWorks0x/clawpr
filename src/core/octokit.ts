import { Octokit } from '@octokit/rest';

export function createOctokit(token: string, apiUrl?: string): Octokit {
  return new Octokit({
    auth: token,
    baseUrl: apiUrl || 'https://api.github.com',
    request: {
      timeout: 10000,
    },
  });
}
