import { describe, it, expect } from 'vitest';
import { en } from '../i18n/en';
import { es } from '../i18n/es';
import { ptBR } from '../i18n/pt-BR';
import { fr } from '../i18n/fr';
import { de } from '../i18n/de';
import { zhHans } from '../i18n/zh-Hans';
import { zhHant } from '../i18n/zh-Hant';
import { ja } from '../i18n/ja';
import { hi } from '../i18n/hi';
import { t, tCount, getLocale } from '../i18n';

/**
 * i18n invariants. The failure modes these prevent:
 *  - a key added to en but forgotten in es/pt-BR (silent English leakage)
 *  - translations that overflow their UI slot (nav pills, tooltips, tiles)
 *  - emoji sneaking into catalogs (the no-emoji rule holds in every language)
 *  - plural variants missing for a plural key
 *  - {placeholders} renamed in one language (interpolation silently breaks)
 */

const CATALOGS: [string, Record<string, string>][] = [
    ['en', en as Record<string, string>],
    ['es', es],
    ['pt-BR', ptBR],
    ['fr', fr],
    ['de', de],
    ['zh-Hans', zhHans],
    ['zh-Hant', zhHant],
    ['ja', ja],
    ['hi', hi],
];

const EN_KEYS = Object.keys(en);

describe('catalog parity', () => {
    for (const [name, catalog] of CATALOGS.slice(1)) {
        it(`${name} covers exactly the en key set`, () => {
            const keys = Object.keys(catalog);
            const missing = EN_KEYS.filter(k => !keys.includes(k));
            const extra = keys.filter(k => !EN_KEYS.includes(k));
            expect(missing, `missing in ${name}`).toEqual([]);
            expect(extra, `extra in ${name}`).toEqual([]);
        });

        it(`${name} keeps every {placeholder} from en`, () => {
            for (const key of EN_KEYS) {
                const enVars = [...(en as Record<string, string>)[key].matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
                const locVars = [...catalog[key].matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
                expect(locVars, `${name}:${key}`).toEqual(enVars);
            }
        });
    }
});

describe('no emoji in any catalog (the no-emoji rule is language-independent)', () => {
    // Extended_Pictographic catches emoji without flagging typography
    // (·, —, ¿, accents) or math symbols the catalogs legitimately use.
    const emoji = /\p{Extended_Pictographic}/u;
    for (const [name, catalog] of CATALOGS) {
        it(`${name} contains no emoji`, () => {
            for (const [key, value] of Object.entries(catalog)) {
                expect(emoji.test(value), `${name}:${key} = "${value}"`).toBe(false);
            }
        });
    }
});

describe('length budgets (per UI slot)', () => {
    // Budgets in characters for Latin-script locales, derived from the actual
    // UI slots. CJK locales (wave 3) will need ~half these — see docs/i18n.md.
    const BUDGETS: [RegExp, number, string][] = [
        [/^nav\.(play|league|magic|me)$/, 14, 'bottom-nav pill'],
        [/^rail\./, 34, 'rail tooltip / toast'],
        [/^cat\./, 14, 'picker tile label'],
        [/^group\./, 20, 'picker section header'],
        [/^picker\./, 24, 'picker chrome'],
        [/^(endRun|paywall|welcome|trial)\.(end|keep|cta|ctaExpired|proTitle|maybeLater|unlockFor)$/, 28, 'primary button'],
        [/^trial\.chip$/, 48, 'trial chip'],
        [/^me\.stat/, 12, 'stat label'],
    ];
    for (const [name, catalog] of CATALOGS) {
        it(`${name} fits every slot budget`, () => {
            for (const [pattern, max, slot] of BUDGETS) {
                for (const [key, value] of Object.entries(catalog)) {
                    if (!pattern.test(key)) continue;
                    // Placeholders expand — measure with a worst-case fill.
                    const expanded = value.replace(/\{\w+\}/g, '12');
                    expect(expanded.length, `${name}:${key} (${slot}) = "${value}"`).toBeLessThanOrEqual(max);
                }
            }
        });
    }
});

describe('plural keys', () => {
    const pluralBases = [...new Set(
        EN_KEYS.filter(k => k.endsWith('.one') || k.endsWith('.other'))
            .map(k => k.replace(/\.(one|other)$/, '')),
    )];
    for (const [name, catalog] of CATALOGS) {
        it(`${name} has .one and .other for every plural base`, () => {
            for (const base of pluralBases) {
                expect(catalog[`${base}.one`], `${name}:${base}.one`).toBeTruthy();
                expect(catalog[`${base}.other`], `${name}:${base}.other`).toBeTruthy();
            }
        });
    }
});

describe('runtime behavior (test env resolves to en)', () => {
    it('falls back to en and interpolates', () => {
        expect(getLocale()).toBe('en');
        expect(t('rail.topicAria', { label: 'Multiply' })).toBe('Switch topic. Current: Multiply');
    });

    it('leaves unknown placeholders intact rather than corrupting', () => {
        expect(t('rail.topicAria', {})).toBe('Switch topic. Current: {label}');
    });

    it('selects plural categories', () => {
        expect(tCount('count.problem', 1)).toBe('1 problem');
        expect(tCount('count.problem', 0)).toBe('0 problems');
        expect(tCount('count.problem', 12)).toBe('12 problems');
        expect(tCount('count.day', 1)).toBe('1 day');
        expect(tCount('count.day', 3)).toBe('3 days');
    });

    it('formats large counts with locale grouping', () => {
        expect(tCount('count.problem', 1234)).toBe('1,234 problems');
    });
});
