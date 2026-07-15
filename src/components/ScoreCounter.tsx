import { memo, useState, useEffect, useRef } from 'react';
import { motion, useSpring, useMotionValueEvent } from 'framer-motion';

/** THE pre-score greeting. Owner call 2026-07-16: no rotation — it always
 *  says "Let's Go!!" (matches the tab's name; the rotating variants read
 *  dubious out of context). */
const GREETING = "Let's Go!!";

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
                <span className="text-5xl leading-tight">{GREETING}</span>
            ) : display}
        </motion.div>
    );
});
