/**
 * Cloudflare Pages — single-Worker mode entry.
 *
 * Built and copied to `dist/_worker.js` at build time so that Cloudflare
 * Pages routes ALL traffic through this Worker (overriding the default
 * static-only behaviour). We use this mode instead of `functions/` because
 * the project root already has a `functions/` dir for Firebase Cloud
 * Functions, and Cloudflare Pages would otherwise try to deploy those as
 * edge functions.
 *
 * Routes handled here:
 *   /u/<slug>   → fetch the player's stats from Firestore REST, inject
 *                 per-profile OG meta tags into index.html, and return
 *                 the augmented HTML so social-card crawlers see the
 *                 right preview. Browsers continue to run the SPA
 *                 normally because the body/script tags are untouched.
 *
 * Everything else falls through to the static asset binding.
 *
 * Environment expectations (set in Cloudflare Pages → Settings → Env vars):
 *   FIREBASE_PROJECT_ID  — the project id (matches VITE_FIREBASE_PROJECT_ID)
 *   PUBLIC_ORIGIN        — canonical site origin, e.g. https://math-swipe-c7k.pages.dev
 *
 * If FIREBASE_PROJECT_ID is missing, the Worker falls through to the
 * default index.html with generic OG tags — the SPA still works, just
 * without per-profile previews.
 */

interface Env {
    ASSETS: { fetch(req: Request): Promise<Response> };
    FIREBASE_PROJECT_ID?: string;
    PUBLIC_ORIGIN?: string;
}

interface ProfileData {
    displayName: string;
    totalXP: number;
    bestStreak: number;
    accuracy: number;
    bestSpeedrunTime?: number;
}

/** Decode a Firestore REST `Value` object into the raw value. Only handles
 *  the field types we actually persist on user docs; anything exotic
 *  returns undefined so the OG fallback path takes over. */
function decodeFirestoreValue(v: unknown): unknown {
    if (typeof v !== 'object' || v === null) return undefined;
    const o = v as Record<string, unknown>;
    if ('stringValue' in o) return o.stringValue;
    if ('integerValue' in o) return Number(o.integerValue);
    if ('doubleValue' in o) return Number(o.doubleValue);
    if ('booleanValue' in o) return o.booleanValue;
    return undefined;
}

/** Parse a profile slug — mirrors src/utils/profileSlug.ts. Two shapes:
 *   { kind: 'handle', handle }  for /u/somehandle (claimed username)
 *   { kind: 'legacy', name, uidPrefix }  for /u/Some_Name-abc1 */
type ParsedSlug =
    | { kind: 'handle'; handle: string }
    | { kind: 'legacy'; name: string; uidPrefix: string };

function parseSlug(slug: string): ParsedSlug | null {
    const i = slug.lastIndexOf('-');
    if (i >= 1 && i < slug.length - 1) {
        const tail = slug.slice(i + 1);
        if (/^[a-z0-9]{3,8}$/.test(tail)) {
            const name = decodeURIComponent(slug.slice(0, i));
            return { kind: 'legacy', name, uidPrefix: tail.toLowerCase() };
        }
    }
    const handle = slug.toLowerCase();
    if (/^[a-z0-9_]{3,20}$/.test(handle)) {
        return { kind: 'handle', handle };
    }
    return null;
}

/** Resolve a claimed handle to a uid via Firestore REST. Returns null when
 *  unclaimed — the caller can then fall back to the legacy lookup. */
async function lookupUidByHandle(projectId: string, handle: string): Promise<string | null> {
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/usernames/${encodeURIComponent(handle)}`;
    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(1500) });
        if (!res.ok) return null;
        const json = await res.json() as { fields?: Record<string, unknown> };
        return (decodeFirestoreValue(json.fields?.uid) as string | undefined) ?? null;
    } catch {
        return null;
    }
}

async function fetchUserDoc(projectId: string, uid: string): Promise<Record<string, unknown> | null> {
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${encodeURIComponent(uid)}`;
    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(1500) });
        if (!res.ok) return null;
        const json = await res.json() as { fields?: Record<string, unknown> };
        return json.fields ?? null;
    } catch {
        return null;
    }
}

function rowToProfile(fields: Record<string, unknown>, fallbackName: string): ProfileData {
    return {
        displayName: (decodeFirestoreValue(fields.displayName) as string | undefined) ?? fallbackName,
        totalXP: (decodeFirestoreValue(fields.totalXP) as number | undefined) ?? 0,
        bestStreak: (decodeFirestoreValue(fields.bestStreak) as number | undefined) ?? 0,
        accuracy: (decodeFirestoreValue(fields.accuracy) as number | undefined) ?? 0,
        bestSpeedrunTime: (decodeFirestoreValue(fields.bestSpeedrunTime) as number | undefined) ?? 0,
    };
}

/** Look up a profile via the Firestore REST API. Uses the claim collection
 *  for clean handle URLs (1 get) and falls back to the displayName scan for
 *  legacy `<name>-<uid4>` URLs (1 runQuery). REST means no SDK weight and
 *  the Worker stays fast. */
