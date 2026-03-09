import { FOOTER } from './types.js';
export async function postComment(octokit, config, commentBody) {
    if (config.dryRun)
        return null;
    const { owner, repo, prNumber } = config;
    try {
        const { data: comments } = await octokit.rest.issues.listComments({
            owner,
            repo,
            issue_number: prNumber,
            per_page: 100,
        });
        const existing = comments.find(c => c.body?.includes(FOOTER));
        if (existing) {
            const { data: updated } = await octokit.rest.issues.updateComment({
                owner,
                repo,
                comment_id: existing.id,
                body: commentBody,
            });
            return updated.html_url;
        }
        else {
            const { data: created } = await octokit.rest.issues.createComment({
                owner,
                repo,
                issue_number: prNumber,
                body: commentBody,
            });
            return created.html_url;
        }
    }
    catch (err) {
        if (err && typeof err === 'object' && 'status' in err && err.status === 403) {
            throw new Error("Cannot post comment — token needs 'pull-requests: write' permission.");
        }
        throw err;
    }
}
//# sourceMappingURL=comment-poster.js.map