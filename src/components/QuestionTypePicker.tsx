import { memo, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { QuestionType, AgeBand } from '../utils/questionTypes';
import { typesForBand, type QuestionGroup } from '../utils/questionTypes';
import { setFocusTable, getFocusTable } from '../utils/mathGenerator';
import { CategoryIcon } from './CategoryIcon';
import { t, type MsgKey } from '../i18n';

/** Localized group/category labels. The catalog data in mathCategories.ts
 *  keeps English reference labels; display always goes through the i18n
 *  catalog (`group.*` / `cat.*` keys exist for every id — parity-tested). */
const groupLabel = (g: QuestionGroup) => t(`group.${g}` as MsgKey);
const catLabel = (id: QuestionType) => t(`cat.${id}` as MsgKey);

const FOCUS_TABLE_KEY = 'math-swipe-focus-table';

/** Restore the drilled times-table across sessions. Module-scope so it runs
 *  once, before any Tables problem can be generated. */
try {
    const stored = Number(localStorage.getItem(FOCUS_TABLE_KEY));
    if (Number.isFinite(stored) && stored >= 2) setFocusTable(stored);
} catch { /* storage unavailable — default table stands */ }

interface Props {
    current: QuestionType;
    onChange: (type: QuestionType) => void;
    ageBand: AgeBand;
}

// Section order: everyday stuff first (Daily, the four operations), then the
// school-progression ramp (number sense → parts → powers → pre-algebra),
// Mixed last as the graduation. Labels live in GROUP_LABELS.
const ALL_GROUPS: QuestionGroup[] = ['daily', 'young', 'whole', 'core', 'parts', 'powers', 'prealgebra', 'mixed'];

export const QuestionTypePicker = memo(function QuestionTypePicker({ current, onChange, ageBand }: Props) {
    const [open, setOpen] = useState(false);
    // Second step for the Tables tile: pick WHICH table to drill (2–12).
    const [tableChooser, setTableChooser] = useState(false);
    const bandTypes = useMemo(() => typesForBand(ageBand), [ageBand]);
    const groups = useMemo(() => ALL_GROUPS.filter(g => bandTypes.some(t => t.group === g)), [bandTypes]);
    const currentEntry = bandTypes.find(t => t.id === current);

    function pickTable(n: number) {
        setFocusTable(n);
        try { localStorage.setItem(FOCUS_TABLE_KEY, String(n)); } catch { /* fine */ }
        setTableChooser(false);
        onChange('tables');
        setOpen(false);
    }

    return (
        <>
            {/* Toggle button — plain <button> (not motion.button) so the tap
                feels instant. whileTap fires on pointerup which adds perceived
                latency for a button that opens a modal; CSS :active fires on
                pointerdown. */}
            <button
                onClick={() => { setOpen(o => !o); setTableChooser(false); }}
                aria-label={t('rail.topicAria', { label: currentEntry ? catLabel(currentEntry.id) : t('picker.topic') })}
                aria-expanded={open}
                className="action-icon w-12 flex flex-col items-center justify-center gap-0.5 text-[rgb(var(--color-fg))]/70 active:text-[var(--color-gold)] active:scale-90"
            >
                <CategoryIcon id={current} size={24} />
                {/* Label + caret — the caret is the "opens a menu" affordance and
                    the label makes this the one self-describing control in the rail,
                    fixing the "what is this icon?" discoverability gap. */}
                <span className="flex items-center gap-0.5 leading-none">
                    <span className="text-[8px] ui max-w-[40px] truncate">{currentEntry ? catLabel(currentEntry.id) : t('picker.topic')}</span>
                    <svg width="7" height="7" viewBox="0 0 10 10" fill="currentColor" className="shrink-0 opacity-70">
                        <path d="M1 3.5 L5 7.5 L9 3.5 Z" />
                    </svg>
                </span>
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
                                onClick={() => { setOpen(false); setTableChooser(false); }}
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
                                {tableChooser ? (
                                    // Step 2 of the Tables tile: which table?
                                    <div>
                                        <div className="text-[10px] ui text-[rgb(var(--color-fg))]/30 uppercase tracking-widest mb-2 px-1">
                                            {t('picker.whichTable')}
                                        </div>
                                        <div className="grid grid-cols-4 gap-2">
                                            {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                                                <motion.button
                                                    key={n}
                                                    onClick={() => pickTable(n)}
                                                    className={`py-3 rounded-xl text-base chalk transition-colors ${current === 'tables' && getFocusTable() === n
                                                        ? 'bg-[var(--color-gold)]/15 border border-[var(--color-gold)]/40 text-[var(--color-gold)]'
                                                        : 'border border-[rgb(var(--color-fg))]/10 text-[rgb(var(--color-fg))]/70 active:bg-[var(--color-surface)]'
                                                        }`}
                                                    whileTap={{ scale: 0.92 }}
                                                >
                                                    {n}s
                                                </motion.button>
                                            ))}
                                        </div>
                                        <button
                                            onClick={() => setTableChooser(false)}
                                            className="w-full mt-3 py-2 text-xs ui text-[rgb(var(--color-fg))]/45 hover:text-[rgb(var(--color-fg))]/65 transition-colors"
                                        >
                                            {t('picker.backToTopics')}
                                        </button>
                                    </div>
                                ) : groups.map(group => {
                                    const items = bandTypes.filter(t => t.group === group);
                                    return (
                                        <div key={group} className="mb-3 last:mb-0">
                                            {/* Group header */}
                                            <div className="text-[10px] ui text-[rgb(var(--color-fg))]/30 uppercase tracking-widest mb-2 px-1">
                                                {groupLabel(group)}
                                            </div>
                                            {/* 3-column grid */}
                                            <div className="grid grid-cols-3 gap-2">
                                                {items.map(entry => (
                                                    <motion.button
                                                        key={entry.id}
                                                        onClick={() => {
                                                            // Tables drills ONE chosen table — route to
                                                            // the chooser instead of selecting directly.
                                                            if (entry.id === 'tables') { setTableChooser(true); return; }
                                                            onChange(entry.id);
                                                            setOpen(false);
                                                        }}
                                                        className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl transition-colors ${entry.id === current
                                                            ? 'bg-[var(--color-gold)]/15 border border-[var(--color-gold)]/40'
                                                            : 'border border-transparent active:bg-[var(--color-surface)]'
                                                            }`}
                                                        whileTap={{ scale: 0.92 }}
                                                    >
                                                        <div className={`h-8 flex items-center justify-center ${entry.id === current ? 'text-[var(--color-gold)]' : 'text-[rgb(var(--color-fg))]/70'}`}>
                                                            <CategoryIcon id={entry.id} size={28} />
                                                        </div>
                                                        <span className={`text-[10px] ui ${entry.id === current ? 'text-[var(--color-gold)]/80' : 'text-[rgb(var(--color-fg))]/40'}`}>
                                                            {entry.id === 'tables' && current === 'tables'
                                                                ? t('picker.tablesFocused', { n: getFocusTable() })
                                                                : catLabel(entry.id)}
                                                        </span>
                                                    </motion.button>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    );
});
