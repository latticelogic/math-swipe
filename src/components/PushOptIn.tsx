/**
 * Push notification opt-in — rendered inside SettingsSheet as one of the
 * consistent setting rows (label left, control right). One master
 * "Notifications" toggle governs the push subscription; when it's on, two
 * sub-preferences appear beneath it (daily reminder + you-got-beaten). All
 * three share the same underlying subscription — turning the master off (or
 * both sub-prefs off) unsubscribes entirely, which keeps the Cloud Function
 * reads efficient (it only iterates subscribed users).
 *
 * Render states:
 *   1. not configured (no VAPID key / no browser support) → muted row, no control
 *   2. not granted → master row with an OFF toggle; tapping asks permission
 *   3. granted → master row (ON) + the two sub-preference rows
 */

import { useEffect, useState, useCallback } from 'react';
import {
    enablePush, disablePush, updatePushPreferences, getPushStatus,
    isPushConfigured, type PushStatus,
} from '../utils/push';
import { t } from '../i18n';

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

    const handleEnable = useCallback(async () => {
        if (!uid || busy) return;
        setBusy(true);
        try {
            const next = await enablePush(uid, { dailyEnabled: true, pingsEnabled: true });
            setStatus(next);
        } catch (err) {
            console.warn('Push enable failed:', err);
        } finally {
            setBusy(false);
        }
    }, [uid, busy]);

    const handleDisable = useCallback(async () => {
        if (!uid || busy) return;
        setBusy(true);
        try {
            await disablePush(uid);
            setStatus(s => (s ? { ...s, granted: true, prefs: null } : s));
        } catch (err) {
            console.warn('Push disable failed:', err);
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
            // Both off → fully unsubscribe (keeps the notifier's reads cheap).
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

    const rowBase = 'w-full flex items-center justify-between gap-3 px-4 py-3';
    const label = <span className="text-sm ui text-[rgb(var(--color-fg))]/80">{t('settings.notifications')}</span>;

    // State 1: not configured (no VAPID key OR no browser support)
    if (!status || !isPushConfigured()) {
        return (
            <div className={`${rowBase} rounded-xl border border-[rgb(var(--color-fg))]/10`}>
                {label}
                <span className="text-[10px] ui text-[rgb(var(--color-fg))]/30 uppercase tracking-widest">Soon</span>
            </div>
        );
    }

    // State 2: configured but permission not yet granted
    if (!status.granted) {
        return (
            <button
                onClick={handleEnable}
                disabled={busy}
                role="switch"
                aria-checked={false}
                className={`${rowBase} rounded-xl border border-[rgb(var(--color-fg))]/10 hover:border-[rgb(var(--color-fg))]/25 transition-colors disabled:opacity-60`}
            >
                {label}
                <Toggle on={false} />
            </button>
        );
    }

    // State 3: granted — master row + sub-preferences when on
    const masterOn = !!(status.prefs?.dailyEnabled || status.prefs?.pingsEnabled);
    return (
        <div className="rounded-xl border border-[rgb(var(--color-fg))]/10 overflow-hidden">
            <button
                onClick={() => (masterOn ? handleDisable() : handleEnable())}
                disabled={busy}
                role="switch"
                aria-checked={masterOn}
                className={`${rowBase} hover:bg-[rgb(var(--color-fg))]/[0.03] transition-colors disabled:opacity-60`}
            >
                {label}
                <Toggle on={masterOn} />
            </button>
            {masterOn && (
                <div className="border-t border-[rgb(var(--color-fg))]/10">
                    <SubRow
                        label="Daily streak reminder"
                        sub="Once a day if you haven't played yet"
                        on={!!status.prefs?.dailyEnabled}
                        busy={busy}
                        onChange={v => handleToggle('dailyEnabled', v)}
                    />
                    <SubRow
                        label="You got beaten"
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

/** Indented sub-preference row (label + hint left, toggle right). */
function SubRow({ label, sub, on, busy, onChange }: { label: string; sub: string; on: boolean; busy: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            onClick={() => onChange(!on)}
            disabled={busy}
            className="w-full flex items-center gap-3 pl-5 pr-4 py-2.5 hover:bg-[rgb(var(--color-fg))]/[0.03] transition-colors text-left disabled:opacity-60"
            role="switch"
            aria-checked={on}
        >
            <div className="flex-1 min-w-0">
                <div className="text-sm ui text-[rgb(var(--color-fg))]/70">{label}</div>
                <div className="text-[10px] ui text-[rgb(var(--color-fg))]/40 leading-tight">{sub}</div>
            </div>
            <Toggle on={on} small />
        </button>
    );
}

/** Pill toggle — mirrors SettingsSheet's so every control reads the same.
 *  `small` variant for the subordinate preference rows. */
function Toggle({ on, small }: { on: boolean; small?: boolean }) {
    if (small) {
        return (
            <span className={`relative w-9 h-5 rounded-full shrink-0 transition-colors ${on ? 'bg-[var(--color-gold)]/70' : 'bg-[rgb(var(--color-fg))]/15'}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-[var(--color-board)] transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
            </span>
        );
    }
    return (
        <span className={`relative w-10 h-6 rounded-full shrink-0 transition-colors ${on ? 'bg-[var(--color-gold)]/70' : 'bg-[rgb(var(--color-fg))]/15'}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-[var(--color-board)] transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
        </span>
    );
}
