# Content audit — 2026-05-12

## Headline finding

The **app voice is inconsistent across surfaces**: the "warm, restrained, no-pressure" tone from the polish pass is intact in teacher base messages and achievements, but **teacher distinctness is thin — most share bland success praise** — and **Magic Tricks lessons skip instructional insight in key places**, leaving kids understanding the *formula* but not the *why*. The highest-leverage focus is Surface 2 (Magic Tricks curriculum): clear wins in teaching quality will carry learners through the unlock journey and build confidence in the app's claim to teach *mental-math thinking*.

---

## Surface 1 — Teacher voice

### Strengths to preserve

- **Base pool restraint**: `BASE_IDLE`, `BASE_SUCCESS`, `BASE_FAIL` in `chalkMessages.ts` avoid cliché pressure. Removed aggressive "Let's gooo! 🚀"; replaced with "Take your time 🌟"
- **Milestone copy has real warmth**: "TWENTY-FIVE?! Are you human?" (line 111) and "I'm impressed." (line 114) feel genuinely delighted without motivational-poster tone
- **Dr. Cipher's riddle-y voice** (cipher.tsx): "Brilliant deduction. 🕵️", "Case cracked. 🗝️", "Elementary. 🎩" — distinct in *how* praise is given, not just *that* praise is given
- **Nana's comfort voice** (nana.tsx): "Slow down, sweetheart. Read it again. 💗" and "Take a breath. You've got this." are warm and age-appropriate without infantilizing

### Gaps to fix

- **Emoji contradiction in base pools**: `chalkMessages.ts` still has emoji that contradict the "SVG/clean text only" polish directive:
  - Lines 36–40: "You got this! 💪", "Take your time 🌟", "Focus mode: ON 🎯", "Your brain is warming up 🔥", "Every problem is a win 🏅", "You're getting sharper! ✏️"
  - Lines 58–78: STREAK, HARD_MODE, TIMED_MODE arrays loaded with emoji
  - **Severity: P2** — undermines polish direction. Replace with clean text or SVG references.

- **Generic praise across teachers**: Success pools overlap significantly:
  - Sigma: "OBSESSED with that solve. 💯", "Goated math energy. ⭐", "You ATE that. No crumbs. 🍴"
  - Pixel: "YESSS. W. 🏆", "Big brain unlocked. 🧠✨", "That's a clip. Save it. 📹"
  - Mr. Chalk: "Brilliant! ⭐", "Beautiful work! 🎨", "Nailed it! ✅"
  - All use similar success intensity (exclamation + celebratory). Mr. Chalk should sound more thoughtful, less hype.
  - **Severity: P2** — dilutes personality differentiation.

- **Boss Robo voice contradicts tone**: Lines 95–100 use ALL CAPS: "OPTIMAL. +XP.", "EFFICIENCY: 100%.", "CHECKSUM PASSED." Reads clinical and high-pressure, not warm.
  - Expected: a data-lover *excited* about *your* stats, not a supervisor evaluating you.
  - **Severity: P1** — character voice misaligned with target tone.

### Teacher distinctness score

**4 / 10**

Eight teachers exist but only 3–4 are vocally distinct:
- **Distinct**: Dr. Cipher (riddle-speak), Nana (warmth), Lex the Fox (mischievous energy), Sigma (hype-coded)
- **Blurry**: Mr. Chalk, Pixel, Bess, Boss Robo — defaulting to "excite the player" rather than coherent character philosophy.

---

## Surface 2 — Magic Tricks curriculum

### Strengths to preserve

- **Difficulty curve is sensible**: Lv.1 (Square 5, Rule of 11) have 3–4 easy steps. Lv.5 (Cross-Multiplication, Golden Ratio) demand abstraction.
- **Lesson structure is clear**: Equation → Steps → Result. Examples well-chosen (65² for Square 5, "347 × 893" for Last Digit).
- **Math is sound**: Spot-checked 12+ tricks across difficulties. All formulas correct; no false conditions hiding.

### Gaps to fix

- **Missing "why" in 7+ lessons** (P1 issues):
  - **Divide by 5** (line 490): Says "Double it then drop a zero" but never explains why (because ÷5 = ×2÷10). Kid memorizes step, doesn't learn principle.
  - **Sum of Consecutive Odds** (line 140): "5 numbers... so 5² = 25" but doesn't explain insight that sum of first N odd numbers always equals N².
  - **Squares in the 50s** (line 412): "Add the last digit to 25: 25 + 4 = 29" — why 25? Why only 50s?

- **Lesson descriptions don't sell the insight** (P2–P3):
  - **Rule of 101** (line 314): "Multiply any 2-digit number by 101 instantly" is bland. Better: "Just repeat the number — no mental math!"
  - **Difference of Squares** (line 66): "Multiply numbers equally spaced from a round number" is jargon. Better: "Two numbers same distance from a friendly number (like 98×102 from 100)".

- **Cross-Multiplication is unscaffolded for young learners** (P2):
  - Lesson assumes kids can track "Left×Left, Right×Right, Cross products" all in working memory. No scaffolding for intermediate results.
  - Practice generates Lv.11–34 numbers (fine for Lv.5) but lesson steps don't teach *how* to work through it without paper.

### Lesson quality sample

**Strongest** (clear insight + strong pedagogy):
- "Squaring Ends in 5": 4 steps, each builds clearly. "Multiply by next number up" is the magic; isolation makes it obvious why.
- "Subtract from 1000": "All from 9 and last from 10" is Vedic, memorable. Step 3 sells it: "No borrowing!"
- "Sum of Consecutive Odds": Step 2 teaches a principle ("sum of first N odd numbers is always N²"), not just a trick.

