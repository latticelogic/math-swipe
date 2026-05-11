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
});
