/**
 * Teacher character contract.
 *
 * Each teacher is a self-contained module exporting a `Teacher` object: the
 * portrait renderer + the voice (message pools) + the unlock/context rules.
 * The renderer composes shared face primitives with a teacher-unique silhouette
 * so each character reads as a *distinct person* even at the same 72×115 size.
 */

import type { ReactNode } from 'react';
import type { ChalkState } from '../../../engine/domain';
import type { ChalkMessageOverrides } from '../../../utils/chalkMessages';
import type { Stats } from '../../../hooks/useStats';

export interface PortraitProps {
    /** Current emotional state — drives face and bonus animations. */
    state: ChalkState;
    /** Current streak — high streaks may show a small bonus element (sparkles, fire). */
    streak: number;
}

export interface UnlockRule {
    /** Short copy shown on the lock badge: "Reach Day 7", "Solve 50 hard". */
    reason: string;
    /** Pure check against the user's stats. */
    check: (stats: Stats) => boolean;
}

export interface ContextRule {
    /** Auto-swap to this teacher when the user enters speedrun. */
    whenSpeedrun?: true;
    /** Auto-swap when hard mode is on. */
    whenHardMode?: true;
    /** Auto-swap when timed mode is on. */
    whenTimedMode?: true;
    /** Auto-swap on a wrong streak (3+ wrong in a row). */
    whenStruggling?: true;
    /** Auto-swap on the Magic / Tricks tab. */
    whenMagicLesson?: true;
}

export interface Teacher {
    id: string;
    name: string;
    /** One-liner shown in the picker. */
    tagline: string;
    /** Default-on for everybody when no teacher has been chosen. Exactly one. */
    isDefault?: true;
    unlock?: UnlockRule;
    context?: ContextRule;
    voice: ChalkMessageOverrides & {
        // Teacher-flavoured base pools — when supplied, override the engine defaults
        idle?: string[];
        success?: string[];
        fail?: string[];
        streak?: string[];
        comeback?: string[];
        struggling?: string[];
    };
    /** SVG portrait — must render inside a 100×160 viewBox using currentColor strokes. */
    Portrait: (props: PortraitProps) => ReactNode;
}
