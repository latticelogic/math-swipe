# Legal review brief — Math Swipe

A scoping packet for a **fixed-fee confirmation review** of the live Refund /
Privacy / Terms pages. The docs are already written against the app's *actual*
data practices and follow the structure below, so this is a "confirm-or-correct"
engagement, not drafting from scratch. (The docs are shipped as live consumer
terms; a one-off Singapore-counsel check is prudent given the kids-plus-payments
context.)

## The pages (live)

- Refund: https://mathchallenge.app/refund
- Privacy: https://mathchallenge.app/privacy
- Terms: https://mathchallenge.app/terms

Source of truth: `src/components/LegalPages.tsx` in the repo.

## The operator

- **Lattice Logic Pte. Ltd.**, incorporated in the **Republic of Singapore**,
  **UEN 202610912N** (incorporated 11 March 2026; a Live Company).
- Product: **Math Swipe**, a web-first mental-math game (PWA). One-time **US$3.14
  lifetime** purchase via Airwallex. **No subscription.**
- **Target audience: ages 8–14.** This is the crux of the children's-data
  questions below.

## What the app actually collects (data map)

Grounded in the codebase, not aspiration:

| Data | When | Notes |
|---|---|---|
| Anonymous account id (Firebase Auth uid) | On first open, automatically | Persistent identifier. **No** real name/email/phone required to play. |
| Display name | User types one (or a random one is assigned) | Shown on the public leaderboard. |
| Gameplay stats | During play | Problems solved, accuracy, streaks, achievements, mode prefs. |
| Google account link **(opt-in)** | Only if user signs in | To carry the account across devices. |
| Email address **(opt-in)** | Only if user uses email sign-in | Magic-link auth. |
| Push notification token **(opt-in)** | Only if user enables notifications | Soft, rate-limited reminders. |
| Airwallex customer / transaction id | Only on purchase | Payment processing + refunds. |

**We do NOT:** use ad-tech, tracking, fingerprinting, or third-party analytics
SDKs; sell or share data with advertisers; collect location, contacts, or any
data not listed above. Third parties that touch data: **Firebase** (Google —
auth/db/push), **Cloudflare** (hosting/edge), **Airwallex** (payments only).

## Decision A — children's data / COPPA stance (product decision made; confirm + finalise)

**Chosen stance:** a **mixed-audience model relying on the "support for internal
operations" basis** — persistent identifiers used solely to run the service, not
to profile or advertise — **NOT** a full verifiable-parental-consent (VPC) flow.
Opt-in features (email / Google link / push) to be **gated for under-13 users
where required.** This is viable *because* the app has no ad-tech and requires no
personal data to play.

**Market sequencing (important — this is the launch plan):** launch under
**Singapore PDPA first**, with **no age screen and no parental-notice friction**
at day one; add a neutral **US age-screen + parental notice** (and any under-13
opt-in gating) **only when we enter the US market**, since COPPA is triggered by
serving US under-13s regardless of where the operator is incorporated.

**Questions for counsel:**
1. Under **Singapore PDPA**, given no personal data is required to play, what is
   the minimum compliant notice for an 8–14 audience, and how should minors'
   consent be handled for the opt-in features?
2. Confirm the **COPPA** analysis: does the internal-operations basis hold for
   the anonymous-uid + stats core loop, and what exactly must we add on **US
   market entry** (age-screen design, parental notice, under-13 opt-in gating)?
3. Do **GDPR-K** (EU) or the **UK Children's Code** apply to any launch market
   we should plan for, and what would they add?
4. Is the market-sequencing approach sound given the app is a **globally
   reachable public URL** (i.e. the "knowingly collecting from US under-13s"
   line, and whether any geo/marketing posture is advisable)?

## Decision B — governing law + dispute resolution (facts set; confirm mechanism)

- **Governing law: Singapore** (the operator's jurisdiction). Already written
  into the Terms draft.
- **Open choice for counsel:** the dispute-resolution mechanism — **Singapore
  courts vs SIAC arbitration**, and whether to include a **class-action waiver**
  (note the children's-product angle). Please finalise the clause.

## Deliverable requested

Confirm-or-correct the three live pages (Refund / Privacy / Terms) against the
structure above. Flag anything that misstates our practices or is legally
insufficient for a Singapore-based, PDPA-first launch to an 8–14 audience —
especially the children's-data section, the class-action waiver, and the
dispute-resolution clause.
