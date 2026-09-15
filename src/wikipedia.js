const UA = 'WikipediaPageWatcher/0.1 (+contact: wikipedia-page-watcher-admin@example.com)';
const REVERT_PATTERN = /\b(undo|undid|revert|rv)\b/i;

const TRANSIENT_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 4;
const REQUEST_TIMEOUT_MS = 15_000;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url) {
    let lastError;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        let res;
        try {
            res = await fetch(url, { headers: { 'User-Agent': UA, Connection: 'close' }, signal: controller.signal });
        } catch (err) {
            lastError = err.name === 'AbortError' ? new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms: ${url}`) : err;
            if (attempt < MAX_ATTEMPTS) {
                await sleep(1000 * 2 ** (attempt - 1));
                continue;
            }
            throw lastError;
        } finally {
            clearTimeout(timeoutId);
        }
        if (res.ok) return res;
        if (!TRANSIENT_STATUSES.has(res.status)) {
            throw new Error(`Wikipedia API request failed: ${res.status} ${res.statusText}`);
        }
        lastError = new Error(`Wikipedia API request failed: ${res.status} ${res.statusText}`);
        if (attempt < MAX_ATTEMPTS) await sleep(1000 * 2 ** (attempt - 1));
    }
    throw lastError;
}

function toIsoTimestamp(date) {
    return date.toISOString();
}

export async function fetchEdits({ pageTitle, language, startDate, maxResults }) {
    const url = new URL(`https://${language}.wikipedia.org/w/api.php`);
    url.searchParams.set('action', 'query');
    url.searchParams.set('prop', 'revisions');
    url.searchParams.set('titles', pageTitle);
    // Fetch one extra revision so the oldest returned edit still gets a size-change diff.
    url.searchParams.set('rvlimit', String(maxResults + 1));
    url.searchParams.set('rvprop', 'timestamp|user|comment|ids|size|flags');
    url.searchParams.set('rvstart', toIsoTimestamp(new Date()));
    url.searchParams.set('rvend', toIsoTimestamp(startDate));
    url.searchParams.set('rvdir', 'older');
    url.searchParams.set('format', 'json');

    const res = await fetchWithRetry(url);
    const body = await res.json();
    const page = Object.values(body.query?.pages ?? {})[0];
    if (!page || page.missing !== undefined) {
        throw new Error(`Page not found: "${pageTitle}" on ${language}.wikipedia.org`);
    }

    const revisions = page.revisions ?? [];

    return revisions.slice(0, maxResults).map((rev, i) => {
        const older = revisions[i + 1];
        const sizeChange = older ? rev.size - older.size : null;
        const comment = rev.comment ?? '';
        return {
            pageTitle: page.title,
            revisionId: rev.revid,
            parentRevisionId: rev.parentid,
            user: rev.user,
            isAnonymous: rev.anon !== undefined,
            isMinorEdit: rev.minor !== undefined,
            timestamp: rev.timestamp,
            sizeBytes: rev.size,
            sizeChangeBytes: sizeChange,
            comment,
            looksLikeRevert: REVERT_PATTERN.test(comment),
            diffUrl: `https://${language}.wikipedia.org/w/index.php?title=${encodeURIComponent(page.title)}&diff=${rev.revid}&oldid=${rev.parentid}`,
        };
    });
}
