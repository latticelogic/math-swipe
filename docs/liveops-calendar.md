# LiveOps / Promotional Content calendar — DRAFT for owner review

Play's Promotional Content (Grow → Store presence) lets us submit time-bound
cards Google *may* feature on the store listing, Play home, the Events tab, and
re-engagement notifications. Free promo real estate that drives **installs** (new
users see an app that's alive) and **engagement** (pulls lapsed users back).

**Status:** proposal only — nothing submitted. Owner reviews + approves before
anything goes live. Cards likely can't be submitted until the app is **published**
(post the 2007 launch review). Google reviews every card (needs quality image +
copy + a real event + a working deep link).

---

## Guardrails (read before "Offers")

- **NO price discounts. Ever.** $3.14 lifetime is a firm positioning statement,
  not a revenue knob (monetization_model). So the **"Offers" card type — which is
  built for discounts — is essentially off the table.** We do NOT run "50% off"
  or sale cards. See "Offers" section for the one narrow, non-price alternative
  (owner decision).
- **Tone bar applies to card copy too:** warm, restrained, specific. Never hype,
  never childish, no emoji in copy (Play cards allow an image; keep text clean).
- **Cadence, not saturation:** aim for ~1–2 *active* cards at a time. A steady
  drumbeat reads as "alive"; a wall of cards reads as spam and Google may throttle.
- **Every card needs a deep link.** We have `?daily=1` (Daily) today. Topic-/trick-
  specific cards need a deep-link target built first (see "Deep-link gaps").

---

## The three card types — how we use each

| Type | Our use | Frequency |
|---|---|---|
| **Event** | The workhorse. Time-bound in-app moments: seasonal tentpoles, topic weeks, streak sprints, leaderboard cups, Daily spotlight. | ~1 always-on + 1–2 seasonal/quarter |
| **Major update** | Milestone-driven: launch, localization, new topics/teachers/tricks/modes, iOS. Announce real drops. | As they ship |
| **Offer** | **Constrained** — no price discounts. Skip by default. One non-price idea flagged below for owner call. | Rare / never |

---

## A. Always-on recurring engine (evergreen — set up once, rotate)

These don't need seasonal timing; they keep the store presence alive between
tentpoles.

1. **Daily Challenge spotlight** *(Event, recurring)* — "Today's Daily is live."
   Points at `?daily=1`. The Daily is genuinely fresh every day → the most honest
   "timely content" we have, and it's free-forever so it converts browsers into
   players with zero risk. Rotate the card copy weekly so it doesn't stale.
2. **Topic weeks** *(Event, rotating)* — a 7-day spotlight on one category:
   *Times-Tables Week*, *Fractions Fortnight*, *Percentages Week*,
   *Powers & Primes Week*, *Negative-Numbers Week*. Educational hook, evergreen,
   endlessly rotatable across the 35 topics. **Needs a topic deep link** (gap).
3. **Weekend Speedrun Cup** *(Event, weekly)* — Fri–Sun leaderboard push using the
   existing League + Speedrun. Competitive re-engagement. Deep link to League/Speedrun (gap).
4. **Streak Sprint** *(Event, periodic)* — "Start a 7-day streak this week." Leans
   on the mature streak+shield system. Retention-focused.

---

## B. Seasonal tentpoles (rolling 12-month calendar from launch)

Launch is ~Aug 2026, so **Back-to-School is our first and best tentpole** — great
timing. **Pi Day is the flagship** (a math app priced at **$3.14** on **March 14** —
the branding writes itself).

| Window | Tentpole | Type | Hook / angle | Deep link |
|---|---|---|---|---|
| **Aug–Sep 2026** | **Back-to-School** | Event | The big one for a math app — kids + parents returning to school; "get sharp for the new year." Themed Daily sets. | `?daily=1` |
| Oct 2026 | Halloween | Event | Light seasonal skin on the Daily; "spooky-fast mental math." Keep restrained. | `?daily=1` |
| Nov 2026 | "Sharpen up" / Diwali-adjacent | Event | Low-key focus event; regionally, Diwali resonates in the India market (we ship Hindi). | `?daily=1` |
| Dec 2026 | Holiday streak | Event | "Keep your streak alive over the break" — retention when routines break (streak-shields shine here). | `?daily=1` |
| **Jan 2027** | **New Year — "A sharper mind"** | Event | Resolution energy; strongest *install* window of the year for self-improvement apps. | `?daily=1` |
| Feb 2027 | (skip or minor) | — | Nothing forced. | — |
| **Mar 14 2027** | **★ Pi Day ★ (FLAGSHIP)** | Event + Major update | On-brand tentpole: math + **$3.14** + Pi Day. A themed Pi-Day Daily, a special Pi-Day trail/skin (earned, not sold), and a press/social moment. Plan this one properly. | `?daily=1` |
| Apr–May 2027 | Exam-season focus | Event | "Ten minutes a day before exams" — utility angle for students. | `?daily=1` |
| **Jun–Aug 2027** | **Beat the Summer Slide** | Event (multi-week) | Powerful, evidence-based hook: kids lose math skills over summer. Parents actively search this. Recurring weekly cards. | `?daily=1` |

---

## C. Major-updates queue (announce real drops — never fake them)

| When | Update | Card angle |
|---|---|---|
| At publish | **"Math Challenge is live"** | Launch card — the app going public. |
| Post-launch | **"Now in 12 languages"** | Once the staged localized listings ship — real, and signals reach. |
| As shipped | New topics / teachers / Magic Tricks / modes | Each genuine content drop = a card. We have a deep backlog of surfaces. |
| Later | **iOS launch** | When Apple clears (enrollment in flight). |
| Later | Play Games / achievements (if PGS built) | The deferred PGS bet, if pursued. |

---

## D. "Offers" — the constrained type (owner decision)

Price discounts are **out** (firm $3.14). The only non-price "offer" that fits the
model, and it's a genuine owner call, not a default:

- **A limited-time *earned* cosmetic** tied to an event (e.g., a **Pi-Day trail**
  you *unlock by playing* during the window — not bought). It's an "offer" in the
  sense of limited-time availability, with zero price movement. Touches the
  cosmetics system + the Pro/free split, so **flag to owner before building.**
- Everything else in the "Offers" bucket (discounts, sales, bundle deals) — **no.**

---

## E. Deep-link targets — BUILT (#208)

The card deep links now exist (mirroring `?daily=1`):
- `?topic=<id>` → start the game on a specific category (Topic Weeks).
- `?trick=<id>` → open the Magic tab + that trick's lesson (if unlocked).
- `?league=1` → open the League tab (Cups).
- `?magic=1` → open the Magic tab.
Category ids: `mathCategories.ts` (QUESTION_TYPES); trick ids: `mathTricks.ts`
(MAGIC_TRICKS). All are stripped from the URL on arrival. No remaining
deep-link blocker for the planned cards. (A `?speedrun=1` entry is the one not
yet wired — add it if a Speedrun Cup card needs it.)

---

## F. Per-card submission template

Each Promotional Content card needs:
- **Type** — Event / Major update / (Offer: n/a)
- **Title** (short, warm, specific — no emoji)
- **Description** (1–2 lines, value-anchored)
- **Image** — high-quality, on-brand chalkboard aesthetic (design task; reuse
  store-assets/ style). Google rejects low-quality/placeholder art.
- **Start / end dates** (events are time-bound; keep windows honest)
- **Deep link** (must resolve to the promoted content)
- **Priority markets / languages** (we have 12 localized — localize card copy for
  tentpoles in the big markets)
- **Measurement** — which funnel metric this should move (installs, D1 return,
  Daily completion), read from `/admin/funnel` + Play install stats.

---

## G. Measurement

Tie every card to a metric before submitting; read results after:
- **Installs / store conversion** — Play Console → Store performance (per source).
- **Engagement / return** — `/admin/funnel` (open→play→paywall→purchase + retention proxy).
- **Daily completion** — funnel + `stats.lastDailyDate`.
- **Conversion** — `/admin/billing` (trial→paid %). A card should never *hurt* this.
Kill cards that don't move a metric; double down on the ones that do (log in growth.md).

---

## Log

- **2026-07-23** — Draft created for owner review. Nothing submitted. Flagship =
  Pi Day (Mar 14, $3.14 tie-in); first live tentpole = Back-to-School (Aug–Sep 2026).
  Blocked on: app published + deep-link params for non-Daily cards.
