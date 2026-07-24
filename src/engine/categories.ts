/**
 * engine/categories.ts
 *
 * Generic category / age-band system.
 * Subject domains supply concrete instances; the engine stores and queries them.
 */

// ── Generic interfaces ────────────────────────────────────────────────────────

/** A single selectable question category (e.g. "Multiply", "Silent-e Words") */
export interface CategoryEntry<TId extends string = string> {
    id: TId;
    label: string;
    group: string;
    /** Hidden from the picker UI but still callable programmatically */
    hidden?: boolean;
}

// The generic age-band system (BandEntry + typesForBand + defaultTypeForBand)
// was removed 2026-07-24 — the app collapsed to a single visible-group filter
// (domains/math/mathCategories.ts visibleQuestionTypes). Git history has it if
// a multi-band subject ever needs it again.
