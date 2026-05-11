/** Data structures defining the Math Magic curriculum */

export interface MagicTrick {
    id: string;
    title: string;
    description: string;
    difficulty: number;
    icon: string;       // emoji icon
    // Lesson steps presented by Mr. Chalk
    lesson: {
        equation: string;   // plain text fallback (shown in chalk font)
        latex?: string;     // optional KaTeX markup — if set, renders instead of equation
        steps: string[];
        result: string;
    };
    // Generator function for the rapid-fire practice barrage
    generatePractice: () => {
        expression: string;
        latex?: string;
        answer: number;
        options: number[];
        correctIndex: number;
    };
}

// Helper to bundle simple questions
function packTrick(expr: string, ans: number, off1: number, off2: number) {
    const opts = [ans, ans + off1, ans + off2].sort(() => Math.random() - 0.5);
    return {
        expression: expr,
        answer: ans,
        options: opts,
        correctIndex: opts.indexOf(ans)
    };
}

export const MAGIC_TRICKS: MagicTrick[] = [
    {
        id: 'square-5',
        title: 'Squaring Ends in 5',
        description: 'Instantly square numbers ending in 5',
        difficulty: 1,
        icon: '⚡',
        lesson: {
            equation: '65 × 65',
            latex: '65^2',
            steps: [
                'First, take the tens digit: 6',
                'Multiply it by the next number up: 6 × 7 = 42',
                'Finally, attach 25 to the end!',
                '42... 25... -> 4225'
            ],
            result: '4225'
        },
        generatePractice: () => {
            const tens = Math.floor(Math.random() * 19) + 1; // 1 to 19 (15² through 195²)
            const num = tens * 10 + 5;
            const ans = num * num;
            const spread = Math.max(50, Math.floor(ans * 0.02));
            return packTrick(`${num} × ${num}`, ans, spread, -spread);
        }
    },
    {
        id: 'diff-squares',
        title: 'Difference of Squares',
        description: 'Multiply numbers equally spaced from a round number',
        difficulty: 2,
        icon: '🎯',
        lesson: {
            equation: '98 × 102',
            latex: '98 \\times 102',
            steps: [
                'Notice they are both 2 away from 100.',
                'This is (100 - 2) × (100 + 2) = 100² - 2²',
                '10{,}000 - 4'
            ],
            result: '9996'
        },
        generatePractice: () => {
            const base = [20, 25, 30, 40, 50, 60, 75, 80, 100, 150][Math.floor(Math.random() * 10)];
            const diff = Math.floor(Math.random() * 5) + 1; // 1 to 5
            const n1 = base - diff;
            const n2 = base + diff;
            const ans = n1 * n2;
            const off = Math.max(diff * diff + 1, Math.floor(ans * 0.01));
            return packTrick(`${n1} × ${n2}`, ans, off, -off);
        }
    },
    {
        id: 'multiply-11',
        title: 'Rule of 11',
        description: 'Multiply any 2-digit number by 11 in seconds',
        difficulty: 1,
        icon: '🚀',
        lesson: {
            equation: '43 × 11',
            latex: '43 \\times 11',
            steps: [
                'Separate the two digits: 4 and 3',
                'Add them together: 4 + 3 = 7',
                'Put the 7 in the middle!'
            ],
            result: '473'
        },
        generatePractice: () => {
            // Any 2-digit number from 12 to 99 (skip 11 to avoid trivial)
            const num = Math.floor(Math.random() * 88) + 12;
            const ans = num * 11;
            const spread = Math.floor(Math.random() * 40) + 11;
            return packTrick(`${num} × 11`, ans, spread, -spread);
        }
    },
    {
        id: 'near-100',
        title: 'Near 100 Squares',
        description: 'Square numbers in the 90s effortlessly',
        difficulty: 3,
        icon: '🔥',
        lesson: {
            equation: '96²',
            latex: '96^2',
            steps: [
                '96 is 4 away from 100.',
                'Subtract that 4 from 96: 96 - 4 = 92 (first part)',
                'Square the 4: 4² = 16 (second part)',
                'Stick them together: 92...16'
            ],
            result: '9216'
        },
        generatePractice: () => {
            // 80s and 90s (81-99) for more variety
            const num = Math.floor(Math.random() * 19) + 81;
            const ans = num * num;
            const gap = 100 - num;
            const spread = Math.max(20, gap * gap + Math.floor(Math.random() * 30));
            return packTrick(`${num}²`, ans, spread, -spread);
        }
    },
    {
        id: 'sum-odds',
        title: 'Sum of Consecutive Odds',
        description: 'Add up long strings of odd numbers instantly',
        difficulty: 2,
        icon: '✨',
        lesson: {
            equation: '1 + 3 + 5 + 7 + 9',
            latex: '\\sum_{k=1}^{N}(2k-1) = N^2',
            steps: [
                'How many numbers are there? Count them: 5 numbers.',
                'The sum of the first N odd numbers is always N²!',
                '5 numbers... so 5² = 25'
            ],
            result: '25'
        },
        generatePractice: () => {
            const n = Math.floor(Math.random() * 10) + 3; // 3 to 12 terms
            const terms = [];
            for (let i = 0; i < n; i++) terms.push(1 + i * 2);
            const expr = terms.slice(0, 3).join(' + ') + (n > 4 ? ' + ... + ' : ' + ') + terms[n - 1];
            const spread = Math.max(2, Math.floor(n * 0.7));
            return packTrick(expr, n * n, spread, -spread);
        }
    },
    {
        id: 'multiply-5',
        title: 'Multiply by 5',
        description: 'Half the number, then multiply by 10.',
        difficulty: 1,
        icon: '🖐️',
        lesson: {
            equation: '48 × 5',
            latex: '48 \\times 5 = \\frac{48}{2} \\times 10',
            steps: [
                'Think of 5 as 10 divided by 2.',
                'So first, cut the number in half: 48 ÷ 2 = 24.',
                'Then multiply by 10 (just add a zero): 240.'
            ],
            result: '240'
        },
        generatePractice: () => {
            const num = Math.floor(Math.random() * 88) + 12; // 12 to 99
            const ans = num * 5;
            const spread = Math.max(10, Math.floor(ans * 0.1));
            return packTrick(`${num} × 5`, ans, spread, -spread);
        }
    },
    {
        id: 'multiply-9',
        title: 'Multiply by 9',
        description: 'Multiply by 10, then subtract the number.',
        difficulty: 2,
        icon: '➿',
        lesson: {
            equation: '48 × 9',
            latex: '48 \\times 9 = 48 \\times 10 - 48',
            steps: [
                '9 is just 10 minus 1.',
                'First, multiply by 10: 480',
                'Then subtract the original number: 480 - 48',
                '480 - 40 = 440, then 440 - 8 = 432'
            ],
            result: '432'
        },
        generatePractice: () => {
            const num = Math.floor(Math.random() * 88) + 12;
            const ans = num * 9;
            const spread = Math.max(9, Math.floor(ans * 0.05));
            return packTrick(`${num} × 9`, ans, spread, -spread);
        }
    },
    {
        id: 'multiply-12',
        title: 'Multiply by 12',
        description: 'Multiply by 10, then add double the number.',
        difficulty: 2,
        icon: '🕛',
        lesson: {
            equation: '34 × 12',
            latex: '34 \\times 12 = 34 \\times 10 + 34 \\times 2',
            steps: [
                '12 is 10 plus 2.',
                'Multiply by 10: 340',
                'Double the number: 68',
                'Add them together: 340 + 68 = 408'
            ],
            result: '408'
        },
        generatePractice: () => {
            const num = Math.floor(Math.random() * 88) + 12;
            const ans = num * 12;
            const spread = Math.max(12, Math.floor(ans * 0.05));
            return packTrick(`${num} × 12`, ans, spread, -spread);
        }
    },
    {
        id: 'multiply-15',
        title: 'Multiply by 15',
        description: 'Multiply by 10, then add half of that result.',
        difficulty: 2,
        icon: '⏱️',
        lesson: {
            equation: '34 × 15',
            latex: '34 \\times 15 = 34 \\times 10 + \\frac{34 \\times 10}{2}',
            steps: [
                '15 is 10 plus 5 (half of 10).',
                'Multiply by 10: 340',
                'Take half of that result: 170',
                'Add them together: 340 + 170 = 510'
            ],
            result: '510'
        },
        generatePractice: () => {
            let num = Math.floor(Math.random() * 88) + 12;
            if (Math.random() > 0.3 && num % 2 !== 0) num += 1; // Bias towards even
            const ans = num * 15;
            const spread = Math.max(15, Math.floor(ans * 0.05));
            return packTrick(`${num} × 15`, ans, spread, -spread);
        }
    },
    {
        id: 'multiply-25',
        title: 'Multiply by 25',
        description: 'Divide by 4, then multiply by 100.',
        difficulty: 2,
        icon: '🪙',
        lesson: {
            equation: '32 × 25',
            latex: '32 \\times 25 = \\frac{32}{4} \\times 100',
            steps: [
                '25 is exactly 100 divided by 4.',
                'So just divide the number by 4: 32 ÷ 4 = 8.',
                'Then multiply by 100 (add two zeros): 800.'
            ],
            result: '800'
        },
        generatePractice: () => {
            const num = (Math.floor(Math.random() * 23) + 3) * 4; // 12 to 100 multiples of 4
            const ans = num * 25;
            const spread = Math.max(100, Math.floor(ans * 0.05));
            return packTrick(`${num} × 25`, ans, spread, -spread);
        }
    },
    {
        id: 'double-halve',
        title: 'Double and Halve',
        description: 'Cut one number in half, double the other.',
        difficulty: 3,
        icon: '⚖️',
        lesson: {
            equation: '14 × 45',
            latex: '14 \\times 45 = 7 \\times 90',
            steps: [
                'When multiplying an even number by a multiple of 5...',
                'Cut the even number in half: 14 ÷ 2 = 7.',
                'Double the other number: 45 × 2 = 90.',
                'Now multiply those two: 7 × 90 = 630.'
            ],
            result: '630'
        },
        generatePractice: () => {
            // Generate an even number (12 to 48) and a number ending in 5 (15 to 95)
            const ev = (Math.floor(Math.random() * 19) + 6) * 2;
            const fv = (Math.floor(Math.random() * 9) + 1) * 10 + 5;
            const p1 = Math.random() > 0.5 ? ev : fv;
            const p2 = p1 === ev ? fv : ev;
            const ans = p1 * p2;
            const spread = Math.max(10, Math.floor(ans * 0.05));
            return packTrick(`${p1} × ${p2}`, ans, spread, -spread);
        }
    },
    {
        id: 'rule-of-101',
        title: 'Rule of 101',
        description: 'Multiply any 2-digit number by 101 instantly.',
        difficulty: 1,
        icon: '🪞',
        lesson: {
            equation: '43 × 101',
            latex: '43 \\times 101',
            steps: [
                '101 works like a mirror for 2-digit numbers.',
                'Just take the number and write it twice!',
                '43... 43...',
                '4343'
            ],
            result: '4343'
        },
        generatePractice: () => {
            const num = Math.floor(Math.random() * 88) + 12; // 12-99
            const ans = num * 101;
            const spread = Math.max(10, Math.floor(ans * 0.05));
            return packTrick(`${num} × 101`, ans, spread, -spread);
        }
    },
    {
        id: 'rule-of-99',
        title: 'Rule of 99',
        description: 'Multiply any number by 99.',
        difficulty: 3,
        icon: '⏬',
        lesson: {
            equation: '43 × 99',
            latex: '43 \\times 99 = 43 \\times 100 - 43',
            steps: [
                '99 is just 100 minus 1.',
                'Multiply the number by 100: 4300',
                'Subtract the exact number from that: 4300 - 43.',
                '4300 - 40 = 4260, then minus 3 is 4257'
            ],
            result: '4257'
        },
        generatePractice: () => {
            const num = Math.floor(Math.random() * 88) + 12; // 12-99
            const ans = num * 99;
            const spread = Math.max(99, Math.floor(ans * 0.05));
            return packTrick(`${num} × 99`, ans, spread, -spread);
        }
    },
    {
        id: 'just-over-100',
        title: 'Just Over 100',
        description: 'Multiply two numbers slightly above 100.',
        difficulty: 3,
        icon: '📈',
        lesson: {
            equation: '104 × 106',
            latex: '(100+4)(100+6)',
            steps: [
                'Add 4 to 106 (or 6 to 104): 110. This is the first part.',
                'Multiply the last digits: 4 × 6 = 24.',
                'Stick them together: 11024'
            ],
            result: '11024'
        },
        generatePractice: () => {
            const d1 = Math.floor(Math.random() * 9) + 1; // 1-9
            const d2 = Math.floor(Math.random() * 9) + 1;
            const n1 = 100 + d1;
            const n2 = 100 + d2;
            const ans = n1 * n2;
            const spread = Math.max(10, Math.floor(ans * 0.01));
            return packTrick(`${n1} × ${n2}`, ans, spread, -spread);
        }
    },
    {
        id: 'cross-multiply',
        title: 'Cross-Multiplication',
        description: 'Left-to-right universal Vedic multiplication.',
        difficulty: 5,
        icon: '⚔️',
        lesson: {
            equation: '23 × 12',
            latex: '23 \\times 12',
            steps: [
                'Left digits × left digits: 2×1 = 2 → hundreds',
                'Right digits × right digits: 3×2 = 6 → units',
                'Cross: (2×2) + (3×1) = 7 → tens',
                '200 + 70 + 6 = 276'
            ],
            result: '276'
        },
        generatePractice: () => {
            // Keep digits somewhat small to make it manageable mentally
            const n1 = (Math.floor(Math.random() * 3) + 1) * 10 + Math.floor(Math.random() * 4) + 1; // 11 to 34
            const n2 = (Math.floor(Math.random() * 3) + 1) * 10 + Math.floor(Math.random() * 4) + 1;
            const ans = n1 * n2;
            const spread = Math.max(10, Math.floor(ans * 0.05));
            return packTrick(`${n1} × ${n2}`, ans, spread, -spread);
        }
    },
    {
        id: 'square-50s',
        title: 'Squares in the 50s',
        description: 'Instantly square numbers from 51 to 59.',
        difficulty: 2,
        icon: '🧮',
        lesson: {
            equation: '54²',
            latex: '54^2',
            steps: [
                'Add the last digit to 25: 25 + 4 = 29. (first half)',
                'Square the last digit: 4² = 16. (second half)',
                'Put them together: 2916'
            ],
            result: '2916'
        },
        generatePractice: () => {
            const d = Math.floor(Math.random() * 9) + 1; // 1-9
            const num = 50 + d;
            const ans = num * num;
            const spread = Math.max(15, Math.floor(ans * 0.01));
            return packTrick(`${num}²`, ans, spread, -spread);
        }
    },
    {
        id: 'square-40s',
        title: 'Squares in the 40s',
        description: 'Instantly square numbers from 41 to 49.',
        difficulty: 3,
        icon: '📉',
        lesson: {
            equation: '48²',
            latex: '48^2',
            steps: [
                'How far is 48 from 50? It is 2 away.',
                'Subtract 2 from 25: 25 - 2 = 23. (First half)',
                'Square that distance: 2² = 04. (Second half)',
                'Put them together: 2304'
            ],
            result: '2304'
        },
        generatePractice: () => {
            const d = Math.floor(Math.random() * 9) + 1; // 1-9
            const num = 40 + d;
            const ans = num * num;
            const spread = Math.max(15, Math.floor(ans * 0.01));
            return packTrick(`${num}²`, ans, spread, -spread);
        }
    },
    {
        id: 'near-1000',
        title: 'Squares Near 1000',
        description: 'Square numbers in the 990s in your head.',
        difficulty: 4,
        icon: '🏔️',
        lesson: {
            equation: '996²',
            latex: '996^2',
            steps: [
                '996 is 4 away from 1000.',
                'Subtract 4 from 996: 996 - 4 = 992. (First part)',
                'Square the 4 as a 3-digit block: 4² = 016. (Second part)',
                'Put them together: 992016'
            ],
            result: '992016'
        },
        generatePractice: () => {
            const num = Math.floor(Math.random() * 9) + 991; // 991-999
            const ans = num * num;
            const spread = Math.max(100, Math.floor(ans * 0.0001));
            return packTrick(`${num}²`, ans, spread, -spread);
        }
    },
    {
        id: 'divide-5',
        title: 'Divide by 5',
        description: 'Divide any number by 5 instantly.',
        difficulty: 1,
        icon: '🍰',
        lesson: {
            equation: '130 ÷ 5',
            latex: '\\frac{130}{5} = \\frac{130 \\times 2}{10}',
            steps: [
                'Instead of dividing by 5, double it then drop a zero!',
                'Double the number first: 130 × 2 = 260.',
                'Then drop a zero (divide by 10): 26.'
            ],
            result: '26'
        },
        generatePractice: () => {
            // Let's stick to numbers divisible by 5 for clean answers
            const num = (Math.floor(Math.random() * 180) + 20) * 5; // 100 to 1000
            const ans = num / 5;
            const spread = Math.max(5, Math.floor(ans * 0.1));
            return packTrick(`${num} ÷ 5`, ans, spread, -spread);
        }
    },
    {
        id: 'divide-25',
        title: 'Divide by 25',
        description: 'Divide large numbers by 25 easily.',
        difficulty: 2,
        icon: '🍫',
        lesson: {
            equation: '800 ÷ 25',
            latex: '\\frac{800}{25} = \\frac{800 \\times 4}{100}',
            steps: [
                'There are four 25s in every 100.',
                'So take the number of hundreds (8)...',
                'And multiply by 4! 8 × 4 = 32.',
                'For non-hundreds, multiply the whole thing by 4 then divide by 100.'
            ],
            result: '32'
        },
        generatePractice: () => {
            // Multiples of 25 up to 2500
            const ans = Math.floor(Math.random() * 88) + 12; // 12 to 99
            const num = ans * 25;
            const spread = Math.max(5, Math.floor(ans * 0.1));
            return packTrick(`${num} ÷ 25`, ans, spread, -spread);
        }
    },
    {
        id: 'sub-1000',
        title: 'Subtract from 1000',
        description: 'Vedic rule: "All from 9 and the last from 10".',
        difficulty: 1,
        icon: '💵',
        lesson: {
            equation: '1000 - 473',
            latex: '1000 - 473',
            steps: [
                'Subtract each digit from 9, last from 10.',
                '9 - 4 = 5, \u2002 9 - 7 = 2, \u2002 10 - 3 = 7.',
                'Put them together: 527. No borrowing!'
            ],
            result: '527'
        },
        generatePractice: () => {
            const ans = Math.floor(Math.random() * 888) + 111; // 111 to 999
            const num = 1000 - ans;
            const spread = Math.max(10, Math.floor(ans * 0.05));
            return packTrick(`1000 - ${num}`, ans, spread, -spread);
        }
    },
    {
        id: 'add-reversed',
        title: 'Add Reversed Numbers',
        description: 'Algebraic shortcut: ab + ba = 11(a+b)',
        difficulty: 1,
        icon: '🪞',
        lesson: {
            equation: '47 + 74',
            latex: '\\overline{ab} + \\overline{ba} = 11(a+b)',
            steps: [
                'Identify the two digits: 4 and 7',
                'Add them together: 4 + 7 = 11',
                'Multiply by 11: 11 × 11 = 121',
                'Why? (10a+b) + (10b+a) = 11a + 11b'
            ],
            result: '121'
        },
        generatePractice: () => {
            const a = Math.floor(Math.random() * 8) + 1; // 1-8
            const b = Math.floor(Math.random() * (9 - a)) + a + 1; // ensures a+b <= 15 for easy mental math
            const n1 = a * 10 + b;
            const n2 = b * 10 + a;
            const ans = n1 + n2;
            const spread = 11; // Distractors should be off by multiples of 11
            return packTrick(`${n1} + ${n2}`, ans, spread, -spread);
        }
    },
    {
        id: 'sub-reversed',
        title: 'Subtract Reversed Numbers',
        description: 'Algebraic shortcut: ab - ba = 9(a-b)',
        difficulty: 1,
        icon: '📉',
        lesson: {
            equation: '82 - 28',
            latex: '\\overline{ab} - \\overline{ba} = 9(a-b)',
            steps: [
                'Identify the two digits: 8 and 2',
                'Find their difference: 8 - 2 = 6',
                'Multiply by 9: 6 × 9 = 54',
                'Why? (10a+b) - (10b+a) = 9a - 9b'
            ],
            result: '54'
        },
        generatePractice: () => {
            const a = Math.floor(Math.random() * 6) + 4; // 4-9
            const b = Math.floor(Math.random() * (a - 1)) + 1; // 1 to a-1
            const n1 = a * 10 + b;
            const n2 = b * 10 + a;
            const ans = n1 - n2;
            const spread = 9; // Distractors off by 9
            return packTrick(`${n1} - ${n2}`, ans, spread, -spread);
        }
    },
    {
        id: 'multiply-ends-5-10-apart',
        title: 'Ends in 5, 10 Apart',
        description: 'Multiply numbers like 35 × 45.',
        difficulty: 4,
        icon: '🤝',
        lesson: {
            equation: '35 × 45',
            latex: '35 \\times 45',
            steps: [
                'Multiply the tens digits: 3 × 4 = 12.',
                'Add the smaller tens digit: 12 + 3 = 15.',
                'This is the first part.',
                'Always attach 75 to the end. Result: 1575.'
            ],
            result: '1575'
        },
        generatePractice: () => {
            const tens = Math.floor(Math.random() * 8) + 1; // 1-8
            const n1 = tens * 10 + 5;
            const n2 = (tens + 1) * 10 + 5;
            const ans = n1 * n2;
            const spread = Math.max(50, Math.floor(ans * 0.05));
            return packTrick(`${n1} × ${n2}`, ans, spread, -spread);
        }
    },
    {
        id: 'divide-3',
        title: 'Divide by 3',
        description: 'Use the digit-sum rule to divide large numbers.',
        difficulty: 2,
        icon: '🕵️',
        lesson: {
            equation: '5712 ÷ 3',
            latex: '\\frac{5712}{3}',
            steps: [
                'Digit sum: 5+7+1+2 = 15. Divisible by 3 ✓',
                '3 into 5 = 1 remainder 2. Bring down 7 → 27.',
                '3 into 27 = 9. Bring down 1 → 01.',
                '3 into 01 = 0 r1. Bring 12 → 3 into 12 = 4. Result: 1904'
            ],
            result: '1904'
        },
        generatePractice: () => {
            const ans = Math.floor(Math.random() * 800) + 100; // 100-900 answer
            const num = ans * 3;
            const spread = Math.max(5, Math.floor(ans * 0.05));
            return packTrick(`${num} ÷ 3`, ans, spread, -spread);
        }
    },

    // ── New tricks ────────────────────────────────────────

    {
        id: 'complement-100',
        title: 'Near-100 Multiplication (Below)',
        description: 'Multiply numbers just below 100',
        difficulty: 3,
        icon: '🪞',
        lesson: {
            equation: '97 × 94',
            latex: '97 \\times 94',
            steps: [
                'Both are close to 100. Find the deficits:',
                '100 − 97 = 3, and 100 − 94 = 6',
                'Subtract cross-deficit: 97 − 6 = 91',
                'Multiply deficits: 3 × 6 = 18',
                'Combine: 91|18 → 9118'
            ],
            result: '9118'
        },
        generatePractice: () => {
            const a = 90 + Math.floor(Math.random() * 9) + 1; // 91-99
            const b = 90 + Math.floor(Math.random() * 9) + 1;
            const ans = a * b;
            const spread = Math.max(10, Math.floor(ans * 0.01));
            return packTrick(`${a} × ${b}`, ans, spread, -spread);
        }
    },
    {
        id: 'divisible-11',
        title: 'Divisibility by 11',
        description: 'Alternating digit sum must be 0 or 11',
        difficulty: 3,
        icon: '⚖️',
        lesson: {
            equation: 'Is 2728 div by 11?',
            latex: '2 - 7 + 2 - 8 = -11',
            steps: [
                'Take alternating signs of the digits: + − + −',
                '2 − 7 + 2 − 8 = −11',
                '−11 is divisible by 11, so yes it is!',
                '(Equivalently: odds sum − evens sum = 0 or ±11)'
            ],
            result: 'Yes!'
        },
        generatePractice: () => {
            const isDiv = Math.random() > 0.5;
            const base = Math.floor(Math.random() * 900) + 100;
            const n = isDiv ? base * 11 : base * 11 + (Math.floor(Math.random() * 9) + 1);
            return {
                expression: `${n} div by 11?`,
                answer: isDiv ? 1 : 0,
                // Represent Yes as 1, No as 0 in options
                options: [1, 0],
                optionLabels: ['Yes', 'No'],
                correctIndex: isDiv ? 0 : 1
            };
        }
    },
    {
        id: 'flip-percent',
        title: 'Flip the Percent',
        description: 'Swap: A% of B = B% of A',
        difficulty: 1,
        icon: '🔄',
        lesson: {
            equation: '8% of 50',
            latex: 'A\\% \\text{ of } B = B\\% \\text{ of } A',
            steps: [
                'This looks tricky. But flip it!',
                '8% of 50 = 50% of 8',
                '50% of 8 = 4. Done!'
            ],
            result: '4'
        },
        generatePractice: () => {
            // Generate pairs where one direction is easy
            const easyPcts = [10, 20, 25, 50];
            const easyPct = easyPcts[Math.floor(Math.random() * easyPcts.length)];
            // numA is the "hard" percentage to present
            let numA: number;
            if (easyPct === 50) numA = (Math.floor(Math.random() * 9) + 2) * 2; // even: 4-20
            else if (easyPct === 25) numA = (Math.floor(Math.random() * 5) + 1) * 4; // mult of 4: 4-20
            else numA = Math.floor(Math.random() * 9) + 2; // 2-10 for 10%/20%
            const ans = easyPct * numA / 100;
            const spread = Math.max(1, Math.round(ans * 0.3));
            return packTrick(`${numA}% of ${easyPct}`, ans, spread, -spread);
        }
    },
    {
        id: 'telescoping-sum',
        title: 'Telescoping Sums',
        description: 'Partial fractions make interior terms vanish',
        difficulty: 4,
        icon: '🔭',
        lesson: {
            equation: '1/(1x2) + 1/(2x3) + ... + 1/(NxN+1)',
            latex: '\\displaystyle\\sum_{k=1}^{N} \\frac{1}{k(k+1)}',
            steps: [
                'Rewrite each term: \u00bc\u215b\u2026 \u21a8 1/k - 1/(k+1)',
                'Sum becomes: (1-\u00bd) + (\u00bd-\u2153) + (\u2153-\u00bc) ...',
                'All the middle terms cancel! (The telescope collapses)',
                'Only 1 - 1/(N+1) = N/(N+1) remains'
            ],
            result: 'N/(N+1)'
        },
        generatePractice: () => {
            const n = Math.floor(Math.random() * 15) + 5; // 5-19
            return {
                expression: `Telescoping sum to 1/(${n}×${n + 1})`,
                latex: `\\sum_{k=1}^{${n}} \\frac{1}{k(k+1)}`,
                answer: n / (n + 1),
                options: [n / (n + 1), (n - 1) / n, (n + 1) / (n + 2)].sort(() => Math.random() - 0.5),
                optionLabels: [`${n}/${n + 1}`, `${n - 1}/${n}`, `${n + 1}/${n + 2}`], // We need formatted fractions
                correctIndex: NaN // Computed later based on shuffle
            };
        }
    },
    {
        id: 'zeno-paradox',
        title: 'Zeno\'s Paradox (Geom Series)',
        description: 'Infinite halves add up to a whole',
        difficulty: 4,
        icon: '🐢',
        lesson: {
            equation: '1/2 + 1/4 + 1/8 + ... to infinity',
            latex: '\\sum_{k=1}^{\\infty} \\frac{1}{2^k} = \\frac{a}{1-r}',
            steps: [
                'Walk halfway to the wall. Then halfway again...',
                'In infinite steps, you reach it!',
                'Geometric series: S = a ÷ (1 - r)',
                'Here a = \u00bd, r = \u00bd. So S = \u00bd ÷ \u00bd = 1'
            ],
            result: '1'
        },
        generatePractice: () => {
            // Test finite vs infinite. If N is given, sum is 1 - 1/2^N
            const n = Math.floor(Math.random() * 5) + 3; // 3-7
            const ans = 1 - Math.pow(0.5, n);
            const den = Math.pow(2, n);
            const num = den - 1;
            return {
                expression: `Sum 1/2^k from k=1 to ${n}`,
                latex: `\\sum_{k=1}^{${n}} \\frac{1}{2^k}`,
                answer: ans,
                options: [ans, 1 - Math.pow(0.5, n - 1), 1 - Math.pow(0.5, n + 1)].sort(() => Math.random() - 0.5),
                optionLabels: [`${num}/${den}`, `${den / 2 - 1}/${den / 2}`, `${den * 2 - 1}/${den * 2}`],
                correctIndex: NaN
            };
        }
    },
    {
        id: 'digit-sum-mod',
        title: 'Digital Root (Mod 9)',
        description: 'Find remainder by summing digits',
        difficulty: 2,
        icon: '🔢',
        lesson: {
            equation: '4573 mod 9',
            latex: '4573 \\bmod 9',
            steps: [
                'Sum the digits: 4 + 5 + 7 + 3 = 19',
                'Sum again: 1 + 9 = 10 → 1 + 0 = 1',
                'The remainder when dividing by 9 is 1!'
            ],
            result: '1'
        },
        generatePractice: () => {
            const n = Math.floor(Math.random() * 9000) + 1000; // 1000-9999
            const mod = [3, 9][Math.floor(Math.random() * 2)];
            const correctAns = n % mod;
            // Distractors: other possible remainders
            let d1 = (correctAns + 1) % mod;
            let d2 = (correctAns + 2) % mod;
            if (d1 === correctAns) d1 = (correctAns + 3) % mod;
            if (d2 === correctAns || d2 === d1) d2 = (correctAns + 4) % mod;
            const opts = [correctAns, d1, d2].sort(() => Math.random() - 0.5);
            return {
                expression: `${n} mod ${mod}`,
                answer: correctAns,
                options: opts,
                correctIndex: opts.indexOf(correctAns)
            };
        }
    },
    {
        id: 'power-last-digit',
        title: 'Last Digit of Powers',
        description: 'Predict the last digit using cycles',
        difficulty: 3,
        icon: '🔮',
        lesson: {
            equation: 'Last digit of 7^43',
            latex: '7^{43} \\pmod{10}',
            steps: [
                'Powers of 7 cycle: 7, 9, 3, 1, 7, 9, 3, 1...',
                'The cycle length is 4.',
                '43 mod 4 = 3, so take the 3rd value in the cycle.',
                'The 3rd value is 3!'
            ],
            result: '3'
        },
        generatePractice: () => {
            const base = Math.floor(Math.random() * 8) + 2; // 2-9
            const exp = Math.floor(Math.random() * 26) + 5; // 5-30
            // Compute last digit via cycle
            const cycle: number[] = [];
            let v = base % 10;
            for (let i = 0; i < 4; i++) {
                cycle.push(v);
                v = (v * base) % 10;
            }
            const ans = cycle[(exp - 1) % cycle.length];
            // Distractors: other digits from the cycle
            const otherDigits = cycle.filter(d => d !== ans);
            const d1 = otherDigits.length > 0 ? otherDigits[0] : (ans + 1) % 10;
            const d2 = otherDigits.length > 1 ? otherDigits[1] : (ans + 3) % 10;
            const opts = [ans, d1, d2].sort(() => Math.random() - 0.5);
            return {
                expression: `Last digit: ${base}^${exp}`,
                latex: `\\text{Last digit of } ${base}^{${exp}}`,
                answer: ans,
                options: opts,
                correctIndex: opts.indexOf(ans)
            };
        }
    },
    {
        id: 'product-last-digit',
        title: 'Last Digit of Products',
        description: 'Multiply only the last digits',
        difficulty: 1,
        icon: '🔎',
        lesson: {
            equation: 'Last digit of 347 x 893',
            latex: '347 \\times 893 \\pmod{10}',
            steps: [
                'Ignore all digits except the last ones!',
                'Just multiply: 7 × 3 = 21',
                'The last digit of 21 is 1.',
                'So 347 × 893 ends in 1'
            ],
            result: '1'
        },
        generatePractice: () => {
            const a = Math.floor(Math.random() * 900) + 100; // 100-999
            const b = Math.floor(Math.random() * 900) + 100;
            const ans = ((a % 10) * (b % 10)) % 10;
            // Distractors: nearby digits
            const d1 = (ans + Math.floor(Math.random() * 3) + 1) % 10;
            let d2 = (ans + Math.floor(Math.random() * 3) + 4) % 10;
            if (d2 === d1) d2 = (d2 + 1) % 10;
            if (d2 === ans) d2 = (d2 + 1) % 10;
            const opts = [ans, d1, d2].sort(() => Math.random() - 0.5);
            return {
                expression: `Last digit: ${a} × ${b}`,
                answer: ans,
                options: opts,
                correctIndex: opts.indexOf(ans)
            };
        }
    },
    {
        id: 'gauss-sum',
        title: 'Sum 1 to N (Gauss)',
        description: 'Sum any range instantly with N×(N+1)÷2',
        difficulty: 2,
        icon: '📐',
        lesson: {
            equation: '1 + 2 + 3 + ... + 100',
            latex: '\\sum_{k=1}^{N} k = \\dfrac{N(N+1)}{2}',
            steps: [
                'Pair the first and last: 1 + 100 = 101',
                'How many pairs? 100 ÷ 2 = 50',
                'Multiply: 101 × 50 = 5050',
                'Formula: N(N+1) ÷ 2'
            ],
            result: '5050'
        },
        generatePractice: () => {
            const ns = [10, 15, 20, 25, 30, 40, 50, 60, 75, 100];
            const n = ns[Math.floor(Math.random() * ns.length)];
            const ans = n * (n + 1) / 2;
            const spread = Math.max(5, Math.floor(ans * 0.08));
            return packTrick(`1 + 2 + ... + ${n}`, ans, spread, -spread);
        }
    },
    {
        id: 'golden-ratio',
        title: 'The Golden Ratio (Continued Fraction)',
        description: 'Evaluate an infinite nested fraction',
        difficulty: 5,
        icon: '🐚',
        lesson: {
            equation: 'x = 1 + 1 / (1 + 1 / (1 + ...))',
            latex: 'x = 1 + \\cfrac{1}{1 + \\cfrac{1}{1 + \\cfrac{1}{\\ddots}}}',
            steps: [
                'The denominator is the same pattern as x itself!',
                'So x = 1 + 1/x',
                'Multiply by x: x² = x + 1, i.e. x² - x - 1 = 0',
                'Positive root: x = (1 + √5) / 2 ≈ 1.618'
            ],
            result: '\u03c6 (1.618...)'
        },
        generatePractice: () => {
            return {
                expression: `Value of 1 + 1/(1 + 1/(1+...))`,
                answer: 1.618,
                options: [1.618, 1.414, 2],
                optionLabels: ['φ (1.618)', '√2 (1.414)', '2'],
                correctIndex: 0 // Will be shuffled later
            };
        }
    },

    {
        id: 'large-power-cycles',
        title: 'Large-Exponent Cycles',
        description: 'Find the last digit of huge powers like 7^100',
        difficulty: 5,
        icon: '🌀',
        lesson: {
            equation: 'Last digit of 7^100',
            latex: '7^{100} \\bmod 10',
            steps: [
                'Powers of 7 cycle every 4: 7, 9, 3, 1, 7, 9, 3, 1...',
                'So 7^N mod 10 only depends on N mod 4.',
                '100 mod 4 = 0, which corresponds to the 4th value in the cycle.',
                'The 4th value is 1!'
            ],
            result: '1'
        },
        generatePractice: () => {
            const base = Math.floor(Math.random() * 8) + 2;
            const exp = Math.floor(Math.random() * 151) + 50;
            const cycle: number[] = [];
            let v = base % 10;
            for (let i = 0; i < 4; i++) {
                cycle.push(v);
                v = (v * base) % 10;
            }
            const idx = ((exp - 1) % 4 + 4) % 4;
            const ans = cycle[idx];
            const others = cycle.filter(d => d !== ans);
            const d1 = others[0] ?? (ans + 1) % 10;
            let d2 = others[1] ?? (ans + 3) % 10;
            if (d2 === d1) d2 = (d2 + 1) % 10;
            const opts = [ans, d1, d2].sort(() => Math.random() - 0.5);
            return {
                expression: `Last digit: ${base}^${exp}`,
                latex: `\\text{Last digit of } ${base}^{${exp}}`,
                answer: ans,
                options: opts,
                correctIndex: opts.indexOf(ans)
            };
        }
    }
];

