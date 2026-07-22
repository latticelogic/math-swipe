# Apple Developer Program enrollment — runbook

**Type:** runbook · **Status:** Active (enrollment pulled forward 2026-07-22)

Goal of THIS doc: get **Lattice Logic Pte. Ltd.** enrolled in the Apple
Developer Program as an *organization*, so the 1–3 week verification clock
starts now and runs in parallel with the Google Play launch. The iOS *build*
is a later step — this is only about opening the account.

## Why now (not "Apple last")

The old standing rule was "Apple last, after 60+ days of clean web revenue."
That was pulled forward on 2026-07-22 for one reason: **copycat risk**. If we
list on Google Play and the web but leave the App Store empty, we hand a clone
the entire iOS shelf under a near-identical name. Enrollment costs nothing but
time and $99, verification takes weeks, and it blocks nothing else — so start
the clock now, ship Play first, and follow with the iOS shell weeks later to
shut the window. See `memory/apple_enrollment_pulled_forward.md`.

## What enrollment requires (organization account)

Apple org enrollment is stricter than individual — it verifies the legal
entity, not just a person. Have these ready before you start:

| Requirement | Our value / where it is | Notes |
|---|---|---|
| Apple Account (formerly Apple ID) | Create/use `tim@latticelogic.app` | Use the **company** Workspace address, never Tim's personal. Turn on 2FA first — Apple requires it. |
| Legal entity name | **Lattice Logic Pte. Ltd.** | Must match the D-U-N-S record and ACRA registration *exactly*. |
| D-U-N-S number | Already held (company has DUNS) | Look it up at Apple's D-U-N-S lookup tool to confirm the name/address Apple sees matches ACRA. Fix mismatches with D&B *before* applying — this is the #1 delay cause. |
| Legal entity address + phone | Company registered address (Singapore) | Apple may call this number to verify. It must be a real line someone answers. |
| Website | `https://mathchallenge.app` | Must be live and resolve to a real company/product site. Ours is. |
| Legal authority to bind | Tim must be a person who can sign contracts for Lattice Logic, or have documented authority | Apple asks this explicitly. As director/owner this is fine. |
| Payment | $99/yr USD card | Company card. |

### D-U-N-S first — the pre-flight check that avoids the multi-week stall

Before touching Apple's form, verify the D-U-N-S record:

1. Go to Apple's D-U-N-S lookup (linked from the enrollment page).
2. Enter **Lattice Logic Pte. Ltd.** + Singapore.
3. Confirm the returned **legal name, address, and phone** match ACRA exactly.
   - Any mismatch (old address, "Pte Ltd" vs "Pte. Ltd.", etc.) → request an
     update with Dun & Bradstreet. D&B updates take **5–10 business days** and
     Apple will reject/hold the application until they agree. Doing this first
     is the single biggest time-saver.

## Enrollment steps

CLI note: there is **no CLI path** for enrollment — it is a web + identity-
verification flow by design (Apple is verifying a legal entity). This is one of
the explicitly-called-out browser-only exceptions to the CLI-first convention.

1. **Sign in / create the company Apple Account** at <https://developer.apple.com>
   using `tim@latticelogic.app`. Enable 2FA.
2. Open **Enroll** → choose **"Company / Organization"** (NOT "Individual" —
   individual can't do org-owned apps or hand off to teammates, and switching
   later is painful).
3. Enter the entity details above. The D-U-N-S name must match to the character.
4. Confirm you have legal authority to bind the entity.
5. Pay the $99. Submit.
6. **Verification:** Apple reviews, and often **phones the entity's listed
   number** to confirm the applicant's authority. Expect **1–3 weeks**;
   answer the phone. Keep an eye on `tim@latticelogic.app` for follow-ups.

## After enrollment clears (later — not part of "start the clock")

This is the iOS *build* work, deliberately deferred until Play is stable. Listed
here so the runbook is complete, not as a now-task.

- **iOS shell** — same thin-wrapper approach as the TWA: wrap the live PWA in a
  `WKWebView` (via a small native shell or PWABuilder's iOS package). The web
  app is the product; the shell is chrome.
- **Universal Links** — ship an **`apple-app-site-association`** file at
  `/.well-known/` (the iOS analogue of our `assetlinks.json`) so links open the
  app. Same Cloudflare Pages `public/.well-known/` mechanism we already use.
- **Payments** — Apple forbids external billing *inside* the app, same as Play.
  Two options, pick per policy climate at build time:
  1. **StoreKit IAP** for the $3.14 unlock → verify server-side → write
     `source:'apple'` on the source-agnostic entitlement, mirroring
     `verifyPlayPurchase`. Simplest, always-allowed. Costs Apple's 15% (Small
     Business Program, which we qualify for under $1M/yr) or 30%.
  2. **External-purchase-link entitlement** (region-gated, post-DMA / US
     court-ordered) — link out to Airwallex and dodge the rake where Apple is
     forced to allow it. More complex, region-limited; revisit at build time.
- **Entitlement already source-agnostic** — `source: 'airwallex' | 'apple' |
  'google' | 'promo'` exists today, so buying on any channel unlocks all others
  on sign-in. No client gate change needed for iOS.
- **Review nuances** — Apple review is stricter than Play about "just a website
  in a wrapper." Mitigate by leaning on the PWA's native-feeling UX (offline,
  installable, real interactions) and making sure IAP works in the sandbox.

## Adjacent: trademark (the cleaner anti-clone remedy)

Enrollment occupies the iOS shelf; a **trademark on "Math Challenge"**
(Lattice Logic Pte. Ltd., via Singapore IPOS, and consider US USPTO) is the
legal lever to take down a same-name clone on either store. Cheaper than a
dispute after the fact. Business call, not a code task — flagged for the owner.

## Status / next action

- [ ] Verify D-U-N-S record matches ACRA (do this FIRST)
- [ ] Enable 2FA on `tim@latticelogic.app` Apple Account
- [ ] Submit organization enrollment ($99)
- [ ] Answer Apple's verification call
- [ ] (later) iOS shell build + `apple-app-site-association` + StoreKit IAP
- [ ] (business) trademark "Math Challenge"

Enrollment is owner-driven (identity verification can't be automated). The
build steps re-enter the normal dev flow once the account is live.
