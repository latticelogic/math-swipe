# Granting the `isAdmin` custom claim

Firestore rules in this repo gate two admin surfaces on the `isAdmin`
Firebase Auth custom claim:

- `pushEvents/` — read-only access for the `/admin/push` push-delivery
  analytics dashboard
- `entitlements/{uid}` — cross-user read access for the `/admin/billing`
  conversion + refund-rate dashboard (owner-write only)

Custom claims can only be set server-side via the admin SDK.

## One-off: from the Firebase shell

```bash
cd functions
npm install
npx firebase-admin -e <<'NODE'
const admin = require('firebase-admin');
admin.initializeApp();
const uid = 'PUT_YOUR_UID_HERE'; // copy from Firebase Auth → Users
admin.auth().setCustomUserClaims(uid, { isAdmin: true })
  .then(() => { console.log('Done'); process.exit(0); })
  .catch(err => { console.error(err); process.exit(1); });
NODE
```

## Verify

After setting the claim, sign out and sign back in (claims are baked into
the ID token, so you need a fresh token). Then in the browser console:

```js
firebase.auth().currentUser.getIdTokenResult(true).then(r => console.log(r.claims));
```

You should see `isAdmin: true` in the `claims` object.

## Security note

Anyone with the `isAdmin` claim can read every row in both
`pushEvents/` (usage patterns, no PII) AND `entitlements/`
(payment timestamps + Stripe transaction ids, but not card details
which Stripe holds). Grant it only to project owners.
