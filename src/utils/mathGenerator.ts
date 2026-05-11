import type { QuestionType } from './questionTypes';
export type { QuestionType } from './questionTypes';

export interface Problem {
    id: string;
    expression: string;      // Plain text OR LaTeX string
    latex?: string;           // If set, render with KaTeX instead of plain text
    answer: number;
    options: number[];        // 3 shuffled choices
    optionLabels?: string[];  // Optional display labels (e.g. fractions)
    correctIndex: number;     // which index in options[] is the answer
    startTime?: number;
    /** Optional visual type — e.g. 'bond' shows an SVG number bond diagram */
    visual?: 'bond';
    /** Bond metadata when visual === 'bond' */
    bondTotal?: number;
    bondPart?: number;
}

const BASIC_TYPES: QuestionType[] = ['add', 'subtract', 'multiply', 'divide'];
export const YOUNG_TYPES: QuestionType[] = ['add1', 'sub1', 'bonds', 'doubles', 'compare', 'skip', 'shapes', 'evenodd', 'tens'];
const CORE_TYPES: QuestionType[] = ['round', 'orderops'];
const ALL_INDIVIDUAL: QuestionType[] = [
    ...BASIC_TYPES, 'square', 'sqrt', 'exponent', 'negatives', 'linear', 'gcflcm', 'ratio',
    'fraction', 'decimal', 'percent', ...YOUNG_TYPES, ...CORE_TYPES,
];

/** Optional RNG function — defaults to Math.random */
type RngFn = () => number;
let _rng: RngFn = Math.random;

/**
 * Generate a problem based on type and difficulty.
 * hardMode expands all ranges significantly.
 * rng: optional seeded RNG — avoids monkey-patching Math.random.
 */
export function generateProblem(difficulty: number, type: QuestionType = 'multiply', hardMode = false, rng?: RngFn): Problem {
    // Stash custom rng for use by all helper functions
    const prevRng = _rng;
    if (rng) _rng = rng;
    try {
        return _generateProblem(difficulty, type, hardMode);
    } finally {
        _rng = prevRng;
    }
}

function _generateProblem(difficulty: number, type: QuestionType, hardMode: boolean): Problem {
    // Mixed/special modes delegate to a random sub-type
    if (type === 'mix-basic' || type === 'daily' || type === 'challenge') return _generateProblem(difficulty, pickRandom(BASIC_TYPES), hardMode);
    if (type === 'mix-all') return _generateProblem(difficulty, pickRandom(ALL_INDIVIDUAL), hardMode);

    // Every generator now takes (difficulty, hardMode) per the difficulty-curve
    // spec (docs/difficulty-curves.md). Topics that previously had zero-arg
    // signatures were the source of the "flat curve" bug — they ignored both
    // dials. Now uniform.
    switch (type) {
        case 'add': return genAdd(difficulty, hardMode);
        case 'subtract': return genSubtract(difficulty, hardMode);
        case 'multiply': return genMultiply(difficulty, hardMode);
        case 'divide': return genDivide(difficulty, hardMode);
        case 'square': return genSquare(difficulty, hardMode);
        case 'sqrt': return genSqrt(difficulty, hardMode);
        case 'fraction': return genFraction(difficulty, hardMode);
        case 'decimal': return genDecimal(difficulty, hardMode);
        case 'percent': return genPercent(difficulty, hardMode);
        case 'linear': return genLinear(difficulty, hardMode);
        case 'add1': return genAdd1(difficulty, hardMode);
        case 'sub1': return genSub1(difficulty, hardMode);
        case 'bonds': return genBonds(difficulty, hardMode);
        case 'doubles': return genDoubles(difficulty, hardMode);
        case 'compare': return genCompare(difficulty, hardMode);
        case 'skip': return genSkip(difficulty, hardMode);
        case 'shapes': return genShapes(difficulty, hardMode);
        case 'evenodd': return genEvenOdd(difficulty, hardMode);
        case 'tens': return genTens(difficulty, hardMode);
        case 'round': return genRound(difficulty, hardMode);
        case 'orderops': return genOrderOps(difficulty, hardMode);

        case 'exponent': return genExponent(difficulty, hardMode);
        case 'negatives': return genNegatives(difficulty, hardMode);
        case 'gcflcm': return genGcfLcm(difficulty, hardMode);
        case 'ratio': return genRatio(difficulty, hardMode);
        default: return genAdd(difficulty, hardMode); // Exhaustive fallback
    }
}

// ── Original Generators ─────────────────────────────────

function genAdd(d: number, hard: boolean): Problem {
    if (hard) {
        // hardMode: 3-term addition or 4-digit 2-term (per spec)
        if (_rng() > 0.5) {
            const a = randInt(100, 9999), b = randInt(100, 9999);
            return pack(`${a} + ${b}`, a + b, nearDistractors, `${a} + ${b}`);
        }
        const a = randInt(10, 99), b = randInt(10, 99), c = randInt(10, 99);
        return pack(`${a} + ${b} + ${c}`, a + b + c, nearDistractors, `${a} + ${b} + ${c}`);
    }
    const [lo, hi] = addRange(d);
    const a = randInt(lo, hi), b = randInt(lo, hi);
    return pack(`${a} + ${b}`, a + b, nearDistractors, `${a} + ${b}`);
}

function genSubtract(d: number, hard: boolean): Problem {
    if (hard) {
        // hardMode: 3-term subtraction or 4-digit 2-term (per spec)
        if (_rng() > 0.5) {
            const a = randInt(1000, 9999), b = randInt(100, 999);
            return pack(`${a} − ${b}`, a - b, nearDistractors, `${a} - ${b}`);
        }
        const a = randInt(50, 99), b = randInt(10, 30), c = randInt(5, 20);
        // a - b - c always > 0 since a >= 50 and b + c <= 50
        return pack(`${a} − ${b} − ${c}`, a - b - c, nearDistractors, `${a} - ${b} - ${c}`);
    }
    const [lo, hi] = addRange(d);
    let a = randInt(lo, hi), b = randInt(lo, hi);
    if (a < b) [a, b] = [b, a];
    return pack(`${a} − ${b}`, a - b, nearDistractors, `${a} - ${b}`);
}

function genMultiply(d: number, hard: boolean): Problem {
    // hardMode per spec: 13-99 × 13-99 — genuine mental multiplication
    // outside the standard times table (escapes 12×12).
    const [minA, maxA, minB, maxB] = hard ? [13, 99, 13, 99] : mulRange(d);
    const a = randInt(minA, maxA), b = randInt(minB, maxB);
    const flip = _rng() > 0.5;
    const expr = flip ? `${b} × ${a}` : `${a} × ${b}`;
    const latex = flip ? `${b} \\times ${a}` : `${a} \\times ${b}`;
    return pack(expr, a * b, (ans) => mulDistractors(a, b, ans), latex);
}

