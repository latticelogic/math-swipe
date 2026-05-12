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
        description: 'Two numbers the same distance from a friendly number (e.g. 98 × 102 from 100).',
        difficulty: 2,
        icon: '🎯',
        lesson: {
            equation: '98 × 102',
            latex: '98 \\times 102',
            steps: [
                'Big idea: (a − b)(a + b) = a² − b². Two numbers equidistant from a centre value collapse into one square minus another.',
                'Here, both numbers are 2 away from 100: that\'s (100 − 2)(100 + 2).',
                'Apply the formula: 100² − 2² = 10000 − 4.',
                '= 9996.'
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
        description: 'Split the digits and tuck their sum in the middle.',
        difficulty: 1,
        icon: '🚀',
        lesson: {
            equation: '43 × 11',
            latex: '43 \\times 11',
            steps: [
                'Split the digits: 4 _ 3.',
                'Add them and tuck the sum into the middle: 4 + 3 = 7 → 4 7 3.',
                'Why it works: 43 × 11 = 43 × 10 + 43 = 430 + 43. Aligning those gives the digit-sum in the tens column.',
                'Watch out: if the sum is 10 or more, carry the 1. (87 × 11: 8+7 = 15 → carry the 1 over to the 8 → 9, 5, 7 → 957.)'
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
        description: 'Square numbers near 100 (like 96 or 97) by anchoring on 100.',
        difficulty: 3,
        icon: '🔥',
        lesson: {
            equation: '96²',
            latex: '96^2',
            steps: [
                'Big idea: (100 − d)² = 100² − 200d + d² = (100 − 2d)(100) + d². The first part lands as the leading digits; the d² lands as the last two.',
                'Step 1 — find the distance from 100: 100 − 96 = 4.',
                'Step 2 — subtract the distance from the number: 96 − 4 = 92. (First half.)',
                'Step 3 — square the distance: 4² = 16. (Second half, padded to 2 digits.)',
                'Glue them: 92 then 16 → 9216.'
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
        description: 'The first N odd numbers always sum to N².',
        difficulty: 2,
        icon: '✨',
        lesson: {
            equation: '1 + 3 + 5 + 7 + 9',
            latex: '\\sum_{k=1}^{N}(2k-1) = N^2',
            steps: [
                'Count the numbers: 5 odd numbers in a row.',
                'The big idea: the first N odd numbers ALWAYS add up to N².',
                'Why? Picture an N×N grid. Each new odd number adds an L-shape around the corner — one square, then 3, then 5… filling out the square.',
                '5 numbers, so 5² = 25.'
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
        description: 'Multiply by 5 by halving, then adding a zero.',
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
        description: 'Multiply by 10, then subtract the original.',
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
        description: 'Multiply by 10, then add double the original.',
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
        description: 'Multiply by 25 by quartering, then adding two zeros.',
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
        description: 'Halve one side, double the other — the product stays the same.',
        difficulty: 3,
        icon: '⚖️',
        lesson: {
            equation: '14 × 45',
            latex: '14 \\times 45 = 7 \\times 90',
            steps: [
                'Big idea: ½ and ×2 cancel out. So you can halve one factor while doubling the other, and the product stays the same.',
                'Goal: turn an awkward product into one with a "friendly" factor (×10, ×100…).',
                'For 14 × 45: halve the even one (14 → 7), double the other (45 → 90).',
                'Now 7 × 90 is easy: 7 × 9 = 63, add a zero → 630.'
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
        description: 'Just repeat the number — no mental math.',
        difficulty: 1,
        icon: '🪞',
        lesson: {
            equation: '43 × 101',
            latex: '43 \\times 101',
            steps: [
                'Why this works: 101 = 100 + 1. So n × 101 = n × 100 + n. The "× 100" pushes the digits two places left; the "+ n" fills those two right-most slots back in.',
                'For 43: 43 × 100 = 4300, then + 43 = 4343.',
                'Shortcut: just write the number twice. "43 43" → 4343.',
                'Works on any 2-digit number.'
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
        description: 'Multiply by 100, then subtract the original.',
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
        description: 'Multiply two numbers just above 100 in one quick step.',
        difficulty: 3,
        icon: '📈',
        lesson: {
            equation: '104 × 106',
            latex: '(100+4)(100+6)',
            steps: [
                'Big idea: (100 + a)(100 + b) = 100·(100 + a + b) + a·b. The left part lands as the leading digits; a·b lands as the last two.',
                'Step 1 — add either number to the other\'s "extra": 104 + 6 = 110 (same as 106 + 4). That\'s the first part.',
                'Step 2 — multiply the extras: 4 × 6 = 24. That\'s the last two digits (pad to 2 digits if needed).',
                'Glue them: 110 then 24 → 11024.'
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
        description: 'Multiply 2-digit numbers in one pass — left to right.',
        difficulty: 5,
        icon: '⚔️',
        lesson: {
            equation: '23 × 12',
            latex: '23 \\times 12',
            steps: [
                'Big idea: any 2-digit × 2-digit splits into three pieces — hundreds, tens, units. Compute each separately, then add.',
                'Hundreds = left × left: 2 × 1 = 2 → write down 2.',
                'Tens = the cross — (left × right) + (right × left): (2×2) + (3×1) = 4 + 3 = 7 → write down 7.',
                'Units = right × right: 3 × 2 = 6 → write down 6.',
                'Read off: 2, 7, 6 → 276. No carrying needed when each part is one digit.'
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
        description: 'Square 51–59 by mixing 25 with the last digit.',
        difficulty: 2,
        icon: '🧮',
        lesson: {
            equation: '54²',
            latex: '54^2',
            steps: [
                'Why 25? Because 50² = 2500, and the "25" is the hundreds part. Anything in the 50s starts with that 25.',
                'Step 1 — add the units digit to 25: 25 + 4 = 29. That\'s the first half.',
                'Step 2 — square the units digit: 4² = 16. That\'s the second half (always 2 digits — pad with 0 if needed).',
                'Glue them: 29 then 16 → 2916.'
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
        description: 'Square 41–49 by anchoring on 50.',
        difficulty: 3,
        icon: '📉',
        lesson: {
            equation: '48²',
            latex: '48^2',
            steps: [
                'Big idea: anchor on 50. The number is "50 minus something" — for 48, that something is 2.',
                'Step 1 — subtract that distance from 25: 25 − 2 = 23. (First half.)',
                'Step 2 — square the distance: 2² = 4 → pad to "04". (Second half is always 2 digits.)',
                'Glue them: 23 then 04 → 2304.'
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
        description: 'Square numbers near 1000 by anchoring on 1000.',
        difficulty: 4,
        icon: '🏔️',
        lesson: {
            equation: '996²',
            latex: '996^2',
            steps: [
                'Same idea as Near-100 Squares, but with 1000 as the anchor. (1000 − d)² = (1000 − 2d)(1000) + d².',
                'Step 1 — find the distance from 1000: 1000 − 996 = 4.',
                'Step 2 — subtract that distance from the number: 996 − 4 = 992. (First part.)',
                'Step 3 — square the distance, padded to 3 digits: 4² = 016. (Second part.)',
                'Glue them: 992 then 016 → 992016.'
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
        description: 'Divide by 5 by doubling, then dropping a zero.',
        difficulty: 1,
        icon: '🍰',
        lesson: {
            equation: '130 ÷ 5',
            latex: '\\frac{130}{5} = \\frac{130 \\times 2}{10}',
            steps: [
                'Why this works: ÷5 is the same as ÷10 then ×2. Or in reverse, ×2 then ÷10.',
                'Step 1 — double: 130 × 2 = 260.',
                'Step 2 — drop a zero: 26.',
                'Dropping a zero is just dividing by 10. Easier than dividing by 5 in your head.'
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
        description: 'Divide by 25 by multiplying by 4, then dropping two zeros.',
        difficulty: 2,
        icon: '🍫',
        lesson: {
            equation: '800 ÷ 25',
            latex: '\\frac{800}{25} = \\frac{800 \\times 4}{100}',
            steps: [
                'Why this works: 25 × 4 = 100. So ÷25 is the same as ×4 ÷100.',
                'Step 1 — multiply by 4: 800 × 4 = 3200.',
                'Step 2 — drop two zeros (÷100): 32.',
                'Multiplying by 4 is just doubling twice — easier than dividing by 25.'
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
        description: 'No borrowing: take each digit from 9 — last one from 10.',
        difficulty: 1,
        icon: '💵',
        lesson: {
            equation: '1000 - 473',
            latex: '1000 - 473',
            steps: [
                'Why: 1000 = 999 + 1. So 1000 \u2212 abc = (999 \u2212 abc) + 1. Each of the first two digits comes from 9 (no borrow), and the last from 10 (the +1).',
                'Step 1 \u2014 subtract each digit from 9: 9 \u2212 4 = 5, 9 \u2212 7 = 2.',
                'Step 2 \u2014 subtract the last digit from 10: 10 \u2212 3 = 7.',
                'Glue them: 5, 2, 7 \u2192 527. No borrowing anywhere.'
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
        description: 'Multiply two ...5 numbers that are 10 apart (35×45, 65×75).',
        difficulty: 4,
        icon: '🤝',
        lesson: {
            equation: '35 × 45',
            latex: '35 \\times 45',
            steps: [
                'Works whenever both numbers end in 5 AND are exactly 10 apart.',
                'Step 1 — multiply the tens digits: 3 × 4 = 12.',
                'Step 2 — add the smaller tens digit: 12 + 3 = 15. (That\'s the first part of the answer.)',
                'Step 3 — always tack on 75: 1575.',
                'Why "75"? Because 5 × 5 = 25, plus the half-step from the missing middle term lands you at ...75 every time.'
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
        description: 'First check it divides evenly (digit-sum rule), then chunk through.',
        difficulty: 2,
        icon: '🕵️',
        lesson: {
            equation: '5712 ÷ 3',
            latex: '\\frac{5712}{3}',
            steps: [
                'Digit-sum check: 5+7+1+2 = 15. Since 15 is divisible by 3, the original is too. (Saves you from a fruitless calculation.)',
                'Now walk left-to-right: 3 into 5 = 1, remainder 2. Bring down 7 → 27.',
                '3 into 27 = 9 exactly. Bring down 1 → 1.',
                '3 into 1 = 0, remainder 1. Bring down 2 → 12. 3 into 12 = 4.',
                'Read off: 1, 9, 0, 4 → 1904.'
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
        description: 'Multiply two numbers just below 100, using their "distance from 100".',
        difficulty: 3,
        icon: '🪞',
        lesson: {
            equation: '97 × 94',
            latex: '97 \\times 94',
            steps: [
                'Why: (100 − a)(100 − b) = 100·(100 − a − b) + a·b. The first part is the leading digits; a·b lands in the last two.',
                'Step 1 — find each "deficit" (distance from 100): 100 − 97 = 3, and 100 − 94 = 6.',
                'Step 2 — subtract one deficit from the OTHER number: 97 − 6 = 91. (Same result if you do 94 − 3.) That\'s the first part.',
                'Step 3 — multiply the deficits: 3 × 6 = 18. (Pad to 2 digits if needed.) That\'s the last part.',
                'Glue them: 91 then 18 → 9118.'
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
        description: 'Alternate the digits + and −. If the total is 0 or ±11, it divides by 11.',
        difficulty: 3,
        icon: '⚖️',
        lesson: {
            equation: 'Is 2728 div by 11?',
            latex: '2 - 7 + 2 - 8 = -11',
            steps: [
                'Why this works: 10 = 11 − 1, so 100 = 11×9 + 1, 1000 = 11×91 − 1, etc. Each place alternates between leaving remainder +1 and −1 when divided by 11.',
                'Tag each digit with alternating + and − signs (rightmost digit gets +, then alternate moving left).',
                'For 2728: −2 + 7 − 2 + 8 = +11. (Or 2 − 7 + 2 − 8 = −11 reading the other direction. Same magnitude.)',
                'A result of 0 or any multiple of 11 means the original divides evenly. ±11 → yes.'
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
        description: 'A% of B equals B% of A — pick whichever side is easier.',
        difficulty: 1,
        icon: '🔄',
        lesson: {
            equation: '8% of 50',
            latex: 'A\\% \\text{ of } B = B\\% \\text{ of } A',
            steps: [
                'Why this works: A% of B is A × B / 100. Multiplication doesn\'t care about order, so it equals B × A / 100, which is B% of A.',
                '8% of 50 is annoying. But 50% of 8 is just half of 8.',
                '50% of 8 = 4. Same answer, way easier.',
                'When you see an ugly percent of a friendly number, flip it.'
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
        description: 'Rewrite each term so almost everything cancels — only the ends survive.',
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
        description: 'Infinitely many halves still add up to exactly 1.',
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
        description: 'A number\'s remainder mod 9 is the same as its digit sum\'s remainder.',
        difficulty: 2,
        icon: '🔢',
        lesson: {
            equation: '4573 mod 9',
            latex: '4573 \\bmod 9',
            steps: [
                'Why this works: every power of 10 leaves a remainder of 1 when divided by 9 (10 = 9+1, 100 = 99+1, etc.). So each digit contributes itself to the remainder.',
                'Sum the digits: 4 + 5 + 7 + 3 = 19.',
                'Still ≥ 10? Sum again: 1 + 9 = 10 → 1 + 0 = 1.',
                'That final single digit IS the remainder. 4573 ÷ 9 leaves remainder 1.'
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
        description: 'Last digits cycle every few powers — pin the exponent to the cycle.',
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
        description: 'Only the units digits matter — ignore the rest.',
        difficulty: 1,
        icon: '🔎',
        lesson: {
            equation: 'Last digit of 347 × 893',
            latex: '347 \\times 893 \\pmod{10}',
            steps: [
                'Why: when you multiply two numbers, only the units digits contribute to the units digit of the answer. The hundreds and tens places of either number only affect higher columns.',
                'Strip down to the last digits: 7 × 3.',
                '7 × 3 = 21. Take the last digit: 1.',
                'So 347 × 893 ends in 1. (No need to compute the full product!)'
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
        description: 'Sum 1 through N in one step: N × (N+1) ÷ 2.',
        difficulty: 2,
        icon: '📐',
        lesson: {
            equation: '1 + 2 + 3 + ... + 100',
            latex: '\\sum_{k=1}^{N} k = \\dfrac{N(N+1)}{2}',
            steps: [
                'The story: 9-year-old Gauss was asked to sum 1 to 100. He noticed the pairs (1+100), (2+99), (3+98)… all equal 101.',
                'How many pairs? 100 numbers make 50 pairs.',
                'So the total is 50 × 101 = 5050.',
                'General rule: 1 + 2 + … + N = N × (N+1) ÷ 2.'
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

