/**
 * Render a duration as "12.34s" under one minute, "Nm SSs" above.
 *
 * Shared by the speedrun leaderboard and any other surface that displays
 * a stopwatch result — keeps formatting consistent across the app.
 */
export function formatTime(ms: number): string {
    const totalSeconds = ms / 1000;
    if (totalSeconds < 60) return `${totalSeconds.toFixed(2)}s`;
    const m = Math.floor(totalSeconds / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${m}m ${s.toString().padStart(2, '0')}s`;
}