function genDivide(d: number, hard: boolean): Problem {
    // hardMode: result is whole (no remainder) but dividend has 3-4 digits.
    // We construct as `a * b` then divide by `b`, so the answer `a` is always
    // whole. Choose `a` large to push dividend into 3-4 digit territory.
    const [minA, maxA, minB, maxB] = hard ? [13, 99, 13, 99] : mulRange(d);
    const a = randInt(minA, maxA), b = randInt(minB, maxB);
    const product = a * b;
    return pack(`${product} ÷ ${b}`, a, nearDistractors, `${product} \\div ${b}`);
}

function genSquare(d: number, hard: boolean): Problem {
    if (hard) {
        // hardMode per spec: connect to the Tricks system — squaring numbers
        // ending in 5 has a known mental shortcut (n5² = n(n+1) | 25).
        // Mix this with bigger squares and the boundary case 99².
        const r = _rng();
        let n: number;
        if (r < 0.5) {
            // numbers ending in 5: 15, 25, 35, ..., 95
            n = pickRandom([15, 25, 35, 45, 55, 65, 75, 85, 95]);
        } else if (r < 0.7) {
            // boundary case 99 (the "almost 100" trick)
            n = 99;
        } else {
            // general bigger squares
            n = randInt(20, 50);
        }
        return pack(`${n}²`, n * n, nearDistractors, `${n}^2`);
    }
    const max = d <= 1 ? 3 : d <= 2 ? 5 : d <= 3 ? 9 : d <= 4 ? 12 : 15;
    const n = randInt(2, max);
    return pack(`${n}²`, n * n, nearDistractors, `${n}^2`);
}

function genSqrt(d: number, hard: boolean): Problem {
    if (hard) {
        // hardMode per spec: same pool as squaring + non-perfect-square
        // "nearest integer" questions to force estimation. Distractors for
        // estimation problems are off-by-one neighbours.
        const r = _rng();
        if (r < 0.3) {
            // Non-perfect: ask for nearest integer
            const n = randInt(10, 200);
            const answer = Math.round(Math.sqrt(n));
            return pack(`√${n} ≈ ?`, answer, (ans) => [ans - 1, ans + 1], `\\sqrt{${n}} \\approx ?`);
        }
        const n = r < 0.7
            ? pickRandom([15, 25, 35, 45, 55, 65, 75, 85, 95])
            : randInt(20, 50);
        return pack(`√${n * n}`, n, nearDistractors, `\\sqrt{${n * n}}`);
    }
    const max = d <= 1 ? 3 : d <= 2 ? 5 : d <= 3 ? 9 : d <= 4 ? 12 : 15;
    const n = randInt(2, max);
    return pack(`√${n * n}`, n, nearDistractors, `\\sqrt{${n * n}}`);
}

// ── Young K-2 Generators ────────────────────────────────

function genAdd1(d: number, hard: boolean): Problem {
    // Per spec:
    //   Easy (d=1): 1-5 + 1-5 (counting-on-fingers range)
    //   Med  (d=2-3): 1-9 + 1-9 (the current behaviour)
    //   Hard (d=4-5): 1-12 + 1-12 (teen sums, e.g., 7+8)
    //   hardMode: 1-20 + 1-20 with "make-a-ten" bias — sum must cross 10
    if (hard) {
        // Reject-sample: keep regenerating until sum > 10. With operands
        // in 1-20 this almost always succeeds in 1-3 tries.
        for (let attempt = 0; attempt < 10; attempt++) {
            const a = randInt(1, 20), b = randInt(1, 20);
            if (a + b > 10) return pack(`${a} + ${b}`, a + b, smallDistractors, `${a} + ${b}`);
        }
        // Fallback (vanishingly rare): just emit any pair
        const a = randInt(6, 20), b = randInt(6, 20);
        return pack(`${a} + ${b}`, a + b, smallDistractors, `${a} + ${b}`);
    }
    const max = d <= 1 ? 5 : d <= 3 ? 9 : 12;
    const a = randInt(1, max), b = randInt(1, max);
    return pack(`${a} + ${b}`, a + b, smallDistractors, `${a} + ${b}`);
}

function genSub1(d: number, hard: boolean): Problem {
    // Mirrors genAdd1. hardMode forces regrouping (borrow across the tens
    // digit, e.g., 14 − 7) by keeping the answer below the minuend's tens
    // floor.
    if (hard) {
        for (let attempt = 0; attempt < 10; attempt++) {
            const a = randInt(11, 20), b = randInt(1, 9);
            // Regrouping required when a's units digit < b
            if (a % 10 < b) return pack(`${a} − ${b}`, a - b, smallDistractors, `${a} - ${b}`);
        }
        const a = randInt(11, 18), b = randInt(5, 9);
        let aa = a, bb = b; if (aa < bb) [aa, bb] = [bb, aa];
        return pack(`${aa} − ${bb}`, aa - bb, smallDistractors, `${aa} - ${bb}`);
    }
    const max = d <= 1 ? 5 : d <= 3 ? 9 : 12;
    let a = randInt(2, max), b = randInt(1, max);
    if (a < b) [a, b] = [b, a];
    return pack(`${a} − ${b}`, a - b, smallDistractors, `${a} - ${b}`);
}

function genBonds(d: number, hard: boolean): Problem {
    // Per spec:
    //   Easy (d=1):   total = 5 only
    //   Med  (d=2-3): total ∈ {5, 10}
    //   Hard (d=4-5): total ∈ {10, 20}
    //   hardMode:     total ∈ {20, 50, 100}
    const targets = hard ? [20, 50, 100]
        : d <= 1 ? [5]
            : d <= 3 ? [5, 10]
                : [10, 20];
    const total = pickRandom(targets);
    const part = randInt(1, total - 1);
    const answer = total - part;
    const p = pack(`${part} + ? = ${total}`, answer, smallDistractors);
    return { ...p, visual: 'bond' as const, bondTotal: total, bondPart: part };
}

function genDoubles(d: number, hard: boolean): Problem {
    // Per spec:
    //   Easy (d=1):   1-5 doubled (memorized: 2,4,6,8,10)
    //   Med  (d=2-3): 1-10 doubled (current)
    //   Hard (d=4-5): 1-20 doubled (strategy: 14+14, 17+17)
    //   hardMode:     1-50 doubled (real mental work: 37+37)
    const max = hard ? 50 : d <= 1 ? 5 : d <= 3 ? 10 : 20;
    const n = randInt(1, max);
    return pack(`${n} + ${n}`, n * 2, smallDistractors, `${n} + ${n}`);
}

