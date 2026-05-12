import { memo } from 'react';
import { motion } from 'framer-motion';
import { TIER_DURATIONS_S, type MilestoneTier } from './milestoneTiers';

interface Props {
    /** Tier to render. If unknown, falls back to sparkle. */
    tier: string;
    /** Current streak count, shown alongside the icon. */
    streak: number;
}

/**
 * Theatrical streak-milestone overlay.
 *
 * Each tier (sparkle → flame → bolt → crown → trophy) maps to a distinct
 * hand-drawn SVG with its own particle decoration and animation profile.
 * Lower tiers stay subtle (a small celebratory beat); higher tiers earn
 * more theatre (slower pace, more particles, more dramatic scale).
 *
 * Replaces the previous emoji popup which clashed with the chalkboard
 * aesthetic and looked identical across all tiers. Now hitting 50 feels
 * meaningfully bigger than hitting 3.
 */
export const MilestoneBurst = memo(function MilestoneBurst({ tier, streak }: Props) {
    const config = TIER_CONFIG[tier as MilestoneTier] ?? TIER_CONFIG.sparkle;

    return (
        <motion.div
            className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
        >
            {/* Particles fly outward from the centre — number scales with tier */}
            {config.particles.map((p, i) => (
                <motion.div
                    key={i}
                    className="absolute"
                    style={{ color: config.color }}
                    initial={{ x: 0, y: 0, opacity: 0, scale: 0.3 }}
                    animate={{
                        x: p.dx,
                        y: p.dy,
                        opacity: [0, 1, 1, 0],
                        scale: [0.3, 1, 1, 0.5],
                        rotate: p.rotate,
                    }}
                    transition={{ duration: config.durationS, ease: 'easeOut', times: [0, 0.15, 0.7, 1] }}
                >
                    {config.particleSvg}
                </motion.div>
            ))}

            {/* Central icon — the big one */}
            <motion.div
                className="relative flex items-center gap-3"
                style={{ color: config.color }}
                initial={{ scale: 0, rotate: -15 }}
                animate={{ scale: [0, config.peakScale, 1, 1], rotate: [-15, 0, 0, 0] }}
                transition={{ duration: config.durationS, times: [0, 0.25, 0.5, 1], ease: 'easeOut' }}
            >
                <div className="drop-shadow-[0_0_24px_currentColor]">
                    {config.icon}
                </div>
                <motion.div
                    className="chalk text-7xl tabular-nums"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1, duration: 0.3 }}
                >
                    {streak}×
                </motion.div>
            </motion.div>
        </motion.div>
    );
});

// ── SVG glyphs ─────────────────────────────────────────────────────────

const SparkleIcon = (
    <svg viewBox="0 0 80 80" width="64" height="64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M40 8 L 44 36 L 72 40 L 44 44 L 40 72 L 36 44 L 8 40 L 36 36 Z" />
        <path d="M16 16 L 18 22 L 24 24 L 18 26 L 16 32 L 14 26 L 8 24 L 14 22 Z" opacity="0.6" />
    </svg>
);

const FlameIcon = (
    <svg viewBox="0 0 80 80" width="80" height="80" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M40 72 C 22 72 14 56 18 42 C 22 48 26 48 28 44 C 24 30 32 14 40 6 C 40 20 52 22 56 32 C 60 26 64 26 64 32 C 70 46 60 72 40 72 Z" />
        <path d="M40 60 C 32 60 28 52 32 44 C 36 48 38 46 38 42 C 36 34 42 28 46 24 C 46 32 52 32 52 38 C 56 38 56 42 54 46 C 52 56 48 60 40 60 Z" opacity="0.5" />
    </svg>
);

const BoltIcon = (
    <svg viewBox="0 0 80 80" width="88" height="88" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M44 6 L 16 44 L 36 44 L 32 74 L 64 32 L 44 32 Z" />
        <path d="M48 22 L 34 40 L 44 40 L 42 56" opacity="0.5" />
    </svg>
);

const CrownIcon = (
    <svg viewBox="0 0 100 80" width="100" height="80" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 64 L 16 22 L 32 40 L 50 14 L 68 40 L 84 22 L 90 64 Z" />
        <line x1="10" y1="70" x2="90" y2="70" />
        <circle cx="50" cy="14" r="3" fill="currentColor" stroke="none" />
        <circle cx="16" cy="22" r="2.5" fill="currentColor" stroke="none" />
        <circle cx="84" cy="22" r="2.5" fill="currentColor" stroke="none" />
    </svg>
);

