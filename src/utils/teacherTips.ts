/**
 * utils/teacherTips.ts
 *
 * Feature discovery in the TEACHER's voice — replaces the old floating
 * banner prompts ("You're hot — try speedrun?", "Level up your X!") that
 * cluttered the board (owner call 2026-07-16). The teacher occasionally
 * mentions one thing the player hasn't been told about yet: speedruns, the
 * theme toggle, the Tables drill, swipe trails, chalk colors. Bond over
 * banners.
 *
 * Rules:
 *  - each tip is shown ONCE ever (persisted seen-set)
 *  - at most one tip per session (caller enforces via a ref)
 *  - delivered through the Teacher's existing pingMessage bubble, so it
 *    never adds UI surface
 *  - copy follows the tone bar: warm, specific, zero pressure
 */

import { safeGetItem, safeSetItem } from './safeStorage';

const SEEN_KEY = 'math-swipe-teacher-tips-seen';

export interface TeacherTipCtx {
    /** Current in-session streak. */
    streak: number;
    /** Answers this session. */
    totalAnswered: number;
    /** Lifetime solved (stats.totalSolved). */
    totalSolved: number;
    questionType: string;
}

interface TeacherTip {
    id: string;
    text: string;
    when: (ctx: TeacherTipCtx) => boolean;
}

const SPECIAL = new Set(['daily', 'challenge', 'speedrun']);

/** Ordered by priority — the first unseen tip whose moment has come wins. */
const TIPS: TeacherTip[] = [
    {
        id: 'speedrun',
        text: "You're quick today. There's a speedrun in the League tab, if you're curious.",
        when: c => c.streak >= 5 && !SPECIAL.has(c.questionType),
    },
    {
        id: 'tables',
        text: 'Want to drill just one times-table? Tap the topic button and pick Tables.',
        when: c => c.questionType === 'multiply' && c.totalAnswered >= 12,
    },
    {
        id: 'theme',
        text: 'Too bright? The moon button up top turns the board dark.',
        when: c => c.totalAnswered >= 8,
    },
    {
        id: 'trail',
        text: 'Your finger can leave a trail on the board. Pick one in the Me tab.',
        when: c => c.totalSolved >= 30 && c.totalAnswered >= 5,
    },
    {
        id: 'chalk',
        text: 'There are other chalk colors in Me. A few unlock as you go.',
        when: c => c.totalSolved >= 60 && c.totalAnswered >= 5,
    },
];

function seenSet(): Set<string> {
    try {
        return new Set(JSON.parse(safeGetItem(SEEN_KEY) ?? '[]') as string[]);
    } catch {
        return new Set();
    }
}

/** The next tip whose moment has come, or null. Does NOT mark it seen —
 *  call markTipSeen once it's actually displayed. */
export function nextTeacherTip(ctx: TeacherTipCtx): { id: string; text: string } | null {
    const seen = seenSet();
    for (const tip of TIPS) {
        if (!seen.has(tip.id) && tip.when(ctx)) return { id: tip.id, text: tip.text };
    }
    return null;
}

export function markTipSeen(id: string): void {
    const seen = seenSet();
    seen.add(id);
    safeSetItem(SEEN_KEY, JSON.stringify([...seen]));
}
