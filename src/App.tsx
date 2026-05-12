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
import { defaultTypeForBand, typesForBand, AGE_BANDS, BAND_LABELS, migrateLegacyBand } from './utils/questionTypes';
import { useAutoSummary, usePersonalBest } from './hooks/useSessionUI';
import { OfflineBanner } from './components/OfflineBanner';
import { ReloadPrompt } from './components/ReloadPrompt';
import { MilestoneBurst } from './components/MilestoneBurst';
import { DailyFlourish } from './components/DailyFlourish';
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

import { useGameLoop } from './hooks/useGameLoop';
import { useStats } from './hooks/useStats';
import type { QuestionType } from './utils/questionTypes';
import { EVERY_ACHIEVEMENT, loadUnlocked, saveUnlocked, checkAchievements, restoreUnlockedFromCloud } from './utils/achievements';
import { EVERY_MATH_ACHIEVEMENT } from './domains/math/mathAchievements';
import { SessionSummary } from './components/SessionSummary';
import { WeeklyRecap } from './components/WeeklyRecap';
import { CHALK_THEMES, applyTheme, type ChalkTheme } from './utils/chalkThemes';
import { applyMode } from './hooks/useThemeMode';
import { useLocalState } from './hooks/useLocalState';
import { useFirebaseAuth } from './hooks/useFirebaseAuth';
import { useEntitlement } from './hooks/useEntitlement';
import { startCheckout } from './utils/checkout';
import { Paywall } from './components/Paywall';
import { WelcomeModal, TrialReminderModal } from './components/TrialModals';
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy, limit } from 'firebase/firestore';
import { db } from './utils/firebase';
import { generateProblem } from './utils/mathGenerator';
import { generateDailyChallenge, generateChallenge } from './utils/dailyChallenge';
import type { EngineItem } from './engine/domain';
import { STORAGE_KEYS, FIRESTORE } from './config';

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

/** Hand-drawn band icons. Two bands: starter (sapling — growth, recognition
 *  drills) and full (rocket — full arithmetic-and-beyond catalog). Both
 *  inherit currentColor so they pick up theme stroke colour. */
function AgeBandIcon({ band }: { band: AgeBand }) {
    const common = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
    if (band === 'starter') {
        // Sapling — two leaves above a curved stem
        return (
            <svg {...common}>
                <path d="M12 21V12" />
                <path d="M12 12 C 8 10 6 7 7 4 C 10 5 12 8 12 12" />
                <path d="M12 12 C 16 10 18 7 17 4 C 14 5 12 8 12 12" />
            </svg>
        );
    }
    // 'full' — rocket: narrow tip, body, fins
    return (
        <svg {...common}>
            <path d="M12 2 C 16 6 16 12 12 16 C 8 12 8 6 12 2 Z" />
            <path d="M12 16 L 12 21" />
            <path d="M9 13 L 6 18 L 9 17" />
            <path d="M15 13 L 18 18 L 15 17" />
        </svg>
    );
}

function LoadingFallback() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <motion.div
        className="text-lg chalk text-[var(--color-chalk)]/50"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        Loading...
      </motion.div>
    </div>
  );
}

