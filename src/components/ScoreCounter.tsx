import { memo, useState, useEffect, useRef, useMemo } from 'react';
import { motion, useSpring, useMotionValueEvent } from 'framer-motion';

/** Pre-score greetings — rotates daily so returning users don't see
 *  the exact same phrase every time. Chosen to feel energetic but not
 *  childish; works for both kids and adult learners. */
const GREETINGS = [
    "Let's Go!!",
    'Ready?',
    'Round one!',
    'Back at it!',
    'Quick one?',
    'Brain on.',
    "Let's roll!",
];

/**
 * Animated score counter that "rolls" up to the new value.
 * Uses a spring-driven animation so points visibly count up —
 * feels way more satisfying than an instant jump.
 *
 * Pre-game state (score === 0) shows a greeting that rotates daily so
 * repeat users see variation rather than the same phrase forever.
 */
export const ScoreCounter = memo(function ScoreCounter({ value }: { value: number }) {
    const spring = useSpring(0, { stiffness: 100, damping: 18 });
    const [display, setDisplay] = useState(0);
    const prevValue = useRef(0);

    useEffect(() => {
        prevValue.current = value;
        spring.set(value);
    }, [value, spring]);

    // Drive visible number from the spring motion value
    useMotionValueEvent(spring, 'change', (v) => {
        setDisplay(Math.round(v));
    });

    // Deterministic per-day greeting — same all day, different tomorrow.
    // Computed once per mount so it doesn't churn between renders.
    const greeting = useMemo(() => {
        const d = new Date();
        const dayKey = d.getFullYear() * 1000 + (d.getMonth() + 1) * 50 + d.getDate();
        return GREETINGS[dayKey % GREETINGS.length];
    }, []);

    return (
        <motion.div
            className="chalk text-[var(--color-gold)] text-7xl leading-none tabular-nums"
            key={value}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.3 }}
            role="status"
            aria-live="polite"
            aria-label={`Score: ${value}`}
        >
            {value === 0 ? (
                <span className="text-5xl leading-tight">{greeting}</span>
            ) : display}
        </motion.div>
    );
});
