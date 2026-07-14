/**
 * NumberFactAside — an occasional chalk aside about the answer you just got
 * right ("144 — a dozen dozen"). Rewards curiosity without nagging: it only
 * fires on a correct answer whose value has a noteworthy fact, at most once
 * every ~25s, and only some of the time — so it stays a treat, not chrome.
 *
 * Positioned below the problem (distinct from the centre milestone burst and
 * the top personal-best ribbon) so celebratory moments never stack on it.
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FeedbackFlash } from '../engine/domain';
import { numberFact } from '../utils/numberFacts';

const MIN_GAP_MS = 25_000; // keep it rare
const SHOW_CHANCE = 0.5;   // of eligible moments
const VISIBLE_MS = 3_400;

export function NumberFactAside({ flash, answer }: { flash: FeedbackFlash; answer: number | string | undefined }) {
    const [fact, setFact] = useState<string | null>(null);
    const lastShownRef = useRef(0);
    // Track the flash edge so we evaluate once per correct answer, not on every
    // re-render while the flash is held.
    const prevFlashRef = useRef<FeedbackFlash>('none');

    useEffect(() => {
        const wasCorrectEdge = flash === 'correct' && prevFlashRef.current !== 'correct';
        prevFlashRef.current = flash;
        if (!wasCorrectEdge) return;
        if (typeof answer !== 'number') return;

        const now = Date.now();
        if (now - lastShownRef.current < MIN_GAP_MS) return;
        const f = numberFact(answer);
        if (!f) return;
        // Math.random for "sometimes" — this is a one-shot edge effect, not a
        // render-purity concern.
        // eslint-disable-next-line react-hooks/purity
        if (Math.random() > SHOW_CHANCE) return;

        lastShownRef.current = now;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFact(f);
        const t = setTimeout(() => setFact(null), VISIBLE_MS);
        return () => clearTimeout(t);
    }, [flash, answer]);

    return (
        <AnimatePresence>
            {fact && (
                <motion.div
                    key={fact}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.3 }}
                    className="absolute left-1/2 -translate-x-1/2 top-[60%] z-30 text-center text-sm chalk text-[rgb(var(--color-fg))]/55 whitespace-nowrap pointer-events-none px-4"
                >
                    {fact}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
