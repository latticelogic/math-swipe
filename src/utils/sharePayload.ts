/**
 * utils/sharePayload.ts
 *
 * The one composer for the social share text + URL (the Wordle-style
 * artifact: headline, 🟩🟥 result grid, challenge/profile link). Extracted
 * from SessionSummary so BOTH share surfaces speak the same language:
 *
 *   - SessionSummary's "Share" (end-of-run modal)
 *   - the game-rail share button (ActionButtons via App), which previously
 *     shared a generic "Try this mental-math game." even mid-run — tester
 *     report: the run's score/streak never showed up.
 *
 * Share-text emoji are the allowed exception to the no-emoji rule (they ARE
 * the share artifact — see CLAUDE.md).
 */

import { createChallengeId } from './dailyChallenge';

/** Short, human-readable date stamp for the daily-challenge share card.
 *  "May 12" — used as a Wordle-style conversation hook so the artifact
 *  signals *which* daily was solved. */
export function shortDateStamp(): string {
    return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatTime(ms: number): string {
    const totalSeconds = ms / 1000;
    if (totalSeconds < 60) return `${totalSeconds.toFixed(2)}s`;
    const m = Math.floor(totalSeconds / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${m}m ${s}s`;
}

/** Everything buildSharePayload needs — also the shape App snapshots when a
 *  session is banked, so a finished run stays shareable from the rail button
 *  after the player wanders to another tab. */
export interface SharePayloadArgs {
    xp: number;
    streak: number;
    accuracy: number;
    history: boolean[];
    /** Full counts for re-opening a summary from a snapshot — `history` is
     *  capped at the last 50 answers, so long runs need the real totals. */
    solved?: number;
    correct?: number;
    questionType: string;
    hardMode?: boolean;
    timedMode?: boolean;
    speedrunTime?: number | null;
    profileUrl?: string | null;
}

/** Compose the share payload + URL together so callers don't fork on URL
 *  generation. Returning both lets the modal show the URL separately (one-tap
 *  copy) while the text remains the full social-friendly caption.
 *
 *  When `profileUrl` is provided we use the profile page; otherwise we fall
 *  back to a one-shot challenge URL. The profile route is the better hook —
 *  visitors see the brag *before* the math screen, so click-through to play
 *  is higher. */
export function buildSharePayload(
    xp: number, streak: number, accuracy: number,
    history: boolean[], questionType: string,
    hardMode?: boolean, timedMode?: boolean,
    speedrunTime?: number | null,
    profileUrl?: string | null,
): { text: string; url: string } {
    const emojis = history.map(ok => ok ? '🟩' : '🟥');
    const emojiRows: string[] = [];
    for (let i = 0; i < emojis.length; i += 10) {
        emojiRows.push(emojis.slice(i, i + 10).join(''));
    }

    const typeLabel = questionType.startsWith('mix-') ? 'Mix' : questionType.charAt(0).toUpperCase() + questionType.slice(1);
    const modeTag = hardMode && timedMode ? ' 💀⏱️ ULTIMATE' : hardMode ? ' 💀 HARD' : timedMode ? ' ⏱️ TIMED' : '';
    // Punchier headlines — first line is what platforms show as preview, so make
    // it count. Leads with the score/streak/time, brand fades to second line.
    // The daily case gets a date stamp so the artifact carries social context
    // ("got the May 12") — same trick Wordle uses to make shares conversational.
    const headline = questionType === 'daily'
        ? `Math Challenge Daily · ${shortDateStamp()} — ${xp} pts, ${accuracy}% ${streak > 1 ? `, ${streak}🔥` : ''}`
        : questionType === 'speedrun' && speedrunTime
            ? `⏱️ Cleared 10 in ${formatTime(speedrunTime)} on Math Challenge`
            : accuracy === 100
                ? `💯 ${xp} pts, ${streak}🔥 — perfect run on Math Challenge${modeTag}`
                : `${xp} pts · ${streak}🔥 streak · ${accuracy}% — Math Challenge ${typeLabel}${modeTag}`;

    const url = profileUrl ?? `${window.location.origin}?c=${createChallengeId()}`;

    const text = [
        headline,
        '',
        ...emojiRows,
        '',
        `Can you beat me? 👉 ${url}`,
    ].join('\n');

    return { text, url };
}

/** Convenience overload used by App's rail share + last-session snapshot. */
export function buildSharePayloadFromArgs(a: SharePayloadArgs): { text: string; url: string } {
    return buildSharePayload(
        a.xp, a.streak, a.accuracy, a.history, a.questionType,
        a.hardMode, a.timedMode, a.speedrunTime, a.profileUrl,
    );
}