function genCompare(d: number, hard: boolean): Problem {
    // hardMode per spec: compare *expressions* not numbers. This is the
    // topic that benefits most from the qualitative shift — comparing 3×4
    // vs 5+8 tests fluency, not magnitude perception.
    if (hard) {
        // Generate two small expressions and ask which evaluates larger.
        // Pool: a+b, a-b, a×b, with operands in 1-12. Small enough to be
        // mental-math; large enough that the *closeness* of values forces
        // real computation (no instant visual answer).
        const makeExpr = (): { str: string; val: number } => {
            const op = pickRandom(['+', '-', '×']);
            const a = randInt(1, 12), b = randInt(1, 12);
            if (op === '+') return { str: `${a}+${b}`, val: a + b };
            if (op === '×') return { str: `${a}×${b}`, val: a * b };
            // ensure subtraction stays non-negative
            const [hi, lo] = a >= b ? [a, b] : [b, a];
            return { str: `${hi}-${lo}`, val: hi - lo };
        };
        let left: { str: string; val: number }, right: { str: string; val: number };
        // Retry until non-equal (rare to be equal but possible)
        let safety = 0;
        do {
            left = makeExpr();
            right = makeExpr();
        } while (left.val === right.val && ++safety < 10);
        if (left.val === right.val) right.val = left.val + 1; // forced safety
        const answer = Math.max(left.val, right.val);
        const smaller = Math.min(left.val, right.val);
        return pack(`Bigger: ${left.str} or ${right.str}?`, answer, () => {
            const d1 = smaller;
            let d2 = answer + randInt(1, 3);
            if (d2 === d1) d2 = answer + 4;
            return [d1, d2];
        });
    }
    const max = d <= 1 ? 10 : d <= 3 ? 50 : 200;
    const a = randInt(1, max);
    let b = randInt(1, max);
    if (a === b) b = a + randInt(1, 5);
    const answer = Math.max(a, b);
    const smaller = Math.min(a, b);
    return pack(`Bigger: ${a} or ${b}?`, answer, () => {
        const d1 = smaller;
        let d2 = answer + randInt(1, 3);
        if (d2 === d1) d2 = answer + 4;
        return [d1, d2];
    });
}

function genSkip(d: number, hard: boolean): Problem {
    // Per spec:
    //   Easy (d=1):   {2, 10}
    //   Med  (d=2-3): {2, 5, 10}
    //   Hard (d=4-5): {3, 4, 5, 7}
    //   hardMode:     {6, 8, 9, 11, 12, 25} + backward (50% of the time)
    let stepsPool: number[];
    let allowBackward = false;
    if (hard) {
        stepsPool = [6, 8, 9, 11, 12, 25];
        allowBackward = true;
    } else if (d <= 1) {
        stepsPool = [2, 10];
    } else if (d <= 3) {
        stepsPool = [2, 5, 10];
    } else {
        stepsPool = [3, 4, 5, 7];
    }
    const steps = pickRandom(stepsPool);
    const backward = allowBackward && _rng() > 0.5;
    if (backward) {
        // Start high enough that we never cross zero
        const start = randInt(4, 8) * steps;
        const seq = [start, start - steps, start - 2 * steps];
        const answer = start - 3 * steps;
        return pack(`${seq.join(', ')}, ?`, answer, (ans) => {
            return [ans + steps, ans - steps];
        });
    }
    const start = randInt(0, 5) * steps;
    const seq = [start, start + steps, start + 2 * steps];
    const answer = start + 3 * steps;
    return pack(`${seq.join(', ')}, ?`, answer, (ans) => {
        return [ans + steps, ans - steps > 0 ? ans - steps : ans + 2 * steps];
    });
}

/** Shapes: count the sides of a common 2D shape. Visual answer set is the
 *  side counts so we keep the existing 3-option swipe machinery intact.
 *
 *  hardMode (qualitative "shape properties" questions like "how many right
 *  angles in a regular hexagon?") is deferred to a follow-up PR — it
 *  requires a new question shape because the answer space isn't side-count.
 *  In hardMode for now: widest side range (3-12) including dodecagon. */
function genShapes(d: number, hard: boolean): Problem {
    type ShapeDef = { emoji: string; name: string; sides: number };
    // Difficulty bands per spec:
    //   Easy  (d=1):   3-4 sides (triangle/quadrilateral)
    //   Med   (d=2-3): 3-6 sides (current behaviour)
    //   Hard  (d=4-5): 3-10 sides (heptagon, octagon, nonagon, decagon)
    //   hardMode:      3-12 sides (adds hendecagon, dodecagon — extreme)
    const ALL: ShapeDef[] = [
        { emoji: '🔺', name: 'triangle', sides: 3 },
        { emoji: '🟦', name: 'square', sides: 4 },
        { emoji: '◆', name: 'diamond', sides: 4 },
        { emoji: '⭐', name: 'star', sides: 5 },
        { emoji: '⬢', name: 'hexagon', sides: 6 },
        { emoji: '⬣', name: 'heptagon', sides: 7 },
        { emoji: '🛑', name: 'octagon', sides: 8 },
        { emoji: '✋', name: 'nonagon', sides: 9 },
        { emoji: '🔟', name: 'decagon', sides: 10 },
        { emoji: '🌟', name: 'hendecagon', sides: 11 },
        { emoji: '⏰', name: 'dodecagon', sides: 12 },
    ];
    const maxSides = hard ? 12 : d <= 1 ? 4 : d <= 3 ? 6 : 10;
    const pool = ALL.filter(s => s.sides <= maxSides);
    const shape = pickRandom(pool);
    const answer = shape.sides;
    return pack(`Sides of ${shape.emoji} ?`, answer, (ans) => {
        // Distractors: other plausible side counts within the active pool
        const distractorPool = pool.map(s => s.sides).filter(n => n !== ans);
        // Shuffle deterministically against rng
        for (let i = distractorPool.length - 1; i > 0; i--) {
            const j = Math.floor(_rng() * (i + 1));
            [distractorPool[i], distractorPool[j]] = [distractorPool[j], distractorPool[i]];
        }
        // Fall back to neighbouring numbers if the pool is too small (e.g. d=1)
        const d1 = distractorPool[0] ?? ans + 1;
        const d2 = distractorPool[1] ?? ans + 2;
        return [d1, d2];
    });
}

/** Even / odd recognition. The "options" use 0 for even and 1 for odd so the
 *  existing equality-based engine works; labels show the words.
 *
 *  hardMode per spec: 4-digit numbers AND sum/product expressions
 *  ("is 47+92 even or odd?") — tests parity reasoning, not just last-digit
 *  recognition. */
function genEvenOdd(d: number, hard: boolean): Problem {
    let expression: string, value: number;
    if (hard) {
        // 50% expression, 50% 4-digit
        if (_rng() > 0.5) {
            const a = randInt(10, 99), b = randInt(10, 99);
            const op = pickRandom(['+', '×']);
            value = op === '+' ? a + b : a * b;
            expression = `Is ${a} ${op} ${b} even or odd?`;
        } else {
            value = randInt(1000, 9999);
            expression = `Is ${value} even or odd?`;
        }
    } else {
        // Easy (d=1): 1-20; Med (d=2-3): 2-99; Hard (d=4-5): 100-999
        const max = d <= 1 ? 20 : d <= 3 ? 99 : 999;
        const min = d <= 1 ? 1 : d <= 3 ? 2 : 100;
        value = randInt(min, max);
        expression = `Is ${value} even or odd?`;
    }
    const correct = value % 2 === 0 ? 0 : 1;
    const options = [0, 1, 2];
    const optionLabels = ['Even', 'Odd', 'Either'];
    return {
        id: uid(),
        expression,
        answer: correct,
        options,
        optionLabels,
        correctIndex: correct,
    };
}

