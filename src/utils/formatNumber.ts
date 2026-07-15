/**
 * utils/formatNumber.ts
 *
 * Safety-net display formatter for a numeric answer option that has no explicit
 * label. Prevents any answer from overflowing its option button:
 *   - non-terminating / long decimals are capped at 4 places (trailing zeros
 *     trimmed) — kills the "0.94444…" overflow class
 *   - very large or very small magnitudes fall back to compact / scientific
 *     notation ("1.2M", "1.5e-6") so factorials / big powers can't overflow
 *   - plain integers get thousands separators
 *
 * Options that carry an `optionLabel` (fractions like "17/18", irrationals like
 * "φ (1.618)") bypass this entirely — the label is authoritative.
 */
export function formatOptionValue(n: number): string {
    if (typeof n !== 'number' || !Number.isFinite(n)) return String(n);
    const abs = Math.abs(n);
    if (abs >= 1e6) return n.toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 });
    if (abs > 0 && abs < 1e-4) return n.toExponential(1);
    if (Number.isInteger(n)) return n.toLocaleString('en-US');
    return n.toFixed(4).replace(/\.?0+$/, '');
}

/** "1 problem" / "3 problems" — a count + a regular (-s) noun, correctly
 *  singular/plural (fixes "1 problems"). The count gets thousands separators. */
export function countLabel(n: number, singular: string): string {
    return `${n.toLocaleString('en-US')} ${singular}${n === 1 ? '' : 's'}`;
}
