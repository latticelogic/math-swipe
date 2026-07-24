/**
 * domains/math/mathCategories.ts
 *
 * Math-domain category definitions.
 * Moved from src/utils/questionTypes.ts — all math-specific, none engine-level.
 */
import type { CategoryEntry } from '../../engine/categories';

// ── Question type union ───────────────────────────────────────────────────────

export type QuestionType =
    | 'add' | 'subtract' | 'multiply' | 'divide' | 'square' | 'sqrt'
    | 'fraction' | 'decimal' | 'percent' | 'linear'
    | 'add1' | 'sub1' | 'bonds' | 'doubles' | 'compare' | 'skip'
    | 'shapes' | 'evenodd' | 'tens'
    | 'round' | 'orderops'
    | 'exponent' | 'negatives' | 'gcflcm' | 'ratio'
    | 'tables' | 'missing' | 'primes' | 'estimate' | 'money' | 'sequence' | 'time'
    | 'mix-basic' | 'mix-all'
    | 'daily' | 'challenge' | 'speedrun' | 'ghost';

export type QuestionGroup = 'daily' | 'young' | 'whole' | 'core' | 'powers' | 'prealgebra' | 'parts' | 'mixed';

// ── Renamed aliases for backward compatibility ────────────────────────────────
/** @deprecated Use CategoryEntry from engine/categories */
export type QuestionTypeEntry = CategoryEntry<QuestionType>;

// ── Group labels ──────────────────────────────────────────────────────────────

/** Picker section headers. Plain language a kid or parent can predict the
 *  contents from — the old taxonomy-speak ("Whole"? "Core"? "Parts"?) told
 *  you nothing until you opened it. Text only: emoji in headers broke the
 *  no-emoji rule (grid items render hand-drawn SVGs keyed by id). */
export const GROUP_LABELS: Record<QuestionGroup, string> = {
    daily: 'Daily',
    young: 'First Numbers',
    whole: 'The Basics',
    core: 'Number Sense',
    powers: 'Powers & Roots',
    prealgebra: 'Pre-Algebra',
    parts: 'Parts of a Whole',
    mixed: 'Mixed',
};

// ── Category list ─────────────────────────────────────────────────────────────

/** Single source of truth for all math category entries */
export const QUESTION_TYPES: ReadonlyArray<CategoryEntry<QuestionType>> = [
    // Daily
    { id: 'daily', label: 'Daily', group: 'daily' },
    // Young (Ages 5–7)
    { id: 'add1', label: '1-Digit +', group: 'young' },
    { id: 'sub1', label: '1-Digit −', group: 'young' },
    { id: 'bonds', label: 'Bonds', group: 'young' },
    { id: 'doubles', label: 'Doubles', group: 'young' },
    { id: 'compare', label: 'Compare', group: 'young' },
    { id: 'skip', label: 'Skip Count', group: 'young' },
    { id: 'shapes', label: 'Shapes', group: 'young' },
    { id: 'evenodd', label: 'Even/Odd', group: 'young' },
    { id: 'tens', label: '10 More', group: 'young' },
    // The Basics
    { id: 'add', label: 'Add', group: 'whole' },
    { id: 'subtract', label: 'Subtract', group: 'whole' },
    { id: 'multiply', label: 'Multiply', group: 'whole' },
    { id: 'divide', label: 'Divide', group: 'whole' },
    { id: 'tables', label: 'Tables', group: 'whole' },
    { id: 'missing', label: 'Missing', group: 'whole' },
    // Number Sense
    { id: 'round', label: 'Rounding', group: 'core' },
    { id: 'orderops', label: 'PEMDAS', group: 'core' },
    { id: 'estimate', label: 'Estimate', group: 'core' },
    { id: 'sequence', label: 'Sequences', group: 'core' },
    { id: 'time', label: 'Time', group: 'core' },
    // Powers & Roots (was the front half of the grab-bag 'advanced' group —
    // split so each section is small enough to scan and honestly named)
    { id: 'square', label: 'Square', group: 'powers' },
    { id: 'sqrt', label: 'Root', group: 'powers' },
    { id: 'exponent', label: 'Exponent', group: 'powers' },
    // Pre-Algebra (the back half — the term parents/teachers actually use)
    { id: 'negatives', label: 'Negatives', group: 'prealgebra' },
    { id: 'linear', label: 'Linear', group: 'prealgebra' },
    { id: 'gcflcm', label: 'GCF/LCM', group: 'prealgebra' },
    { id: 'ratio', label: 'Ratios', group: 'prealgebra' },
    { id: 'primes', label: 'Primes', group: 'prealgebra' },
    // Parts of a Whole
    { id: 'fraction', label: 'Fractions', group: 'parts' },
    { id: 'decimal', label: 'Decimals', group: 'parts' },
    { id: 'percent', label: 'Percent', group: 'parts' },
    { id: 'money', label: 'Money', group: 'parts' },
    // Mixed
    { id: 'mix-basic', label: 'Basic Mix', group: 'mixed' },
    { id: 'mix-all', label: 'All Mix', group: 'mixed' },
] as const;

// (The PEMDAS/GCF/LCM acronym-glossary footnotes were removed from the picker
// 2026-07-16 — owner call, visual noise. Git history has the code if a
// glossary surface ever returns.)

// ── Visible categories ────────────────────────────────────────────────────────
// The age-band system was removed 2026-07-24. The band picker was retired
// 2026-07-15 and only the "full" band was ever selected, so the two-band
// abstraction (starter/full, MATH_BANDS, migration) was dead machinery. What
// remains is a single visible-group filter. The 'young' group (single-digit
// recognition drills) stays in QUESTION_TYPES — its generators and deep links
// (?topic=) still work — but is hidden from the picker, exactly as the old
// 'full' band did.
const VISIBLE_GROUPS = new Set<string>([
    'daily', 'whole', 'core', 'powers', 'prealgebra', 'parts', 'mixed',
]);

/** The default category when entering / resetting the game loop. */
export const DEFAULT_QUESTION_TYPE: QuestionType = 'multiply';

/** Question types shown in the picker (all groups except the hidden 'young'). */
export function visibleQuestionTypes(): ReadonlyArray<CategoryEntry<QuestionType>> {
    return QUESTION_TYPES.filter(qt => VISIBLE_GROUPS.has(qt.group));
}