/** "What's 10 more than N?" — builds base-10 intuition. Includes occasional
 *  10-less variants so kids generalise.
 *
 *  Per spec:
 *    Easy (d=1):    1-39 + 10 only (same-decade, no borrow across 100)
 *    Med  (d=2-3):  10-89 ± 10 (current behaviour)
 *    Hard (d=4-5):  10-89 ± 30 (multi-step: 80 - 30 = 50)
 *    hardMode:      ±20/30/40/50 from 3-digit numbers (e.g. 470 - 30)
 */
function genTens(d: number, hard: boolean): Problem {
    if (hard) {
        const step = pickRandom([20, 30, 40, 50]);
        const n = randInt(120, 870);
        const isMore = _rng() > 0.5;
        const answer = isMore ? n + step : n - step;
        const verb = isMore ? `${step} more than` : `${step} less than`;
        return pack(`${verb} ${n}`, answer, smallDistractors);
    }
    if (d <= 1) {
        const n = randInt(1, 39);
        return pack(`10 more than ${n}`, n + 10, smallDistractors);
    }
    if (d <= 3) {
        const n = randInt(10, 89);
        const isMore = _rng() > 0.4;
        const answer = isMore ? n + 10 : n - 10;
        return pack(`${isMore ? '10 more than' : '10 less than'} ${n}`, answer, smallDistractors);
    }
    // Hard: ±30
    const n = randInt(40, 89);
    const isMore = _rng() > 0.5;
    const step = 30;
    const answer = isMore ? n + step : n - step;
    return pack(`${isMore ? '30 more than' : '30 less than'} ${n}`, answer, smallDistractors);
}

// ── Core 3-5 Generators ─────────────────────────────────

function genRound(d: number, hard: boolean): Problem {
    // Per spec:
    //   Easy (d=1):    round to 10 only, range 1-100
    //   Med  (d=2-3):  round to 10 or 100, range 1-1000
    //   Hard (d=4-5):  round to 10/100/1000, range 1-10000
    //   hardMode:      qualitative — decimals rounded to nearest tenth/whole
    //                  ("Round 4.56 to the nearest tenth?")
    if (hard && _rng() > 0.5) {
        // Decimal rounding: choose to nearest whole, or to nearest tenth
        const places = pickRandom([1, 0.1]);
        const wholeMax = 50;
        const n = Math.round((randInt(0, wholeMax) + _rng()) * 100) / 100; // e.g. 4.56
        const answer = Math.round(n / places) * places;
        // JS float quirks: re-round answer to clean it up
        const cleanAns = Math.round(answer * 100) / 100;
        const placeLabel = places === 1 ? 'whole number' : 'tenth';
        return pack(`Round ${n} to nearest ${placeLabel}`, cleanAns, decimalDistractors);
    }
    const placeOptions = hard ? [10, 100, 1000]
        : d <= 1 ? [10]
            : d <= 3 ? [10, 100]
                : [10, 100, 1000];
    const places = pickRandom(placeOptions);
    const rangeMax = hard ? 9999 : d <= 1 ? 99 : d <= 3 ? 999 : 9999;
    const rangeMin = places === 10 ? 11 : places === 100 ? 101 : 1001;
    const n = randInt(rangeMin, rangeMax);
    const answer = Math.round(n / places) * places;
    return pack(`Round ${n} to nearest ${places}`, answer, (ans) => {
        // Common mistake distractors: round wrong direction
        const d1 = ans === Math.floor(n / places) * places
            ? Math.ceil(n / places) * places
            : Math.floor(n / places) * places;
        const d2 = ans + places;
        return [d1, d2];
    });
}

function genOrderOps(d: number, hard: boolean): Problem {
    // Per spec — difficulty here is about *how many rules* must be applied:
    //   Easy (d=1):    a + b × c (current 3-term simple)
    //   Med  (d=2-3):  3-term BIDMAS, mul before add — a × b + c × d
    //   Hard (d=4-5):  introduce parentheses — (a + b) × c
    //   hardMode:      4-term mixed OR include exponents (2² + 3 × 4)
    let expression: string, answer: number, latex: string;

    if (hard) {
        // hardMode: 50/50 split between 4-term mixed and exponent inclusion
        if (_rng() > 0.5) {
            // 4-term: a + b × c − d
            const a = randInt(1, 9), b = randInt(2, 6), c = randInt(2, 6);
            const dTerm = randInt(1, b * c - 1);
            answer = a + b * c - dTerm;
            expression = `${a} + ${b} × ${c} − ${dTerm}`;
            latex = `${a} + ${b} \\times ${c} - ${dTerm}`;
        } else {
            // Exponent: e² + a × b
            const e = randInt(2, 5);
            const a = randInt(2, 6), b = randInt(2, 6);
            answer = e * e + a * b;
            expression = `${e}² + ${a} × ${b}`;
            latex = `${e}^2 + ${a} \\times ${b}`;
        }
        return pack(expression, answer, nearDistractors, latex);
    }

    if (d <= 1) {
        // a + b × c
        const a = randInt(1, 9), b = randInt(2, 6), c = randInt(2, 6);
        answer = a + b * c;
        expression = `${a} + ${b} × ${c}`;
        latex = `${a} + ${b} \\times ${c}`;
    } else if (d <= 3) {
        // a × b + c × d
        const a = randInt(2, 6), b = randInt(2, 6), c = randInt(2, 6), e = randInt(2, 6);
        answer = a * b + c * e;
        expression = `${a} × ${b} + ${c} × ${e}`;
        latex = `${a} \\times ${b} + ${c} \\times ${e}`;
    } else {
        // (a + b) × c — parentheses
        const a = randInt(1, 9), b = randInt(1, 9), c = randInt(2, 6);
        answer = (a + b) * c;
        expression = `(${a} + ${b}) × ${c}`;
        latex = `(${a} + ${b}) \\times ${c}`;
    }
    return pack(expression, answer, nearDistractors, latex);
}




// ── Advanced 6+ Generators ──────────────────────────────

