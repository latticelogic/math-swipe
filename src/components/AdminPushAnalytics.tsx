/**
 * AdminPushAnalytics — owner-only push event aggregator.
 *
 * Reads from `pushEvents/` (Firestore rule: requires the `isAdmin` custom
 * claim on the requester's ID token) and shows three counters per kind:
 * sent / failed / clicked, plus the implied click-through rate.
 *
 * Routed at /admin/push — matches the App.tsx detection alongside the
 * /u/<slug> profile route. Renders a "not authorized" panel for anyone
 * without the claim.
 */

import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { auth } from '../utils/firebase';

interface RawEvent {
    uid: string;
    kind: string;
    event: 'sent' | 'failed' | 'clicked';
    errorCode?: number;
    timestamp?: Timestamp;
}

interface Aggregate {
    sent: number;
    failed: number;
    clicked: number;
}

function emptyAggregate(): Aggregate {
    return { sent: 0, failed: 0, clicked: 0 };
}

interface Props {
    onBackToGame: () => void;
}

export function AdminPushAnalytics({ onBackToGame }: Props) {
    const [authorized, setAuthorized] = useState<boolean | null>(null);
    const [byKind, setByKind] = useState<Record<string, Aggregate>>({});
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [windowDays, setWindowDays] = useState(7);

    // Check the claim before doing anything else
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const user = auth.currentUser;
            if (!user) {
                if (!cancelled) { setAuthorized(false); setLoading(false); }
                return;
            }
            try {
                const tokenRes = await user.getIdTokenResult();
                if (cancelled) return;
                setAuthorized(tokenRes.claims.isAdmin === true);
            } catch {
                if (!cancelled) setAuthorized(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (!authorized) { if (authorized === false) setLoading(false); return; }
        let cancelled = false;
        (async () => {
            try {
                const cutoff = Timestamp.fromMillis(Date.now() - windowDays * 24 * 60 * 60 * 1000);
                const q = query(
                    collection(db, 'pushEvents'),
                    where('timestamp', '>=', cutoff),
                    orderBy('timestamp', 'desc'),
                    limit(5000),
                );
                const snap = await getDocs(q);
                if (cancelled) return;
                const buckets: Record<string, Aggregate> = {};
                for (const doc of snap.docs) {
                    const data = doc.data() as RawEvent;
                    const bucket = buckets[data.kind] ??= emptyAggregate();
                    if (data.event in bucket) bucket[data.event]++;
                }
                setByKind(buckets);
                setLoading(false);
            } catch (err) {
                if (cancelled) return;
                console.warn('Admin analytics load failed:', err);
                setError('Failed to load events. Check the isAdmin claim.');
                setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [authorized, windowDays]);

    if (authorized === null) {
        return (
            <div className="flex-1 flex items-center justify-center text-sm ui text-[rgb(var(--color-fg))]/40">
                Checking permissions…
            </div>
        );
    }
    if (!authorized) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
                <div className="text-4xl">🔒</div>
                <div className="chalk text-xl text-[var(--color-gold)]">Not authorized</div>
                <p className="text-sm ui text-[rgb(var(--color-fg))]/50 max-w-xs">
                    You need the <code className="text-[var(--color-gold)]/80">isAdmin</code> custom claim to view this.
                    See <code className="text-[var(--color-gold)]/80">scripts/grant-admin-claim.md</code>.
                </p>
                <button
                    onClick={onBackToGame}
                    className="mt-4 px-6 py-2.5 rounded-xl border border-[var(--color-gold)]/30 text-sm ui text-[var(--color-gold)] hover:bg-[var(--color-gold)]/10 transition-colors"
                >
                    ← Back
                </button>
            </div>
        );
    }

    const kinds = Object.keys(byKind).sort();
    return (
        <div className="flex-1 flex flex-col items-center overflow-y-auto px-6 pt-[calc(env(safe-area-inset-top,16px)+24px)] pb-20">
            <div className="w-full max-w-md">
                <button
                    onClick={onBackToGame}
                    className="text-xs ui text-[rgb(var(--color-fg))]/40 hover:text-[rgb(var(--color-fg))]/70 transition-colors mb-3"
                >
                    ← Back
                </button>
                <h1 className="chalk text-2xl text-[var(--color-gold)] mb-1">Push Analytics</h1>
                <p className="text-xs ui text-[rgb(var(--color-fg))]/40 mb-4">
                    Last {windowDays} days · aggregated from <code>pushEvents</code>
                </p>

                <div className="flex gap-2 mb-4">
                    {[1, 7, 30].map(d => (
                        <button
                            key={d}
                            onClick={() => setWindowDays(d)}
                            className={`px-3 py-1 rounded-lg text-xs ui transition-colors ${windowDays === d
                                ? 'bg-[var(--color-gold)]/20 text-[var(--color-gold)]'
                                : 'text-[rgb(var(--color-fg))]/50 hover:text-[rgb(var(--color-fg))]/70'}`}
                        >
                            {d}d
                        </button>
                    ))}
                </div>

                {loading && <div className="text-sm ui text-[rgb(var(--color-fg))]/40">Loading…</div>}
                {error && <div className="text-sm ui text-[var(--color-wrong)]">{error}</div>}

                {!loading && !error && kinds.length === 0 && (
                    <div className="text-sm ui text-[rgb(var(--color-fg))]/40 text-center mt-12">
                        No events yet in this window.
                    </div>
                )}

                {!loading && kinds.map(kind => {
                    const agg = byKind[kind];
                    const ctr = agg.sent > 0 ? Math.round((agg.clicked / agg.sent) * 100) : 0;
                    const failRate = agg.sent + agg.failed > 0
                        ? Math.round((agg.failed / (agg.sent + agg.failed)) * 100)
                        : 0;
                    return (
                        <div key={kind} className="mt-3 p-4 rounded-xl border border-[rgb(var(--color-fg))]/10 bg-[var(--color-surface)]">
                            <div className="flex items-baseline justify-between mb-3">
                                <h2 className="chalk text-lg text-[rgb(var(--color-fg))]/85">{kind}</h2>
                                <span className="text-[10px] ui text-[rgb(var(--color-fg))]/40">
                                    CTR {ctr}% · fail {failRate}%
                                </span>
                            </div>
                            <div className="grid grid-cols-3 gap-3 text-center">
                                <Stat label="sent" value={agg.sent} colour="var(--color-correct)" />
                                <Stat label="clicked" value={agg.clicked} colour="var(--color-gold)" />
                                <Stat label="failed" value={agg.failed} colour="var(--color-wrong)" />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function Stat({ label, value, colour }: { label: string; value: number; colour: string }) {
    return (
        <div>
            <div className="chalk text-2xl tabular-nums" style={{ color: colour }}>{value}</div>
            <div className="text-[10px] ui text-[rgb(var(--color-fg))]/40">{label}</div>
        </div>
    );
}
