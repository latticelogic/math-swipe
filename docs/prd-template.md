# PRD template (copy per feature/app — starts with app #2)

The process map calls for structured PRDs; app #1 used decision records
instead, which worked but scattered acceptance criteria across CLAUDE.md,
docs, and PR bodies. Starting with app #2, substantive features get a short
PRD in this shape (a page, not a treaty — if a section has nothing to say,
delete it). File as `docs/prd-<slug>.md`, index it, and link it from the PR.

---

## <Feature / app name>

**Status:** draft | approved (owner) | built | verified
**Owner call needed on:** <the one or two decisions only the owner can make>

### Problem & audience
Who hurts, what's the pain, why now. One paragraph, concrete.

### Success metric
The number(s) that decide whether this worked, and where they're read
(`/admin/funnel`, digest, store stats). If it can't be measured, say so
explicitly and why it's still worth building.

### User stories & acceptance criteria
| # | As a… | I want… | Accepted when… (testable) |
|---|---|---|---|
| 1 | expired free player | to keep my daily habit | Daily playable post-trial; paywall never fires on `questionType === 'daily'` (unit test named) |

Every acceptance criterion names its **test** (unit/rules/e2e checklist line).
Untestable criteria are smells — rewrite them until they're checkable.

### Logic flows
The non-obvious flows only (happy path + the failure modes that matter:
offline, unpaid, race, replay). Bullet sequences or a small diagram.

### Monetization touch
Does this touch price, gating, trial, or store policy? If yes: which firm
decision (lattice-logic.md §2.3 / the app's monetization record) governs it,
and confirm this stays inside it. "None" is a fine answer.

### Copy & tone
New user-facing strings drafted HERE (all 12 locales via `t()` keys), against
the tone bar: warm, restrained, specific, no emoji in chrome.

### Out of scope
What this deliberately does NOT do (the clone of this section in the next PRD
is where scope creep goes to be seen).

### Rollout & risk
Feature flag / experiment id (if A/B), channels affected (web-only vs shells),
compliance surfaces touched (Data safety, App privacy, store listing), and the
rollback story (usually: web deploy revert — `rollback.md`).