**Weakest**:
- "Divide by 5": "Double it then drop a zero" with zero explanation.
- "Squares in the 50s": "Add the last digit to 25" unexplained. Reads like magic, not math.
- "Cross-Multiplication": Correct steps but require flawless mental arithmetic. No scaffolding.

---

## Surface 3 — Achievements

### Strengths to preserve

- **Naming is energetic**: "Sharpshooter" (90%+ accuracy) is more memorable than "Accuracy Master". "Unstoppable" (20× streak) is proud without pressure.
- **Descriptions restate thresholds but add tone**: "Get a 5× streak" vs. "Solve 100 problems" — language ("Get", "Solve") feels like invitation, not report.
- **Unlock curve makes sense**: First Steps → On Fire → Unstoppable → Century Club is clear progression.

### Gaps to fix

- **Emoji in hard-mode achievement names**: "Skull Initiate", "Skull Warrior", "Deathstreak" still use skull emoji despite polish direction.
  - **Severity: P2** — consistency issue.

- **"Math Machine" feels generic** (line 71): Desc just says "Solve 500 problems". Better: "Solve 500 problems (or 5000+ answers!)" to hint at *scale* the name implies.
  - **Severity: P3**

- **Timed mode achievements are thin**:
  - "Speed Demon" (1 session): Trivial unlock.
  - "Time Lord" (perfect timed session): Desc is pure restatement. Better: "Ace a full timed session without a single mistake."
  - **Severity: P3**

### Achievement sample

**Strongest** name + description:
- "Sharpshooter" + "90%+ accuracy (50+ solved)" — skill verb + clear bar
- "Unstoppable" + "Get a 20× streak" — name and threshold perfectly aligned
- "Flawless Victor" + "Perfect hard mode session" — flowery + clear unlock

**Weakest**:
- "Speed Demon" + "Complete 1 timed session" — trivial unlock, generic
- "All-Rounder" + "Solve 10+ of every type" — pure threshold restatement
- "Ascended" + "Complete 1 ultimate session" — grandiose name, trivial unlock

---

## Surface 4 — Empty states, coach copy, button labels

### Strengths to preserve

- **Share button copy is clean**: "Share", "Link copied!", "Couldn't share — try again" — restrained, no pressure.
- **Mode tooltips are state-aware**: "Timed: ON" vs. "Timed mode", "Hard: ON · bigger numbers" — informative without jargon.

### Gaps to fix

- **Login nudge uses emoji** (MePage.tsx, line 150): "☁️ Save your {XP} across devices" contradicts polish direction.
  - Replace with: "Save your {XP} across devices" or hand-drawn SVG callout.
  - **Severity: P2** — visible on every "Me" page for anonymous users.

- **Pencil emoji in username edit** (MePage.tsx, line 117): "✏️" next to edit button.
  - **Severity: P2**

- **Generic "Question type" tooltip** (ActionButtons.tsx, line 189): "Question type" is accurate but bland. Better: "Math topic" or "Switch topic".
  - **Severity: P3**

---

## Cross-cutting issues

1. **Emoji inconsistency is the single largest compliance issue**: Base pools and teacher voices still have 30+ emoji despite polish pass. Either remove all, or create emoji-free message sets.

2. **Teacher voice uniformity undermines character distinction**: 8 teachers sound interchangeable in core success/fail pools. Distinctness is in unlock criteria, not actual voice.

3. **Magic Tricks lessons lack progressive scaffolding**: Early tricks explain *why*. Mid-tier sometimes skip it. High-tier assume mastery. Kid jumping from "Sum of Consecutive Odds" to "Cross-Multiplication" hits a wall.

4. **Jargon in descriptions**: "Multiply numbers equally spaced from a round number" vs. "Two numbers the same distance from 100". Concrete beats abstract.

---

## Recommended single highest-leverage focus

**Surface 2 — Magic Tricks curriculum.**

**Reason**: 2–3 lessons missing the "insight" that makes them *magic*. Fixing this will:
1. Improve retention (understand *why* → remember for life vs. memorize → forget in a week)
2. Build confidence in app brand ("Learn mental-math *thinking*, not just tricks")
3. Direct ROI (5–10 lessons need 1–2 sentences of explanation; 42 total = 10–15 min writing)

### Sketch of "polish done":

- [ ] **Divide by 5, Divide by 25, Multiply by 25**: Add 1 step explaining the algebraic insight
- [ ] **Sum of Consecutive Odds, Squares in the 50s/40s**: Add principle statement ("Why? Because...")
- [ ] **Cross-Multiplication**: Add scaffolding step ("Write down each part: tens×tens...")
- [ ] **Descriptions (10–15 tricks)**: Replace abstract with concrete examples
- [ ] **Remove/replace emoji** in chalkMessages.ts base pools (lines 36–78, 30+ instances)
- [ ] **Boss Robo voice audit**: Soften ALL CAPS intensity to hype-without-pressure
- [ ] **Teacher success copy**: Mr. Chalk should reference *thinking* not just generic hype

**Estimated effort**: 3–4 hours | **Estimated impact**: 15–25% improvement in perceived educational quality

---

**Document generated**: 2026-05-12
**Audit scope**: chalkMessages.ts, mathTricks.ts, achievements.ts, mathAchievements.ts, 6 teacher files (chalk, sigma, pixel, cipher, lex, nana, robo), ActionButtons.tsx, MePage.tsx, mathMessages.ts
