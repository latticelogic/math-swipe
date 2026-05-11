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
    | 'mix-basic' | 'mix-all'
    | 'daily' | 'challenge' | 'speedrun' | 'ghost';

export type QuestionGroup = 'daily' | 'young' | 'whole' | 'core' | 'advanced' | 'parts' | 'mixed';

/** Two-band system. "starter" is recognition + single-digit drills (the old k2
 *  band content); "full" is the complete arithmetic-and-beyond catalog (old
 *  35 + 6+ merged). Default is "full" — the majority audience. */
export type AgeBand = 'starter' | 'full';

// ── Renamed aliases for backward compatibility ────────────────────────────────
/** @deprecated Use CategoryEntry from engine/categories */
export type QuestionTypeEntry = CategoryEntry<QuestionType>;

// ── Group labels ──────────────────────────────────────────────────────────────

export const GROUP_LABELS: Record<QuestionGroup, string> = {
    daily: '🗓️ Daily',
    young: '🐣 Young',
    whole: 'Whole',
    core: '🧱 Core',
    advanced: 'Advanced',
    parts: 'Parts',
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
    // Whole
    { id: 'add', icon: '+', label: 'Add', group: 'whole' },
    { id: 'subtract', icon: '−', label: 'Subtract', group: 'whole' },
    { id: 'multiply', icon: '×', label: 'Multiply', group: 'whole' },
    { id: 'divide', icon: '÷', label: 'Divide', group: 'whole' },
    // Core (Ages 8–10)
    { id: 'round', icon: '≈', label: 'Rounding', group: 'core' },
    { id: 'orderops', icon: '🔢', label: 'PEMDAS', group: 'core' },
    // Advanced
    { id: 'square', icon: 'x²', label: 'Square', group: 'advanced' },
    { id: 'sqrt', icon: '√', label: 'Root', group: 'advanced' },
    { id: 'exponent', icon: 'xⁿ', label: 'Exponent', group: 'advanced' },
    { id: 'negatives', icon: '±', label: 'Negatives', group: 'advanced' },
    { id: 'linear', icon: 'x=', label: 'Linear', group: 'advanced' },
    { id: 'gcflcm', icon: 'GCF', label: 'GCF/LCM', group: 'advanced' },
    { id: 'ratio', icon: 'a:b', label: 'Ratios', group: 'advanced' },
    // Parts
    { id: 'fraction', icon: '⅓', label: 'Fractions', group: 'parts' },
    { id: 'decimal', icon: '.5', label: 'Decimals', group: 'parts' },
    { id: 'percent', icon: '%', label: 'Percent', group: 'parts' },
    // Mixed
    { id: 'mix-basic', icon: '+-\n×÷', label: 'Basic Mix', group: 'mixed' },
    { id: 'mix-all', icon: '🌀', label: 'All Mix', group: 'mixed' },
] as const;

// ── Acronym glossary (shown as footnotes in the question type picker) ─────────

/** Explanations for acronyms used in category labels/questions */
export const ACRONYM_GLOSSARY: Record<string, string> = {
    'PEMDAS': 'Parentheses, Exponents, Multiplication, Division, Addition, Subtraction — aka BODMAS / BIDMAS (order of operations)',
    'GCF': 'Greatest Common Factor — aka HCF (Highest Common Factor)',
    'LCM': 'Least Common Multiple',
};

/** Returns glossary entries relevant to the visible category IDs */
export function glossaryForTypes(typeIds: readonly string[]): [string, string][] {
    const entries: [string, string][] = [];
    if (typeIds.some(id => id === 'orderops')) entries.push(['PEMDAS', ACRONYM_GLOSSARY['PEMDAS']]);
    if (typeIds.some(id => id === 'gcflcm')) {
        entries.push(['GCF', ACRONYM_GLOSSARY['GCF']]);
        entries.push(['LCM', ACRONYM_GLOSSARY['LCM']]);
    }
    return entries;
}

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
        groups: new Set(['daily', 'whole', 'core', 'advanced', 'parts', 'mixed']),
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
