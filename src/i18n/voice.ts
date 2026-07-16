/**
 * i18n/voice.ts — locale overlay layer for the "voice pools".
 *
 * The flat `t()` catalog (i18n/index.ts) localizes single strings. The
 * companion/teacher system instead reads from ARRAYS of interchangeable lines
 * ("voice pools") and random-picks one. Those arrays can't live in the flat
 * catalog, so this module gives them a parallel, id-addressed overlay.
 *
 * How it works
 * ------------
 *  - Every English pool in the codebase stays exactly where it is and remains
 *    the source of truth + the fallback.
 *  - At each READ site, the pool is routed through `voicePool(id, english)`.
 *  - For the active locale, if an overlay module supplies a translated array
 *    under that `id`, it wins; otherwise the English array is returned.
 *  - English needs no overlay (it IS the fallback), so there is no `en` module.
 *
 * Locale is fixed per session (see i18n/index.ts decision #1 — getLocale() is
 * stable), so `voicePool` does one map lookup and no reactivity is involved.
 *
 * Pool-id scheme (STABLE — translators key off these; do not rename)
 * ------------------------------------------------------------------
 *  Teacher voice pools:   `t.<teacherId>.<state>`
 *      teacherId ∈ chalk | sigma | coach-pi | pixel | cipher | nana | robo | lex
 *      state     ∈ idle | success | fail | streak | comeback | struggling | easterEggs
 *      (only the states a teacher actually defines are present)
 *
 *  Base pools (utils/chalkMessages.ts):   `base.<poolName>`
 *      idle, success, fail, streak, streakEarly, streakMid, streakHigh,
 *      streakLegendary, comeback, hardMode, timedMode
 *      keyed sub-pools:
 *        `base.sessionMilestone.<n>`  n ∈ 10 | 25 | 50 | 100 | 200
 *        `base.streakMilestone.<n>`   n ∈ 3 | 5 | 10 | 25 | 50
 *        `base.time.<bucket>`         bucket ∈ morning | afternoon | evening | night
 *
 *  Topic quips (domains/math/mathMessages.ts):
 *        `topic.<categoryId>.success`
 *        `topic.<categoryId>.fail`
 *        `topic.easterEggs`
 *
 * The complete English inventory (every id → its English array) is what the
 * per-locale modules below fill in. Overlay modules are intentionally EMPTY
 * stubs today — translators populate them one id at a time; any id they omit
 * transparently falls back to English.
 */

import { getLocale, type Locale } from './index';

import { es_voice } from './voice/es';
import { ptBR_voice } from './voice/pt-BR';
import { fr_voice } from './voice/fr';
import { de_voice } from './voice/de';
import { it_voice } from './voice/it';
import { id_voice } from './voice/id';
import { ko_voice } from './voice/ko';
import { zhHans_voice } from './voice/zh-Hans';
import { zhHant_voice } from './voice/zh-Hant';
import { ja_voice } from './voice/ja';
import { hi_voice } from './voice/hi';

/** Per-locale voice overlays. English is the fallback and has no entry here. */
export const VOICE_OVERLAYS: Partial<Record<Locale, Record<string, readonly string[]>>> = {
    es: es_voice,
    'pt-BR': ptBR_voice,
    fr: fr_voice,
    de: de_voice,
    it: it_voice,
    id: id_voice,
    ko: ko_voice,
    'zh-Hans': zhHans_voice,
    'zh-Hant': zhHant_voice,
    ja: ja_voice,
    hi: hi_voice,
};

/**
 * Resolve a voice pool for the active locale. Returns the localized array if
 * the current locale's overlay defines `id`, else the English `fallback`.
 * O(1): one map lookup on a session-stable locale.
 */
export function voicePool(id: string, fallback: readonly string[]): readonly string[] {
    return VOICE_OVERLAYS[getLocale()]?.[id] ?? fallback;
}
