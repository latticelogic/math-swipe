/**
 * TrailIcon — hand-drawn swatches for the swipe-trail picker. Replaces the
 * raw OS emoji (🖍️🌈🔥⚡☄️) that broke the chalk aesthetic. Keyed by trail
 * id from utils/trails.ts; same stroke language as CategoryIcon.
 */

interface Props {
    id: string;
    size?: number;
    className?: string;
}

export function TrailIcon({ id, size = 24, className }: Props) {
    const p = {
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.8,
        strokeLinecap: 'round' as const,
        strokeLinejoin: 'round' as const,
        className,
        'aria-hidden': true,
    };
    switch (id) {
        case 'chalk-dust':
            // A chalk stroke trailing dust specks
            return (
                <svg {...p}>
                    <path d="M4 17 C 9 15 14 10 19 6" />
                    <circle cx="7" cy="13.5" r="0.7" fill="currentColor" stroke="none" />
                    <circle cx="11" cy="14.5" r="0.6" fill="currentColor" stroke="none" opacity="0.7" />
                    <circle cx="14" cy="10" r="0.6" fill="currentColor" stroke="none" opacity="0.7" />
                    <circle cx="9" cy="10.5" r="0.5" fill="currentColor" stroke="none" opacity="0.5" />
                </svg>
            );
        case 'rainbow':
            // Triple arc
            return (
                <svg {...p}>
                    <path d="M4 17 C 4 10.5 7.5 7 12 7 C 16.5 7 20 10.5 20 17" />
                    <path d="M7 17 C 7 12.3 9 10 12 10 C 15 10 17 12.3 17 17" opacity="0.7" />
                    <path d="M10 17 C 10 14 10.8 13 12 13 C 13.2 13 14 14 14 17" opacity="0.45" />
                </svg>
            );
        case 'fire':
            // Flame
            return (
                <svg {...p}>
                    <path d="M12 4 C 12 9 7 10 7 15 C 7 18.5 9 20.5 12 20.5 C 15 20.5 17 18.5 17 15 C 17 12 14 11 14 8 C 13 9.5 12.5 10 12 4 Z" />
                    <path d="M10.5 16.5 C 10.5 14.8 12 13.6 12 12 C 12 13.6 13.5 14.8 13.5 16.5" opacity="0.6" />
                </svg>
            );
        case 'lightning':
            // Bolt
            return (
                <svg {...p}>
                    <path d="M13.5 3 L 6.5 13 L 11 13 L 9.5 21 L 17.5 10.5 L 12.7 10.5 Z" />
                </svg>
            );
        case 'pro-comet':
            // Comet — head + streaking tail
            return (
                <svg {...p}>
                    <circle cx="16.5" cy="7.5" r="3" />
                    <path d="M13.8 10 L 4 20" />
                    <path d="M12.5 7.5 L 6 13.5" opacity="0.6" />
                    <path d="M16 11 L 9.5 17.5" opacity="0.6" />
                </svg>
            );
        default:
            // Fallback — plain stroke
            return (
                <svg {...p}>
                    <path d="M4 17 C 9 15 14 10 19 6" />
                </svg>
            );
    }
}
