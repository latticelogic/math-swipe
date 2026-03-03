/**
 * utils/questionTypes.ts
 *
 * Backward-compatibility shim.
 * All content has moved to src/domains/math/mathCategories.ts.
 * Existing imports continue to work without modification.
 *
 * New code should import directly from 'src/domains/math/mathCategories'.
 */
export type {
    QuestionType,
    AgeBand,
    QuestionGroup,
    QuestionTypeEntry,
} from '../domains/math/mathCategories';

export {
    QUESTION_TYPES,
    AGE_BANDS,
    MATH_BANDS,
    BAND_LABELS,
    GROUP_LABELS,
    typesForBand,
    defaultTypeForBand,
    glossaryForTypes,
} from '../domains/math/mathCategories';
