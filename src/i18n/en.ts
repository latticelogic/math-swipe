/**
 * English — the source catalog. Every key the app translates lives here;
 * other catalogs must cover exactly this key set (parity-tested).
 *
 * Rules (docs/i18n.md):
 *  - No emoji. No concatenation-shaped fragments — full sentences with
 *    {var} placeholders so word order can differ per language.
 *  - Plural keys end in `.one` / `.other` and are picked via
 *    Intl.PluralRules ({count} is pre-formatted).
 *  - Length budgets are enforced by i18n.test.ts per key prefix — see the
 *    budget table there before writing long copy.
 */

export const en = {
    // ── Bottom navigation ──
    'nav.play': "Let's Go!",
    'nav.league': 'League',
    'nav.magic': 'Magic',
    'nav.me': 'Me',
    'nav.play.aria': 'Play',
    'nav.league.aria': 'Leaderboard',
    'nav.magic.aria': 'Lessons',
    'nav.me.aria': 'Profile',

    // ── Game rail (share / topic / modes) ──
    'rail.share': 'Share',
    'rail.resultCopied': 'Result copied!',
    'rail.linkCopied': 'Link copied!',
    'rail.shareUnsupported': 'Sharing not supported',
    'rail.shareFailed': "Couldn't share — try again",
    'rail.switchTopic': 'Switch topic',
    'rail.topicAria': 'Switch topic. Current: {label}',
    'rail.timed': 'Timed mode',
    'rail.timedOn': 'Timed: ON',
    'rail.timedEnable': 'Enable timed mode',
    'rail.timedDisable': 'Disable timed mode',
    'rail.timedLocked': 'Timed mode (Pro — unlock)',
    'rail.hard': 'Hard mode · bigger numbers',
    'rail.hardOn': 'Hard: ON · bigger numbers',
    'rail.hardEnable': 'Enable hard mode',
    'rail.hardDisable': 'Disable hard mode',
    'rail.hardLocked': 'Hard mode (Pro — unlock)',

    // ── Topic picker ──
    'group.daily': 'Daily',
    'group.young': 'First Numbers',
    'group.whole': 'The Basics',
    'group.core': 'Number Sense',
    'group.powers': 'Powers & Roots',
    'group.prealgebra': 'Pre-Algebra',
    'group.parts': 'Parts of a Whole',
    'group.mixed': 'Mixed',
    'picker.whichTable': 'Which table?',
    'picker.backToTopics': 'Back to topics',
    'picker.tablesFocused': '{n}s Table',
    'picker.topic': 'Topic',

    // ── Category labels (grid tiles + rail label) ──
    'cat.daily': 'Daily',
    'cat.add1': '1-Digit +',
    'cat.sub1': '1-Digit −',
    'cat.bonds': 'Bonds',
    'cat.doubles': 'Doubles',
    'cat.compare': 'Compare',
    'cat.skip': 'Skip Count',
    'cat.shapes': 'Shapes',
    'cat.evenodd': 'Even/Odd',
    'cat.tens': '10 More',
    'cat.add': 'Add',
    'cat.subtract': 'Subtract',
    'cat.multiply': 'Multiply',
    'cat.divide': 'Divide',
    'cat.tables': 'Tables',
    'cat.missing': 'Missing',
    'cat.round': 'Rounding',
    'cat.orderops': 'PEMDAS',
    'cat.estimate': 'Estimate',
    'cat.sequence': 'Sequences',
    'cat.time': 'Time',
    'cat.square': 'Square',
    'cat.sqrt': 'Root',
    'cat.exponent': 'Exponent',
    'cat.negatives': 'Negatives',
    'cat.linear': 'Linear',
    'cat.gcflcm': 'GCF/LCM',
    'cat.ratio': 'Ratios',
    'cat.primes': 'Primes',
    'cat.fraction': 'Fractions',
    'cat.decimal': 'Decimals',
    'cat.percent': 'Percent',
    'cat.money': 'Money',
    'cat.mix-basic': 'Basic Mix',
    'cat.mix-all': 'All Mix',

    // ── Counts (plural via Intl.PluralRules) ──
    'count.problem.one': '{count} problem',
    'count.problem.other': '{count} problems',
    'count.day.one': '{count} day',
    'count.day.other': '{count} days',

    // ── End-run dialog ──
    'endRun.title': 'End this run?',
    'endRun.stats': '{problems} · {pts} points so far',
    'endRun.end': 'End & see results',
    'endRun.keep': 'Keep playing',

    // ── Welcome modal ──
    'welcome.title': 'Welcome to Math Challenge!',
    'welcome.free': '{days} days free — all topics and modes.',
    'welcome.price': 'Then just {price} for lifetime access.',
    'welcome.dailyFree': 'Daily Challenge is always free.',
    'welcome.nameLabel': 'Your name',
    'welcome.nameAria': 'Your display name',
    'welcome.nameHint': 'You can change this anytime in the Me tab.',
    'welcome.cta': "Let's go",

    // ── Trial reminders + countdown chip ──
    'trial.endsToday': 'Trial ends today',
    'trial.oneDayLeft': '1 day left in your trial',
    'trial.weekIn': "You're a week in",
    'trial.daysLeft': '{days} left in your trial',
    'trial.urgentBody': 'After today the rest locks. The Daily Challenge stays free.',
    'trial.calmBody': 'A few days to decide. The Daily Challenge stays free either way.',
    'trial.unlockFor': 'Unlock for {price}',
    'trial.chip': '{days} left in trial · {price} to keep',

    // ── Paywall ──
    'paywall.proTitle': 'Unlock everything',
    'paywall.proSub': 'The full game — right now.',
    'paywall.feature1': 'Hard, Timed & Ultimate modes',
    'paywall.feature2': 'All 36 Magic Tricks',
    'paywall.feature3': 'The exclusive Pro cosmetics pack',
    'paywall.proPrice': 'Yours forever for {price}. One time — no subscription.',
    'paywall.expiredTitle': 'Two weeks of Math Challenge',
    'paywall.expiredSub': "Here's what you built.",
    'paywall.statDays.one': 'day',
    'paywall.statDays.other': 'days in a row',
    'paywall.statBestStreak': 'best streak',
    'paywall.statProblems.one': 'problem',
    'paywall.statProblems.other': 'problems',
    'paywall.statAchievements.one': 'achievement',
    'paywall.statAchievements.other': 'achievements',
    'paywall.barelyPlayed': 'The Daily Challenge stays open if you want to come back.',
    'paywall.keepGoing': 'Want to keep going? Everything stays unlocked for {price}. One time.',
    'paywall.unavailable': "Purchases aren't available in this version of the app. If you've already unlocked Math Challenge, sign in and your unlock comes with you.",
    'paywall.busy': 'Just a sec…',
    'paywall.ctaExpired': 'Keep playing',
    'paywall.lifetime': 'Lifetime access · No subscription',
    'paywall.maybeLater': 'Maybe later',
    'paywall.dailyFree': 'The Daily Challenge is always free.',

    // ── Settings sheet ──
    'settings.title': 'Settings',
    'settings.gearAria': 'Open settings',
    'settings.done': 'Done',
    'settings.reset': 'Reset stats',
    'settings.neverMind': 'never mind',
    'settings.resetCta': 'reset',
    'settings.versionTap': 'v{v} · tap to update',
    'settings.upToDate': 'v{v} · up to date',
    'settings.updateAvailable': 'v{v} · tap to get v{n}',

    // ── Me tab (Tier-1 subset: language, sign-in card, stat labels) ──
    'me.language': 'Language',
    'me.signinTitle': 'Save your progress',
    'me.signinBody': 'Keep your streak and XP safe — and pick up on any device.',
    'me.signinCta': 'Sign in to back them up and play anywhere.',
    'me.emailTitle': 'Sign in with email',
    'me.emailHint': "We'll send a magic link — no password.",
    'me.back': 'Back',
    'me.sendLink': 'Send link',
    'me.checkEmail': 'Check your email',
    'me.checkEmailHint': 'Tap the magic link we just sent to finish.',
    'me.google': 'Continue with Google',
    'me.apple': 'Continue with Apple',
    'me.email': 'Continue with email',
    'me.statStreak': 'streak',
    'me.statAccuracy': 'accuracy',
    'me.statSolved': 'solved',
    'me.statDaily': 'daily',
    'me.byType': 'by type',
} as const;

export type MsgKey = keyof typeof en;
