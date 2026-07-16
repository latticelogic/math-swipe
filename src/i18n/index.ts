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
import { fr } from './fr';
import { de } from './de';
import { it } from './it';
import { id } from './id';
import { ko } from './ko';
import { zhHans } from './zh-Hans';
import { zhHant } from './zh-Hant';
import { ja } from './ja';
import { hi } from './hi';

export type { MsgKey };

/** Every locale the product has committed to (owner list, 2026-07-16).
 *  Arabic is deliberately NOT here yet — it needs RTL layout work, a separate
 *  project (docs/i18n.md). */
export type Locale =
    | 'en' | 'es' | 'pt-BR' | 'fr' | 'de' | 'it' | 'id' | 'ko'
    | 'zh-Hans' | 'zh-Hant' | 'ja' | 'hi';

/** Selectable today: catalog complete. Non-Latin scripts (zh/ja/hi) fall
 *  back to a clean system font via [data-locale] in index.css — the
 *  hand-drawn chalk face is Latin-only, so a handwriting-font pass for these
 *  scripts (Kalam covers Devanagari; a CJK handwriting face for zh/ja) is a
 *  documented aesthetic follow-up, not a launch blocker. Labels are in each
 *  language's own script so users self-identify. */
export const SHIPPED_LOCALES: ReadonlyArray<{ id: Locale; label: string }> = [
    { id: 'en', label: 'English' },
    { id: 'es', label: 'Español' },
    { id: 'pt-BR', label: 'Português (Brasil)' },
    { id: 'fr', label: 'Français' },
    { id: 'de', label: 'Deutsch' },
    { id: 'it', label: 'Italiano' },
    { id: 'id', label: 'Bahasa Indonesia' },
    { id: 'ko', label: '한국어' },
    { id: 'zh-Hans', label: '简体中文' },
    { id: 'zh-Hant', label: '繁體中文' },
    { id: 'ja', label: '日本語' },
    { id: 'hi', label: 'हिन्दी' },
];

/** Declared but not yet shipped. Empty today — Arabic (RTL) is the next
 *  candidate and is a layout project, tracked separately (docs/i18n.md). */
export const PLANNED_LOCALES: ReadonlyArray<Locale> = [];

const STORAGE_KEY = 'math-swipe-locale';

const CATALOGS: Partial<Record<Locale, Record<MsgKey, string>>> = {
    en,
    es,
    'pt-BR': ptBR,
    fr,
    de,
    it,
    id,
    ko,
    'zh-Hans': zhHans,
    'zh-Hant': zhHant,
    ja,
    hi,
};

/** Map a BCP-47 tag from the browser onto a shipped locale. Order matters:
 *  Chinese resolves script (Hans/Hant) from the subtag or region. */
function matchShipped(tag: string): Locale | null {
    const lower = tag.toLowerCase();
    if (lower === 'en' || lower.startsWith('en-')) return 'en';
    if (lower === 'es' || lower.startsWith('es-')) return 'es';
    if (lower === 'pt' || lower.startsWith('pt-')) return 'pt-BR';
    if (lower === 'fr' || lower.startsWith('fr-')) return 'fr';
    if (lower === 'de' || lower.startsWith('de-')) return 'de';
    if (lower === 'it' || lower.startsWith('it-')) return 'it';
    if (lower === 'id' || lower.startsWith('id-')) return 'id';
    if (lower === 'ko' || lower.startsWith('ko-')) return 'ko';
    if (lower === 'ja' || lower.startsWith('ja-')) return 'ja';
    if (lower === 'hi' || lower.startsWith('hi-')) return 'hi';
    if (lower === 'zh' || lower.startsWith('zh')) {
        // Traditional for Hant/TW/HK/MO; Simplified otherwise (incl. plain zh).
        if (/hant|-tw|-hk|-mo/.test(lower)) return 'zh-Hant';
        return 'zh-Hans';
    }
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

// Reflect the locale onto <html> so CSS can swap font stacks for non-Latin
// scripts ([data-locale] in index.css) and assistive tech reads the right
// language. Guarded for jsdom/SSR where document may be absent.
try {
    document.documentElement.lang = current;
    document.documentElement.setAttribute('data-locale', current);
} catch { /* no document (tests/SSR) */ }

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

/** Regional overrides WITHIN a locale — currently just Commonwealth English,
 *  where gcd is called HCF (UK/India/Singapore/AU/NZ/IE/ZA/MY/HK schools)
 *  while the US says GCF. One word doesn't justify a full en-GB catalog;
 *  resolved once at load from the browser's region tags. */
const REGIONAL_OVERRIDES: Partial<Record<MsgKey, string>> = (() => {
    if (current !== 'en') return {};
    try {
        for (const tag of navigator.languages ?? [navigator.language]) {
            const lower = tag.toLowerCase();
            if (/^en-(gb|in|sg|au|nz|ie|za|my|hk)\b/.test(lower)) {
                return { 'math.gcd': 'HCF' };
            }
            if (lower === 'en-us' || lower === 'en') break; // explicit US/plain → GCF
        }
    } catch { /* navigator unavailable (tests) → US default */ }
    return {};
})();

/** Translate a key. Missing key/catalog falls back to English. */
export function t(key: MsgKey, vars?: Record<string, string | number>): string {
    const template = REGIONAL_OVERRIDES[key] ?? CATALOGS[current]?.[key] ?? en[key];
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