const TrophyIcon = (
    <svg viewBox="0 0 100 100" width="120" height="120" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        {/* Cup */}
        <path d="M28 12 L 28 44 C 28 56 36 64 50 64 C 64 64 72 56 72 44 L 72 12 Z" />
        {/* Handles */}
        <path d="M28 18 C 18 18 14 24 14 32 C 14 40 20 44 28 44" />
        <path d="M72 18 C 82 18 86 24 86 32 C 86 40 80 44 72 44" />
        {/* Stem */}
        <line x1="50" y1="64" x2="50" y2="78" />
        {/* Base */}
        <line x1="34" y1="78" x2="66" y2="78" />
        <line x1="30" y1="86" x2="70" y2="86" />
        {/* Star center */}
        <path d="M50 28 L 53 36 L 61 36 L 55 41 L 57 49 L 50 44 L 43 49 L 45 41 L 39 36 L 47 36 Z" fill="currentColor" stroke="none" opacity="0.5" />
    </svg>
);

const Dot = (
    <svg viewBox="0 0 8 8" width="8" height="8" fill="currentColor"><circle cx="4" cy="4" r="3" /></svg>
);

const Spark = (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="8" y1="2" x2="8" y2="14" />
        <line x1="2" y1="8" x2="14" y2="8" />
    </svg>
);

const Petal = (
    <svg viewBox="0 0 16 16" width="14" height="20" fill="currentColor">
        <path d="M8 0 C 11 4 11 10 8 16 C 5 10 5 4 8 0 Z" />
    </svg>
);

// ── Particle scatter patterns ──────────────────────────────────────────

/** Build N evenly-spaced radial particles at a given radius. */
function radial(count: number, radius: number): { dx: number; dy: number; rotate: number; }[] {
    const out: { dx: number; dy: number; rotate: number; }[] = [];
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
        out.push({
            dx: Math.cos(angle) * radius,
            dy: Math.sin(angle) * radius,
            rotate: (angle * 180) / Math.PI + 90,
        });
    }
    return out;
}

// ── Tier table ─────────────────────────────────────────────────────────

interface TierConfig {
    icon: React.ReactNode;
    color: string;
    /** Animation duration in seconds. Bigger = more theatrical. */
    durationS: number;
    /** Peak scale of the central icon during the bounce-in. */
    peakScale: number;
    /** Particles flying outward — each gets the same SVG. */
    particles: { dx: number; dy: number; rotate: number; }[];
    /** SVG used for particles. */
    particleSvg: React.ReactNode;
}

const TIER_CONFIG: Record<MilestoneTier, TierConfig> = {
    sparkle: {
        icon: SparkleIcon,
        color: 'var(--color-gold)',
        durationS: TIER_DURATIONS_S.sparkle,
        peakScale: 1.3,
        particles: radial(6, 90),
        particleSvg: Dot,
    },
    flame: {
        icon: FlameIcon,
        color: 'var(--color-streak-fire)',
        durationS: TIER_DURATIONS_S.flame,
        peakScale: 1.4,
        particles: radial(10, 130),
        particleSvg: Spark,
    },
    bolt: {
        icon: BoltIcon,
        color: 'var(--color-gold)',
        durationS: TIER_DURATIONS_S.bolt,
        peakScale: 1.5,
        particles: radial(14, 170),
        particleSvg: Spark,
    },
    crown: {
        icon: CrownIcon,
        color: 'var(--color-gold)',
        durationS: TIER_DURATIONS_S.crown,
        peakScale: 1.6,
        // Inner ring + outer ring for richer celebration.
        particles: [...radial(8, 110), ...radial(12, 180)],
        particleSvg: Petal,
    },
    trophy: {
        icon: TrophyIcon,
        color: 'var(--color-gold)',
        durationS: TIER_DURATIONS_S.trophy,
        peakScale: 1.8,
        // Three rings for legendary feel — close, mid, far.
        particles: [
            ...radial(8, 80),
            ...radial(12, 150),
            ...radial(16, 230),
        ],
        particleSvg: Spark,
    },
};
