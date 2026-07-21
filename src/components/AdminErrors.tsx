/**
 * AdminErrors — owner-only crash-report viewer.
 *
 * Routed at /admin/errors. Reads the `errors` collection (client crash
 * reports written by errorMonitor.ts), gated by the `isAdmin` custom
 * claim — the same gate as /admin/push and /admin/billing. Renders:
 *
 *   1. A 24h pulse row: errors in the last 1h / 6h / 24h, so a spike is
 *      readable at a glance (the errorSpike Cloud Function pushes a
 *      notification pointing here when the hourly count jumps).
 *   2. The most recent 100 reports: message, source, URL, user-agent,
 *      and timestamp, newest first.
 *
 * Admin surface — deliberately English-only, like AdminBilling.
 */

import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { getFirebase } from '../utils/firebase';

interface ErrorRow {
    id: string;
    message: string;
    stack: string;
    source: string;
    userAgent: string;
    url: string;
    timestamp: number | null;
}

interface Props {
    onBackToGame: () => void;
}

export function AdminErrors({ onBackToGame }: Props) {
    const [authorized, setAuthorized] = useState<boolean | null>(null);
    const [rows, setRows] = useState<ErrorRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Same admin-claim check as AdminBilling. The Firestore rule rejects
    // unauthorized reads server-side; the UI check just gives non-admins
    // a clean panel instead of a fetch error.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const { auth } = await getFirebase();
            if (cancelled) return;
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
        if (!authorized) {
            if (authorized === false) queueMicrotask(() => setLoading(false));
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const { db } = await getFirebase();
                const snap = await getDocs(query(collection(db, 'errors'), orderBy('timestamp', 'desc'), limit(100)));
                if (cancelled) return;
                setRows(snap.docs.map(d => {
                    const data = d.data();
                    return {
                        id: d.id,
                        message: data.message ?? '',
                        stack: data.stack ?? '',
                        source: data.source ?? '',
                        userAgent: data.userAgent ?? '',
                        url: data.url ?? '',
                        timestamp: data.timestamp?.toMillis?.() ?? null,
                    };
                }));
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : String(err));
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [authorized]);

    const now = Date.now();
    const countSince = (ms: number) => rows.filter(r => r.timestamp && r.timestamp > now - ms).length;

    return (
        <div className="min-h-screen w-full bg-[var(--color-board)] text-[rgb(var(--color-fg))]/85 px-5 py-6 overflow-y-auto">
            <div className="max-w-2xl mx-auto">
                <button
                    onClick={onBackToGame}
                    className="text-xs ui text-[rgb(var(--color-fg))]/50 hover:text-[rgb(var(--color-fg))]/80 transition-colors mb-4"
                >
                    ← Back to game
                </button>
                <h1 className="text-2xl chalk text-[var(--color-gold)] mb-4">Error Reports</h1>

                {loading && <p className="text-sm ui text-[rgb(var(--color-fg))]/50">Loading…</p>}
                {!loading && authorized === false && (
                    <p className="text-sm ui text-[rgb(var(--color-fg))]/60">Not authorized.</p>
                )}
                {error && <p className="text-sm ui text-red-400">{error}</p>}

                {!loading && authorized && (
                    <>
                        <div className="flex gap-3 mb-6">
                            {([['1h', 3_600_000], ['6h', 21_600_000], ['24h', 86_400_000]] as const).map(([label, ms]) => (
                                <div key={label} className="flex-1 rounded-xl border border-[rgb(var(--color-fg))]/10 bg-[rgb(var(--color-fg))]/[0.03] px-3 py-2 text-center">
                                    <div className="text-xl ui font-semibold text-[rgb(var(--color-fg))]/85">{countSince(ms)}</div>
                                    <div className="text-[10px] ui text-[rgb(var(--color-fg))]/40 uppercase tracking-widest">last {label}</div>
                                </div>
                            ))}
                        </div>

                        {rows.length === 0 && (
                            <p className="text-sm ui text-[rgb(var(--color-fg))]/50">No error reports. Quiet is good.</p>
                        )}
                        <div className="space-y-3">
                            {rows.map(r => (
                                <details key={r.id} className="rounded-xl border border-[rgb(var(--color-fg))]/10 bg-[rgb(var(--color-fg))]/[0.03] px-3 py-2">
                                    <summary className="cursor-pointer text-sm ui text-[rgb(var(--color-fg))]/80">
                                        <span className="text-[10px] text-[rgb(var(--color-fg))]/40 mr-2">
                                            {r.timestamp ? new Date(r.timestamp).toLocaleString() : '—'}
                                        </span>
                                        {r.message.slice(0, 120)}
                                    </summary>
                                    <div className="mt-2 text-[11px] ui text-[rgb(var(--color-fg))]/55 space-y-1 break-all">
                                        <p><span className="text-[rgb(var(--color-fg))]/35">source:</span> {r.source}</p>
                                        <p><span className="text-[rgb(var(--color-fg))]/35">url:</span> {r.url}</p>
                                        <p><span className="text-[rgb(var(--color-fg))]/35">ua:</span> {r.userAgent}</p>
                                        {r.stack && <pre className="whitespace-pre-wrap text-[10px] text-[rgb(var(--color-fg))]/45">{r.stack}</pre>}
                                    </div>
                                </details>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