function App() {
  const { user, loading: authLoading, setDisplayName, linkGoogle, sendEmailLink } = useFirebaseAuth();
  const uid = user?.uid ?? null;

  // 14-day trial → $3.14 lifetime gate. See utils/entitlement.ts +
  // memory/monetization_model.md. Renders the full-screen Paywall as an
  // early return when status === 'expired'.
  const entitlement = useEntitlement(uid);
  const [paywallBusy, setPaywallBusy] = useState(false);

  // Stripe Checkout success redirect handler. Stripe sends the user back
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
    if (paywallStatus === 'ok') {
      // Best-effort refresh — if it fails the next render still picks up
      // the new paidAt on its own. Don't block the UI on this.
      entitlement.refresh().catch(() => { /* silent */ });
    }
  // Intentional: run once on mount (the URL is the source of truth)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(() =>
    /^\/admin\/push\/?$/.test(window.location.pathname),
  );
  // ?c=<seed> loads a seeded challenge. ?daily=1 routes straight to today's
  // daily (so a friend's link lands them in the same session structure).
  // ?target=<n> renders a "Beat X" overlay in the banner so the receiver
  // knows what they're shooting for. ?targetTime=<ms> does the same for
  // speedrun-style time targets. The sender's "Challenge a Friend" button
  // packages all of these.
  const [bootDailyRequested] = useState<boolean>(() =>
    new URLSearchParams(window.location.search).get('daily') === '1',
  );
  const [challengeId, setChallengeId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get('c');
    if (c || params.get('daily') === '1' || params.get('target') || params.get('targetTime')) {
      window.history.replaceState({}, '', window.location.pathname);
    }
    return c;
  });
  const [challengeTarget] = useState<{ score: number | null; timeMs: number | null } | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('target');
    const tt = params.get('targetTime');
    if (!t && !tt) return null;
    return {
      score: t ? Number.parseInt(t, 10) || null : null,
      timeMs: tt ? Number.parseInt(tt, 10) || null : null,
    };
  });
  const [questionType, setQuestionType] = useState<QuestionType>(
    challengeId ? 'challenge' : bootDailyRequested ? 'daily' : 'multiply'
  );

  const { stats, accuracy, recordSession, resetStats, updateCosmetics, updateBestSpeedrunTime, updateBadge, consumeShield, recordShare } = useStats(uid);

  // ── Claimed @handle (one-shot fetch) ──
  // Used to build clean /u/<handle> share URLs. Stays null for users who
  // haven't claimed; the share builder falls back to /u/<name>-<uid4>.
  const [claimedHandle, setClaimedHandle] = useState<string | null>(null);
  useEffect(() => {
    if (!uid) { setClaimedHandle(null); return; }
    let cancelled = false;
    import('firebase/firestore').then(({ doc, getDoc }) => {
      getDoc(doc(db, 'users', uid)).then(snap => {
        if (cancelled) return;
        const handle = snap.exists() ? (snap.data().username as string | undefined) : undefined;
        setClaimedHandle(handle ?? null);
      }).catch(() => { /* silent */ });
    });
    return () => { cancelled = true; };
  }, [uid]);

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
    timerProgress,
    dailyComplete,
    speedrunFinalTime,
    speedrunElapsed,
    shieldBroken,
    wrongStreak,
  } = useGameLoop(
    generateMathItem,
    questionType,
    hardMode,
    challengeId,
    timedMode,
    stats.streakShields,
    consumeShield,
    undefined, // use DEFAULT_GAME_CONFIG
    generateMathFiniteSet,
  );

  // ── Shield consumed toast ──
  // Edge-triggered toast: open on the rising edge of `shieldBroken`, auto-close
  // after 3s. The setState here is a one-shot synchronization with the prop
  // edge, not a feedback loop, so the lint rule's worry doesn't apply.
  const [shieldToast, setShieldToast] = useState(false);
  useEffect(() => {
    if (!shieldBroken) return;
    setShieldToast(true);
    const t = setTimeout(() => setShieldToast(false), 3000);
    return () => clearTimeout(t);
  }, [shieldBroken]);

  const currentProblem = problems[0];
  const isFirstQuestion = totalAnswered === 0;
  const toggleHardMode = useCallback(() => setHardMode(h => !h), []);
  const toggleTimedMode = useCallback(() => setTimedMode(t => !t), []);

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
  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, FIRESTORE.PINGS),
      where('targetUid', '==', uid),
      where('read', '==', false),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    let clearTimer: ReturnType<typeof setTimeout> | undefined;
    const unsub = onSnapshot(q, (snap) => {
      if (snap.empty) return;
      const pingDoc = snap.docs[0];
      const data = pingDoc.data();
      // Sanitize incoming senderName: it's user-controlled; render as text only.
      // React already escapes it, but cap the length defensively.
      const senderName = String(data.senderName ?? 'Someone').slice(0, 20);
      setPingMessage(`${senderName} challenged you! ⚔️`);

      // Mark as read so it doesn't pop again
      updateDoc(doc(db, FIRESTORE.PINGS, pingDoc.id), { read: true }).catch(() => { /* silent */ });

      // Clear after 6 seconds (replace any in-flight clear timer)
      if (clearTimer) clearTimeout(clearTimer);
      clearTimer = setTimeout(() => setPingMessage(null), 6000);
    }, (err) => {
      console.warn('Ping listener failed:', err);
    });
    return () => {
      unsub();
      if (clearTimer) clearTimeout(clearTimer);
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
  // Achievement unlock toast — carries id (to render the actual badge SVG)
  // and name (to display). Null when nothing is being celebrated.
  const [unlockToast, setUnlockToast] = useState<{ id: string; name: string } | null>(null);

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

  // Check achievements whenever navigating away from game (i.e. stats recorded)
  useEffect(() => {
    const snap = { ...stats, bestStreak: Math.max(stats.bestStreak, bestStreak) };
    const fresh = checkAchievements(EVERY_MATH_ACHIEVEMENT, snap, unlockedRef.current);
    if (fresh.length > 0) {
      const next = new Set(unlockedRef.current);
      fresh.forEach(id => next.add(id));
      setUnlocked(next);
      saveUnlocked(next, uid);
      // Show toast for first new unlock — extended to 3.2s so the more
      // theatrical visual has time to land. The badge SVG renders inline
      // with a soft halo so the player actually sees what they earned.
      // Haptic match: achievement unlocks now buzz like streak milestones
      // — previously they were silent which was a miss for what's often
      // the rarest, most-celebratable moment in the app.
      const badge = EVERY_ACHIEVEMENT.find(a => a.id === fresh[0]);
      if (badge) {
        hapticMilestone();
        setUnlockToast({ id: badge.id, name: badge.name });
        const t = setTimeout(() => setUnlockToast(null), 3200);
        return () => clearTimeout(t);
      }
    }
  }, [stats, bestStreak, uid]);

  // ── Personal best detection ──
  const showPB = usePersonalBest(bestStreak, stats.bestStreak);

  // ── First-correct-of-the-day flourish ──
  // Triggers once per device per day when the user answers correctly.
  // Dismisses itself after the animation completes (~2s) via the dismiss callback.
  const dailyFlourish = useFirstCorrectFlourish(flash);

  const handleTabChange = useCallback((tab: Tab) => {
    if (prevTab.current === 'game' && tab !== 'game' && totalAnswered > 0) {
      recordSession(score, totalCorrect, totalAnswered, bestStreak, questionType, hardMode, timedMode);
      setShowSummary(true);
    }
    setActiveTab(tab);
  }, [score, totalCorrect, totalAnswered, bestStreak, questionType, recordSession, hardMode, timedMode, setShowSummary]);

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
      if (t.isDefault || (t.unlock && t.unlock.check(stats))) set.add(t.id);
    }
    return set;
  }, [stats]);
  const isMagicLessonForTeacher = activeTab === 'magic' && isMagicLessonActive;
  const activeTeacher = useMemo(() => resolveActiveTeacher(savedTeacherId, {
    isHardMode: hardMode,
    isTimedMode: timedMode,
    isSpeedrun: questionType === 'speedrun',
    isMagicLesson: isMagicLessonForTeacher,
    isStruggling: wrongStreak >= 3,
    unlocked: unlockedTeacherIds,
  }), [savedTeacherId, hardMode, timedMode, questionType, isMagicLessonForTeacher, wrongStreak, unlockedTeacherIds]);

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
  // ── Age Band ──
  // Default is 'full' (majority audience). useLocalState may return a legacy
  // stored value ('k2' / '35' / '6+') from before the 3→2 band migration;
  // migrateLegacyBand normalizes those to the new IDs.
  const [rawAgeBand, setAgeBand] = useLocalState(STORAGE_KEYS.ageBand, 'full' as AgeBand, uid) as [AgeBand, (v: AgeBand) => void];
  const ageBand = migrateLegacyBand(rawAgeBand);

  // ── Practice focus: find lowest-accuracy topic ──
  const levelUpSuggestion = useMemo(() => {
    const available = typesForBand(ageBand).filter(t => t.id !== 'speedrun' && t.id !== 'challenge');
    let worst: { type: QuestionType; acc: number; label: string } | null = null;
    for (const t of available) {
      const s = stats.byType[t.id];
      if (!s || s.solved < 5) continue;
      const acc = s.correct / s.solved;
      if (!worst || acc < worst.acc) worst = { type: t.id as QuestionType, acc, label: t.label };
    }
    return worst && worst.acc < 0.8 ? worst : null;
  }, [stats.byType, ageBand]);
  const handleBandChange = useCallback((band: AgeBand) => {
    setAgeBand(band);
    // Reset to the band's default type if current type isn't in the new band
    const available = typesForBand(band);
    if (!available.some(t => t.id === questionType)) {
      setQuestionType(defaultTypeForBand(band));
    }
  }, [questionType, setAgeBand, setQuestionType]);

  // Show loading screen while Firebase auth initializes
  if (authLoading) {
    return <BlackboardLayout><LoadingFallback /></BlackboardLayout>;
  }

  // Public profile route — its own surface, replaces the rest of the app.
  // Anonymous Firebase auth fires automatically for visitors landing here
  // from a shared link, so the Firestore read below works without login.
  if (profileSlug) {
    return (
      <BlackboardLayout>
        <Suspense fallback={<LoadingFallback />}>
          <ProfilePage
            slug={profileSlug}
            onChallenge={(id) => {
              // Switch into challenge mode and clear the profile route
              setChallengeId(id);
              setQuestionType('challenge' as QuestionType);
              setProfileSlug(null);
              window.history.replaceState({}, '', '/');
            }}
            onBackToGame={() => {
              setProfileSlug(null);
              window.history.replaceState({}, '', '/');
            }}
          />
        </Suspense>
      </BlackboardLayout>
    );
  }

  // Trial expired & not paid → full-screen paywall. Blocks every other
  // surface — leaderboard, profile, magic, everything. Authoritative gate.
  //
  // We only render this once entitlement.loading is false; otherwise a
  // fresh page load briefly flashes the paywall while the Firestore read
  // is in flight. The authLoading early return above means user is always
  // present here, but uid can still be null in error states — in that
  // case we let the app render normally and trust the next session to
  // resolve the gate.
  if (uid && !entitlement.loading && entitlement.status === 'expired') {
    return (
      <BlackboardLayout>
        <Paywall
          busy={paywallBusy}
          onUnlock={async () => {
            setPaywallBusy(true);
            try {
              await startCheckout(entitlement.mockGrantAccess);
            } catch (err) {
              console.error('[paywall] checkout failed', err);
              // Surface to the user — if checkout failed they need to
              // know. The paywall is already the focal screen so a
              // simple alert is fine here.
              alert('Could not start checkout. Try again in a moment.');
            } finally {
              setPaywallBusy(false);
            }
          }}
          onDevReset={import.meta.env.DEV
            ? () => entitlement.mockBackdateTrial(0)
            : undefined}
        />
      </BlackboardLayout>
    );
  }

  // Admin push analytics route — owner-only by Firebase custom claim.
  // Renders an authorization gate first so non-admins still get a clean
  // "back to game" path if they stumble onto the URL.
  if (isAdminRoute) {
    return (
      <BlackboardLayout>
        <Suspense fallback={<LoadingFallback />}>
          <AdminPushAnalytics
            onBackToGame={() => {
              setIsAdminRoute(false);
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
          baseColor={CHALK_THEMES.find(t => t.id === activeThemeId)?.color}
        />

        {/* ── Top-right controls (band picker + theme toggle) — game tab only ── */}
        {activeTab === 'game' && (
          <div className="absolute top-[calc(env(safe-area-inset-top,12px)+12px)] right-4 z-50 flex items-center gap-2">
            <button
              onClick={() => {
                const idx = AGE_BANDS.indexOf(ageBand);
                handleBandChange(AGE_BANDS[(idx + 1) % AGE_BANDS.length]);
              }}
              // min-h-11 (44px) keeps the touch target at iOS HIG / Material Design
              // minimum even though the visible content is smaller. Top-right corner
              // tap targets are the hardest to hit accurately on a phone.
              className="flex items-center gap-1.5 px-3 py-2.5 min-h-11 rounded-lg text-[rgb(var(--color-fg))]/50 active:text-[var(--color-gold)] transition-colors"
              aria-label="Change level"
            >
              <AgeBandIcon band={ageBand} />
              <span className="text-[10px] ui">{BAND_LABELS[ageBand].label}</span>
            </button>
            <button
              onClick={toggleThemeMode}
              // 44×44 tap target (was 36×36) — see comment on Change level button.
              className="w-11 h-11 flex items-center justify-center text-[rgb(var(--color-fg))]/60 active:text-[var(--color-gold)] transition-colors"
              aria-label="Toggle theme"
            >
              {themeMode === 'light' ? (
                <motion.svg
                  viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                >
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </motion.svg>
              ) : (
                <motion.svg
                  viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  animate={{ rotate: [0, -8, 8, -5, 5, 0] }}
                  transition={{ duration: 4, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
                >
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </motion.svg>
              )}
            </button>
          </div>
        )}

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
            <div className="landscape-score flex flex-col items-center pt-[calc(env(safe-area-inset-top,16px)+40px)] pb-6 z-30">
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
                    <span>Challenge</span>
                    <span className="text-[rgb(var(--color-fg))]/30">·</span>
                    <span className="text-[rgb(var(--color-fg))]/40">{totalAnswered}/10</span>
                  </div>
                  {/* Target overlay — only when the link carried a target. Shows
                      what the sender scored so the receiver has something
                      concrete to beat (asymmetric-link payoff). */}
                  {challengeTarget && (challengeTarget.score !== null || challengeTarget.timeMs !== null) && (
                    <div className="text-[10px] ui text-[var(--color-gold)]/70">
                      Beat{' '}
                      {challengeTarget.timeMs !== null
                        ? `${(challengeTarget.timeMs / 1000).toFixed(1)}s`
                        : `${challengeTarget.score} pts`}
                      {score > 0 && challengeTarget.score !== null && score >= challengeTarget.score && (
                        <span className="text-[var(--color-correct)] ml-1">passed</span>
                      )}
                    </div>
                  )}
                </div>
              )}
              {questionType === 'speedrun' && (
                <div className="mb-2 flex flex-col items-center gap-0.5">
                  <div className="text-xs ui text-[var(--color-speedrun)] flex items-center gap-2">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <circle cx="12" cy="14" r="7" />
                      <line x1="12" y1="14" x2="15" y2="11" />
                      <line x1="10" y1="2" x2="14" y2="2" />
                      <line x1="12" y1="2" x2="12" y2="5" />
                    </svg>
                    <span>Speedrun</span>
                    <span className="text-[rgb(var(--color-fg))]/30">·</span>
                    <span className="text-[rgb(var(--color-fg))]/40">{totalCorrect}/10</span>
                  </div>
                  {challengeTarget && challengeTarget.timeMs !== null && (
                    <div className="text-[10px] ui text-[var(--color-speedrun)]/70">
                      Beat {(challengeTarget.timeMs / 1000).toFixed(1)}s
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
                    <span>Daily Challenge</span>
                    <span className="text-[rgb(var(--color-fg))]/30">·</span>
                    <span className="text-[rgb(var(--color-fg))]/40">{totalAnswered}/10</span>
                  </div>
                  {challengeTarget && challengeTarget.score !== null && (
                    <div className="text-[10px] ui text-[var(--color-gold)]/70">
                      Beat {challengeTarget.score} pts
                      {score >= challengeTarget.score && (
                        <span className="text-[var(--color-correct)] ml-1">passed</span>
                      )}
                    </div>
                  )}
                </div>
              )}
              {questionType === 'speedrun' ? (
                <div className="chalk text-[var(--color-speedrun)] text-7xl leading-none tabular-nums">
                  {((speedrunFinalTime ?? speedrunElapsed) / 1000).toFixed(1)}<span className="text-3xl">s</span>
                </div>
              ) : (
                <ScoreCounter value={score} />
              )}

              {/* Shield count */}
              {/* Screen reader announcement for game feedback */}
              <div className="sr-only" role="status" aria-live="assertive">
                {flash === 'correct' && `Correct! Streak: ${streak}`}
                {flash === 'near-miss' && 'Close! Streak reset.'}
                {flash === 'wrong' && (shieldBroken ? 'Wrong! Shield used, streak saved.' : 'Wrong! Streak reset.')}
                {milestone && `Milestone reached at ${streak} in a row!`}
              </div>
              {stats.streakShields > 0 && streak > 0 && (
                <div className="text-[10px] ui text-[rgb(var(--color-fg))]/30 mt-1 flex items-center gap-0.5">
                  {'🛡️'.repeat(stats.streakShields)}
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
                        {streak >= 10 ? `🔥 ${streak}×` : `${streak}×`}
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
                  <span>🔥 Day {stats.dayStreak}</span>
                  {(stats.streakShields || 0) > 0 && (
                    <span className="text-[var(--color-gold)] opacity-80" title="Streak Freeze Active">
                      {'🛡️'.repeat(stats.streakShields)}
                    </span>
                  )}
                </div>
              )}

              {/* Speedrun discoverability — only surfaces once the player has shown
                  competence (5+ streak this session) and isn't already in a special mode.
                  Tapping switches to speedrun which auto-starts the 10-question timer. */}
              {streak >= 5 && questionType !== 'speedrun' && questionType !== 'challenge' && questionType !== 'daily' && (
                <motion.button
                  key="speedrun-cta"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-1 text-[10px] ui text-[var(--color-speedrun)]/80 hover:text-[var(--color-speedrun)] transition-colors flex items-center gap-1"
                  onClick={() => setQuestionType('speedrun' as QuestionType)}
                  aria-label="Try speedrun mode"
                >
                  <span>⚡</span>
                  <span>You're hot — try speedrun?</span>
                </motion.button>
              )}
              {/* Level Up suggestion — only visible when idle, never in hard/timed/daily/challenge contexts */}
              {isFirstQuestion && !hardMode && !timedMode && levelUpSuggestion && questionType !== 'speedrun' && questionType !== 'challenge' && questionType !== 'daily' && (
                <motion.button
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 flex items-center gap-2 text-[10px] ui text-[var(--color-gold)]/70 hover:text-[var(--color-gold)] transition-colors"
                  onClick={() => setQuestionType(levelUpSuggestion.type)}
                >
                  <span>🚀</span>
                  <span>Level up your {levelUpSuggestion.label}!</span>
                  <span className="text-[rgb(var(--color-fg))]/20">({Math.round(levelUpSuggestion.acc * 100)}%)</span>
                </motion.button>
              )}
              {/* Daily challenge callout. Three states:
                    - not started today      → "📅 Daily challenge available"
                    - started but unfinished → "📅 Daily: 3/10 — finish it"
                    - completed today        → suppressed (no point re-pitching)
                  Hidden in hard/timed mode because the daily set isn't designed for those modifiers. */}
              {(() => {
                if (!isFirstQuestion || hardMode || timedMode) return null;
                if (questionType === 'daily' || questionType === 'speedrun' || questionType === 'challenge') return null;
                const today = (() => {
                  const d = new Date();
                  const pad = (n: number) => String(n).padStart(2, '0');
                  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
                })();
                const startedToday = stats.lastDailyDate === today && stats.todayDailySolved > 0;
                const dailyTotal = 10; // Matches DAILY_COUNT in mathDailyConfig
                const completedToday = startedToday && stats.todayDailySolved >= dailyTotal;
                if (completedToday) return null;
                const inProgressLabel = startedToday
                  ? `Daily: ${stats.todayDailySolved}/${dailyTotal} — finish it`
                  : 'Daily challenge available';
                return (
                  // Pill-style daily-challenge entry. Previously this was
                  // tiny low-opacity text; testers were missing it. Now it's
                  // a small bordered pill with a hand-drawn calendar icon —
                  // still subordinate to "Let's Go!!" / score but no longer
                  // invisible. Hand icon nudges the user toward tapping.
                  <motion.button
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] ui font-semibold transition-colors ${startedToday
                      ? 'border-[var(--color-gold)]/60 text-[var(--color-gold)] bg-[var(--color-gold)]/10 active:bg-[var(--color-gold)]/20'
                      : 'border-[var(--color-gold)]/40 text-[var(--color-gold)]/90 bg-[var(--color-gold)]/5 active:bg-[var(--color-gold)]/15'
                      }`}
                    onClick={() => setQuestionType('daily' as QuestionType)}
                  >
                    {/* Hand-drawn calendar icon — matches CategoryIcon('daily') */}
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <rect x="3" y="5" width="18" height="16" rx="2" />
                      <line x1="8" y1="3" x2="8" y2="7" />
                      <line x1="16" y1="3" x2="16" y2="7" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                      <circle cx="12" cy="15" r="1.2" fill="currentColor" stroke="none" />
                    </svg>
                    {inProgressLabel}
                  </motion.button>
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

            {/* ── TikTok-style action buttons ── */}
            <ActionButtons
              questionType={questionType}
              onTypeChange={setQuestionType}
              hardMode={hardMode}
              onHardModeToggle={toggleHardMode}
              timedMode={timedMode}
              onTimedModeToggle={toggleTimedMode}
              timerProgress={timerProgress}
              ageBand={ageBand}

            />

            {/* ── Mr. Chalk PiP ── */}
            <div className="landscape-hide">
              <Teacher
                state={chalkState}
                teacherId={activeTeacher.id}
                costume={activeCostume}
                streak={streak}
                totalAnswered={totalAnswered}
                questionType={questionType}
                hardMode={hardMode}
                timedMode={timedMode}
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
              <div key={'speed' + score} className="speed-pop absolute left-1/2 -translate-x-1/2 top-[30%] z-40 text-sm ui text-[var(--color-gold)] whitespace-nowrap">
                ⚡ SPEED BONUS +2
              </div>
            )}

            {/* ── Personal best ── */}
            <AnimatePresence>
              {showPB && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  className="absolute left-1/2 -translate-x-1/2 top-[18%] z-40 text-lg chalk text-[var(--color-gold)] whitespace-nowrap"
                >
                  🏆 NEW PERSONAL BEST!
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Non-game tabs (no wrapper — each page scrolls independently) */}
        {activeTab === 'league' && (
          <motion.div className="flex-1 flex flex-col min-h-0" onPanEnd={handleTabSwipe}>
            <Suspense fallback={<LoadingFallback />}><LeaguePage userXP={stats.totalXP} userStreak={stats.bestStreak} uid={uid} displayName={user?.displayName ?? 'You'} activeThemeId={activeThemeId as string} activeCostume={activeCostume as string} bestSpeedrunTime={stats.bestSpeedrunTime} speedrunHardMode={stats.speedrunHardMode} onStartSpeedrun={() => { setQuestionType('speedrun'); setActiveTab('game'); }} /></Suspense>
          </motion.div>
        )}

        {activeTab === 'me' && (
          <motion.div className="flex-1 flex flex-col min-h-0" onPanEnd={handleTabSwipe}>
            <Suspense fallback={<LoadingFallback />}><MePage
              stats={stats}
              accuracy={accuracy}
              sessionScore={score}
              sessionStreak={bestStreak}
              onReset={resetStats}
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
              onLinkGoogle={linkGoogle}
              onSendEmailLink={sendEmailLink}
              ageBand={ageBand}
              activeBadge={stats.activeBadgeId || ''}
              onBadgeChange={updateBadge}
              activeTeacherId={savedTeacherId as string}
              onTeacherChange={setSavedTeacherId}
              uid={uid}
              entitlementStatus={entitlement.status}
              entitlementDaysLeft={entitlement.daysLeft}
              onUnlock={async () => {
                setPaywallBusy(true);
                try {
                  await startCheckout(entitlement.mockGrantAccess);
                } catch (err) {
                  console.error('[paywall] checkout failed', err);
                  alert('Could not start checkout. Try again in a moment.');
                } finally {
                  setPaywallBusy(false);
                }
              }}
            /></Suspense>
          </motion.div>
        )}

        {activeTab === 'magic' && (
          <motion.div className="flex-1 flex flex-col min-h-0" onPanEnd={!isMagicLessonActive ? handleTabSwipe : undefined}>
            <Suspense fallback={<LoadingFallback />}><TricksPage onLessonActive={setIsMagicLessonActive} /></Suspense>
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
            if (questionType === 'speedrun') {
              // Record session stats before leaving (can't use handleTabChange — it re-shows summary)
              if (totalAnswered > 0) {
                recordSession(score, totalCorrect, totalAnswered, bestStreak, questionType, hardMode, timedMode);
              }
              setActiveTab('league');
              setQuestionType(defaultTypeForBand(ageBand));
            }
          }}
          hardMode={hardMode}
          timedMode={timedMode}
          speedrunFinalTime={speedrunFinalTime}
          isNewSpeedrunRecord={isNewSpeedrunRecord}
          displayName={user?.displayName}
          uid={uid}
          claimedHandle={claimedHandle}
          challengeId={challengeId}
          onShared={recordShare}
        />

        {/* ── Weekly recap (first open of the week, only when idle on game tab) ── */}
        <WeeklyRecap stats={stats} suppress={activeTab !== 'game' || isMagicLessonActive} />

        {/* ── 14-day-trial touchpoints ──
            Three pieces (see TrialModals.tsx):
              - WelcomeModal: once on Day 1
              - TrialReminderModal: once at Day 10 + once at Day 13
              - TrialCountdownChip: rendered inline inside MePage (passed
                via props below) so it lives where the user already looks
                for account-level info, not as floating chrome.
            All render NOTHING for paid users — no chrome cost. */}
        <WelcomeModal
          uid={uid}
          status={entitlement.status}
          entitlementLoading={entitlement.loading}
        />
        <TrialReminderModal
          uid={uid}
          status={entitlement.status}
          daysLeft={entitlement.daysLeft}
          entitlementLoading={entitlement.loading}
          onUnlock={async () => {
            setPaywallBusy(true);
            try {
              await startCheckout(entitlement.mockGrantAccess);
            } catch (err) {
              console.error('[paywall] checkout failed', err);
              alert('Could not start checkout. Try again in a moment.');
            } finally {
              setPaywallBusy(false);
            }
          }}
        />

        {/* ── Achievement unlock toast ──
            Theatrical version: shows the actual badge SVG with a sparkle
            halo behind it on appearance. Toast itself has a gold border
            glow + scales in for a beat then settles. Sparkles fire once
            on mount, then fade away — leaving a clean readable card. */}
        <AnimatePresence>
          {unlockToast && (
            <motion.div
              key={unlockToast.id}
              initial={{ opacity: 0, y: 40, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.9 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[var(--color-overlay)] border-2 border-[var(--color-gold)]/50 rounded-2xl px-5 py-3 flex items-center gap-3 shadow-[0_0_24px_rgba(251,191,36,0.25)]"
            >
              {/* Badge halo: sparkles fly outward once, fade fast */}
              <div className="relative w-12 h-12 flex items-center justify-center">
                {[0, 60, 120, 180, 240, 300].map(deg => {
                  const rad = (deg * Math.PI) / 180;
                  return (
                    <motion.div
                      key={deg}
                      className="absolute text-[var(--color-gold)]"
                      initial={{ x: 0, y: 0, opacity: 0, scale: 0.3 }}
                      animate={{
                        x: Math.cos(rad) * 32,
                        y: Math.sin(rad) * 32,
                        opacity: [0, 1, 0],
                        scale: [0.3, 1, 0.4],
                      }}
                      transition={{ duration: 0.9, ease: 'easeOut' }}
                    >
                      <svg viewBox="0 0 8 8" width="6" height="6" fill="currentColor"><circle cx="4" cy="4" r="3" /></svg>
                    </motion.div>
                  );
                })}
                {/* The actual unlocked badge SVG, with a soft glow */}
                <div className="relative drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]">
                  <AchievementBadge achievementId={unlockToast.id} unlocked={true} name="" desc="" />
                </div>
              </div>
              <div>
                <div className="text-[10px] ui uppercase tracking-widest text-[var(--color-gold)]/70">Achievement Unlocked</div>
                <div className="text-sm chalk text-[var(--color-gold)]">{unlockToast.name}</div>
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
                <div className="text-[10px] ui uppercase tracking-widest text-[var(--color-gold)]/70">Streak Saved</div>
                <div className="text-sm chalk text-[var(--color-gold)]">Shield absorbed the miss</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </BlackboardLayout>
    </>
  );
}

export default App;
