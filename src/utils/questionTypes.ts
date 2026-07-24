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
    QuestionGroup,
    QuestionTypeEntry,
} from '../domains/math/mathCategories';

export {
    QUESTION_TYPES,
    GROUP_LABELS,
    visibleQuestionTypes,
    DEFAULT_QUESTION_TYPE,
} from '../domains/math/mathCategories';
