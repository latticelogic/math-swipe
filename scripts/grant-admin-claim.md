# Granting the `isAdmin` custom claim

Firestore rules in this repo gate analytics reads (`pushEvents/`) on the
`isAdmin` Firebase Auth custom claim. Custom claims can only be set
server-side via the admin SDK.

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

Anyone with the `isAdmin` claim can read every row in `pushEvents/`,
which contains no PII but reveals usage patterns. Grant it only to
project owners.
