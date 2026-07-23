/**
 * AdminFunnel — owner-only growth funnel.
 *
 * Routed at /admin/funnel. Reads `funnel/{uid}` across users (gated by the
 * `isAdmin` custom claim, same as /admin/billing). Turns the set-once
 * milestones written by utils/funnel.ts into a conversion funnel:
 *
 *   First open → First play → Paywall view → Purchase
 *
 * plus a simple "returned" retention proxy (active on a later day than first
 * open) and a platform split. It's the meta-lever: every growth bet becomes
 * measurable. Reads are capped (500 most-recently-active docs) so the view
 * never triggers a runaway read; move to a scheduled server rollup past that.
 */
import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { getFirebase } from '../utils/firebase';

interface FunnelRow {
    firstOpenAt: number | null;
    firstPlayAt: number | null;
    paywallViewAt: number | null;
    purchaseAt: number | null;
    lastActiveAt: number | null;
    platform: string;
}

function toMs(x: unknown): number | null {
    if (typeof x === 'number') return x;
    if (x && typeof (x as { toMillis?: () => number }).toMillis === 'function') return (x as { toMillis: () => number }).toMillis();
    return null;
}
function dayKey(ms: number): string {
    const d = new Date(ms);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

interface Props { onBackToGame: () => void; }

export function AdminFunnel({ onBackToGame }: Props) {
    const [authorized, setAuthorized] = useState<boolean | null>(null);
    const [rows, setRows] = useState<FunnelRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const { auth } = await getFirebase();
            if (cancelled) return;
            const user = auth.currentUser;
            if (!user) { setAuthorized(false); setLoading(false); return; }
            try {
                const tokenRes = await user.getIdTokenResult();
                if (!cancelled) setAuthorized(tokenRes.claims.isAdmin === true);
            } catch { if (!cancelled) setAuthorized(false); }
        })();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (!authorized) { if (authorized === false) queueMicrotask(() => setLoading(false)); return; }
        let cancelled = false;
        (async () => {
            try {
                const { db } = await getFirebase();
                if (cancelled) return;
                const snap = await getDocs(query(collection(db, 'funnel'), orderBy('lastActiveAt', 'desc'), limit(500)));
                if (cancelled) return;
                setRows(snap.docs.map(d => {
                    const v = d.data();
                    return {
                        firstOpenAt: toMs(v.firstOpenAt),
                        firstPlayAt: toMs(v.firstPlayAt),
                        paywallViewAt: toMs(v.paywallViewAt),
                        purchaseAt: toMs(v.purchaseAt),
                        lastActiveAt: toMs(v.lastActiveAt),
                        platform: typeof v.platform === 'string' ? v.platform : 'web',
                    };
                }));
            } catch (e) {
                if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load funnel');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [authorized]);

    const stats = useMemo(() => {
        const opened = rows.filter(r => r.firstOpenAt);
        const played = opened.filter(r => r.firstPlayAt);
        const sawPaywall = opened.filter(r => r.paywallViewAt);
        const purchased = opened.filter(r => r.purchaseAt);
        const returned = opened.filter(r => r.lastActiveAt && r.firstOpenAt && dayKey(r.lastActiveAt) !== dayKey(r.firstOpenAt));
        const platform = opened.reduce<Record<string, number>>((acc, r) => { acc[r.platform] = (acc[r.platform] || 0) + 1; return acc; }, {});
        return {
            steps: [
                { key: 'open', label: 'First open', n: opened.length },
                { key: 'play', label: 'First play', n: played.length },
                { key: 'paywall', label: 'Paywall view', n: sawPaywall.length },
                { key: 'purchase', label: 'Purchase', n: purchased.length },
            ],
            base: opened.length,
            returned: returned.length,
            platform,
        };
    }, [rows]);

    if (authorized === null || loading) {
        return <Shell onBack={onBackToGame}><p style={s.muted}>Loading…</p></Shell>;
    }
    if (!authorized) {
        return <Shell onBack={onBackToGame}><p style={s.muted}>Not authorized.</p></Shell>;
    }

    const pct = (n: number, d: number) => d > 0 ? Math.round((n / d) * 100) : 0;

    return (
        <Shell onBack={onBackToGame}>
            {error && <p style={{ ...s.muted, color: '#e08a8a' }}>{error}</p>}
            <p style={s.muted}>Last {rows.length} active users (cap 500). % of first-open, and step-over-step.</p>

            <div style={{ marginTop: 20 }}>
                {stats.steps.map((step, i) => {
                    const prev = i > 0 ? stats.steps[i - 1].n : step.n;
                    const width = stats.base > 0 ? Math.max(4, (step.n / stats.base) * 100) : 4;
                    return (
                        <div key={step.key} style={{ marginBottom: 14 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                                <span>{step.label}</span>
                                <span style={s.muted}>
                                    {step.n} · {pct(step.n, stats.base)}% of open{i > 0 ? ` · ${pct(step.n, prev)}% step` : ''}
                                </span>
                            </div>
                            <div style={{ height: 22, background: 'rgba(255,255,255,0.06)', borderRadius: 6, overflow: 'hidden' }}>
                                <div style={{ width: `${width}%`, height: '100%', background: 'var(--color-gold, #d6b24a)', borderRadius: 6 }} />
                            </div>
                        </div>
                    );
                })}
            </div>

            <div style={{ marginTop: 24, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                <div>
                    <div style={s.big}>{pct(stats.returned, stats.base)}%</div>
                    <div style={s.muted}>returned another day</div>
                </div>
                <div>
                    <div style={s.big}>{pct(stats.steps[3].n, stats.steps[2].n)}%</div>
                    <div style={s.muted}>paywall → purchase</div>
                </div>
                <div>
                    <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                        {Object.entries(stats.platform).map(([p, n]) => <div key={p}>{p}: {n}</div>)}
                    </div>
                    <div style={s.muted}>by platform</div>
                </div>
            </div>
        </Shell>
    );
}

function Shell({ children, onBack }: { children: React.ReactNode; onBack: () => void }) {
    return (
        <div style={{ minHeight: '100dvh', background: 'rgb(27,27,27)', color: '#eee', padding: '24px 20px', fontFamily: 'system-ui, sans-serif' }}>
            <div style={{ maxWidth: 560, margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <h1 style={{ fontSize: 20, margin: 0 }}>Growth funnel</h1>
                    <button onClick={onBack} style={{ background: 'none', border: '1px solid #444', color: '#aaa', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>Back</button>
                </div>
                {children}
            </div>
        </div>
    );
}

const s = {
    muted: { color: '#888', fontSize: 12 } as React.CSSProperties,
    big: { fontSize: 28, fontWeight: 700, color: 'var(--color-gold, #d6b24a)' } as React.CSSProperties,
};