function genExponent(d: number, hard: boolean): Problem {
    // Per spec:
    //   Easy (d=1):    base 2-3, exp 2-3 (memorized small powers)
    //   Med  (d=2-3):  base 2-5, exp 2-4 (current d-agnostic behavior)
    //   Hard (d=4-5):  base 2-10, exp 2-5
    //   hardMode:      reserved for inverse / fractional-base questions
    //                  (deferred to a follow-up PR — needs a new question
    //                  shape; for now hardMode uses the widest numeric range)
    const [baseMin, baseMax, expMin, expMax] = hard ? [2, 12, 2, 6]
        : d <= 1 ? [2, 3, 2, 3]
            : d <= 3 ? [2, 5, 2, 4]
                : [2, 10, 2, 5];
    const base = randInt(baseMin, baseMax);
    const exp = randInt(expMin, expMax);
    const answer = Math.pow(base, exp);
    const superscripts: Record<number, string> = { 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶' };
    return pack(`${base}${superscripts[exp] || '^' + exp}`, answer, nearDistractors, `${base}^{${exp}}`);
}

function genNegatives(d: number, hard: boolean): Problem {
    // Per spec:
    //   Easy (d=1):    ±1-10 (current d-agnostic behavior)
    //   Med  (d=2-3):  ±1-20
    //   Hard (d=4-5):  ±1-50 with multiplication (e.g., -7 × 4)
    //   hardMode:      3-term: -a + b - c, OR -a × -b × c (sign tracking)
    if (hard) {
        // 3-term sign-tracking: 50/50 split between additive and multiplicative
        if (_rng() > 0.5) {
            // -a + b - c
            const a = randInt(1, 20), b = randInt(1, 20), c = randInt(1, 20);
            const answer = -a + b - c;
            return pack(`(-${a}) + ${b} − ${c}`, answer, nearDistractors, `(-${a}) + ${b} - ${c}`);
        }
        // -a × -b × c
        const a = randInt(2, 9), b = randInt(2, 9), c = randInt(2, 9);
        const answer = -a * -b * c; // positive
        return pack(`(-${a}) × (-${b}) × ${c}`, answer, nearDistractors, `(-${a}) \\times (-${b}) \\times ${c}`);
    }
    // Hard d=4-5: include multiplication with negatives
    if (d >= 4) {
        // -a × b OR a × -b
        const a = randInt(1, 50), b = randInt(2, 9);
        const negFirst = _rng() > 0.5;
        if (negFirst) {
            const answer = -a * b;
            return pack(`(-${a}) × ${b}`, answer, nearDistractors, `(-${a}) \\times ${b}`);
        }
        const answer = a * -b;
        return pack(`${a} × (-${b})`, answer, nearDistractors, `${a} \\times (-${b})`);
    }
    // Easy / Med: ±range, additive only
    const range = d <= 1 ? 10 : 20;
    const variant = randInt(0, 2);
    let a: number, b: number, answer: number, expression: string, latex: string;
    if (variant === 0) {
        a = -randInt(1, range); b = randInt(1, range);
        answer = a + b;
        expression = `(${a}) + ${b}`;
        latex = `(${a}) + ${b}`;
    } else if (variant === 1) {
        a = randInt(1, range); b = randInt(1, range);
        answer = a + b;
        expression = `${a} − (−${b})`;
        latex = `${a} - (-${b})`;
    } else {
        a = -randInt(1, range); b = -randInt(1, range);
        answer = a + b;
        expression = `(${a}) + (${b})`;
        latex = `(${a}) + (${b})`;
    }
    return pack(expression, answer, nearDistractors, latex);
}

function gcd(a: number, b: number): number {
    a = Math.abs(a); b = Math.abs(b);
    while (b) { [a, b] = [b, a % b]; }
    return a;
}

function genGcfLcm(d: number, hard: boolean): Problem {
    // Per spec:
    //   Easy (d=1):    GCF only, numbers up to ~30
    //   Med  (d=2-3):  GCF or LCM, numbers up to 60
    //   Hard (d=4-5):  LCM emphasis, numbers up to 144
    //   hardMode:      3-number GCF or LCM (e.g., GCF(12, 18, 30))
    if (hard) {
        // Three numbers built from a common factor + extra primes so the
        // answer isn't trivial.
        const factor = randInt(2, 6);
        const ms = [randInt(2, 6), randInt(2, 6), randInt(2, 6)];
        // De-dupe multipliers so the numbers aren't equal
        if (ms[0] === ms[1]) ms[1] = ms[1] === 6 ? 2 : ms[1] + 1;
        if (ms[1] === ms[2]) ms[2] = ms[2] === 6 ? 2 : ms[2] + 1;
        if (ms[0] === ms[2]) ms[2] = ms[2] === 5 ? 3 : ms[2] + 1;
        const a = factor * ms[0], b = factor * ms[1], c = factor * ms[2];
        const useGcf = _rng() > 0.5;
        if (useGcf) {
            const answer = gcd(gcd(a, b), c);
            return pack(`GCF(${a}, ${b}, ${c})`, answer, nearDistractors, `\\gcd(${a}, ${b}, ${c})`);
        }
        const lcm2 = (a * b) / gcd(a, b);
        const answer = (lcm2 * c) / gcd(lcm2, c);
        return pack(`LCM(${a}, ${b}, ${c})`, answer, nearDistractors, `\\text{lcm}(${a}, ${b}, ${c})`);
    }

    // d=1: GCF only, small. d=2-3: either, medium. d=4-5: LCM emphasis, large.
    const useGcf = d <= 1 ? true : d <= 3 ? _rng() > 0.5 : _rng() > 0.7;
    const [factorMin, factorMax, multMax] = d <= 1 ? [2, 4, 4]
        : d <= 3 ? [2, 6, 6]
            : [3, 8, 9];
    const factor = randInt(factorMin, factorMax);
    const m1 = randInt(2, multMax);
    let m2 = randInt(2, multMax);
    if (m1 === m2) m2 = m1 === multMax ? 2 : m1 + 1;
    const a = factor * m1, b = factor * m2;
    if (useGcf) {
        const answer = gcd(a, b);
        return pack(`GCF(${a}, ${b})`, answer, nearDistractors, `\\gcd(${a}, ${b})`);
    }
    const answer = (a * b) / gcd(a, b);
    return pack(`LCM(${a}, ${b})`, answer, nearDistractors, `\\text{lcm}(${a}, ${b})`);
}

function genRatio(d: number, hard: boolean): Problem {
    // This is the topic that prompted the entire difficulty-curves spec.
    // Previously took zero args; now uses both dials per the spec.
    //
    //   Easy (d=1):    simple equivalent ratios, multipliers ≤ 5
    //                  (e.g., 2:3 = 4:?)
    //   Med  (d=2-3):  multipliers up to 12 (current behaviour)
    //   Hard (d=4-5):  ratios that simplify in reverse — given large
    //                  numbers, find the simplified form (e.g., 12:18 = 2:?)
    //   hardMode:      3-term ratios (a:b:c)
    if (hard) {
        // 3-term ratio: a:b:c = sa·k : sb·k : sc·k
        // Generate small "true" ratio and scale up.
        const sa = randInt(1, 5), sb = randInt(1, 5), sc = randInt(1, 5);
        const k = randInt(2, 6);
        const a = sa * k, b = sb * k, c = sc * k;
        // Ask which term is missing in the simplified form
        const missing = randInt(0, 2);
        const parts = [sa, sb, sc];
        const answer = parts[missing];
        const shown = parts.map((p, i) => i === missing ? '?' : `${p}`);
        const expression = `${a} : ${b} : ${c} = ${shown.join(' : ')}`;
        return pack(expression, answer, (ans) => [ans + 1, ans === 1 ? ans + 2 : ans - 1]);
    }

    if (d <= 1) {
        // Simple equivalent: small ratio scaled by 2-5
        const sa = randInt(1, 5), sb = randInt(1, 5);
        if (sa === sb) return genRatio(d, hard); // skip degenerate 1:1
        const k = randInt(2, 5);
        const a = sa * k, b = sb * k;
        // Ask for the unknown half: sa:sb = a:?  or  sa:sb = ?:b
        if (_rng() > 0.5) {
            return pack(`${sa} : ${sb} = ${a} : ?`, b, (ans) => [ans + 1, ans === 1 ? ans + 2 : ans - 1]);
        }
        return pack(`${sa} : ${sb} = ? : ${b}`, a, (ans) => [ans + 1, ans === 1 ? ans + 2 : ans - 1]);
    }

    if (d <= 3) {
        // Current-ish: medium multipliers
        const g = randInt(2, 6);
        const a = randInt(1, 5) * g;
        const b = randInt(1, 5) * g;
        if (a === b) return genRatio(d, hard);
        const gg = gcd(a, b);
        const sa = a / gg, sb = b / gg;
        if (_rng() > 0.5) {
            return pack(`${a} : ${b} = ? : ${sb}`, sa, (ans) => [ans + 1, ans === 1 ? ans + 2 : ans - 1]);
        }
        return pack(`${a} : ${b} = ${sa} : ?`, sb, (ans) => [ans + 1, ans === 1 ? ans + 2 : ans - 1]);
    }

    // Hard d=4-5: larger numbers; the question is *simplification* not scaling
    // Pick a simplified ratio sa:sb (small) and scale by a larger factor so
    // the user has to find the GCF in reverse.
    const sa = randInt(1, 7), sb = randInt(1, 7);
    if (sa === sb) return genRatio(d, hard);
    const k = randInt(6, 12);
    const a = sa * k, b = sb * k;
    if (_rng() > 0.5) {
        return pack(`${a} : ${b} = ? : ${sb}`, sa, (ans) => [ans + 1, ans === 1 ? ans + 2 : ans - 1]);
    }
    return pack(`${a} : ${b} = ${sa} : ?`, sb, (ans) => [ans + 1, ans === 1 ? ans + 2 : ans - 1]);
}

// ── New Generators ──────────────────────────────────────

function genFraction(d: number, hard: boolean): Problem {
    // Difficulty-based denominator pools
    // Easy (d<=2): same-denom or simple pairs like 2&4, 3&6
    // Medium (d<=4): small mixed denoms
    // Hard mode: full range
    let d1: number, d2: number;
    if (hard) {
        const denoms = [2, 3, 4, 5, 6, 8, 10, 12];
        d1 = pickRandom(denoms);
        d2 = pickRandom(denoms.filter(x => x !== d1));
    } else if (d <= 2) {
        // Easy: same denominator OR simple factor pairs
        const easyPairs: [number, number][] = [
            [2, 2], [3, 3], [4, 4], [5, 5],  // same denom
            [2, 4], [4, 2], [3, 6], [6, 3],  // one divides the other
        ];
        [d1, d2] = pickRandom(easyPairs);
    } else if (d <= 4) {
        const denoms = [2, 3, 4, 5, 6];
        d1 = pickRandom(denoms);
        d2 = pickRandom(denoms.filter(x => x !== d1));
    } else {
        const denoms = [2, 3, 4, 5, 6, 8];
        d1 = pickRandom(denoms);
        d2 = pickRandom(denoms.filter(x => x !== d1));
    }

    const n1 = randInt(1, d1 - 1);
    const n2 = randInt(1, d2 - 1);

    // Bias towards addition at easy levels
    const isAdd = d <= 2 ? _rng() > 0.2 : _rng() > 0.4;
    const resultNum = isAdd ? (n1 * d2 + n2 * d1) : (n1 * d2 - n2 * d1);
    const resultDen = d1 * d2;

    // If subtraction gives negative or zero, re-roll (with guard)
    if (resultNum <= 0) {
        if (d <= 2 || hard) {
            // At easy levels or hard mode, just flip to addition
            const safeNum = n1 * d2 + n2 * d1;
            const safeG = gcd(safeNum, resultDen);
            const safeAnsNum = safeNum / safeG;
            const safeAnsDen = resultDen / safeG;
            const safeAnswer = safeAnsNum / safeAnsDen;
            const safeLtx = `\\dfrac{${n1}}{${d1}} + \\dfrac{${n2}}{${d2}}`;
            const safeExpr = `${n1}/${d1} + ${n2}/${d2}`;
            const correct = safeAnsNum === safeAnsDen ? safeAnsNum : safeAnswer;
            const distractors = fractionDistractors(safeAnsNum, safeAnsDen);
            const correctIndex = randInt(0, 2);
            const options = [...distractors];
            options.splice(correctIndex, 0, correct);
            const optionLabels = options.map(v => fracLabel(v));
            return { id: uid(), expression: safeExpr, latex: safeLtx, answer: correct, options, optionLabels, correctIndex };
        }
        return genFraction(d, hard);
    }

    const g = gcd(Math.abs(resultNum), resultDen);
    const ansNum = resultNum / g;
    const ansDen = resultDen / g;
    const answer = ansNum / ansDen;

    const op = isAdd ? '+' : '-';
    const latex = `\\dfrac{${n1}}{${d1}} ${op} \\dfrac{${n2}}{${d2}}`;
    const expression = `${n1}/${d1} ${isAdd ? '+' : '−'} ${n2}/${d2}`;

    // Build options as fractions
    const correct = ansNum === ansDen ? ansNum : answer; // if whole number
    const distractors = fractionDistractors(ansNum, ansDen);

    const correctIndex = randInt(0, 2);
    const options = [...distractors];
    options.splice(correctIndex, 0, correct);

    const optionLabels = options.map(v => fracLabel(v));

    return {
        id: uid(),
        expression, latex, answer: correct, options, optionLabels, correctIndex,
    };
}

function genDecimal(d: number, hard: boolean): Problem {
    // Per spec:
    //   Easy (d=1):    add/sub, one decimal place (0.1-0.9)
    //   Med  (d=2-3):  two decimal places, add/sub
    //   Hard (d=4-5):  multiplication of decimals (0.4 × 0.3 — conceptually tricky)
    //   hardMode:      division by decimals (12 ÷ 0.4) plus the d=5 mul case
    if (hard) {
        // 50/50 split between decimal-mul and decimal-div
        if (_rng() > 0.5) {
            // Division: integer / decimal, choose pairs that yield clean results.
            // E.g., 12 ÷ 0.4 = 30. Pick divisor d ∈ {0.2, 0.4, 0.5, 0.8} and
            // construct dividend = d * (whole integer answer).
            const divisor = pickRandom([0.2, 0.4, 0.5, 0.8]);
            const answer = randInt(5, 50);
            const dividend = Math.round(divisor * answer * 10) / 10;
            return pack(`${dividend} ÷ ${divisor}`, answer, decimalDistractors, `${dividend} \\div ${divisor}`);
        }
        // Decimal × decimal: small operands so answers stay short.
        const a = randDecimal([1, 9]); // 0.1-0.9
        const b = randDecimal([1, 9]);
        const answer = Math.round(a * b * 100) / 100;
        return pack(`${a} × ${b}`, answer, decimalDistractors, `${a} \\times ${b}`);
    }

    if (d <= 1) {
        // One decimal place, add/sub, small operands
        const a = randDecimal([1, 9]); // 0.1-0.9
        const b = randDecimal([1, 9]);
        const isAdd = _rng() > 0.4;
        let answer: number, op: string;
        if (isAdd) {
            answer = Math.round((a + b) * 10) / 10;
            op = '+';
        } else {
            const [hi, lo] = a >= b ? [a, b] : [b, a];
            answer = Math.round((hi - lo) * 10) / 10;
            return pack(`${hi} − ${lo}`, answer, decimalDistractors, `${hi} - ${lo}`);
        }
        return pack(`${a} ${op} ${b}`, answer, decimalDistractors, `${a} ${op} ${b}`);
    }

    if (d <= 3) {
        // Two decimal places, add/sub, slightly larger operands
        const a = Math.round((randInt(10, 99) + _rng()) * 100) / 100; // e.g. 4.56
        const b = Math.round((randInt(10, 99) + _rng()) * 100) / 100;
        const isAdd = _rng() > 0.4;
        if (isAdd) {
            const answer = Math.round((a + b) * 100) / 100;
            return pack(`${a} + ${b}`, answer, decimalDistractors, `${a} + ${b}`);
        }
        const [hi, lo] = a >= b ? [a, b] : [b, a];
        const answer = Math.round((hi - lo) * 100) / 100;
        return pack(`${hi} − ${lo}`, answer, decimalDistractors, `${hi} - ${lo}`);
    }

    // Hard d=4-5: decimal × decimal (conceptually tricky)
    const a = randDecimal([1, 9]);
    const b = randDecimal([1, 9]);
    const answer = Math.round(a * b * 100) / 100;
    return pack(`${a} × ${b}`, answer, decimalDistractors, `${a} \\times ${b}`);
}

function genPercent(d: number, hard: boolean): Problem {
    // Per spec:
    //   Easy (d=1):    10/25/50/100% of multiples of 10
    //   Med  (d=2-3):  10/25/50/75% of any 2-digit number
    //   Hard (d=4-5):  less-memorized %s (5/15/20/30/40/60/70/80/90)
    //   hardMode:      reserved for percent-CHANGE questions (deferred —
    //                  requires a new question shape; for now hardMode
    //                  combines the widest pools and adds 3-digit bases)
    if (hard) {
        const percents = [3, 5, 7, 12, 15, 17, 22, 35, 45, 55, 65, 85, 95];
        const pct = pickRandom(percents);
        const base = pickRandom([40, 60, 80, 100, 120, 200, 240, 400, 500, 600, 800]);
        const answer = Math.round((pct / 100) * base * 100) / 100;
        return pack(`${pct}% of ${base}`, answer, nearDistractors, `${pct}\\% \\text{ of } ${base}`);
    }
    let percents: number[], bases: number[];
    if (d <= 1) {
        percents = [10, 25, 50, 100];
        bases = [10, 20, 40, 50, 60, 80, 100, 200];
    } else if (d <= 3) {
        percents = [10, 20, 25, 50, 75];
        bases = [12, 24, 40, 48, 60, 75, 80, 96, 100];
    } else {
        percents = [5, 15, 20, 30, 40, 60, 70, 80, 90];
        bases = [40, 60, 80, 100, 120, 150, 200, 250];
    }
    const pct = pickRandom(percents);
    const base = pickRandom(bases);
    const answer = Math.round((pct / 100) * base * 100) / 100;
    return pack(`${pct}% of ${base}`, answer, nearDistractors, `${pct}\\% \\text{ of } ${base}`);
}

function genLinear(d: number, hard: boolean): Problem {
    // Per spec:
    //   Easy (d=1):    ax = b, a ∈ 2-5 (one-step)
    //   Med  (d=2-3):  ax + b = c (two-step, current behavior approximately)
    //   Hard (d=4-5):  ax + b = cx + d (variable on both sides)
    //   hardMode:      include negative solutions (current behavior already
    //                  allows negatives; we widen the range)
    if (hard) {
        // Variable on both sides AND negative solutions allowed.
        // ax + b = cx + d  →  x = (d - b) / (a - c), make sure a != c.
        const a = randInt(2, 12);
        let c = randInt(2, 12);
        if (a === c) c = a === 12 ? 2 : a + 1;
        const x = randInt(-10, 20);
        const b = randInt(-20, 20);
        // Compute d so the equation has the chosen x as solution:
        // ax + b = cx + dConst → dConst = a*x + b - c*x = (a-c)*x + b
        const dConst = (a - c) * x + b;
        const bSign = b >= 0 ? `+ ${b}` : `− ${Math.abs(b)}`;
        const dSign = dConst >= 0 ? `+ ${dConst}` : `− ${Math.abs(dConst)}`;
        return pack(
            `${a}x ${bSign} = ${c}x ${dSign}`,
            x,
            nearDistractors,
            `${a}x ${b >= 0 ? '+' : '-'} ${Math.abs(b)} = ${c}x ${dConst >= 0 ? '+' : '-'} ${Math.abs(dConst)}`
        );
    }

    if (d <= 1) {
        // One-step: ax = b
        const a = randInt(2, 5);
        const x = randInt(1, 10);
        const c = a * x;
        return pack(`${a}x = ${c}`, x, nearDistractors, `${a}x = ${c}`);
    }

    // d=2-5 (excluding hardMode): two-step ax + b = c
    const a = d <= 3 ? randInt(2, 6) : randInt(2, 12);
    const x = d <= 3 ? randInt(1, 10) : randInt(-5, 15);
    const b = d <= 3 ? randInt(1, 15) : randInt(-10, 15);
    const c = a * x + b;
    const bSign = b >= 0 ? `+ ${b}` : `− ${Math.abs(b)}`;
    return pack(`${a}x ${bSign} = ${c}`, x, nearDistractors, `${a}x ${b >= 0 ? '+' : '-'} ${Math.abs(b)} = ${c}`);
}

// ── Ranges ──────────────────────────────────────────────

function addRange(d: number): [number, number] {
    // Per docs/difficulty-curves.md: Easy starts at 1-30 (single-digit-friendly,
    // approachable for 8-year-olds), expands through mid-range, peaks at
    // 50-499 at d=5 (genuine multi-digit mental work). hardMode handled
    // separately in genAdd/genSubtract — not via this range.
    if (d <= 1) return [1, 30];
    if (d <= 2) return [10, 69];
    if (d <= 3) return [10, 99];
    if (d <= 4) return [20, 199];
    return [50, 499];
}

function mulRange(d: number): [number, number, number, number] {
    // Per docs/difficulty-curves.md:
    //   d=1 — memorized small table (2-5 × 2-5)
    //   d=2 — full small table (2-9 × 2-9)
    //   d=3 — full standard times table (2-12 × 2-12)
    //   d=4 — one factor escapes the table (10-25 × 2-9)
    //   d=5 — both factors escape (10-25 × 6-15)
    if (d <= 1) return [2, 5, 2, 5];
    if (d <= 2) return [2, 9, 2, 9];
    if (d <= 3) return [2, 12, 2, 12];
    if (d <= 4) return [10, 25, 2, 9];
    return [10, 25, 6, 15];
}

// ── Distractor strategies ───────────────────────────────

function nearDistractors(answer: number): [number, number] {
    const used = new Set<number>([answer]);
    const result: number[] = [];
    let safety = 0;
    while (result.length < 2 && safety < 100) {
        safety++;
        const offset = Math.max(1, randInt(1, Math.max(3, Math.floor(Math.abs(answer) * 0.15))));
        const d = answer + (_rng() > 0.5 ? offset : -offset);
        if (!used.has(d)) { used.add(d); result.push(d); }
    }
    // Deep fallback
    let fallback = answer + 1;
    let fallbackSafety = 0;
    while (result.length < 2 && fallbackSafety++ < 20) {
        if (!used.has(fallback)) {
            used.add(fallback);
            result.push(fallback);
        }
        fallback++;
    }
    return [result[0], result[1]];
}

/** Distractors for small K-2 numbers — offset ±1..3, always ≥ 0 */
function smallDistractors(answer: number): [number, number] {
    const used = new Set<number>([answer]);
    const result: number[] = [];
    let safety = 0;
    while (result.length < 2 && safety < 50) {
        safety++;
        const offset = randInt(1, 3);
        const d = answer + (_rng() > 0.5 ? offset : -offset);
        if (d >= 0 && !used.has(d)) { used.add(d); result.push(d); }
    }
    while (result.length < 2) { result.push(answer + result.length + 1); }
    return [result[0], result[1]];
}

function mulDistractors(a: number, b: number, answer: number): [number, number] {
    const used = new Set<number>([answer]);
    const result: number[] = [];
    const strategies = [
        () => (a + (_rng() > 0.5 ? 1 : -1)) * b,
        () => a * (b + (_rng() > 0.5 ? 1 : -1)),
        () => answer + (_rng() > 0.5 ? a : -a),
        () => answer + (_rng() > 0.5 ? b : -b),
        () => answer + randInt(-5, 5),
    ];
    let safety = 0;
    while (result.length < 2 && safety < 50) {
        safety++;
        const d = strategies[randInt(0, strategies.length - 1)]();
        if (d > 0 && !used.has(d)) { used.add(d); result.push(d); }
    }
    while (result.length < 2) { result.push(answer + result.length + 1); }
    return [result[0], result[1]];
}

function decimalDistractors(answer: number): [number, number] {
    const used = new Set<number>([answer]);
    const result: number[] = [];
    let safety = 0;
    while (result.length < 2 && safety < 50) {
        safety++;
        const offset = Math.round(randInt(1, 5) * (_rng() > 0.5 ? 1 : -1)) / 10;
        const d = Math.round((answer + offset * randInt(1, 3)) * 10) / 10;
        if (d > 0 && !used.has(d)) { used.add(d); result.push(d); }
    }
    // Deep fallback
    let fallbackOffset = 1;
    let fallbackSafety = 0;
    while (result.length < 2 && fallbackSafety++ < 20) {
        const fallback = Math.round((answer + fallbackOffset * 0.5) * 10) / 10;
        if (!used.has(fallback)) {
            used.add(fallback);
            result.push(fallback);
        }
        fallbackOffset++;
    }
    return [result[0], result[1]];
}

function fractionDistractors(ansNum: number, ansDen: number): [number, number] {
    const answer = ansNum / ansDen;
    const used = new Set<number>([answer]);
    const result: number[] = [];
    // Try nearby fractions
    const candidates = [
        (ansNum + 1) / ansDen,
        (ansNum - 1) / ansDen,
        ansNum / (ansDen + 1),
        ansNum / (ansDen - 1),
        (ansNum + 1) / (ansDen + 1),
    ].filter(v => v > 0 && !used.has(v));

    for (const c of candidates) {
        if (result.length >= 2) break;
        used.add(c);
        result.push(c);
    }
    while (result.length < 2) { result.push(answer + (result.length + 1) * 0.1); }
    return [result[0], result[1]];
}

// ── Helpers ─────────────────────────────────────────────

function pack(
    expression: string,
    answer: number,
    distractorFn: (ans: number) => [number, number],
    latex?: string,
): Problem {
    const distractors = distractorFn(answer);
    let d1 = distractors[0];
    let d2 = distractors[1];

    // Final safety constraint: ensure absolute uniqueness of answers
    const used = new Set([answer]);
    if (used.has(d1)) d1 += 1;
    used.add(d1);

    let uniquenessSafety = 0;
    while (used.has(d2) && uniquenessSafety++ < 20) {
        d2 += 1;
    }
    used.add(d2);

    const correctIndex = randInt(0, 2);
    const options = [d1, d2];
    options.splice(correctIndex, 0, answer);
    return { id: uid(), expression, answer, options, correctIndex, ...(latex ? { latex } : {}) };
}

function randInt(min: number, max: number): number {
    return Math.floor(_rng() * (max - min + 1)) + min;
}

function randDecimal(range: [number, number]): number {
    return Math.round(randInt(range[0] * 10, range[1] * 10)) / 10;
}

function pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(_rng() * arr.length)];
}


function uid(): string {
    return typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Pretty-print a decimal as a fraction label */
function fracLabel(v: number): string {
    if (Number.isInteger(v)) return `${v}`;
    for (let den = 2; den <= 20; den++) {
        const num = Math.round(v * den);
        if (Math.abs(num / den - v) < 0.001) {
            const g2 = gcd(Math.abs(num), den);
            return `${num / g2}/${den / g2}`;
        }
    }
    return v.toFixed(2);
}
