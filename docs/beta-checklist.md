# Beta test checklist

A pre-launch shakeout with real people. The goal isn't a bug hunt — it's
answering three questions: **Do they get it in 5 seconds? Is it fun? Would they
come back tomorrow?**

## The setup

- **URL:** https://math-swipe-c7k.pages.dev — the live production site, fully
  deployed. No install needed (it's a PWA; testers can "Add to Home Screen").
- **Testers:** 5–10 people. Weight toward the **target age (8–14)** — get a few
  actual kids in that band — plus 2–3 adults (including a parent).
- **Devices:** cover **iOS Safari**, **Android Chrome**, and desktop. The core
  interaction is a mobile swipe, so phones matter most.
- **Duration:** a few days of casual use beats one long session — you want to see
  if they *return*.

## What works in the beta (test all of it)

- First open → the welcome modal → first problem within a second or two.
- **Swipe to answer** (the core feel) — left/right/down, on a real phone.
- Difficulty adapting to speed; streaks; the milestone celebrations (3/5/10/25/50).
- **Daily Challenge** (free forever) and its share card.
- **Magic tricks** — lessons + practice.
- Achievements unlocking; the teacher personalities; the **streak garden** + number fun-facts (new).
- **Me tab:** stats, cosmetics, sign-in (Google / email magic-link), cross-device carry after sign-in.
- **League** leaderboard; **share** to a friend.
- Notifications opt-in (soft daily reminder).

## What is NOT live yet (tell testers)

- **Payments.** No one can buy anything during the beta. The 14-day trial gives
  full access, so testers won't hit the paywall in a short beta anyway — but if
  someone's trial expires, the "unlock" button won't complete a purchase. That's
  expected; Airwallex isn't activated yet.
- App Check enforcement (invisible either way).

## What to watch for

- **Comprehension:** does an 8-year-old figure out the swipe with no explanation?
- **First-paint speed** on a mid-range Android on cellular.
- **Swipe feel** — any lag, mis-registered swipes, or jank during timed/speedrun.
- **Tone** — does it read warm and un-childish, never pressure-y? (That's the bar.)
- Anything confusing, annoying, or that made them stop.
- Crashes / blank screens / stuck loading — grab the device + browser if so.

## Questions to ask each tester

Kids:
1. Did you know what to do right away?
2. Was it fun? What was the best part?
3. Would you play again tomorrow?
4. What would make it better?

Parents / adults:
1. Would you let your kid use this?
2. Is anything unclear or uncomfortable?
3. Would **$3.14, one time** feel fair to unlock everything after two weeks?

## Collecting feedback

Pick one low-friction channel and put it here before you send the link:

- [ ] A group chat (WhatsApp / Telegram) — easiest for quick reactions + screenshots.
- [ ] A short form (Google Form) — better for structured answers to the questions above.
- [ ] Email to `help@latticelogic.app` (this also verifies the support address works — see launch item #9).

## After the beta

Triage into: **fix-before-launch** (crashes, comprehension blockers, broken on a
common device) vs **post-launch polish** (nice-to-haves). Keep the list short and
ruthless — ship when the core loop is clean on the common phones.
