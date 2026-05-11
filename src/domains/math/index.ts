/**
 * domains/math/index.ts
 *
 * Public API surface for the math domain.
 * Other modules should import from here, not from individual math domain files.
 */

export type { QuestionType, AgeBand, QuestionGroup } from './mathCategories';
export {
    QUESTION_TYPES,
    AGE_BANDS,
    MATH_BANDS,
    BAND_LABELS,
    GROUP_LABELS,
    typesForBand,
    defaultTypeForBand,
    migrateLegacyBand,
} from './mathCategories';

export { DAILY_COUNT, DAILY_TYPES } from './mathDailyConfig';

export { MATH_MESSAGE_OVERRIDES } from './mathMessages';

export type { MathAchievementStats } from './mathAchievements';
export { EVERY_MATH_ACHIEVEMENT } from './mathAchievements';
