/**
 * domains/math/mathMessages.ts
 *
 * Math-specific companion message pools.
 * Injected into the generic chalkMessages picker via the `overrides` parameter.
 */
import type { QuestionType } from './mathCategories';
import type { ChalkMessageOverrides } from '../../utils/chalkMessages';

// ── Topic-specific quips ──────────────────────────────────────────────────────
//
// Short, specific, no emoji. Each line should *fit* the topic — generic
// hype like "Awesome!" goes in chalkMessages.ts BASE pools instead.

const TOPIC_SUCCESS: Partial<Record<QuestionType, string[]>> = {
    add: ['Sums add up.', 'Sum-thing clean.'],
    subtract: ['Took it away.', 'Difference, done.'],
    multiply: ['Times tables locked in.', 'Multiplication, sharp.'],
    divide: ['Divided and conquered.', 'Fair share.'],
    square: ['Squared away.', 'Power move.'],
    sqrt: ['Got to the root.', 'Radical answer.'],
    fraction: ['Piece of pie.', 'Fractions, no problem.'],
    decimal: ['Point well taken.', 'Decimal locked.'],
    percent: ['Hundred percent.', 'Percent on point.'],
    linear: ['Solved for x.', 'X revealed.'],
    'mix-basic': ['Mix master.', 'Jack of all four.'],
    'mix-all': ['Every topic, every time.', 'All-rounder.'],
};

const TOPIC_FAIL: Partial<Record<QuestionType, string[]>> = {
    add: ['Addition can be sneaky.', 'Sums slipped that time.'],
    subtract: ['Subtraction is tricky.', 'Almost had it.'],
    multiply: ['Tables take practice.', 'Get there with reps.'],
    divide: ['Division is tough — keep at it.', 'Dividing takes patience.'],
    square: ['Squares are powerful — you\'ll get there.', 'Power up next time.'],
    sqrt: ['Roots run deep.', 'Growing stronger.'],
    fraction: ['Fractions take practice.', 'One denominator at a time.'],
    decimal: ['Decimals can be sneaky.', 'Watch your points.'],
    percent: ['Percentages are tricky.', 'Almost nailed it.'],
    linear: ['Algebra takes patience.', 'X will reveal itself.'],
};

// ── Math-specific Easter eggs ─────────────────────────────────────────────────

const MATH_EASTER_EGGS: string[] = [
    '111,111,111 × 111,111,111 is a palindrome of 1s. Try it.',
    'A pizza of radius z and height a has volume pi·z·z·a.',
    '6 × 9 = 42 in base 13.',
    'A perfect number equals the sum of its proper divisors. 6, 28, 496…',
    'Parallel lines have so much in common — shame they\'ll never meet.',
    '1 = 0.999… It\'s not "almost"; it\'s exactly equal.',
    'There are more decimal places in pi than atoms anyone has counted.',
    '0 was developed in India around the 5th century. The word "zero" comes from Arabic ṣifr.',
];

// ── Exported overrides object ─────────────────────────────────────────────────

/**
 * Inject these overrides when calling `pickChalkMessage` so the generic
 * companion gets math-flavoured quips.
 */
export const MATH_MESSAGE_OVERRIDES: ChalkMessageOverrides = {
    topicSuccess: (typeId: string) => TOPIC_SUCCESS[typeId as QuestionType] ?? null,
    topicFail: (typeId: string) => TOPIC_FAIL[typeId as QuestionType] ?? null,
    easterEggs: MATH_EASTER_EGGS,
};
