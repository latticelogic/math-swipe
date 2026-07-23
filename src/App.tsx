import { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import type { PanInfo } from 'framer-motion';
import { AnimatePresence, motion } from 'framer-motion';
import { BlackboardLayout } from './components/BlackboardLayout';
import { ProblemView } from './components/ProblemView';
import { Teacher } from './components/Teacher';
import { TEACHERS, DEFAULT_TEACHER_ID, resolveActiveTeacher } from './domains/math/teachers';
import { flushPendingPushEvents, attachPushEventFlushListener } from './utils/pushEvents';
import { ScoreCounter } from './components/ScoreCounter';
import { BottomNav } from './components/BottomNav';
import { ActionButtons } from './components/ActionButtons';
import { SwipeTrail } from './components/SwipeTrail';
import type { AgeBand } from './utils/questionTypes';
import { defaultTypeForBand } from './utils/questionTypes';
import { useAutoSummary, usePersonalBest } from './hooks/useSessionUI';
import { OfflineBanner } from './components/OfflineBanner';
import { ReloadPrompt } from './components/ReloadPrompt';
import { MilestoneBurst } from './components/MilestoneBurst';
import { DailyFlourish } from './components/DailyFlourish';
import { TabErrorBoundary } from './components/ErrorBoundary';
import { AchievementBadge } from './components/AchievementBadge';
import { hapticMilestone } from './utils/haptics';
import { useFirstCorrectFlourish } from './hooks/useFirstCorrectFlourish';
/** Retry a dynamic import once on chunk-load failure (Cloudflare Pages cache busting) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lazyRetry<T extends Record<string, any>>(factory: () => Promise<T>): Promise<T> {
  return factory().catch(() => {
    const key = 'chunk-reload';
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, '1');
      window.location.reload();
    }
    return factory();
  });
}

const LeaguePage = lazy(() => lazyRetry(() => import('./components/LeaguePage')).then(m => ({ default: m.LeaguePage })));
const MePage = lazy(() => lazyRetry(() => import('./components/MePage')).then(m => ({ default: m.MePage })));
const TricksPage = lazy(() => lazyRetry(() => import('./components/TricksPage')).then(m => ({ default: m.TricksPage })));
const ProfilePage = lazy(() => lazyRetry(() => import('./components/ProfilePage')).then(m => ({ default: m.ProfilePage })));
const AdminPushAnalytics = lazy(() => lazyRetry(() => import('./components/AdminPushAnalytics')).then(m => ({ default: m.AdminPushAnalytics })));
const AdminBilling = lazy(() => lazyRetry(() => import('./components/AdminBilling')).then(m => ({ default: m.AdminBilling })));
const AdminErrors = lazy(() => lazyRetry(() => import('./components/AdminErrors')).then(m => ({ default: m.AdminErrors })));
const AdminFunnel = lazy(() => lazyRetry(() => import('./components/AdminFunnel')).then(m => ({ default: m.AdminFunnel })));

import { useGameLoop } from './hooks/useGameLoop';
import { useStats } from './hooks/useStats';
import type { QuestionType } from './utils/questionTypes';
import { EVERY_ACHIEVEMENT, loadUnlocked, saveUnlocked, checkAchievements, restoreUnlockedFromCloud } from './utils/achievements';
import { EVERY_MATH_ACHIEVEMENT, achName } from './domains/math/mathAchievements';
import { capturePendingReferrer, maybeClaimReferral, fetchReferralCount, fetchReferralConversions } from './utils/referral';
import { SessionSummary } from './components/SessionSummary';
import { WeeklyRecap } from './components/WeeklyRecap';
import { CHALK_THEMES, applyTheme, getThemeDisplayColor, type ChalkTheme } from './utils/chalkThemes';
import { applyMode } from './hooks/useThemeMode';
import { useLocalState } from './hooks/useLocalState';
import { useFirebaseAuth } from './hooks/useFirebaseAuth';
import { useEntitlement } from './hooks/useEntitlement';
import { shouldFirePaywall } from './utils/entitlement';
import { startCheckout, getPurchaseChannel, restorePlayPurchases, type PurchaseChannel } from './utils/checkout';
import { detectChannel, isAndroidApp } from './utils/channel';
import { buildSharePayloadFromArgs, type SharePayloadArgs } from './utils/sharePayload';
import { buildProfileSlug } from './utils/profileSlug';
import { EndRunDialog } from './components/EndRunDialog';
import { nextTeacherTip, markTipSeen } from './utils/teacherTips';
import { FlameIcon, ShieldIcon, BoltIcon } from './components/icons';
import { Paywall } from './components/Paywall';
import { PurchaseCelebration } from './components/PurchaseCelebration';
import { markFunnel, touchFunnelActive } from './utils/funnel';
import { PushNudge } from './components/PushNudge';
import { getPushStatus } from './utils/push';
import { WelcomeModal, TrialReminderModal } from './components/TrialModals';
import { SignInPrompt } from './components/SignInPrompt';
import { LegalPage, type LegalDocId } from './components/LegalPages';
import { TabSkeleton } from './components/TabSkeleton';
import { PersonalBestRibbon } from './components/PersonalBestRibbon';
import { getFirebase } from './utils/firebase';
import { generateProblem } from './utils/mathGenerator';
import { generateDailyChallenge, generateChallenge } from './utils/dailyChallenge';
import { todayKey } from './utils/dateKey';
import { maybeRequestReview, pushWidgetStats } from './utils/nativeShell';
import type { EngineItem } from './engine/domain';
import { DEFAULT_GAME_CONFIG, TIMED_DURATION_PRESETS } from './engine/domain';
import { STORAGE_KEYS, FIRESTORE } from './config';
import { t } from './i18n';

type Tab = 'game' | 'league' | 'me' | 'magic';
const TAB_ORDER: Tab[] = ['game', 'league', 'magic', 'me'];

/**
 * Math domain item generator — adapts generateProblem to the EngineItem interface.
 * Passed into useGameLoop so the engine never directly imports math.
 */
function generateMathItem(
  difficulty: number,
  categoryId: string,
  hardMode: boolean,
  rng?: () => number,
): EngineItem {
  return generateProblem(difficulty, categoryId as QuestionType, hardMode, rng) as EngineItem;
}

// First-touch referral capture. Runs at module load — before the challenge
// URL parser below can rewrite the URL — so a ?r=<uid> invite link is never
// lost. No-op without the param (and in non-browser/test contexts).
capturePendingReferrer();

// Distribution-channel capture (web vs Google Play TWA). Also at module load:
// the android-app:// referrer and the TWA start_url's ?src=twa param are only
// reliably present on the FIRST navigation, before any URL rewriting.
detectChannel();

/**
 * Math finite-set generator for daily / challenge modes.
 */
function generateMathFiniteSet(categoryId: string, challengeId: string | null): EngineItem[] {
  if (categoryId === 'challenge' && challengeId) {
    return generateChallenge(challengeId) as EngineItem[];
  }
  const { problems } = generateDailyChallenge();
  return problems as EngineItem[];
}



function App() {
  const { user, setDisplayName, linkGoogle, linkApple, sendEmailLink, authMessage, clearAuthMessage } = useFirebaseAuth();
  const uid = user?.uid ?? null;

  // 7-day trial → $3.14 lifetime gate. See utils/entitlement.ts +
  // memory/monetization_model.md. The paywall is now a value-anchored
  // OVERLAY, not an app-blocking early return — it fires AFTER the user
  // completes a problem in a non-daily session, so they get the dopamine
  // hit first, then the ask. Daily Challenge is exempt from the gate
  // entirely (free forever per the model docs).
  const entitlement = useEntitlement(uid);
  const [paywallBusy, setPaywallBusy] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [celebrateOpen, setCelebrateOpen] = useState(false);
  const [pushNudgeOpen, setPushNudgeOpen] = useState(false);
  const pushNudgePendingRef = useRef(false);
  const [refereeBonusDays, setRefereeBonusDays] = useState(0);
  // Web checkout returns the user to the app (via ?paywall=ok, or manually if
  // the hosted page didn't redirect). While we re-read the entitlement to catch
  // the webhook's grant, show a brief "Payment received — unlocking…" state so
  // the return is a clear moment, not a confusing blank.
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  // 'expired' = post-trial hard gate; 'pro' = dismissible early upsell shown
  // when a locked Pro feature is tapped during the trial.
  const [paywallMode, setPaywallMode] = useState<'expired' | 'pro'>('expired');

  // Purchase channel: 'web' (Airwallex) | 'play' (Google Play Billing inside
  // the TWA) | 'none' (Android app without Play Billing — selling anything
  // there would violate Play policy, so the paywall hides the purchase path).
  const [purchaseChannel, setPurchaseChannel] = useState<PurchaseChannel>('web');
  useEffect(() => {
    getPurchaseChannel().then(setPurchaseChannel).catch(() => setPurchaseChannel('web'));
    // Inside the Android app, restore any prior Play purchase (reinstall, new
    // device, Play Pass). Server-verified; a hit writes paidAt → the
    // entitlement hook picks it up on refresh.
    if (isAndroidApp()) {
      restorePlayPurchases().then(found => {
        if (found) entitlement.refresh().catch(() => { /* next read catches up */ });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-probe the purchase channel whenever the paywall opens. The boot check
  // can run before Play Billing's Digital Goods service has connected — very
  // likely right after launch, and for longer on a freshly-published app whose
  // product hasn't propagated — and resolve to 'none'. Without this re-check
  // that stale 'none' would hide the purchase path for the whole session even
  // once billing is ready; re-probing on open lets it flip to 'play'.
  useEffect(() => {
    if (!paywallOpen) return;
    getPurchaseChannel().then(setPurchaseChannel).catch(() => { /* keep prior value */ });
  }, [paywallOpen]);

  // Airwallex checkout success redirect handler. Airwallex sends the user back
  // to /?paywall=ok&session_id=... after a successful payment; the webhook
  // has already written paidAt by then, but we still need to nudge the
  // hook to re-read so the paywall closes immediately. Also strips the
  // query params so a refresh doesn't loop the same effect.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paywallStatus = params.get('paywall');
    if (paywallStatus !== 'ok' && paywallStatus !== 'cancelled') return;
    // Always clear the URL so subsequent reloads don't re-trigger this.
    window.history.replaceState({}, '', window.location.pathname);
    if (paywallStatus !== 'ok') return;
    // Payment succeeded on the hosted page. The webhook writes paidAt, but it
    // can lag a beat — show "Payment received — unlocking…" and poll a few
    // times so the celebration fires without a reload. The paid effect clears
    // this state + fires the celebration.
    setConfirmingPayment(true);
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      entitlement.refresh().catch(() => { /* silent */ });
      if (tries >= 8) { clearInterval(timer); setConfirmingPayment(false); }
    }, 1500);
    return () => clearInterval(timer);
  // Intentional: run once on mount (the URL is the source of truth)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Returning to the app from an external payment tab (e.g. the Airwallex
  // hosted page didn't auto-redirect and the user came back manually) — re-read
  // the entitlement so a completed payment lands the celebration instead of a
  // stale paywall.
  useEffect(() => {
    if (entitlement.status === 'paid') return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') entitlement.refresh().catch(() => { /* silent */ });
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entitlement.status]);

  const [activeTab, setActiveTab] = useState<Tab>('game');
  const [isMagicLessonActive, setIsMagicLessonActive] = useState(false);
  const [hardMode, setHardMode] = useState(false);
  const [timedMode, setTimedMode] = useState(false);

  // ── Check URL for /u/<slug> profile link OR ?c=<challenge> link ──
  // Profile is its own surface (router-style), challenge auto-loads inside
  // the game tab. We capture both at boot and clean the URL once consumed.
  const [profileSlug, setProfileSlug] = useState<string | null>(() => {
    const m = window.location.pathname.match(/^\/u\/([^/]+)\/?$/);
    return m ? m[1] : null;
  });
  // Admin routes — owner-only by Firebase custom claim. Add new admin
  // surfaces here as path-matchers; the matched value drives which
  // component renders below. /admin/push (push notification analytics)
  // /admin/billing (entitlement / refund-rate dashboard), and
  // /admin/errors (client crash reports — errorSpike pushes point here).
  const [adminRoute, setAdminRoute] = useState<'push' | 'billing' | 'errors' | 'funnel' | null>(() => {
    const p = window.location.pathname;
    if (/^\/admin\/push\/?$/.test(p)) return 'push';
    if (/^\/admin\/billing\/?$/.test(p)) return 'billing';
    if (/^\/admin\/errors\/?$/.test(p)) return 'errors';
    if (/^\/admin\/funnel\/?$/.test(p)) return 'funnel';
    return null;
  });
  // ?c=<seed> loads a seeded challenge. ?daily=1 routes straight to today's
  // daily (so a friend's link lands them in the same session structure).
  // ?target=<n> renders a "Beat X" overlay in the banner so the receiver
  // knows what they're shooting for. ?targetTime=<ms> does the same for
  // speedrun-style time targets. The sender's "Challenge a Friend" button
  // packages all of these.
  const [bootDailyRequested] = useState<boolean>(() =>
    new URLSearchParams(window.location.search).get('daily') === '1',
  );
  // Static legal pages — Refund / Privacy / Terms / Pricing. Reachable
  // directly via /refund, /privacy, /terms, /pricing; also linked from the
  // Paywall footer and the Me-tab footer. Same pathname-router pattern as
  // profile + admin above.
  const [legalRoute, setLegalRoute] = useState<LegalDocId | null>(() => {
    const m = window.location.pathname.match(/^\/(refund|privacy|terms|pricing|delete-account)\/?$/);
    return m ? (m[1] as LegalDocId) : null;
  });
  const [challengeId, setChallengeId] = useState<string | null>(() =>
    new URLSearchParams(window.location.search).get('c'),
  );
  const [challengeTarget, setChallengeTarget] = useState<{ score: number | null; timeMs: number | null } | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('target');
    const tt = params.get('targetTime');
    if (!t && !tt) return null;
    return {
      score: t ? Number.parseInt(t, 10) || null : null,
      timeMs: tt ? Number.parseInt(tt, 10) || null : null,
    };
  });
  // Strip the consumed challenge params AFTER all initializers have read them.
  // (Bug: the old code stripped the URL inside the `challengeId` initializer,
  // which runs BEFORE the `challengeTarget` initializer — so every shared
  // ghost-race / "Beat X" link lost its target silently. Do it once on mount.)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('c') || params.get('daily') === '1' || params.get('target') || params.get('targetTime')) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);
  const [questionType, setQuestionType] = useState<QuestionType>(
    challengeId ? 'challenge' : bootDailyRequested ? 'daily' : 'multiply'
  );

  // Hard/Timed don't apply to daily/challenge — those are fixed, deterministic
  // sets (generateMathFiniteSet ignores hard). Neutralize the toggles for those
  // types so they can't impose a timer on the daily or pollute hard/timed stats
  // on record. The raw toggle state is preserved for topical play.
  const isFixedSet = questionType === 'daily' || questionType === 'challenge';
  const effectiveHard = isFixedSet ? false : hardMode;
  const effectiveTimed = isFixedSet ? false : timedMode;

  // A challenge seed + "Beat X" target arrive from a share link and are only
  // meaningful for the session they arrived in. Once the player switches to a
  // different mode, abandon them so a stale target can't bleed into (and show a
  // bogus head-to-head on) an unrelated daily/topical session. Entering a
  // fresh challenge keeps its own context.
  const firstTypeRef = useRef(true);
  useEffect(() => {
    if (firstTypeRef.current) { firstTypeRef.current = false; return; }
    if (questionType === 'challenge') return;
    setChallengeId(null);
    setChallengeTarget(null);
  }, [questionType]);

  const { stats, accuracy, recordSession, updateCosmetics, updateBestSpeedrunTime, consumeShield, recordShare } = useStats(uid);

  // ── Last banked session (for the rail share button) ──
  // Snapshot taken whenever a session is recorded (tab-leave bank or summary
  // dismiss). Lets the rail share button keep offering the player's REAL last
  // result after the run is over — previously, switching tabs reset the loop
  // and the only share left was a generic app plug (tester report). Persisted
  // so it survives a reload; per-device is fine (it's a share convenience).
  const [lastSession, setLastSession] = useState<SharePayloadArgs | null>(() => {
    try {
      const raw = localStorage.getItem('math-swipe-last-session');
      return raw ? JSON.parse(raw) as SharePayloadArgs : null;
    } catch { return null; }
  });
  const snapshotSession = useCallback((args: SharePayloadArgs) => {
    setLastSession(args);
    try { localStorage.setItem('math-swipe-last-session', JSON.stringify(args)); } catch { /* quota/private mode */ }
  }, []);

  // ── Claimed @handle (one-shot fetch) ──
  // Used to build clean /u/<handle> share URLs. Stays null for users who
  // haven't claimed; the share builder falls back to /u/<name>-<uid4>.
  const [claimedHandle, setClaimedHandle] = useState<string | null>(null);
  useEffect(() => {
    if (!uid) { setClaimedHandle(null); return; }
    let cancelled = false;
    Promise.all([getFirebase(), import('firebase/firestore')]).then(([{ db }, { doc, getDoc }]) => {
      getDoc(doc(db, 'users', uid)).then(snap => {
        if (cancelled) return;
        const handle = snap.exists() ? (snap.data().username as string | undefined) : undefined;
        setClaimedHandle(handle ?? null);
      }).catch(() => { /* silent */ });
    });
    return () => { cancelled = true; };
  }, [uid]);

  // ── Referral loop ──
  // referralCount = how many players THIS user has successfully invited
  // (server-verified; feeds referral achievements). The redeem effect below
  // credits the person who invited *us*, once we've played enough to be real.
  const [referralCount, setReferralCount] = useState(0);
  // referralConversions = how many of those invitees went on to BUY the game
  // (server-verified `referralStats/{uid}.converted`). Gates the exclusive
  // Beacon trail + the beacon-lit achievement.
  const [referralConversions, setReferralConversions] = useState(0);
  useEffect(() => {
    if (!uid) { setReferralCount(0); setReferralConversions(0); return; }
    let cancelled = false;
    fetchReferralCount(uid).then(c => { if (!cancelled) setReferralCount(c); });
    fetchReferralConversions(uid).then(c => { if (!cancelled) setReferralConversions(c); });
    return () => { cancelled = true; };
  }, [uid]);
  const referralTriedRef = useRef(false);
  useEffect(() => {
    if (referralTriedRef.current || !uid || stats.totalSolved < 10) return;
    referralTriedRef.current = true;
    maybeClaimReferral(uid, stats.totalSolved).then(bonus => {
      if (bonus > 0) {
        // Double-sided referral: the referee just earned extra trial days.
        // Refresh so the extended trial reflects, and show a one-time welcome.
        entitlement.refresh().catch(() => { /* next read catches up */ });
        setRefereeBonusDays(bonus);
      }
    });
    // referralTriedRef guards a single run; entitlement.refresh is stable enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, stats.totalSolved]);

  // ── Timed-mode duration (user-set in Settings; presets 5/10/15/20s) ──
  // Persisted + cloud-synced like the theme. Clamped to the preset list so a
  // corrupted store can't produce a 0s (unwinnable) or 10-minute (not timed)
  // ring. Applies from the NEXT problem — the ring is per-problem anyway.
  const [timedSecsRaw, setTimedSecsRaw] = useLocalState(STORAGE_KEYS.timedSecs, '10', uid); // string store
  const safeTimedSecs = (TIMED_DURATION_PRESETS as readonly number[]).includes(Number(timedSecsRaw)) ? Number(timedSecsRaw) : 10;
  const setTimedSecs = useCallback((s: number) => setTimedSecsRaw(String(s)), [setTimedSecsRaw]);
  // Speedrun problem pool — picked per race via a one-tap chooser (owner call
  // 2026-07-17): 'mix-basic' keeps the race fair for kids who haven't met
  // decimals/roots yet; 'mix-all' is the full-curriculum race.
  const [speedrunPool, setSpeedrunPool] = useState<'mix-basic' | 'mix-all'>('mix-all');
  const [speedrunChooserOpen, setSpeedrunChooserOpen] = useState(false);
  const gameConfig = useMemo(
    () => ({ ...DEFAULT_GAME_CONFIG, timedModeMs: safeTimedSecs * 1000, speedrunPoolId: speedrunPool }),
    [safeTimedSecs, speedrunPool],
  );

  const {
    problems,
    score,
    streak,
    bestStreak,
    totalCorrect,
    totalAnswered,
    answerHistory,
    chalkState,
    flash,
    frozen,
    milestone,
    speedBonus,
    handleSwipe,
    resetSession,
    getTypeTally,
    timedDurationMs,
    dailyComplete,
    speedrunFinalTime,
    speedrunElapsed,
    shieldBroken,
    wrongStreak,
  } = useGameLoop(
    generateMathItem,
    questionType,
    effectiveHard,
    challengeId,
    effectiveTimed,
    stats.streakShields,
    consumeShield,
    gameConfig, // DEFAULT_GAME_CONFIG + the user's timed-mode duration
    generateMathFiniteSet,
  );

  // ── Shield consumed toast ──
  // Edge-triggered toast: open on the rising edge of `shieldBroken`, auto-close
  // after 3s. The setState here is a one-shot synchronization with the prop
  // edge, not a feedback loop, so the lint rule's worry doesn't apply.
  const [shieldToast, setShieldToast] = useState(false);
  // Open on the rising edge of `shieldBroken`…
  useEffect(() => {
    if (shieldBroken) setShieldToast(true);
  }, [shieldBroken]);
  // …and auto-close keyed on the TOAST, not on `shieldBroken` (which flips back
  // on the next answer — that re-run would otherwise cancel the close timer and
  // strand the toast on screen, same bug class as the teacher tip).
  useEffect(() => {
    if (!shieldToast) return;
    const t = setTimeout(() => setShieldToast(false), 3000);
    return () => clearTimeout(t);
  }, [shieldToast]);

  const currentProblem = problems[0];
  const isFirstQuestion = totalAnswered === 0;
  // Timed toggling does NOT rebuild the loop (the regenerate effect only
  // watches categoryId + hardMode), so the run continues — no banking needed.
  const toggleTimedMode = useCallback(() => setTimedMode(t => !t), []);
  // toggleHardMode + switchType live below bankCurrentRun — both END the
  // current run (loop rebuild), so they bank it silently first.

  // ── First-run coach gating ──
  // Show the swipe-to-answer gesture hint only for genuinely new users — those
  // who have never solved 3+ problems before. We persist the "graduated" flag
  // so returning players don't see it on every fresh session.
  const COACH_KEY = 'math-swipe-coached';
  const hasGraduated = stats.totalSolved >= 3;
  const [showCoach, setShowCoach] = useState(() => {
    try { return !localStorage.getItem(COACH_KEY); } catch { return false; }
  });
  // One-shot graduation: when totalSolved crosses the coach threshold we
  // persist the flag and turn the coach off. Pure derived edge — not a loop.
  useEffect(() => {
    if (hasGraduated && showCoach) {
      try { localStorage.setItem(COACH_KEY, '1'); } catch { /* private mode */ }
      setShowCoach(false);
    }
  }, [hasGraduated, showCoach]);

  // ── Score floater ──
  const prevScoreRef = useRef(0);
  const [pointsFloater, setPointsFloater] = useState(0);
  useEffect(() => {
    const delta = score - prevScoreRef.current;
    prevScoreRef.current = score;
    if (delta > 0) {
      setPointsFloater(delta);
      const t = setTimeout(() => setPointsFloater(0), 800);
      return () => clearTimeout(t);
    }
  }, [score]);

  const sessionAccuracy = useMemo(() =>
    answerHistory.length > 0
      ? Math.round(answerHistory.filter(Boolean).length / answerHistory.length * 100)
      : 0,
    [answerHistory]
  );

  // ── Session summary (auto-show on daily/speedrun finish) ──
  const { showSummary, setShowSummary, isNewSpeedrunRecord } = useAutoSummary(
    dailyComplete, speedrunFinalTime, stats.bestSpeedrunTime, updateBestSpeedrunTime, hardMode
  );

  // ── Push event flusher: drain SW-queued click events to Firestore ──
  useEffect(() => {
    if (!uid) return;
    void flushPendingPushEvents(uid);
    return attachPushEventFlushListener(uid);
  }, [uid]);

  // ── Ping Listener (Async Taunts) ──
  const [pingMessage, setPingMessage] = useState<string | null>(null);

  // The teacher bubble shows `pingMessage` (a ping OR a teacher tip) OVER the
  // normal per-answer message, so if it's ever left set the teacher freezes on
  // it and no other message renders again (Teacher.tsx). The single auto-clear
  // MUST be keyed on `pingMessage` itself — NOT on gameplay deps — so the next
  // answer can't fire an effect-cleanup that cancels the timer and strands the
  // bubble. (Bug: tips/pings were cleared from effects keyed on
  // totalAnswered/streak, which change on every answer.)
  useEffect(() => {
    if (pingMessage === null) return;
    const t = setTimeout(() => setPingMessage(null), 6000);
    return () => clearTimeout(t);
  }, [pingMessage]);

  // ── Teacher tips — feature discovery in the teacher's voice ──
  // Replaces the old floating banner prompts. At most one tip per session,
  // each shown once ever, delivered through the teacher's speech bubble
  // (the pingMessage channel), never through new chrome.
  const tipShownThisSession = useRef(false);
  useEffect(() => {
    if (tipShownThisSession.current) return;
    if (activeTab !== 'game' || pingMessage !== null) return;
    if (totalAnswered < 3) return; // let the session settle first
    const tip = nextTeacherTip({
      streak, totalAnswered, totalSolved: stats.totalSolved, questionType,
    });
    if (!tip) return;
    tipShownThisSession.current = true;
    markTipSeen(tip.id);
    setPingMessage(tip.text); // cleared by the pingMessage-keyed effect above
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, totalAnswered, streak, questionType]);
  useEffect(() => {
    if (!uid) return;
    let unsub: (() => void) | undefined;
    let cancelled = false;
    Promise.all([getFirebase(), import('firebase/firestore')]).then(([{ db }, fs]) => {
      if (cancelled) return;
      const { collection, query, where, onSnapshot, doc, updateDoc, orderBy, limit } = fs;
      const q = query(
        collection(db, FIRESTORE.PINGS),
        where('targetUid', '==', uid),
        where('read', '==', false),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      unsub = onSnapshot(q, (snap) => {
        if (snap.empty) return;
        const pingDoc = snap.docs[0];
        const data = pingDoc.data();
        // Sanitize incoming senderName: it's user-controlled; render as text only.
        // React already escapes it, but cap the length defensively.
        const senderName = String(data.senderName ?? 'Someone').slice(0, 20);
        setPingMessage(t('game.ping.challenged', { name: senderName }));

        // Mark as read so it doesn't pop again
        updateDoc(doc(db, FIRESTORE.PINGS, pingDoc.id), { read: true }).catch(() => { /* silent */ });
        // Auto-clear is handled by the pingMessage-keyed effect above.
      }, (err) => {
        console.warn('Ping listener failed:', err);
      });
    }).catch((err) => console.warn('Ping listener init failed:', err));
    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [uid]);

  // Track previous tab for session recording (handled in handleTabChange)
  const prevTab = useRef<Tab>('game');
  useEffect(() => {
    prevTab.current = activeTab;
  }, [activeTab]);

  // ── Achievements ──
  const [unlocked, setUnlocked] = useState(() => loadUnlocked());
  const unlockedRef = useRef(unlocked);
  useEffect(() => { unlockedRef.current = unlocked; }, [unlocked]);
  // Achievement unlock toasts — Minecraft-style: slide in top-right, auto-
  // dismiss, and if several unlock at once they queue and show one at a time.
  // currentToast is the queue head (derived); the effect dequeues after a beat.
  const [achievementQueue, setAchievementQueue] = useState<{ id: string; name: string }[]>([]);
  const [currentToast, setCurrentToast] = useState<{ id: string; name: string } | null>(null);
  // Pull the next queued unlock onto the display when the current one clears.
  // Held back while a milestone burst is playing so the two celebrations don't
  // stack — the queue persists, so the toast simply drains once the burst ends.
  useEffect(() => {
    if (currentToast || milestone || achievementQueue.length === 0) return;
    setCurrentToast(achievementQueue[0]);
    setAchievementQueue(q => q.slice(1));
  }, [currentToast, milestone, achievementQueue]);
  // Auto-dismiss the current toast after a beat.
  useEffect(() => {
    if (!currentToast) return;
    const t = setTimeout(() => setCurrentToast(null), 2800);
    return () => clearTimeout(t);
  }, [currentToast]);

  // Restore achievements from Firestore on auth
  useEffect(() => {
    if (!uid) return;
    restoreUnlockedFromCloud(uid).then(restored => {
      if (restored) {
        setUnlocked(restored);
        unlockedRef.current = restored;
      }
    });
  }, [uid]);

  // Check achievements continuously, including BEFORE recordSession fires.
  // Without the in-session totalAnswered/totalCorrect added to the snapshot,
  // the "First Steps" achievement only unlocks when the user navigates away
  // from the game tab — the *wrong* moment for the dopamine hit. Adding the
  // in-session counts means the badge unlocks the instant they answer their
  // first problem, which is the habit-formation lever per the conversion
  // mechanics decisions (monetization_model.md, 2026-05-12).
  useEffect(() => {
    const snap = {
      ...stats,
      bestStreak: Math.max(stats.bestStreak, bestStreak),
      totalSolved: stats.totalSolved + totalAnswered,
      totalCorrect: stats.totalCorrect + totalCorrect,
      referralCount,
      referralConversions,
    };
    const fresh = checkAchievements(EVERY_MATH_ACHIEVEMENT, snap, unlockedRef.current);
    if (fresh.length > 0) {
      const next = new Set(unlockedRef.current);
      fresh.forEach(id => next.add(id));
      setUnlocked(next);
      saveUnlocked(next, uid);
      // Enqueue every fresh unlock — the queue shows them one at a time.
      // Haptic match: achievement unlocks buzz like streak milestones.
      const items = fresh
        .map(id => EVERY_ACHIEVEMENT.find(a => a.id === id))
        .filter((b): b is NonNullable<typeof b> => !!b)
        .map(b => ({ id: b.id, name: achName(b.id) }));
      if (items.length) {
        hapticMilestone();
        setAchievementQueue(q => [...q, ...items]);
      }
    }
  }, [stats, bestStreak, totalAnswered, totalCorrect, uid, referralCount, referralConversions]);

  // ── Paywall trigger (value-anchored, post-expiry) ──
  // Fires the paywall AFTER the user completes their first problem in a
  // non-daily session, once their trial has expired. The dopamine of
  // earning XP lands first, then the ask. Daily Challenge sessions are
  // exempt entirely — those stay free forever (see monetization_model.md).
  //
  // Rule lives in shouldFirePaywall() so the truth-table is unit-tested
  // and there's no drift between this useEffect and the spec.
  useEffect(() => {
    if (shouldFirePaywall({
      status: entitlement.status,
      questionType,
      totalAnswered,
      paywallOpen,
    })) {
      setPaywallMode('expired');
      setPaywallOpen(true);
    }
  }, [entitlement.status, questionType, totalAnswered, paywallOpen]);

  // NB: the Magic tab is NOT walled on entry. Opening it always shows the
  // tricks list — the free starter set (isFreeTrick) is playable by everyone
  // (trial, expired, or paid, mirroring the always-free Daily), and the Pro
  // tricks render locked. The paywall is value-anchored: it fires only when a
  // user taps a *locked* Pro trick (TricksPage → onProLocked → requestPro), not
  // on tab entry. A previous effect here hard-walled the whole tab for expired
  // users, so they never saw a single trick — the opposite of the free-starter
  // intent, and a paywall-before-value we explicitly avoid. Removed 2026-07-23.

  // Auto-close the paywall the instant the user has paid, and celebrate the
  // unlock ONCE. The webhook/verify has written paidAt by now; this fires on
  // every channel (native in-place, TWA, and the Airwallex web return) because
  // it keys off the paid status, not the purchase call. Keyed on uid in
  // localStorage so it shows exactly once per person — never again on later
  // launches for an already-paid user.
  useEffect(() => {
    if (entitlement.status !== 'paid') return;
    if (paywallOpen) setPaywallOpen(false);
    setConfirmingPayment(false);
    if (!uid) return;
    markFunnel(uid, 'purchase');
    try {
      if (localStorage.getItem('mc-purchase-celebrated') !== uid) {
        localStorage.setItem('mc-purchase-celebrated', uid);
        setCelebrateOpen(true);
      }
    } catch { /* storage unavailable → skip the celebration, not the unlock */ }
  }, [entitlement.status, paywallOpen, uid]);

  // ── Growth funnel milestones (see utils/funnel.ts + /admin/funnel) ──
  // Each mark is set-once per device; the admin view aggregates conversion.
  useEffect(() => {
    if (!uid) return;
    markFunnel(uid, 'firstOpen');
    touchFunnelActive(uid);
  }, [uid]);
  useEffect(() => {
    if (uid && totalAnswered >= 1) markFunnel(uid, 'firstPlay');
  }, [uid, totalAnswered]);
  useEffect(() => {
    if (uid && paywallOpen) markFunnel(uid, 'paywallView');
  }, [uid, paywallOpen]);

  // ── Well-timed push nudge (PushNudge) ── Ask ONCE, after an engaged session,
  // and only between sessions (never mid-play or on launch). Qualify when the
  // summary appears; show after it's dismissed so nothing stacks.
  useEffect(() => {
    if (!showSummary || !uid) return;
    try { if (localStorage.getItem('mc-push-nudged') === uid) return; } catch { return; }
    if (stats.totalSolved < 10) return;   // only ask someone who's actually engaged
    getPushStatus(uid).then(st => {
      if (st.available && !st.granted && !st.prefs?.dailyEnabled) pushNudgePendingRef.current = true;
    }).catch(() => { /* ignore */ });
  }, [showSummary, uid, stats.totalSolved]);
  useEffect(() => {
    if (showSummary || paywallOpen || celebrateOpen || !pushNudgePendingRef.current || !uid) return;
    pushNudgePendingRef.current = false;
    try { localStorage.setItem('mc-push-nudged', uid); } catch { /* ignore */ }
    setPushNudgeOpen(true);
  }, [showSummary, paywallOpen, celebrateOpen, uid]);
  useEffect(() => {
    if (refereeBonusDays <= 0) return;
    const timer = setTimeout(() => setRefereeBonusDays(0), 5000);
    return () => clearTimeout(timer);
  }, [refereeBonusDays]);

  // Native shell only (no-ops elsewhere): ask for a Play in-app review at a
  // genuine peak — a strong session just ended. Throttled internally to at most
  // ~once / 45 days, and Play quota-limits the card on top of that.
  useEffect(() => {
    if (!showSummary) return;
    maybeRequestReview(accuracy >= 90 && totalAnswered >= 10);
  }, [showSummary, accuracy, totalAnswered]);

  // Native shell only: keep the home-screen widget's streak + Daily state fresh.
  useEffect(() => {
    pushWidgetStats(stats.dayStreak, stats.lastDailyDate === todayKey());
  }, [stats.dayStreak, stats.lastDailyDate]);

  // Pro gate: paid unlocks the Pro set (advanced modes, full Magic Tricks, Pro
  // cosmetics) even during the trial. Tapping a locked Pro thing opens the
  // upsell — dismissible during the trial, the hard gate once expired.
  const hasPro = entitlement.isPaid;
  const requestPro = useCallback(() => {
    setPaywallMode(entitlement.status === 'expired' ? 'expired' : 'pro');
    setPaywallOpen(true);
  }, [entitlement.status]);

  // ── Personal best detection ──
  const showPB = usePersonalBest(bestStreak, stats.bestStreak);

  // ── First-correct-of-the-day flourish ──
  // Triggers once per device per day when the user answers correctly.
  // Dismisses itself after the animation completes (~2s) via the dismiss callback.
  const dailyFlourish = useFirstCorrectFlourish(flash);

  // Infinite free play (the default mode) vs the self-ending finite sets.
  // Free-play runs only end at an explicit boundary — the EndRunDialog on tab
  // leave, or a mid-run topic/hard-mode switch (banked silently).
  const isInfinitePlay = questionType !== 'daily' && questionType !== 'challenge' && questionType !== 'speedrun';

  // End-run flow state: pendingTab holds where the player was headed while the
  // dialog (and then the summary) is up; endRunSummary feeds the summary from
  // the banked snapshot (the live loop is already reset by then).
  const [pendingTab, setPendingTab] = useState<Tab | null>(null);
  // Same courtesy for a mid-run TOPIC change (tester report 2026-07-17: the
  // silent score/streak reset read as data loss, inconsistent with the
  // tab-leave confirm). Holds the requested type while the dialog is up.
  const [pendingSwitch, setPendingSwitch] = useState<QuestionType | null>(null);
  const [endRunSummary, setEndRunSummary] = useState<SharePayloadArgs | null>(null);

  /** Bank the current run exactly once: record stats (with the per-operation
   *  tally) + persist the share snapshot. Returns the snapshot, or null when
   *  there's nothing to bank. Does NOT reset the loop — callers own that. */
  const bankCurrentRun = useCallback((): SharePayloadArgs | null => {
    if (totalAnswered === 0) return null;
    const args: SharePayloadArgs = {
      xp: score, streak: bestStreak,
      accuracy: Math.round((totalCorrect / totalAnswered) * 100),
      history: answerHistory,
      solved: totalAnswered, correct: totalCorrect,
      questionType,
      hardMode: effectiveHard, timedMode: effectiveTimed,
      speedrunTime: speedrunFinalTime,
    };
    // Read the per-operation tally BEFORE any reset clears it (getTypeTally
    // returns a snapshot copy, so the value is safe once captured here).
    recordSession(score, totalCorrect, totalAnswered, bestStreak, questionType, effectiveHard, effectiveTimed, getTypeTally());
    snapshotSession(args);
    return args;
  }, [score, totalCorrect, totalAnswered, bestStreak, questionType, effectiveHard, effectiveTimed, speedrunFinalTime, answerHistory, recordSession, getTypeTally, snapshotSession]);

  // ── Mid-run topic change: same End-run confirm as tab-leave ──
  // Changing topic rebuilds the loop, which ENDS the run mechanically. It
  // used to bank silently, but the visible score/streak reset with no warning
  // read as data loss (tester report 2026-07-17) — and was inconsistent with
  // the tab-leave dialog. Now: mid-run topic taps hold the switch and ask;
  // "Keep playing" cancels, "End" banks → summary → applies the switch.
  const switchType = useCallback((t: QuestionType) => {
    if (t === questionType) return;
    if (isInfinitePlay && totalAnswered > 0) {
      setPendingSwitch(t);
      return;
    }
    if (isInfinitePlay) bankCurrentRun(); // no answers → no-op
    setQuestionType(t);
  }, [questionType, isInfinitePlay, totalAnswered, bankCurrentRun]);

  const toggleHardMode = useCallback(() => {
    if (isInfinitePlay) bankCurrentRun();
    setHardMode(h => !h);
  }, [isInfinitePlay, bankCurrentRun]);

  const handleTabChange = useCallback((tab: Tab) => {
    if (prevTab.current === 'game' && tab !== 'game' && totalAnswered > 0) {
      // Infinite free play: the run has no natural end, so leaving the tab IS
      // the end — but that's the player's call. Hold the navigation and ask
      // (EndRunDialog): end → bank → summary → land on the chosen tab;
      // keep playing → stay here with the run untouched.
      if (isInfinitePlay) {
        setPendingTab(tab);
        return;
      }
      // Finite sets (daily/challenge/speedrun): silent bank + reset, as ever.
      bankCurrentRun();
      resetSession();
    }
    setActiveTab(tab);
  }, [totalAnswered, isInfinitePlay, bankCurrentRun, resetSession]);

  // ── Rail share payload ──
  // The game-rail share button shares something REAL: the live run when one
  // is in progress, else the last banked session (kept across tab switches +
  // reloads), else null → ActionButtons falls back to the generic app plug.
  const railSharePayload = useMemo(() => {
    const profileUrl = (uid && user?.displayName)
      ? `${window.location.origin}/u/${buildProfileSlug(user.displayName, uid, claimedHandle)}`
      : null;
    if (totalAnswered > 0) {
      return buildSharePayloadFromArgs({
        xp: score, streak: bestStreak,
        accuracy: Math.round((totalCorrect / totalAnswered) * 100),
        history: answerHistory, questionType,
        hardMode: effectiveHard, timedMode: effectiveTimed,
        speedrunTime: speedrunFinalTime, profileUrl,
        referrerUid: uid,
      });
    }
    if (lastSession) {
      return buildSharePayloadFromArgs({ ...lastSession, profileUrl, referrerUid: uid });
    }
    return null;
  }, [uid, user?.displayName, claimedHandle, totalAnswered, score, bestStreak, totalCorrect, answerHistory, questionType, effectiveHard, effectiveTimed, speedrunFinalTime, lastSession]);

  // ── Tab swipe (non-game tabs only) ──
  const handleTabSwipe = useCallback((_: unknown, info: PanInfo) => {
    if (isMagicLessonActive) return;
    if (activeTab === 'game') return; // game uses horizontal swipe for answers
    const t = 80;
    const idx = TAB_ORDER.indexOf(activeTab);
    if ((info.offset.x < -t || info.velocity.x < -400) && idx < TAB_ORDER.length - 1) {
      handleTabChange(TAB_ORDER[idx + 1]);
    } else if ((info.offset.x > t || info.velocity.x > 400) && idx > 0) {
      handleTabChange(TAB_ORDER[idx - 1]);
    }
  }, [activeTab, handleTabChange, isMagicLessonActive]);

  const [activeCostume, handleCostumeChange] = useLocalState(STORAGE_KEYS.costume, '', uid);
  const [activeTrailId, handleTrailChange] = useLocalState(STORAGE_KEYS.trail, '', uid);

  // ── Teacher (companion character) ──
  const [savedTeacherId, setSavedTeacherId] = useLocalState('math-swipe-teacher', DEFAULT_TEACHER_ID, uid);
  const unlockedTeacherIds = useMemo(() => {
    const set = new Set<string>([DEFAULT_TEACHER_ID]);
    for (const t of TEACHERS) {
      // Free tier = the default teacher only (owner call 2026-07-16); paid
      // users still EARN the rest via the unlock checks. Also gates the
      // mode-based auto-swaps in resolveActiveTeacher.
      if (t.isDefault || (hasPro && t.unlock && t.unlock.check(stats))) set.add(t.id);
    }
    return set;
  }, [stats, hasPro]);
  const isMagicLessonForTeacher = activeTab === 'magic' && isMagicLessonActive;
  const activeTeacher = useMemo(() => resolveActiveTeacher(savedTeacherId, {
    isHardMode: effectiveHard,
    isTimedMode: effectiveTimed,
    isSpeedrun: questionType === 'speedrun',
    isMagicLesson: isMagicLessonForTeacher,
    isStruggling: wrongStreak >= 3,
    unlocked: unlockedTeacherIds,
  }), [savedTeacherId, effectiveHard, effectiveTimed, questionType, isMagicLessonForTeacher, wrongStreak, unlockedTeacherIds]);

  // ── Chalk themes ──
  const [activeThemeId, setActiveThemeId] = useLocalState(STORAGE_KEYS.chalkTheme, 'classic', uid);
  useEffect(() => {
    const t = CHALK_THEMES.find(th => th.id === activeThemeId);
    if (t) applyTheme(t);
  }, [activeThemeId]); // themeMode dep added below after declaration

  // Persist cosmetics to Firebase payload
  useEffect(() => {
    if (!uid) return;
    updateCosmetics(activeThemeId as string, activeCostume as string, activeTrailId as string);
  }, [uid, activeThemeId, activeCostume, activeTrailId, updateCosmetics]);

  const handleThemeChange = useCallback((t: ChalkTheme) => setActiveThemeId(t.id), [setActiveThemeId]);

  // ── Theme mode (dark/light) ──
  const [themeMode, setThemeMode] = useLocalState(STORAGE_KEYS.theme, 'dark', uid);
  useEffect(() => {
    applyMode(themeMode as 'dark' | 'light');
    // Re-apply chalk theme colours for the new mode (dark uses .color, light uses .lightColor)
    const t = CHALK_THEMES.find(th => th.id === activeThemeId);
    if (t) applyTheme(t);
  }, [themeMode, activeThemeId]);
  const toggleThemeMode = useCallback(() => {
    setThemeMode(themeMode === 'dark' ? 'light' : 'dark');
  }, [themeMode, setThemeMode]);
  // ── Age band (removed as a user-facing concept 2026-07-15) ──
  // Testers found the starter/full picker confusing and unnecessary, so
  // everyone now gets the full topic set. Kept as a constant (rather than
  // ripping typesForBand out everywhere) so the topic-filtering plumbing is
  // untouched and a band could return later without a big refactor.
  const ageBand: AgeBand = 'full';


  // NOTE: we intentionally do NOT block first paint on Firebase auth. The
  // game (problem generation, difficulty, local stats) is fully local, so we
  // render immediately with uid=null and let auth + entitlement hydrate in
  // the background (Firebase itself loads lazily — see utils/firebase.ts).
  // Every uid-consuming effect already guards on `if (!uid) return`, and the
  // paywall is a post-answer overlay, never an app-open gate — so there's no
  // paywall flash while entitlement resolves.

  // Public profile route — its own surface, replaces the rest of the app.
  // Anonymous Firebase auth fires automatically for visitors landing here
  // from a shared link, so the Firestore read below works without login.
  if (profileSlug) {
    return (
      <BlackboardLayout>
        <TabErrorBoundary><Suspense fallback={<TabSkeleton variant="generic" />}>
          <ProfilePage
            slug={profileSlug}
            onChallenge={(id, targetTimeMs) => {
              // Switch into challenge mode and clear the profile route. When
              // the profile owner has a real speedrun time we carry it as the
              // target so the receiver has a genuine number to beat, on the
              // same deterministically-seeded set.
              setChallengeId(id);
              setChallengeTarget(targetTimeMs ? { score: null, timeMs: targetTimeMs } : null);
              setQuestionType('challenge' as QuestionType);
              setProfileSlug(null);
              window.history.replaceState({}, '', '/');
            }}
            onBackToGame={() => {
              setProfileSlug(null);
              window.history.replaceState({}, '', '/');
            }}
          />
        </Suspense></TabErrorBoundary>
      </BlackboardLayout>
    );
  }

  // Static legal pages — refund / privacy / terms. Drafts marked at top;
  // see LegalPages.tsx. Linked from the Paywall + Me-tab footer rows.
  if (legalRoute) {
    return (
      <BlackboardLayout>
        <LegalPage
          doc={legalRoute}
          onBack={() => {
            setLegalRoute(null);
            window.history.replaceState({}, '', '/');
          }}
        />
      </BlackboardLayout>
    );
  }

  // Admin routes — owner-only by Firebase custom claim. Each renders its
  // own authorization gate so non-admins get a clean "back to game" path
  // if they stumble onto the URL.
  if (adminRoute === 'push') {
    return (
      <BlackboardLayout>
        <Suspense fallback={<TabSkeleton variant="generic" />}>
          <AdminPushAnalytics
            onBackToGame={() => {
              setAdminRoute(null);
              window.history.replaceState({}, '', '/');
            }}
          />
        </Suspense>
      </BlackboardLayout>
    );
  }
  if (adminRoute === 'billing') {
    return (
      <BlackboardLayout>
        <Suspense fallback={<TabSkeleton variant="generic" />}>
          <AdminBilling
            onBackToGame={() => {
              setAdminRoute(null);
              window.history.replaceState({}, '', '/');
            }}
          />
        </Suspense>
      </BlackboardLayout>
    );
  }
  if (adminRoute === 'errors') {
    return (
      <BlackboardLayout>
        <Suspense fallback={<TabSkeleton variant="generic" />}>
          <AdminErrors
            onBackToGame={() => {
              setAdminRoute(null);
              window.history.replaceState({}, '', '/');
            }}
          />
        </Suspense>
      </BlackboardLayout>
    );
  }
  if (adminRoute === 'funnel') {
    return (
      <BlackboardLayout>
        <Suspense fallback={<TabSkeleton variant="generic" />}>
          <AdminFunnel
            onBackToGame={() => {
              setAdminRoute(null);
              window.history.replaceState({}, '', '/');
            }}
          />
        </Suspense>
      </BlackboardLayout>
    );
  }

  return (
    <>

      <BlackboardLayout>
        <OfflineBanner />
        {/* Suppress only during *active* gameplay — not the whole game tab.
            Showing the prompt when the user has just opened the app (still
            on the home screen, hasn't answered a question yet) is fine and
            necessary so they actually get the update. The old condition
            `activeTab === 'game'` suppressed on the default tab, meaning
            users who never left it never saw the prompt. */}
        <ReloadPrompt suppress={activeTab === 'game' && totalAnswered > 0} />
        {/* ── Global Canvas Overlay (Swipe Trail) ── */}
        <SwipeTrail
          streak={streak}
          activeTrailId={activeTrailId as string}
          baseColor={getThemeDisplayColor(activeThemeId as string)}
        />

        {/* (Top-right theme toggle removed 2026-07-17 — owner call: dark is
            the default; light mode is a set-once preference and now lives as
            a Settings row. One less always-visible button on the board.) */}

        {activeTab === 'game' && (
          <div ref={(el) => {
            // Restart CSS animation without remounting entire subtree.
            // Sets `--bounce-strength` CSS custom property so the bounce
            // amplitude scales with current streak — bigger bounce when
            // you're rolling. .wrong-shake-near is a gentler shake for
            // "almost right" answers (off-by-one or within 15%).
            if (el && flash !== 'none') {
              el.classList.remove('wrong-shake', 'wrong-shake-near', 'answer-bounce');
              void el.offsetHeight; // force reflow
              if (flash === 'correct') {
                // 0 streak → 1.0× scale, 10 streak → 1.18×, 25 streak → 1.30× (capped)
                const strength = 1 + Math.min(streak * 0.012, 0.30);
                el.style.setProperty('--bounce-strength', String(strength));
                el.classList.add('answer-bounce');
              } else if (flash === 'near-miss') {
                el.classList.add('wrong-shake-near');
              } else if (flash === 'wrong' && !shieldBroken) {
                el.classList.add('wrong-shake');
              }
            }
          }} className="flex-1 flex flex-col w-full">
            {/* ── Score (centered, pushed down from edge) ── */}
            <div className="landscape-score flex flex-col items-center pt-[calc(env(safe-area-inset-top,16px)+28px)] pb-5 z-30">
              {/* Mode headers — Challenge / Speedrun / Daily get a small
                  status banner above the score so users know they're in a
                  finite-length session. Without it, the only mode indicator
                  was the calendar/sword/stopwatch icon in the action
                  sidebar — easy to miss. */}
              {questionType === 'challenge' && (
                <div className="mb-2 flex flex-col items-center gap-0.5">
                  <div className="text-xs ui text-[var(--color-gold)] flex items-center gap-2">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <line x1="5" y1="5" x2="19" y2="19" />
                      <line x1="19" y1="5" x2="5" y2="19" />
                    </svg>
                    <span>{t('game.mode.challenge')}</span>
                    <span className="text-[rgb(var(--color-fg))]/30">·</span>
                    <span className="text-[rgb(var(--color-fg))]/40">{totalAnswered}/10</span>
                  </div>
                  {/* Target overlay — only when the link carried a target. Shows
                      what the sender scored so the receiver has something
                      concrete to beat (asymmetric-link payoff). */}
                  {challengeTarget && (challengeTarget.score !== null || challengeTarget.timeMs !== null) && (
                    <div className="text-[10px] ui text-[var(--color-gold)]/70">
                      {challengeTarget.timeMs !== null
                        ? t('game.beatTime', { time: (challengeTarget.timeMs / 1000).toFixed(1) })
                        : t('game.beatScore', { pts: challengeTarget.score ?? 0 })}
                      {score > 0 && challengeTarget.score !== null && score >= challengeTarget.score && (
                        <span className="text-[var(--color-correct)] ml-1">{t('game.passed')}</span>
                      )}
                    </div>
                  )}
                </div>
              )}
              {questionType === 'speedrun' && (
                <div className="mb-2 flex flex-col items-center gap-0.5">
                  {/* Chalk-colored, not purple — the race screen keeps the
                      board's two-hue rule: chalk + gold (owner call 2026-07-17). */}
                  <div className="text-xs ui text-[var(--color-chalk)] flex items-center gap-2">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <circle cx="12" cy="14" r="7" />
                      <line x1="12" y1="14" x2="15" y2="11" />
                      <line x1="10" y1="2" x2="14" y2="2" />
                      <line x1="12" y1="2" x2="12" y2="5" />
                    </svg>
                    <span>{t('game.mode.speedrun')}</span>
                    <span className="text-[rgb(var(--color-fg))]/30">·</span>
                    <span className="text-[rgb(var(--color-fg))]/40">{totalCorrect}/10</span>
                  </div>
                  {challengeTarget && challengeTarget.timeMs !== null && (
                    <div className="text-[10px] ui text-[var(--color-chalk)]/70">
                      {t('game.beatTime', { time: (challengeTarget.timeMs / 1000).toFixed(1) })}
                    </div>
                  )}
                </div>
              )}
              {questionType === 'daily' && (
                <div className="mb-2 flex flex-col items-center gap-0.5">
                  <div className="text-xs ui text-[var(--color-gold)] flex items-center gap-2">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <rect x="3" y="5" width="18" height="16" rx="2" />
                      <line x1="8" y1="3" x2="8" y2="7" />
                      <line x1="16" y1="3" x2="16" y2="7" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                      <circle cx="12" cy="15" r="1.2" fill="currentColor" stroke="none" />
                    </svg>
                    <span>{t('game.mode.daily')}</span>
                    <span className="text-[rgb(var(--color-fg))]/30">·</span>
                    <span className="text-[rgb(var(--color-fg))]/40">{totalAnswered}/10</span>
                  </div>
                  {challengeTarget && challengeTarget.score !== null && (
                    <div className="text-[10px] ui text-[var(--color-gold)]/70">
                      {t('game.beatScore', { pts: challengeTarget.score })}
                      {score >= challengeTarget.score && (
                        <span className="text-[var(--color-correct)] ml-1">{t('game.passed')}</span>
                      )}
                    </div>
                  )}
                </div>
              )}
              {questionType === 'speedrun' ? (
                <div className="chalk text-[var(--color-chalk)] text-7xl leading-none tabular-nums">
                  {((speedrunFinalTime ?? speedrunElapsed) / 1000).toFixed(1)}<span className="text-3xl">s</span>
                </div>
              ) : (
                <ScoreCounter value={score} />
              )}

              {/* Shield count */}
              {/* Screen reader announcement for game feedback */}
              <div className="sr-only" role="status" aria-live="assertive">
                {flash === 'correct' && t('game.sr.correct', { streak })}
                {flash === 'near-miss' && t('game.sr.nearMiss')}
                {flash === 'wrong' && (shieldBroken ? t('game.sr.wrongShield') : t('game.sr.wrong'))}
                {milestone && t('game.sr.milestone', { streak })}
              </div>
              {stats.streakShields > 0 && streak > 0 && (
                <div className="text-[rgb(var(--color-fg))]/30 mt-1 flex items-center gap-0.5">
                  {Array.from({ length: stats.streakShields }, (_, i) => <ShieldIcon key={i} size={11} />)}
                </div>
              )}

              {/* Streak display.
                  Tiers:
                    2     → two dim dots (subtle "you're on a thing")
                    3-5   → bright dots + gold "×N" label (visible reward)
                    6-9   → "N×" pill in gold
                    10+   → "🔥 N×" with the on-fire glow */}
              <AnimatePresence>
                {streak > 1 && (
                  <motion.div
                    key="streak"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="mt-2 flex items-center gap-1.5"
                  >
                    {streak <= 5 ? (
                      <>
                        {/* Dots — saturate fully at streak ≥ 3 to celebrate earlier wins */}
                        <div className="flex gap-1">
                          {Array.from({ length: streak }, (_, i) => (
                            <motion.div
                              key={i}
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: i * 0.04 }}
                              className={`w-2 h-2 rounded-full ${streak >= 3 ? 'bg-[var(--color-gold)]' : 'bg-[var(--color-gold)]/60'}`}
                            />
                          ))}
                        </div>
                        {/* Gold "×N" appears at 3 to make the streak feel rewarding before reaching 6 */}
                        {streak >= 3 && (
                          <motion.span
                            key={`mini-mult-${streak}`}
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-xs ui font-semibold text-[var(--color-gold)]"
                          >
                            {streak}×
                          </motion.span>
                        )}
                      </>
                    ) : (
                      /* Multiplier label for 6+ */
                      <span
                        className={`text-sm ui font-semibold ${streak >= 10
                          ? 'text-[var(--color-streak-fire)] on-fire'
                          : 'text-[var(--color-gold)]'
                          }`}
                      >
                        {streak >= 10 ? <span className="inline-flex items-center gap-0.5"><FlameIcon size={12} />{streak}×</span> : `${streak}×`}
                      </span>
                    )}
                    {/* Milestone pulse — added 3 so the first sub-milestone gets a celebration too */}
                    {[3, 5, 10, 20, 50].includes(streak) && (
                      <motion.div
                        key={`milestone-glow-${streak}`}
                        className="absolute inset-0 rounded-full pointer-events-none"
                        initial={{ scale: 1, opacity: 0.6 }}
                        animate={{ scale: 2.5, opacity: 0 }}
                        transition={{ duration: 0.6 }}
                        style={{ background: 'var(--color-gold)', filter: 'blur(8px)' }}
                      />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Daily streak */}
              {stats.dayStreak > 0 && (
                <div className="mt-1 flex items-center justify-center gap-1 text-[10px] ui text-[rgb(var(--color-fg))]/25">
                  <span className="inline-flex items-center gap-0.5"><FlameIcon size={10} /> {t('hud.dayStreak', { count: stats.dayStreak })}</span>
                  {(stats.streakShields || 0) > 0 && (
                    <span className="text-[var(--color-gold)] opacity-80 inline-flex items-center gap-0.5" title={t('hud.streakFreeze.title')}>
                      {Array.from({ length: stats.streakShields }, (_, i) => <ShieldIcon key={i} size={10} />)}
                    </span>
                  )}
                </div>
              )}

              {/* Banner prompts (speedrun CTA, level-up nudge) were removed
                  2026-07-16 — feature discovery now belongs to the TEACHER's
                  speech bubble (owner call: quieter board, stronger bond). */}
              {/* Daily challenge callout. Three states:
                    - not started today      → "📅 Daily challenge available"
                    - started but unfinished → "📅 Daily: 3/10 — finish it"
                    - completed today        → suppressed (no point re-pitching)
                  Hidden in hard/timed mode because the daily set isn't designed for those modifiers. */}
              {/* Mode chips — Daily + Speedrun in ONE compact row (owner call
                  2026-07-17: the stacked wordy pills were crowding the board).
                  Icon + one word each; the daily chip carries its progress
                  count when a set is underway, and disappears once today's
                  daily is done (Speedrun then centers alone). Speedrun lives
                  here, not in League — League reviews scores. */}
              {(() => {
                if (!isFirstQuestion || hardMode || timedMode) return null;
                if (questionType === 'daily' || questionType === 'speedrun' || questionType === 'challenge') return null;
                const today = todayKey();
                const startedToday = stats.lastDailyDate === today && stats.todayDailySolved > 0;
                const dailyTotal = 10; // Matches DAILY_COUNT in mathDailyConfig
                const completedToday = startedToday && stats.todayDailySolved >= dailyTotal;
                const chip = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] ui font-semibold transition-colors';
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mt-2 flex items-center justify-center gap-2"
                  >
                    {!completedToday && (
                      <button
                        className={`${chip} ${startedToday
                          ? 'border-[var(--color-gold)]/60 text-[var(--color-gold)] bg-[var(--color-gold)]/10 active:bg-[var(--color-gold)]/20'
                          : 'border-[var(--color-gold)]/40 text-[var(--color-gold)]/90 bg-[var(--color-gold)]/5 active:bg-[var(--color-gold)]/15'}`}
                        onClick={() => switchType('daily' as QuestionType)}
                      >
                        {/* Hand-drawn calendar icon — matches CategoryIcon('daily') */}
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <rect x="3" y="5" width="18" height="16" rx="2" />
                          <line x1="8" y1="3" x2="8" y2="7" />
                          <line x1="16" y1="3" x2="16" y2="7" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                          <circle cx="12" cy="15" r="1.2" fill="currentColor" stroke="none" />
                        </svg>
                        {startedToday
                          ? t('game.dailyChip', { solved: stats.todayDailySolved, total: dailyTotal })
                          : t('cat.daily')}
                      </button>
                    )}
                    {/* Neutral, not purple — the play board carries exactly two
                        hues: the player's chalk color + gold (tester call
                        2026-07-17: a third hue is jarring). Daily keeps gold
                        (the retention loop deserves the accent); Speedrun is
                        the quiet secondary. Purple stays in its home contexts
                        (League speedrun tab, in-race HUD). */}
                    <button
                      className={`${chip} border-[rgb(var(--color-fg))]/20 text-[rgb(var(--color-fg))]/60 active:bg-[rgb(var(--color-fg))]/10`}
                      onClick={() => setSpeedrunChooserOpen(true)}
                    >
                      {/* Stopwatch — matches the League tab icon */}
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <circle cx="12" cy="14" r="7" />
                        <line x1="12" y1="14" x2="15" y2="11" />
                        <line x1="10" y1="2" x2="14" y2="2" />
                        <line x1="12" y1="2" x2="12" y2="5" />
                      </svg>
                      {t('game.mode.speedrun')}
                    </button>
                  </motion.div>
                );
              })()}
            </div>

            {/* ── Points earned floater ── */}
            <AnimatePresence>
              {pointsFloater > 0 && (
                <motion.div
                  key={'pts' + score}
                  initial={{ opacity: 1, y: 0 }}
                  animate={{ opacity: 0, y: -30 }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="absolute left-1/2 -translate-x-1/2 top-[calc(env(safe-area-inset-top,16px)+100px)] z-30 text-lg chalk text-[var(--color-gold)] pointer-events-none"
                >
                  +{pointsFloater}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Main Problem Area ── */}
            <div className="flex-1 flex flex-col">
              <AnimatePresence mode="wait">
                {currentProblem && (
                  <motion.div
                    key={currentProblem.id}
                    className="flex-1 flex flex-col"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                  >
                    <ProblemView
                      problem={currentProblem}
                      frozen={frozen}
                      highlightCorrect={isFirstQuestion}
                      showHints={totalCorrect < 4}
                      coachSwipe={showCoach && isFirstQuestion && questionType !== 'speedrun' && questionType !== 'challenge'}
                      onSwipe={handleSwipe}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── TikTok-style action buttons ── Hidden entirely during a
                speedrun: the topic/mode toggles already hide there, and
                mid-race sharing is meaningless (the end summary has Share
                Result) — so the rail's last item goes too and the race
                screen is fully chrome-free (owner call 2026-07-17). */}
            {questionType !== 'speedrun' && <ActionButtons
              questionType={questionType}
              onTypeChange={switchType}
              hardMode={hardMode}
              onHardModeToggle={toggleHardMode}
              timedMode={timedMode}
              onTimedModeToggle={toggleTimedMode}
              timedDurationMs={timedDurationMs}
              problemKey={currentProblem?.id ?? null}
              ageBand={ageBand}
              hasPro={hasPro}
              onProLocked={requestPro}
              sharePayload={railSharePayload}
            />}

            {/* ── Mr. Chalk PiP ── */}
            <div className="landscape-hide">
              <Teacher
                state={chalkState}
                teacherId={activeTeacher.id}
                costume={activeCostume}
                streak={streak}
                totalAnswered={totalAnswered}
                questionType={questionType}
                hardMode={effectiveHard}
                timedMode={effectiveTimed}
                pingMessage={pingMessage}
              />
            </div>

            {/* ── Feedback flash overlay ──
                near-miss uses a warm-orange flash instead of the sharp red,
                so wrong-but-close answers don't sting like wild guesses. */}
            {flash !== 'none' && (
              <div
                className={`absolute inset-0 pointer-events-none z-30 ${flash === 'correct' ? 'flash-correct'
                  : flash === 'near-miss' ? 'flash-near-miss'
                    : 'flash-wrong'
                  }`}
              />
            )}

            {/* ── Streak milestone burst ── Theatrical overlay per tier.
                Lower tiers (sparkle/flame) stay subtle; trophy at 50 is the
                full event. See MilestoneBurst.tsx for tier definitions. */}
            <AnimatePresence>
              {milestone && (
                <MilestoneBurst key={milestone + streak} tier={milestone} streak={streak} />
              )}
            </AnimatePresence>

            {/* ── First-correct-of-day flourish ──
                Quiet welcome-back moment, once per device per day. The hook
                auto-dismisses after ~2.2s so we don't need any orchestration
                on the React side beyond <AnimatePresence>. */}
            <AnimatePresence>
              {dailyFlourish.shouldShow && (
                <DailyFlourish key="daily-flourish" dayStreak={stats.dayStreak} />
              )}
            </AnimatePresence>

            {/* ── Speed bonus ── */}
            {speedBonus && (
              <div key={'speed' + score} className="speed-pop absolute left-1/2 -translate-x-1/2 top-[30%] z-40 text-sm ui uppercase text-[var(--color-gold)] whitespace-nowrap flex items-center gap-1">
                <BoltIcon size={13} /> {t('game.speedBonus')}
              </div>
            )}

            {/* ── Personal best — hand-drawn ribbon with your specific number ──
                Lowest-priority celebration: yields to a milestone burst or an
                achievement toast so only one thing celebrates at a time. A new
                best that's also a streak tier is already covered by the burst. */}
            <AnimatePresence>
              {showPB && !milestone && !currentToast && <PersonalBestRibbon streak={bestStreak} />}
            </AnimatePresence>
          </div>
        )}

        {/* Non-game tabs (no wrapper — each page scrolls independently) */}
        {activeTab === 'league' && (
          <motion.div className="flex-1 flex flex-col min-h-0" onPanEnd={handleTabSwipe}>
            <TabErrorBoundary><Suspense fallback={<TabSkeleton variant="league" />}><LeaguePage userXP={stats.totalXP} userStreak={Math.max(stats.bestStreak, stats.hardModeBestStreak, stats.timedModeBestStreak, stats.ultimateBestStreak)} uid={uid} displayName={user?.displayName ?? t('common.you')} activeThemeId={activeThemeId as string} activeCostume={activeCostume as string} bestSpeedrunTime={stats.bestSpeedrunTime} speedrunHardMode={stats.speedrunHardMode} /></Suspense></TabErrorBoundary>
          </motion.div>
        )}

        {activeTab === 'me' && (
          <motion.div className="flex-1 flex flex-col min-h-0" onPanEnd={handleTabSwipe}>
            <TabErrorBoundary><Suspense fallback={<TabSkeleton variant="me" />}><MePage
              stats={stats}
              accuracy={accuracy}
              sessionScore={score}
              sessionStreak={bestStreak}
              unlocked={unlocked}
              activeCostume={activeCostume}
              onCostumeChange={handleCostumeChange}
              activeTheme={activeThemeId}
              onThemeChange={handleThemeChange}
              activeTrailId={activeTrailId as string}
              onTrailChange={handleTrailChange}
              displayName={user?.displayName ?? ''}
              onDisplayNameChange={setDisplayName}
              isAnonymous={user?.isAnonymous ?? true}
              email={user?.email ?? null}
              onLinkGoogle={linkGoogle}
              onLinkApple={linkApple}
              onSendEmailLink={sendEmailLink}
              authMessage={authMessage}
              onClearAuthMessage={clearAuthMessage}
              ageBand={ageBand}
              activeTeacherId={savedTeacherId as string}
              onTeacherChange={setSavedTeacherId}
              uid={uid}
              entitlementStatus={entitlement.status}
              entitlementDaysLeft={entitlement.daysLeft}
              onUnlock={() => setPaywallOpen(true)}
              hasPro={hasPro}
              onRequestPro={requestPro}
              themeMode={themeMode as string}
              onToggleTheme={toggleThemeMode}
              timedSecs={safeTimedSecs}
              onTimedSecsChange={setTimedSecs}
              referralConversions={referralConversions}
            /></Suspense></TabErrorBoundary>
          </motion.div>
        )}

        {activeTab === 'magic' && (
          <motion.div className="flex-1 flex flex-col min-h-0" onPanEnd={!isMagicLessonActive ? handleTabSwipe : undefined}>
            <TabErrorBoundary><Suspense fallback={<TabSkeleton variant="tricks" />}><TricksPage onLessonActive={setIsMagicLessonActive} hasPro={hasPro} hasAccess={entitlement.hasAccess} onProLocked={requestPro} /></Suspense></TabErrorBoundary>
          </motion.div>
        )}

        {/* ── Bottom Navigation ── */}
        <BottomNav active={activeTab} onChange={handleTabChange} />

        {/* ── Session Summary ── */}
        <SessionSummary
          solved={totalAnswered}
          correct={totalCorrect}
          bestStreak={bestStreak}
          accuracy={sessionAccuracy}
          xpEarned={score}
          answerHistory={answerHistory}
          questionType={questionType}
          visible={showSummary}
          onDismiss={() => {
            setShowSummary(false);
            // A summary only appears for a COMPLETED finite set (daily /
            // challenge / trick / speedrun), and this is the moment that
            // session is banked. Record once (guarded by totalAnswered so a
            // tab-leave that already banked it is a no-op), then reset so it
            // can't double-record or re-open.
            // Bank once (records stats + keeps the run shareable from the
            // rail button); no-op when a tab-leave already banked it.
            bankCurrentRun();
            if (questionType === 'speedrun') {
              setActiveTab('league');
              setQuestionType(defaultTypeForBand(ageBand)); // category change resets the loop
            } else {
              resetSession();
            }
          }}
          hardMode={effectiveHard}
          timedMode={effectiveTimed}
          speedrunFinalTime={speedrunFinalTime}
          isNewSpeedrunRecord={isNewSpeedrunRecord}
          displayName={user?.displayName}
          uid={uid}
          claimedHandle={claimedHandle}
          challengeId={challengeId}
          challengeTarget={challengeTarget}
          totalXP={stats.totalXP}
          onShared={recordShare}
          showBeaconHint={referralConversions === 0}
        />

        {/* ── End-run confirm (free play + tab leave) ──
            Free play has no natural end, so leaving the game tab is the run
            boundary — and the player decides: end (bank → summary → land on
            the chosen tab) or keep playing (navigation cancelled). */}
        {/* ── Speedrun pool chooser ── one tap before the race (owner call
            2026-07-17): Basic Mix (+−×÷, fair for kids who haven't met
            decimals yet) vs All Mix (full curriculum). */}
        <AnimatePresence>
          {speedrunChooserOpen && (
            <>
              <motion.div
                className="fixed inset-0 bg-[var(--color-overlay-dim)] z-[95] backdrop-blur-sm"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setSpeedrunChooserOpen(false)}
              />
              <motion.div
                role="dialog" aria-modal="true" aria-label={t('game.speedrunPick')}
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[96] bg-[var(--color-overlay)] border border-[rgb(var(--color-fg))]/15 rounded-2xl p-5 w-[270px]"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
              >
                {/* Gold, not purple — this overlay opens over the play board,
                    so the board's two-hue rule applies here too. */}
                <div className="text-sm chalk text-[var(--color-gold)] text-center mb-4">{t('game.speedrunPick')}</div>
                <div className="flex gap-3">
                  {(['mix-basic', 'mix-all'] as const).map(pool => (
                    <button
                      key={pool}
                      onClick={() => {
                        setSpeedrunPool(pool);
                        setSpeedrunChooserOpen(false);
                        switchType('speedrun' as QuestionType);
                      }}
                      className="flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border border-[rgb(var(--color-fg))]/15 text-[rgb(var(--color-fg))]/80 hover:border-[var(--color-gold)]/50 hover:text-[var(--color-gold)] active:scale-95 transition-all"
                    >
                      {/* Hand-drawn icons (the chalk-font glyph rows were
                          mush — owner call 2026-07-17): a 2×2 operator grid
                          for Arithmetic, a 3×3 "all of it" dot grid for
                          Everything. */}
                      {pool === 'mix-basic' ? (
                        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          {/* + */}<line x1="7" y1="4.5" x2="7" y2="9.5" /><line x1="4.5" y1="7" x2="9.5" y2="7" />
                          {/* − */}<line x1="14.5" y1="7" x2="19.5" y2="7" />
                          {/* × */}<line x1="5.2" y1="15.2" x2="8.8" y2="18.8" /><line x1="8.8" y1="15.2" x2="5.2" y2="18.8" />
                          {/* ÷ */}<line x1="14.5" y1="17" x2="19.5" y2="17" /><circle cx="17" cy="14.6" r="0.7" fill="currentColor" stroke="none" /><circle cx="17" cy="19.4" r="0.7" fill="currentColor" stroke="none" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" stroke="none" aria-hidden>
                          {[5, 12, 19].flatMap(y => [5, 12, 19].map(x => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.7" />))}
                        </svg>
                      )}
                      <span className="text-sm ui">{t(pool === 'mix-basic' ? 'game.poolBasic' : 'game.poolAll')}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <EndRunDialog
          open={(pendingTab !== null || pendingSwitch !== null) && endRunSummary === null}
          answered={totalAnswered}
          score={score}
          onKeepPlaying={() => { setPendingTab(null); setPendingSwitch(null); }}
          onEnd={() => {
            const args = bankCurrentRun();
            resetSession();
            if (args) {
              setEndRunSummary(args);   // summary next; held action on its dismiss
            } else {
              // nothing to show — apply the held action directly
              if (pendingTab) setActiveTab(pendingTab);
              if (pendingSwitch) setQuestionType(pendingSwitch);
              setPendingTab(null);
              setPendingSwitch(null);
            }
          }}
        />

        {/* ── End-run summary ── the same share screen finite modes get, fed
            from the banked snapshot (the live loop is already reset). Its
            dismissal completes the held tab navigation. */}
        {endRunSummary && (
          <SessionSummary
            solved={endRunSummary.solved ?? endRunSummary.history.length}
            correct={endRunSummary.correct ?? endRunSummary.history.filter(Boolean).length}
            bestStreak={endRunSummary.streak}
            accuracy={endRunSummary.accuracy}
            xpEarned={endRunSummary.xp}
            answerHistory={endRunSummary.history}
            questionType={endRunSummary.questionType}
            visible
            onDismiss={() => {
              setEndRunSummary(null);
              if (pendingTab) {
                setActiveTab(pendingTab);
                setPendingTab(null);
              }
              if (pendingSwitch) {
                setQuestionType(pendingSwitch);
                setPendingSwitch(null);
              }
            }}
            hardMode={endRunSummary.hardMode}
            timedMode={endRunSummary.timedMode}
            speedrunFinalTime={null}
            isNewSpeedrunRecord={false}
            displayName={user?.displayName}
            uid={uid}
            claimedHandle={claimedHandle}
            challengeId={null}
            challengeTarget={null}
            totalXP={stats.totalXP}
            onShared={recordShare}
            showBeaconHint={referralConversions === 0}
          />
        )}

        {/* ── Weekly recap (first open of the week, only when idle on game tab) ── */}
        <WeeklyRecap stats={stats} suppress={activeTab !== 'game' || isMagicLessonActive} />

        {/* ── 7-day-trial touchpoints ──
            Four pieces (see TrialModals.tsx):
              - WelcomeModal: once on Day 1, at session-start
              - TrialReminderModal: Day 4 (midpoint) / Day 6 (1 left), session-start only
              - TrialCountdownChip: rendered inline inside MePage (passed
                via props below) so it lives where the user already looks
                for account-level info, not as floating chrome.
            `inSession` is derived as game-tab + ≥1 answered problem. Both
            modals defer firing until inSession is false (between sessions,
            on app open, or after a tab switch) — they never interrupt
            mid-play. The next session-start naturally re-evaluates.
            All render NOTHING for paid users — no chrome cost. */}
        <WelcomeModal
          uid={uid}
          status={entitlement.status}
          entitlementLoading={entitlement.loading}
          inSession={activeTab === 'game' && totalAnswered > 0}
          displayName={user?.displayName ?? ''}
          onDisplayNameChange={setDisplayName}
        />
        {/* Native-Android-only early sign-in ask — one-tap Google there, so a
            soft dismissible "save your progress" prompt is low-friction. No-op
            on web/PWA (sign-in stays a quiet Me-tab option). Shows once, after
            the welcome, never mid-session. See SignInPrompt.tsx. */}
        <SignInPrompt
          uid={uid}
          isAnonymous={!!user?.isAnonymous}
          entitlementLoading={entitlement.loading}
          inSession={activeTab === 'game' && totalAnswered > 0}
          onSignIn={linkGoogle}
        />
        <TrialReminderModal
          uid={uid}
          status={entitlement.status}
          daysLeft={entitlement.daysLeft}
          entitlementLoading={entitlement.loading}
          inSession={activeTab === 'game' && totalAnswered > 0}
          onUnlock={() => setPaywallOpen(true)}
        />

        {/* ── Paywall (value-anchored overlay) ──
            Fires AFTER a non-daily problem is completed by an expired user,
            OR when the user explicitly taps an unlock CTA. NOT an early
            return — the user has already seen their familiar UI and earned
            XP before the ask. Daily Challenge sessions are exempt
            entirely; the trigger useEffect above skips them. */}
        {paywallOpen && (
          <Paywall
            progress={{
              totalSolved: stats.totalSolved,
              bestStreak: Math.max(stats.bestStreak, bestStreak),
              achievementCount: unlocked.size,
              dayStreak: stats.dayStreak,
            }}
            busy={paywallBusy}
            mode={paywallMode}
            uid={uid}
            purchaseUnavailable={purchaseChannel === 'none'}
            onClose={() => {
              setPaywallOpen(false);
              // Expired gate: instead of leaving the user on the now-locked
              // non-daily surface (which just re-fires the gate) — or the old
              // blank-page behavior — bank the run and drop them on the
              // free-forever Daily. shouldFirePaywall exempts 'daily' and the
              // game tab isn't the magic gate, so neither paywall effect
              // re-fires. Pro mode just dismisses (the block-nothing case).
              if (paywallMode === 'expired') {
                bankCurrentRun();
                resetSession();
                setQuestionType('daily');
                setActiveTab('game');
              }
            }}
            onUnlock={async () => {
              setPaywallBusy(true);
              try {
                await startCheckout(entitlement.mockGrantAccess);
                // Play Billing completes IN PLACE (no redirect, unlike the
                // Airwallex hosted page) — the server has written paidAt by
                // now, so refresh the gate and close the paywall right here.
                // ALL store-billing channels complete in place: the legacy TWA
                // Digital Goods ('play'), the native BillingClient bridge
                // ('android-native'), and StoreKit 2 ('ios-native'). Missing a
                // channel here leaves a paid user staring at the paywall.
                if (purchaseChannel === 'play' || purchaseChannel === 'android-native' || purchaseChannel === 'ios-native') {
                  await entitlement.refresh().catch(() => { /* next read catches up */ });
                  setPaywallOpen(false);
                }
              } catch (err) {
                console.error('[paywall] checkout failed', err);
                alert(t('paywall.checkoutError'));
              } finally {
                setPaywallBusy(false);
              }
            }}
            onDevReset={import.meta.env.DEV
              ? async () => {
                  await entitlement.mockBackdateTrial(0);
                  setPaywallOpen(false);
                }
              : undefined}
          />
        )}

        {/* ── Payment confirming ── Bridge between "paid on the hosted page"
            and "unlocked in the app": a calm, worded moment while we re-read
            the entitlement, instead of the old confusing return-to-a-paywall. */}
        <AnimatePresence>
          {confirmingPayment && entitlement.status !== 'paid' && (
            <motion.div
              className="fixed inset-0 z-[55] flex flex-col items-center justify-center px-8 text-center bg-[rgb(var(--color-board))]/95"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              role="status" aria-live="polite"
            >
              <motion.div
                className="text-[var(--color-gold)] mb-5"
                animate={{ opacity: [0.4, 1, 0.4], scale: [0.96, 1, 0.96] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              >
                <svg viewBox="0 0 100 100" width="64" height="64" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M50 12 L 57 43 L 88 50 L 57 57 L 50 88 L 43 57 L 12 50 L 43 43 Z" />
                  <circle cx="50" cy="50" r="4.5" fill="currentColor" stroke="none" />
                </svg>
              </motion.div>
              <p className="ui text-base text-[rgb(var(--color-fg))]/80">{t('celebrate.confirming')}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Purchase celebration ── Fires once when the lifetime unlock lands
            (any channel). Renders above the paywall (z-60); the person just
            paid, so it's a moment, not a silent flip. */}
        <AnimatePresence>
          {celebrateOpen && (
            <PurchaseCelebration onClose={() => setCelebrateOpen(false)} />
          )}
        </AnimatePresence>

        {/* ── Push nudge ── Soft, well-timed daily-reminder prompt (once). */}
        <AnimatePresence>
          {pushNudgeOpen && uid && (
            <PushNudge uid={uid} dayStreak={stats.dayStreak} onClose={() => setPushNudgeOpen(false)} />
          )}
        </AnimatePresence>

        {/* ── Referee welcome ── Double-sided referral: a friend's invite just
            earned this new player extra trial days. Tap or auto-dismiss. */}
        <AnimatePresence>
          {refereeBonusDays > 0 && (
            <motion.div
              className="fixed top-4 left-1/2 -translate-x-1/2 z-[59] max-w-[19rem] px-4 py-3 rounded-2xl bg-[var(--color-gold)] text-[var(--color-board)] text-sm ui font-semibold text-center shadow-xl"
              initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -30, opacity: 0 }}
              onClick={() => setRefereeBonusDays(0)} role="status"
            >
              {t('referral.welcomeBonus', { days: refereeBonusDays })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Achievement unlock toast ── Minecraft-style: slides in from the
            top-right, holds a beat, slides out. mode="wait" so a queue of
            unlocks plays one at a time, cleanly. */}
        <AnimatePresence mode="wait">
          {currentToast && (
            <motion.div
              key={currentToast.id}
              initial={{ opacity: 0, x: 340 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 340 }}
              transition={{ type: 'spring', stiffness: 340, damping: 32 }}
              className="fixed top-3 right-3 z-[60] flex items-center gap-2.5 bg-[var(--color-overlay)] border border-[var(--color-gold)]/40 rounded-xl pl-2 pr-3.5 py-1.5 shadow-[0_6px_22px_rgba(0,0,0,0.4)] max-w-[78vw]"
            >
              <div className="w-9 h-9 flex items-center justify-center shrink-0">
                <AchievementBadge achievementId={currentToast.id} unlocked={true} name="" desc="" iconOnly iconSize={30} />
              </div>
              <div className="min-w-0">
                <div className="text-[9px] ui uppercase tracking-widest text-[var(--color-gold)]/70 leading-tight">{t('game.achievementUnlocked')}</div>
                <div className="text-sm chalk text-[var(--color-gold)] truncate leading-tight">{currentToast.name}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Streak shield consumed toast ──
            Same upgrade as the achievement toast — hand-drawn shield SVG
            with a subtle glow so it doesn't read as an emoji-shaped pill. */}
        <AnimatePresence>
          {shieldToast && (
            <motion.div
              key="shield-toast"
              initial={{ opacity: 0, y: 40, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.9 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[var(--color-overlay)] border-2 border-[var(--color-gold)]/50 rounded-2xl px-5 py-3 flex items-center gap-3 shadow-[0_0_24px_rgba(251,191,36,0.25)]"
            >
              <div className="text-[var(--color-gold)] drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]">
                <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2 L 20 5 L 20 12 C 20 17 16 21 12 22 C 8 21 4 17 4 12 L 4 5 Z" />
                </svg>
              </div>
              <div>
                <div className="text-[10px] ui uppercase tracking-widest text-[var(--color-gold)]/70">{t('game.streakSaved')}</div>
                <div className="text-sm chalk text-[var(--color-gold)]">{t('game.shieldAbsorbed')}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </BlackboardLayout>
    </>
  );
}

export default App;
