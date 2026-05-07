/**
 * GitHub publishing helper for Skytravel deploy-* functions.
 *
 * Exposes:
 *   - fetchFile(path, ref)        → { sha, content }     read existing file
 *   - publishCommit({ ... })      → { prUrl, prNumber, branchName, previewUrl }
 *
 * Reads config from process.env: GITHUB_TOKEN, GITHUB_REPO_OWNER,
 * GITHUB_REPO_NAME, GITHUB_BASE_BRANCH (defaults to 'main').
 * Constructs Netlify deploy-preview URL from process.env.SITE_NAME (set
 * automatically by Netlify in the function environment).
 */

const API = 'https://api.github.com';

function cfg() {
    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_REPO_OWNER;
    const repo = process.env.GITHUB_REPO_NAME;
    const baseBranch = process.env.GITHUB_BASE_BRANCH || 'main';
    if (!token || !owner || !repo) {
        throw new Error('GitHub publisher misconfigured: GITHUB_TOKEN, GITHUB_REPO_OWNER, and GITHUB_REPO_NAME must be set in environment.');
    }
    return { token, owner, repo, baseBranch };
}

function authHeaders() {
    const { token } = cfg();
    return {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'skytravel-publisher'
    };
}

async function gh(method, path, body) {
    const { owner, repo } = cfg();
    const url = path.startsWith('http') ? path : `${API}/repos/${owner}/${repo}${path}`;
    const opts = { method, headers: authHeaders() };
    if (body !== undefined) {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
    }
    const res = await fetch(url, opts);
    if (!res.ok) {
        const text = await res.text();
        const err = new Error(`GitHub ${method} ${path} → ${res.status}: ${text}`);
        err.status = res.status;
        err.body = text;
        throw err;
    }
    if (res.status === 204) return null;
    return res.json();
}

/**
 * Fetch a file's contents from a ref (branch or SHA).
 * Returns { sha, content } where content is the decoded UTF-8 string.
 * Throws with err.status === 404 if missing.
 */
async function fetchFile(path, ref) {
    const { baseBranch } = cfg();
    const refToUse = ref || baseBranch;
    const data = await gh('GET', `/contents/${encodeURIComponent(path).replace(/%2F/g, '/')}?ref=${encodeURIComponent(refToUse)}`);
    return {
        sha: data.sha,
        content: Buffer.from(data.content, 'base64').toString('utf8')
    };
}

/**
 * Slugify any string for branch naming.
 */
function slugifyBranch(s) {
    return String(s || '')
        .toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'change';
}

/**
 * Publish a multi-file change as a single atomic commit on a new branch,
 * then open a Pull Request to the base branch.
 *
 * @param {Object} opts
 * @param {string} opts.branchPrefix    e.g. 'content/destino' or 'content/experiencia'
 * @param {string} opts.slug            slug used in branch name
 * @param {string} opts.commitMessage   single-line commit subject
 * @param {string} opts.prTitle
 * @param {string} opts.prBody          markdown body
 * @param {Array<{path: string, content: string}>} opts.files  full file contents to write
 *
 * @returns {Promise<{ prUrl, prNumber, branchName, previewUrl }>}
 */
async function publishCommit({ branchPrefix, slug, commitMessage, prTitle, prBody, files }) {
    const { baseBranch, owner, repo } = cfg();

    if (!Array.isArray(files) || files.length === 0) {
        throw new Error('publishCommit: files array is empty');
    }

    // 1. Get base branch tip SHA
    const baseRef = await gh('GET', `/git/refs/heads/${encodeURIComponent(baseBranch)}`);
    const baseSha = baseRef.object.sha;

    // 2. Get base commit's tree SHA
    const baseCommit = await gh('GET', `/git/commits/${baseSha}`);
    const baseTreeSha = baseCommit.tree.sha;

    // 3. Create blobs for each file
    const tree = [];
    for (const f of files) {
        const blob = await gh('POST', '/git/blobs', {
            content: Buffer.from(f.content, 'utf8').toString('base64'),
            encoding: 'base64'
        });
        tree.push({
            path: f.path,
            mode: '100644',
            type: 'blob',
            sha: blob.sha
        });
    }

    // 4. Create new tree on top of base
    const newTree = await gh('POST', '/git/trees', {
        base_tree: baseTreeSha,
        tree
    });

    // 5. Create commit pointing to new tree
    const commit = await gh('POST', '/git/commits', {
        message: commitMessage,
        tree: newTree.sha,
        parents: [baseSha]
    });

    // 6. Create new branch ref. Disambiguate with timestamp if name is taken.
    const slugPart = slugifyBranch(slug);
    let branchName = `${branchPrefix}/${slugPart}`;
    try {
        await gh('POST', '/git/refs', {
            ref: `refs/heads/${branchName}`,
            sha: commit.sha
        });
    } catch (err) {
        if (err.status === 422) {
            branchName = `${branchName}-${Date.now()}`;
            await gh('POST', '/git/refs', {
                ref: `refs/heads/${branchName}`,
                sha: commit.sha
            });
        } else {
            throw err;
        }
    }

    // 7. Open PR
    const pr = await gh('POST', '/pulls', {
        title: prTitle,
        head: branchName,
        base: baseBranch,
        body: prBody,
        maintainer_can_modify: true
    });

    // 8. Construct Netlify deploy-preview URL (if SITE_NAME available)
    const siteName = process.env.SITE_NAME || '';
    const previewUrl = siteName
        ? `https://deploy-preview-${pr.number}--${siteName}.netlify.app`
        : null;

    return {
        prUrl: pr.html_url,
        prNumber: pr.number,
        branchName,
        previewUrl
    };
}

module.exports = { fetchFile, publishCommit };
