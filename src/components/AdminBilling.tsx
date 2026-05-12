/**
 * AdminBilling — owner-only billing dashboard.
 *
 * Routed at /admin/billing. Reads `entitlements/{uid}` across all users
 * (gated by the `isAdmin` custom claim on the Firebase ID token — same
 * gate as /admin/push). Renders three blocks:
 *
 *   1. Snapshot counters: trial / paid / expired counts across the last
 *      30 days, plus implied conversion rate.
 *   2. Recent purchases list: most recent 50 paid entitlements, with
 *      timestamp, source, and partial transaction id.
 *   3. Refund-rate gauge: count of entitlements where `paidAt` was set
 *      then cleared (refunded). Surfaces the metric that most matters
 *      pre-launch — a refund rate >5% means the paywall is mis-tuned.
 *
 * Non-admins see a clean "back to game" panel. The Firestore rule
 * blocks unauthorized reads server-side so even a determined client
 * can't enumerate the collection.
 *
 * Refund detection: we look at `entitlements` for users where `paidAt`
 * is null but `originalTransactionId` is non-null — these are users
 * who paid AT LEAST ONCE (a transaction id was recorded) but where
 * the webhook later cleared paidAt to handle a refund. This matches
 * the refund-handling code path in `functions/src/stripe.ts`.
 */

import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../utils/firebase';
import { entitlementStatus, type Entitlement } from '../utils/entitlement';

interface Row {
    uid: string;
    trialStartedAt: number;
    paidAt: number | null;
    source: Entitlement['source'];
    originalTransactionId: string | null;
    updatedAt: number;
}

interface Props {
    onBackToGame: () => void;
}

