# audit-firestore.cjs

Read-only audit of the math-swipe-prod Firestore.

## Prerequisites (one-time)

Set Application Default Credentials so the firebase-admin SDK can auth:

```bash
gcloud auth application-default login
```

A browser opens. Sign in as `tim@latticelogic.app`. Done.

## Run

```bash
node scripts/audit-firestore.cjs
```

Outputs:
- Users collection size + preferences.ageBand distribution (flags any legacy `k2`/`35`/`6+` values still in storage)
- Activity stats (XP totals, anonymous vs claimed users)
- Other collections: usernames, pushEvents, pushSubscriptions, pings, errors, vitals
- Last 5 push events
- Last 5 lastPlayedDate values

The script is read-only. Safe to run anytime to sanity-check production state.
