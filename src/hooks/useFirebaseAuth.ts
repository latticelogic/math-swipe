import { useState, useEffect, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { getFirebase } from '../utils/firebase';

/** Random display name generator */
const ADJECTIVES = ['Swift', 'Clever', 'Bold', 'Quick', 'Bright', 'Sharp', 'Keen', 'Cool', 'Lucky', 'Epic'];
const NOUNS = ['Tiger', 'Eagle', 'Wizard', 'Ninja', 'Panda', 'Fox', 'Falcon', 'Lion', 'Wolf', 'Otter'];
function randomName(): string {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const num = Math.floor(Math.random() * 100);
    return `${adj}${noun}${num}`;
}

export interface FirebaseUser {
    uid: string;
    displayName: string;
    isAnonymous: boolean;
    /** The linked account's email (Google/email-link/Apple). null when the
     *  user is still anonymous or the provider withheld it (e.g. Apple's
     *  hide-my-email). Powers the "Signed in as" affirmation on the Me tab. */
    email: string | null;
}

// Stash for the anon account's ID token across a redirect-based sign-in (the
// in-memory token is lost when the page navigates away for the redirect flow).
const RECONCILE_TOKEN_KEY = 'math-swipe-reconcile-token';
// Which provider the pending redirect used, so the return handler can recover
// the right credential if the account turns out to already exist.
const RECONCILE_PROVIDER_KEY = 'math-swipe-reconcile-provider';

/** Merge the anonymous account's entitlement (paid + earliest trial) + stats
 *  into the account just signed into, proven by the anon account's ID token.
 *  Best-effort: a failure just means the merge retries on a later sign-in. */
async function runAccountReconcile(fromIdToken: string): Promise<void> {
    if (!fromIdToken) return;
    try {
        const [{ functions }, { httpsCallable }] = await Promise.all([
            getFirebase(), import('firebase/functions'),
        ]);
        await httpsCallable(functions, 'reconcileAccount')({ fromIdToken });
    } catch (err) {
        console.warn('Account reconcile failed (will retry next sign-in):', err);
    }
}

/** Firebase codes meaning "this credential already belongs to another account"
 *  — the trigger to switch into that account and merge the anon one across. */
function isCredentialInUse(code?: string): boolean {
    return code === 'auth/credential-already-in-use' || code === 'auth/email-already-in-use';
}

export function useFirebaseAuth() {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [loading, setLoading] = useState(true);
    // Transient, user-facing outcome of the last sign-in action (success or a
    // human-readable error). The Me tab renders + auto-clears it. Fixes the old
    // behavior where every auth failure was a silent console.warn.
    const [authMessage, setAuthMessage] = useState<string | null>(null);

    useEffect(() => {
        let unsub: (() => void) | undefined;
        let cancelled = false;
        (async () => {
            // Firebase loads lazily (off the first-paint critical path). Until
            // it resolves, the app runs fully local with uid=null.
            const [{ auth, db }, fbAuth, fbFs] = await Promise.all([
                getFirebase(),
                import('firebase/auth'),
                import('firebase/firestore'),
            ]);
            if (cancelled) return;
            const {
                onAuthStateChanged, signInAnonymously, getRedirectResult,
                GoogleAuthProvider, OAuthProvider, signInWithCredential,
            } = fbAuth;
            const { doc, getDoc, setDoc, serverTimestamp } = fbFs;

            // Complete a redirect-based sign-in (the iOS/PWA fallback) and merge
            // the stashed anonymous account into it.
            getRedirectResult(auth).then(async (result) => {
                if (!result?.user) return;
                // Happy path: the redirect LINKED in place (same uid) — merge any
                // stashed token defensively, then done.
                const token = sessionStorage.getItem(RECONCILE_TOKEN_KEY);
                if (token) {
                    await runAccountReconcile(token);
                    sessionStorage.removeItem(RECONCILE_TOKEN_KEY);
                }
                sessionStorage.removeItem(RECONCILE_PROVIDER_KEY);
                if (!cancelled) setAuthMessage('Signed in — progress saved.');
                setDoc(doc(db, 'users', result.user.uid), { isAnonymous: false, updatedAt: serverTimestamp() }, { merge: true }).catch(() => { });
            }).catch(async (err) => {
                const code = (err as { code?: string })?.code;
                // The Google/Apple account already belongs to another (earlier
                // anonymous) uid — linkWithRedirect can't attach it, so it rejects
                // HERE on return with the credential attached. The popup path
                // handles this by switching accounts + merging; the redirect path
                // must do the same or the user bounces back still anonymous (the
                // "went to Google, came back not signed in" report).
                if (code === 'auth/credential-already-in-use' || code === 'auth/email-already-in-use') {
                    const token = sessionStorage.getItem(RECONCILE_TOKEN_KEY);
                    const kind = sessionStorage.getItem(RECONCILE_PROVIDER_KEY);
                    try {
                        const cred = kind === 'apple'
                            ? OAuthProvider.credentialFromError(err)
                            : GoogleAuthProvider.credentialFromError(err);
                        if (cred) {
                            await signInWithCredential(auth, cred); // switch into the existing account
                            if (token) await runAccountReconcile(token); // merge the anon progress across
                            if (!cancelled) setAuthMessage('Welcome back — your progress was merged.');
                        } else if (!cancelled) {
                            setAuthMessage('Sign-in didn\'t complete. Please try again.');
                        }
                    } catch (e) {
                        console.warn('Redirect collision recovery failed:', e);
                        if (!cancelled) setAuthMessage('Sign-in didn\'t complete. Please try again.');
                    } finally {
                        sessionStorage.removeItem(RECONCILE_TOKEN_KEY);
                        sessionStorage.removeItem(RECONCILE_PROVIDER_KEY);
                    }
                    return;
                }
                // Only a genuine auth error (has a code) should surface — a normal
                // page load with no pending redirect resolves null, not an error.
                console.warn('Redirect sign-in result failed:', err);
                if (!cancelled && code) setAuthMessage('Sign-in didn\'t complete. Please try again.');
            });

            unsub = onAuthStateChanged(auth, (fbUser: User | null) => {
                if (fbUser) {
                    // Auth succeeded — set user immediately with a temporary name
                    // Don't block on Firestore read
                    const tempName = localStorage.getItem('math-swipe-displayName') || randomName();
                    setUser({
                        uid: fbUser.uid,
                        displayName: tempName,
                        isAnonymous: fbUser.isAnonymous,
                        email: fbUser.email ?? null,
                    });
                    setLoading(false);

                    // Background: sync display name with Firestore (non-blocking)
                    const userRef = doc(db, 'users', fbUser.uid);
                    getDoc(userRef).then(snap => {
                        if (snap.exists()) {
                            const cloudName = snap.data().displayName || tempName;
                            localStorage.setItem('math-swipe-displayName', cloudName);
                            setUser(prev => prev ? { ...prev, displayName: cloudName } : null);
                        } else {
                            // First time — create user doc
                            const name = tempName;
                            localStorage.setItem('math-swipe-displayName', name);
                            setDoc(userRef, {
                                displayName: name,
                                totalXP: 0,
                                bestStreak: 0,
                                totalSolved: 0,
                                accuracy: 0,
                                isAnonymous: fbUser.isAnonymous,
                                createdAt: serverTimestamp(),
                                updatedAt: serverTimestamp(),
                            }).catch(err => console.warn('Failed to create user doc:', err));
                        }
                    }).catch(err => {
                        console.warn('Failed to fetch user doc:', err);
                        // Still functional — we have auth, just no cloud name sync
                    });
                } else {
                    // No user — sign in anonymously
                    signInAnonymously(auth).catch(err => {
                        console.error('Anonymous auth failed:', err);
                        // Allow app to load even if auth fails
                        setLoading(false);
                    });
                }
            });
        })().catch(err => {
            console.error('Firebase init failed:', err);
            setLoading(false);
        });
        return () => { cancelled = true; if (unsub) unsub(); };
    }, []);

    // ── Email link sign-in completion (runs once on page load) ──
    useEffect(() => {
        // Cheap pre-check without loading the SDK. Normally we have the address
        // stashed; if not but the URL clearly IS an email-sign-in link, the link
        // was opened on a different device — proceed and prompt for the email.
        const stashedEmail = localStorage.getItem('math-swipe-email-for-signin');
        const looksLikeEmailLink = /[?&]mode=signIn/.test(window.location.href) && /[?&]oobCode=/.test(window.location.href);
        if (!stashedEmail && !looksLikeEmailLink) return;
        let cancelled = false;
        (async () => {
            const [{ auth, db }, fbAuth, fbFs] = await Promise.all([
                getFirebase(),
                import('firebase/auth'),
                import('firebase/firestore'),
            ]);
            if (cancelled) return;
            const {
                isSignInWithEmailLink, EmailAuthProvider, linkWithCredential, signInWithEmailLink,
            } = fbAuth;
            const { doc, setDoc, serverTimestamp } = fbFs;
            if (!isSignInWithEmailLink(auth, window.location.href)) return;

            // Cross-device path: no stashed email → ask for it (Firebase's
            // documented completion flow) instead of silently no-op'ing.
            const email = stashedEmail || window.prompt('Confirm your email to finish signing in:') || '';
            if (!email) { setAuthMessage('Enter your email to finish signing in.'); return; }

            const finish = () => {
                localStorage.removeItem('math-swipe-email-for-signin');
                window.history.replaceState(null, '', window.location.pathname);
            };
            const currentUser = auth.currentUser;
            const anonToken = currentUser?.isAnonymous ? await currentUser.getIdToken().catch(() => '') : '';
            try {
                if (currentUser?.isAnonymous) {
                    const credential = EmailAuthProvider.credentialWithLink(email, window.location.href);
                    try {
                        // Happy path: link in place — same uid, progress preserved.
                        await linkWithCredential(currentUser, credential);
                        setUser(prev => prev ? { ...prev, isAnonymous: false, email } : null);
                        await setDoc(doc(db, 'users', currentUser.uid), { isAnonymous: false, updatedAt: serverTimestamp() }, { merge: true });
                        setAuthMessage('Signed in — progress saved.');
                    } catch (linkErr) {
                        const code = (linkErr as { code?: string }).code;
                        if (isCredentialInUse(code)) {
                            // Email already on another account — switch to it and
                            // merge the anonymous account across (proven by token).
                            await signInWithEmailLink(auth, email, window.location.href);
                            if (anonToken) await runAccountReconcile(anonToken);
                            setAuthMessage('Welcome back — your progress was merged.');
                        } else {
                            throw linkErr;
                        }
                    }
                } else {
                    await signInWithEmailLink(auth, email, window.location.href);
                    setAuthMessage('Signed in.');
                }
                finish();
            } catch (err) {
                const code = (err as { code?: string }).code;
                setAuthMessage(
                    code === 'auth/invalid-action-code' || code === 'auth/expired-action-code'
                        ? 'That sign-in link expired — please request a new one.'
                        : 'Sign-in failed. Please try again.',
                );
                console.warn('Email link flow failed:', err);
            }
        })().catch(err => console.warn('Email link flow failed:', err));
        return () => { cancelled = true; };
    }, []);

    /** Update display name in Firestore.
     *  Defence in depth: server-side rule already caps to <=20 chars + string,
     *  but we also sanitize client-side so the UI shows the cleaned value. */
    const setDisplayName = useCallback(async (name: string) => {
        if (!user) return;
        const sanitized = name
            .normalize('NFC')                          // Collapse Unicode homoglyph variations
            // eslint-disable-next-line no-control-regex
            .replace(/[ -]/g, '')     // Strip control chars
            .replace(/<[^>]*>/g, '')                   // Strip any HTML-ish tags
            .replace(/[^\w\s\-_.!]/g, '')              // ASCII-friendly allow-list
            .replace(/\s+/g, ' ')                      // Collapse internal whitespace
            .trim()
            .slice(0, 20);
        if (!sanitized) return;
        localStorage.setItem('math-swipe-displayName', sanitized);
        setUser(prev => prev ? { ...prev, displayName: sanitized } : null);
        try {
            const [{ db }, { doc, setDoc, serverTimestamp }] = await Promise.all([
                getFirebase(), import('firebase/firestore'),
            ]);
            await setDoc(doc(db, 'users', user.uid), { displayName: sanitized, updatedAt: serverTimestamp() }, { merge: true });
        } catch (err) {
            console.warn('Failed to update display name:', err);
        }
    }, [user]);

    /** Link the anonymous account to an OAuth provider (Google/Apple) for
     *  cross-device sync + backup. Both providers share the collision +
     *  redirect + reconcile handling; only the provider object differs. */
    const linkWithProvider = useCallback(async (kind: 'google' | 'apple') => {
        const [{ auth, db }, fbAuth, { doc, setDoc, serverTimestamp }] = await Promise.all([
            getFirebase(), import('firebase/auth'), import('firebase/firestore'),
        ]);
        const { GoogleAuthProvider, OAuthProvider, signInWithPopup, linkWithPopup, signInWithRedirect, linkWithRedirect } = fbAuth;
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        let provider;
        if (kind === 'apple') {
            const apple = new OAuthProvider('apple.com');
            apple.addScope('email');
            apple.addScope('name');
            provider = apple;
        } else {
            provider = new GoogleAuthProvider();
        }
        const wasAnon = currentUser.isAnonymous;
        // Capture the anon token up front so we can merge it into whatever
        // account we end up in — after a collision switch or across a redirect.
        const anonToken = wasAnon ? await currentUser.getIdToken().catch(() => '') : '';

        try {
            if (wasAnon) {
                // Happy path: link in place — SAME uid, so paid/trial/stats are
                // preserved automatically; no reconcile needed.
                const result = await linkWithPopup(currentUser, provider);
                const displayName = result.user.displayName || user?.displayName || randomName();
                localStorage.setItem('math-swipe-displayName', displayName);
                setUser(prev => prev ? { ...prev, displayName, isAnonymous: false, email: result.user.email ?? prev.email } : null);
                await setDoc(doc(db, 'users', currentUser.uid), { displayName, isAnonymous: false, updatedAt: serverTimestamp() }, { merge: true });
                setAuthMessage('Signed in — progress saved.');
            } else {
                await signInWithPopup(auth, provider);
                setAuthMessage('Signed in.');
            }
        } catch (err: unknown) {
            const code = (err as { code?: string }).code;
            if (code === 'auth/operation-not-allowed') {
                // Provider not enabled in Firebase (e.g. Apple before setup) —
                // redirect wouldn't help, so surface it directly.
                setAuthMessage('That sign-in option isn\'t available yet.');
                console.warn(`${kind} sign-in not enabled:`, err);
                return;
            }
            if (isCredentialInUse(code)) {
                // That Google account already exists — switch into it, then merge
                // the anonymous account's paid/trial/stats across (proven by token).
                try {
                    await signInWithPopup(auth, provider);
                    if (anonToken) await runAccountReconcile(anonToken);
                    setAuthMessage('Welcome back — your progress was merged.');
                    return;
                } catch (e2) {
                    // Fall through to the redirect fallback below (the switch
                    // popup failed for the same class of reasons a first popup can).
                    console.warn('Account-switch popup failed, falling back to redirect:', e2);
                }
            }
            // Any other popup failure — popup blocked, an ad/tracking blocker
            // killing the Firebase auth iframe, COOP quirks, or Chrome's
            // third-party-storage/cookie restrictions (auth/internal-error,
            // auth/web-storage-unsupported), or a transient network error. The
            // full-page REDIRECT flow doesn't depend on popups or a third-party
            // iframe, so it's the reliable fallback. (Previously only 4 specific
            // popup codes fell back; every other error dead-ended on a generic
            // "Sign-in failed" — the bug this fixes.)
            if (anonToken) sessionStorage.setItem(RECONCILE_TOKEN_KEY, anonToken);
            sessionStorage.setItem(RECONCILE_PROVIDER_KEY, kind);
            try {
                if (wasAnon) await linkWithRedirect(currentUser, provider);
                else await signInWithRedirect(auth, provider);
            } catch (e3) {
                setAuthMessage('Sign-in didn\'t work here — try turning off ad/tracking blockers for this site, or use "Continue with email".');
                console.error(`${kind} sign-in failed (popup + redirect):`, err, e3);
            }
        }
    }, [user]);

    const linkGoogle = useCallback(() => linkWithProvider('google'), [linkWithProvider]);
    const linkApple = useCallback(() => linkWithProvider('apple'), [linkWithProvider]);

    /** Send email magic link for sign-in / account linking */
    const sendEmailLink = useCallback(async (email: string) => {
        const [{ auth }, { sendSignInLinkToEmail }] = await Promise.all([
            getFirebase(), import('firebase/auth'),
        ]);
        const actionCodeSettings = {
            url: window.location.origin,
            handleCodeInApp: true,
        };
        await sendSignInLinkToEmail(auth, email, actionCodeSettings);
        localStorage.setItem('math-swipe-email-for-signin', email);
    }, []);

    const clearAuthMessage = useCallback(() => setAuthMessage(null), []);

    return { user, loading, setDisplayName, linkGoogle, linkApple, sendEmailLink, authMessage, clearAuthMessage };
}