async function fetchProfile(projectId: string, slug: string): Promise<ProfileData | null> {
    const parsed = parseSlug(slug);
    if (!parsed) return null;

    // Path 1: pure handle — single get on usernames/{slug} then on users/{uid}
    if (parsed.kind === 'handle') {
        const uid = await lookupUidByHandle(projectId, parsed.handle);
        if (!uid) return null;
        const fields = await fetchUserDoc(projectId, uid);
        if (!fields) return null;
        return rowToProfile(fields, parsed.handle);
    }

    // Path 2: legacy displayName scan (existing behaviour)
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
    const body = {
        structuredQuery: {
            from: [{ collectionId: 'users' }],
            where: {
                fieldFilter: {
                    field: { fieldPath: 'displayName' },
                    op: 'EQUAL',
                    value: { stringValue: parsed.name },
                },
            },
            limit: 8,
        },
    };
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return null;
    const rows = await res.json() as Array<{ document?: { name: string; fields?: Record<string, unknown> } }>;
    for (const row of rows) {
        const docName = row.document?.name; // projects/.../users/<uid>
        const uid = docName?.split('/').pop() ?? '';
        if (!uid.toLowerCase().startsWith(parsed.uidPrefix)) continue;
        return rowToProfile(row.document?.fields ?? {}, parsed.name);
    }
    return null;
}

/** HTML-escape a small string for safe interpolation into a meta tag.
 *  We never accept HTML from upstream so this only needs the 5 entities. */
function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function buildProfileMeta(p: ProfileData, profileUrl: string, origin: string): string {
    const title = `${p.displayName} on Math Swipe`;
    const speedrunSegment = p.bestSpeedrunTime && p.bestSpeedrunTime > 0
        ? ` · ⏱️ ${(p.bestSpeedrunTime / 1000).toFixed(1)}s speedrun`
        : '';
    const description = `${p.totalXP.toLocaleString()} XP · 🔥 ${p.bestStreak} streak · 🎯 ${p.accuracy}% accuracy${speedrunSegment} — challenge them!`;
    // OG image strategy: until we have per-profile rendered cards, use the
    // app icon. The card-image rendering happens client-side in the SessionSummary
    // download path; baking it into edge would need a font + canvas runtime.
    const image = `${origin}/icon-512.png`;
    return [
        `<title>${escapeHtml(title)}</title>`,
        `<meta name="description" content="${escapeHtml(description)}" />`,
        `<meta property="og:type" content="profile" />`,
        `<meta property="og:title" content="${escapeHtml(title)}" />`,
        `<meta property="og:description" content="${escapeHtml(description)}" />`,
        `<meta property="og:image" content="${escapeHtml(image)}" />`,
        `<meta property="og:url" content="${escapeHtml(profileUrl)}" />`,
        `<meta name="twitter:card" content="summary" />`,
        `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
        `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
        `<meta name="twitter:image" content="${escapeHtml(image)}" />`,
    ].join('\n  ');
}

/** Splice profile-specific meta into the base index.html, replacing the
 *  generic <title> and any existing og:* / twitter:* / description tags. */
function injectMeta(html: string, metaBlock: string): string {
    // Strip existing tags we're going to replace
    let out = html;
    out = out.replace(/<title>[\s\S]*?<\/title>\s*/i, '');
    out = out.replace(/<meta\s+[^>]*?(?:name="description"|property="og:[^"]*"|name="twitter:[^"]*")[^>]*>\s*/gi, '');
    // Insert before </head>
    return out.replace(/<\/head>/i, `  ${metaBlock}\n</head>`);
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);
        const profileMatch = url.pathname.match(/^\/u\/([^/]+)\/?$/);

        if (!profileMatch) {
            // Everything else: pass through to the static assets
            return env.ASSETS.fetch(request);
        }

        const slug = profileMatch[1];
        const projectId = env.FIREBASE_PROJECT_ID;
        const origin = env.PUBLIC_ORIGIN ?? url.origin;

        // Always serve index.html (the SPA renders the actual UI client-side).
        // Two non-obvious things:
        //   1. Fetch from the request's own origin, not PUBLIC_ORIGIN —
        //      env.ASSETS routes by path on the Request URL, and preview
        //      deploys live on <hash>.<project>.pages.dev hostnames that
        //      differ from the canonical PUBLIC_ORIGIN.
        //   2. Fetch '/' (not '/index.html'). Cloudflare Pages issues a 308
        //      from /index.html → / for SEO canonicalization, so fetching
        //      /index.html via ASSETS returns an empty 308 redirect body.
        // PUBLIC_ORIGIN is still used below in the rendered OG meta tags
        // where we want stable canonical URLs for social-card crawlers.
        const indexReq = new Request(`${url.origin}/`, request);
        const indexRes = await env.ASSETS.fetch(indexReq);
        const html = await indexRes.text();

        let injected = html;
        if (projectId) {
            try {
                const profile = await fetchProfile(projectId, slug);
                if (profile) {
                    const meta = buildProfileMeta(profile, `${origin}/u/${slug}`, origin);
                    injected = injectMeta(html, meta);
                }
            } catch {
                // Edge fetch / parse failure → silently fall through to default
                // OG tags. The SPA still loads correctly for the visitor.
            }
        }

        return new Response(injected, {
            status: 200,
            headers: {
                'content-type': 'text/html; charset=utf-8',
                // Edge cache for 5 min so subsequent crawls are cheap, but
                // browsers always revalidate so a stats update appears fast.
                'cache-control': 'public, max-age=0, s-maxage=300',
            },
        });
    },
};
