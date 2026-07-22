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
import { t, shortDateLabel } from '../i18n';

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
    /** The sharer's uid. When present it's appended as `?r=<uid>` so a
     *  recipient who opens the link becomes an attributable referral (the
     *  client reads `?r=` at boot — see utils/referral.ts). This is the only
     *  place invites actually enter circulation. */
    referrerUid?: string | null;
}

/** Append `r=<uid>` to a share URL, respecting any existing query string. */
function withReferrer(url: string, referrerUid?: string | null): string {
    if (!referrerUid) return url;
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}r=${encodeURIComponent(referrerUid)}`;
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
    referrerUid?: string | null,
): { text: string; url: string } {
    const emojis = history.map(ok => ok ? '🟩' : '🟥');
    const emojiRows: string[] = [];
    for (let i = 0; i < emojis.length; i += 10) {
        emojiRows.push(emojis.slice(i, i + 10).join(''));
    }

    // The topic tag is a game-side label (kept English as a proper-noun-ish
    // mode name); every surrounding WORD localizes to the sender's locale.
    // Emoji + digits + the "Math Challenge" brand stay in code — the catalog
    // is emoji-free by rule.
    const typeLabel = questionType.startsWith('mix-') ? 'Mix' : questionType.charAt(0).toUpperCase() + questionType.slice(1);
    const modeTag = hardMode && timedMode ? ` 💀⏱️ ${t('share.ultimate')}` : hardMode ? ` 💀 ${t('share.hard')}` : timedMode ? ` ⏱️ ${t('share.timed')}` : '';
    const streakFire = `${streak}🔥`;
    // Punchier headlines — first line is what platforms show as preview, so make
    // it count. Leads with the score/streak/time, brand fades to second line.
    // The daily case gets a date stamp so the artifact carries social context
    // — same trick Wordle uses to make shares conversational.
    const headline = questionType === 'daily'
        ? t('share.daily', { date: shortDateLabel(), xp, accuracy }) + (streak > 1 ? `, ${streak}🔥` : '')
        : questionType === 'speedrun' && speedrunTime
            ? `⏱️ ${t('share.speedrun', { time: formatTime(speedrunTime) })}`
            : accuracy === 100
                ? `💯 ${t('share.perfect', { xp, streak: streakFire })}${modeTag}`
                : `${t('share.standard', { xp, streak: streakFire, accuracy, topic: typeLabel })}${modeTag}`;

    const url = withReferrer(profileUrl ?? `${window.location.origin}?c=${createChallengeId()}`, referrerUid);

    const text = [
        headline,
        '',
        ...emojiRows,
        '',
        t('share.cta', { arrow: '👉', url }),
    ].join('\n');

    return { text, url };
}

/** Convenience overload used by App's rail share + last-session snapshot. */
export function buildSharePayloadFromArgs(a: SharePayloadArgs): { text: string; url: string } {
    return buildSharePayload(
        a.xp, a.streak, a.accuracy, a.history, a.questionType,
        a.hardMode, a.timedMode, a.speedrunTime, a.profileUrl,
        a.referrerUid,
    );
}
