/**
 * UsernameClaim — small Me-tab widget for owning a unique @handle.
 *
 * Three render states:
 *   1. Anonymous user             → "Sign in to claim @username" (link to
 *                                   the existing Google/email link UI above)
 *   2. Signed in, no claim yet    → input + "Claim @handle" button with
 *                                   live availability check
 *   3. Already claimed            → "@handle ✓ — change" allows release
 *                                   + re-claim of a different slug
 *
 * Claims are transactional in Firestore — the underlying utility will
 * release the previous slug atomically when the user changes handles.
 */

import { useEffect, useRef, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import {
    claimUsername, isSlugAvailable, normalizeSlug, validateSlug,
    type ClaimResult,
} from '../utils/username';

interface Props {
    uid: string | null;
    isAnonymous: boolean;
    /** Suggested seed for the input (typically the displayName). */
    suggestion: string;
    /** Called after a successful claim so the parent can refetch the user
     *  doc / update local state. Optional. */
    onClaimed?: (slug: string) => void;
}

type Availability = 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'reserved' | 'too-short' | 'too-long';

export function UsernameClaim({ uid, isAnonymous, suggestion, onClaimed }: Props) {
    const [currentClaim, setCurrentClaim] = useState<string | null>(null);
    const [editing, setEditing] = useState(false);
    const [input, setInput] = useState(normalizeSlug(suggestion));

    // One-shot fetch of the user's current claim. Cheap (single doc) and
    // we don't need realtime updates here.
    useEffect(() => {
        if (!uid) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setCurrentClaim(null);
            return;
        }
        let cancelled = false;
        getDoc(doc(db, 'users', uid)).then(snap => {
            if (cancelled) return;
            const claim = snap.exists() ? (snap.data().username as string | undefined) : undefined;
            setCurrentClaim(claim ?? null);
        }).catch(() => { /* silent */ });
        return () => { cancelled = true; };
    }, [uid]);
    const [availability, setAvailability] = useState<Availability>('idle');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const slug = normalizeSlug(input);

    // Debounced availability check whenever the user types
    useEffect(() => {
        if (!editing || !uid) return;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        const validation = validateSlug(slug);
        if (validation) {
            // 'unauthorized' isn't possible from a syntactic check (it's
            // claim-time only), so narrow it away for the Availability type.
            const a: Availability = validation === 'unauthorized' ? 'invalid' : validation;
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setAvailability(a);
            return;
        }
        if (slug === currentClaim) {
            setAvailability('available');
            return;
        }
        setAvailability('checking');
        debounceRef.current = setTimeout(async () => {
            const ok = await isSlugAvailable(slug, uid);
            setAvailability(ok ? 'available' : 'taken');
        }, 350);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [slug, editing, uid, currentClaim]);

    if (isAnonymous || !uid) {
        // State 1 — encourage sign-in
        return (
            <div className="text-[10px] ui text-[rgb(var(--color-fg))]/40 mt-1 text-center">
                Sign in above to claim a unique @handle
            </div>
        );
    }

    if (!editing) {
        // State 3a — claimed and idle
        if (currentClaim) {
            return (
                <div className="flex items-center gap-2 mt-1 text-[11px] ui text-[rgb(var(--color-fg))]/55">
                    <span className="text-[var(--color-gold)]">@{currentClaim}</span>
                    <span className="text-[var(--color-correct)]">✓</span>
                    <button
                        onClick={() => { setInput(currentClaim); setEditing(true); setError(null); }}
                        className="text-[10px] text-[rgb(var(--color-fg))]/30 hover:text-[rgb(var(--color-fg))]/60 transition-colors"
                    >
                        change
                    </button>
                </div>
            );
        }
        // State 2a — no claim yet, show CTA
        return (
            <button
                onClick={() => { setEditing(true); setInput(normalizeSlug(suggestion)); setError(null); }}
                className="mt-1 text-[11px] ui text-[var(--color-gold)]/70 hover:text-[var(--color-gold)] transition-colors flex items-center gap-1.5"
            >
                {/* Sparkle — hand-drawn, replaces ✨ emoji */}
                <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M12 3 L 13.5 10.5 L 21 12 L 13.5 13.5 L 12 21 L 10.5 13.5 L 3 12 L 10.5 10.5 Z" />
                </svg>
                <span>Claim a @username</span>
            </button>
        );
    }

    const submitDisabled = availability !== 'available' || busy;

    async function submit() {
        if (!uid || submitDisabled) return;
        setBusy(true);
        setError(null);
        const result: ClaimResult = await claimUsername(uid, isAnonymous, slug);
        setBusy(false);
        if (result.ok && result.slug) {
            setCurrentClaim(result.slug);
            onClaimed?.(result.slug);
            setEditing(false);
        } else {
            setError(errorMessage(result.error));
            // Re-check availability so the inline status reflects the failure
            if (result.error === 'taken') setAvailability('taken');
        }
    }

    return (
        <div className="mt-2 flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-1">
                <span className="text-xs ui text-[rgb(var(--color-fg))]/40">@</span>
                <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') void submit(); if (e.key === 'Escape') setEditing(false); }}
                    maxLength={20}
                    autoFocus
                    autoCapitalize="none"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="your_handle"
                    className="bg-transparent border-b border-[var(--color-chalk)]/30 text-sm ui text-[rgb(var(--color-fg))]/80 outline-none w-32 py-0.5"
                />
                <AvailabilityHint state={availability} />
            </div>
            <div className="flex items-center gap-2 text-[10px] ui">
                <button
                    onClick={() => void submit()}
                    disabled={submitDisabled}
                    className="text-[var(--color-gold)] disabled:text-[rgb(var(--color-fg))]/20 disabled:cursor-not-allowed"
                >
                    {busy ? 'Claiming…' : 'Claim'}
                </button>
                <button
                    onClick={() => { setEditing(false); setError(null); }}
                    className="text-[rgb(var(--color-fg))]/30 hover:text-[rgb(var(--color-fg))]/60 transition-colors"
                >
                    cancel
                </button>
            </div>
            {error && (
                <div className="text-[10px] ui text-[var(--color-wrong)]">{error}</div>
            )}
        </div>
    );
}

function AvailabilityHint({ state }: { state: Availability }) {
    switch (state) {
        case 'available': return <span className="text-[10px] text-[var(--color-correct)]">✓</span>;
        case 'taken':     return <span className="text-[10px] text-[var(--color-wrong)]">taken</span>;
        case 'reserved':  return <span className="text-[10px] text-[var(--color-wrong)]">reserved</span>;
        case 'too-short': return <span className="text-[10px] text-[rgb(var(--color-fg))]/40">3+ chars</span>;
        case 'too-long':  return <span className="text-[10px] text-[rgb(var(--color-fg))]/40">≤20 chars</span>;
        case 'invalid':   return <span className="text-[10px] text-[rgb(var(--color-fg))]/40">letters / numbers / _</span>;
        case 'checking':  return <span className="text-[10px] text-[rgb(var(--color-fg))]/40 animate-pulse">…</span>;
        default:          return null;
    }
}

function errorMessage(code: ClaimResult['error']): string {
    switch (code) {
        case 'taken':        return 'That @handle is already taken.';
        case 'reserved':     return 'That @handle is reserved.';
        case 'too-short':    return 'Handle must be at least 3 characters.';
        case 'too-long':     return 'Handle must be 20 characters or fewer.';
        case 'unauthorized': return 'Sign in (Google or email) to claim a handle.';
        case 'invalid':
        default:             return 'Use only letters, numbers, and underscore.';
    }
}
