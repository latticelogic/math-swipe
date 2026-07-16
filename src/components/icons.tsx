/**
 * icons.tsx — tiny shared hand-drawn glyphs for inline use (stat labels,
 * HUD chips, lock overlays). Replaces the last raw OS emoji in the UI
 * chrome (🔥🎯✅📅🛡️⚡🔒) so the chalk aesthetic holds end to end.
 *
 * All 24×24 viewBox, currentColor, round caps — same language as
 * CategoryIcon / RankIcon / AchievementBadge.
 */

interface P {
    size?: number;
    className?: string;
}

const base = (size: number, className?: string) => ({
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true as const,
});

export function FlameIcon({ size = 14, className }: P) {
    return (
        <svg {...base(size, className)}>
            <path d="M12 3 C 12 8 7 9 7 14 C 7 18 9 21 12 21 C 15 21 17 18 17 14 C 17 11 14 10 14 7 C 13 8.5 12.5 9 12 3 Z" />
        </svg>
    );
}

export function TargetIcon({ size = 14, className }: P) {
    return (
        <svg {...base(size, className)}>
            <circle cx="12" cy="12" r="8" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="12" cy="12" r="0.5" />
        </svg>
    );
}

export function CheckIcon({ size = 14, className }: P) {
    return (
        <svg {...base(size, className)}>
            <path d="M5 12 l4 4 l10 -10" />
        </svg>
    );
}

export function CalendarIcon({ size = 14, className }: P) {
    return (
        <svg {...base(size, className)}>
            <rect x="4" y="5" width="16" height="15" rx="2" />
            <line x1="8" y1="3" x2="8" y2="7" />
            <line x1="16" y1="3" x2="16" y2="7" />
            <line x1="4" y1="10" x2="20" y2="10" />
        </svg>
    );
}

export function ShieldIcon({ size = 14, className }: P) {
    return (
        <svg {...base(size, className)}>
            <path d="M12 3 L 19 6 C 19 12 17 17.5 12 20.5 C 7 17.5 5 12 5 6 Z" />
            <path d="M9.5 12 l2 2 l3.5 -4" />
        </svg>
    );
}

export function BoltIcon({ size = 14, className }: P) {
    return (
        <svg {...base(size, className)}>
            <path d="M13.5 3 L 6.5 13 L 11 13 L 9.5 21 L 17.5 10.5 L 12.7 10.5 Z" />
        </svg>
    );
}

export function LockIcon({ size = 12, className }: P) {
    return (
        <svg {...base(size, className)}>
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11 V 7 a 4 4 0 0 1 8 0 v 4" />
        </svg>
    );
}
