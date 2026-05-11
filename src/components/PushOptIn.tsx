/**
 * Push notification opt-in panel for the Me tab.
 *
 * Two toggles: daily reminder + you-got-beaten alert. Both share the same
 * underlying push subscription — toggling either to ON triggers the
 * permission ask if needed; turning both OFF unsubscribes entirely.
 *
 * Three render states:
 *   1. `available: false`   → subdued "Notifications coming soon" hint
 *      (VAPID key not configured in env, or browser doesn't support push)
 *   2. `granted: false`     → CTA button to enable + permission ask
 *   3. `granted: true`      → both toggles active, individually controllable
 */

import { useEffect, useState, useCallback } from 'react';
import {
    enablePush, disablePush, updatePushPreferences, getPushStatus,
    isPushConfigured, type PushStatus,
} from '../utils/push';

interface Props {
    uid: string | null;
}

export function PushOptIn({ uid }: Props) {
    const [status, setStatus] = useState<PushStatus | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        let cancelled = false;
        getPushStatus(uid).then(s => { if (!cancelled) setStatus(s); });
        return () => { cancelled = true; };
    }, [uid]);

    const handleEnable = useCallback(async (initialPrefs: { dailyEnabled?: boolean; pingsEnabled?: boolean }) => {
        if (!uid || busy) return;
        setBusy(true);
        try {
            const next = await enablePush(uid, { dailyEnabled: true, pingsEnabled: true, ...initialPrefs });
            setStatus(next);
        } catch (err) {
            console.warn('Push enable failed:', err);
        } finally {
            setBusy(false);
        }
    }, [uid, busy]);

    const handleToggle = useCallback(async (key: 'dailyEnabled' | 'pingsEnabled', value: boolean) => {
        if (!uid || !status?.granted || busy) return;
        setBusy(true);
        const nextPrefs = { ...status.prefs, [key]: value };
        try {
            await updatePushPreferences(uid, nextPrefs);
            setStatus({ ...status, prefs: nextPrefs });
            // If both are off, fully unsubscribe — keeps Cloud Function reads
            // efficient (it only iterates subscribed users).
            if (!nextPrefs.dailyEnabled && !nextPrefs.pingsEnabled) {
                await disablePush(uid);
                setStatus({ ...status, granted: true, prefs: null });
            }
        } catch (err) {
            console.warn('Push pref update failed:', err);
        } finally {
            setBusy(false);
        }
    }, [uid, status, busy]);

    if (!uid) return null;

    // State 1: not configured at all (no VAPID key OR no browser support)
    if (!status || !isPushConfigured()) {
        return (
            <div className="w-full max-w-sm mt-6 px-1">
                <div className="text-sm ui text-[rgb(var(--color-fg))]/50 uppercase tracking-widest text-center mb-2">
                    NOTIFICATIONS
                </div>
                <p className="text-[10px] ui text-[rgb(var(--color-fg))]/30 text-center">
                    Coming soon — turn on daily reminders and "you got beaten" alerts.
                </p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-sm mt-6 px-1">
            <div className="text-sm ui text-[rgb(var(--color-fg))]/50 uppercase tracking-widest text-center mb-3">
                NOTIFICATIONS
            </div>

            {!status.granted ? (
                <button
                    onClick={() => handleEnable({ dailyEnabled: true, pingsEnabled: true })}
                    disabled={busy}
                    className="w-full py-3 rounded-xl border border-[var(--color-gold)]/30 bg-[var(--color-gold)]/5 text-sm ui text-[var(--color-gold)] hover:bg-[var(--color-gold)]/10 transition-colors active:scale-95 disabled:opacity-60"
                >
                    🔔 {busy ? 'Asking…' : 'Turn on notifications'}
                </button>
            ) : (
                <div className="space-y-2">
                    <ToggleRow
                        label="🔥 Daily streak reminder"
                        sub="Once a day if you haven't played yet"
                        on={!!status.prefs?.dailyEnabled}
                        busy={busy}
                        onChange={v => handleToggle('dailyEnabled', v)}
                    />
                    <ToggleRow
                        label="⚔️ You got beaten"
                        sub="When someone bumps you on the leaderboard"
                        on={!!status.prefs?.pingsEnabled}
                        busy={busy}
                        onChange={v => handleToggle('pingsEnabled', v)}
                    />
                </div>
            )}
        </div>
    );
}

function ToggleRow({ label, sub, on, busy, onChange }: { label: string; sub: string; on: boolean; busy: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            onClick={() => onChange(!on)}
            disabled={busy}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-[rgb(var(--color-fg))]/10 hover:border-[rgb(var(--color-fg))]/25 transition-colors text-left disabled:opacity-60"
            aria-pressed={on}
        >
            <div className="flex-1 min-w-0">
                <div className="text-sm ui text-[rgb(var(--color-fg))]/80">{label}</div>
                <div className="text-[10px] ui text-[rgb(var(--color-fg))]/40 leading-tight">{sub}</div>
            </div>
            <div
                className={`w-9 h-5 rounded-full relative transition-colors ${on ? 'bg-[var(--color-gold)]' : 'bg-[rgb(var(--color-fg))]/15'}`}
                aria-hidden
            >
                <div
                    className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                    style={{ transform: on ? 'translateX(18px)' : 'translateX(2px)' }}
                />
            </div>
        </button>
    );
}
