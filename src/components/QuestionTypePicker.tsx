import { memo, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { QuestionType, AgeBand } from '../utils/questionTypes';
import { typesForBand, GROUP_LABELS, glossaryForTypes, type QuestionGroup } from '../utils/questionTypes';
import { CategoryIcon } from './CategoryIcon';

interface Props {
    current: QuestionType;
    onChange: (type: QuestionType) => void;
    ageBand: AgeBand;
}

const ALL_GROUPS: QuestionGroup[] = ['daily', 'young', 'whole', 'core', 'parts', 'advanced', 'mixed'];

export const QuestionTypePicker = memo(function QuestionTypePicker({ current, onChange, ageBand }: Props) {
    const [open, setOpen] = useState(false);
    const bandTypes = useMemo(() => typesForBand(ageBand), [ageBand]);
    const groups = useMemo(() => ALL_GROUPS.filter(g => bandTypes.some(t => t.group === g)), [bandTypes]);
    const glossary = useMemo(() => glossaryForTypes(bandTypes.map(t => t.id)), [bandTypes]);
    const currentEntry = bandTypes.find(t => t.id === current);

    return (
        <>
            {/* Toggle button — plain <button> (not motion.button) so the tap
                feels instant. whileTap fires on pointerup which adds perceived
                latency for a button that opens a modal; CSS :active fires on
                pointerdown. */}
            <button
                onClick={() => setOpen(o => !o)}
                aria-label={`Question type: ${currentEntry?.label ?? 'select'}`}
                aria-expanded={open}
                className="action-icon w-11 h-11 flex items-center justify-center text-[rgb(var(--color-fg))]/50 active:text-[var(--color-gold)] active:scale-90"
            >
                <CategoryIcon id={current} size={26} />
            </button>

            {/* Full-screen overlay picker — portaled to body to escape #root's position:fixed */}
            {createPortal(
                <AnimatePresence>
                    {open && (
                        <>
                            {/* Dim backdrop — tap to close */}
                            <motion.div
                                className="fixed inset-0 bg-[var(--color-overlay-dim)] z-50"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.1 }}
                                onClick={() => setOpen(false)}
                            />

                            {/* Centered grouped picker — faster entrance and a
                                less-droopy initial scale so the modal lands
                                under the user's tap with less perceived lag. */}
                            <motion.div
                                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-[var(--color-overlay)] border border-[rgb(var(--color-fg))]/15 rounded-2xl px-5 py-5 max-h-[70vh] overflow-y-auto w-[300px]"
                                initial={{ opacity: 0, scale: 0.96 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.96 }}
                                transition={{ duration: 0.12 }}
                            >
                                {groups.map(group => {
                                    const items = bandTypes.filter(t => t.group === group);
                                    return (
                                        <div key={group} className="mb-3 last:mb-0">
                                            {/* Group header */}
                                            <div className="text-[10px] ui text-[rgb(var(--color-fg))]/30 uppercase tracking-widest mb-2 px-1">
                                                {GROUP_LABELS[group]}
                                            </div>
                                            {/* 3-column grid */}
                                            <div className="grid grid-cols-3 gap-2">
                                                {items.map(t => (
                                                    <motion.button
                                                        key={t.id}
                                                        onClick={() => { onChange(t.id); setOpen(false); }}
                                                        className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl transition-colors ${t.id === current
                                                            ? 'bg-[var(--color-gold)]/15 border border-[var(--color-gold)]/40'
                                                            : 'border border-transparent active:bg-[var(--color-surface)]'
                                                            }`}
                                                        whileTap={{ scale: 0.92 }}
                                                    >
                                                        <div className={`h-8 flex items-center justify-center ${t.id === current ? 'text-[var(--color-gold)]' : 'text-[rgb(var(--color-fg))]/70'}`}>
                                                            <CategoryIcon id={t.id} size={28} />
                                                        </div>
                                                        <span className={`text-[10px] ui ${t.id === current ? 'text-[var(--color-gold)]/80' : 'text-[rgb(var(--color-fg))]/40'}`}>
                                                            {t.label}
                                                        </span>
                                                    </motion.button>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                                {/* Acronym glossary footnotes */}
                                {glossary.length > 0 && (
                                    <div className="mt-4 pt-3 border-t border-[rgb(var(--color-fg))]/10 space-y-1 px-1">
                                        {glossary.map(([term, def]) => (
                                            <p key={term} className="text-[9px] ui text-[rgb(var(--color-fg))]/25 leading-snug">
                                                <span className="text-[rgb(var(--color-fg))]/40">{term}</span> — {def}
                                            </p>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    );
});