export function AdminBilling({ onBackToGame }: Props) {
    const [authorized, setAuthorized] = useState<boolean | null>(null);
    const [rows, setRows] = useState<Row[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Same admin-claim check as AdminPushAnalytics. The Firestore rule
    // would reject unauthorized reads on its own; the UI check is so
    // non-admins see a "not authorized" panel instead of a fetch error.
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
        if (!authorized) {
            if (authorized === false) {
                // Defer so setState happens after the current commit
                queueMicrotask(() => setLoading(false));
            }
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                // Fetch up to 500 most-recently-updated entitlements. That's
                // a hard cap so the dashboard doesn't accidentally trigger
                // a massive read against the entire collection at scale.
                // For >500-user views, switch to server-side aggregation.
                const q = query(
                    collection(db, 'entitlements'),
                    orderBy('updatedAt', 'desc'),
                    limit(500),
                );
                const snap = await getDocs(q);
                if (cancelled) return;

                const data: Row[] = snap.docs.map(d => {
                    const v = d.data();
                    const toMs = (x: unknown): number => {
                        if (typeof x === 'number') return x;
                        if (x && typeof x === 'object' && 'toMillis' in x) {
                            return (x as { toMillis: () => number }).toMillis();
                        }
                        return 0;
                    };
                    return {
                        uid: d.id,
                        trialStartedAt: toMs(v.trialStartedAt),
                        paidAt: v.paidAt ? toMs(v.paidAt) : null,
                        source: v.source ?? null,
                        originalTransactionId: v.originalTransactionId ?? null,
                        updatedAt: toMs(v.updatedAt),
                    };
                });
                setRows(data);
                setLoading(false);
            } catch (err) {
                if (cancelled) return;
                setError(err instanceof Error ? err.message : 'Unknown error');
                setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [authorized]);

    // Wall-clock snapshot taken once per data load — same value across
    // all rows so the aggregate is stable across renders. Captured in
    // an effect (deferred to a microtask) so the memo's body stays pure
    // and we don't violate the setState-in-effect rule.
    const [snapshotAt, setSnapshotAt] = useState<number>(0);
    useEffect(() => {
        if (rows.length === 0) return;
        queueMicrotask(() => setSnapshotAt(Date.now()));
    }, [rows]);

    // ── Aggregate ──
    // useMemo runs unconditionally (must be above all early returns for
    // rules-of-hooks). The early-return branches below just read from
    // `agg` after rendering loading / unauthorized / error states.
    const agg = useMemo(() => {
        const now = snapshotAt || 0;
        let trial = 0, paid = 0, expired = 0;
        let refunded = 0; // paidAt cleared but originalTransactionId still set
        const recentPurchases: Row[] = [];

        for (const r of rows) {
            const synth: Entitlement = {
                trialStartedAt: r.trialStartedAt,
                paidAt: r.paidAt,
                source: r.source,
                originalTransactionId: r.originalTransactionId,
                updatedAt: r.updatedAt,
            };
            const s = entitlementStatus(synth, now);
            if (s === 'trial') trial++;
            else if (s === 'paid') paid++;
            else if (s === 'expired') expired++;
            if (r.paidAt === null && r.originalTransactionId) refunded++;
            if (r.paidAt && r.originalTransactionId) recentPurchases.push(r);
        }

        recentPurchases.sort((a, b) => (b.paidAt ?? 0) - (a.paidAt ?? 0));
        const topPurchases = recentPurchases.slice(0, 25);

        const decided = paid + expired + refunded;
        const conversionPct = decided > 0
            ? ((paid / decided) * 100).toFixed(2)
            : '—';
        const refundPct = (paid + refunded) > 0
            ? ((refunded / (paid + refunded)) * 100).toFixed(1)
            : '—';

        return { trial, paid, expired, refunded, topPurchases, conversionPct, refundPct };
    }, [rows, snapshotAt]);

    if (authorized === null || loading) {
        return (
            <div className="min-h-screen w-full bg-[var(--color-board)] flex items-center justify-center">
                <div className="text-sm ui text-[rgb(var(--color-fg))]/50 animate-pulse">Loading…</div>
            </div>
        );
    }

    if (!authorized) {
        return (
            <div className="min-h-screen w-full bg-[var(--color-board)] flex flex-col items-center justify-center px-6 text-center">
                <h1 className="text-2xl chalk text-[var(--color-gold)] mb-3">Admin only</h1>
                <p className="text-sm ui text-[rgb(var(--color-fg))]/55 mb-6 max-w-sm leading-relaxed">
                    This page needs the <code className="text-[var(--color-gold)]/80">isAdmin</code> custom claim
                    on your Firebase Auth token. Ask the project owner.
                </p>
                <button
                    onClick={onBackToGame}
                    className="px-4 py-2 rounded-xl border border-[rgb(var(--color-fg))]/15 text-sm ui text-[rgb(var(--color-fg))]/60 hover:text-[rgb(var(--color-fg))]/85 hover:border-[rgb(var(--color-fg))]/30 transition-colors"
                >
                    Back to game
                </button>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen w-full bg-[var(--color-board)] flex flex-col items-center justify-center px-6 text-center">
                <h1 className="text-xl chalk text-[var(--color-wrong)] mb-2">Read failed</h1>
                <p className="text-xs ui text-[rgb(var(--color-fg))]/45 mb-6 font-mono">{error}</p>
                <button onClick={onBackToGame} className="text-sm ui text-[rgb(var(--color-fg))]/60 underline">Back</button>
            </div>
        );
    }

    const { trial, paid, expired, refunded, topPurchases, conversionPct, refundPct } = agg;

    return (
        <div className="min-h-screen w-full bg-[var(--color-board)] text-[rgb(var(--color-fg))]/85 px-5 py-6 overflow-y-auto">
            <div className="max-w-3xl mx-auto">
                <button
                    onClick={onBackToGame}
                    className="text-xs ui text-[rgb(var(--color-fg))]/50 hover:text-[rgb(var(--color-fg))]/80 transition-colors mb-4 flex items-center gap-1.5"
                >
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M15 18 L 9 12 L 15 6" />
                    </svg>
                    Back
                </button>

                <h1 className="text-3xl chalk text-[var(--color-gold)] mb-1">Billing</h1>
                <p className="text-xs ui text-[rgb(var(--color-fg))]/40 mb-6">
                    {rows.length} entitlements · most-recent 500 · refresh page for latest
                </p>

                {/* Headline counters */}
                <div className="grid grid-cols-3 gap-3 mb-8">
                    <Stat label="Trial" value={trial.toString()} tint="default" />
                    <Stat label="Paid" value={paid.toString()} tint="gold" />
                    <Stat label="Expired" value={expired.toString()} tint="muted" />
                </div>

                {/* Conversion + refund */}
                <div className="grid grid-cols-2 gap-3 mb-8">
                    <Stat
                        label="Conversion"
                        sub={`paid / (paid + expired + refunded)`}
                        value={conversionPct === '—' ? '—' : `${conversionPct}%`}
                        tint="gold"
                    />
                    <Stat
                        label="Refund rate"
                        sub={refunded > 0
                            ? `${refunded} refunded — flag if >5%`
                            : 'no refunds yet'}
                        value={refundPct === '—' ? '—' : `${refundPct}%`}
                        tint={Number(refundPct) > 5 ? 'wrong' : 'default'}
                    />
                </div>

                {/* Recent purchases */}
                <h2 className="text-sm ui font-semibold text-[var(--color-gold)] uppercase tracking-widest mb-3">
                    Recent purchases
                </h2>
                {topPurchases.length === 0 ? (
                    <p className="text-sm ui text-[rgb(var(--color-fg))]/40 italic mb-6">No purchases yet.</p>
                ) : (
                    <div className="border border-[rgb(var(--color-fg))]/10 rounded-2xl overflow-hidden mb-6">
                        <table className="w-full text-xs ui">
                            <thead className="bg-[rgb(var(--color-fg))]/[0.04] text-[rgb(var(--color-fg))]/50 text-left">
                                <tr>
                                    <th className="px-3 py-2 font-semibold">When</th>
                                    <th className="px-3 py-2 font-semibold">User</th>
                                    <th className="px-3 py-2 font-semibold">Source</th>
                                    <th className="px-3 py-2 font-semibold">Transaction</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topPurchases.map(p => (
                                    <tr key={p.uid} className="border-t border-[rgb(var(--color-fg))]/8 hover:bg-[rgb(var(--color-fg))]/[0.02]">
                                        <td className="px-3 py-2 text-[rgb(var(--color-fg))]/75 tabular-nums">
                                            {p.paidAt ? new Date(p.paidAt).toLocaleString() : '—'}
                                        </td>
                                        <td className="px-3 py-2 text-[rgb(var(--color-fg))]/55 font-mono">
                                            {p.uid.slice(0, 8)}…
                                        </td>
                                        <td className="px-3 py-2 text-[rgb(var(--color-fg))]/65 capitalize">
                                            {p.source ?? '—'}
                                        </td>
                                        <td className="px-3 py-2 text-[rgb(var(--color-fg))]/45 font-mono">
                                            {p.originalTransactionId
                                                ? p.originalTransactionId.slice(0, 16) + '…'
                                                : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <p className="text-[10px] ui text-[rgb(var(--color-fg))]/30 leading-relaxed">
                    Dashboard reads from <code>entitlements/</code> Firestore collection. Refunds are
                    detected by <code>paidAt === null && originalTransactionId !== null</code> —
                    the Stripe webhook clears <code>paidAt</code> on a refund event but keeps the
                    transaction id for audit. For per-user investigation, use
                    <code className="ml-1">gcloud firestore documents read</code> with the uid above.
                </p>
            </div>
        </div>
    );
}

function Stat({ label, value, sub, tint }: {
    label: string;
    value: string;
    sub?: string;
    tint?: 'default' | 'gold' | 'muted' | 'wrong';
}) {
    const color =
        tint === 'gold' ? 'text-[var(--color-gold)]' :
        tint === 'wrong' ? 'text-[var(--color-wrong)]' :
        tint === 'muted' ? 'text-[rgb(var(--color-fg))]/40' :
        'text-[rgb(var(--color-fg))]/80';
    return (
        <div className="bg-[rgb(var(--color-fg))]/[0.03] border border-[rgb(var(--color-fg))]/8 rounded-2xl px-4 py-3">
            <div className={`text-3xl chalk tabular-nums ${color} leading-none`}>{value}</div>
            <div className="text-[10px] ui text-[rgb(var(--color-fg))]/50 uppercase tracking-widest mt-2">{label}</div>
            {sub && <div className="text-[9px] ui text-[rgb(var(--color-fg))]/30 mt-1 leading-tight">{sub}</div>}
        </div>
    );
}
