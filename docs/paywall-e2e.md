# Paywall flow — manual e2e regression checklist

This is the visual end-to-end regression for the 7-day demo → paywall
→ unlock flow. Run it before any release that touches:

- `useEntitlement`, the trial clock
- `shouldFirePaywall` or the App.tsx trigger useEffect
- `Paywall.tsx`, `TrialModals.tsx`, `TrialCountdownChip`
- Airwallex payment / webhook (or Google Play Billing)
- Anything in `entitlements/{uid}` Firestore writes

The unit + integration tests in `src/tests/paywallTrigger.test.ts` and
`src/tests/entitlement.test.ts` catch logic regressions. **This list
catches visual + state-flow regressions** that can't be unit-tested:
modals layering correctly, dev controls present, mock grants closing
the paywall, etc.

Trial length is `TRIAL_DAYS` in `utils/entitlement.ts` (currently **7**).
Copy strings live in the i18n catalogs (`src/i18n/*`), not hardcoded.

## Prerequisites

- A dev build running locally (`npm run dev`)
- Or a preview URL for the branch you want to test

The DEV-only mock helpers (`mockBackdateTrial`, `mockGrantAccess`) are
gated by `import.meta.env.DEV` and only work on `npm run dev` / preview
builds — they no-op in production.

---

## Section 1 — Fresh-install trial flow

1. ☐ Open in a private/incognito tab (clean state)
2. ☐ Welcome modal appears within ~600ms of app load
3. ☐ Welcome modal copy says **"7 days free — all topics and modes"** and
   **"Daily Challenge is always free"** (regression for the
   daily-free-forever decision)
4. ☐ Tap "Let's go" — modal dismisses, doesn't reappear on refresh
5. ☐ Navigate to Me tab — trial countdown chip shows "7 days left in trial"
6. ☐ Play a problem (any topic) — first-steps achievement unlocks
   IMMEDIATELY (regression for the in-session achievement fix)

## Section 2 — Day 4 midpoint reminder

7. ☐ Use the console snippet below to force trial to Day 4 (`daysAgo = 4`)
8. ☐ Navigate to a non-game tab (League / Me) — the midpoint reminder fires
   with copy **"Halfway through your trial"**
9. ☐ Reminder NEVER fires mid-session (regression for the
   never-interrupt-mid-play decision):
   - Backdate to 4 while on the game tab with totalAnswered > 0
   - Confirm the modal does NOT appear
   - Switch tabs — modal NOW appears

## Section 3 — Day 6 reminder (1 day left)

10. ☐ Backdate to Day 6 — reminder shows urgent copy **"1 day left in your trial"**
11. ☐ Same session-start gating verified (no mid-play interruption)
12. ☐ Reminder body mentions the Daily Challenge stays free

## Section 4 — Paywall (value-anchored fire)

13. ☐ Backdate to Day 7 → status is now 'expired'
14. ☐ Open app — paywall does NOT auto-fire (correct — value-anchored, not on-open)
15. ☐ Start a multiply session
16. ☐ Answer one problem
17. ☐ Paywall opens AFTER the problem completes
18. ☐ Paywall headline reads **"One week of Math Challenge"**, sub-line **"Here's what you built."**
19. ☐ User's own stats are visible (totalSolved, bestStreak, dayStreak, achievementCount)
20. ☐ Price phrase: "Want to keep going? Everything stays unlocked for $3.14. One time."
    (NOT "$3.14 keeps your progress forever" — regression for the
    forbidden phrasing rule)
21. ☐ "The Daily Challenge is always free." line is present (EXPIRED gate only)
22. ☐ Legal footer row visible: **Privacy · Terms** (Refund is NOT in the
    row — it lives inside the Terms; regression for the 2026-07-16 change)

## Section 5 — Daily exemption (the most important regression check)

23. ☐ Still expired. Tap "Maybe later" to close paywall (closes the app
    or navigates to about:blank — that's correct behavior)
24. ☐ Reopen app → tap the Daily Challenge button → play a daily problem
25. ☐ Paywall does NOT fire — confirms `shouldFirePaywall` exempts
    `questionType === 'daily'`
26. ☐ Complete the full daily — paywall STILL doesn't fire at session end

## Section 6 — Unlock flow (DEV mock)

27. ☐ Trigger paywall again (non-daily session, problem #1)
28. ☐ Tap "Keep playing"
29. ☐ In dev: button text changes to "Just a sec…" briefly, paywall closes
30. ☐ Status now resolves to 'paid' — countdown chip in Me tab disappears
31. ☐ Subsequent non-daily sessions never re-fire the paywall
32. ☐ The Pro set (advanced modes, full Magic Tricks, Pro cosmetics) is now
    unlocked; free-tier cosmetics gating is gone

## Section 7 — Pro upsell (early conversion)

33. ☐ During an ACTIVE trial, tap a locked Pro thing (a Hard/Timed toggle,
    a locked Magic Trick, a Pro chalk color)
34. ☐ Paywall opens in `mode='pro'`: headline "Unlock everything", the
    feature list, price line "One-time purchase of $3.14."
35. ☐ Pro mode has NO legal row, NO "Daily Challenge is always free" line,
    NO "Lifetime access" subline (those are EXPIRED-gate only)
36. ☐ "Maybe later" DISMISSES (doesn't close the app) in pro mode

## Section 8 — Legal pages

37. ☐ Tap a legal link (Privacy/Terms) in the paywall or Settings
38. ☐ Page renders WITHOUT any draft banner (legal went live 2026-07-15)
39. ☐ Refund policy is reachable via the link inside the Terms
40. ☐ Back returns to the app at /

---

## Helper: console snippet to backdate trial

```js
// Run in browser console while signed in.
import('firebase/firestore').then(async (fs) => {
  const { db } = await import('./src/utils/firebase');
  const auth = (await import('firebase/auth')).getAuth();
  const uid = auth.currentUser?.uid;
  if (!uid) return console.error('no uid');
  const daysAgo = 4; // change to 6 (1-day reminder) or 7 (expired)
  await fs.setDoc(
    fs.doc(db, 'entitlements', uid),
    {
      trialStartedAt: Date.now() - daysAgo * 86400000,
      paidAt: null,
      source: null,
      originalTransactionId: null,
      updatedAt: fs.serverTimestamp(),
    },
    { merge: true }
  );
  console.log(`Trial backdated to day ${daysAgo}. Refresh.`);
});
```

There's also a `[dev] reset trial` button on the Paywall in dev builds
once it's showing.

---

## When this runbook gets out of date

If `TRIAL_DAYS` or the reminder thresholds change, update the day numbers
here to match. Copy strings are in the i18n catalogs — verify against
those, not against this doc's quoted text. The unit test in
`paywallTrigger.test.ts` is the source-of-truth for the *logic*; this doc
is the source-of-truth for the *visual flow*.
