# Growth — ideation & tracking

Living doc for growth ideas, priorities, and experiment results. Add freely;
move items between **Backlog → Building → Live → Learned**. Keep the experiment
table honest (record losers too — a killed variant is a real result).

## The frame (read first)

**The app's in-product growth mechanics are already mature** (verified 2026-07-23):
retention (day-streak + earned shields + comeback-courtesy + Daily loop + push),
virality (double-sided referral + share-after-every-session), and conversion
(value-anchored 7-day-trial → $3.14 paywall) are all thoughtfully built. So the
bottleneck is **traffic, then data-driven tuning** — not missing features.

Instrumentation is done: `/admin/funnel` (open→play→paywall→purchase + retention),
`experimentExposures` (A/B), `funnel/{uid}`. We can measure the moment traffic lands.

### Priority order (why this sequence)

Pre-traffic, build where traffic isn't required; save traffic-hungry optimization
for when there's traffic.

1. **Acquisition / discoverability** — the multiplier on everything; fully
   controllable now. *Foundation is solid* (strong listing copy + complete
   graphics incl. tablet). Remaining is mostly non-code (see backlog).
2. **Retention** — don't amplify into a leaky bucket; also a Play ranking/featuring
   signal that loops back to acquisition. *Mechanics are mature.*
3. **Virality** — amplifies acquisition, but only once retention holds. *Built.*
4. **Conversion (trial→paid)** — fundamentals built; the *optimization* is A/B,
   which needs install volume to read. Arm it now so it learns from day-1 traffic.

## Near-term to-dos

- [ ] **Arm the A/B engine** — wire + activate the first conversion experiment
      (`paywall-cta`, below) so day-1 traffic starts teaching us. *(Building)*
- [ ] **Submit the 11 staged localized store listings** — machine-translated,
      applied, waiting; submit AFTER the 2007 launch review clears (submitting now
      restarts the review). See `native_pivot_and_growth` memory.
- [ ] **Promo video** (store listing) — none set; a good 15–30s video lifts install
      conversion. Design/production task, not code.
- [ ] **Play Games reach decision** — the deferred PGS/Sidekick bet (Play Games
      incl. PC discovery). See `docs/next-app-playbook.md` §PGS / deferred memory.

## Experiment tracker

Registry lives in `src/utils/experiments.ts` (deterministic per-uid assignment,
`active` kill-switch, exposures → `experimentExposures`; join to conversions
server-side). Consume with `useExperiment(id, uid)` and branch.

| id | hypothesis | variants | status | result |
|---|---|---|---|---|
| `paywall-cta` | A more explicit "unlock the full game" CTA converts better than the soft "Keep playing" at the post-trial wall | `control` = "Keep playing" · `bold` = "Unlock the full game" | **Building** (wiring Paywall + i18n, then `active:true`) | — |

### Experiment discipline
- One variable per test; keep the control honest.
- Respect the copy rules (CLAUDE.md): value-anchored, never pair the $3.14 price
  with a possession-threat, warm/restrained tone.
- Don't call a result on noise — wait for meaningful install volume.
- Record losers here; a killed variant is signal.

## Ideation backlog (unprioritised — pull into experiments/build as traffic informs)

**Acquisition**
- **Promotional Content / LiveOps** (Grow → Store presence) — free Play promo
  surface for time-bound cards (Events / Offers / Major updates) that Google may
  feature on the listing, Play home, Events tab + re-engagement notifs. Strong
  fit: the **Daily Challenge** is naturally-fresh daily content + we already have
  the `?daily=1` deep link; major-update cards map to launch/feature moments.
  Likely unlocks only once the app is **published** (post-2007 review). Recurring
  content-ops (needs a card image + copy per event; Google reviews each). Also a
  retention lever (pulls lapsed users back). *Activate once live.* Detailed
  calendar drafted for owner review: **`docs/liveops-calendar.md`**.
- Localized listings (staged) → measure per-market install-conversion lift.
- Promo video; refreshed screenshots that show the *swipe* + streak moment.
- ASO keyword pass on the full description (times tables, multiplication, mental
  math, math practice, kids math…).
- Web → app: the PWA at mathchallenge.app cross-promoting the Android app.

**Retention**
- Win-back push for deeper lapse (3–7 days), distinct from the 18h daily reminder.
- Surface the streak-shield/comeback mechanic more visibly (it's a strong hook
  users may not notice).
- "Return day" tiny reward.

**Virality**
- Make the share text carry the *referee* incentive (+3 trial days) explicitly —
  a reason for the recipient to tap, not just a flex.
- Share-artifact quality (currently copy-pasteable headline + grid + ?r= link).

**Conversion**
- Trial-reminder timing/framing (day-4/6 cadence vs earlier/value-led).
- Pro-lock upsell framing ("unlock everything" vs benefit-led/social-proof).
- Paywall headline / value-anchor variants (lead with the player's own numbers).

## Log

- **2026-07-23** — Doc created. App submitted to production review (build 2007, all
  177 markets). Growth framing + order set; `paywall-cta` chosen as the first A/B.
