/**
 * domains/math/mathCategories.ts
 *
 * Math-domain category definitions.
 * Moved from src/utils/questionTypes.ts — all math-specific, none engine-level.
 */
import type { CategoryEntry, BandEntry } from '../../engine/categories';

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

/** Two-band system. "starter" is recognition + single-digit drills (the old k2
 *  band content); "full" is the complete arithmetic-and-beyond catalog (old
 *  35 + 6+ merged). Default is "full" — the majority audience. */
export type AgeBand = 'starter' | 'full';

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
    { id: 'daily', icon: '📅', label: 'Daily', group: 'daily' },
    // Young (Ages 5–7)
    { id: 'add1', icon: '+', label: '1-Digit +', group: 'young' },
    { id: 'sub1', icon: '−', label: '1-Digit −', group: 'young' },
    { id: 'bonds', icon: '🔗', label: 'Bonds', group: 'young' },
    { id: 'doubles', icon: '👯', label: 'Doubles', group: 'young' },
    { id: 'compare', icon: '⚖️', label: 'Compare', group: 'young' },
    { id: 'skip', icon: '🦘', label: 'Skip Count', group: 'young' },
    { id: 'shapes', icon: '🔺', label: 'Shapes', group: 'young' },
    { id: 'evenodd', icon: '½', label: 'Even/Odd', group: 'young' },
    { id: 'tens', icon: '10', label: '10 More', group: 'young' },
    // The Basics
    { id: 'add', icon: '+', label: 'Add', group: 'whole' },
    { id: 'subtract', icon: '−', label: 'Subtract', group: 'whole' },
    { id: 'multiply', icon: '×', label: 'Multiply', group: 'whole' },
    { id: 'divide', icon: '÷', label: 'Divide', group: 'whole' },
    { id: 'tables', icon: '7×', label: 'Tables', group: 'whole' },
    { id: 'missing', icon: '?', label: 'Missing', group: 'whole' },
    // Number Sense
    { id: 'round', icon: '≈', label: 'Rounding', group: 'core' },
    { id: 'orderops', icon: '🔢', label: 'PEMDAS', group: 'core' },
    { id: 'estimate', icon: '≈?', label: 'Estimate', group: 'core' },
    { id: 'sequence', icon: '1,2,…', label: 'Sequences', group: 'core' },
    { id: 'time', icon: '3:15', label: 'Time', group: 'core' },
    // Powers & Roots (was the front half of the grab-bag 'advanced' group —
    // split so each section is small enough to scan and honestly named)
    { id: 'square', icon: 'x²', label: 'Square', group: 'powers' },
    { id: 'sqrt', icon: '√', label: 'Root', group: 'powers' },
    { id: 'exponent', icon: 'xⁿ', label: 'Exponent', group: 'powers' },
    // Pre-Algebra (the back half — the term parents/teachers actually use)
    { id: 'negatives', icon: '±', label: 'Negatives', group: 'prealgebra' },
    { id: 'linear', icon: 'x=', label: 'Linear', group: 'prealgebra' },
    { id: 'gcflcm', icon: 'GCF', label: 'GCF/LCM', group: 'prealgebra' },
    { id: 'ratio', icon: 'a:b', label: 'Ratios', group: 'prealgebra' },
    { id: 'primes', icon: 'p', label: 'Primes', group: 'prealgebra' },
    // Parts of a Whole
    { id: 'fraction', icon: '⅓', label: 'Fractions', group: 'parts' },
    { id: 'decimal', icon: '.5', label: 'Decimals', group: 'parts' },
    { id: 'percent', icon: '%', label: 'Percent', group: 'parts' },
    { id: 'money', icon: '$', label: 'Money', group: 'parts' },
    // Mixed
    { id: 'mix-basic', icon: '+-\n×÷', label: 'Basic Mix', group: 'mixed' },
    { id: 'mix-all', icon: '🌀', label: 'All Mix', group: 'mixed' },
] as const;

// (The PEMDAS/GCF/LCM acronym-glossary footnotes were removed from the picker
// 2026-07-16 — owner call, visual noise. Git history has the code if a
// glossary surface ever returns.)

// ── Band definitions ──────────────────────────────────────────────────────────

export const AGE_BANDS: AgeBand[] = ['starter', 'full'];

export const MATH_BANDS: ReadonlyArray<BandEntry<AgeBand>> = [
    {
        id: 'starter',
        // emoji is kept on BandEntry for legacy callers; the UI uses SVG icons.
        emoji: '🌱',
        label: 'Starter',
        groups: new Set(['daily', 'young']),
        defaultCategoryId: 'add1',
    },
    {
        id: 'full',
        emoji: '🚀',
        // The default band — chosen for the majority audience (older kids + adults).
        label: 'Full',
        groups: new Set(['daily', 'whole', 'core', 'powers', 'prealgebra', 'parts', 'mixed']),
        defaultCategoryId: 'multiply',
    },
];

/** Band display labels — kept for UI components that need only label+emoji */
export const BAND_LABELS: Record<AgeBand, { emoji: string; label: string }> = {
    'starter': { emoji: '🌱', label: 'Starter' },
    'full': { emoji: '🚀', label: 'Full' },
};

/** Migrate a legacy band id from the old 3-band scheme to the new 2-band
 *  scheme. Used when reading stored preferences (localStorage / Firestore)
 *  that may still hold the old values. */
export function migrateLegacyBand(stored: string | null | undefined): AgeBand {
    if (stored === 'starter' || stored === 'full') return stored;
    if (stored === 'k2') return 'starter';
    // '35' and '6+' both fold into 'full'; anything unrecognized defaults to 'full'.
    return 'full';
}

// ── Convenience wrappers (math-domain entry points) ───────────────────────────

import { typesForBand as _typesForBand, defaultTypeForBand as _defaultTypeForBand } from '../../engine/categories';

/** Returns question types visible for the given age band */
export function typesForBand(band: AgeBand): ReadonlyArray<CategoryEntry<QuestionType>> {
    return _typesForBand(band, MATH_BANDS, QUESTION_TYPES) as ReadonlyArray<CategoryEntry<QuestionType>>;
}

/** Returns the default question type for a band */
export function defaultTypeForBand(band: AgeBand): QuestionType {
    return _defaultTypeForBand(band, MATH_BANDS) as QuestionType;
}
