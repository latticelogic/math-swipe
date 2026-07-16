/**
 * lessons — locale overlay for Magic-Trick LESSON content (the instructional
 * step prose in `MAGIC_TRICKS[].lesson.steps`, plus the rare WORDED `result`).
 *
 * Why a separate layer (not the `t()` catalog): lesson steps are ordered arrays
 * whose length varies per trick and whose lines are full sentences with
 * embedded worked examples. They don't fit the flat `MsgKey` string catalog.
 * So the English arrays in `src/utils/mathTricks.ts` stay the source-of-truth
 * AND the fallback, and each locale supplies an OPTIONAL override keyed by the
 * stable trick id.
 *
 * Contract (mirrors i18n/index.ts):
 *  - Locale is fixed per session — `getLocale()` is stable, so these helpers
 *    are referentially safe to call from render.
 *  - English has NO overlay entry; a missing locale, a missing trick, or a
 *    missing `.result` key all fall through to the English fallback passed by
 *    the caller. A gap shows English, never a crash.
 *  - Embedded MATH inside a step (numbers, ×, ÷, digits, examples) is part of
 *    the translatable string — translators keep it intact and only render the
 *    surrounding words in their language (see the per-locale stub headers).
 *
 * Worded results: nearly every `lesson.result` is a bare number or math
 * notation ('4225', 'N/(N+1)', 'φ (1.618...)') and is left alone. The only
 * WORDED result today is `divisible-11` → "Yes!". Worded results are stored in
 * the SAME per-locale map under the `'<trickId>.result'` key as a one-element
 * array, and read back via `lessonResult()`. This keeps one export per locale
 * stub instead of a parallel map.
 */

import { getLocale, type Locale } from './index';

import { es_lessons } from './lessons/es';
import { ptBR_lessons } from './lessons/pt-BR';
import { fr_lessons } from './lessons/fr';
import { de_lessons } from './lessons/de';
import { it_lessons } from './lessons/it';
import { id_lessons } from './lessons/id';
import { ko_lessons } from './lessons/ko';
import { zhHans_lessons } from './lessons/zh-Hans';
import { zhHant_lessons } from './lessons/zh-Hant';
import { ja_lessons } from './lessons/ja';
import { hi_lessons } from './lessons/hi';

/** Per-locale lesson overlays, keyed by trick id (worded results under
 *  `'<trickId>.result'`). English is intentionally absent — it is the
 *  fallback. Locales resolve to `undefined` until their stub is populated,
 *  which is a valid "no overlay → use English" state. */
const LESSON_OVERLAYS: Partial<Record<Locale, Record<string, readonly string[]>>> = {
    es: es_lessons,
    'pt-BR': ptBR_lessons,
    fr: fr_lessons,
    de: de_lessons,
    it: it_lessons,
    id: id_lessons,
    ko: ko_lessons,
    'zh-Hans': zhHans_lessons,
    'zh-Hant': zhHant_lessons,
    ja: ja_lessons,
    hi: hi_lessons,
};

/** Localized lesson STEP array for a trick. Falls back to the English steps
 *  (pass `trick.lesson.steps`) when the current locale has no override. */
export function lessonSteps(trickId: string, fallback: readonly string[]): readonly string[] {
    return LESSON_OVERLAYS[getLocale()]?.[trickId] ?? fallback;
}

/** Localized WORDED lesson result for a trick (e.g. "Yes!"). Bare numbers and
 *  math-notation results are never overridden — callers still pass the English
 *  `trick.lesson.result` as the fallback, which is returned unchanged when the
 *  locale has no `'<trickId>.result'` override. */
export function lessonResult(trickId: string, fallback: string): string {
    return LESSON_OVERLAYS[getLocale()]?.[`${trickId}.result`]?.[0] ?? fallback;
}