/** Trick categories for the Magic School progression UI */
export interface TrickCategory {
    id: string;
    label: string;
    emoji: string;
    trickIds: string[];
}

export const TRICK_CATEGORIES: TrickCategory[] = [
    {
        id: 'multiplication',
        label: 'Multiplication',
        emoji: '✕',
        trickIds: [
            'multiply-5', 'multiply-9', 'multiply-11', 'multiply-12',
            'multiply-15', 'multiply-25', 'rule-of-99', 'rule-of-101',
            'double-halve', 'diff-squares', 'cross-multiply',
            'just-over-100', 'complement-100', 'multiply-ends-5-10-apart',
        ],
    },
    {
        id: 'squaring',
        label: 'Squaring',
        emoji: '²',
        trickIds: ['square-5', 'near-100', 'square-50s', 'square-40s', 'near-1000'],
    },
    {
        id: 'division',
        label: 'Division',
        emoji: '➗',
        trickIds: ['divide-5', 'divide-25', 'divide-3'],
    },
    {
        id: 'addition',
        label: 'Addition',
        emoji: '➕',
        trickIds: ['add-reversed'],
    },
    {
        id: 'subtraction',
        label: 'Subtraction',
        emoji: '➖',
        trickIds: ['sub-reversed', 'sub-1000'],
    },
    {
        id: 'series',
        label: 'Series & Sequences',
        emoji: '📐',
        trickIds: ['sum-odds', 'gauss-sum'],
    },
    {
        id: 'inf-series',
        label: 'Infinite & Telescoping',
        emoji: '🔭',
        trickIds: ['telescoping-sum', 'zeno-paradox'],
    },
    {
        id: 'number-theory',
        label: 'Number Theory',
        emoji: '🔮',
        trickIds: ['power-last-digit', 'product-last-digit', 'digit-sum-mod', 'divisible-11', 'large-power-cycles'],
    },
    {
        id: 'continued-fractions',
        label: 'Continued Fractions',
        emoji: '♾️',
        trickIds: ['golden-ratio'],
    },
    {
        id: 'fractions',
        label: 'Fractions & Ratios',
        emoji: '⅑',
        trickIds: ['flip-percent'],
    }
];

/** Find the next recommended trick: first unmastered by difficulty order */
export function getRecommendedTrick(mastered: Set<string>): MagicTrick | null {
    // Sort by difficulty, return first unmastered
    const sorted = [...MAGIC_TRICKS].sort((a, b) => a.difficulty - b.difficulty);
    return sorted.find(t => !mastered.has(t.id)) ?? null;
}

