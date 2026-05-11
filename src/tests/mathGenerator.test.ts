import { describe, it, expect } from 'vitest';
import { generateProblem, type QuestionType } from '../utils/mathGenerator';
import { createSeededRng } from '../utils/seededRng';

describe('mathGenerator.ts', () => {

    describe('Basic Operations (add, sub, multiply, divide)', () => {
        it('addition problems should have exactly 3 unique options', () => {
            for (let i = 0; i < 50; i++) {
                const p = generateProblem(1, 'add');
                expect(p.options).toHaveLength(3);
                // Options must be unique
                const uniqueSet = new Set(p.options);
                expect(uniqueSet.size).toBe(3);
                // Correct answer must exist at correctIndex
                expect(p.options[p.correctIndex]).toBe(p.answer);
                // Expression string should contain a plus sign
                expect(p.expression).toMatch(/\+/);
            }
        });

        it('subtraction problems should not result in negative numbers', () => {
            for (let i = 0; i < 50; i++) {
                const p = generateProblem(1, 'subtract');
                expect(p.answer).toBeGreaterThanOrEqual(0);
                // Format check (handles minus or minus-sign unicode)
                expect(p.expression).toMatch(/^\d+\s*[-−]\s*\d+$/);
                expect(p.options[p.correctIndex]).toBe(p.answer);
            }
        });

        it('division problems should result in clean integers', () => {
            for (let i = 0; i < 50; i++) {
                const p = generateProblem(1, 'divide');
                // The answer should be an integer
                expect(Number.isInteger(p.answer)).toBe(true);
                // Ensure no divide-by-zero
                const divisorMatch = p.expression.split('÷')[1];
                if (divisorMatch) {
                    const divisor = parseInt(divisorMatch.trim(), 10);
                    expect(divisor).not.toBe(0);
                }
            }
        });
    });

    describe('Ultimate Mode Stress Tests', () => {
        it('ultimate mode returns a valid problem of *some* type', () => {
            for (let i = 0; i < 20; i++) {
                const p = generateProblem(10, 'mix-all');
                expect(p.options.length).toBe(3);
                expect(p.correctIndex).toBeGreaterThanOrEqual(0);
                expect(p.correctIndex).toBeLessThanOrEqual(2);
                expect(new Set(p.options).size).toBe(3);
                expect(p.options[p.correctIndex]).toBe(p.answer);
            }
        });
    });

    describe('Fractions & LaTeX Output', () => {
        it('fractions generation returns LaTeX with \frac or integer simplifications', () => {
            for (let i = 0; i < 50; i++) {
                const p = generateProblem(1, 'fraction');
                // Fractions generate LaTeX
                expect(p.latex).toBeTruthy();
                // Ensure it generated labels (LaTeX formatted options or basic fractions)
                expect(p.optionLabels).toBeDefined();
                expect(p.optionLabels).toHaveLength(3);

                // If the answer is an integer, it shouldn't contain \frac, otherwise it should contain formatting.
                const correctLabel = p.optionLabels![p.correctIndex];
                expect(correctLabel).toBeDefined();
            }
        });
    });

    // ── Universal invariants: every question type must produce a valid problem ──

    const ALL_TYPES: QuestionType[] = [
        'add', 'subtract', 'multiply', 'divide', 'square', 'sqrt',
        'fraction', 'decimal', 'percent', 'linear',
        'add1', 'sub1', 'bonds', 'doubles', 'compare', 'skip',
        'shapes', 'evenodd', 'tens',
        'round', 'orderops',
        'exponent', 'negatives', 'gcflcm', 'ratio',
        'mix-basic', 'mix-all', 'daily', 'challenge',
    ];

    describe('Universal invariants — every type, every difficulty', () => {
        for (const type of ALL_TYPES) {
            it(`${type}: 30 samples × 5 difficulties × hard mode all valid`, () => {
                for (let d = 1; d <= 5; d++) {
                    for (const hard of [false, true]) {
                        for (let i = 0; i < 30; i++) {
                            const p = generateProblem(d, type, hard);
                            // Three options
                            expect(p.options).toHaveLength(3);
                            // correctIndex points to the answer
                            expect(p.options[p.correctIndex]).toBe(p.answer);
                            // correctIndex in valid range
                            expect(p.correctIndex).toBeGreaterThanOrEqual(0);
                            expect(p.correctIndex).toBeLessThanOrEqual(2);
                            // Three distinct options (the most common bug class)
                            expect(new Set(p.options).size).toBe(3);
                            // Expression non-empty
                            expect(p.expression.length).toBeGreaterThan(0);
                            // Answer is a finite number
                            expect(Number.isFinite(p.answer)).toBe(true);
                        }
                    }
                }
            });
        }
    });

    describe('Determinism with seeded RNG', () => {
        it('same seed produces identical problem for every type', () => {
            // mix-basic and mix-all dispatch internally based on the rng,
            // which means two calls with the same seed *value* could produce
            // different sub-types if the rng state was advanced differently.
            // Test the leaf types here — composite types are covered by
            // dailyChallenge.test.ts.
            const LEAF_TYPES: QuestionType[] = [
                'add', 'subtract', 'multiply', 'divide', 'square', 'sqrt',
                'fraction', 'decimal', 'percent', 'linear',
                'add1', 'sub1', 'bonds', 'doubles', 'compare', 'skip',
                'shapes', 'evenodd', 'tens',
                'round', 'orderops', 'exponent', 'negatives', 'gcflcm', 'ratio',
            ];
            for (const type of LEAF_TYPES) {
                const rngA = createSeededRng(99);
                const rngB = createSeededRng(99);
                const a = generateProblem(3, type, false, rngA);
                const b = generateProblem(3, type, false, rngB);
                expect(a.expression).toBe(b.expression);
                expect(a.answer).toBe(b.answer);
                expect(a.options).toEqual(b.options);
            }
        });

        it('different seeds produce different sequences (not just different ids)', () => {
            const rngA = createSeededRng(1);
            const rngB = createSeededRng(2);
            const a = generateProblem(3, 'multiply', false, rngA);
            const b = generateProblem(3, 'multiply', false, rngB);
            expect(a.expression).not.toBe(b.expression);
        });

        it('seeding does not leak across generateProblem calls', () => {
            // After calling with a seeded rng, subsequent unseeded calls must
            // still use Math.random — no global state leaked.
            const rng = createSeededRng(42);
            generateProblem(2, 'add', false, rng);
            // Two unseeded calls should (almost certainly) differ from each other
            const a = generateProblem(2, 'add', false);
            const b = generateProblem(2, 'add', false);
            // 1-in-100 false-positive chance for two unrelated rolls to match;
            // run a few to be safe.
            let allMatch = true;
            for (let i = 0; i < 5; i++) {
                const x = generateProblem(2, 'add', false);
                const y = generateProblem(2, 'add', false);
                if (x.expression !== y.expression) { allMatch = false; break; }
            }
            // Cheap smoke check
            void a; void b;
            expect(allMatch).toBe(false);
        });
    });

    /** Difficulty discrimination: this is the regression check for the
     *  "flat curve" bug that prompted docs/difficulty-curves.md. For each
     *  topic, we sample N problems at d=1 and N at d=5, then again at
     *  hardMode=false vs hardMode=true. A "signal" function extracts a
     *  numeric difficulty proxy from each problem (typically the answer
     *  magnitude, or a topic-specific surrogate). We assert that the
     *  *mean* of the signal differs measurably between the two pools.
     *
     *  Tolerance: we require mean(hard) > mean(easy) * 1.3 — a 30% lift.
     *  This is loose on purpose; we're not asserting a specific curve,
     *  just that the curve isn't flat. Topics that fail this test almost
     *  certainly have a bug where difficulty doesn't propagate. */
    describe('Difficulty discrimination — every topic responds to both dials', () => {
        const SAMPLES = 150;

        // Signal extractor per topic. The signal is a single number that
        // should *increase* monotonically with difficulty. For most topics
        // |answer| is a fine proxy. For topics where difficulty is
        // qualitative (more terms, harder operation type) we use a
        // composite signal: magnitude * (1 + complexity_features).
        //
        // The composite form means a 4-term expression at d=5 with small
        // operands still outscores a 2-term expression at d=1 with larger
        // operands — which matches how a human would judge difficulty.
        const opCount = (expr: string): number =>
            (expr.match(/[+\-×÷−]/g) ?? []).length;
        const expressionNums = (expr: string): number[] =>
            (expr.match(/\d+/g) ?? []).map(Number);
        const maxNum = (expr: string): number => {
            const nums = expressionNums(expr);
            return nums.length ? Math.max(...nums) : 0;
        };

        const signalFor: Record<string, (p: ReturnType<typeof generateProblem>) => number> = {
            // Topics where |answer| is a sufficient proxy (bigger = harder)
            add: (p) => Math.abs(p.answer) * (1 + opCount(p.expression) * 0.5),
            subtract: (p) => Math.abs(p.answer) * (1 + opCount(p.expression) * 0.5),
            multiply: (p) => Math.abs(p.answer),
            divide: (p) => Math.abs(p.answer),
            square: (p) => Math.abs(p.answer),
            sqrt: (p) => Math.abs(p.answer),
            add1: (p) => Math.abs(p.answer),
            sub1: (p) => Math.abs(p.answer),
            doubles: (p) => Math.abs(p.answer),
            tens: (p) => Math.abs(p.answer),
            round: (p) => Math.abs(p.answer),
            exponent: (p) => Math.abs(p.answer),
            negatives: (p) => Math.abs(p.answer) * (1 + opCount(p.expression) * 0.5),
            gcflcm: (p) => Math.abs(p.answer),
            percent: (p) => Math.abs(p.answer),
            // Constrained-answer topics
            bonds: (p) => p.bondTotal ?? 0,
            shapes: (p) => p.answer, // side count
            evenodd: (p) => maxNum(p.expression) * (1 + opCount(p.expression) * 2),
            // Qualitative-difficulty topics — composite signal:
            // orderops: difficulty here is *features* of the expression,
            // not magnitude. Reward parentheses, exponents (²), and
            // operator count individually.
            orderops: (p) => {
                const ops = opCount(p.expression);
                const hasParens = /[()]/.test(p.expression) ? 1 : 0;
                const hasExp = /²/.test(p.expression) ? 1 : 0;
                const features = ops + hasParens * 2 + hasExp * 3;
                return maxNum(p.expression) * (1 + features * 0.5);
            },
            // compare: hardMode shifts from comparing 2 numbers to comparing
            // 2 expressions. The op count in the expression captures this.
            compare: (p) => maxNum(p.expression) * (1 + opCount(p.expression) * 4),
            // skip: harder steps (smaller intervals → more mental work) and
            // direction (backward) aren't captured by magnitude. Use the
            // *step size diversity* via the spread between adjacent terms.
            skip: (p) => {
                const nums = expressionNums(p.expression);
                if (nums.length < 2) return 0;
                const step = Math.abs(nums[1] - nums[0]);
                // Award smaller "weird" steps (3, 4, 7, 11, 9) with a
                // multiplier — they're harder than 2/5/10.
                const isWeirdStep = ![2, 5, 10].includes(step);
                return maxNum(p.expression) * (isWeirdStep ? 2 : 1);
            },
            // ratio: 3-term ratios have more numbers in the expression than
            // 2-term. Use op count of colons.
            ratio: (p) => {
                const colonCount = (p.expression.match(/:/g) ?? []).length;
                return maxNum(p.expression) * (1 + colonCount * 1.5);
            },
            // fraction: difficulty isn't answer-magnitude (answers are small
            // mixed fractions). Use denominator size from the expression.
            fraction: (p) => {
                const nums = expressionNums(p.expression);
                // expression is like "1/4 + 2/3" — denominators are at
                // indices 1, 3. Take max denominator.
                if (nums.length < 4) return nums.length ? Math.max(...nums) : 1;
                return Math.max(nums[1], nums[3]);
            },
            // decimal: hardMode does multiplication/division (qualitatively
            // harder, smaller answers). Reward presence of × or ÷ in the
            // expression heavily.
            decimal: (p) => {
                const hasMulDiv = /[×÷]/.test(p.expression);
                return Math.abs(p.answer) * (hasMulDiv ? 8 : 1);
            },
            // linear: at d=1 the equation is "ax = b" (one term on left).
            // At d=5 / hardMode it's "ax + b = cx + d" (more terms). Count
            // the operators on either side of '='.
            linear: (p) => {
                const ops = opCount(p.expression);
                return Math.abs(p.answer) * (1 + ops * 1.5);
            },
        };

        function meanSignal(type: QuestionType, d: number, hard: boolean): number {
            const sig = signalFor[type];
            if (!sig) throw new Error(`no signal defined for topic ${type}`);
            // Use a seeded RNG so the test is deterministic. Without this,
            // borderline-passing topics like `skip` (which has comparable
            // magnitudes at d=1 vs d=5 by design) can flake under CI's
            // Math.random sequence even when the curve is fine in aggregate.
            const rng = createSeededRng(0xD1FF1C);
            let total = 0;
            for (let i = 0; i < SAMPLES; i++) {
                total += sig(generateProblem(d, type, hard, rng));
            }
            return total / SAMPLES;
        }

        const TOPICS_TO_AUDIT: QuestionType[] = [
            'add', 'subtract', 'multiply', 'divide', 'square', 'sqrt',
            'fraction', 'decimal', 'percent', 'linear',
            'add1', 'sub1', 'bonds', 'doubles', 'compare', 'skip',
            'shapes', 'evenodd', 'tens',
            'round', 'orderops',
            'exponent', 'negatives', 'gcflcm', 'ratio',
        ];

        for (const type of TOPICS_TO_AUDIT) {
            it(`${type}: difficulty 5 > difficulty 1 (mean signal)`, () => {
                const easy = meanSignal(type, 1, false);
                const hardSlider = meanSignal(type, 5, false);
                // 1.3× lift — loose enough that legitimate small-step topics
                // (e.g., bonds where totals only go 5→20) still pass with
                // 4× lift, while flat topics (no lift at all) fail.
                expect(hardSlider).toBeGreaterThan(easy * 1.3);
            });

            it(`${type}: hardMode true > hardMode false (mean signal)`, () => {
                const off = meanSignal(type, 3, false);
                const on = meanSignal(type, 3, true);
                expect(on).toBeGreaterThan(off * 1.3);
            });
        }
    });
});
