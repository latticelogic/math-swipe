/**
 * i18n — the app's localization core. Deliberately tiny (no i18next):
 * 7 declared locales, typed keys, {var} interpolation, CLDR plurals via
 * Intl.PluralRules. See docs/i18n.md for the full spec + edge cases.
 *
 * Design decisions that everything here follows:
 *
 *  1. LOCALE IS FIXED PER SESSION. Switching language reloads the app
 *     (rare, deliberate action) — so t() is referentially stable, memoized
 *     components and module-level constants stay correct, and there is no
 *     reactivity surface to get wrong.
 *  2. MATH NOTATION IS LOCALE-INVARIANT (v1): '.' decimals and en-US digit
 *     grouping inside problems/options. Generators compare answers by value;
 *     mixing locale decimal commas into the math surface is a correctness
 *     project of its own (documented in docs/i18n.md).
 *  3. DECLARED ≠ SHIPPED. zh-Hans/zh-Hant/ja/hi are in the type today so no
 *     refactor is needed later, but they only become selectable once their
 *     catalog AND font stack land (chalk fonts are Latin-only).
 *  4. English is the fallback for any missing key/catalog — a gap shows
 *     English, never a raw key, never a crash.
 */

import { en, type MsgKey } from './en';
import { es } from './es';
import { ptBR } from './pt-BR';

export type { MsgKey };

/** Every locale the product has committed to (owner list, 2026-07-16). */
export type Locale = 'en' | 'es' | 'pt-BR' | 'zh-Hans' | 'zh-Hant' | 'ja' | 'hi';

/** Selectable today: catalog complete + fonts render the aesthetic. */
export const SHIPPED_LOCALES: ReadonlyArray<{ id: Locale; label: string }> = [
    { id: 'en', label: 'English' },
    { id: 'es', label: 'Español' },
    { id: 'pt-BR', label: 'Português (Brasil)' },
];

/** Declared, awaiting catalog + font work (zh/ja: CJK handwriting stack;
 *  hi: Kalam covers Devanagari). Kept here so the wave plan is in code. */
export const PLANNED_LOCALES: ReadonlyArray<Locale> = ['zh-Hans', 'zh-Hant', 'ja', 'hi'];

const STORAGE_KEY = 'math-swipe-locale';

const CATALOGS: Partial<Record<Locale, Record<MsgKey, string>>> = {
    en,
    es,
    'pt-BR': ptBR,
};

/** Map a BCP-47 tag from the browser onto a shipped locale. */
function matchShipped(tag: string): Locale | null {
    const lower = tag.toLowerCase();
    if (lower === 'en' || lower.startsWith('en-')) return 'en';
    if (lower === 'es' || lower.startsWith('es-')) return 'es';
    if (lower === 'pt' || lower.startsWith('pt-')) return 'pt-BR';
    return null;
}

function detect(): Locale {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && SHIPPED_LOCALES.some(l => l.id === stored)) return stored as Locale;
        for (const tag of navigator.languages ?? [navigator.language]) {
            const match = matchShipped(tag);
            if (match) return match;
        }
    } catch { /* storage/navigator unavailable (tests, SSR) */ }
    return 'en';
}

// Fixed at module load — see design decision (1).
const current: Locale = detect();

export function getLocale(): Locale {
    return current;
}

/** Persist the choice and reload — the whole app re-derives in the new
 *  locale. Callers should expect not to run code after this. */
export function setLocale(l: Locale): void {
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* private mode */ }
    window.location.reload();
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
    if (!vars) return template;
    return template.replace(/\{(\w+)\}/g, (m, name) =>
        Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : m);
}

/** Translate a key. Missing key/catalog falls back to English. */
export function t(key: MsgKey, vars?: Record<string, string | number>): string {
    const template = CATALOGS[current]?.[key] ?? en[key];
    return interpolate(template, vars);
}

// Plural categories we store variants for. en/es/pt-BR only distinguish
// one/other; zh/ja are 'other'-only; hi treats 0..1 as 'one'. Catalogs store
// plural strings under `<key>.one` / `<key>.other` — Intl.PluralRules picks.
const pluralRules = new Intl.PluralRules(current === 'pt-BR' ? 'pt' : current);

/** Plural-aware translate: `tCount('count.problem', 3)` → "3 problems".
 *  {count} is available in the template, locale-formatted. */
export function tCount(baseKey: string, count: number, vars?: Record<string, string | number>): string {
    const category = pluralRules.select(count);
    const tryKeys = [`${baseKey}.${category}`, `${baseKey}.other`] as MsgKey[];
    for (const k of tryKeys) {
        const template = CATALOGS[current]?.[k] ?? en[k];
        if (template !== undefined) {
            return interpolate(template, { count: nf(count), ...vars });
        }
    }
    return `${nf(count)}`; // catalog hole — degrade to the bare number
}

const numberFormat = new Intl.NumberFormat(current);

/** Locale-formatted number for UI COUNTS (XP, totals). NOT for math
 *  problem/option values — those stay locale-invariant (decision 2). */
export function nf(n: number): string {
    return numberFormat.format(n);
}

const shortDate = new Intl.DateTimeFormat(current, { month: 'short', day: 'numeric' });

/** Locale short date ("Jul 16" / "16 jul" / "16 de jul.") for share stamps. */
export function shortDateLabel(date: Date = new Date()): string {
    return shortDate.format(date);
}
