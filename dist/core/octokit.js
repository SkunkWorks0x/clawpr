import { Octokit } from '@octokit/rest';
export function createOctokit(token, apiUrl) {
    return new Octokit({
        auth: token,
        baseUrl: apiUrl || 'https://api.github.com',
        request: {
            timeout: 10000,
        },
    });
}
//# sourceMappingURL=octokit.js.map