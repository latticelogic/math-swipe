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
export const YOUNG_TYPES: QuestionType[] = ['add1', 'sub1', 'bonds', 'doubles', 'compare', 'skip'];
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
        case 'add1': return genAdd1();
        case 'sub1': return genSub1();
        case 'bonds': return genBonds();
        case 'doubles': return genDoubles();
        case 'compare': return genCompare();
        case 'skip': return genSkip();
        case 'round': return genRound();
        case 'orderops': return genOrderOps();

        case 'exponent': return genExponent(difficulty, hardMode);
        case 'negatives': return genNegatives(difficulty, hardMode);
        case 'gcflcm': return genGcfLcm();
        case 'ratio': return genRatio();
        default: return genAdd(difficulty, hardMode); // Exhaustive fallback
    }
}

// ── Original Generators ─────────────────────────────────

function genAdd(d: number, hard: boolean): Problem {
    const [lo, hi] = hard ? [100, 999] : addRange(d);
    const a = randInt(lo, hi), b = randInt(lo, hi);
    return pack(`${a} + ${b}`, a + b, nearDistractors, `${a} + ${b}`);
}

function genSubtract(d: number, hard: boolean): Problem {
    const [lo, hi] = hard ? [100, 999] : addRange(d);
    let a = randInt(lo, hi), b = randInt(lo, hi);
    if (a < b) [a, b] = [b, a];
    return pack(`${a} − ${b}`, a - b, nearDistractors, `${a} - ${b}`);
}

function genMultiply(d: number, hard: boolean): Problem {
    const [minA, maxA, minB, maxB] = hard ? [2, 32, 2, 32] : mulRange(d);
    const a = randInt(minA, maxA), b = randInt(minB, maxB);
    const flip = _rng() > 0.5;
    const expr = flip ? `${b} × ${a}` : `${a} × ${b}`;
    const latex = flip ? `${b} \\times ${a}` : `${a} \\times ${b}`;
    return pack(expr, a * b, (ans) => mulDistractors(a, b, ans), latex);
}

function genDivide(d: number, hard: boolean): Problem {
    const [minA, maxA, minB, maxB] = hard ? [2, 32, 2, 32] : mulRange(d);
    const a = randInt(minA, maxA), b = randInt(minB, maxB);
    const product = a * b;
    return pack(`${product} ÷ ${b}`, a, nearDistractors, `${product} \\div ${b}`);
}

function genSquare(d: number, hard: boolean): Problem {
    const max = hard ? 32 : (d <= 2 ? 9 : d <= 4 ? 12 : 15);
    const n = randInt(2, max);
    return pack(`${n}²`, n * n, nearDistractors, `${n}^2`);
}

function genSqrt(d: number, hard: boolean): Problem {
    const max = hard ? 32 : (d <= 2 ? 9 : d <= 4 ? 12 : 15);
    const n = randInt(2, max);
    return pack(`√${n * n}`, n, nearDistractors, `\\sqrt{${n * n}}`);
}

// ── Young K-2 Generators ────────────────────────────────

function genAdd1(): Problem {
    const a = randInt(1, 9), b = randInt(1, 9);
    return pack(`${a} + ${b}`, a + b, smallDistractors, `${a} + ${b}`);
}

function genSub1(): Problem {
    let a = randInt(2, 9), b = randInt(1, 9);
    if (a < b) [a, b] = [b, a];
    return pack(`${a} − ${b}`, a - b, smallDistractors, `${a} - ${b}`);
}

function genBonds(): Problem {
    const targets = [5, 10, 20];
    const total = pickRandom(targets);
    const part = randInt(1, total - 1);
    const answer = total - part;
    const p = pack(`${part} + ? = ${total}`, answer, smallDistractors);
    return { ...p, visual: 'bond' as const, bondTotal: total, bondPart: part };
}

function genDoubles(): Problem {
    const n = randInt(1, 10);
    return pack(`${n} + ${n}`, n * 2, smallDistractors, `${n} + ${n}`);
}

