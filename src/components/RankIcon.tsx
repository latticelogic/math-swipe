/**
 * RankIcon — hand-drawn chalk crests for the 11 XP ranks. Replaces the raw
 * OS emoji (🌱📚🧠🔧🧮📐🧙♟️👑🌌✨) that broke the hand-drawn aesthetic
 * (tester report: "totally not in the same style as the rest of the app").
 *
 * Same stroke language as CategoryIcon / AchievementBadge: currentColor,
 * round caps, 24×24 viewBox. Keyed by rank NAME (the stable id in ranks.ts).
 */

interface Props {
    /** Rank name from ranks.ts ('Beginner' … 'Transcendent'). */
    rank: string;
    size?: number;
    className?: string;
}

export function RankIcon({ rank, size = 24, className }: Props) {
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
    switch (rank) {
        case 'Beginner':
            // Sprout — two leaves on a stem
            return (
                <svg {...p}>
                    <line x1="12" y1="21" x2="12" y2="11" />
                    <path d="M12 13 C 12 9 9 7 5 7 C 5 11 8 13 12 13 Z" />
                    <path d="M12 11 C 12 8 14.5 6 18.5 6 C 18.5 9.5 15.5 11 12 11 Z" />
                </svg>
            );
        case 'Learner':
            // Open book
            return (
                <svg {...p}>
                    <path d="M12 6 C 10 4.5 7 4 4 4 L 4 18 C 7 18 10 18.5 12 20 C 14 18.5 17 18 20 18 L 20 4 C 17 4 14 4.5 12 6 Z" />
                    <line x1="12" y1="6" x2="12" y2="20" />
                    <line x1="6.5" y1="8" x2="9.5" y2="8.5" />
                    <line x1="14.5" y1="8.5" x2="17.5" y2="8" />
                </svg>
            );
        case 'Thinker':
            // Head with a lit idea
            return (
                <svg {...p}>
                    <path d="M9 21 L 9 17 C 6.5 15.5 5 13 5 10.5 C 5 6.4 8.1 3.5 12 3.5 C 15.9 3.5 19 6.4 19 10.5 C 19 13.2 17.3 15.4 15 16.4 L 15 21" />
                    <path d="M10 10 C 10 8.6 10.9 7.8 12 7.8 C 13.1 7.8 14 8.6 14 9.8 C 14 11 12 11.4 12 13" />
                    <circle cx="12" cy="14.8" r="0.5" fill="currentColor" stroke="none" />
                </svg>
            );
        case 'Problem Solver':
            // Wrench
            return (
                <svg {...p}>
                    <path d="M14 7 C 14 4.8 15.8 3 18 3 L 15.5 5.5 L 16 8 L 18.5 8.5 L 21 6 C 21 8.2 19.2 10 17 10 C 16.5 10 16 9.9 15.6 9.7 L 7 18.3 C 6.2 19.1 4.9 19.1 4.1 18.3 C 3.3 17.5 3.3 16.2 4.1 15.4 L 12.7 6.8 C 12.5 6.4 14 7 14 7 Z" />
                </svg>
            );
        case 'Calculator':
            // Abacus frame with beads
            return (
                <svg {...p}>
                    <rect x="4" y="4" width="16" height="16" rx="2" />
                    <line x1="4" y1="9.3" x2="20" y2="9.3" />
                    <line x1="4" y1="14.6" x2="20" y2="14.6" />
                    <circle cx="8" cy="6.7" r="1.2" fill="currentColor" stroke="none" />
                    <circle cx="14" cy="12" r="1.2" fill="currentColor" stroke="none" />
                    <circle cx="10" cy="17.3" r="1.2" fill="currentColor" stroke="none" />
                </svg>
            );
        case 'Mathematician':
            // Set square + pencil line
            return (
                <svg {...p}>
                    <path d="M5 19 L 19 19 L 5 5 Z" />
                    <path d="M8 16 L 12 16 L 8 12 Z" />
                    <line x1="16" y1="4" x2="20" y2="8" />
                </svg>
            );
        case 'Wizard':
            // Wizard hat with a star
            return (
                <svg {...p}>
                    <path d="M4 19 L 20 19 C 20 19 16 17.5 15 9 L 12 4 L 9.5 9.5 C 8.5 17.5 4 19 4 19 Z" />
                    <path d="M12 12.2 L 12.7 13.8 L 14.4 14 L 13.2 15.1 L 13.5 16.8 L 12 16 L 10.5 16.8 L 10.8 15.1 L 9.6 14 L 11.3 13.8 Z" fill="currentColor" stroke="none" />
                </svg>
            );
        case 'Grandmaster':
            // Chess knight
            return (
                <svg {...p}>
                    <path d="M7 20 L 17 20 C 17 20 16.5 17.5 15.5 16.5 C 17.5 15 18.5 12.5 18 10 C 17.2 6 14 4 10.5 4 L 11.5 6 C 8.5 7 6.5 9.5 6.5 12 L 9.5 13 L 8 14.5 C 8.6 16.5 7.6 18 7 20 Z" />
                    <circle cx="11.5" cy="8.5" r="0.6" fill="currentColor" stroke="none" />
                </svg>
            );
        case 'Legend':
            // Crown
            return (
                <svg {...p}>
                    <path d="M5 17 L 4 7 L 8.5 10.5 L 12 5.5 L 15.5 10.5 L 20 7 L 19 17 Z" />
                    <line x1="5.5" y1="19.5" x2="18.5" y2="19.5" />
                    <circle cx="12" cy="12.5" r="0.8" fill="currentColor" stroke="none" />
                </svg>
            );
        case 'Mythic':
            // Ringed planet among stars
            return (
                <svg {...p}>
                    <circle cx="12" cy="12" r="5" />
                    <path d="M4.5 14.5 C 7 16.5 17 16.5 19.5 9.5" opacity="0.8" />
                    <circle cx="5" cy="6" r="0.7" fill="currentColor" stroke="none" />
                    <circle cx="19.5" cy="18.5" r="0.7" fill="currentColor" stroke="none" />
                    <path d="M18 4 L 18.4 5.1 L 19.5 5.5 L 18.4 5.9 L 18 7 L 17.6 5.9 L 16.5 5.5 L 17.6 5.1 Z" fill="currentColor" stroke="none" />
                </svg>
            );
        case 'Transcendent':
            // Radiant star
            return (
                <svg {...p}>
                    <path d="M12 4 L 13.6 10.4 L 20 12 L 13.6 13.6 L 12 20 L 10.4 13.6 L 4 12 L 10.4 10.4 Z" />
                    <line x1="5.5" y1="5.5" x2="7" y2="7" opacity="0.6" />
                    <line x1="18.5" y1="5.5" x2="17" y2="7" opacity="0.6" />
                    <line x1="5.5" y1="18.5" x2="7" y2="17" opacity="0.6" />
                    <line x1="18.5" y1="18.5" x2="17" y2="17" opacity="0.6" />
                </svg>
            );
        default:
            // Unknown rank — simple rosette so nothing renders blank
            return (
                <svg {...p}>
                    <circle cx="12" cy="10" r="6" />
                    <path d="M9 15 L 7.5 21 L 12 18.5 L 16.5 21 L 15 15" />
                </svg>
            );
    }
}
