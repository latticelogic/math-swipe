# Difficulty curves — per-topic spec

Status: **IMPLEMENTED via PR #25** (`feat(generator): real difficulty
curves for all 28 topics`). Last spec update 2026-05-11.

This document defined what Easy / Medium / Hard means for every topic
in Math Swipe. It originated as a product/curriculum spec because the
generator had 13 of 28 topics that completely ignored the `difficulty`
parameter, and 5 more that only responded to the `hardMode` toggle.
The specific complaint that prompted it: "ratios feels the same
between Easy and Hard."

The curves below were merged in PR #25 and now hold across all 28
topics. If you're modifying difficulty behavior, edit
`src/utils/mathGenerator.ts` and keep this doc in sync.

---

## Two independent dials

Math Swipe has two difficulty controls that act on the generator
**independently**:

1. **`difficulty` (1–5)** — automatically adjusted by `useDifficulty.ts`
   based on response time. Fast answers (<1.5s) bump up by 1; slow
   answers (>4s) drop by 1. Initial value is 2 for all bands.

   *Intent*: smooth, invisible flow-state tuning. Should feel like "a
   slightly bigger version of the same kind of problem."

2. **`hardMode` (boolean)** — a manual user toggle (the 💀 skull button).
   Off by default.

   *Intent*: an opt-in "crush me" mode that introduces qualitatively
   harder problem types — not just bigger numbers, but bigger *concepts*
   (negatives, fractions of fractions, larger digit counts that force
   real mental computation instead of memorized facts).

**Both dials must do something on every topic** (with explicit exceptions
documented below).

---

## Age bands as topic gating, not generator branching

Topics are catalogued by age band in
[`src/domains/math/mathCategories.ts:106-128`](../src/domains/math/mathCategories.ts).
A `divide` problem looks identical regardless of band — the band just
controls *which topics show up*.

**Recommendation: do not introduce age-band branching inside generators.**
Each topic appears in 1–2 bands; tune the difficulty-1-to-5 range so
that the *middle* of the curve feels right for the youngest band that
has access. The `hardMode` ceiling can go further for the older bands
without breaking the younger experience because younger users won't
typically toggle skull mode.

Example: `add` appears in 35 (ages 8–10). Easy (d=1) should be doable
for an 8-year-old; Hard (d=5) should challenge a 10-year-old; hardMode
should be hard for an adult. The 6+ band also gets `add`, but they'll
mostly play higher topics; their `add` experience is the same as the
35 band's, which is fine.

---

## Per-topic curve

Format: each topic gets a current behavior, a recommended Easy/Medium/Hard
behavior, and a hardMode behavior. Topics that should genuinely stay
flat are marked **(flat by design)** with reasoning.

> User decision: there are *no* topics the product owner thinks should
> stay flat. Every topic gets a real curve. This spec proposes one for
> each.

### Whole-number arithmetic (35, 6+ bands)

#### `add` — current strength: 4/5 ✓ keep with light polish
- **Current**: easy 10-49, med 10-69 to 10-89, hard 10-99, hardMode 100-999.
- **Recommended**: easy 1-30 (single-digit-friendly), med 10-99, hard 50-499 (genuine multi-digit mental work begins), hardMode 100-9999 *plus* 3-term problems (`a + b + c`).
- *Why*: current curve is fine but Easy is too restrictive (10-49 skips the easiest single-digit drills that an 8-year-old needs) and hardMode could go further to differentiate from level-5.

#### `subtract` — current strength: 4/5 ✓ keep with same polish as add
- **Recommended**: mirror `add` ranges. Hard introduces problems that *require borrowing across two digits* (e.g., 500 - 287 = 213). hardMode: 3-term subtraction and 4-digit subtraction.

#### `multiply` — current strength: 4/5 ✓ keep
- **Current**: easy 2-5×2-5, med 2-9×2-9 to 3-9×6-12, hard 6-12×8-15 to 10-15×10-15, hardMode 2-32×2-32.
- **Recommended**: easy 2-5×2-5 (memorized table), med 2-12×2-12 (full times table), hard 10-25×2-9 (one factor escapes the times table), hardMode 13-99 × 13-99 (genuine mental multiplication).
- *Why*: 10-15×10-15 at hard is still mostly memorized for many users. hardMode 2-32×2-32 is decent but not differentiated enough.

#### `divide` — current strength: 4/5 ✓ keep
- **Recommended**: mirror `multiply` (since these are inverse operations and should feel paired). At hardMode, prefer problems where the result is whole (no remainder) but the dividend has 3-4 digits.

### Powers / roots (6+ band)

#### `square` — current strength: 3/5 — improve hardMode
- **Current**: easy 2-9², med 2-12², hard 2-15², hardMode 2-32².
- **Recommended**: same ranges for d=1..5, but hardMode should include 25², 35², 45², ..., 95² (the "ends in 5 trick" — connects to the Tricks system) AND 99² (boundary mental trick).
- *Why*: hardMode 2-32² is just "bigger numbers." Real difficulty in squaring is the *technique*.

#### `sqrt` — current strength: 3/5 — improve hardMode
- **Recommended**: same as square. hardMode introduces non-perfect approximate questions ("√50, nearest integer?") forcing estimation.

### K-2 topics (k2 band)

> Product owner decision: K-2 topics get a real curve too, not flat.

#### `add1` — current strength: 1/5 (ignored both dials)
- **Recommended**:
  - Easy: 1-5 + 1-5 (counting-on-fingers range)
  - Med: 1-9 + 1-9 (the current behavior — adequate for default level 2)
  - Hard: 1-12 + 1-12 (begins teen-sum, e.g., 7+8)
  - hardMode: 1-20 + 1-20, but only problems where the sum crosses 10 (the "make-a-ten" mental strategy)
- *Why*: a 5-year-old on Easy should not be doing 9+8 yet; a 7-year-old on Hard should be.

#### `sub1` — current strength: 1/5
- **Recommended**: mirror `add1`. hardMode forces problems with regrouping (e.g., 14 - 7).

#### `bonds` — current strength: 1/5
- **Current**: total ∈ {5, 10, 20} chosen randomly.
- **Recommended**:
  - Easy: total = 5 only
  - Med: total ∈ {5, 10}
  - Hard: total ∈ {10, 20}
  - hardMode: total ∈ {20, 50, 100} (extends the same fact-pattern to harder numbers)
- *Why*: bonds-to-5 is the absolute beginner exercise; bonds-to-100 is a real mental drill even for adults.

#### `doubles` — current strength: 1/5
- **Current**: 1-10 + 1-10 doubles.
- **Recommended**:
  - Easy: 1-5 doubled (memorized: 2,4,6,8,10)
  - Med: 1-10 doubled (current behavior)
  - Hard: 1-20 doubled (introduces 14+14, 17+17 — these require strategy not memory)
  - hardMode: 1-50 doubled (real mental work: 37+37=?)

#### `compare` — current strength: 1/5
- **Current**: 1-20 vs 1-20.
- **Recommended**:
  - Easy: 1-10 vs 1-10
  - Med: 1-50 vs 1-50
  - Hard: 1-200 vs 1-200 (place-value comparison: is 187 > 178?)
  - hardMode: comparisons of expressions — `12+5 vs 9+7` or `3×4 vs 5+8`
- *Why*: this is the topic that benefits MOST from hardMode-changes-kind. Comparing numbers is trivial; comparing expressions tests fluency.

#### `skip` — current strength: 1/5
- **Current**: steps ∈ {2, 5, 10}.
- **Recommended**:
  - Easy: steps ∈ {2, 10}
  - Med: steps ∈ {2, 5, 10} (current)
  - Hard: steps ∈ {3, 4, 5, 7} (less-memorized intervals)
  - hardMode: steps ∈ {6, 8, 9, 11, 12, 25} and backward skip-counting (e.g., 100, 88, 76, ?)

#### `shapes` — current strength: 1/5
- **Current**: 3-6 sides only (triangle/square/pentagon/hexagon).
- **Recommended**:
  - Easy: 3-4 sides (triangle/quadrilateral)
  - Med: 3-6 sides (current)
  - Hard: 3-10 sides (introduces heptagon, octagon, nonagon, decagon)
  - hardMode: include *properties* questions ("how many right angles in a regular hexagon?", "how many sides does a dodecagon have?")
- *Why*: kids learn shape recognition fast; the real challenge is properties and unusual polygons.

#### `evenodd` — current strength: 1/5
- **Current**: 2-99.
- **Recommended**:
  - Easy: 1-20 (one-digit + teens)
  - Med: 2-99 (current)
  - Hard: 100-999 (place-value: only the last digit matters)
  - hardMode: 4-digit numbers AND sum/product expressions ("is 47+92 even or odd?")

#### `tens` — current strength: 1/5
- **Current**: 10-89 ± 10.
- **Recommended**:
  - Easy: 1-39 + 10 (start with same-decade)
  - Med: 10-89 ± 10 (current)
  - Hard: 10-89 ± 30 (multi-step: subtract 30 from 80 = 50)
  - hardMode: ±20/30/40/50 from 3-digit numbers (e.g., 470 - 30, 230 + 50)

### Core (35, 6+ bands)

#### `round` — current strength: 1/5
- **Current**: places ∈ {10, 100}.
- **Recommended**:
  - Easy: round to 10 only, range 1-100
  - Med: round to 10 or 100, range 1-1000
  - Hard: round to 10/100/1000, range 1-10000
  - hardMode: include rounding decimals (round 4.56 to nearest tenth/whole) — connects to `decimal` topic

#### `orderops` — current strength: 1/5
- **Current**: a + b × c with small ranges.
- **Recommended**:
  - Easy: a + b × c, ranges 1-9
  - Med: 3-term BIDMAS: a × b + c × d (e.g., 3×4 + 2×5)
  - Hard: include parentheses: (a + b) × c
  - hardMode: 4-term mixed: a + b × c - d, OR include exponents (2² + 3×4)
- *Why*: order-of-operations is a *rules* topic — difficulty isn't about bigger numbers, it's about needing to apply more rules in sequence.

### Advanced (6+ band)

#### `exponent` — current strength: 2/5
- **Current**: base 2-5 exp 2-4 (or hardMode base 2-10 exp 2-5). Ignores `d` entirely.
- **Recommended**:
  - Easy: base 2-3, exp 2-3 (memorized small powers)
  - Med: base 2-5, exp 2-4 (current d-agnostic behavior)
  - Hard: base 2-10, exp 2-5
  - hardMode: include negative-base or fractional-base (½² = ¼) and "what power makes 64?" inverse questions

#### `negatives` — current strength: 2/5
- **Current**: ±1-10 or hardMode ±1-20. Ignores `d`.
- **Recommended**:
  - Easy: ±1-10 (current d-agnostic)
  - Med: ±1-20
  - Hard: ±1-50 with multiplication (e.g., -7 × 4)
  - hardMode: 3-term: -a + b - c, or -a × -b × c (sign tracking)

#### `linear` — current strength: 2/5
- **Current**: 2x ± 1-15, solve for x. Ignores `d`.
- **Recommended**:
  - Easy: ax = b, a ∈ 2-5 (one-step)
  - Med: ax + b = c, a ∈ 2-9 (two-step, current behavior approximately)
  - Hard: ax + b = cx + d (variable on both sides)
  - hardMode: include negative solutions and fractional coefficients

#### `gcflcm` — current strength: 1/5
- **Current**: factor 2-6, multipliers 2-6.
- **Recommended**:
  - Easy: GCF only, numbers up to 30
  - Med: GCF or LCM, numbers up to 60 (current-ish)
  - Hard: LCM emphasis, numbers up to 144
  - hardMode: 3-number GCF or LCM (e.g., GCF(12, 18, 30))

#### `ratio` — current strength: 1/5 (the topic that started this whole spec)
- **Current**: GCD-scaled 1-5 × factor, multipliers 2-6, no d, no hardMode.
- **Recommended**:
  - Easy: simple equivalent ratios with whole multipliers ≤ 5 (e.g., 2:3 = 4:?)
  - Med: multipliers up to 12 (current-ish)
  - Hard: ratios that simplify (e.g., 12:18 = 2:?) — tests GCD knowledge in reverse
  - hardMode: 3-term ratios (a:b:c) OR ratios with decimal/fractional terms

#### `fraction` — current strength: 3/5
- **Current**: same-denom or simple pairs at easy, mixed 2-5 denoms at medium, 2-8 at hard, hardMode 2-12 with all pairs.
- **Recommended**: keep the current curve — this is actually well-tuned. Possibly add to hardMode: improper fractions and mixed numbers (3¼ + 2½).

#### `decimal` — current strength: 2/5
- **Current**: 1-20 or ×2-5, hardMode 1-50 or ×2-9. Ignores `d`.
- **Recommended**:
  - Easy: addition/subtraction with one decimal place (0.1-0.9)
  - Med: two decimal places, mixed ops
  - Hard: multiplication of decimals (0.4 × 0.3 — known to be conceptually tricky)
  - hardMode: include division by decimals (12 ÷ 0.4)

#### `percent` — current strength: 2/5
- **Current**: {10,20,25,50,75}% of {20-200}, hardMode {5-75}% of {40-500}. Ignores `d`.
- **Recommended**:
  - Easy: 10%, 25%, 50%, 100% of multiples of 10
  - Med: 10/25/50/75% of any 2-digit number
  - Hard: 5%, 15%, 20%, 30%, 40%, 60%, 70%, 80%, 90% (less-memorized %s)
  - hardMode: percent *change* (problem went from 40 to 50, what % increase?)
- *Why*: percent is taught as a list of memorized "easy" % values; the test of mastery is computing "annoying" %s and inverse percent.

### Mixed (35, 6+ bands)

#### `mix-basic` and `mix-all` — current strength: 4/5 ✓ keep
- These are dispatch-only types — they pick a sub-type and use that type's difficulty curve. Once every sub-type has a real curve (this spec), these get the benefit for free.

---

## Implementation notes for the next PR

- All functions in `mathGenerator.ts` get `(d: number, hardMode: boolean)` parameters even if their current signature has neither. Use `_d` / `_hardMode` (underscore-prefixed) for any that legitimately don't branch — but per the product owner decision, every topic should branch on something.
- The dispatch table at lines 48-82 needs to pass both `difficulty` and `hardMode` to every case. The agent's audit caught that `ratio` is called with zero args — that's the most visible bug to fix.
- Test coverage: extend `mathGenerator.test.ts` with a "difficulty discrimination" test per topic — generate 200 problems at d=1 and 200 at d=5, assert the *distribution of answer magnitudes* (or operand counts, or term counts) differs measurably. This is the regression test that prevents future "flat curve" bugs.
- The `hardMode` "qualitative change" implementations (e.g., expressions instead of numbers in `compare`, properties instead of recognition in `shapes`) are larger code changes. Implement these *after* the numeric-range fixes — incremental shipping.

---

## What's out of scope for this spec

- The Tricks/Magic curriculum has its own levels (1-5) and a separate file (`mathTricks.ts`). Not touched here.
- Daily challenge / speedrun / challenge / ghost meta-modes use these underlying types; their difficulty is set by the meta-mode logic, not by the user. They get the upgrades for free.
- UI changes (showing the user their difficulty level, or letting them manually set it) — current model is auto-adapt, that's fine, leave it alone.
