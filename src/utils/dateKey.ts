/**
 * Zero-padded YYYY-MM-DD calendar key in the local timezone.
 *
 * Centralised so date comparisons across stats, daily-challenge gating,
 * and one-shot per-day flourishes all agree on the same string shape —
 * lexicographic order matches calendar order, which prior code relied
 * on but reinvented per-file.
 */
export function todayKey(date: Date = new Date()): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