function genCompare(): Problem {
    const a = randInt(1, 20);
    let b = randInt(1, 20);
    if (a === b) b = a + randInt(1, 5); // avoid equal
    const answer = Math.max(a, b);
    const smaller = Math.min(a, b);
    return pack(`Bigger: ${a} or ${b}?`, answer, () => {
        const d1 = smaller;
        let d2 = answer + randInt(1, 3);
        if (d2 === d1) d2 = answer + 4;
        return [d1, d2];
    });
}

function genSkip(): Problem {
    const steps = pickRandom([2, 5, 10]);
    const start = randInt(0, 5) * steps;
    const seq = [start, start + steps, start + 2 * steps];
    const answer = start + 3 * steps;
    return pack(`${seq.join(', ')}, ?`, answer, (ans) => {
        return [ans + steps, ans - steps > 0 ? ans - steps : ans + 2 * steps];
    });
}

// ── Core 3-5 Generators ─────────────────────────────────

function genRound(): Problem {
    const places = pickRandom([10, 100]);
    const n = places === 10 ? randInt(11, 99) : randInt(101, 999);
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

function genOrderOps(): Problem {
    // Generate problems like: a + b × c  or  a × b - c
    const variant = randInt(0, 2);
    let expression: string, answer: number, latex: string;
    if (variant === 0) {
        // a + b × c
        const a = randInt(1, 9), b = randInt(2, 6), c = randInt(2, 6);
        answer = a + b * c;
        expression = `${a} + ${b} × ${c}`;
        latex = `${a} + ${b} \\times ${c}`;
    } else if (variant === 1) {
        // a × b + c
        const a = randInt(2, 6), b = randInt(2, 6), c = randInt(1, 9);
        answer = a * b + c;
        expression = `${a} × ${b} + ${c}`;
        latex = `${a} \\times ${b} + ${c}`;
    } else {
        // a × b − c
        const a = randInt(2, 6), b = randInt(2, 6);
        const c = randInt(1, a * b - 1);
        answer = a * b - c;
        expression = `${a} × ${b} − ${c}`;
        latex = `${a} \\times ${b} - ${c}`;
    }
    // Common wrong answer: left-to-right evaluation (the classic trap)
    return pack(expression, answer, nearDistractors, latex);
}




// ── Advanced 6+ Generators ──────────────────────────────

function genExponent(_d: number, hard: boolean): Problem {
    const base = hard ? randInt(2, 10) : randInt(2, 5);
    const exp = hard ? randInt(2, 5) : randInt(2, 4);
    const answer = Math.pow(base, exp);
    const superscripts: Record<number, string> = { 2: '²', 3: '³', 4: '⁴', 5: '⁵' };
    return pack(`${base}${superscripts[exp] || '^' + exp}`, answer, nearDistractors, `${base}^{${exp}}`);
}

function genNegatives(_d: number, hard: boolean): Problem {
    const range = hard ? 20 : 10;
    const variant = randInt(0, 2);
    let a: number, b: number, answer: number, expression: string, latex: string;
    if (variant === 0) {
        // negative + positive
        a = -randInt(1, range); b = randInt(1, range);
        answer = a + b;
        expression = `(${a}) + ${b}`;
        latex = `(${a}) + ${b}`;
    } else if (variant === 1) {
        // positive - negative (double negative)
        a = randInt(1, range); b = randInt(1, range);
        answer = a + b; // a - (-b) = a + b
        expression = `${a} − (−${b})`;
        latex = `${a} - (-${b})`;
    } else {
        // negative + negative
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

function genGcfLcm(): Problem {
    const useGcf = _rng() > 0.5;
    const factor = randInt(2, 6);
    const m1 = randInt(2, 6);
    let m2 = randInt(2, 6);
    if (m1 === m2) m2 = m1 === 6 ? 2 : m1 + 1; // ensure distinct multipliers
    const a = factor * m1, b = factor * m2;
    if (useGcf) {
        const answer = gcd(a, b);
        return pack(`GCF*(${a}, ${b})`, answer, nearDistractors, `\\gcd(${a}, ${b})`);
    } else {
        const answer = (a * b) / gcd(a, b);
        return pack(`LCM(${a}, ${b})`, answer, nearDistractors, `\\text{lcm}(${a}, ${b})`);
    }
}

function genRatio(): Problem {
    const g = randInt(2, 6);
    const a = randInt(1, 5) * g;
    const b = randInt(1, 5) * g;
    const d = gcd(a, b);
    const sa = a / d, sb = b / d;
    // Randomly ask for first or second term of simplified ratio
    if (_rng() > 0.5) {
        // a : b = ? : sb
        return pack(`${a} : ${b} = ? : ${sb}`, sa, (ans) => {
            return [ans + 1, ans === 1 ? ans + 2 : ans - 1];
        });
    } else {
        // a : b = sa : ?
        return pack(`${a} : ${b} = ${sa} : ?`, sb, (ans) => {
            return [ans + 1, ans === 1 ? ans + 2 : ans - 1];
        });
    }
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
    const isAdd = d <= 2 ? Math.random() > 0.2 : Math.random() > 0.4;
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

function genDecimal(_d: number, hard: boolean): Problem {
    // Decimal multiplication/addition with 1 decimal place
    const isAdd = Math.random() > 0.5;
    if (isAdd) {
        const a = randDecimal(hard ? [1, 50] : [1, 20]);
        const b = randDecimal(hard ? [1, 50] : [1, 20]);
        const answer = Math.round((a + b) * 10) / 10;
        return pack(`${a} + ${b}`, answer, decimalDistractors, `${a} + ${b}`);
    } else {
        const a = randDecimal(hard ? [1, 20] : [1, 10]);
        const b = randInt(2, hard ? 9 : 5);
        const answer = Math.round(a * b * 10) / 10;
        return pack(`${a} × ${b}`, answer, decimalDistractors, `${a} \\times ${b}`);
    }
}

function genPercent(_d: number, hard: boolean): Problem {
    const percents = hard ? [5, 10, 15, 20, 25, 30, 40, 50, 60, 75] : [10, 20, 25, 50, 75];
    const pct = pickRandom(percents);
    const bases = hard ? [40, 60, 80, 100, 120, 200, 250, 500] : [20, 40, 50, 60, 80, 100, 200];
    const base = pickRandom(bases);
    const answer = (pct / 100) * base;

    const latex = `${pct}\\% \\text{ of } ${base}`;
    const expression = `${pct}% of ${base}`;
    return pack(expression, answer, nearDistractors, latex);
}

function genLinear(_d: number, hard: boolean): Problem {
    // ax + b = c  →  x = (c - b) / a
    const a = randInt(hard ? 2 : 2, hard ? 12 : 6);
    const x = randInt(hard ? -10 : 1, hard ? 20 : 10);
    const b = randInt(hard ? -20 : 1, hard ? 20 : 15);
    const c = a * x + b;

    const bSign = b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`;
    const latex = `${a}x ${bSign} = ${c}`;
    const expression = `${a}x ${bSign} = ${c}`;

    return pack(expression, x, nearDistractors, latex);
}

// ── Ranges ──────────────────────────────────────────────

function addRange(d: number): [number, number] {
    if (d <= 1) return [10, 49];
    if (d <= 2) return [10, 69];
    if (d <= 3) return [10, 89];
    return [10, 99];
}

function mulRange(d: number): [number, number, number, number] {
    if (d <= 1) return [2, 5, 2, 5];
    if (d <= 2) return [2, 9, 2, 9];
    if (d <= 3) return [3, 9, 6, 12];
    if (d <= 4) return [6, 12, 8, 15];
    return [10, 15, 10, 15];
}

// ── Distractor strategies ───────────────────────────────

function nearDistractors(answer: number): [number, number] {
    const used = new Set<number>([answer]);
    const result: number[] = [];
    let safety = 0;
    while (result.length < 2 && safety < 100) {
        safety++;
        const offset = Math.max(1, randInt(1, Math.max(3, Math.floor(Math.abs(answer) * 0.15))));
        const d = answer + (Math.random() > 0.5 ? offset : -offset);
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
        () => (a + (Math.random() > 0.5 ? 1 : -1)) * b,
        () => a * (b + (Math.random() > 0.5 ? 1 : -1)),
        () => answer + (Math.random() > 0.5 ? a : -a),
        () => answer + (Math.random() > 0.5 ? b : -b),
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
        const offset = Math.round(randInt(1, 5) * (Math.random() > 0.5 ? 1 : -1)) / 10;
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
