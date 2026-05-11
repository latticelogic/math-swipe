/**
 * Live data audit — reads against math-swipe-prod via firebase-admin.
 * Uses Application Default Credentials (set via `gcloud auth application-default login`).
 *
 * Run from repo root:
 *   node scripts/audit-firestore.cjs
 *
 * Read-only. Does not write or mutate any document.
 */
const admin = require('../functions/node_modules/firebase-admin');

admin.initializeApp({
    projectId: 'math-swipe-prod',
    credential: admin.credential.applicationDefault(),
});

const db = admin.firestore();

async function main() {
    console.log('\n=== Math Swipe — Firestore audit ===\n');

    // ── Users collection: count, band distribution, stale legacy bands ──
    console.log('--- users collection ---');
    const usersSnap = await db.collection('users').limit(500).get();
    console.log(`Sampled users: ${usersSnap.size} (capped at 500)`);

    const bandCounts = {};
    let usersWithPrefs = 0;
    let usersWithStats = 0;
    let totalXP = 0;
    let totalSolved = 0;
    let withUsername = 0;
    let anonymous = 0;
    const recentSessions = [];

    usersSnap.forEach(doc => {
        const d = doc.data();
        if (d.preferences) usersWithPrefs++;
        if (d.stats || d.totalSolved !== undefined) usersWithStats++;
        if (d.username) withUsername++;
        if (d.isAnonymous) anonymous++;
        totalXP += d.totalXP || 0;
        totalSolved += d.totalSolved || 0;

        // The interesting one — what's stored in preferences.ageBand?
        const band = d.preferences && d.preferences.ageBand;
        const key = band === undefined ? '(unset)' : String(band);
        bandCounts[key] = (bandCounts[key] || 0) + 1;

        if (d.lastPlayedDate) {
            recentSessions.push({ uid: doc.id.slice(0, 8), date: d.lastPlayedDate });
        }
    });

    console.log(`  with preferences:  ${usersWithPrefs}`);
    console.log(`  with stats:        ${usersWithStats}`);
    console.log(`  anonymous:         ${anonymous}`);
    console.log(`  with @username:    ${withUsername}`);
    console.log(`  total XP (sum):    ${totalXP.toLocaleString()}`);
    console.log(`  total solved:      ${totalSolved.toLocaleString()}`);
    console.log('\n  preferences.ageBand distribution:');
    Object.entries(bandCounts).sort((a, b) => b[1] - a[1]).forEach(([band, count]) => {
        const legacy = ['k2', '35', '6+'].includes(band) ? '  ← LEGACY' : '';
        console.log(`    ${band.padEnd(12)} ${count}${legacy}`);
    });

    // ── Recent activity ──
    recentSessions.sort((a, b) => b.date.localeCompare(a.date));
    console.log(`\n  most recent 5 lastPlayedDate values:`);
    recentSessions.slice(0, 5).forEach(s => console.log(`    ${s.date} — ${s.uid}...`));

    // ── Other collections ──
    console.log('\n--- other collections (sizes) ---');
    for (const col of ['usernames', 'pushEvents', 'pushSubscriptions', 'pings', 'errors', 'vitals']) {
        const snap = await db.collection(col).limit(1000).get();
        console.log(`  ${col.padEnd(18)} ${snap.size} doc(s)${snap.size === 1000 ? ' (1000+)' : ''}`);
    }

    // ── Username claims sanity ──
    console.log('\n--- usernames collection ---');
    const usernamesSnap = await db.collection('usernames').limit(20).get();
    console.log(`  Sampled ${usernamesSnap.size} claims:`);
    usernamesSnap.forEach(doc => {
        const d = doc.data();
        console.log(`    @${doc.id.padEnd(20)} → uid ${(d.uid || '?').slice(0, 8)}...`);
    });

    // ── Push events recent ──
    console.log('\n--- pushEvents (last 5) ---');
    const eventsSnap = await db.collection('pushEvents').orderBy('ts', 'desc').limit(5).get();
    if (eventsSnap.empty) {
        console.log('  (no push events recorded)');
    } else {
        eventsSnap.forEach(doc => {
            const d = doc.data();
            console.log(`    ${(d.ts && d.ts.toDate ? d.ts.toDate().toISOString() : '?').padEnd(28)} ${d.type || '?'} — ${d.uid ? d.uid.slice(0, 8) + '...' : 'no-uid'}`);
        });
    }

    console.log('\n=== Audit complete ===\n');
    process.exit(0);
}

main().catch(err => {
    console.error('Audit failed:', err.message);
    process.exit(1);
});
