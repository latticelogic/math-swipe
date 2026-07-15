import { describe, it, expect } from 'vitest';
import { generateProblem, setFocusTable, getFocusTable } from '../utils/mathGenerator';

/**
 * Correctness invariants for the 2026-07-16 topic batch: tables, missing,
 * primes, estimate, money, sequence, time. The universal invariants (3 unique
 * options, correctIndex, difficulty discrimination, pool floors, sign rules)
 * live in mathGenerator.test.ts — these are the per-topic semantics.
 */

function isPrime(n: number): boolean {
    if (n < 2) return false;
    for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
    return true;
}

describe('tables — focused times-table drill', () => {
    it('every problem uses the focused table', () => {
        setFocusTable(7);
        for (let d = 1; d <= 5; d++) {
            for (let i = 0; i < 30; i++) {
                const p = generateProblem(d, 'tables', false);
                const nums = (p.expression.match(/\d+/g) ?? []).map(Number);
                expect(nums).toContain(7);
                expect(p.answer % 7).toBe(0);
            }
        }
    });

    it('setFocusTable clamps to 2–12', () => {
        setFocusTable(1);
        expect(getFocusTable()).toBe(2);
        setFocusTable(99);
        expect(getFocusTable()).toBe(12);
        setFocusTable(9);
        expect(getFocusTable()).toBe(9);
        setFocusTable(7); // restore default for other tests
    });
});

describe('missing — the blanked equation actually holds', () => {
    it('plugging the answer into the ? satisfies the equation', () => {
        for (let d = 1; d <= 5; d++) {
            for (const hard of [false, true]) {
                for (let i = 0; i < 40; i++) {
                    const p = generateProblem(d, 'missing', hard);
                    expect(p.expression).toContain('?');
                    const m = p.expression.match(/^(\d+|\?) ([+−×÷]) (\d+|\?) = (\d+)$/);
                    expect(m, p.expression).toBeTruthy();
                    const [, left, op, right, resStr] = m!;
                    const a = left === '?' ? p.answer : Number(left);
                    const b = right === '?' ? p.answer : Number(right);
                    const res = Number(resStr);
                    const computed = op === '+' ? a + b : op === '−' ? a - b : op === '×' ? a * b : a / b;
                    expect(computed).toBe(res);
                }
            }
        }
    });
});

describe('primes — the answer is the only correct option', () => {
    it('"Which is prime?": answer prime, distractors composite', () => {
        for (const [d, hard] of [[1, false], [3, false], [5, false], [3, true]] as [number, boolean][]) {
            for (let i = 0; i < 40; i++) {
                const p = generateProblem(d, 'primes', hard);
                if (p.expression === 'Which is prime?') {
                    expect(isPrime(p.answer)).toBe(true);
                    for (const opt of p.options) {
                        if (opt !== p.answer) expect(isPrime(opt as number), `${opt} must be composite`).toBe(false);
                    }
                }
            }
        }
    });

    it('"Which divides N?": answer divides, distractors do not', () => {
        for (let i = 0; i < 120; i++) {
            const p = generateProblem(4, 'primes', false);
            const m = p.expression.match(/^Which divides (\d+)\?$/);
            if (!m) continue;
            const n = Number(m[1]);
            expect(n % p.answer).toBe(0);
            for (const opt of p.options) {
                if (opt !== p.answer) expect(n % (opt as number), `${opt} must not divide ${n}`).not.toBe(0);
            }
        }
    });

    it('variety lives in the options (constant prompt is fine)', () => {
        const seen = new Set<string>();
        for (let i = 0; i < 300; i++) {
            const p = generateProblem(2, 'primes', false);
            seen.add([...(p.options as number[])].sort((x, y) => x - y).join(','));
        }
        expect(seen.size).toBeGreaterThanOrEqual(15);
    });
});

describe('estimate — one honest ballpark answer', () => {
    it('the answer is within 25% of the true value; distractors are >=1.8x off', () => {
        for (let d = 1; d <= 5; d++) {
            for (const hard of [false, true]) {
                for (let i = 0; i < 40; i++) {
                    const p = generateProblem(d, 'estimate', hard);
                    const m = p.expression.match(/(\d+) ([+×]) (\d+)/);
                    expect(m, p.expression).toBeTruthy();
                    const trueVal = m![2] === '×' ? Number(m![1]) * Number(m![3]) : Number(m![1]) + Number(m![3]);
                    expect(Math.abs(p.answer - trueVal) / trueVal).toBeLessThan(0.25);
                    for (const opt of p.options) {
                        if (opt === p.answer) continue;
                        const ratio = (opt as number) / trueVal;
                        expect(ratio > 1.8 || ratio < 0.56, `distractor ${opt} too close to true ${trueVal}`).toBe(true);
                    }
                }
            }
        }
    });
});

describe('money — cents-exact with $ labels', () => {
    it('options carry $x.xx labels matching their values, all positive', () => {
        for (let d = 1; d <= 5; d++) {
            for (const hard of [false, true]) {
                for (let i = 0; i < 30; i++) {
                    const p = generateProblem(d, 'money', hard);
                    expect(p.optionLabels).toHaveLength(3);
                    p.options.forEach((v, idx) => {
                        expect(v).toBeGreaterThan(0);
                        expect(p.optionLabels![idx]).toBe(`$${(v as number).toFixed(2)}`);
                        // cents-exact: no float dust beyond 2dp
                        expect(Math.round((v as number) * 100) / 100).toBe(v);
                    });
                }
            }
        }
    });
});

describe('sequence — the shown terms obey one rule the answer continues', () => {
    it('answer differs from the wrong-rule distractor', () => {
        for (let d = 1; d <= 5; d++) {
            for (const hard of [false, true]) {
                for (let i = 0; i < 30; i++) {
                    const p = generateProblem(d, 'sequence', hard);
                    expect(p.expression.endsWith(', ?')).toBe(true);
                    expect(new Set(p.options).size).toBe(3);
                }
            }
        }
    });
});

describe('time — clock labels and elapsed answers', () => {
    it('add-minutes: labelled h:mm options; the answer label equals start+delta', () => {
        for (const d of [1, 2, 3]) {
            for (let i = 0; i < 30; i++) {
                const p = generateProblem(d, 'time', false);
                const m = p.expression.match(/^(\d+):(\d\d) \+ (\d+) min = \?$/);
                expect(m, p.expression).toBeTruthy();
                expect(p.optionLabels).toHaveLength(3);
                for (const label of p.optionLabels!) {
                    expect(label).toMatch(/^\d{1,2}:\d\d$/);
                }
            }
        }
    });

    it('elapsed: the answer is the true minute gap', () => {
        for (const [d, hard] of [[4, false], [5, false], [3, true]] as [number, boolean][]) {
            for (let i = 0; i < 30; i++) {
                const p = generateProblem(d, 'time', hard);
                const m = p.expression.match(/^(\d+):(\d\d) → (\d+):(\d\d) = \? min$/);
                expect(m, p.expression).toBeTruthy();
                // Reconstruct the gap on a 12-hour dial: the display wraps at
                // 12, so unwrap by adding 12h when the end reads "earlier".
                const start = (Number(m![1]) % 12) * 60 + Number(m![2]);
                let end = (Number(m![3]) % 12) * 60 + Number(m![4]);
                if (end <= start) end += 12 * 60;
                expect(p.answer).toBe(end - start);
            }
        }
    });
});
