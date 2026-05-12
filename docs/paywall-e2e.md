# Paywall flow — manual e2e regression checklist

This is the visual end-to-end regression for the 14-day demo → paywall
→ unlock flow. Run it before any release that touches:

- `useEntitlement`, the trial clock
- `shouldFirePaywall` or the App.tsx trigger useEffect
- `Paywall.tsx`, `TrialModals.tsx`, `TrialCountdownChip`
- Stripe Checkout / webhook
- Anything in `entitlements/{uid}` Firestore writes

The unit + integration tests in `src/tests/paywallTrigger.test.ts` and
`src/tests/entitlement.test.ts` catch logic regressions. **This list
catches visual + state-flow regressions** that can't be unit-tested:
modals layering correctly, dev controls present, mock grants closing
the paywall, etc.

## Prerequisites

- A dev build running locally (`npm run dev`)
- Or a preview URL for the branch you want to test

The DEV-only mock helpers (`mockBackdateTrial`, `mockGrantAccess`) are
gated by `import.meta.env.DEV` and only work on `npm run dev` / preview
builds — they no-op in production. So this checklist requires a dev or
preview deploy, not production.

---

## Section 1 — Fresh-install trial flow

1. ☐ Open in a private/incognito tab (clean state)
2. ☐ Welcome modal appears within ~600ms of app load
3. ☐ Welcome modal copy says **"Free for 14 days"** and mentions
   **"The Daily Challenge is always free"** (regression for the
   daily-free-forever decision)
4. ☐ Tap "Got it" — modal dismisses, doesn't reappear on refresh
5. ☐ Navigate to Me tab — trial countdown chip shows "14 days left in trial"
6. ☐ Play a problem (any topic) — first-steps achievement unlocks
   IMMEDIATELY (regression for the in-session achievement fix)

## Section 2 — Day 7 midpoint

7. ☐ Open browser console, run a paste of the snippet at the bottom of
   this file to force trial to Day 7 (via `mockBackdateTrial`)
8. ☐ Navigate to a non-game tab (League / Me) — Day 7 reminder fires
   with copy **"You're a week in"**
9. ☐ Reminder NEVER fires mid-session (regression for the
   never-interrupt-mid-play decision) — tested by:
   - Backdate to 7 while on game tab with totalAnswered > 0
   - Confirm modal does NOT appear
   - Switch tabs — modal NOW appears

## Section 3 — Day 10 and Day 13 reminders

10. ☐ Backdate to Day 10 — reminder fires with **"4 days left in your trial"**
11. ☐ Same session-start gating verified (no mid-play interruption)
12. ☐ Backdate to Day 13 — reminder shows urgent copy **"1 day left"**
13. ☐ Day-13 reminder mentions **"The Daily Challenge stays free"**

## Section 4 — Paywall (value-anchored fire)

14. ☐ Backdate to Day 14 → status is now 'expired'
15. ☐ Open app — paywall does NOT auto-fire (this is correct — value-anchored, not on-open)
16. ☐ Start a multiply session
17. ☐ Answer one problem
18. ☐ Paywall opens AFTER the problem completes
19. ☐ Paywall headline reads **"Two weeks of Math Swipe"**, sub-line **"Here's what you built"**
20. ☐ User's own stats are visible (totalSolved, bestStreak, dayStreak, achievementCount)
21. ☐ Price phrase: "Want to keep going? Everything stays unlocked for $3.14"
    (NOT "$3.14 keeps your progress forever" — regression for the
    forbidden phrasing rule)
22. ☐ "The Daily Challenge is always free." line is present
23. ☐ Legal footer row visible: **Refund · Privacy · Terms**

## Section 5 — Daily exemption (the most important regression check)

24. ☐ Still expired. Tap "Maybe later" to close paywall (closes the app
    or navigates to about:blank — that's correct behavior)
25. ☐ Reopen app
26. ☐ Tap the Daily Challenge button
27. ☐ Play a daily problem
28. ☐ Paywall does NOT fire — this confirms `shouldFirePaywall` exempts
    `questionType === 'daily'` correctly
29. ☐ Complete the full daily — paywall STILL doesn't fire at session end

## Section 6 — Unlock flow (DEV mock)

30. ☐ Trigger paywall again (non-daily session, problem #1)
31. ☐ Tap "Keep playing"
32. ☐ In dev: button text changes to "Just a sec…" briefly, paywall closes
33. ☐ Status now resolves to 'paid' — countdown chip in Me tab disappears
34. ☐ Subsequent non-daily sessions never re-fire the paywall

## Section 7 — Legal pages

35. ☐ Tap any legal link in paywall or Me tab footer
36. ☐ Page renders with **yellow "DRAFT" banner** at top (regression
    for the legal-pages-are-drafts memory note)
37. ☐ Back button returns to the app at /
38. ☐ Inter-doc footer row navigates correctly

---

## Helper: console snippet to backdate trial

```js
// Run in browser console while signed in. The hook reads via
// useEntitlement; calling its DEV mock writes to Firestore.
// Find the active entitlement state by inspecting React DevTools
// → look for the `entitlement` object on the App component.
//
// Or: simpler — write directly to Firestore via the SDK in console:
import('firebase/firestore').then(async (fs) => {
  const { db } = await import('./src/utils/firebase');
  const auth = (await import('firebase/auth')).getAuth();
  const uid = auth.currentUser?.uid;
  if (!uid) return console.error('no uid');
  const daysAgo = 7; // change to 10, 13, 14
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

For the simplest version: open the Me tab in dev, scroll to the bottom,
and there'll be a `[dev] reset trial` button on the Paywall component
when it's already showing. Otherwise, the console-snippet method is the
fallback.

---

## When this runbook gets out of date

If the user-facing copy changes (eg you decide "Two weeks of Math Swipe"
should become "Your trial is up"), update steps 18-22 to match. The
unit test in `paywallTrigger.test.ts` is the source-of-truth for the
*logic*; this doc is the source-of-truth for the *visual flow*.
