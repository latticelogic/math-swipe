/**
 * Tiny "chalk asides" about a number — shown occasionally after a correct
 * answer to reward curiosity. Tone bar (from CLAUDE.md): warm, restrained,
 * specific, never childish, no emoji. Each fact is a short clause that reads
 * like a teacher noticing something, not a textbook.
 *
 * `numberFact(n)` returns ONE fact (the most interesting that applies) or null
 * when nothing noteworthy fits — the caller rate-limits display so it stays a
 * treat, not noise.
 */

function isPrime(n: number): boolean {
    if (n < 2) return false;
    if (n % 2 === 0) return n === 2;
    for (let i = 3; i * i <= n; i += 2) {
        if (n % i === 0) return false;
    }
    return true;
}

function isPalindrome(n: number): boolean {
    const s = String(n);
    if (s.length < 2) return false;
    return s === [...s].reverse().join('');
}

/** Integer square root if n is a perfect square, else null. */
function perfectSqrt(n: number): number | null {
    if (n < 0) return null;
    const r = Math.round(Math.sqrt(n));
    return r * r === n ? r : null;
}

/** Integer cube root if n is a perfect cube, else null. */
function perfectCbrt(n: number): number | null {
    if (n < 0) return null;
    const r = Math.round(Math.cbrt(n));
    return r * r * r === n ? r : null;
}

function isPowerOfTwo(n: number): boolean {
    return n >= 2 && (n & (n - 1)) === 0;
}

/** k such that k! === n (for small factorials), else null. */
function factorialOf(n: number): number | null {
    let f = 1;
    for (let k = 1; k <= 12; k++) {
        f *= k;
        if (f === n) return k;
        if (f > n) break;
    }
    return null;
}

const FIB = new Set([13, 21, 34, 55, 89, 144, 233, 377, 610, 987]);

/**
 * Return a single short fact about `n`, or null. Order matters: the earliest
 * matching, most-surprising fact wins so we don't bury a palindrome under
 * "it's even".
 */
export function numberFact(n: number): string | null {
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return null;

    // Roundness milestones read as satisfying.
    if (n === 100) return '100 — a nice round century.';
    if (n === 1000) return '1000 — three zeros deep.';
    if (n === 144) return '144 — a dozen dozen.';
    if (n === 12) return '12 — a dozen.';

    // Palindrome (reads the same both ways).
    if (isPalindrome(n)) return `${n} reads the same backwards.`;

    // Perfect square AND cube (rare, e.g. 64, 729).
    const sq = perfectSqrt(n);
    const cb = perfectCbrt(n);
    if (sq !== null && cb !== null && n > 1) {
        return `${n} = ${sq}² and ${cb}³.`;
    }

    // Factorial (k!): surprising for kids. Floor at 4! (=24) — 3!=6 is far too
    // common an answer to feel special.
    const fact = factorialOf(n);
    if (fact !== null && fact >= 4) {
        return `${n} = ${fact}! (${Array.from({ length: fact }, (_, i) => i + 1).join('×')}).`;
    }

    // Power of two.
    if (isPowerOfTwo(n)) {
        const exp = Math.round(Math.log2(n));
        return `${n} = 2^${exp} — keeps doubling.`;
    }

    // Perfect cube.
    if (cb !== null && n > 1) return `${n} = ${cb}³.`;

    // Perfect square.
    if (sq !== null && n > 1) return `${n} = ${sq}² — a perfect square.`;

    // Prime.
    if (isPrime(n) && n > 2) return `${n} is prime — no clean factors.`;

    // Fibonacci.
    if (FIB.has(n)) return `${n} is a Fibonacci number.`;

    return null;
}
